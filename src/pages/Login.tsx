import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
      } else {
        navigate('/game');
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
                Minesweeps
              </span>
            </CardTitle>
            <CardDescription className="text-base">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-4">
            <form onSubmit={handleLogin}>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-base">Password</Label>
                    <Link to="/forgot-password" className="text-sm font-medium text-vibrant-purple hover:underline">
                      Forgot password?
                    </Link>
                  </div>
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
                <Button 
                  type="submit" 
                  className="w-full bg-vibrant-purple hover:bg-vibrant-purple/90 h-11 text-base mt-2"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 px-6 py-6">
            <div className="text-center text-base">
              Don't have an account?{' '}
              <Link to="/signup" className="text-vibrant-purple hover:underline font-medium">
                Sign up
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

export default Login;
