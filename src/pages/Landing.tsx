import React from 'react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 overflow-hidden">
        <div className="relative h-[calc(100vh-64px)]">
          {/* Background with gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70">
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==')]"></div>
          </div>
          
          {/* Main content */}
          <div className="relative z-10 container mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl"
            >
              {/* Minesweeper Logo/Image */}
              <div className="mb-8 flex justify-center">
                <img 
                  src="/minesweeper-logo.svg" 
                  alt="Minesweeps" 
                  className="h-60 w-60 object-contain filter drop-shadow-lg animate-float" 
                />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-vibrant-purple to-vibrant-pink bg-clip-text text-transparent">
                Welcome to Minesweeps
              </h1>
              
              <p className="text-xl md:text-2xl mb-8 text-white">
                The ultimate minesweeper experience with single player, duo battles, and multiplayer modes
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-vibrant-purple hover:bg-vibrant-purple/90 text-white text-lg px-8 py-6"
                  asChild
                >
                  <Link to="/game">Let's Explode!</Link>
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/80 bg-white/20 text-white hover:bg-white/30 hover:border-white text-lg px-8 py-6"
                  asChild
                >
                  <Link to="/tutorial">How to Play</Link>
                </Button>
              </div>
              
              
              <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-white/10 backdrop-blur-sm p-6 rounded-lg"
                >
                  <h3 className="text-xl font-bold text-white mb-2">Single Player</h3>
                  <p className="text-white/80">Challenge yourself with various difficulty levels and board sizes</p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-white/10 backdrop-blur-sm p-6 rounded-lg"
                >
                  <h3 className="text-xl font-bold text-white mb-2">Duo Battle</h3>
                  <p className="text-white/80">Compete head-to-head with a friend to see who can clear the board faster</p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="bg-white/10 backdrop-blur-sm p-6 rounded-lg"
                >
                  <h3 className="text-xl font-bold text-white mb-2">Multiplayer</h3>
                  <p className="text-white/80">Join rooms with multiple players for intense minesweeping action</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
};

export default Landing;
