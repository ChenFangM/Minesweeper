import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { GameSettings as GameSettingsType } from './GameConfig';

type GameSettingsProps = {
  settings: GameSettingsType;
};

const GameSettings: React.FC<GameSettingsProps> = ({ settings }) => {
  const getDifficultyLabel = () => {
    switch (settings.difficulty) {
      case 'easy': return 'Easy (9×9, 10 mines)';
      case 'medium': return 'Medium (16×16, 40 mines)';
      case 'hard': return 'Hard (30×16, 99 mines)';
      case 'custom': {
        // Use default values if custom dimensions are undefined
        const width = settings.customWidth || 16;
        const height = settings.customHeight || 16;
        const mines = settings.customMines || 40;
        return `Custom (${width}×${height}, ${mines} mines)`;
      }
      default: return 'Medium';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-vibrant-purple" />
          Game Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Difficulty */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Difficulty:</p>
            <Badge className="text-sm" variant="outline">
              {getDifficultyLabel()}
            </Badge>
          </div>
          
          {/* Rounds */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Number of Rounds:</p>
            <Badge className="text-sm" variant="outline">
              {settings.totalRounds} {settings.totalRounds === 1 ? 'Round' : 'Rounds'}
            </Badge>
          </div>
          
          {/* Timer */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Timer:</p>
            <Badge className="text-sm" variant="outline">
              {settings.timerEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          
          {/* Custom Settings (if applicable) */}
          {settings.difficulty === 'custom' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Custom Board:</p>
              <div className="space-y-1">
                <p className="text-sm">Width: {settings.customWidth || 16}</p>
                <p className="text-sm">Height: {settings.customHeight || 16}</p>
                <p className="text-sm">Mines: {settings.customMines || 40}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Game Info */}
        <div className="p-3 bg-gray-50 rounded-md text-sm">
          <p className="font-medium mb-1">How to Play:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Both players get identical minefields</li>
            <li>Race to clear your board faster than your opponent</li>
            <li>If you hit a mine, you lose the round</li>
            <li>The player with the most round wins at the end wins the game</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameSettings;
