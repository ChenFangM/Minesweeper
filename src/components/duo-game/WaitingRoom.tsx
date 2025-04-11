import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Users, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GameSettings } from './GameConfig';

type WaitingRoomProps = {
  gameId: string;
  userId: string;
  isHost: boolean;
  opponentId?: string;
  opponentUsername?: string;
  onGameStart: () => void;
  onPlayerReady: (isReady: boolean) => void;
  gameSettings: GameSettings;
};

type PlayerStatus = {
  id: string;
  username: string | null;
  isReady: boolean;
  isHost: boolean;
};

const WaitingRoom: React.FC<WaitingRoomProps> = ({
  gameId,
  userId,
  isHost,
  opponentId,
  opponentUsername,
  onGameStart,
  onPlayerReady,
  gameSettings
}) => {
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Load players and their status
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        
        // Get game data with status to determine ready state
        const { data: gameData, error: gameError } = await supabase
          .from('duo_games')
          .select('creator_id, opponent_id, status')
          .eq('game_id', gameId)
          .single();
        
        if (gameError) throw gameError;
        
        if (!gameData) {
          throw new Error('Game not found');
        }
        
        console.log('Initial game data loaded:', gameData);
        
        // Get player profiles
        const playerIds = [gameData.creator_id];
        if (gameData.opponent_id) playerIds.push(gameData.opponent_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', playerIds);
        
        if (profilesError) throw profilesError;
        
        // Determine if opponent is ready based on game status
        const isOpponentReady = gameData.status === 'ready' || gameData.status === 'playing';
        console.log(`Game status from database: ${gameData.status}, opponent ready: ${isOpponentReady}`);
        
        // Create player status array
        const playerStatusArray: PlayerStatus[] = [];
        
        // Add host
        const hostProfile = profilesData?.find(p => p.id === gameData.creator_id);
        if (hostProfile) {
          playerStatusArray.push({
            id: hostProfile.id,
            username: hostProfile.username,
            isReady: true, // Host is always ready
            isHost: true
          });
        }
        
        // Add opponent if exists
        if (gameData.opponent_id) {
          const opponentProfile = profilesData?.find(p => p.id === gameData.opponent_id);
          if (opponentProfile) {
            playerStatusArray.push({
              id: opponentProfile.id,
              username: opponentProfile.username,
              isReady: isOpponentReady, // Set based on game status
              isHost: false
            });
            
            // If current user is the opponent, update their ready state
            if (opponentProfile.id === userId) {
              console.log(`Setting initial ready state for opponent to: ${isOpponentReady}`);
              setIsReady(isOpponentReady);
            }
          }
        }
        
        setPlayers(playerStatusArray);
      } catch (err: any) {
        console.error('Error loading players:', err);
        setError(err.message || 'Failed to load players');
      } finally {
        setLoading(false);
      }
    };
    
    loadPlayers();
    
    // Set up real-time subscription for game status changes
    const subscription = supabase
      .channel(`game-status-updates:${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'duo_games',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        console.log('Game updated via real-time subscription:', payload);
        
        // Only process if we have new data
        if (!payload.new) return;
        
        const newGameData = payload.new;
        const oldGameData = payload.old || {};
        
        // Always check the game status and update UI accordingly
        console.log(`Current game status in database: ${newGameData.status}`);
        
        // If user is opponent, always sync ready state with database
        if (!isHost && newGameData.opponent_id === userId) {
          const dbReadyState = newGameData.status === 'ready' || newGameData.status === 'playing';
          console.log(`Syncing opponent ready state with database: ${dbReadyState}`);
          
          // Update local ready state to match database
          setIsReady(dbReadyState);
        }
        
        // Update players list based on game status
        const opponentReadyState = newGameData.status === 'ready' || newGameData.status === 'playing';
        console.log(`Setting opponent ready status to: ${opponentReadyState}`);
        
        setPlayers(prev => {
          return prev.map(player => {
            // Host is always ready
            if (player.isHost) return { ...player, isReady: true };
            // Update opponent ready status based on game status
            return { ...player, isReady: opponentReadyState };
          });
        });
        
        // Check if game is now playing
        if (newGameData.status === 'playing') {
          console.log('Game is now playing, starting game');
          onGameStart();
        }
        
        // If opponent joined
        if (payload.new && payload.new.opponent_id && !payload.old.opponent_id) {
          // Reload players to get the new opponent
          loadPlayers();
        }
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [gameId, userId, onGameStart]);

  // Simplified copy function that just selects the text for manual copying
  const copyGameId = () => {
    try {
      // Instead of trying to use the Clipboard API which might be blocked,
      // we'll just select the text for the user to copy manually
      const codeElement = document.querySelector('code');
      if (codeElement) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(codeElement);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        // Show the copied state to indicate to the user that text is selected
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        
        // Update the button text to guide the user
        const buttonText = document.querySelector('.copy-button-text');
        if (buttonText) {
          buttonText.textContent = 'Text Selected';
          setTimeout(() => {
            buttonText.textContent = 'Copy';
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Failed to select game ID:', err);
      // No need to show an error - the text is already displayed
      // and the user can manually copy it
    }
  };

  const toggleReady = async () => {
    try {
      // Store the new ready state to use consistently throughout this function
      const newReadyState = !isReady;
      console.log(`Toggle ready: ${isReady} -> ${newReadyState}`);
      
      // Update the game status in the database FIRST
      if (!isHost) {
        console.log(`Updating game status to ${newReadyState ? 'ready' : 'waiting'}`);
        
        const { error } = await supabase
          .from('duo_games')
          .update({
            status: newReadyState ? 'ready' : 'waiting',
            updated_at: new Date().toISOString()
          })
          .eq('game_id', gameId);
        
        if (error) {
          console.error('Error updating game status:', error);
          throw error;
        }
        
        console.log('Successfully updated game status in database');
        
        // Now update local state AFTER successful database update
        setIsReady(newReadyState);
        
        // Also update the players array
        setPlayers(prev => {
          console.log('Updating local players state after database update');
          return prev.map(player => 
            player.id === userId ? { ...player, isReady: newReadyState } : player
          );
        });
        
        // Notify parent component about player ready status
        onPlayerReady(newReadyState);
      }
      // If host, just update local state (host is always ready)
      else {
        // Host shouldn't be able to toggle ready state, but just in case
        setIsReady(true);
        onPlayerReady(true);
      }
    } catch (err: any) {
      console.error('Error updating ready status:', err);
      setError(err.message || 'Failed to update status');
      setIsReady(isReady); // Revert state change
    }
  };

  const startGame = async () => {
    if (!isHost) return;
    
    try {
      setStarting(true);
      setError(null);
      
      // Check if opponent exists and is ready
      const opponent = players.find(p => !p.isHost);
      if (!opponent) {
        throw new Error('Waiting for an opponent to join');
      }
      
      if (!opponent.isReady) {
        throw new Error('Waiting for opponent to be ready');
      }
      
      // Update game status to playing
      const { error } = await supabase
        .from('duo_games')
        .update({
          status: 'playing',
          current_round: 1,
          updated_at: new Date()
        })
        .eq('game_id', gameId);
      
      if (error) throw error;
      
      // Trigger game start in parent component
      onGameStart();
    } catch (err: any) {
      console.error('Error starting game:', err);
      setError(err.message || 'Failed to start game');
    } finally {
      setStarting(false);
    }
  };

  const getDifficultyLabel = () => {
    switch (gameSettings.difficulty) {
      case 'easy': return 'Easy (9×9, 10 mines)';
      case 'medium': return 'Medium (16×16, 40 mines)';
      case 'hard': return 'Hard (30×16, 99 mines)';
      case 'custom': {
        // Use default values if custom dimensions are undefined
        const width = gameSettings.customWidth || 16;
        const height = gameSettings.customHeight || 16;
        const mines = gameSettings.customMines || 40;
        return `Custom (${width}×${height}, ${mines} mines)`;
      }
      default: return 'Medium';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-vibrant-purple mb-4" />
            <p>Loading game information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-vibrant-purple" />
          Waiting Room
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Game ID */}
        <div className="flex flex-col space-y-2">
          <p className="text-sm font-medium">Game ID:</p>
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1 overflow-x-auto">
              {gameId}
            </code>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyGameId}
              className="flex items-center gap-1"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Game Settings Summary */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Game Settings:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getDifficultyLabel()}</Badge>
            <Badge variant="outline">{gameSettings.totalRounds} Rounds</Badge>
            <Badge variant="outline">Timer Enabled</Badge>
          </div>
        </div>
        
        {/* Players */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Players:</p>
          <div className="space-y-2">
            {players.map(player => (
              <div 
                key={player.id} 
                className={`flex items-center justify-between p-3 rounded-md border
                  ${player.isHost ? 'border-vibrant-purple bg-purple-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{player.username || 'Unknown Player'}</span>
                  {player.isHost && (
                    <Badge variant="secondary" className="text-xs">Host</Badge>
                  )}
                </div>
                <Badge 
                  variant="outline"
                  className={player.isReady ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" : ""}
                >
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </Badge>
              </div>
            ))}
            
            {players.length < 2 && (
              <div className="flex items-center justify-center p-3 rounded-md border border-dashed border-gray-300">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Waiting for opponent to join...
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="p-3 bg-gray-50 rounded-md text-sm">
          {isHost ? (
            <p>Share the Game ID with your friend to invite them to play. You can start the game once they join and are ready.</p>
          ) : (
            <p>Click the Ready button when you're prepared to start the game. The host will start the game when both players are ready.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {isHost ? (
          <Button 
            className="w-full"
            onClick={startGame}
            disabled={starting || players.length < 2 || !players.every(p => p.isReady)}
          >
            {starting ? 'Starting...' : 'Start Game'}
          </Button>
        ) : (
          <Button 
            className="w-full"
            onClick={toggleReady}
            variant={isReady ? "outline" : "default"}
          >
            {isReady ? 'Cancel Ready' : 'Ready to Play'}
          </Button>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardFooter>
    </Card>
  );
};

export default WaitingRoom;
