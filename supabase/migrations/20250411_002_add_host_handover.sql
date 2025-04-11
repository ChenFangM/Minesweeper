-- Migration: Add Host Handover Functionality
-- Description: Adds functions to handle host handover when the original host leaves

-- Create a function to handle host handover
CREATE OR REPLACE FUNCTION handle_host_handover(p_game_id UUID, p_new_host_id UUID)
RETURNS BOOLEAN SECURITY DEFINER
AS $$
DECLARE
  v_game_exists BOOLEAN;
  v_current_status VARCHAR;
  v_current_host_id UUID;
  v_opponent_id UUID;
BEGIN
  -- Check if game exists
  SELECT 
    EXISTS(SELECT 1 FROM duo_games WHERE game_id = p_game_id),
    status,
    creator_id,
    opponent_id
  FROM duo_games 
  WHERE game_id = p_game_id
  INTO v_game_exists, v_current_status, v_current_host_id, v_opponent_id;
  
  IF NOT v_game_exists THEN
    RAISE EXCEPTION 'Game not found';
    RETURN FALSE;
  END IF;
  
  -- Check if the new host is the current opponent
  IF p_new_host_id != v_opponent_id THEN
    RAISE EXCEPTION 'Only the current opponent can become the new host';
    RETURN FALSE;
  END IF;
  
  -- Perform the host handover
  UPDATE duo_games
  SET 
    creator_id = p_new_host_id,
    opponent_id = v_current_host_id
  WHERE game_id = p_game_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to perform host handover: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Modify the join_duo_game function to allow rejoining as opponent
CREATE OR REPLACE FUNCTION join_duo_game(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER
AS $$
DECLARE
  v_game_exists BOOLEAN;
  v_is_creator BOOLEAN;
  v_has_opponent BOOLEAN;
  v_current_status VARCHAR;
  v_is_former_creator BOOLEAN;
BEGIN
  -- Check if game exists and get current status
  SELECT 
    EXISTS(SELECT 1 FROM duo_games WHERE game_id = p_game_id),
    status
  FROM duo_games 
  WHERE game_id = p_game_id
  INTO v_game_exists, v_current_status;
  
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
  
  -- Check if user was the former creator (now trying to rejoin)
  SELECT EXISTS(
    SELECT 1 FROM duo_games_history 
    WHERE game_id = p_game_id AND former_creator_id = p_user_id
  ) INTO v_is_former_creator;
  
  -- If game is not in waiting status but user is a former creator, allow them to rejoin
  IF v_current_status != 'waiting' AND v_is_former_creator THEN
    -- Allow former host to rejoin as opponent
    UPDATE duo_games
    SET opponent_id = p_user_id, status = 'waiting'
    WHERE game_id = p_game_id AND opponent_id IS NULL;
    RETURN TRUE;
  END IF;
  
  -- Normal join logic for waiting games
  IF v_current_status != 'waiting' THEN
    RAISE EXCEPTION 'Game is not in waiting status';
    RETURN FALSE;
  END IF;
  
  IF v_has_opponent THEN
    RAISE EXCEPTION 'Game already has an opponent';
    RETURN FALSE;
  END IF;
  
  -- Join the game as opponent
  UPDATE duo_games
  SET opponent_id = p_user_id
  WHERE game_id = p_game_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to join game: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create a history table to track host changes
CREATE TABLE IF NOT EXISTS duo_games_history (
  id BIGSERIAL PRIMARY KEY,
  game_id UUID NOT NULL,
  former_creator_id UUID NOT NULL,
  new_creator_id UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a trigger to record host changes
CREATE OR REPLACE FUNCTION record_host_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.creator_id != NEW.creator_id THEN
    INSERT INTO duo_games_history (game_id, former_creator_id, new_creator_id)
    VALUES (NEW.game_id, OLD.creator_id, NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_host_change
AFTER UPDATE ON duo_games
FOR EACH ROW
WHEN (OLD.creator_id IS DISTINCT FROM NEW.creator_id)
EXECUTE FUNCTION record_host_change();
