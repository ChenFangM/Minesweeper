-- Create friends table to store friend relationships
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS for friends table
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can view their own friend relationships'
  ) THEN
    DROP POLICY "Users can view their own friend relationships" ON friends;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can insert friend requests'
  ) THEN
    DROP POLICY "Users can insert friend requests" ON friends;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can update their own friend relationships'
  ) THEN
    DROP POLICY "Users can update their own friend relationships" ON friends;
  END IF;
END $$;

-- Create policy to allow users to view their own friend relationships
CREATE POLICY "Users can view their own friend relationships" 
  ON friends 
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create policy to allow users to insert friend requests
CREATE POLICY "Users can insert friend requests" 
  ON friends 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own friend relationships
CREATE POLICY "Users can update their own friend relationships" 
  ON friends 
  FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create function to handle friend request responses
CREATE OR REPLACE FUNCTION handle_friend_request_response()
RETURNS TRIGGER AS $$
BEGIN
  -- If the status is changed to 'accepted', create a reciprocal relationship
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Check if reciprocal relationship already exists
    IF NOT EXISTS (
      SELECT 1 FROM friends 
      WHERE user_id = NEW.friend_id AND friend_id = NEW.user_id
    ) THEN
      -- Create reciprocal relationship
      INSERT INTO friends (user_id, friend_id, status)
      VALUES (NEW.friend_id, NEW.user_id, 'accepted');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_friend_request_response ON friends;

-- Create trigger for friend request responses
CREATE TRIGGER on_friend_request_response
  AFTER UPDATE ON friends
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected'))
  EXECUTE FUNCTION handle_friend_request_response();

-- Create friend_search view for finding users
DROP VIEW IF EXISTS friend_search;
CREATE VIEW friend_search AS
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  EXISTS (
    SELECT 1 FROM friends f 
    WHERE (f.user_id = p.id AND f.friend_id = auth.uid() AND f.status = 'accepted') OR
          (f.user_id = auth.uid() AND f.friend_id = p.id AND f.status = 'accepted')
  ) AS is_friend,
  EXISTS (
    SELECT 1 FROM friends f 
    WHERE f.user_id = auth.uid() AND f.friend_id = p.id AND f.status = 'pending'
  ) AS request_sent,
  EXISTS (
    SELECT 1 FROM friends f 
    WHERE f.user_id = p.id AND f.friend_id = auth.uid() AND f.status = 'pending'
  ) AS request_received
FROM profiles p
WHERE p.id != auth.uid();

-- Create security policy for the view
-- Note: We can't use ENABLE ROW LEVEL SECURITY on views directly
-- Instead, we'll rely on RLS from the underlying tables
-- and create a security policy for the view
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can search for other users'
  ) THEN
    DROP POLICY IF EXISTS "Users can search for other users" ON profiles;
  END IF;
END $$;

-- Create policy on the underlying table instead
CREATE POLICY "Users can search for other users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
