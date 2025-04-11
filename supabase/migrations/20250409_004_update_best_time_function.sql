-- Create a function to update best times
CREATE OR REPLACE FUNCTION update_best_time(
  p_user_id UUID,
  p_difficulty TEXT,
  p_time INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_field_name TEXT;
  v_current_best INTEGER;
  v_record_exists BOOLEAN;
BEGIN
  -- Determine which field to update based on difficulty
  IF p_difficulty = 'easy' THEN
    v_field_name := 'best_time_easy';
  ELSIF p_difficulty = 'medium' THEN
    v_field_name := 'best_time_medium';
  ELSIF p_difficulty = 'hard' THEN
    v_field_name := 'best_time_hard';
  ELSE
    RAISE EXCEPTION 'Invalid difficulty: %', p_difficulty;
  END IF;
  
  -- Check if record exists
  SELECT EXISTS(SELECT 1 FROM game_stats WHERE user_id = p_user_id) INTO v_record_exists;
  
  -- If record doesn't exist, create it
  IF NOT v_record_exists THEN
    -- Create a new record with dynamic field
    EXECUTE format('
      INSERT INTO game_stats (user_id, games_played, games_won, %I, updated_at)
      VALUES ($1, 1, 1, $2, NOW())
    ', v_field_name)
    USING p_user_id, p_time;
    
    RETURN TRUE;
  END IF;
  
  -- Get current best time
  EXECUTE format('
    SELECT %I FROM game_stats WHERE user_id = $1
  ', v_field_name)
  INTO v_current_best
  USING p_user_id;
  
  -- If no best time or new time is better, update it
  IF v_current_best IS NULL OR p_time < v_current_best THEN
    EXECUTE format('
      UPDATE game_stats
      SET %I = $1, updated_at = NOW()
      WHERE user_id = $2
    ', v_field_name)
    USING p_time, p_user_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_best_time TO authenticated;
