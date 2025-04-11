
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeaturedGame = () => {
  const navigate = useNavigate();
  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-card">
      <div className="absolute inset-0 bg-vibrant-purple/10" />
      <div className="relative z-10 p-6 md:p-10 flex flex-col h-full">
        <div className="space-y-2">
          <Badge className="bg-vibrant-purple text-white hover:bg-vibrant-purple/90">Featured Game</Badge>
          <h2 className="text-2xl md:text-3xl font-bold">Duo Battle</h2>
          <p className="text-muted-foreground">Join an epic multiplayer battle!</p>
          <p className="text-muted-foreground">Don't miss out on our favorite activity: breaking up a friendship.</p>
        </div>
        
        <div className="mt-6 flex items-center gap-4">
          <Button className="bg-vibrant-purple hover:bg-vibrant-purple/90 text-white" onClick={() => navigate('/game/duo')}>
            Play Now
          </Button>
          <div className="flex items-center text-muted-foreground">
            <Users className="h-5 w-5 mr-1.5" />
            <span>2 players per game</span>
          </div>
        </div>
      </div>

      {/* Decorative pixel art background - more subtle */}
      <div className="absolute right-0 bottom-0 w-1/4 h-1/3 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==')]"></div>
    </div>
  );
};

export default FeaturedGame;
