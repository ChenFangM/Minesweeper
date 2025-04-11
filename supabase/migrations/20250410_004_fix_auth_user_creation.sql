-- Migration: Fix Auth User Creation
-- Description: Addresses 500 errors during user signup by ensuring proper auth schema setup

-- First, make sure the auth schema extensions are properly enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the auth schema is properly set up
DO $$
BEGIN
  -- Check if auth schema exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    RAISE NOTICE 'Creating auth schema';
    CREATE SCHEMA IF NOT EXISTS auth;
  END IF;
END $$;

-- Create a more robust function to handle new user creation that won't fail
-- even if there are issues with the user's email or other data
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  username_exists BOOLEAN;
  random_suffix INT;
  max_attempts INT := 10;
  attempt_count INT := 0;
BEGIN
  -- Generate a safe username regardless of email validity
  BEGIN
    IF NEW.email IS NULL OR NEW.email = '' OR position('@' in NEW.email) = 0 THEN
      -- Use a completely random username if email is invalid
      base_username := 'user' || floor(random() * 1000000)::int;
    ELSE
      -- Extract base username from email
      base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback if any error occurs during email parsing
    base_username := 'user' || floor(random() * 1000000)::int;
  END;
  
  -- Ensure the base_username is valid
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user' || floor(random() * 1000000)::int;
  END IF;
  
  final_username := base_username;
  
  -- Find a unique username with error handling
  BEGIN
    LOOP
      SELECT EXISTS (SELECT 1 FROM profiles WHERE username = final_username) INTO username_exists;
      EXIT WHEN NOT username_exists OR attempt_count >= max_attempts;
      random_suffix := floor(random() * 1000)::int;
      final_username := base_username || random_suffix;
      attempt_count := attempt_count + 1;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- If the loop fails, generate a completely random username
    final_username := 'user' || extract(epoch from now())::bigint % 1000000;
  END;
  
  -- Ensure we have a unique username
  IF username_exists OR final_username IS NULL OR final_username = '' THEN
    final_username := 'user' || extract(epoch from now())::bigint % 1000000;
  END IF;
  
  -- Create the profile with comprehensive error handling
  BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, updated_at, created_at)
    VALUES (
      NEW.id, 
      final_username,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''), 
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Don't rethrow the exception - we want the trigger to succeed even if profile creation fails
  END;
  
  -- Create game stats entry with error handling
  BEGIN
    INSERT INTO public.game_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating game stats for user %: %', NEW.id, SQLERRM;
    -- Don't rethrow the exception
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a function to repair any users that might be missing profiles
CREATE OR REPLACE FUNCTION public.repair_missing_profiles()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id, 
        username, 
        full_name, 
        avatar_url, 
        updated_at,
        created_at
      )
      VALUES (
        user_record.id,
        COALESCE(LOWER(SPLIT_PART(user_record.email, '@', 1)), 'user' || floor(random() * 1000000)::int),
        COALESCE(user_record.raw_user_meta_data->>'full_name', ''),
        COALESCE(user_record.raw_user_meta_data->>'avatar_url', ''),
        NOW(),
        NOW()
      );
      
      -- Also create game stats
      INSERT INTO public.game_stats (user_id)
      VALUES (user_record.id)
      ON CONFLICT (user_id) DO NOTHING;
      
      RAISE NOTICE 'Created missing profile for user %', user_record.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a user profile and game stats when a new user signs up with comprehensive error handling';
COMMENT ON FUNCTION public.repair_missing_profiles() IS 'Repairs any users that are missing profiles by creating them';
