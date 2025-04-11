import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface CountdownState {
  isActive: boolean;
  secondsRemaining: number;
  message: string;
}

interface UseGameCountdownProps {
  gameId: string;
  supabase: SupabaseClient;
  onCountdownComplete: () => void;
  initialSeconds?: number;
}

/**
 * Hook to manage a synchronized countdown between players
 */
export function useGameCountdown({
  gameId,
  supabase,
  onCountdownComplete,
  initialSeconds = 5
}: UseGameCountdownProps) {
  const [countdownState, setCountdownState] = useState<CountdownState>({
    isActive: false,
    secondsRemaining: initialSeconds,
    message: 'Get ready...'
  });

  // Start the countdown
  const startCountdown = async () => {
    try {
      // Update the game state to trigger the countdown for all players
      await supabase
        .from('duo_games')
        .update({ 
          status: 'countdown',
          countdown_start: new Date().toISOString(),
          countdown_seconds: initialSeconds
        })
        .eq('game_id', gameId);
      
      console.log('Countdown started for all players');
    } catch (error) {
      console.error('Error starting countdown:', error);
      toast.error('Failed to start countdown');
    }
  };

  // Listen for countdown changes
  useEffect(() => {
    if (!gameId || !supabase) return;

    const handleCountdownUpdate = (payload: any) => {
      const newGameData = payload.new;
      
      if (newGameData?.status === 'countdown' && newGameData?.countdown_start) {
        // Calculate remaining time based on server timestamp
        const startTime = new Date(newGameData.countdown_start).getTime();
        const currentTime = new Date().getTime();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        const remainingSeconds = Math.max(0, newGameData.countdown_seconds - elapsedSeconds);
        
        setCountdownState({
          isActive: true,
          secondsRemaining: remainingSeconds,
          message: remainingSeconds > 0 ? `Round starting in ${remainingSeconds}...` : 'Go!'
        });
        
        // If countdown is complete, trigger the callback
        if (remainingSeconds === 0) {
          onCountdownComplete();
        }
      }
    };

    // Set up real-time subscription for countdown updates
    const subscription = supabase
      .channel(`game-countdown:${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'duo_games',
        filter: `game_id=eq.${gameId}`
      }, handleCountdownUpdate)
      .subscribe();
    
    // Tick the countdown locally once started
    const intervalId = setInterval(() => {
      if (countdownState.isActive && countdownState.secondsRemaining > 0) {
        setCountdownState(prev => ({
          ...prev,
          secondsRemaining: prev.secondsRemaining - 1,
          message: prev.secondsRemaining > 1 ? `Round starting in ${prev.secondsRemaining - 1}...` : 'Go!'
        }));
        
        // If countdown reaches zero, trigger the callback
        if (countdownState.secondsRemaining === 1) {
          onCountdownComplete();
        }
      }
    }, 1000);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [gameId, supabase, countdownState.isActive, countdownState.secondsRemaining, onCountdownComplete, initialSeconds]);

  return {
    isCountdownActive: countdownState.isActive,
    secondsRemaining: countdownState.secondsRemaining,
    countdownMessage: countdownState.message,
    startCountdown
  };
}
