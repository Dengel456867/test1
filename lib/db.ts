import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

let db: sqlite3.Database | null = null;

function getDB() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'game.db');
    
    // CrÃ©er le dossier data s'il n'existe pas
    if (!fs.existsSync(path.dirname(dbPath))) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    
    db = new sqlite3.Database(dbPath);
  }
  return db;
}

// Promisify les mÃ©thodes
function dbRun(sql: string, params?: any[]) {
  return promisify(getDB().run.bind(getDB()))(sql, params);
}

function dbGet(sql: string, params?: any[]) {
  return promisify(getDB().get.bind(getDB()))(sql, params);
}

function dbAll(sql: string, params?: any[]) {
  return promisify(getDB().all.bind(getDB()))(sql, params);
}

// Initialiser la base de donnÃ©es
export async function initDB() {
  // Table des utilisateurs
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des parties
  await dbRun(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      won BOOLEAN NOT NULL,
      turns INTEGER NOT NULL,
      movements INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Table des statistiques utilisateur
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      victories INTEGER DEFAULT 0,
      defeats INTEGER DEFAULT 0,
      total_games INTEGER DEFAULT 0,
      total_turns INTEGER DEFAULT 0,
      total_movements INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

// Fonctions utilisateurs
export async function createUser(username: string, passwordHash: string) {
  await dbRun(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, passwordHash]
  );
  const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]) as any;
  await dbRun(
    'INSERT INTO user_stats (user_id) VALUES (?)',
    [user.id]
  );
  return user;
}

export async function getUserByUsername(username: string) {
  return await dbGet('SELECT * FROM users WHERE username = ?', [username]) as any;
}

export async function getUserById(id: number) {
  return await dbGet('SELECT * FROM users WHERE id = ?', [id]) as any;
}

// Fonctions parties
export async function createGame(userId: number, won: boolean, turns: number, movements: number) {
  await dbRun(
    'INSERT INTO games (user_id, won, turns, movements) VALUES (?, ?, ?, ?)',
    [userId, won ? 1 : 0, turns, movements]
  );
  
  // Mettre Ã  jour les statistiques
  const stats = await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]) as any;
  if (stats) {
    await dbRun(
      `UPDATE user_stats 
       SET victories = victories + ?, 
           defeats = defeats + ?,
           total_games = total_games + 1,
           total_turns = total_turns + ?,
           total_movements = total_movements + ?
       WHERE user_id = ?`,
      [won ? 1 : 0, won ? 0 : 1, turns, movements, userId]
    );
  }
}

export async function getLastGames(userId: number, limit: number = 10) {
  return await dbAll(
    'SELECT * FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  ) as any[];
}

export async function getUserStats(userId: number) {
  return await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]) as any;
}

export { getDB };

