-- Migration: Fix User Creation
-- Description: Improves the handle_new_user function to better handle errors and edge cases

-- Create or replace the improved function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  username_exists BOOLEAN;
  random_suffix INT;
  max_attempts INT := 10; -- Maximum number of attempts to find a unique username
  attempt_count INT := 0;
BEGIN
  -- Check if email is null or empty
  IF NEW.email IS NULL OR NEW.email = '' THEN
    -- Use a fallback username if email is not available
    base_username := 'user' || extract(epoch from now())::bigint % 1000000;
  ELSE
    -- Extract base username from email
    base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  END IF;
  
  final_username := base_username;
  
  -- Check if username exists
  LOOP
    SELECT EXISTS (SELECT 1 FROM profiles WHERE username = final_username) INTO username_exists;
    
    EXIT WHEN NOT username_exists OR attempt_count >= max_attempts;
    
    -- Username exists, add random suffix
    random_suffix := floor(random() * 1000)::int;
    final_username := base_username || random_suffix;
    attempt_count := attempt_count + 1;
  END LOOP;
  
  -- If we couldn't find a unique username after max attempts, use timestamp
  IF username_exists THEN
    final_username := base_username || extract(epoch from now())::bigint % 10000;
  END IF;
  
  -- Insert the new profile with the unique username
  BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, updated_at)
    VALUES (
      NEW.id, 
      final_username,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''), 
      NOW()
    )
    ON CONFLICT (id) DO NOTHING; -- Skip if profile already exists
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to automatically create game_stats entry when a profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile() 
RETURNS TRIGGER AS $$
BEGIN
  -- Create a game_stats entry for the new user
  BEGIN
    INSERT INTO public.game_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE WARNING 'Error creating game_stats for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Create trigger to automatically create game_stats when a new profile is created
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- Add comment to explain this migration
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a user profile with a unique username when a new user signs up';
COMMENT ON FUNCTION public.handle_new_profile() IS 'Creates game statistics entry when a new profile is created';
