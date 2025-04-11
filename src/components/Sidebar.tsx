
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

const SidebarItem = ({ icon, label, active, onClick }: SidebarItemProps) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start py-2 px-4 text-base font-medium rounded-lg",
        active ? "bg-pastel-lavender text-vibrant-purple" : "hover:bg-pastel-lavender/50"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-vibrant-purple" />}
    </Button>
  );
};

// Define Friend type
type Friend = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

const Sidebar = ({ activePage }: { activePage?: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
          .limit(5);

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
  
  // Determine active page based on prop or current location
  const currentPage = activePage || (
    location.pathname === '/game' ? 'games' :
    location.pathname === '/friends' ? 'friends' :
    location.pathname === '/messages' ? 'messages' : 'games'
  );
  return (
    <aside className="w-64 border-r h-screen p-4 hidden md:block">
      <div className="space-y-1">
        <SidebarItem 
          icon={<Gamepad className="h-5 w-5" />}
          label="Games" 
          active={currentPage === 'games'}
          onClick={() => navigate('/game')}
        />
        <SidebarItem 
          icon={<Users className="h-5 w-5" />}
          label="Friends" 
          active={currentPage === 'friends'}
          onClick={() => navigate('/friends')}
        />
        <SidebarItem 
          icon={<MessageSquare className="h-5 w-5" />}
          label="Messages" 
          active={currentPage === 'messages'}
          onClick={() => navigate('/messages')}
        />
      </div>
      
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-4">RECOMMENDED GAMES</h3>
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            className="w-full justify-start py-2 px-4 rounded-lg"
            onClick={() => navigate('/game/single-player')}
          >
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />
            <span>Single Player</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start py-2 px-4 rounded-lg"
            onClick={() => navigate('/game/duo')}
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
            <span>Duo Battle</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start py-2 px-4 rounded-lg"
            onClick={() => navigate('/game/multi')}
          >
            <div className="w-2 h-2 rounded-full bg-purple-400 mr-2" />
            <span>Multiplayer</span>
          </Button>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-4">ONLINE FRIENDS</h3>
        <div className="space-y-1 px-4">
          {loading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : friends.length > 0 ? (
            friends.map((friend, index) => (
              <div key={friend.id} className="flex items-center py-2 cursor-pointer hover:bg-pastel-lavender/20 rounded-md px-1" onClick={() => navigate('/friends')}>
                <div className="relative mr-2">
                  <Avatar className="h-6 w-6">
                    {friend.avatar_url ? (
                      <AvatarImage src={friend.avatar_url} alt={friend.username} />
                    ) : null}
                    <AvatarFallback className={`${index % 2 === 0 ? 'bg-pastel-pink text-vibrant-pink' : 'bg-pastel-mint text-green-600'} text-xs`}>
                      {friend.full_name ? `${friend.full_name.charAt(0)}${friend.full_name.split(' ')[1]?.charAt(0) || ''}` : friend.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="badge-online w-2 h-2"></span>
                </div>
                <span className="text-sm">{friend.full_name || friend.username}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-2">
              <span className="text-sm text-muted-foreground">No friends online</span>
              <div>
                <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={() => navigate('/friends')}>
                  Add friends
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
