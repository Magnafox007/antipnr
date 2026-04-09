/*
  # Add Indexes for Unindexed Foreign Keys

  ## Summary
  Creates covering indexes for all foreign key columns that currently lack one.
  Without indexes on foreign key columns, queries that join or filter by these
  columns (e.g., cascading deletes, lookups by driver or address) require full
  table scans.

  ## New Indexes

  ### public.confirmations
  - `idx_confirmations_driver_id` — covers `confirmations_driver_id_fkey`

  ### public.reports
  - `idx_reports_address_id` — covers `reports_address_id_fkey`
  - `idx_reports_driver_id` — covers `reports_driver_id_fkey`

  ### public.tip_likes
  - `idx_tip_likes_driver_id` — covers `tip_likes_driver_id_fkey`

  ### public.tips
  - `idx_tips_address_id` — covers `tips_address_id_fkey`
  - `idx_tips_driver_id` — covers `tips_driver_id_fkey`

  ## Notes
  - All indexes use `IF NOT EXISTS` to be safe against re-runs.
  - The Auth DB Connection Strategy and Leaked Password Protection issues require
    manual configuration in the Supabase dashboard and cannot be changed via SQL.
  - The `addresses` INSERT/UPDATE RLS policies granting all authenticated users
    access are intentional — addresses are shared community data with no per-row
    owner. Accountability is tracked at the reports/tips level.
*/

CREATE INDEX IF NOT EXISTS idx_confirmations_driver_id
  ON public.confirmations (driver_id);

CREATE INDEX IF NOT EXISTS idx_reports_address_id
  ON public.reports (address_id);

CREATE INDEX IF NOT EXISTS idx_reports_driver_id
  ON public.reports (driver_id);

CREATE INDEX IF NOT EXISTS idx_tip_likes_driver_id
  ON public.tip_likes (driver_id);

CREATE INDEX IF NOT EXISTS idx_tips_address_id
  ON public.tips (address_id);

CREATE INDEX IF NOT EXISTS idx_tips_driver_id
  ON public.tips (driver_id);
