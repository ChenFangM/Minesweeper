import React from 'react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { Link } from 'react-router-dom';

const Tutorial = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">How to Play Minesweeps</h1>
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Game Rules</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Basic Rules</h3>
                <p className="text-gray-700">
                  Minesweeper is a logic puzzle game where your goal is to clear a board containing hidden "mines" without detonating any of them, with help from clues about the number of neighboring mines in each field.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-pastel-mint/20 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Left Click</h4>
                  <p className="text-gray-700">Reveals a square. If you reveal a mine, you lose the game!</p>
                </div>
                
                <div className="bg-pastel-blue/20 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Right Click</h4>
                  <p className="text-gray-700">Places a flag on a square you suspect contains a mine.</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Numbers</h3>
                <p className="text-gray-700 mb-4">
                  When you reveal a square, a number may appear. This number indicates how many mines are adjacent to that square (including diagonally).
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center justify-center h-16 w-16 bg-gray-100 rounded-lg text-blue-600 text-2xl font-bold">1</div>
                  <div className="flex items-center justify-center h-16 w-16 bg-gray-100 rounded-lg text-green-600 text-2xl font-bold">2</div>
                  <div className="flex items-center justify-center h-16 w-16 bg-gray-100 rounded-lg text-red-600 text-2xl font-bold">3</div>
                  <div className="flex items-center justify-center h-16 w-16 bg-gray-100 rounded-lg text-purple-800 text-2xl font-bold">4</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Game Modes</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Single Player</h3>
                <p className="text-gray-700">
                  Classic minesweeper gameplay. Clear the board as quickly as possible without detonating any mines. Choose from different difficulty levels.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Duo Battle</h3>
                <p className="text-gray-700">
                  Compete head-to-head with another player on identical boards. The first player to clear their board wins!
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Multiplayer</h3>
                <p className="text-gray-700">
                  Join a room with multiple players and compete to see who can clear the most squares without hitting a mine. The player with the highest score wins!
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="bg-vibrant-purple hover:bg-vibrant-purple/90 text-white"
              asChild
            >
              <Link to="/game">Start Playing Now</Link>
            </Button>
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
};

export default Tutorial;
