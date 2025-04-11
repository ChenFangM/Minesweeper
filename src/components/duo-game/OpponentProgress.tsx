import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { PlayerProgress } from '../../hooks/useDuoGameState';
import { Clock, User } from 'lucide-react';

interface OpponentProgressProps {
  opponent: PlayerProgress | null;
  isRoundActive: boolean;
}

/**
 * Component to display the opponent's progress during a round
 */
const OpponentProgress: React.FC<OpponentProgressProps> = ({
  opponent,
  isRoundActive
}) => {
  if (!opponent) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Opponent</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No opponent information available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-4 w-4" />
          {opponent.username || 'Opponent'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-mono">{Math.floor(opponent.percentRevealed * 100)}%</span>
          </div>
          <Progress value={opponent.percentRevealed * 100} className="h-2" />
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Time:</span>
          <span className="font-mono">{opponent.timeElapsed}s</span>
        </div>
        
        <div className="text-sm">
          Status: 
          <span className={`ml-2 font-medium ${
            opponent.status === 'won' 
              ? 'text-green-600' 
              : opponent.status === 'lost' 
                ? 'text-red-600' 
                : opponent.status === 'playing' 
                  ? 'text-blue-600'
                  : ''
          }`}>
            {opponent.status === 'waiting' 
              ? 'Waiting' 
              : opponent.status === 'playing' 
                ? 'Playing' 
                : opponent.status === 'won' 
                  ? 'Completed Successfully' 
                  : opponent.status === 'lost' 
                    ? 'Hit a Mine' 
                    : 'Unknown'}
          </span>
        </div>
        
        {!isRoundActive && opponent.status !== 'waiting' && (
          <div className={`text-sm font-medium ${
            opponent.status === 'won' ? 'text-green-600' : 'text-red-600'
          }`}>
            {opponent.status === 'won' 
              ? `Cleared ${Math.floor(opponent.percentRevealed * 100)}% in ${opponent.timeElapsed}s` 
              : `Hit a mine after clearing ${Math.floor(opponent.percentRevealed * 100)}%`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OpponentProgress;
