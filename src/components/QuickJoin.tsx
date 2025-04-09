
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Avatar from '@/components/Avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

// Define Friend type
type Friend = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

const QuickJoin = () => {
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
    <Card className="border-none shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick Join</CardTitle>
        <CardDescription>Friends playing now</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : friends.length > 0 ? (
          <div className="space-y-3">
            {friends.map((friend, index) => (
              <div key={friend.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar 
                    fallback={friend.full_name ? `${friend.full_name.charAt(0)}${friend.full_name.split(' ')[1]?.charAt(0) || ''}` : friend.username.charAt(0).toUpperCase()} 
                    status={index % 2 === 0 ? "online" : "away"} 
                    size="sm" 
                  />
                  <div>
                    <p className="text-sm font-medium">{friend.full_name || friend.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {index % 3 === 0 ? "Pixel Party" : index % 3 === 1 ? "Color Crush" : "Pastel Quest"}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8">Join</Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">No friends online right now</p>
            <Button size="sm" variant="link" className="mt-2" onClick={() => window.location.href = '/friends'}>
              Add Friends
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickJoin;
