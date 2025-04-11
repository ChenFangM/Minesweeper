import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useGameCountdown } from '../../hooks/useGameCountdown';
import { useDuoGameState } from '../../hooks/useDuoGameState';
import CountdownOverlay from './CountdownOverlay';
import GameBoard from './GameBoard';
import OpponentProgress from './OpponentProgress';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Trophy, Clock, AlertTriangle } from 'lucide-react';

interface DuoGameControllerProps {
  gameId: string;
  userId: string;
  isHost: boolean;
  gameSettings: any;
}

/**
 * Main controller component for the duo game
 * Manages game state, rounds, and player interactions
 */
const DuoGameController: React.FC<DuoGameControllerProps> = ({
  gameId,
  userId,
  isHost,
  gameSettings
}) => {
  const [isReady, setIsReady] = useState(false);
  
  // Get game state from custom hook
  const { gameState, startRound, completeRound } = useDuoGameState(
    gameId,
    userId,
    supabase,
    gameSettings
  );
  
  // Get countdown functionality from custom hook
  const { 
    isCountdownActive, 
    secondsRemaining, 
    countdownMessage, 
    startCountdown 
  } = useGameCountdown({
    gameId,
    supabase,
    onCountdownComplete: startRound,
    initialSeconds: 5
  });
  
  // Handle round completion
  const handleRoundComplete = useCallback((percentRevealed: number, timeElapsed: number) => {
    completeRound(percentRevealed, timeElapsed);
  }, [completeRound]);
  
  // Handle ready state
  const handleReady = async () => {
    try {
      setIsReady(true);
      
      // Update player ready status
      await supabase
        .from('duo_game_progress')
        .upsert({
          game_id: gameId,
          user_id: userId,
          round: gameState.currentRound,
          percent_revealed: 0,
          time_elapsed: 0,
          status: 'waiting'
        });
      
      toast.success('You are ready for the next round!');
      
      // If host, check if all players are ready to start countdown
      if (isHost) {
        const { data } = await supabase
          .from('duo_game_progress')
          .select('*')
          .eq('game_id', gameId)
          .eq('round', gameState.currentRound);
        
        // If all players have progress entries, start the countdown
        if (data && data.length >= 2) {
          startCountdown();
        }
      }
    } catch (error) {
      console.error('Error setting ready state:', error);
      toast.error('Failed to set ready state');
      setIsReady(false);
    }
  };
  
  // Find opponent in player progress
  const opponent = gameState.playerProgress.find(p => p.userId !== userId) || null;
  
  // Find current user in player progress
  const currentUser = gameState.playerProgress.find(p => p.userId === userId) || null;
  
  // Determine if the round is active
  const isRoundActive = gameState.gameStatus === 'playing';
  
  // Determine if the round is complete
  const isRoundComplete = gameState.gameStatus === 'round_complete';
  
  // Determine if the game is complete
  const isGameComplete = gameState.gameStatus === 'game_complete';
  
  // Render waiting for opponent state
  if (gameState.playerProgress.length < 2) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Waiting for Opponent</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Waiting for an opponent to join the game...
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Render game complete state
  if (isGameComplete) {
    const winner = gameState.playerProgress.find(p => p.userId === gameState.winnerId);
    
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Game Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <h3 className="text-xl font-bold mb-2">
              {winner?.userId === userId ? 'You Won!' : `${winner?.username || 'Opponent'} Won!`}
            </h3>
            <p className="text-muted-foreground">
              Game completed after {gameSettings.totalRounds} rounds
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {gameState.playerProgress.map(player => (
              <Card key={player.userId} className={`${player.userId === gameState.winnerId ? 'border-yellow-500' : ''}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {player.username} {player.userId === userId ? '(You)' : ''}
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
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Render round complete state
  if (isRoundComplete) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Round {gameState.currentRound - 1} Complete</CardTitle>
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
            <h3 className="font-bold mb-1">Round {gameState.currentRound} is next</h3>
            <p className="text-sm text-muted-foreground">
              Click ready when you're prepared to continue
            </p>
          </div>
          
          <Button 
            onClick={handleReady}
            disabled={isReady}
            className="w-full"
          >
            {isReady ? 'Waiting for opponent...' : 'Ready for Next Round'}
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Render countdown overlay
  if (isCountdownActive) {
    return (
      <>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Round {gameState.currentRound} Starting</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-lg font-bold">
              Get ready! Round starting in {secondsRemaining} seconds...
            </p>
          </CardContent>
        </Card>
        
        <CountdownOverlay 
          isActive={isCountdownActive}
          secondsRemaining={secondsRemaining}
          message={countdownMessage}
        />
      </>
    );
  }
  
  // Render waiting for ready state
  if (gameState.gameStatus === 'waiting') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Round {gameState.currentRound}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <p>Both players need to be ready to start the round</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Card className={`${isReady ? 'border-green-500' : 'border-gray-200'}`}>
              <CardContent className="py-4 text-center">
                <p className="font-medium">You</p>
                <p className="text-sm text-muted-foreground">
                  {isReady ? 'Ready' : 'Not Ready'}
                </p>
              </CardContent>
            </Card>
            
            <Card className={`${opponent?.status !== 'waiting' ? 'border-gray-200' : 'border-green-500'}`}>
              <CardContent className="py-4 text-center">
                <p className="font-medium">{opponent?.username || 'Opponent'}</p>
                <p className="text-sm text-muted-foreground">
                  {opponent?.status !== 'waiting' ? 'Not Ready' : 'Ready'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Button 
            onClick={handleReady}
            disabled={isReady}
            className="w-full"
          >
            {isReady ? 'Waiting for opponent...' : 'Ready to Start'}
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Render active game board
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span>Round {gameState.currentRound}</span>
              {gameSettings.timerEnabled && (
                <span className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4" />
                  Timer Enabled
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GameBoard
              gameId={gameId}
              userId={userId}
              roundNumber={gameState.currentRound}
              width={gameState.dimensions.width}
              height={gameState.dimensions.height}
              mines={gameState.dimensions.mines}
              onRoundComplete={handleRoundComplete}
              isTimerEnabled={gameSettings.timerEnabled}
            />
          </CardContent>
        </Card>
      </div>
      
      <div>
        <OpponentProgress 
          opponent={opponent}
          isRoundActive={isRoundActive}
        />
      </div>
    </div>
  );
};

export default DuoGameController;
