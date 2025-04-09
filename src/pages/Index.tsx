
import React from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import GameCard from '@/components/GameCard';
import FeaturedGame from '@/components/FeaturedGame';
import QuickJoin from '@/components/QuickJoin';
import MobileNav from '@/components/MobileNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex flex-1">
        <Sidebar />
        
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Featured Game Banner */}
            <FeaturedGame />
            
            {/* Game Categories */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-3/4 space-y-6">
                <Tabs defaultValue="popular" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Games</h2>
                    <TabsList>
                      <TabsTrigger value="popular">Popular</TabsTrigger>
                      <TabsTrigger value="new">New</TabsTrigger>
                      <TabsTrigger value="friends">With Friends</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="popular" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-in">
                      <GameCard 
                        title="Single Player" 
                        playerCount="148 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-mint"
                      />
                      <GameCard 
                        title="Duo Battle" 
                        playerCount="92 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-blue"
                      />
                      <GameCard 
                        title="Multiplayer" 
                        playerCount="56 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-lavender"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="new" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <GameCard 
                        title="Single Player" 
                        playerCount="NEW! 24 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-blue"
                      />
                      <GameCard 
                        title="Duo Battle" 
                        playerCount="NEW! 18 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-lavender"
                      />
                      <GameCard 
                        title="Multiplayer" 
                        playerCount="NEW! 36 playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-pink"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="friends" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <GameCard 
                        title="Duo Battle" 
                        playerCount="Jane + 2 friends"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-mint"
                      />
                      <GameCard 
                        title="Multiplayer" 
                        playerCount="Max playing"
                        image="/placeholder.svg"
                        category="Minesweeper"
                        backgroundColor="bg-pastel-blue"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="md:w-1/4">
                <QuickJoin />
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
};

export default Index;
