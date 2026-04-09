/*
  # Fix Security and Performance Issues

  ## Summary
  This migration addresses all security warnings and performance issues identified
  by the Supabase security advisor.

  ## Changes

  ### 1. Unindexed Foreign Keys
  - Add index on `confirmations.driver_id` (foreign key without covering index)
  - Add index on `tip_likes.driver_id` (foreign key without covering index)

  ### 2. RLS Auth Function Optimization (Auth RLS Initialization Plan)
  Replace bare `auth.uid()` calls with `(select auth.uid())` in all RLS policies
  to avoid per-row re-evaluation, improving query performance at scale.
  Affected tables:
  - `reports`: Drivers can create/update/delete own reports
  - `confirmations`: Drivers can create/delete own confirmations
  - `tips`: Drivers can create/update/delete own tips
  - `tip_likes`: Drivers can like/unlike tips
  - `profiles`: Users can read/insert/update own profile

  ### 3. Function Search Path Security
  Add `SET search_path = ''` to all functions that have a mutable search_path
  to prevent search path injection attacks:
  - `calculate_gps_distance`
  - `update_address_risk_score`
  - `update_confirmation_count`
  - `update_tip_likes_count`
  - `calculate_address_similarity`
  - `find_duplicate_address`
  - `reset_daily_search_count`
  - `create_profile_on_signup`

  ### 4. Notes
  - Unused indexes are NOT dropped — they may become used as data grows
  - The `addresses` RLS policies allowing any authenticated user to insert/update
    are left as-is since this is the intended community-driven data model
  - Auth DB Connection Strategy and Leaked Password Protection require
    dashboard configuration and cannot be changed via migration
*/

-- ============================================================
-- 1. Add missing indexes for unindexed foreign keys
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_confirmations_driver_id ON public.confirmations(driver_id);
CREATE INDEX IF NOT EXISTS idx_tip_likes_driver_id ON public.tip_likes(driver_id);

-- ============================================================
-- 2. Fix RLS policies on reports table
-- ============================================================

DROP POLICY IF EXISTS "Drivers can create reports" ON public.reports;
DROP POLICY IF EXISTS "Drivers can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Drivers can delete own reports" ON public.reports;

CREATE POLICY "Drivers can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = driver_id);

CREATE POLICY "Drivers can update own reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = driver_id)
  WITH CHECK ((select auth.uid()) = driver_id);

CREATE POLICY "Drivers can delete own reports"
  ON public.reports FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = driver_id);

-- ============================================================
-- 3. Fix RLS policies on confirmations table
-- ============================================================

DROP POLICY IF EXISTS "Drivers can create confirmations" ON public.confirmations;
DROP POLICY IF EXISTS "Drivers can delete own confirmations" ON public.confirmations;

CREATE POLICY "Drivers can create confirmations"
  ON public.confirmations FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = driver_id);

CREATE POLICY "Drivers can delete own confirmations"
  ON public.confirmations FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = driver_id);

-- ============================================================
-- 4. Fix RLS policies on tips table
-- ============================================================

DROP POLICY IF EXISTS "Drivers can create tips" ON public.tips;
DROP POLICY IF EXISTS "Drivers can update own tips" ON public.tips;
DROP POLICY IF EXISTS "Drivers can delete own tips" ON public.tips;

CREATE POLICY "Drivers can create tips"
  ON public.tips FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = driver_id);

CREATE POLICY "Drivers can update own tips"
  ON public.tips FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = driver_id)
  WITH CHECK ((select auth.uid()) = driver_id);

CREATE POLICY "Drivers can delete own tips"
  ON public.tips FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = driver_id);

-- ============================================================
-- 5. Fix RLS policies on tip_likes table
-- ============================================================

DROP POLICY IF EXISTS "Drivers can like tips" ON public.tip_likes;
DROP POLICY IF EXISTS "Drivers can unlike tips" ON public.tip_likes;

CREATE POLICY "Drivers can like tips"
  ON public.tip_likes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = driver_id);

CREATE POLICY "Drivers can unlike tips"
  ON public.tip_likes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = driver_id);

-- ============================================================
-- 6. Fix RLS policies on profiles table
-- ============================================================

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================
-- 7. Fix function search paths (security hardening)
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_address_similarity(addr1 TEXT, addr2 TEXT)
RETURNS FLOAT AS $$
DECLARE
  words1 TEXT[];
  words2 TEXT[];
  common_words INTEGER;
  total_unique_words INTEGER;
BEGIN
  words1 := string_to_array(lower(addr1), ' ');
  words2 := string_to_array(lower(addr2), ' ');

  SELECT COUNT(DISTINCT w)
  INTO common_words
  FROM unnest(words1) AS w
  WHERE w = ANY(words2);

  SELECT COUNT(DISTINCT w)
  INTO total_unique_words
  FROM (
    SELECT unnest(words1) AS w
    UNION
    SELECT unnest(words2) AS w
  ) AS all_words;

  IF total_unique_words = 0 THEN
    RETURN 0;
  END IF;

  RETURN common_words::FLOAT / total_unique_words::FLOAT;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.calculate_gps_distance(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  R CONSTANT NUMERIC := 6371000;
  dLat NUMERIC;
  dLon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);

  a := sin(dLat / 2) * sin(dLat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon / 2) * sin(dLon / 2);

  c := 2 * atan2(sqrt(a), sqrt(1 - a));

  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.find_duplicate_address(
  p_normalized_address TEXT,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_text_threshold FLOAT DEFAULT 0.85,
  p_gps_threshold NUMERIC DEFAULT 50
)
RETURNS UUID AS $$
DECLARE
  duplicate_id UUID;
BEGIN
  SELECT id INTO duplicate_id
  FROM public.addresses
  WHERE normalized_address = p_normalized_address
  LIMIT 1;

  IF duplicate_id IS NOT NULL THEN
    RETURN duplicate_id;
  END IF;

  SELECT a.id INTO duplicate_id
  FROM public.addresses a
  WHERE public.calculate_address_similarity(a.normalized_address, p_normalized_address) >= p_text_threshold
  LIMIT 1;

  IF duplicate_id IS NOT NULL THEN
    RETURN duplicate_id;
  END IF;

  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    SELECT a.id INTO duplicate_id
    FROM public.addresses a
    WHERE a.latitude IS NOT NULL
      AND a.longitude IS NOT NULL
      AND public.calculate_gps_distance(a.latitude, a.longitude, p_latitude, p_longitude) <= p_gps_threshold
    ORDER BY public.calculate_gps_distance(a.latitude, a.longitude, p_latitude, p_longitude)
    LIMIT 1;
  END IF;

  RETURN duplicate_id;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_address_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.addresses
  SET
    total_reports = (
      SELECT COUNT(*)
      FROM public.reports
      WHERE address_id = NEW.address_id
    ),
    risk_score = LEAST(10, (
      SELECT COUNT(*) * 1.5 +
        COALESCE(SUM(CASE WHEN is_verified THEN 2 ELSE 0 END), 0)
      FROM public.reports
      WHERE address_id = NEW.address_id
    )),
    updated_at = now()
  WHERE id = NEW.address_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_confirmation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reports
    SET
      confirmations_count = confirmations_count + CASE WHEN NEW.confirmation_type = 'confirm' THEN 1 ELSE 0 END,
      is_verified = CASE WHEN confirmations_count + 1 >= 3 THEN true ELSE is_verified END
    WHERE id = NEW.report_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reports
    SET confirmations_count = GREATEST(0, confirmations_count - 1)
    WHERE id = OLD.report_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_tip_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tips
    SET likes_count = likes_count + 1
    WHERE id = NEW.tip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tips
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.tip_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.reset_daily_search_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.daily_search_count := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
