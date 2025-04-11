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
      navigate(`/duo/${newGameId}`);
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
      
      // First, check if the game exists using the public search function
      console.log('Searching for game with ID:', cleanGameId);
      
      // Use the search_game_by_id function that we created in the migration
      // This function is accessible to all authenticated users
      const { data: searchResult, error: searchError } = await supabase
        .rpc('search_game_by_id', { p_game_id: cleanGameId });
      
      if (searchError) {
        console.error('Error searching for game:', searchError);
        throw new Error('Error searching for game. Please try again.');
      }
      
      // Format the search results into a format similar to what we'd get from a direct query
      const existingGames = searchResult || [];
      const checkError = searchError;
      
      if (checkError) {
        console.error('Error checking if game exists:', checkError);
        throw new Error('Error checking game. Please try again.');
      }
      
      // If game doesn't exist, show error
      if (!existingGames || existingGames.length === 0) {
        console.log('Game not found');
        throw new Error('Game not found. Please check the game ID and try again.');
      }
      
      // Game exists, check if we can join it
      const existingGame = existingGames[0];
      console.log('Found existing game:', existingGame);
      
      // If we're already the creator or opponent, just navigate to it
      if (existingGame.creator_id === user.id || existingGame.opponent_id === user.id) {
        console.log('User is already part of this game, navigating to game room');
        navigate(`/duo/${cleanGameId}`);
        return;
      }
      
      // If game already has an opponent, show error
      if (existingGame.opponent_id) {
        console.error('Game already has an opponent');
        throw new Error('This game already has two players. Please create a new game or join a different one.');
      }
      
      // If game is not in waiting status, show error
      if (existingGame.status !== 'waiting') {
        console.error('Game is not in waiting status');
        throw new Error('This game is not available to join. Please create a new game or join a different one.');
      }
      
      // At this point, we can join as opponent
      console.log('Joining as opponent');
      
      // Use the join_duo_game stored procedure to join the game
      console.log('Attempting to join game using stored procedure');
      
      const { data: joinResult, error: joinError } = await supabase
        .rpc('join_duo_game', {
          p_game_id: cleanGameId,
          p_user_id: user.id
        });
      
      if (joinError) {
        console.error('Error joining game:', joinError);
        throw new Error(`Failed to join game: ${joinError.message || 'Unknown error'}`);
      }
      
      console.log('Successfully joined game, navigating to game room');
      navigate(`/duo/${cleanGameId}`);
      
    } catch (err: any) {
      console.error('Error joining game:', err);
      
      // Enhanced error handling to capture Supabase errors
      if (err instanceof Error) {
        setError(err.message || 'Failed to join game');
      } else if (typeof err === 'object' && err !== null) {
        // Handle Supabase error object format
        if ('code' in err && 'message' in err) {
          setError(`Database error (${err.code}): ${err.message}`);
        } else if ('details' in err) {
          setError(`Error details: ${err.details}`);
        } else {
          // Try to stringify the error object for debugging
          try {
            setError(JSON.stringify(err) || 'Failed to join game');
          } catch {
            setError('Failed to join game with unknown error');
          }
        }
      } else {
        setError('Failed to join game. Please try again.');
      }
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
