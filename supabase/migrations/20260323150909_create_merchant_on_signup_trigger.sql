/*
  # Auto-create Merchant on User Signup

  ## Overview
  This migration creates a trigger that automatically creates a merchant record
  when a new user signs up through Supabase Auth.

  ## Function
  - `handle_new_user()` - Creates a merchant record with the user's ID and business name

  ## Trigger
  - `on_auth_user_created` - Fires after INSERT on auth.users

  ## Notes
  - Business name is extracted from user metadata if provided, otherwise defaults to 'My Business'
  - This ensures every authenticated user has a corresponding merchant record
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.merchants (user_id, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();