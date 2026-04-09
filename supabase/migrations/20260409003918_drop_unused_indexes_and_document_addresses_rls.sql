/*
  # Drop Unused Indexes and Document Addresses RLS Intent

  ## Summary
  Removes all indexes that have not been used by the query planner. Unused indexes
  consume storage and slow down writes without providing read benefits. They can be
  re-added later if query patterns change.

  Also adds clarifying comments to the `addresses` table RLS policies to document
  that unrestricted authenticated access is intentional — addresses are shared
  community resources with no single owner.

  ## Dropped Indexes

  ### public.reports
  - `idx_reports_address_id`
  - `idx_reports_driver_id`
  - `idx_reports_created_at`

  ### public.confirmations
  - `idx_confirmations_report_id`
  - `idx_confirmations_driver_id`

  ### public.tips
  - `idx_tips_address_id`
  - `idx_tips_driver_id`

  ### public.tip_likes
  - `idx_tip_likes_driver_id`

  ### public.addresses
  - `idx_addresses_coordinates`
  - `idx_addresses_normalized_address`
  - `idx_addresses_search`

  ## Notes
  - The two remaining items (Auth DB Connection Strategy and Leaked Password Protection)
    require manual configuration in the Supabase dashboard and cannot be changed
    via SQL migration.
  - The `addresses` INSERT/UPDATE policies allowing any authenticated user are
    intentional: addresses are shared community data with no per-row owner.
    The comment below documents this design decision.
*/

-- ============================================================
-- Drop unused indexes on reports
-- ============================================================
DROP INDEX IF EXISTS public.idx_reports_address_id;
DROP INDEX IF EXISTS public.idx_reports_driver_id;
DROP INDEX IF EXISTS public.idx_reports_created_at;

-- ============================================================
-- Drop unused indexes on confirmations
-- ============================================================
DROP INDEX IF EXISTS public.idx_confirmations_report_id;
DROP INDEX IF EXISTS public.idx_confirmations_driver_id;

-- ============================================================
-- Drop unused indexes on tips
-- ============================================================
DROP INDEX IF EXISTS public.idx_tips_address_id;
DROP INDEX IF EXISTS public.idx_tips_driver_id;

-- ============================================================
-- Drop unused indexes on tip_likes
-- ============================================================
DROP INDEX IF EXISTS public.idx_tip_likes_driver_id;

-- ============================================================
-- Drop unused indexes on addresses
-- ============================================================
DROP INDEX IF EXISTS public.idx_addresses_coordinates;
DROP INDEX IF EXISTS public.idx_addresses_normalized_address;
DROP INDEX IF EXISTS public.idx_addresses_search;

-- ============================================================
-- Document intentional open-access RLS on addresses
-- ============================================================
COMMENT ON TABLE public.addresses IS
'Shared community address repository. Addresses have no single owner — any
authenticated driver may create or update address records (e.g., to add GPS
coordinates or correct normalization). Ownership and accountability are tracked
at the reports and tips level, not here. The INSERT and UPDATE RLS policies
granting access to all authenticated users are therefore intentional.';
