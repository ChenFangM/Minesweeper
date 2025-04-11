import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { generateMinesweeperBoard, revealCell, flagCell, calculateGameProgress } from '../../lib/minesweeper';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

interface GameBoardProps {
  gameId: string;
  userId: string;
  roundNumber: number;
  width: number;
  height: number;
  mines: number;
  onRoundComplete: (percentRevealed: number, timeElapsed: number) => void;
  isTimerEnabled: boolean;
}

/**
 * The main game board component for the duo game
 */
const GameBoard: React.FC<GameBoardProps> = ({
  gameId,
  userId,
  roundNumber,
  width,
  height,
  mines,
  onRoundComplete,
  isTimerEnabled
}) => {
  // Game state
  const [board, setBoard] = useState<any[][]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'won' | 'lost'>('waiting');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [minesRemaining, setMinesRemaining] = useState(mines);
  const [isLoading, setIsLoading] = useState(true);
  const [percentRevealed, setPercentRevealed] = useState(0);

  // Initialize the game board
  useEffect(() => {
    const initializeBoard = async () => {
      setIsLoading(true);
      try {
        // Generate a new board
        const newBoard = generateMinesweeperBoard(width, height, mines);
        setBoard(newBoard);
        setGameState('playing');
        setStartTime(Date.now());
        setMinesRemaining(mines);
        setPercentRevealed(0);
        
        // Record game start in database
        await supabase
          .from('duo_game_progress')
          .upsert({
            game_id: gameId,
            user_id: userId,
            round: roundNumber,
            percent_revealed: 0,
            time_elapsed: 0,
            status: 'playing'
          });
      } catch (error) {
        console.error('Error initializing board:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeBoard();
  }, [gameId, userId, roundNumber, width, height, mines]);

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing' || !startTime || !isTimerEnabled) return;

    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeElapsed(elapsed);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState, startTime, isTimerEnabled]);

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState !== 'playing') return;

    const result = revealCell(board, row, col);
    setBoard(result.board);

    if (result.gameOver) {
      setGameState(result.gameWon ? 'won' : 'lost');
      
      // Calculate final progress
      const progress = calculateGameProgress(result.board);
      setPercentRevealed(progress);
      
      // Trigger round complete callback
      const finalTimeElapsed = Math.floor((Date.now() - (startTime || 0)) / 1000);
      onRoundComplete(progress, finalTimeElapsed);
      
      // Update game progress in database
      supabase
        .from('duo_game_progress')
        .upsert({
          game_id: gameId,
          user_id: userId,
          round: roundNumber,
          percent_revealed: progress,
          time_elapsed: finalTimeElapsed,
          status: result.gameWon ? 'won' : 'lost'
        });
    } else {
      // Update progress
      const progress = calculateGameProgress(result.board);
      setPercentRevealed(progress);
      
      // Update game progress in database (throttled)
      if (Math.floor(progress * 10) > Math.floor(percentRevealed * 10)) {
        supabase
          .from('duo_game_progress')
          .upsert({
            game_id: gameId,
            user_id: userId,
            round: roundNumber,
            percent_revealed: progress,
            time_elapsed: Math.floor((Date.now() - (startTime || 0)) / 1000),
            status: 'playing'
          });
      }
    }
  }, [board, gameState, startTime, gameId, userId, roundNumber, onRoundComplete, percentRevealed, isTimerEnabled]);

  // Handle right click (flag)
  const handleRightClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (gameState !== 'playing') return;

    const result = flagCell(board, row, col);
    setBoard(result.board);
    setMinesRemaining(result.minesRemaining);
  }, [board, gameState]);

  if (isLoading) {
    return (
      <Card className="w-full h-full flex items-center justify-center">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-vibrant-purple mb-4" />
            <p>Loading game board...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">
          Mines: <span className="font-mono">{minesRemaining}</span>
        </div>
        {isTimerEnabled && (
          <div className="text-sm font-medium">
            Time: <span className="font-mono">{timeElapsed}s</span>
          </div>
        )}
        <div className="text-sm font-medium">
          Progress: <span className="font-mono">{Math.floor(percentRevealed * 100)}%</span>
        </div>
      </div>
      
      <div className="grid gap-1" style={{ 
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        width: 'fit-content',
        margin: '0 auto'
      }}>
        {board.map((row, rowIndex) => (
          row.map((cell, colIndex) => (
            <Button
              key={`${rowIndex}-${colIndex}`}
              className={`w-8 h-8 p-0 text-xs font-bold ${
                cell.isRevealed
                  ? cell.isMine
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-black'
                  : cell.isFlagged
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              onContextMenu={(e) => handleRightClick(e, rowIndex, colIndex)}
              disabled={gameState !== 'playing' || cell.isRevealed || cell.isFlagged}
            >
              {cell.isRevealed
                ? cell.isMine
                  ? '💣'
                  : cell.adjacentMines > 0
                    ? cell.adjacentMines
                    : ''
                : cell.isFlagged
                  ? '🚩'
                  : ''}
            </Button>
          ))
        ))}
      </div>
      
      {gameState === 'won' && (
        <div className="text-center text-green-600 font-bold mt-4">
          You won this round!
        </div>
      )}
      
      {gameState === 'lost' && (
        <div className="text-center text-red-600 font-bold mt-4">
          You hit a mine! Round complete.
        </div>
      )}
    </div>
  );
};

export default GameBoard;
