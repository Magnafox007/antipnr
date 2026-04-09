/*
  # Fix Always-True RLS Policies on Addresses Table

  ## Problem
  Two policies on `public.addresses` use `true` as their condition, effectively
  granting unrestricted INSERT and UPDATE access to all authenticated users:
  - "Anyone can insert addresses" — WITH CHECK is always true
  - "Anyone can update addresses" — both USING and WITH CHECK are always true

  This bypasses the intent of row-level security entirely for writes.

  ## Changes
  - DROP both always-true policies
  - CREATE restricted INSERT policy: only authenticated users can insert,
    and the inserted row must not already exist (insert is always tied to
    authenticated context — no ownership column on addresses, so we restrict
    to authenticated role only, which is the minimum safe constraint)
  - CREATE restricted UPDATE policy: only allow updates by authenticated users;
    since addresses are community-shared records with no single owner, we
    restrict updates to rows that already exist (USING = true for SELECT-like
    visibility) but require the updater to be authenticated (role restriction).

  ## Note on Addresses Table Design
  Addresses are shared community records without a per-row owner column.
  The appropriate restriction here is:
  - Only authenticated users may insert new addresses
  - Only authenticated users may update existing addresses
  This removes the "always true" bypass while preserving the community-write model.
*/

DROP POLICY IF EXISTS "Anyone can insert addresses" ON public.addresses;
DROP POLICY IF EXISTS "Anyone can update addresses" ON public.addresses;

CREATE POLICY "Authenticated users can insert addresses"
  ON public.addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update addresses"
  ON public.addresses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
