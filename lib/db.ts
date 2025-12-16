// Base de donnÃ©es en mÃ©moire (compatible Vercel serverless)
// Note: Les donnÃ©es sont perdues entre les redÃ©marrages du serveur
// Pour une vraie persistance, utilisez Vercel KV, Postgres, ou un service externe

interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
}

interface Game {
  id: number;
  user_id: number;
  won: boolean;
  turns: number;
  movements: number;
  created_at: Date;
}

interface UserStats {
  user_id: number;
  victories: number;
  defeats: number;
  total_games: number;
  total_turns: number;
  total_movements: number;
}

// Stockage en mÃ©moire
const users: Map<number, User> = new Map();
const games: Map<number, Game> = new Map();
const userStats: Map<number, UserStats> = new Map();
let userIdCounter = 1;
let gameIdCounter = 1;

// Initialiser la base de donnÃ©es (no-op pour in-memory)
export async function initDB() {
  // Rien Ã  faire pour le stockage en mÃ©moire
}

// Fonctions utilisateurs
export async function createUser(username: string, passwordHash: string) {
  // VÃ©rifier si l'utilisateur existe
  const existingUsers = Array.from(users.values());
  for (const user of existingUsers) {
    if (user.username === username) {
      throw new Error('Username already exists');
    }
  }
  
  const user: User = {
    id: userIdCounter++,
    username,
    password_hash: passwordHash,
    created_at: new Date(),
  };
  
  users.set(user.id, user);
  
  // CrÃ©er les stats initiales
  userStats.set(user.id, {
    user_id: user.id,
    victories: 0,
    defeats: 0,
    total_games: 0,
    total_turns: 0,
    total_movements: 0,
  });
  
  return user;
}

export async function getUserByUsername(username: string) {
  const allUsers = Array.from(users.values());
  return allUsers.find(u => u.username === username) || null;
}

export async function getUserById(id: number) {
  return users.get(id) || null;
}

// Fonctions parties
export async function createGame(userId: number, won: boolean, turns: number, movements: number) {
  const game: Game = {
    id: gameIdCounter++,
    user_id: userId,
    won,
    turns,
    movements,
    created_at: new Date(),
  };
  
  games.set(game.id, game);
  
  // Mettre Ã  jour les statistiques
  const stats = userStats.get(userId);
  if (stats) {
    stats.victories += won ? 1 : 0;
    stats.defeats += won ? 0 : 1;
    stats.total_games += 1;
    stats.total_turns += turns;
    stats.total_movements += movements;
  }
}

export async function getLastGames(userId: number, limit: number = 10) {
  const userGames = Array.from(games.values())
    .filter(g => g.user_id === userId)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit);
  
  return userGames;
}

export async function getUserStats(userId: number) {
  return userStats.get(userId) || null;
}

// Export pour compatibilitÃ©
export function getDB() {
  return null; // Plus de SQLite
}
