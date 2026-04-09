/*
  # Drop Unused Indexes

  Removes four indexes that have never been used by the query planner,
  reducing write overhead and storage without any query performance impact.

  ## Dropped Indexes
  - `idx_reports_address_id` on `public.reports`
  - `idx_reports_driver_id` on `public.reports`
  - `idx_tips_address_id` on `public.tips`
  - `idx_tips_driver_id` on `public.tips`

  These indexes were flagged as unused. Foreign key columns that truly need
  indexing for joins are handled by existing constraints or will be re-added
  only if query analysis shows they are needed.
*/

DROP INDEX IF EXISTS public.idx_reports_address_id;
DROP INDEX IF EXISTS public.idx_reports_driver_id;
DROP INDEX IF EXISTS public.idx_tips_address_id;
DROP INDEX IF EXISTS public.idx_tips_driver_id;
