
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

const FeaturedGame = () => {
  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-vibrant-purple/80 to-vibrant-pink/80 mix-blend-multiply" />
      <div className="relative z-10 p-6 md:p-10 flex flex-col h-full">
        <div className="space-y-2">
          <Badge className="bg-white/20 hover:bg-white/25 backdrop-blur-sm text-white">Featured Game</Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Pixel Paradise</h2>
          <p className="text-white/90 max-w-md">Join an epic multiplayer adventure in a colorful pixel world. Build, explore, and compete with friends!</p>
        </div>
        
        <div className="mt-6 flex items-center gap-4">
          <Button className="bg-white text-vibrant-purple hover:bg-white/90">
            Play Now
          </Button>
          <div className="flex items-center text-white">
            <Users className="h-5 w-5 mr-1.5" />
            <span>324 players online</span>
          </div>
        </div>
      </div>

      {/* Decorative pixel art background */}
      <div className="absolute right-0 bottom-0 w-1/3 h-1/2 opacity-20 md:opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==')]"></div>
    </div>
  );
};

export default FeaturedGame;
