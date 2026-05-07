/*
  # Restrict EXECUTE on SECURITY DEFINER functions

  ## Summary
  Both `public.check_and_increment_search` and `public.create_profile_on_signup`
  are SECURITY DEFINER functions that were publicly executable by `anon` and
  `authenticated` roles via PostgREST's `/rest/v1/rpc/` endpoint.

  ## Changes

  ### create_profile_on_signup()
  - Revoke EXECUTE from public, anon, and authenticated
  - This is a trigger function invoked only by the `on_auth_user_created` trigger.
    It must never be callable directly via the API.

  ### check_and_increment_search(p_user_id uuid)
  - Revoke EXECUTE from public and anon
  - Grant EXECUTE only to authenticated
  - This function is used by signed-in users to check/increment their daily
    search counter. Anonymous users should never be able to call it.

  ## Security notes
  - Both functions remain SECURITY DEFINER, which is intentional: they need
    elevated privileges to write to the profiles table.
  - Revoking from PUBLIC removes the default grant that PostgreSQL gives to all
    roles on newly created functions.
*/

-- Fully lock down the trigger function
REVOKE EXECUTE ON FUNCTION public.create_profile_on_signup() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_profile_on_signup() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_profile_on_signup() FROM authenticated;

-- Lock down the search increment function, then grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.check_and_increment_search(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_search(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_and_increment_search(uuid) TO authenticated;
