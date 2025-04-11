
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import GameCard from '@/components/GameCard';
import FeaturedGame from '@/components/FeaturedGame';
import QuickJoin from '@/components/QuickJoin';
import MobileNav from '@/components/MobileNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

// Define the Friend type
type Friend = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load friends when component mounts
  useEffect(() => {
    if (!user) return;
    
    const loadFriends = async () => {
      setLoading(true);
      try {
        // Get accepted friends
        const { data, error } = await supabase
          .from('friends')
          .select('friend_id, profiles:friend_id(id, username, full_name, avatar_url)')
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (error) throw error;

        // Format friends data
        const formattedFriends = data.map((friend: any) => ({
          id: friend.friend_id,
          username: friend.profiles.username,
          full_name: friend.profiles.full_name,
          avatar_url: friend.profiles.avatar_url
        }));

        setFriends(formattedFriends);
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [user]);
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex flex-1">
        <Sidebar />
        
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Featured Game Banner */}
            <FeaturedGame />
            
            {/* Game Categories */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-3/4 space-y-6">
                <Tabs defaultValue="popular" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Games</h2>
                    <TabsList>
                      <TabsTrigger value="popular">Popular</TabsTrigger>
                      <TabsTrigger value="new">New</TabsTrigger>
                      <TabsTrigger value="friends">With Friends</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="popular" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-in">
                      <GameCard 
                        title="Single Player" 
                        playerCount="1 player per game"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-mint"
                        onClick={() => navigate('/game/single-player')}
                      />
                      <GameCard 
                        title="Duo Battle" 
                        playerCount="2 players per game"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-blue"
                        onClick={() => navigate('/game/duo')}
                      />
                      <GameCard 
                        title="Multiplayer" 
                        playerCount="500 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-lavender"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="new" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <GameCard 
                        title="Single Player" 
                        playerCount="NEW! 24 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-blue"
                      />
                      <GameCard 
                        title="Duo Battle" 
                        playerCount="NEW! 18 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-lavender"
                      />
                      <GameCard 
                        title="Multiplayer" 
                        playerCount="NEW! 36 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-pink"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="friends" className="space-y-6 mt-0">
                    {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton className="h-48 w-full rounded-lg" />
                        <Skeleton className="h-48 w-full rounded-lg" />
                      </div>
                    ) : friends.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {friends.map((friend, index) => (
                          <GameCard 
                            key={friend.id}
                            title={index % 2 === 0 ? "Duo Battle" : "Multiplayer"} 
                            playerCount={`${friend.full_name || friend.username} ${index % 3 === 0 ? 'online' : 'playing'}`}
                            image={friend.avatar_url || "/placeholder.svg"}
                            category="Minesweeper"
                            backgroundColor={index % 3 === 0 ? "bg-pastel-mint" : index % 3 === 1 ? "bg-pastel-blue" : "bg-pastel-lavender"}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <p className="text-muted-foreground">You don't have any friends yet. Visit the <a href="/friends" className="text-vibrant-purple hover:underline">Friends page</a> to add friends!</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="md:w-1/4">
                <QuickJoin />
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
};

export default Index;
