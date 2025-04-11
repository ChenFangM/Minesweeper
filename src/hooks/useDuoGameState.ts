import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'custom';
  totalRounds: number;
  customWidth?: number;
  customHeight?: number;
  customMines?: number;
  timerEnabled: boolean;
}

export interface GameDimensions {
  width: number;
  height: number;
  mines: number;
}

export interface PlayerProgress {
  userId: string;
  username: string;
  percentRevealed: number;
  timeElapsed: number;
  status: 'waiting' | 'playing' | 'won' | 'lost';
}

export interface DuoGameState {
  currentRound: number;
  gameStatus: 'waiting' | 'countdown' | 'playing' | 'round_complete' | 'game_complete';
  playerProgress: PlayerProgress[];
  dimensions: GameDimensions;
  winnerId?: string;
}

/**
 * Hook to manage the duo game state and synchronization
 */
export function useDuoGameState(
  gameId: string,
  userId: string,
  supabase: SupabaseClient,
  gameSettings: GameSettings
) {
  const [gameState, setGameState] = useState<DuoGameState>({
    currentRound: 1,
    gameStatus: 'waiting',
    playerProgress: [],
    dimensions: getGameDimensions(gameSettings),
  });

  // Get board dimensions based on difficulty
  function getGameDimensions(settings: GameSettings): GameDimensions {
    switch (settings.difficulty) {
      case 'easy':
        return { width: 9, height: 9, mines: 10 };
      case 'medium':
        return { width: 16, height: 16, mines: 40 };
      case 'hard':
        return { width: 30, height: 16, mines: 99 };
      case 'custom':
        return {
          width: settings.customWidth || 16,
          height: settings.customHeight || 16,
          mines: settings.customMines || 40
        };
      default:
        return { width: 16, height: 16, mines: 40 };
    }
  }

  // Start a new round
  const startRound = useCallback(async () => {
    try {
      await supabase
        .from('duo_games')
        .update({
          status: 'playing',
          current_round: gameState.currentRound
        })
        .eq('game_id', gameId);
      
      console.log(`Starting round ${gameState.currentRound}`);
    } catch (error) {
      console.error('Error starting round:', error);
      toast.error('Failed to start round');
    }
  }, [gameId, gameState.currentRound, supabase]);

  // Complete a round
  const completeRound = useCallback(async (percentRevealed: number, timeElapsed: number) => {
    try {
      // Update player's round progress
      await supabase
        .from('duo_game_progress')
        .upsert({
          game_id: gameId,
          user_id: userId,
          round: gameState.currentRound,
          percent_revealed: percentRevealed,
          time_elapsed: timeElapsed,
          status: 'completed'
        });
      
      console.log(`Completed round ${gameState.currentRound} with ${percentRevealed * 100}% revealed in ${timeElapsed}s`);
      
      // Check if both players have completed the round
      const { data: progressData } = await supabase
        .from('duo_game_progress')
        .select('*')
        .eq('game_id', gameId)
        .eq('round', gameState.currentRound);
      
      if (progressData && progressData.length >= 2) {
        // Both players have completed the round, advance to next round
        if (gameState.currentRound < gameSettings.totalRounds) {
          // More rounds to play
          await supabase
            .from('duo_games')
            .update({
              status: 'round_complete',
              current_round: gameState.currentRound + 1
            })
            .eq('game_id', gameId);
        } else {
          // Game complete, calculate winner
          await supabase
            .from('duo_games')
            .update({
              status: 'game_complete'
            })
            .eq('game_id', gameId);
        }
      }
    } catch (error) {
      console.error('Error completing round:', error);
      toast.error('Failed to complete round');
    }
  }, [gameId, userId, gameState.currentRound, gameSettings.totalRounds, supabase]);

  // Listen for game state changes
  useEffect(() => {
    if (!gameId || !supabase) return;

    const loadGameState = async () => {
      try {
        // Get current game state
        const { data: gameData, error: gameError } = await supabase
          .from('duo_games')
          .select('*')
          .eq('game_id', gameId)
          .single();
        
        if (gameError) throw gameError;
        
        // Fetch creator and opponent profiles separately - don't use single() to avoid errors
        const { data: creatorProfiles, error: creatorError } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', gameData.creator_id);
          
        if (creatorError) {
          console.error('Error fetching creator profile:', creatorError);
        }
        
        // Get the first creator profile if available
        const creatorData = creatorProfiles && creatorProfiles.length > 0 ? creatorProfiles[0] : null;
        
        // Fetch opponent profile if exists - don't use single() to avoid errors
        let opponentData = null;
        if (gameData.opponent_id) {
          const { data: opponentProfiles, error: opponentError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', gameData.opponent_id);
            
          if (opponentError) {
            console.error('Error fetching opponent profile:', opponentError);
          } else if (opponentProfiles && opponentProfiles.length > 0) {
            opponentData = opponentProfiles[0];
          }
        }
        
        // Get player progress for current round
        const { data: progressData, error: progressError } = await supabase
          .from('duo_game_progress')
          .select('*')
          .eq('game_id', gameId)
          .eq('round', gameData.current_round || 1);
        
        if (progressError) throw progressError;
        
        // Map progress data to player progress
        const playerProgress: PlayerProgress[] = [];
        
        // Add creator progress
        const creatorProgress = progressData?.find(p => p.user_id === gameData.creator_id);
        playerProgress.push({
          userId: gameData.creator_id,
          username: creatorData?.username || `Host (${gameData.creator_id.slice(-4)})`,
          percentRevealed: creatorProgress?.percent_revealed || 0,
          timeElapsed: creatorProgress?.time_elapsed || 0,
          status: creatorProgress?.status || 'waiting'
        });
        
        // Add opponent progress if exists
        if (gameData.opponent_id) {
          const opponentProgress = progressData?.find(p => p.user_id === gameData.opponent_id);
          playerProgress.push({
            userId: gameData.opponent_id,
            username: opponentData?.username || `Opponent (${gameData.opponent_id.slice(-4)})`,
            percentRevealed: opponentProgress?.percent_revealed || 0,
            timeElapsed: opponentProgress?.time_elapsed || 0,
            status: opponentProgress?.status || 'waiting'
          });
        }
        
        // Update game state
        setGameState({
          currentRound: gameData.current_round || 1,
          gameStatus: gameData.status,
          playerProgress,
          dimensions: getGameDimensions(gameSettings),
          winnerId: gameData.winner_id
        });
      } catch (error) {
        console.error('Error loading game state:', error);
        toast.error('Failed to load game state');
      }
    };

    // Initial load
    loadGameState();
    
    // Subscribe to game updates
    const subscription = supabase
      .channel(`game-state:${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'duo_games',
        filter: `game_id=eq.${gameId}`
      }, () => {
        loadGameState();
      })
      .subscribe();
    
    // Subscribe to progress updates
    const progressSubscription = supabase
      .channel(`game-progress:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'duo_game_progress',
        filter: `game_id=eq.${gameId}`
      }, () => {
        loadGameState();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
      progressSubscription.unsubscribe();
    };
  }, [gameId, supabase, gameSettings]);

  return {
    gameState,
    startRound,
    completeRound
  };
}
