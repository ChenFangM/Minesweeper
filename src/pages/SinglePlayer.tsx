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
import { Clock, RefreshCw, Flag, Award } from 'lucide-react';
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
  const [bestTimes, setBestTimes] = useState<Record<string, number | null>>({
    easy: null,
    medium: null,
    hard: null
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
    }
    
    const config = DIFFICULTY_CONFIGS[difficulty];
    const newBoard = initializeBoard();
    
    setGameState({
      board: newBoard,
      gameStatus: 'playing',
      minesLeft: config.mines,
      timeElapsed: 0
    });
    
    // Start the timer
    const interval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeElapsed: prev.timeElapsed + 1
      }));
    }, 1000);
    
    setTimerInterval(interval);
    setShowGameOverDialog(false);
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (gameState.gameStatus !== 'playing') return;
    
    const cell = gameState.board[row][col];
    if (cell.status !== 'hidden') return;
    
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
        updateBestTime();
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

  // Update best time
  const updateBestTime = async () => {
    if (!user) return;
    
    try {
      // Get current best time
      const { data, error } = await supabase
        .from('game_stats')
        .select('best_time_easy, best_time_medium, best_time_hard')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching stats:', error);
        return;
      }
      
      const timeField = `best_time_${difficulty}` as 'best_time_easy' | 'best_time_medium' | 'best_time_hard';
      const currentBestTime = data?.[timeField] || null;
      
      // If no best time or new time is better, update it
      if (currentBestTime === null || gameState.timeElapsed < currentBestTime) {
        const updateData = {
          user_id: user.id,
          [timeField]: gameState.timeElapsed
        };
        
        // Use upsert to create or update the record
        const { error: updateError } = await supabase
          .from('game_stats')
          .upsert(updateData);
        
        if (updateError) {
          console.error('Error updating best time:', updateError);
          return;
        }
        
        // Update local best times
        setBestTimes(prev => ({
          ...prev,
          [difficulty]: gameState.timeElapsed
        }));
      }
    } catch (error) {
      console.error('Error updating best time:', error);
    }
  };

  // Load best times
  const loadBestTimes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('game_stats')
        .select('best_time_easy, best_time_medium, best_time_hard')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching stats:', error);
        return;
      }
      
      if (data) {
        setBestTimes({
          easy: data.best_time_easy,
          medium: data.best_time_medium,
          hard: data.best_time_hard
        });
      }
    } catch (error) {
      console.error('Error loading best times:', error);
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
    
    // Cleanup timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [difficulty]);

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
                <span className="font-medium">
                  {bestTimes[difficulty] ? formatTime(bestTimes[difficulty]!) : '--:--'}
                </span>
              </div>
            </div>
            
            <Card className="border-none shadow-md overflow-auto">
              <CardContent className="p-4">
                <div 
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${DIFFICULTY_CONFIGS[difficulty].cols}, minmax(0, 1fr))`
                  }}
                >
                  {gameState.board.flat().map((cell) => (
                    <div
                      key={`${cell.row}-${cell.col}`}
                      className={`
                        w-8 h-8 flex items-center justify-center text-sm font-medium
                        ${cell.status === 'hidden' ? 'bg-gray-200 hover:bg-gray-300 cursor-pointer' : ''}
                        ${cell.status === 'flagged' ? 'bg-gray-200' : ''}
                        ${cell.status === 'revealed' && !cell.isMine ? 'bg-white border border-gray-300' : ''}
                        ${cell.status === 'revealed' && cell.isMine ? 'bg-red-500' : ''}
                      `}
                      onClick={() => handleCellClick(cell.row, cell.col)}
                      onContextMenu={(e) => handleCellRightClick(e, cell.row, cell.col)}
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
                <li>Avoid clicking on mines!</li>
              </ul>
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
