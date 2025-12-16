// Gestion des statistiques de jeu

import { GameStats, UserStats } from '../types/game';

// Stockage en mémoire (en production, utiliser une vraie base de données)
const gameStats: Map<string, GameStats[]> = new Map();

export function saveGameStats(stats: GameStats): void {
  const userStats = gameStats.get(stats.userId) || [];
  userStats.push(stats);
  gameStats.set(stats.userId, userStats);
}

export function getUserStats(userId: string): UserStats | null {
  const allGames = gameStats.get(userId) || [];
  
  if (allGames.length === 0) {
    return null;
  }
  
  const wins = allGames.filter(g => g.won).length;
  const losses = allGames.length - wins;
  
  const wonGames = allGames.filter(g => g.won);
  const lostGames = allGames.filter(g => !g.won);
  
  const averageTurnsPerWin = wonGames.length > 0
    ? wonGames.reduce((sum, g) => sum + g.turns, 0) / wonGames.length
    : 0;
  
  const averageTurnsPerLoss = lostGames.length > 0
    ? lostGames.reduce((sum, g) => sum + g.turns, 0) / lostGames.length
    : 0;
  
  const averageMovesPerWin = wonGames.length > 0
    ? wonGames.reduce((sum, g) => sum + g.moves, 0) / wonGames.length
    : 0;
  
  const averageMovesPerLoss = lostGames.length > 0
    ? lostGames.reduce((sum, g) => sum + g.moves, 0) / lostGames.length
    : 0;
  
  const recentGames = allGames
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);
  
  return {
    userId,
    username: '', // Sera rempli depuis la session
    totalGames: allGames.length,
    wins,
    losses,
    averageTurnsPerWin: Math.round(averageTurnsPerWin * 10) / 10,
    averageTurnsPerLoss: Math.round(averageTurnsPerLoss * 10) / 10,
    averageMovesPerWin: Math.round(averageMovesPerWin * 10) / 10,
    averageMovesPerLoss: Math.round(averageMovesPerLoss * 10) / 10,
    recentGames,
  };
}

