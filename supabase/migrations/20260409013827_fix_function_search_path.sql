/*
  # Fix Mutable search_path on check_and_increment_search Function

  ## Problem
  The function `public.check_and_increment_search` has a mutable `search_path`,
  which means a malicious user could potentially manipulate the search path to
  cause the function to resolve schema objects (tables, functions) from unexpected
  schemas — a schema injection / privilege escalation risk.

  ## Fix
  Recreate the function with `SET search_path = public, pg_temp` to lock it to
  the public schema. The function logic is unchanged.

  ## Security
  - `SECURITY DEFINER` functions must always have a fixed search_path
  - `pg_temp` is included last to prevent temp table injection
*/

CREATE OR REPLACE FUNCTION public.check_and_increment_search(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_allowed boolean;
  v_new_count integer;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', true, 'plan', 'free', 'search_count', 0);
  END IF;

  IF v_profile.last_reset_date < CURRENT_DATE THEN
    v_profile.daily_search_count := 0;
    v_profile.last_reset_date := CURRENT_DATE;
  END IF;

  IF v_profile.plan_type = 'pro' THEN
    v_allowed := true;
  ELSE
    v_allowed := v_profile.daily_search_count < 5;
  END IF;

  IF v_allowed THEN
    v_new_count := v_profile.daily_search_count + 1;
    UPDATE profiles
    SET daily_search_count = v_new_count,
        last_reset_date = v_profile.last_reset_date,
        updated_at = now()
    WHERE id = p_user_id;
  ELSE
    v_new_count := v_profile.daily_search_count;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'plan', v_profile.plan_type,
    'search_count', v_new_count
  );
END;
$$;
