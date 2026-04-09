/*
  # Add role field and admin RLS policies

  ## Summary
  Adds an admin role system to the profiles table and creates service-role-level
  access policies so admins can read and update all user profiles.

  ## Changes
  - `profiles` table gets a new `role` column (default 'user', can be 'admin')
  - New RLS policies allow admins to SELECT and UPDATE any profile
  - Admin check is based on role = 'admin' in profiles (evaluated via service role)

  ## Security
  - Admin SELECT policy: checks the requesting user's own profile for role = 'admin'
  - Admin UPDATE policy: same check — admins can update any profile (for plan upgrades)
  - Regular user policies remain unchanged
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'user'
      CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );
