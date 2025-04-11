-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile'
  ) THEN
    DROP POLICY "Users can view their own profile" ON profiles;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    DROP POLICY "Users can update their own profile" ON profiles;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
  ) THEN
    DROP POLICY "Users can insert their own profile" ON profiles;
  END IF;
END $$;

-- Create policy to allow users to view their own profile
CREATE POLICY "Users can view their own profile" 
  ON profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
  ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create or replace function to handle new user creation
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
  -- Extract base username from email
  base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
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
  INSERT INTO public.profiles (id, username, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id, 
    final_username,
    '', 
    '', 
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Skip if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create game_stats table to track user game statistics
CREATE TABLE IF NOT EXISTS game_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL,
  difficulty TEXT,
  time_seconds INTEGER,
  is_win BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for game_stats
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_stats' AND policyname = 'Users can view their own game stats'
  ) THEN
    DROP POLICY "Users can view their own game stats" ON game_stats;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_stats' AND policyname = 'Users can insert their own game stats'
  ) THEN
    DROP POLICY "Users can insert their own game stats" ON game_stats;
  END IF;
END $$;

-- Create policy to allow users to view their own game stats
CREATE POLICY "Users can view their own game stats" 
  ON game_stats 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own game stats
CREATE POLICY "Users can insert their own game stats" 
  ON game_stats 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
