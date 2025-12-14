// Types pour le jeu - réexportation de lib/game/types.ts
export * from '@/lib/game/types';

export interface GameStats {
  userId: string;
  gameId: string;
  won: boolean;
  turns: number;
  moves: number;
  duration: number;
  timestamp: Date;
}

export interface UserStats {
  userId: string;
  username: string;
  totalGames: number;
  wins: number;
  losses: number;
  averageTurnsPerWin: number;
  averageTurnsPerLoss: number;
  averageMovesPerWin: number;
  averageMovesPerLoss: number;
  recentGames: GameStats[];
}
