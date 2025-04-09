
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad, MessageSquare, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

// Define Friend type
type Friend = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

const MobileNav = () => {
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
          .eq('status', 'accepted')
          .limit(3);

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
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white md:hidden flex justify-around p-2 z-10">
      <Button 
        variant="ghost" 
        className="flex flex-col items-center py-2"
        onClick={() => navigate('/game')}
      >
        <Gamepad className="h-6 w-6" />
        <span className="text-xs mt-1">Games</span>
      </Button>
      
      <Button 
        variant="ghost" 
        className="flex flex-col items-center py-2"
        onClick={() => navigate('/friends')}
      >
        <Users className="h-6 w-6" />
        <span className="text-xs mt-1">Friends</span>
      </Button>
      
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="flex flex-col items-center py-2">
            <div className="relative">
              <MessageSquare className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 bg-vibrant-pink text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </div>
            <span className="text-xs mt-1">Chat</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col h-[80vh]">
          <div className="px-4 py-3 border-b">
            <h2 className="text-lg font-bold">Messages</h2>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </>
              ) : friends.length > 0 ? (
                friends.map((friend, index) => (
                  <div 
                    key={friend.id} 
                    className={`flex items-center space-x-3 p-2 rounded-lg ${index === 1 ? 'bg-pastel-blue/20' : 'hover:bg-pastel-blue/20'} transition-colors`}
                  >
                    <Avatar className="h-10 w-10">
                      {friend.avatar_url ? (
                        <AvatarImage src={friend.avatar_url} alt={friend.username} />
                      ) : null}
                      <AvatarFallback 
                        className={index % 3 === 0 ? 'bg-pastel-pink text-vibrant-pink' : 
                                  index % 3 === 1 ? 'bg-pastel-mint text-green-600' : 
                                  'bg-pastel-yellow text-orange-600'}
                      >
                        {friend.full_name ? `${friend.full_name.charAt(0)}${friend.full_name.split(' ')[1]?.charAt(0) || ''}` : friend.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friend.full_name || friend.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {index % 3 === 0 ? 'Ready for the next game?' : 
                         index % 3 === 1 ? 'Let\'s play one more round!' : 
                         'Great game yesterday!'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No friends yet</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => navigate('/friends')}
                  >
                    Find Friends
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;
