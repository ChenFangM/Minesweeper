import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, UserCheck, Clock, X, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

type FriendProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_friend: boolean;
  request_sent: boolean;
  request_received: boolean;
};

type FriendRequest = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  profile: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

const Friends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // Load friends and pending requests
  useEffect(() => {
    if (!user) return;
    
    const loadFriends = async () => {
      setIsLoading(true);
      try {
        // Get accepted friends
        const { data: friendsData, error: friendsError } = await supabase
          .from('friends')
          .select('friend_id, profiles:friend_id(id, username, full_name, avatar_url)')
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (friendsError) throw friendsError;

        // Get pending friend requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('friends')
          .select('id, user_id, friend_id, status, created_at, profile:user_id(username, full_name, avatar_url)')
          .eq('friend_id', user.id)
          .eq('status', 'pending');

        if (requestsError) throw requestsError;

        // Format friends data
        const formattedFriends = friendsData.map((friend: any) => ({
          id: friend.friend_id,
          username: friend.profiles.username,
          full_name: friend.profiles.full_name,
          avatar_url: friend.profiles.avatar_url,
          is_friend: true,
          request_sent: false,
          request_received: false
        }));

        setFriends(formattedFriends);
        
        // Format request data to match our FriendRequest type
        const formattedRequests = requestsData.map((request: any) => ({
          id: request.id,
          user_id: request.user_id,
          friend_id: request.friend_id,
          status: request.status,
          created_at: request.created_at,
          profile: request.profile
        }));
        
        setPendingRequests(formattedRequests);
      } catch (error) {
        console.error('Error loading friends:', error);
        toast({
          title: 'Error',
          description: 'Failed to load friends. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFriends();
  }, [user, toast]);

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setIsSearching(true);
    setHasSearched(true); // Mark that a search has been performed
    
    try {
      const { data, error } = await supabase
        .from('friend_search')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data as FriendProfile[]);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to search users. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;

      // Update UI
      setSearchResults(prev => 
        prev.map(result => 
          result.id === friendId 
            ? { ...result, request_sent: true } 
            : result
        )
      );

      toast({
        title: 'Success',
        description: 'Friend request sent successfully!',
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send friend request. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle friend request response
  const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ 
          status: accept ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Update UI
      if (accept) {
        const acceptedRequest = pendingRequests.find(req => req.id === requestId);
        if (acceptedRequest) {
          setFriends(prev => [...prev, {
            id: acceptedRequest.user_id,
            username: acceptedRequest.profile.username,
            full_name: acceptedRequest.profile.full_name,
            avatar_url: acceptedRequest.profile.avatar_url,
            is_friend: true,
            request_sent: false,
            request_received: false
          }]);
        }
      }
      
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));

      toast({
        title: 'Success',
        description: accept 
          ? 'Friend request accepted!' 
          : 'Friend request rejected.',
      });
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast({
        title: 'Error',
        description: 'Failed to respond to friend request. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex flex-1">
        <Sidebar activePage="friends" />
        
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Friends</h1>
                <p className="text-muted-foreground">Connect with other players</p>
              </div>
              
              <div className="flex w-full md:w-auto gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or name..."
                    className="pl-9 h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
            
            {searchQuery && searchResults.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-4">Search Results</h2>
                  <div className="space-y-4">
                    {searchResults.map((result) => (
                      <div 
                        key={result.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {result.avatar_url ? (
                              <AvatarImage src={result.avatar_url} alt={result.username} />
                            ) : null}
                            <AvatarFallback className="bg-pastel-lavender text-vibrant-purple">
                              {getInitials(result.full_name || result.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{result.full_name || result.username}</div>
                            {result.full_name && (
                              <div className="text-sm text-muted-foreground">@{result.username}</div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          {result.is_friend ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Friends
                            </Badge>
                          ) : result.request_sent ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Request Sent
                            </Badge>
                          ) : result.request_received ? (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 px-2 border-green-500 text-green-600 hover:bg-green-50"
                                onClick={() => {
                                  // Find the request ID
                                  const request = pendingRequests.find(req => req.user_id === result.id);
                                  if (request) {
                                    respondToFriendRequest(request.id, true);
                                  }
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 px-2 border-red-500 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  // Find the request ID
                                  const request = pendingRequests.find(req => req.user_id === result.id);
                                  if (request) {
                                    respondToFriendRequest(request.id, false);
                                  }
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8"
                              onClick={() => sendFriendRequest(result.id)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add Friend
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {searchQuery && searchResults.length === 0 && !isSearching && hasSearched && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
                </CardContent>
              </Card>
            )}
            
            <Tabs defaultValue="friends" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="friends">
                  My Friends
                  {friends.length > 0 && (
                    <Badge className="ml-2 bg-pastel-lavender text-vibrant-purple">{friends.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="requests">
                  Friend Requests
                  {pendingRequests.length > 0 && (
                    <Badge className="ml-2 bg-pastel-lavender text-vibrant-purple">{pendingRequests.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="friends" className="mt-0">
                {isLoading ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">Loading friends...</p>
                    </CardContent>
                  </Card>
                ) : friends.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friends.map((friend) => (
                      <Card key={friend.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            {friend.avatar_url ? (
                              <AvatarImage src={friend.avatar_url} alt={friend.username} />
                            ) : null}
                            <AvatarFallback className="bg-pastel-lavender text-vibrant-purple text-lg">
                              {getInitials(friend.full_name || friend.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">{friend.full_name || friend.username}</div>
                            {friend.full_name && (
                              <div className="text-sm text-muted-foreground">@{friend.username}</div>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            Invite to Game
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">You don't have any friends yet. Search for users to add friends!</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="requests" className="mt-0">
                {isLoading ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">Loading friend requests...</p>
                    </CardContent>
                  </Card>
                ) : pendingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              {request.profile.avatar_url ? (
                                <AvatarImage src={request.profile.avatar_url} alt={request.profile.username} />
                              ) : null}
                              <AvatarFallback className="bg-pastel-lavender text-vibrant-purple text-lg">
                                {getInitials(request.profile.full_name || request.profile.username)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{request.profile.full_name || request.profile.username}</div>
                              {request.profile.full_name && (
                                <div className="text-sm text-muted-foreground">@{request.profile.username}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="border-green-500 text-green-600 hover:bg-green-50"
                              onClick={() => respondToFriendRequest(request.id, true)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button 
                              variant="outline" 
                              className="border-red-500 text-red-600 hover:bg-red-50"
                              onClick={() => respondToFriendRequest(request.id, false)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">You don't have any pending friend requests.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
};

export default Friends;
