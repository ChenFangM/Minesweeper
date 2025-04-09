import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { supabase } from '@/lib/supabase';

type ProfileData = {
  username: string;
  full_name: string;
  avatar_url: string | null;
};

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    full_name: '',
    avatar_url: null
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    async function loadProfile() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfile({
            username: data.username || '',
            full_name: data.full_name || '',
            avatar_url: data.avatar_url
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // First check if username already exists (but isn't the current user's username)
    try {
      // Validate username
      if (!profile.username.trim()) {
        setMessage({ type: 'error', text: 'Username cannot be empty' });
        setLoading(false);
        return;
      }

      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', profile.username)
        .neq('id', user?.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error checking username:', checkError);
      }

      if (existingUser) {
        setMessage({ 
          type: 'error', 
          text: 'This username is already taken. Please choose a different one.' 
        });
        setLoading(false);
        return;
      }

      // If username is available, update profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          username: profile.username,
          full_name: profile.full_name,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        // Handle specific error cases
        if (error.code === '23505') { // Unique constraint violation
          setMessage({ 
            type: 'error', 
            text: 'This username is already taken. Please choose a different one.' 
          });
        } else {
          setMessage({ type: 'error', text: 'Error updating profile: ' + error.message });
        }
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred. Please try again later.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile.full_name) {
      return profile.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Your Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                <Avatar className="h-32 w-32">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.username || user?.email || 'User'} />
                  ) : null}
                  <AvatarFallback className="text-3xl bg-pastel-lavender text-vibrant-purple">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" className="w-full">
                  Upload Picture
                </Button>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile}>
                  {message && (
                    <Alert 
                      variant={message.type === 'error' ? 'destructive' : 'default'} 
                      className={message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 mb-4' : 'mb-4'}
                    >
                      <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email"
                        type="email" 
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-sm text-muted-foreground">
                        Your email cannot be changed
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username"
                        value={profile.username}
                        onChange={(e) => setProfile({...profile, username: e.target.value})}
                        placeholder="Choose a username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName"
                        value={profile.full_name}
                        onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                        placeholder="Your full name"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-vibrant-purple hover:bg-vibrant-purple/90"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Game Statistics</CardTitle>
                <CardDescription>Your performance in Minesweeps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-vibrant-purple">0</div>
                    <div className="text-sm text-gray-500">Games Played</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-vibrant-purple">0</div>
                    <div className="text-sm text-gray-500">Games Won</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-vibrant-purple">0%</div>
                    <div className="text-sm text-gray-500">Win Rate</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-vibrant-purple">0</div>
                    <div className="text-sm text-gray-500">Best Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
};

export default Profile;
