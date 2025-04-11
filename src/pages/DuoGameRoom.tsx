import React, { useState, useEffect } from 'react';
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
import GameConfig, { GameSettings } from '@/components/duo-game/GameConfig';
import WaitingRoom from '@/components/duo-game/WaitingRoom';
import GameSettingsDisplay from '@/components/duo-game/GameSettings';

type GameData = {
  id: number;
  game_id: string;
  creator_id: string;
  opponent_id: string | null;
  status: 'waiting' | 'ready' | 'playing' | 'completed';
  current_round: number;
  total_rounds: number;
  creator_score: number;
  opponent_score: number;
  current_board_seed: number | null;
  difficulty: string;
  custom_width?: number;
  custom_height?: number;
  custom_mines?: number;
  timer_enabled?: boolean;
  created_at: string;
  updated_at: string;
};

type PlayerProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

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
  const [playerReady, setPlayerReady] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    difficulty: 'medium',
    totalRounds: 3
    // Timer is always enabled
  });
  
  // Determine host status whenever user or creator ID changes
  useEffect(() => {
    if (user && creatorId) {
      const userIsHost = user.id === creatorId;
      console.log(`Determining host status: user=${user.id}, creator=${creatorId}, isHost=${userIsHost}`);
      setIsHost(userIsHost);
    }
  }, [user, creatorId]);
  
  // Handle window unload to trigger host handover when host leaves
  useEffect(() => {
    if (!gameId || !user || !isHost || !gameData || !gameData.opponent_id) return;
    
    const handleBeforeUnload = async () => {
      try {
        // Only attempt host handover if we're the host and there's an opponent
        console.log('Host is leaving, attempting to hand over host role to opponent');
        
        // Call the host handover function
        await supabase.rpc('handle_host_handover', {
          p_game_id: gameId,
          p_new_host_id: gameData.opponent_id
        });
        
        console.log('Host handover successful');
      } catch (err) {
        console.error('Error during host handover:', err);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameId, user, isHost, gameData]);

  // No need for join intent check anymore since we're using the proper database functions

  // Set up custom event listener for game settings updates
  useEffect(() => {
    if (!gameId) return;
    
    const handleSettingsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{gameId: string, settings: any}>;
      
      // Only process events for this game
      if (customEvent.detail.gameId !== gameId) return;
      
      console.log('Received custom settings update event:', customEvent.detail);
      
      // Update game settings
      const newSettings = customEvent.detail.settings;
      
      // Create a new GameSettings object
      const updatedSettings: GameSettings = {
        difficulty: (newSettings.difficulty as 'easy' | 'medium' | 'hard' | 'custom') || 'medium',
        totalRounds: newSettings.total_rounds || 3
        // Timer is always enabled
      };
      
      // Add custom settings if applicable
      if (updatedSettings.difficulty === 'custom') {
        updatedSettings.customWidth = newSettings.custom_width || 16;
        updatedSettings.customHeight = newSettings.custom_height || 16;
        updatedSettings.customMines = newSettings.custom_mines || 40;
      }
      
      console.log('Updating game settings from custom event:', updatedSettings);
      setGameSettings(updatedSettings);
    };
    
    // Add event listener
    window.addEventListener('game-settings-updated', handleSettingsUpdate);
    
    // Clean up
    return () => {
      window.removeEventListener('game-settings-updated', handleSettingsUpdate);
    };
  }, [gameId]);
  
  // Load game data and set up real-time subscriptions
  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId || !user) return;
      
      try {
        setLoading(true);
        setError('');
        
        // Ensure gameId is properly formatted for UUID comparison
        console.log('Loading game data for game ID:', gameId);
        
        // Check if the game ID is in UUID format
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId);
        if (!isValidUUID) {
          console.warn('Game ID is not in standard UUID format, this might cause issues with database queries');
        }
        
        // Get game data
        const { data, error: gameError } = await supabase
          .from('duo_games')
          .select('*')
          .eq('game_id', gameId)
          .single();
        
        if (gameError) throw gameError;
        
        if (!data) {
          throw new Error('Game not found');
        }
        
        // Set up real-time subscription for game updates
        const gameSubscription = supabase
          .channel(`game-settings-sync:${gameId}`)
          .on('postgres_changes', {
            event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'duo_games',
            filter: `game_id=eq.${gameId}`
          }, (payload) => {
            console.log('Game updated in real-time:', payload);
            
            // Only process if we have new data
            if (!payload.new) return;
            
            // Update game data immediately, but preserve host status
            const payloadData = payload.new as Record<string, any>;
            
            setGameData(prevData => {
              if (!prevData) return payload.new as GameData;
              
              // Get the updated data but preserve creator_id
              const updatedData = {
                ...prevData,
                ...payload.new
              };
              
              console.log('Updating game data, preserving host status');
              return updatedData;
            });
            
            // If creator_id changed in the payload, update our stored creator ID
            if (payloadData.creator_id && payloadData.creator_id !== creatorId) {
              console.log(`Creator ID changed from ${creatorId} to ${payloadData.creator_id}`);
              setCreatorId(payloadData.creator_id);
            }
            
            // Check if basic settings were updated
            // Use type assertion to ensure TypeScript knows these properties exist
            const oldData = (payload.old || {}) as Record<string, any>;
            
            const settingsChanged = 
              payloadData.difficulty !== oldData.difficulty ||
              payloadData.total_rounds !== oldData.total_rounds;
            
            if (settingsChanged) {
              console.log('Game settings changed in database, updating UI...');
              
              // Create new settings object with database values
              const newSettings: GameSettings = {
                difficulty: (payloadData.difficulty as 'easy' | 'medium' | 'hard' | 'custom') || 'medium',
                totalRounds: payloadData.total_rounds || 3
                // Timer is always enabled
              };
              
              // Try to get additional settings from localStorage
              try {
                const storedSettings = localStorage.getItem(`game_settings_${gameId}`);
                if (storedSettings) {
                  const additionalSettings = JSON.parse(storedSettings);
                  console.log('Found additional settings in localStorage:', additionalSettings);
                  
                  // Update timer setting
                  if (additionalSettings.timer_enabled !== undefined) {
                    newSettings.timerEnabled = additionalSettings.timer_enabled;
                  }
                  
                  // Update custom settings if applicable
                  if (newSettings.difficulty === 'custom') {
                    newSettings.customWidth = additionalSettings.custom_width || 16;
                    newSettings.customHeight = additionalSettings.custom_height || 16;
                    newSettings.customMines = additionalSettings.custom_mines || 40;
                  }
                }
              } catch (err) {
                console.error('Error parsing localStorage settings:', err);
              }
              
              // Apply the new settings immediately
              console.log('Applying new game settings:', newSettings);
              setGameSettings(newSettings);
            }
          })
          .subscribe();
        
        // Clean up subscription when component unmounts
        return () => {
          gameSubscription.unsubscribe();
        };
        
        // Set game data
        setGameData(data as GameData);
        
        // Store creator ID for reliable host determination
        setCreatorId(data.creator_id);
        
        // Check if user is host
        const userIsHost = data.creator_id === user.id;
        console.log(`Setting isHost to ${userIsHost} for user ${user.id}, creator is ${data.creator_id}`);
        setIsHost(userIsHost);
        
        // Set game settings based on what's available in the database
        // Since some columns might not exist in the schema, we'll use defaults
        const gameSettings: GameSettings = {
          difficulty: (data.difficulty as 'easy' | 'medium' | 'hard' | 'custom') || 'medium',
          totalRounds: data.total_rounds || 3
          // Timer is always enabled
        };
        
        // Try to get additional settings from localStorage
        try {
          const storedSettings = localStorage.getItem(`game_settings_${gameId}`);
          if (storedSettings) {
            const additionalSettings = JSON.parse(storedSettings);
            console.log('Found additional settings in localStorage:', additionalSettings);
            
            // Timer is always enabled, no need to update
            
            // Handle custom settings if difficulty is custom
            if (gameSettings.difficulty === 'custom') {
              gameSettings.customWidth = additionalSettings.custom_width || 16;
              gameSettings.customHeight = additionalSettings.custom_height || 16;
              gameSettings.customMines = additionalSettings.custom_mines || 40;
            }
          } else {
            console.log('No additional settings found in localStorage, using defaults');
            // Use default values since settings don't exist
            if (gameSettings.difficulty === 'custom') {
              gameSettings.customWidth = 16;
              gameSettings.customHeight = 16;
              gameSettings.customMines = 40;
            }
          }
        } catch (err) {
          console.error('Error parsing localStorage settings:', err);
          
          // Use default values if parsing fails
          if (gameSettings.difficulty === 'custom') {
            gameSettings.customWidth = 16;
            gameSettings.customHeight = 16;
            gameSettings.customMines = 40;
          }
        }
        
        setGameSettings(gameSettings);
        
        // Check if game has started
        if (data.status === 'playing' || data.status === 'completed') {
          setGameStarted(true);
        }
        
        // Get opponent data if exists
        if (data.opponent_id) {
          const opponentId = userIsHost ? data.opponent_id : data.creator_id;
          
          const { data: opponentData, error: opponentError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', opponentId)
            .single();
          
          if (opponentError) throw opponentError;
          
          if (opponentData) {
            setOpponent(opponentData as PlayerProfile);
          }
        }
      } catch (err: any) {
        console.error('Error loading game data:', err);
        setError(err.message || 'Failed to load game');
        
        toast({
          title: 'Error',
          description: err.message || 'Failed to load game',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadGameData();
    
    // Set up real-time subscription for game updates
    const subscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'duo_games',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        console.log('Game updated:', payload);
        
        // Update game data
        setGameData(payload.new as GameData);
        
        // Check if creator_id changed (host handover)
        if (payload.new && payload.old && payload.new.creator_id !== payload.old.creator_id) {
          console.log(`Creator ID changed from ${payload.old.creator_id} to ${payload.new.creator_id}`);
          setCreatorId(payload.new.creator_id);
          
          // Show appropriate toast based on whether user is now host or not
          if (user && payload.new.creator_id === user.id && payload.old.creator_id !== user.id) {
            // Current user became the host
            toast({
              title: 'You are now the host',
              description: 'The previous host left or transferred control. You can now manage game settings.',
              duration: 5000
            });
          } else if (user && payload.old.creator_id === user.id && payload.new.creator_id !== user.id) {
            // Current user is no longer the host
            toast({
              title: 'Host role transferred',
              description: 'You are no longer the host of this game.',
              duration: 5000
            });
          }
        }
        
        // Check if game status changed to 'playing'
        if (payload.new && payload.new.status === 'playing' && payload.old && payload.old.status !== 'playing') {
          setGameStarted(true);
          
          toast({
            title: 'Game Started',
            description: 'The game has started!',
          });
        }
        
        // Check if opponent joined
        if (payload.new && payload.new.opponent_id && !payload.old.opponent_id) {
          // Reload game data to get opponent info
          loadGameData();
          
          toast({
            title: 'Opponent Joined',
            description: 'An opponent has joined the game!',
          });
        }
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [gameId, user, toast]);

  // Handle game settings update
  const handleSettingsUpdated = (settings: GameSettings) => {
    console.log('Settings updated by host:', settings);
    setGameSettings(settings);
    
    toast({
      title: 'Settings Updated',
      description: 'Game settings have been updated',
    });
  };

  // Handle player ready status change
  const handlePlayerReady = (isReady: boolean) => {
    setPlayerReady(isReady);
  };

  // Handle game start
  const handleGameStart = () => {
    setGameStarted(true);
    
    toast({
      title: 'Game Started',
      description: 'The game has started!',
    });
  };
  
  // Handle host handover manually
  const handleHostHandover = async () => {
    if (!gameId || !gameData || !gameData.opponent_id) {
      toast({
        title: 'Cannot transfer host',
        description: 'There is no opponent to transfer host role to.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Call the host handover function
      const { data, error } = await supabase.rpc('handle_host_handover', {
        p_game_id: gameId,
        p_new_host_id: gameData.opponent_id
      });
      
      if (error) throw error;
      
      toast({
        title: 'Host Transferred',
        description: 'You have transferred the host role to your opponent.',
      });
      
      // The real-time subscription will update the UI
    } catch (err: any) {
      console.error('Error during manual host handover:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to transfer host role',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Return to menu
  const handleReturnToMenu = () => {
    navigate('/game');
  };

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
                <p>Loading game...</p>
              </div>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }

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

  if (gameStarted) {
    // Game has started - this will be implemented in the next part
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar activePage="games" />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <h1 className="text-2xl font-bold">Duo Game in Progress</h1>
              <p>Game ID: {gameId}</p>
              <p>The game has started! Game board implementation coming in the next part.</p>
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
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
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
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default DuoGameRoom;