import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Import duo game components
import GameConfig from '@/components/duo-game/GameConfig';
import WaitingRoom from '@/components/duo-game/WaitingRoom';
import GameSettingsDisplay from '@/components/duo-game/GameSettings';

// Import types
import { GameData, PlayerProfile, GameSettings } from '@/types/duoGame';

const DuoGameRoom = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Basic state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [opponent, setOpponent] = useState<PlayerProfile | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    difficulty: 'medium',
    totalRounds: 3
  });
  
  // Determine host status whenever user or creator ID changes
  useEffect(() => {
    if (user && gameData) {
      const userIsHost = user.id === gameData.creator_id;
      console.log(`Host status check: user=${user.id}, creator=${gameData.creator_id}, isHost=${userIsHost}`);
      setIsHost(userIsHost);
    }
  }, [user, gameData]);
  
  // Redirect to game board if game has started
  useEffect(() => {
    if (gameStarted && gameId) {
      navigate(`/duo-board/${gameId}`, {
        state: {
          gameSettings,
          isHost
        }
      });
    }
  }, [gameStarted, gameId, navigate, gameSettings, isHost]);
  
  // Load game data on mount
  useEffect(() => {
    if (!gameId || !user) return;
    
    const loadGameData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Loading game data for game ID:', gameId);
        
        // Get game data
        const { data, error: gameError } = await supabase
          .from('duo_games')
          .select('*')
          .eq('game_id', gameId)
          .single();
        
        if (gameError) throw gameError;
        if (!data) throw new Error('Game not found');
        
        console.log('Game data loaded:', data);
        
        // Set game data
        setGameData(data as GameData);
        
        // Set game settings
        const settings: GameSettings = {
          difficulty: (data.difficulty as 'easy' | 'medium' | 'hard' | 'custom') || 'medium',
          totalRounds: data.total_rounds || 3
        };
        
        // If custom difficulty, set custom dimensions
        if (settings.difficulty === 'custom') {
          settings.customWidth = data.custom_width || 16;
          settings.customHeight = data.custom_height || 16;
          settings.customMines = data.custom_mines || 40;
        }
        
        setGameSettings(settings);
        
        // Check if game has started
        if (data.status === 'playing') {
          setGameStarted(true);
        }
        
        // Check if we have an opponent
        if (data.opponent_id) {
          // Fetch opponent profile
          const { data: opponentData, error: opponentError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.opponent_id)
            .single();
          
          if (!opponentError && opponentData) {
            console.log('Opponent profile loaded:', opponentData);
            setOpponent(opponentData as PlayerProfile);
          }
        }
      } catch (err: any) {
        console.error('Error loading game data:', err);
        setError(err.message || 'Failed to load game data');
        toast({
          title: 'Error',
          description: err.message || 'Failed to load game data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadGameData();
    
    // Check for any disconnected host flags and handle them
    try {
      const disconnectKey = `host_disconnect_${gameId}`;
      const disconnectData = localStorage.getItem(disconnectKey);
      
      if (disconnectData) {
        const { opponentId, timestamp } = JSON.parse(disconnectData);
        const timeDiff = new Date().getTime() - timestamp;
        
        // Only process if the disconnect happened recently (within 30 seconds)
        if (timeDiff < 30000 && opponentId) {
          console.log('Found recent host disconnect, handling host transfer');
          
          // If the current user is the opponent, update the game to make them the host
          if (user.id === opponentId) {
            supabase
              .from('duo_games')
              .update({ creator_id: opponentId })
              .eq('game_id', gameId)
              .then(({ error }) => {
                if (error) {
                  console.error('Error taking over as host:', error);
                } else {
                  console.log('Successfully took over as host after disconnect');
                  // Clear the disconnect flag
                  localStorage.removeItem(disconnectKey);
                }
              });
          }
        } else {
          // Clear old disconnect flags
          localStorage.removeItem(disconnectKey);
        }
      }
    } catch (e) {
      console.error('Error processing disconnect flags:', e);
    }
    
    // Set up real-time subscription for game updates
    const gameSubscription = supabase
      .channel(`game-updates:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'duo_games',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        console.log('Game updated in real-time:', payload);
        
        if (!payload.new) return;
        
        const newData = payload.new as GameData;
        
        // Update game data while preserving creator_id
        setGameData(prevData => {
          if (!prevData) return newData;
          
          // IMPORTANT: Only use the new creator_id if it's actually present
          // This prevents null/undefined from overwriting the existing creator_id
          return {
            ...newData,
            creator_id: newData.creator_id || prevData.creator_id
          };
        });
        
        // Check if game has started
        if (newData.status === 'playing' && !gameStarted) {
          setGameStarted(true);
        }
        
        // Update opponent if changed
        if (newData.opponent_id !== gameData?.opponent_id) {
          if (newData.opponent_id) {
            supabase
              .from('profiles')
              .select('*')
              .eq('id', newData.opponent_id)
              .single()
              .then(({ data, error }) => {
                if (!error && data) {
                  setOpponent(data as PlayerProfile);
                }
              });
          } else {
            setOpponent(null);
          }
        }
        
        // Update game settings if changed
        const oldData = (payload.old || {}) as Record<string, any>;
        const settingsChanged = 
          newData.difficulty !== oldData.difficulty ||
          newData.total_rounds !== oldData.total_rounds;
        
        if (settingsChanged) {
          const newSettings: GameSettings = {
            difficulty: (newData.difficulty as 'easy' | 'medium' | 'hard' | 'custom') || 'medium',
            totalRounds: newData.total_rounds || 3
          };
          
          if (newSettings.difficulty === 'custom') {
            newSettings.customWidth = newData.custom_width || 16;
            newSettings.customHeight = newData.custom_height || 16;
            newSettings.customMines = newData.custom_mines || 40;
          }
          
          setGameSettings(newSettings);
        }
      })
      .subscribe();
    
    // Handle cleanup when component unmounts
    return () => {
      console.log('Cleaning up game subscription');
      gameSubscription.unsubscribe();
      
      // Handle cleanup when component unmounts
      if (gameId && user && gameData) {
        // If we're the host and there's an opponent, hand over host role
        if (isHost && gameData.opponent_id && (gameData.status === 'waiting' || gameData.status === 'ready')) {
          console.log('Host is navigating away, handing over host role');
          
          supabase.rpc('handle_host_handover', {
            p_game_id: gameId,
            p_new_host_id: gameData.opponent_id
          }).then(({ error }) => {
            if (error) {
              console.error('Error during host handover on unmount:', error);
            }
          });
        } 
        // If we're the opponent, remove ourselves from the game
        else if (!isHost && gameData.status === 'waiting') {
          console.log('Opponent is navigating away, removing from waiting room');
          
          supabase
            .from('duo_games')
            .update({ 
              opponent_id: null,
              status: 'waiting'
            })
            .eq('game_id', gameId)
            .then(({ error }) => {
              if (error) {
                console.error('Error removing opponent on unmount:', error);
              }
            });
        }
      }
    };
  }, [gameId, user, toast]);
  
  // Handle window unload to trigger host handover when host leaves
  useEffect(() => {
    if (!gameId || !user || !gameData) return;
    
    // Create a safer version of the beforeunload handler that doesn't rely on synchronous XHR
    // which can be problematic in some browsers
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('Page is about to unload, setting flag for cleanup');
      
      // Set a flag in localStorage to indicate an abrupt disconnect
      if (isHost && gameData.opponent_id) {
        try {
          localStorage.setItem(`host_disconnect_${gameId}`, JSON.stringify({
            gameId,
            opponentId: gameData.opponent_id,
            timestamp: new Date().getTime()
          }));
        } catch (e) {
          console.error('Error setting disconnect flag:', e);
        }
      }
      
      // Standard beforeunload boilerplate
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // We're not doing cleanup here anymore to prevent issues with re-renders
      // The cleanup is now handled in a separate useEffect below
    };
  }, [gameId, user, isHost, gameData]);
  
  // Add a separate useEffect for actual navigation/unmount cleanup
  // This prevents the cleanup from running on every re-render
  useEffect(() => {
    // Create a flag to track if we're unmounting due to navigation
    let isUnmounting = false;
    
    // Store the current URL path when the component mounts
    const initialPath = window.location.pathname;
    
    return () => {
      // Only run cleanup if we're actually navigating away from the page
      // and not just re-rendering due to state changes
      if (gameId && user && gameData) {
        // Check if we're actually navigating away or just re-rendering
        const currentPath = window.location.pathname;
        isUnmounting = currentPath !== initialPath;
        
        if (isUnmounting) {
          console.log('Component is actually unmounting, performing cleanup');
          
          // If we're the host and there's an opponent, hand over host role
          if (isHost && gameData.opponent_id && (gameData.status === 'waiting' || gameData.status === 'ready')) {
            console.log('Host is navigating away, handing over host role');
            
            supabase.rpc('handle_host_handover', {
              p_game_id: gameId,
              p_new_host_id: gameData.opponent_id
            }).then(({ error }) => {
              if (error) {
                console.error('Error during host handover on unmount:', error);
              }
            });
          } 
          // If we're the opponent, remove ourselves from the game
          else if (!isHost && gameData.status === 'waiting') {
            console.log('Opponent is navigating away, removing from waiting room');
            
            supabase
              .from('duo_games')
              .update({ 
                opponent_id: null,
                status: 'waiting'
              })
              .eq('game_id', gameId)
              .then(({ error }) => {
                if (error) {
                  console.error('Error removing opponent on unmount:', error);
                }
              });
          }
        } else {
          console.log('Component is re-rendering, skipping cleanup');
        }
      }
    };
  }, [gameId, user, isHost, gameData]);
  
  // Function handlers
  const handleGameStart = useCallback(() => {
    console.log('Game starting!');
    setGameStarted(true);
  }, []);
  
  const handlePlayerReady = useCallback(() => {
    // This function is just a callback for the WaitingRoom component
    // The actual ready state is managed in the WaitingRoom component
  }, []);
  
  const handleSettingsUpdated = useCallback((newSettings: GameSettings) => {
    console.log('Game settings updated:', newSettings);
    setGameSettings(newSettings);
  }, []);
  
  const handleHostHandover = useCallback(async () => {
    if (!gameId || !user || !gameData || !gameData.opponent_id) return;
    
    try {
      setLoading(true);
      
      console.log(`Transferring host role from ${user.id} to ${gameData.opponent_id}`);
      
      const { error } = await supabase.rpc('handle_host_handover', {
        p_game_id: gameId,
        p_new_host_id: gameData.opponent_id
      });
      
      if (error) throw error;
      
      toast({
        title: 'Host Role Transferred',
        description: 'You are no longer the host of this game.',
      });
      
      // Update local state immediately
      setIsHost(false);
    } catch (err: any) {
      console.error('Error transferring host role:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to transfer host role',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [gameId, user, gameData, toast]);
  
  const handleReturnToMenu = useCallback(() => {
    navigate('/');
  }, [navigate]);
  
  // Render loading state
  if (loading && !gameData) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar activePage="games" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-lg">Loading game...</p>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar activePage="games" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-red-500 text-lg">Error: {error}</p>
              <Button onClick={handleReturnToMenu}>Return to Menu</Button>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar activePage="games" />
        <main className="flex-1 p-4 md:p-6">
          {loading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p>Loading...</p>
              </div>
            </div>
          )}
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Duo Game Room</h1>
              <p className="text-muted-foreground">Prepare for your Minesweeper battle!</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Waiting Room */}
              <WaitingRoom 
                gameId={gameId || ''}
                userId={user?.id || ''}
                isHost={isHost}
                opponentId={opponent?.id}
                opponentUsername={opponent?.username}
                onGameStart={handleGameStart}
                onPlayerReady={handlePlayerReady}
                gameSettings={gameSettings}
              />
              
              {/* Right Column: Game Config or Settings View */}
              <div className="space-y-4">
                {isHost ? (
                  <div className="space-y-4">
                    <GameConfig 
                      gameId={gameId || ''}
                      userId={user?.id || ''}
                      onSettingsUpdated={handleSettingsUpdated}
                      initialSettings={gameSettings}
                      canEdit={!gameStarted}
                    />
                    
                    {/* Host Transfer Option */}
                    {gameData?.opponent_id && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Host Controls</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-4">Transfer host role to your opponent if you need to leave the game.</p>
                          <Button 
                            onClick={handleHostHandover}
                            variant="outline"
                            className="w-full"
                          >
                            Transfer Host Role
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <GameSettingsDisplay settings={gameSettings} />
                )}
              </div>
            </div>
            
            {/* Debug info */}
            <div className="text-xs text-gray-400 mt-6">
              Host status: <strong>
                {user && gameData ? 
                  (user.id === gameData.creator_id ? 'You are the host' : 'You are not the host') : 
                  'Loading...'}
              </strong> 
              (User ID: {user?.id?.slice(-4) || 'unknown'}, Creator ID: {gameData?.creator_id?.slice(-4) || 'unknown'})
            </div>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default DuoGameRoom;
