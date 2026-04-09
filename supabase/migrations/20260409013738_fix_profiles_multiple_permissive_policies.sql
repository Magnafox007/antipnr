/*
  # Fix Multiple Permissive Policies on Profiles Table

  ## Problem
  The `profiles` table has two permissive SELECT policies and two permissive UPDATE
  policies for `authenticated` users. When multiple permissive policies exist for the
  same role+action, PostgreSQL evaluates them with OR logic, which can allow unintended
  access. They should be consolidated into single policies that handle both regular
  users and admins.

  ## Changes
  - DROP the four conflicting policies (SELECT x2, UPDATE x2)
  - CREATE two replacement policies:
    1. SELECT: users can read their own profile OR they are an admin
    2. UPDATE: users can update their own profile OR they are an admin

  ## Security Notes
  - Regular users can only see/edit their own row
  - Admins (role = 'admin') can see/edit all rows
  - No change in intended access control, just consolidated into single policies
*/

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users or admins can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

CREATE POLICY "Users or admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );
