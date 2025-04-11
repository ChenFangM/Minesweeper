-- Migration: Add Game Search Functions
-- Description: Adds functions to search for games by ID and join them

-- Create a function to search for games by ID without requiring authentication
CREATE OR REPLACE FUNCTION search_game_by_id(p_game_id UUID)
RETURNS TABLE (
  id BIGINT,
  game_id UUID,
  status VARCHAR,
  has_opponent BOOLEAN,
  created_at TIMESTAMPTZ
) SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.game_id,
    g.status,
    (g.opponent_id IS NOT NULL) AS has_opponent,
    g.created_at
  FROM duo_games g
  WHERE g.game_id = p_game_id;
END;
$$ LANGUAGE plpgsql;

-- Improve the join_duo_game function to handle permissions better
CREATE OR REPLACE FUNCTION join_duo_game(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER
AS $$
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
$$ LANGUAGE plpgsql;

-- Create a policy to allow any authenticated user to find games by ID
CREATE POLICY "Anyone can search for games by ID"
  ON duo_games
  FOR SELECT
  USING (true);

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION search_game_by_id TO public;
GRANT EXECUTE ON FUNCTION join_duo_game TO public;
