import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Gamepad2, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type GameSettings = {
  difficulty: 'easy' | 'medium' | 'hard' | 'custom';
  totalRounds: number;
  customWidth?: number;
  customHeight?: number;
  customMines?: number;
  // Timer is always enabled
};

type GameConfigProps = {
  gameId: string;
  userId: string;
  onSettingsUpdated: (settings: GameSettings) => void;
  initialSettings?: Partial<GameSettings>;
  canEdit: boolean;
};

const defaultSettings: GameSettings = {
  difficulty: 'medium',
  totalRounds: 3,
  // Timer is always enabled
};

const difficultyPresets = {
  easy: { width: 9, height: 9, mines: 10 },
  medium: { width: 16, height: 16, mines: 40 },
  hard: { width: 30, height: 16, mines: 99 },
};

const GameConfig: React.FC<GameConfigProps> = ({
  gameId,
  userId,
  onSettingsUpdated,
  initialSettings,
  canEdit
}) => {
  const [settings, setSettings] = useState<GameSettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom board settings
  const [customWidth, setCustomWidth] = useState(initialSettings?.customWidth || 16);
  const [customHeight, setCustomHeight] = useState(initialSettings?.customHeight || 16);
  const [customMines, setCustomMines] = useState(initialSettings?.customMines || 40);

  const handleDifficultyChange = (difficulty: 'easy' | 'medium' | 'hard' | 'custom') => {
    setSettings({ ...settings, difficulty });
  };

  const handleRoundsChange = (value: number[]) => {
    setSettings({ ...settings, totalRounds: value[0] });
  };

  // Timer is always enabled, no need for toggle function

  const handleCustomWidthChange = (value: number[]) => {
    const width = value[0];
    setCustomWidth(width);
    
    // Adjust mines if needed
    const maxMines = Math.floor(width * customHeight * 0.35);
    const adjustedMines = customMines > maxMines ? maxMines : customMines;
    setCustomMines(adjustedMines);
    
    setSettings({
      ...settings,
      customWidth: width,
      customMines: adjustedMines,
    });
  };

  const handleCustomHeightChange = (value: number[]) => {
    const height = value[0];
    setCustomHeight(height);
    
    // Adjust mines if needed
    const maxMines = Math.floor(customWidth * height * 0.35);
    const adjustedMines = customMines > maxMines ? maxMines : customMines;
    setCustomMines(adjustedMines);
    
    setSettings({
      ...settings,
      customHeight: height,
      customMines: adjustedMines,
    });
  };

  const handleCustomMinesChange = (value: number[]) => {
    setCustomMines(value[0]);
    setSettings({ ...settings, customMines: value[0] });
  };

  const getMaxMines = () => {
    if (settings.difficulty === 'custom') {
      return Math.floor(customWidth * customHeight * 0.35); // Max 35% of cells can be mines
    }
    return 0;
  };

  const saveSettings = async () => {
    if (!canEdit) return;
    
    setSaving(true);
    setError(null);
    
    try {
      console.log('Saving game settings:', settings);
      
      // Based on the database schema, we can only update these columns directly
      const gameSettings: Record<string, any> = {
        difficulty: settings.difficulty,
        total_rounds: settings.totalRounds,
        updated_at: new Date().toISOString()
      };
      
      // Update the game settings in the database
      const { error } = await supabase
        .from('duo_games')
        .update(gameSettings)
        .eq('game_id', gameId);
      
      if (error) {
        console.error('Error updating game settings in database:', error);
        throw error;
      }
      
      console.log('Successfully saved game settings to database');
      
      // Store additional settings in localStorage for this game
      // This is a workaround since we don't have columns for these settings in the database
      const additionalSettings = {
        // Timer is always enabled
        customWidth: settings.difficulty === 'custom' ? settings.customWidth : undefined,
        customHeight: settings.difficulty === 'custom' ? settings.customHeight : undefined,
        customMines: settings.difficulty === 'custom' ? settings.customMines : undefined
      };
      
      // Store in localStorage with game ID as part of the key
      localStorage.setItem(`game_settings_${gameId}`, JSON.stringify(additionalSettings));
      console.log('Saved additional settings to localStorage');
      
      // Broadcast settings change to other components via a custom event
      const settingsEvent = new CustomEvent('game-settings-updated', {
        detail: {
          gameId,
          settings: {
            ...gameSettings,
            ...additionalSettings
          }
        }
      });
      window.dispatchEvent(settingsEvent);
      
      // Notify parent component
      onSettingsUpdated(settings);
    } catch (err: any) {
      console.error('Error saving game settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-vibrant-purple" />
          Game Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Difficulty Selection */}
        <div className="space-y-3">
          <Label>Difficulty</Label>
          <RadioGroup
            value={settings.difficulty}
            onValueChange={(value) => 
              handleDifficultyChange(value as 'easy' | 'medium' | 'hard' | 'custom')
            }
            className="grid grid-cols-2 gap-2"
            disabled={!canEdit}
          >
            <div className={`flex items-center space-x-2 rounded-md border p-3 
              ${settings.difficulty === 'easy' ? 'border-vibrant-purple bg-purple-50' : 'border-gray-200'}`}>
              <RadioGroupItem value="easy" id="easy" />
              <Label htmlFor="easy" className="flex-1 cursor-pointer">Easy</Label>
            </div>
            <div className={`flex items-center space-x-2 rounded-md border p-3 
              ${settings.difficulty === 'medium' ? 'border-vibrant-purple bg-purple-50' : 'border-gray-200'}`}>
              <RadioGroupItem value="medium" id="medium" />
              <Label htmlFor="medium" className="flex-1 cursor-pointer">Medium</Label>
            </div>
            <div className={`flex items-center space-x-2 rounded-md border p-3 
              ${settings.difficulty === 'hard' ? 'border-vibrant-purple bg-purple-50' : 'border-gray-200'}`}>
              <RadioGroupItem value="hard" id="hard" />
              <Label htmlFor="hard" className="flex-1 cursor-pointer">Hard</Label>
            </div>
            <div className={`flex items-center space-x-2 rounded-md border p-3 
              ${settings.difficulty === 'custom' ? 'border-vibrant-purple bg-purple-50' : 'border-gray-200'}`}>
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="flex-1 cursor-pointer">Custom</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Custom Board Settings (only shown if custom difficulty is selected) */}
        {settings.difficulty === 'custom' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-md">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Width: {customWidth}</Label>
                <span className="text-sm text-muted-foreground">8-30</span>
              </div>
              <Slider
                value={[customWidth]}
                min={8}
                max={30}
                step={1}
                onValueChange={handleCustomWidthChange}
                disabled={!canEdit}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Height: {customHeight}</Label>
                <span className="text-sm text-muted-foreground">8-24</span>
              </div>
              <Slider
                value={[customHeight]}
                min={8}
                max={24}
                step={1}
                onValueChange={handleCustomHeightChange}
                disabled={!canEdit}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Mines: {customMines}</Label>
                <span className="text-sm text-muted-foreground">
                  10-{getMaxMines()}
                </span>
              </div>
              <Slider
                value={[customMines]}
                min={10}
                max={getMaxMines()}
                step={1}
                onValueChange={handleCustomMinesChange}
                disabled={!canEdit}
              />
            </div>
          </div>
        )}

        {/* Number of Rounds */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Number of Rounds: {settings.totalRounds}</Label>
            <span className="text-sm text-muted-foreground">1-5</span>
          </div>
          <Slider
            value={[settings.totalRounds]}
            min={1}
            max={5}
            step={1}
            onValueChange={handleRoundsChange}
            disabled={!canEdit}
          />
        </div>

        {/* Timer is always enabled */}

        {/* Difficulty Info */}
        <div className="p-3 bg-gray-50 rounded-md text-sm">
          {settings.difficulty === 'easy' && (
            <p>Easy: 9×9 grid with 10 mines. Perfect for beginners.</p>
          )}
          {settings.difficulty === 'medium' && (
            <p>Medium: 16×16 grid with 40 mines. A balanced challenge.</p>
          )}
          {settings.difficulty === 'hard' && (
            <p>Hard: 30×16 grid with 99 mines. For experienced players.</p>
          )}
          {settings.difficulty === 'custom' && (
            <p>Custom: {customWidth}×{customHeight} grid with {customMines} mines.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {canEdit && (
          <Button 
            className="w-full"
            onClick={saveSettings}
            disabled={saving || !canEdit}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardFooter>
    </Card>
  );
};

export default GameConfig;
