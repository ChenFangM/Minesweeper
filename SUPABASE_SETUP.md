# Supabase Setup for Minesweeps

This document provides instructions for setting up the Supabase backend for the Minesweeps application.

## Database Configuration

1. Log in to your Supabase dashboard at [https://app.supabase.com/](https://app.supabase.com/)
2. Navigate to your project: `ptgdpcyfrufkhtflbaus`
3. Go to the SQL Editor section
4. Create a new query and paste the SQL code below
5. Execute the query to set up the necessary tables and security policies

```sql
-- Create profiles table
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

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id, 
    LOWER(SPLIT_PART(NEW.email, '@', 1)), -- Use part before @ in email as default username
    '', 
    '', 
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
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
```

## Authentication Setup

1. In the Supabase dashboard, go to the Authentication section
2. Under "Authentication Settings":
   - Enable Email/Password sign-in method
   - Configure any additional settings like password strength requirements
   - Set up email templates for confirmation emails

3. Configure CORS (Cross-Origin Resource Sharing):
   - Add your application domain to the allowed list (e.g., `http://localhost:8080`)

## Environment Variables

The application is already configured with the following environment variables:

```
REACT_APP_SUPABASE_URL=https://ptgdpcyfrufkhtflbaus.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Z2RwY3lmcnVma2h0ZmxiYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNzQ5MDMsImV4cCI6MjA1OTc1MDkwM30.hYXKPkhozRHM2WaQGkPZjrNWxNExfhKcUsYNIh_mhfk
```

These are already configured in the application code.

## Testing the Authentication

1. Start the application with `npm run dev`
2. Navigate to the login page
3. Try creating a new account
4. Verify that the user is created in the Supabase Auth dashboard
5. Check that a corresponding profile is created in the profiles table
