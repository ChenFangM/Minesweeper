-- Create game_stats table to store player statistics by difficulty level
CREATE TABLE IF NOT EXISTS game_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Best times for each difficulty
  best_time_easy INTEGER,
  best_time_medium INTEGER,
  best_time_hard INTEGER,
  -- Game counts for each difficulty
  games_count_easy INTEGER DEFAULT 0,
  games_count_medium INTEGER DEFAULT 0,
  games_count_hard INTEGER DEFAULT 0,
  -- Win counts for each difficulty
  wins_count_easy INTEGER DEFAULT 0,
  wins_count_medium INTEGER DEFAULT 0,
  wins_count_hard INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS for game_stats table
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
    SELECT 1 FROM pg_policies WHERE tablename = 'game_stats' AND policyname = 'Users can update their own game stats'
  ) THEN
    DROP POLICY "Users can update their own game stats" ON game_stats;
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

-- Create policy to allow users to update their own game stats
CREATE POLICY "Users can update their own game stats" 
  ON game_stats 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own game stats
CREATE POLICY "Users can insert their own game stats" 
  ON game_stats 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
