import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Trophy, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useGameCountdown } from '@/hooks/useGameCountdown';
import { useDuoGameState } from '@/hooks/useDuoGameState';
import CountdownOverlay from '@/components/duo-game/CountdownOverlay';

// Import minesweeper game logic
import { 
  generateMinesweeperBoard, 
  revealCell, 
  flagCell, 
  calculateGameProgress 
} from '@/lib/minesweeper';

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

const DuoGameBoard = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get game settings from location state
  const gameSettings = location.state?.gameSettings || {
    difficulty: 'medium',
    totalRounds: 3,
    timerEnabled: true
  };
  const isHost = location.state?.isHost || false;
  
  // Game state
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'won' | 'lost'>('waiting');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [minesRemaining, setMinesRemaining] = useState(0);
  const [percentRevealed, setPercentRevealed] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState({
    username: '',
    percentRevealed: 0,
    timeElapsed: 0,
    status: 'waiting' as 'waiting' | 'playing' | 'won' | 'lost'
  });
  
  // Get game state from custom hook
  const { 
    gameState: duoGameState, 
    startRound, 
    completeRound 
  } = useDuoGameState(
    gameId || '',
    user?.id || '',
    supabase,
    gameSettings
  );
  
  // Get countdown functionality
  const { 
    isCountdownActive, 
    secondsRemaining, 
    countdownMessage, 
    startCountdown 
  } = useGameCountdown({
    gameId: gameId || '',
    supabase,
    onCountdownComplete: startRound,
    initialSeconds: 5
  });
  
  // Get board dimensions based on difficulty
  const getBoardDimensions = () => {
    switch (gameSettings.difficulty) {
      case 'easy':
        return { width: 9, height: 9, mines: 10 };
      case 'medium':
        return { width: 16, height: 16, mines: 40 };
      case 'hard':
        return { width: 30, height: 16, mines: 99 };
      case 'custom':
        return {
          width: gameSettings.customWidth || 16,
          height: gameSettings.customHeight || 16,
          mines: gameSettings.customMines || 40
        };
      default:
        return { width: 16, height: 16, mines: 40 };
    }
  };
  
  // Initialize the game board
  useEffect(() => {
    if (!gameId || !user) return;
    
    const initializeBoard = async () => {
      setLoading(true);
      try {
        const { width, height, mines } = getBoardDimensions();
        const newBoard = generateMinesweeperBoard(width, height, mines);
        setBoard(newBoard);
        setMinesRemaining(mines);
        setGameState('playing');
        setStartTime(Date.now());
        
        // Record game start in database
        await supabase
          .from('duo_game_progress')
          .upsert({
            game_id: gameId,
            user_id: user.id,
            round: duoGameState.currentRound,
            percent_revealed: 0,
            time_elapsed: 0,
            status: 'playing'
          });
          
        toast({
          title: 'Round Started',
          description: `Round ${duoGameState.currentRound} has begun!`
        });
      } catch (error) {
        console.error('Error initializing board:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize game board',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    // Initialize board when round starts
    if (duoGameState.gameStatus === 'playing') {
      initializeBoard();
    }
  }, [gameId, user, duoGameState.gameStatus, duoGameState.currentRound, toast]);
  
  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing' || !startTime || !gameSettings.timerEnabled) return;
    
    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeElapsed(elapsed);
      
      // Update progress in database every 5 seconds
      if (elapsed % 5 === 0) {
        supabase
          .from('duo_game_progress')
          .upsert({
            game_id: gameId,
            user_id: user?.id,
            round: duoGameState.currentRound,
            percent_revealed: percentRevealed,
            time_elapsed: elapsed,
            status: 'playing'
          });
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [gameState, startTime, gameSettings.timerEnabled, gameId, user, duoGameState.currentRound, percentRevealed]);
  
  // Track opponent progress
  useEffect(() => {
    if (!gameId || !user) return;
    
    const opponent = duoGameState.playerProgress.find(p => p.userId !== user.id);
    if (opponent) {
      setOpponentProgress({
        username: opponent.username,
        percentRevealed: opponent.percentRevealed,
        timeElapsed: opponent.timeElapsed,
        status: opponent.status
      });
    }
  }, [gameId, user, duoGameState.playerProgress]);
  
  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (gameState !== 'playing') return;
    
    const result = revealCell(board, row, col);
    setBoard(result.board);
    
    if (result.gameOver) {
      setGameState(result.gameWon ? 'won' : 'lost');
      
      // Calculate final progress
      const progress = calculateGameProgress(result.board);
      setPercentRevealed(progress);
      
      // Complete round
      const finalTimeElapsed = Math.floor((Date.now() - (startTime || 0)) / 1000);
      completeRound(progress, finalTimeElapsed);
      
      // Show toast
      toast({
        title: result.gameWon ? 'Round Won!' : 'Round Lost',
        description: result.gameWon 
          ? `You cleared ${Math.floor(progress * 100)}% in ${finalTimeElapsed}s` 
          : 'You hit a mine!'
      });
    } else {
      // Update progress
      const progress = calculateGameProgress(result.board);
      setPercentRevealed(progress);
    }
  };
  
  // Handle right click (flag)
  const handleRightClick = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    
    const result = flagCell(board, row, col);
    setBoard(result.board);
    setMinesRemaining(result.minesRemaining);
  };
  
  // Handle return to waiting room
  const handleReturnToWaitingRoom = () => {
    navigate(`/duo/${gameId}`);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar activePage="games" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-vibrant-purple" />
                <p>Loading game board...</p>
              </div>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }
  
  // Render countdown overlay
  if (isCountdownActive) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar activePage="games" />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Duo Game</h1>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Game ID:</span>
                  <span className="font-mono text-sm">{gameId?.slice(0, 8)}</span>
                </div>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Round {duoGameState.currentRound} Starting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-lg font-bold">
                    Get ready! Round starting in {secondsRemaining} seconds...
                  </p>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
        <MobileNav />
        
        <CountdownOverlay 
          isActive={isCountdownActive}
          secondsRemaining={secondsRemaining}
          message={countdownMessage}
        />
      </div>
    );
  }
  
  // Render round complete state
  if (duoGameState.gameStatus === 'round_complete') {
    const currentUser = duoGameState.playerProgress.find(p => p.userId === user?.id);
    const opponent = duoGameState.playerProgress.find(p => p.userId !== user?.id);
    
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar activePage="games" />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Duo Game</h1>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Game ID:</span>
                  <span className="font-mono text-sm">{gameId?.slice(0, 8)}</span>
                </div>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Round {duoGameState.currentRound - 1} Complete</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Your Results</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p>Cleared: {Math.floor((currentUser?.percentRevealed || 0) * 100)}%</p>
                        <p>Time: {currentUser?.timeElapsed || 0}s</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Opponent Results</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p>Cleared: {Math.floor((opponent?.percentRevealed || 0) * 100)}%</p>
                        <p>Time: {opponent?.timeElapsed || 0}s</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="text-center py-2">
                    <h3 className="font-bold mb-1">Round {duoGameState.currentRound} is next</h3>
                    <p className="text-sm text-muted-foreground">
                      Click ready when you're prepared to continue
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => startCountdown()}
                    className="w-full"
                  >
                    Ready for Next Round
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }
  
  // Render game complete state
  if (duoGameState.gameStatus === 'game_complete') {
    const winner = duoGameState.playerProgress.find(p => p.userId === duoGameState.winnerId);
    
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar activePage="games" />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Duo Game</h1>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Game ID:</span>
                  <span className="font-mono text-sm">{gameId?.slice(0, 8)}</span>
                </div>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Game Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <h3 className="text-xl font-bold mb-2">
                      {winner?.userId === user?.id ? 'You Won!' : `${winner?.username || 'Opponent'} Won!`}
                    </h3>
                    <p className="text-muted-foreground">
                      Game completed after {gameSettings.totalRounds} rounds
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {duoGameState.playerProgress.map(player => (
                      <Card key={player.userId} className={`${player.userId === duoGameState.winnerId ? 'border-yellow-500' : ''}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            {player.username} {player.userId === user?.id ? '(You)' : ''}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                          <p>Final Score: {Math.floor(player.percentRevealed * 100)}</p>
                          <p>Time: {player.timeElapsed}s</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/')}
                    className="w-full"
                  >
                    Return to Home
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }
  
  // Render active game board (similar to single player UI)
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar activePage="games" />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Duo Game</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Game ID:</span>
                <span className="font-mono text-sm">{gameId?.slice(0, 8)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Game Info */}
              <div className="md:col-span-3 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-sm">
                    Round {duoGameState.currentRound}/{gameSettings.totalRounds}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {gameSettings.difficulty.charAt(0).toUpperCase() + gameSettings.difficulty.slice(1)}
                  </Badge>
                  {gameSettings.timerEnabled && (
                    <Badge variant="outline" className="text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Timer Enabled
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">
                    Mines: <span className="font-mono">{minesRemaining}</span>
                  </div>
                  {gameSettings.timerEnabled && (
                    <div className="text-sm font-medium">
                      Time: <span className="font-mono">{timeElapsed}s</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Main Game Board */}
              <div className="md:col-span-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      {/* Game board grid */}
                      <div className="grid gap-1" style={{ 
                        gridTemplateColumns: `repeat(${getBoardDimensions().width}, minmax(0, 1fr))`,
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
                      
                      {/* Game state message */}
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
                  </CardContent>
                </Card>
              </div>
              
              {/* Opponent Progress */}
              <div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {opponentProgress.username || 'Opponent'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-mono">{Math.floor(opponentProgress.percentRevealed * 100)}%</span>
                      </div>
                      <Progress value={opponentProgress.percentRevealed * 100} className="h-2" />
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-mono">{opponentProgress.timeElapsed}s</span>
                    </div>
                    
                    <div className="text-sm">
                      Status: 
                      <span className={`ml-2 font-medium ${
                        opponentProgress.status === 'won' 
                          ? 'text-green-600' 
                          : opponentProgress.status === 'lost' 
                            ? 'text-red-600' 
                            : opponentProgress.status === 'playing' 
                              ? 'text-blue-600'
                              : ''
                      }`}>
                        {opponentProgress.status === 'waiting' 
                          ? 'Waiting' 
                          : opponentProgress.status === 'playing' 
                            ? 'Playing' 
                            : opponentProgress.status === 'won' 
                              ? 'Completed Successfully' 
                              : opponentProgress.status === 'lost' 
                                ? 'Hit a Mine' 
                                : 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleReturnToWaitingRoom}
                      >
                        Return to Waiting Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Your Progress */}
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Your Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Revealed</span>
                      <span className="font-mono">{Math.floor(percentRevealed * 100)}%</span>
                    </div>
                    <Progress value={percentRevealed * 100} className="h-2" />
                    
                    {gameSettings.timerEnabled && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{timeElapsed}s</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default DuoGameBoard;
