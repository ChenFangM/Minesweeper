import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Tutorial from "./pages/Tutorial";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Friends from "./pages/Friends";
import SinglePlayer from "./pages/SinglePlayer";
import DuoGame from "./pages/DuoGame";
import DuoGameRoom from "./pages/DuoGameRoom";
import DuoGameBoard from "./pages/DuoGameBoard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  // Add error handling
  try {
    if (loading) {
      return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }
    
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    return <>{children}</>;
  } catch (error) {
    console.error('Error in ProtectedRoute:', error);
    // Fallback to login if there's an error
    return <Navigate to="/login" />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/game" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/friends" element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            } />
            <Route path="/game/single-player" element={
              <ProtectedRoute>
                <SinglePlayer />
              </ProtectedRoute>
            } />
            <Route path="/game/duo" element={
              <ProtectedRoute>
                <DuoGame />
              </ProtectedRoute>
            } />
            <Route path="/duo/:gameId" element={
              <ProtectedRoute>
                <DuoGameRoom />
              </ProtectedRoute>
            } />
            <Route path="/duo-board/:gameId" element={
              <ProtectedRoute>
                <DuoGameBoard />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
