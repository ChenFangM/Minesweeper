-- Migration: Create Duo Game Tables
-- Description: Creates tables needed for the duo game functionality

-- Create duo_games table
CREATE TABLE IF NOT EXISTS duo_games (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  game_id UUID NOT NULL UNIQUE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting, ready, playing, completed
  current_round INTEGER NOT NULL DEFAULT 1,
  total_rounds INTEGER NOT NULL DEFAULT 3,
  creator_score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  current_board_seed INTEGER,
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on game_id for faster lookups
CREATE INDEX IF NOT EXISTS duo_games_game_id_idx ON duo_games(game_id);
CREATE INDEX IF NOT EXISTS duo_games_creator_id_idx ON duo_games(creator_id);
CREATE INDEX IF NOT EXISTS duo_games_opponent_id_idx ON duo_games(opponent_id);

-- Enable RLS for duo_games table
ALTER TABLE duo_games ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for duo_games
CREATE POLICY "Users can view duo games they are part of"
  ON duo_games
  FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create their own duo games"
  ON duo_games
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update duo games they are part of"
  ON duo_games
  FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- Create function to join a duo game
CREATE OR REPLACE FUNCTION join_duo_game(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_game_exists BOOLEAN;
  v_is_creator BOOLEAN;
  v_has_opponent BOOLEAN;
BEGIN
  -- Check if game exists
  SELECT EXISTS(SELECT 1 FROM duo_games WHERE game_id = p_game_id) INTO v_game_exists;
  
  IF NOT v_game_exists THEN
    RAISE EXCEPTION 'Game not found';
    RETURN FALSE;
  END IF;
  
  -- Check if user is already the creator
  SELECT (creator_id = p_user_id) FROM duo_games WHERE game_id = p_game_id INTO v_is_creator;
  
  IF v_is_creator THEN
    -- User is already the creator, nothing to do
    RETURN TRUE;
  END IF;
  
  -- Check if game already has an opponent
  SELECT (opponent_id IS NOT NULL) FROM duo_games WHERE game_id = p_game_id INTO v_has_opponent;
  
  IF v_has_opponent THEN
    -- Check if user is already the opponent
    IF EXISTS(SELECT 1 FROM duo_games WHERE game_id = p_game_id AND opponent_id = p_user_id) THEN
      -- User is already the opponent, nothing to do
      RETURN TRUE;
    ELSE
      -- Game already has a different opponent
      RAISE EXCEPTION 'Game already has an opponent';
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Join as opponent
  UPDATE duo_games
  SET 
    opponent_id = p_user_id,
    status = 'ready',
    updated_at = NOW()
  WHERE game_id = p_game_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create duo_game_moves table to track player moves
CREATE TABLE IF NOT EXISTS duo_game_moves (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES duo_games(game_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  move_type VARCHAR(20) NOT NULL, -- reveal, flag
  row_index INTEGER NOT NULL,
  col_index INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on game_id for faster lookups
CREATE INDEX IF NOT EXISTS duo_game_moves_game_id_idx ON duo_game_moves(game_id);
CREATE INDEX IF NOT EXISTS duo_game_moves_user_id_idx ON duo_game_moves(user_id);

-- Enable RLS for duo_game_moves table
ALTER TABLE duo_game_moves ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for duo_game_moves
CREATE POLICY "Users can view moves for games they are part of"
  ON duo_game_moves
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duo_games
      WHERE duo_games.game_id = duo_game_moves.game_id
      AND (duo_games.creator_id = auth.uid() OR duo_games.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own moves"
  ON duo_game_moves
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM duo_games
      WHERE duo_games.game_id = duo_game_moves.game_id
      AND (duo_games.creator_id = auth.uid() OR duo_games.opponent_id = auth.uid())
    )
  );

-- Create duo_game_progress table to track player progress
CREATE TABLE IF NOT EXISTS duo_game_progress (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES duo_games(game_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  percent_revealed NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_elapsed INTEGER NOT NULL DEFAULT 0,
  game_status VARCHAR(20) NOT NULL DEFAULT 'idle', -- idle, playing, won, lost
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id, round)
);

-- Create index on game_id for faster lookups
CREATE INDEX IF NOT EXISTS duo_game_progress_game_id_idx ON duo_game_progress(game_id);
CREATE INDEX IF NOT EXISTS duo_game_progress_user_id_idx ON duo_game_progress(user_id);

-- Enable RLS for duo_game_progress table
ALTER TABLE duo_game_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for duo_game_progress
CREATE POLICY "Users can view progress for games they are part of"
  ON duo_game_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duo_games
      WHERE duo_games.game_id = duo_game_progress.game_id
      AND (duo_games.creator_id = auth.uid() OR duo_games.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert or update their own progress"
  ON duo_game_progress
  FOR ALL
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM duo_games
      WHERE duo_games.game_id = duo_game_progress.game_id
      AND (duo_games.creator_id = auth.uid() OR duo_games.opponent_id = auth.uid())
    )
  );
