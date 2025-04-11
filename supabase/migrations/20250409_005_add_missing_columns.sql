-- Add missing columns to game_stats table if they don't exist
DO $$
BEGIN
  -- Add best time columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'best_time_easy'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN best_time_easy INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'best_time_medium'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN best_time_medium INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'best_time_hard'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN best_time_hard INTEGER;
  END IF;

  -- Add game count columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'games_count_easy'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN games_count_easy INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'games_count_medium'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN games_count_medium INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'games_count_hard'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN games_count_hard INTEGER DEFAULT 0;
  END IF;

  -- Add win count columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'wins_count_easy'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN wins_count_easy INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'wins_count_medium'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN wins_count_medium INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'wins_count_hard'
  ) THEN
    ALTER TABLE game_stats ADD COLUMN wins_count_hard INTEGER DEFAULT 0;
  END IF;

  -- Drop old columns if they exist
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'games_played'
  ) THEN
    ALTER TABLE game_stats DROP COLUMN games_played;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'game_stats' AND column_name = 'games_won'
  ) THEN
    ALTER TABLE game_stats DROP COLUMN games_won;
  END IF;
END $$;

-- Add comment to explain this migration
COMMENT ON TABLE game_stats IS 'Stores player statistics including best times, game counts, and win counts for each difficulty level';
