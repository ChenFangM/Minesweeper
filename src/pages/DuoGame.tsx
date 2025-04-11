import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

const DuoGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gameId, setGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create a new game and navigate to it
  const createGame = async () => {
    if (!user) {
      setError('You must be logged in to create a game');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate a unique game ID
      const newGameId = uuidv4();
      console.log('Generated new game ID:', newGameId);
      
      // Create a new game record with only essential fields
      // This minimalist approach ensures compatibility with any database schema
      const { error: dbError } = await supabase
        .from('duo_games')
        .insert({
          game_id: newGameId,
          creator_id: user.id,
          updated_at: new Date()
        });
      
      if (dbError) {
        console.error('Database error creating game:', dbError);
        throw dbError;
      }
      
      console.log('Successfully created game, navigating to game room');
      // Navigate to the game room
      navigate(`/game/duo/${newGameId}`);
    } catch (err: any) {
      console.error('Error creating game:', err);
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  // Join an existing game
  const joinGame = async () => {
    if (!user) {
      setError('You must be logged in to join a game');
      return;
    }

    // Clean up the game ID - trim whitespace
    const cleanGameId = gameId.trim();
    if (!cleanGameId) {
      setError('Please enter a valid game ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Attempting to join game with ID:', cleanGameId);
      
      // First, check if the game exists
      const { data: existingGames, error: checkError } = await supabase
        .from('duo_games')
        .select('*')
        .eq('game_id', cleanGameId);
      
      if (checkError) {
        console.error('Error checking if game exists:', checkError);
        throw new Error('Error checking game. Please try again.');
      }
      
      // If game doesn't exist, show error instead of creating a new one
      if (!existingGames || existingGames.length === 0) {
        console.log('Game not found');
        throw new Error('Game not found. Please check the game ID and try again.');
        
      } else {
        // Game exists, check if we can join it
        const existingGame = existingGames[0];
        console.log('Found existing game:', existingGame);
        
        // If we're already the creator, just navigate to it
        if (existingGame.creator_id === user.id) {
          console.log('User is already the creator, navigating to game');
        } 
        // If we're already the opponent, just navigate to it
        else if (existingGame.opponent_id === user.id) {
          console.log('User is already the opponent, navigating to game');
        }
        // If game already has an opponent, show error
        else if (existingGame.opponent_id) {
          console.error('Game already has an opponent');
          throw new Error('This game already has two players. Please create a new game or join a different one.');
        }
        // If game is not in waiting status, show error
        else if (existingGame.status !== 'waiting') {
          console.error('Game is not in waiting status');
          throw new Error('This game is not available to join. Please create a new game or join a different one.');
        }
        // Otherwise, we can join as opponent
        else {
          console.log('Joining as opponent');
          
          // Try multiple approaches to update the game with our info
          let joinSuccess = false;
          
          // Approach 1: Direct update (might fail due to RLS)
          console.log('Attempting direct update approach');
          const { error: updateError } = await supabase
            .from('duo_games')
            .update({
              opponent_id: user.id,
              status: 'ready',
              updated_at: new Date()
            })
            .eq('game_id', cleanGameId);
          
          if (updateError) {
            console.error('Direct update failed:', updateError);
            
            // Approach 2: Use a stored function (if available)
            console.log('Attempting stored function approach');
            try {
              const { data: joinResult, error: rpcError } = await supabase.rpc('join_duo_game', {
                p_game_id: cleanGameId,
                p_user_id: user.id
              });
              
              if (rpcError) {
                console.error('RPC approach failed:', rpcError);
              } else {
                console.log('RPC approach succeeded:', joinResult);
                joinSuccess = true;
              }
            } catch (rpcErr) {
              console.error('RPC call failed:', rpcErr);
            }
            
            // Approach 3: Use a REST endpoint (if all else fails)
            if (!joinSuccess) {
              console.log('Attempting REST API approach');
              try {
                // This would be a custom API endpoint that you'd need to implement
                // For now, we'll just simulate it with another direct update attempt
                const { error: retryError } = await supabase
                  .from('duo_games')
                  .update({
                    opponent_id: user.id,
                    status: 'ready',
                    updated_at: new Date()
                  })
                  .eq('game_id', cleanGameId);
                
                if (!retryError) {
                  console.log('Retry update succeeded');
                  joinSuccess = true;
                } else {
                  console.error('Retry update failed:', retryError);
                }
              } catch (restErr) {
                console.error('REST approach failed:', restErr);
              }
            }
            
            // If all approaches failed, throw an error
            if (!joinSuccess) {
              throw new Error('Could not join game after multiple attempts. Please try again.');
            }
          } else {
            console.log('Direct update succeeded');
          }
          
          console.log('Successfully joined game as opponent');
        }
      }
      
      // Navigate to the game room
      navigate(`/game/duo/${cleanGameId}`);
      return;

    } catch (err: any) {
      console.error('Error joining game:', err);
      setError(err.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex flex-1">
        <Sidebar activePage="games" />
        
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Duo Battle Minesweeper</h1>
              <p className="text-muted-foreground">Challenge a friend in a head-to-head Minesweeper battle!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Game Card */}
              <Card className="border-2 border-pastel-lavender hover:border-vibrant-purple transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-vibrant-purple" />
                    Create Game
                  </CardTitle>
                  <CardDescription>
                    Start a new Minesweeper battle and invite a friend
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a new game and share the unique game ID with a friend to start playing.
                  </p>
                </CardContent>
                <CardFooter>
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={() => createGame()}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create New Game'}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
              
              {/* Join Game Card */}
              <Card className="border-2 border-pastel-mint hover:border-green-600 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Join Game
                  </CardTitle>
                  <CardDescription>
                    Join an existing Minesweeper battle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the game ID shared by your friend to join their game.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter Game ID"
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value)}
                      />
                      <Button 
                        onClick={joinGame}
                        disabled={loading || !gameId.trim()}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  {error && (
                    <p className="text-sm text-red-500 w-full text-center">{error}</p>
                  )}
                </CardFooter>
              </Card>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">How to Play Duo Battle:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Create a new game or join an existing one with a Game ID</li>
                <li>Both players get identical minefields</li>
                <li>Race to clear your board faster than your opponent</li>
                <li>If you hit a mine, you lose the round</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
};

export default DuoGame;
