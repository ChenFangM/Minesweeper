
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type GameCardProps = {
  title: string;
  playerCount: string;
  image: string;
  category: string;
  backgroundColor: string;
  className?: string;
  onClick?: () => void;
};

const GameCard = ({ 
  title, 
  playerCount, 
  image, 
  category,
  backgroundColor,
  className,
  onClick
}: GameCardProps) => {
  return (
    <Card className={cn("border-none overflow-hidden game-card", className)}>
      <div 
        className={cn("relative h-40 flex items-center justify-center p-4", backgroundColor)}
      >
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==')]"></div>
        <img 
          src={image} 
          alt={title} 
          className="h-24 w-24 object-contain filter drop-shadow-md animate-float" 
        />
        <Badge className="absolute top-3 right-3 bg-white/90 text-foreground hover:bg-white/80">
          {category}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="flex items-center mt-1 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5 mr-1" />
          <span>{playerCount}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full bg-vibrant-purple hover:bg-vibrant-purple/90"
          onClick={onClick}
        >
          Play Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GameCard;
