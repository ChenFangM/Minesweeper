
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Settings, User, LogIn, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Load pending friend requests count
  useEffect(() => {
    if (!user) return;
    
    const loadPendingRequests = async () => {
      setLoading(true);
      try {
        const { data, error, count } = await supabase
          .from('friends')
          .select('id', { count: 'exact' })
          .eq('friend_id', user.id)
          .eq('status', 'pending');

        if (error) throw error;
        setPendingRequests(count || 0);
      } catch (error) {
        console.error('Error loading friend requests:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPendingRequests();
    
    // Set up real-time subscription for friend requests
    const subscription = supabase
      .channel('friends_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `friend_id=eq.${user.id}`,
      }, () => {
        loadPendingRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  
  const navigateToFriendRequests = () => {
    navigate('/friends');
  };
  return (
    <nav className="w-full bg-white border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Link to={user ? "/game" : "/"} className="cursor-pointer">
          <div className="text-xl font-bold bg-gradient-to-r from-vibrant-purple to-vibrant-pink bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            Minesweeps
          </div>
        </Link>
      </div>
      
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <Bell className="h-5 w-5" />
                  {pendingRequests > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-vibrant-pink rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b">
                  <h4 className="font-medium">Notifications</h4>
                </div>
                {pendingRequests > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer" onClick={navigateToFriendRequests}>
                      <div className="bg-pastel-lavender p-2 rounded-full">
                        <UserPlus className="h-4 w-4 text-vibrant-purple" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Friend Requests</p>
                        <p className="text-xs text-muted-foreground">You have {pendingRequests} pending friend {pendingRequests === 1 ? 'request' : 'requests'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No new notifications
                  </div>
                )}
              </PopoverContent>
            </Popover>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full h-8 w-8 relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt={user.email || 'User'} />
                    <AvatarFallback className="bg-pastel-lavender text-vibrant-purple">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="badge-online"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/login">
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
