-- Migration: Fix Database User Creation
-- Description: Improves error handling in the user creation process

-- Create a more robust function to handle new user creation
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
  
  -- Create initial game stats for the user
  BEGIN
    INSERT INTO public.game_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE WARNING 'Error creating game stats for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing trigger to avoid duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger with the improved function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comments to explain this migration
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a user profile and game stats when a new user signs up with improved error handling';
