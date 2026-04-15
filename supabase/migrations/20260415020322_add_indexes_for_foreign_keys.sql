/*
  # Add indexes for unindexed foreign keys

  ## Summary
  Adds covering indexes for foreign key columns that were missing indexes on
  the `reports` and `tips` tables.

  ## New Indexes

  ### reports table
  - `idx_reports_address_id` — covers `reports_address_id_fkey`
  - `idx_reports_driver_id` — covers `reports_driver_id_fkey`

  ### tips table
  - `idx_tips_address_id` — covers `tips_address_id_fkey`
  - `idx_tips_driver_id` — covers `tips_driver_id_fkey`

  ## Notes
  Without these indexes, JOIN and WHERE queries filtering by these foreign key
  columns require full table scans, which degrades performance as data grows.
*/

CREATE INDEX IF NOT EXISTS idx_reports_address_id ON public.reports (address_id);
CREATE INDEX IF NOT EXISTS idx_reports_driver_id  ON public.reports (driver_id);
CREATE INDEX IF NOT EXISTS idx_tips_address_id    ON public.tips (address_id);
CREATE INDEX IF NOT EXISTS idx_tips_driver_id     ON public.tips (driver_id);
