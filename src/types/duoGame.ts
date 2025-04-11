// Types for Duo Game functionality

export type GameStatus = 'waiting' | 'ready' | 'countdown' | 'playing' | 'round_complete' | 'game_complete' | 'completed';

export type GameData = {
  id: number;
  game_id: string;
  creator_id: string;
  opponent_id: string | null;
  status: GameStatus;
  current_round: number;
  total_rounds: number;
  creator_score: number;
  opponent_score: number;
  current_board_seed: number | null;
  difficulty: string;
  custom_width?: number;
  custom_height?: number;
  custom_mines?: number;
  timer_enabled?: boolean;
  created_at: string;
  updated_at: string;
};

export type PlayerProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type Player = {
  id: string;
  username: string;
  avatarUrl: string | null;
  isHost: boolean;
  isReady: boolean;
};

export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'custom';
  totalRounds: number;
  customWidth?: number;
  customHeight?: number;
  customMines?: number;
  // timerEnabled: boolean;
}

export interface GameDimensions {
  width: number;
  height: number;
  mines: number;
}

export interface PlayerProgress {
  userId: string;
  username: string;
  percentRevealed: number;
  timeElapsed: number;
  status: 'waiting' | 'playing' | 'won' | 'lost';
}

export interface DuoGameState {
  currentRound: number;
  gameStatus: GameStatus;
  playerProgress: PlayerProgress[];
  dimensions: GameDimensions;
  winnerId?: string;
}
