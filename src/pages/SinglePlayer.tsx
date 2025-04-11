import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Clock, RefreshCw, Flag, Award, Save } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

// Game difficulty configurations
const DIFFICULTY_CONFIGS = {
  easy: {
    rows: 9,
    cols: 9,
    mines: 10,
    label: 'Easy'
  },
  medium: {
    rows: 16,
    cols: 16,
    mines: 40,
    label: 'Medium'
  },
  hard: {
    rows: 16,
    cols: 30,
    mines: 99,
    label: 'Hard'
  }
};

// Cell status types
type CellStatus = 'hidden' | 'revealed' | 'flagged';

// Cell interface
interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  status: CellStatus;
}

// Game state interface
interface GameState {
  board: Cell[][];
  gameStatus: 'idle' | 'playing' | 'won' | 'lost';
  minesLeft: number;
  timeElapsed: number;
}

const SinglePlayer = () => {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_CONFIGS>('easy');
  const [gameState, setGameState] = useState<GameState>({
    board: [],
    gameStatus: 'idle',
    minesLeft: 0,
    timeElapsed: 0
  });
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [firstClick, setFirstClick] = useState(true);
  const [recordStats, setRecordStats] = useState(true);
  const [bestTimes, setBestTimes] = useState<Record<string, number | null>>({
    easy: null,
    medium: null,
    hard: null
  });
  
  // Track win rates for each difficulty level
  const [winRates, setWinRates] = useState<Record<string, number>>({
    easy: 0,
    medium: 0,
    hard: 0
  });

  // Initialize game board based on difficulty
  const initializeBoard = () => {
    const config = DIFFICULTY_CONFIGS[difficulty];
    const { rows, cols, mines } = config;
    
    // Create empty board
    const newBoard: Cell[][] = Array(rows).fill(null).map((_, rowIndex) => 
      Array(cols).fill(null).map((_, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        isMine: false,
        adjacentMines: 0,
        status: 'hidden'
      }))
    );
    
    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const randomRow = Math.floor(Math.random() * rows);
      const randomCol = Math.floor(Math.random() * cols);
      
      if (!newBoard[randomRow][randomCol].isMine) {
        newBoard[randomRow][randomCol].isMine = true;
        minesPlaced++;
      }
    }
    
    // Calculate adjacent mines for each cell
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!newBoard[row][col].isMine) {
          newBoard[row][col].adjacentMines = countAdjacentMines(newBoard, row, col);
        }
      }
    }
    
    return newBoard;
  };

  // Count adjacent mines for a cell
  const countAdjacentMines = (board: Cell[][], row: number, col: number): number => {
    const config = DIFFICULTY_CONFIGS[difficulty];
    let count = 0;
    
    // Check all 8 adjacent cells
    for (let r = Math.max(0, row - 1); r <= Math.min(config.rows - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(config.cols - 1, col + 1); c++) {
        if (r !== row || c !== col) {
          if (board[r][c].isMine) {
            count++;
          }
        }
      }
    }
    
    return count;
  };

  // Start a new game
  const startNewGame = () => {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    const config = DIFFICULTY_CONFIGS[difficulty];
    const newBoard = initializeBoard();
    
    setGameState({
      board: newBoard,
      gameStatus: 'playing',
      minesLeft: config.mines,
      timeElapsed: 0
    });
    
    // Reset first click flag
    setFirstClick(true);
    setShowGameOverDialog(false);
  };

  // Start the timer on first click
  const startTimer = () => {
    if (firstClick && gameState.gameStatus === 'playing') {
      setFirstClick(false);
      
      // Start the timer
      const interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeElapsed: prev.timeElapsed + 1
        }));
      }, 1000);
      
      setTimerInterval(interval);
    }
  };

  // Handle clicking on a revealed number cell
  const handleRevealedNumberClick = (row: number, col: number) => {
    const cell = gameState.board[row][col];
    if (cell.status !== 'revealed' || cell.adjacentMines === 0) return;
    
    // Count flagged cells around this cell
    let flaggedCount = 0;
    const adjacentCells: {row: number, col: number}[] = [];
    const config = DIFFICULTY_CONFIGS[difficulty];
    
    for (let r = Math.max(0, row - 1); r <= Math.min(config.rows - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(config.cols - 1, col + 1); c++) {
        if (r !== row || c !== col) {
          const adjacentCell = gameState.board[r][c];
          if (adjacentCell.status === 'flagged') {
            flaggedCount++;
          } else if (adjacentCell.status === 'hidden') {
            adjacentCells.push({row: r, col: c});
          }
        }
      }
    }
    
    // If the number of flags matches the number on the cell, reveal all unflagged cells
    if (flaggedCount === cell.adjacentMines && adjacentCells.length > 0) {
      // Clone the board for updates
      const newBoard = [...gameState.board.map(row => [...row])];
      let hitMine = false;
      
      // Check if any of the cells to be revealed is a mine
      for (const {row: r, col: c} of adjacentCells) {
        if (newBoard[r][c].isMine) {
          hitMine = true;
          break;
        }
      }
      
      if (hitMine) {
        // Game over - reveal all mines
        for (let r = 0; r < newBoard.length; r++) {
          for (let c = 0; c < newBoard[0].length; c++) {
            if (newBoard[r][c].isMine) {
              newBoard[r][c].status = 'revealed';
            }
          }
        }
        
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          gameStatus: 'lost'
        }));
        
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
        
        setShowGameOverDialog(true);
      } else {
        // Reveal all adjacent cells
        for (const {row: r, col: c} of adjacentCells) {
          revealCell(newBoard, r, c);
        }
        
        // Check if game is won
        const isGameWon = checkWinCondition(newBoard);
        if (isGameWon) {
          setGameState(prev => ({
            ...prev,
            board: newBoard,
            gameStatus: 'won'
          }));
          
          if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
          }
          
          if (user) {
            saveGameScore(gameState.timeElapsed);
          }
          
          setShowGameOverDialog(true);
        } else {
          setGameState(prev => ({
            ...prev,
            board: newBoard
          }));
        }
      }
    }
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (gameState.gameStatus !== 'playing') return;
    
    const cell = gameState.board[row][col];
    
    // If clicking on a revealed number cell, handle chord action
    if (cell.status === 'revealed' && cell.adjacentMines > 0) {
      handleRevealedNumberClick(row, col);
      return;
    }
    
    // If cell is not hidden, do nothing
    if (cell.status !== 'hidden') return;
    
    // Start timer on first click
    startTimer();
    
    // Clone the board for updates
    const newBoard = [...gameState.board.map(row => [...row])];
    
    // If clicked on a mine, game over
    if (cell.isMine) {
      // Reveal all mines
      for (let r = 0; r < newBoard.length; r++) {
        for (let c = 0; c < newBoard[0].length; c++) {
          if (newBoard[r][c].isMine) {
            newBoard[r][c].status = 'revealed';
          }
        }
      }
      
      // Update game state
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        gameStatus: 'lost'
      }));
      
      // Stop the timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      // Record the loss to update game count
      recordGameLoss();
      
      // Show game over dialog
      setShowGameOverDialog(true);
      return;
    }
    
    // If clicked on a safe cell, reveal it
    revealCell(newBoard, row, col);
    
    // Check if the game is won
    const isGameWon = checkWinCondition(newBoard);
    if (isGameWon) {
      // Update game state
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        gameStatus: 'won'
      }));
      
      // Stop the timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      // Update best time if needed
      if (user) {
        // Save the score directly without complex logic
        saveGameScore(gameState.timeElapsed);
      }
      
      // Show game over dialog
      setShowGameOverDialog(true);
      return;
    }
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      board: newBoard
    }));
  };

  // Reveal a cell and its adjacent cells if it has no adjacent mines
  const revealCell = (board: Cell[][], row: number, col: number) => {
    const config = DIFFICULTY_CONFIGS[difficulty];
    const cell = board[row][col];
    
    // Skip if cell is already revealed or flagged
    if (cell.status !== 'hidden') return;
    
    // Reveal the cell
    cell.status = 'revealed';
    
    // If cell has no adjacent mines, reveal adjacent cells
    if (cell.adjacentMines === 0) {
      for (let r = Math.max(0, row - 1); r <= Math.min(config.rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(config.cols - 1, col + 1); c++) {
          if (r !== row || c !== col) {
            revealCell(board, r, c);
          }
        }
      }
    }
  };

  // Handle right-click (flag)
  const handleCellRightClick = (event: React.MouseEvent, row: number, col: number) => {
    event.preventDefault();
    if (gameState.gameStatus !== 'playing') return;
    
    const cell = gameState.board[row][col];
    if (cell.status === 'revealed') return;
    
    // Clone the board for updates
    const newBoard = [...gameState.board.map(row => [...row])];
    
    // Toggle flag
    if (cell.status === 'hidden') {
      newBoard[row][col].status = 'flagged';
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        minesLeft: prev.minesLeft - 1
      }));
    } else {
      newBoard[row][col].status = 'hidden';
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        minesLeft: prev.minesLeft + 1
      }));
    }
  };

  // Check if the game is won
  const checkWinCondition = (board: Cell[][]): boolean => {
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[0].length; col++) {
        const cell = board[row][col];
        // If there's a non-mine cell that's still hidden, game is not won yet
        if (!cell.isMine && cell.status === 'hidden') {
          return false;
        }
      }
    }
    return true;
  };

  // Save game score with local storage backup
  const saveGameScore = async (time: number) => {
    if (!recordStats) return;
    
    try {
      console.log('Saving game score for difficulty:', difficulty, 'Time:', time);
      
      // Always save to local storage first as a backup
      saveToLocalStorage(difficulty, time);
      
      // Update local best times immediately for better user experience
      setBestTimes(prev => {
        // Only update if there's no previous best time or the new time is better
        if (prev[difficulty] === null || time < prev[difficulty]!) {
          return {
            ...prev,
            [difficulty]: time
          };
        }
        return prev;
      });
      
      // Only try to save to database if user is logged in
      if (user) {
        // First check if the record exists and what columns it has
        const { data: existingData } = await supabase
          .from('game_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (existingData) {
          // Record exists, update it using a simple approach
          console.log('Existing record found, updating');
          
          // Create an update object with the fields we want to update
          const updateData: any = { updated_at: new Date() };
          
          // Increment game count for this difficulty
          const gameCountField = `games_count_${difficulty}`;
          updateData[gameCountField] = (existingData[gameCountField] || 0) + 1;
          
          // Increment win count for this difficulty (since we only save on win)
          const winCountField = `wins_count_${difficulty}`;
          updateData[winCountField] = (existingData[winCountField] || 0) + 1;
          
          // Set the appropriate best time field
          const bestTimeField = `best_time_${difficulty}`;
          
          // Only update if the new time is better or the current time is null
          if (existingData[bestTimeField] === null || time < existingData[bestTimeField]) {
            updateData[bestTimeField] = time;
          }
          
          const { data, error } = await supabase
            .from('game_stats')
            .update(updateData)
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error updating stats:', error);
            // Try alternative approach if update fails
            await fallbackSaveScore(time);
          } else {
            console.log('Game stats updated successfully');
          }
        } else {
          // Record doesn't exist, create it
          console.log('No existing record, creating new one');
          
          // Create a new record with initial values
          const insertData: any = {
            user_id: user.id,
            // Initialize all counters to 0
            games_count_easy: 0,
            games_count_medium: 0,
            games_count_hard: 0,
            wins_count_easy: 0,
            wins_count_medium: 0,
            wins_count_hard: 0
          };
          
          // Set the appropriate difficulty fields
          insertData[`best_time_${difficulty}`] = time;
          insertData[`games_count_${difficulty}`] = 1;
          insertData[`wins_count_${difficulty}`] = 1;
          
          const { data, error } = await supabase
            .from('game_stats')
            .insert(insertData);
            
          if (error) {
            console.error('Error inserting stats:', error);
            // Try alternative approach if insert fails
            await fallbackSaveScore(time);
          } else {
            console.log('New game stats record created successfully');
          }
        }
      }
    } catch (error) {
      console.error('Error saving game score:', error);
    }
  };
  
  // Record a game loss to update game count without updating win count
  const recordGameLoss = async () => {
    if (!recordStats) return;
    
    try {
      console.log('Recording game loss for difficulty:', difficulty);
      
      // Only try to save to database if user is logged in
      if (user) {
        // First check if the record exists
        const { data: existingData } = await supabase
          .from('game_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (existingData) {
          // Record exists, update it
          console.log('Existing record found, updating game count');
          
          // Create an update object with the game count field
          const updateData: any = { updated_at: new Date() };
          
          // Increment game count for this difficulty
          const gameCountField = `games_count_${difficulty}`;
          updateData[gameCountField] = (existingData[gameCountField] || 0) + 1;
          
          const { data, error } = await supabase
            .from('game_stats')
            .update(updateData)
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error updating game count:', error);
          } else {
            console.log('Game count updated successfully');
            
            // Reload stats to update win rates
            loadBestTimes();
          }
        } else {
          // Record doesn't exist, create it
          console.log('No existing record, creating new one for loss');
          
          // Create a new record with initial values
          const insertData: any = {
            user_id: user.id,
            // Initialize all counters to 0
            games_count_easy: 0,
            games_count_medium: 0,
            games_count_hard: 0,
            wins_count_easy: 0,
            wins_count_medium: 0,
            wins_count_hard: 0
          };
          
          // Set the game count for this difficulty to 1
          insertData[`games_count_${difficulty}`] = 1;
          
          const { data, error } = await supabase
            .from('game_stats')
            .insert(insertData);
            
          if (error) {
            console.error('Error inserting loss record:', error);
          } else {
            console.log('New game stats record created successfully for loss');
            
            // Reload stats to update win rates
            loadBestTimes();
          }
        }
      }
    } catch (error) {
      console.error('Error recording game loss:', error);
    }
  };
  
  // Fallback method to save score
  const fallbackSaveScore = async (time: number) => {
    if (!user) return;
    
    try {
      console.log('Attempting fallback save method');
      
      // Try a raw SQL approach as the last resort
      // First check if the record exists
      const checkQuery = `
        SELECT EXISTS (SELECT 1 FROM game_stats WHERE user_id = '${user.id}');
      `;
      
      const { data: existsCheck, error: checkError } = await supabase.rpc('execute_sql', { sql: checkQuery });
      
      if (checkError) {
        console.error('Error checking if record exists:', checkError);
        return;
      }
      
      // Determine if the record exists
      const recordExists = existsCheck && existsCheck[0] && existsCheck[0].exists;
      
      // Define the columns we need to check
      const bestTimeField = `best_time_${difficulty}`;
      const gameCountField = `games_count_${difficulty}`;
      const winCountField = `wins_count_${difficulty}`;
      
      let query;
      if (recordExists) {
        // Update existing record - first check if all required columns exist
        const columnsCheckQuery = `
          SELECT 
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_stats' AND column_name = '${bestTimeField}') as has_best_time,
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_stats' AND column_name = '${gameCountField}') as has_game_count,
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_stats' AND column_name = '${winCountField}') as has_win_count
        `;
        
        const { data: columnsCheck, error: columnsError } = await supabase.rpc('execute_sql', { sql: columnsCheckQuery });
        
        if (columnsError) {
          console.error('Error checking if columns exist:', columnsError);
          return;
        }
        
        // Build dynamic update query based on which columns exist
        let updateParts = [];
        let hasBestTime = columnsCheck && columnsCheck[0] && columnsCheck[0].has_best_time;
        let hasGameCount = columnsCheck && columnsCheck[0] && columnsCheck[0].has_game_count;
        let hasWinCount = columnsCheck && columnsCheck[0] && columnsCheck[0].has_win_count;
        
        // Add best time update if column exists
        if (hasBestTime) {
          updateParts.push(`
            ${bestTimeField} = 
              CASE 
                WHEN ${bestTimeField} IS NULL OR ${bestTimeField} > ${time} 
                THEN ${time} 
                ELSE ${bestTimeField} 
              END
          `);
        }
        
        // Add game count update if column exists
        if (hasGameCount) {
          updateParts.push(`
            ${gameCountField} = COALESCE(${gameCountField}, 0) + 1
          `);
        }
        
        // Add win count update if column exists
        if (hasWinCount) {
          updateParts.push(`
            ${winCountField} = COALESCE(${winCountField}, 0) + 1
          `);
        }
        
        // Add updated_at timestamp
        updateParts.push(`updated_at = NOW()`);
        
        // Only proceed if we have columns to update
        if (updateParts.length > 0) {
          query = `
            UPDATE game_stats 
            SET ${updateParts.join(', ')} 
            WHERE user_id = '${user.id}';
          `;
          
          const { data, error } = await supabase.rpc('execute_sql', { sql: query });
          
          if (error) {
            console.error('Final fallback update failed:', error);
          } else {
            console.log('Game stats updated with final fallback method');
          }
        } else {
          console.log('No valid columns to update, skipping update');
        }
      } else {
        // Create a new record - first check if all required columns exist
        const columnsCheckQuery = `
          SELECT 
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_stats' AND column_name = '${bestTimeField}') as has_best_time,
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_stats' AND column_name = '${gameCountField}') as has_game_count,
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_stats' AND column_name = '${winCountField}') as has_win_count
        `;
        
        const { data: columnsCheck, error: columnsError } = await supabase.rpc('execute_sql', { sql: columnsCheckQuery });
        
        if (columnsError) {
          console.error('Error checking if columns exist:', columnsError);
          return;
        }
        
        // Build dynamic insert query based on which columns exist
        let columnNames = ['user_id', 'created_at', 'updated_at'];
        let columnValues = [`'${user.id}'`, 'NOW()', 'NOW()'];
        
        let hasBestTime = columnsCheck && columnsCheck[0] && columnsCheck[0].has_best_time;
        let hasGameCount = columnsCheck && columnsCheck[0] && columnsCheck[0].has_game_count;
        let hasWinCount = columnsCheck && columnsCheck[0] && columnsCheck[0].has_win_count;
        
        if (hasBestTime) {
          columnNames.push(bestTimeField);
          columnValues.push(time.toString());
        }
        
        if (hasGameCount) {
          columnNames.push(gameCountField);
          columnValues.push('1');
        }
        
        if (hasWinCount) {
          columnNames.push(winCountField);
          columnValues.push('1');
        }
        
        query = `
          INSERT INTO game_stats (${columnNames.join(', ')})
          VALUES (${columnValues.join(', ')});
        `;
        
        const { data, error } = await supabase.rpc('execute_sql', { sql: query });
        
        if (error) {
          console.error('Final fallback insert failed:', error);
        } else {
          console.log('Game stats inserted with final fallback method');
        }
      }
    } catch (error) {
      console.error('Error in fallback save:', error);
    }
  };
  
  // Save score to local storage
  const saveToLocalStorage = (diff: string, time: number) => {
    try {
      // Get existing scores
      const storedScores = localStorage.getItem('minesweeper_scores');
      let scores = storedScores ? JSON.parse(storedScores) : {};
      
      // Only update if no previous score or new score is better
      if (!scores[diff] || time < scores[diff]) {
        scores[diff] = time;
        localStorage.setItem('minesweeper_scores', JSON.stringify(scores));
        console.log('Score saved to local storage');
      }
    } catch (e) {
      console.error('Error saving to local storage:', e);
    }
  };

  // Load best times and win rates from both Supabase and local storage
  const loadBestTimes = async () => {
    try {
      // First load from local storage
      const localTimes = loadFromLocalStorage();
      
      // Then try to load from database if user is logged in
      if (user) {
        console.log('Loading stats for user:', user.id);
        
        // Use a more resilient approach - get the entire row first
        const { data, error } = await supabase
          .from('game_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          // If there's a specific error about missing columns, we can ignore it
          // and just use local storage
          console.error('Error loading stats:', error);
        } else if (data) {
          console.log('Loaded stats from database:', data);
          
          // Safely extract times, defaulting to null if columns don't exist
          const dbTimes = {
            easy: data.best_time_easy ?? null,
            medium: data.best_time_medium ?? null,
            hard: data.best_time_hard ?? null
          };
          
          // Merge with local times, taking the best of each
          const mergedTimes = {
            easy: getBetterTime(localTimes.easy, dbTimes.easy),
            medium: getBetterTime(localTimes.medium, dbTimes.medium),
            hard: getBetterTime(localTimes.hard, dbTimes.hard)
          };
          
          // Update state with merged times
          setBestTimes(mergedTimes);
          
          // Calculate win rates for each difficulty
          const newWinRates = {
            easy: calculateWinRate(data.games_count_easy, data.wins_count_easy),
            medium: calculateWinRate(data.games_count_medium, data.wins_count_medium),
            hard: calculateWinRate(data.games_count_hard, data.wins_count_hard)
          };
          
          // Update win rates state
          setWinRates(newWinRates);
          
          console.log('Stats updated with database data');
          return;
        }
      }
      
      // If database load failed or user not logged in, use local storage times
      setBestTimes(localTimes);
      console.log('Best times loaded from local storage');
      
    } catch (error) {
      console.error('Error in loadBestTimes:', error);
      
      // As a last resort, load from local storage only
      const localTimes = loadFromLocalStorage();
      setBestTimes(localTimes);
    }
  };
  
  // Helper function to calculate win rate
  const calculateWinRate = (gamesCount: number | null, winsCount: number | null): number => {
    if (!gamesCount || gamesCount === 0 || !winsCount) return 0;
    return Math.round((winsCount / gamesCount) * 100);
  };
  
  // Helper to get the better of two times
  const getBetterTime = (time1: number | null, time2: number | null): number | null => {
    if (time1 === null) return time2;
    if (time2 === null) return time1;
    return Math.min(time1, time2);
  };
  
  // Load scores from local storage
  const loadFromLocalStorage = () => {
    try {
      const storedScores = localStorage.getItem('minesweeper_scores');
      const scores = storedScores ? JSON.parse(storedScores) : {};
      return {
        easy: scores.easy || null,
        medium: scores.medium || null,
        hard: scores.hard || null
      };
    } catch (e) {
      console.error('Error loading from local storage:', e);
      return { easy: null, medium: null, hard: null };
    }
  };
  
  // Clear local storage and reset best times
  const clearLocalStorage = () => {
    try {
      localStorage.removeItem('minesweeper_scores');
      setBestTimes({
        easy: null,
        medium: null,
        hard: null
      });
      console.log('Local storage cleared successfully');
    } catch (e) {
      console.error('Error clearing local storage:', e);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Initialize game on mount and when difficulty changes
  useEffect(() => {
    startNewGame();
    loadBestTimes();
    
    // Cleanup timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [difficulty]);
  
  // Reload scores when user changes
  useEffect(() => {
    if (user) {
      loadBestTimes();
    }
  }, [user]);

  // Load best times on mount
  useEffect(() => {
    if (user) {
      loadBestTimes();
    }
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex flex-1">
        <Sidebar activePage="games" />
        
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Minesweeper</h1>
                <p className="text-muted-foreground">Single Player Mode</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Select
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as keyof typeof DIFFICULTY_CONFIGS)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (9x9, 10 mines)</SelectItem>
                    <SelectItem value="medium">Medium (16x16, 40 mines)</SelectItem>
                    <SelectItem value="hard">Hard (16x30, 99 mines)</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={() => setRecordStats(!recordStats)} 
                  size="icon" 
                  variant={recordStats ? "default" : "outline"}
                  title={recordStats ? "Stats recording enabled" : "Stats recording disabled"}
                >
                  <Save className="h-4 w-4" />
                </Button>
                
                <Button onClick={startNewGame} size="icon" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" />
                <span className="font-medium">{gameState.minesLeft}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{formatTime(gameState.timeElapsed)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <span className="font-medium min-w-[60px] text-center">
                  {recordStats ? 
                    (bestTimes[difficulty] ? formatTime(bestTimes[difficulty]!) : '--:--') : 
                    "Stats off"}
                </span>
              </div>
            </div>
            
            <Card className="border-none shadow-md overflow-auto" onContextMenu={(e) => e.preventDefault()}>
              <CardContent className="p-2" onContextMenu={(e) => e.preventDefault()}>
                <div 
                  className="inline-grid border border-gray-300 select-none"
                  style={{
                    gridTemplateColumns: `repeat(${DIFFICULTY_CONFIGS[difficulty].cols}, 24px)`,
                    gridAutoRows: '24px',
                    gridGap: '1px',
                    backgroundColor: '#d1d5db', // gray-300 for the grid lines
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    userSelect: 'none'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {gameState.board.flat().map((cell) => (
                    <div
                      key={`${cell.row}-${cell.col}`}
                      className={`
                        w-full h-full flex items-center justify-center text-xs font-medium
                        ${cell.status === 'hidden' ? 'bg-gray-200 hover:bg-gray-300 cursor-pointer' : ''}
                        ${cell.status === 'flagged' ? 'bg-gray-200' : ''}
                        ${cell.status === 'revealed' && !cell.isMine ? 'bg-white hover:bg-gray-50 transition-colors duration-100' : ''}
                        ${cell.status === 'revealed' && cell.adjacentMines > 0 ? 'cursor-pointer' : ''}
                        ${cell.status === 'revealed' && cell.isMine ? 'bg-red-500' : ''}
                      `}
                      onClick={() => handleCellClick(cell.row, cell.col)}
                      onContextMenu={(e) => {
                        e.preventDefault(); // Prevent browser context menu
                        handleCellRightClick(e, cell.row, cell.col);
                      }}
                    >
                      {cell.status === 'revealed' && !cell.isMine && cell.adjacentMines > 0 && (
                        <span className={`
                          ${cell.adjacentMines === 1 ? 'text-blue-500' : ''}
                          ${cell.adjacentMines === 2 ? 'text-green-500' : ''}
                          ${cell.adjacentMines === 3 ? 'text-red-500' : ''}
                          ${cell.adjacentMines === 4 ? 'text-purple-500' : ''}
                          ${cell.adjacentMines === 5 ? 'text-yellow-500' : ''}
                          ${cell.adjacentMines === 6 ? 'text-teal-500' : ''}
                          ${cell.adjacentMines === 7 ? 'text-black' : ''}
                          ${cell.adjacentMines === 8 ? 'text-gray-500' : ''}
                        `}>
                          {cell.adjacentMines}
                        </span>
                      )}
                      {cell.status === 'revealed' && cell.isMine && (
                        <span className="text-white">💣</span>
                      )}
                      {cell.status === 'flagged' && (
                        <span>🚩</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">How to Play:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Left-click to reveal a cell</li>
                <li>Right-click to place or remove a flag</li>
                <li>Numbers show how many mines are adjacent to that cell</li>
                <li>Click on revealed numbers to clear adjacent cells when correctly flagged</li>
                <li>Avoid clicking on mines!</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                Your Records:
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Easy</p>
                  <p className="font-medium">{bestTimes.easy ? formatTime(bestTimes.easy) : '--:--'}</p>
                  <br></br>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="font-medium">{winRates.easy}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Medium</p>
                  <p className="font-medium">{bestTimes.medium ? formatTime(bestTimes.medium) : '--:--'}</p>
                  <br></br>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="font-medium">{winRates.medium}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Hard</p>
                  <p className="font-medium">{bestTimes.hard ? formatTime(bestTimes.hard) : '--:--'}</p>
                  <br></br>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="font-medium">{winRates.hard}%</p>
                </div>
              </div>
              <br></br>
              
              <div className="flex justify-end mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearLocalStorage}
                  className="text-xs text-muted-foreground"
                >
                  Clear Local Storage
                </Button>
              </div>
              
              {!recordStats && (
                <p className="text-xs text-center mt-2 text-muted-foreground italic">
                  Stats recording is currently disabled
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav />
      
      {/* Game Over Dialog */}
      <Dialog open={showGameOverDialog} onOpenChange={setShowGameOverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {gameState.gameStatus === 'won' ? '🎉 You Won!' : '💥 Game Over!'}
            </DialogTitle>
            <DialogDescription>
              {gameState.gameStatus === 'won' 
                ? `You cleared the board in ${formatTime(gameState.timeElapsed)}!` 
                : 'You clicked on a mine. Better luck next time!'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center gap-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="text-xl font-bold">{formatTime(gameState.timeElapsed)}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Difficulty</p>
              <p className="text-xl font-bold">{DIFFICULTY_CONFIGS[difficulty].label}</p>
            </div>
            
            {gameState.gameStatus === 'won' && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Best Time</p>
                <p className="text-xl font-bold">
                  {bestTimes[difficulty] ? formatTime(bestTimes[difficulty]!) : '--:--'}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={startNewGame} className="w-full">
              Play Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SinglePlayer;
