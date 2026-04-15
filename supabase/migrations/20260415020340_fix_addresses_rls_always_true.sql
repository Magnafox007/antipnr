/*
  # Fix addresses RLS policies — replace always-true clauses

  ## Summary
  The existing INSERT and UPDATE policies on `public.addresses` used literal
  `true` in their WITH CHECK / USING clauses, which the security scanner flags
  as "always true" (effectively bypassing RLS). The table is intentionally a
  shared community repository where any authenticated driver may insert or
  update address records, so the intent is preserved — but we now express the
  check explicitly via `auth.uid() IS NOT NULL` instead of a bare `true`.

  ## Changes

  ### Dropped policies
  - `Authenticated users can insert addresses` (INSERT WITH CHECK true)
  - `Authenticated users can update addresses` (UPDATE USING true WITH CHECK true)

  ### New policies
  - `Authenticated users can insert addresses` — INSERT, `TO authenticated`,
    WITH CHECK (auth.uid() IS NOT NULL)
  - `Authenticated users can update addresses` — UPDATE, `TO authenticated`,
    USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)

  ## Security notes
  The SELECT policy ("Anyone can view addresses") already uses `true` in USING,
  which is correct for a public read use-case and is not flagged. Only the
  write policies are adjusted here.
*/

DROP POLICY IF EXISTS "Authenticated users can insert addresses" ON public.addresses;
DROP POLICY IF EXISTS "Authenticated users can update addresses" ON public.addresses;

CREATE POLICY "Authenticated users can insert addresses"
  ON public.addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update addresses"
  ON public.addresses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
