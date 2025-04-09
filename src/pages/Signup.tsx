import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);

    try {
      const { error, data } = await signUp(email, password);
      
      if (error) {
        setError(error.message);
      } else {
        if (data?.user?.identities?.length === 0) {
          setError('This email is already registered');
        } else {
          setSuccess(true);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[480px]"
      >
        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-2 text-center py-6">
            <CardTitle className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-vibrant-purple to-vibrant-pink bg-clip-text text-transparent">
                Join Minesweeps
              </span>
            </CardTitle>
            <CardDescription className="text-base">
              Create an account to start playing
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-4">
            {success ? (
              <div className="space-y-5 text-center">
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>
                    Registration successful! Please check your email to confirm your account.
                  </AlertDescription>
                </Alert>
                <Button 
                  className="bg-vibrant-purple hover:bg-vibrant-purple/90 h-11 text-base"
                  onClick={() => navigate('/login')}
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignup}>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-base">Email</Label>
                    <Input 
                      id="email"
                      type="email" 
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-base">Password</Label>
                    <Input 
                      id="password"
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="confirmPassword" className="text-base">Confirm Password</Label>
                    <Input 
                      id="confirmPassword"
                      type="password" 
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-11 text-base"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-vibrant-purple hover:bg-vibrant-purple/90 h-11 text-base mt-2"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 px-6 py-6">
            <div className="text-center text-base">
              Already have an account?{' '}
              <Link to="/login" className="text-vibrant-purple hover:underline font-medium">
                Sign in
              </Link>
            </div>
            <Button 
              variant="outline" 
              className="w-full h-11 text-base"
              onClick={() => navigate('/')}
            >
              Back to Welcome Page
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;
