/*
  # Add Stripe fields to profiles table

  ## Changes
  - Adds `stripe_customer_id` column to store the Stripe customer ID
  - Adds `stripe_subscription_id` column to store the active subscription ID

  ## Notes
  - Both columns are nullable (users start without a Stripe subscription)
  - Used by the stripe-webhook Edge Function to upgrade/downgrade plan_type
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_subscription_id text;
  END IF;
END $$;
