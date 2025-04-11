import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

const DuoGameRoom = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Basic state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize game
    if (gameId && user) {
      console.log('Initializing duo game with ID:', gameId);
      setLoading(false);
    }
  }, [gameId, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-full">
              <p>Loading game...</p>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-full">
              <p className="text-red-500">Error: {error}</p>
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Duo Game Room</h1>
            <p>Game ID: {gameId}</p>
            <p>This is a placeholder for the new duo game implementation.</p>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => navigate('/menu')}
            >
              Back to Menu
            </button>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default DuoGameRoom;