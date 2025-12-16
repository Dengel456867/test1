// Système d'authentification simple

import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

// En production, utiliser une vraie base de données
// Pour l'instant, on utilise un stockage en mémoire
const users: Map<string, User> = new Map();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(username: string, password: string): Promise<User> {
  // Vérifier si l'utilisateur existe déjà
  const existingUsers = Array.from(users.values());
  for (const user of existingUsers) {
    if (user.username === username) {
      throw new Error('Username already exists');
    }
  }
  
  const passwordHash = await hashPassword(password);
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username,
    passwordHash,
    createdAt: new Date(),
  };
  
  users.set(user.id, user);
  return user;
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const allUsers = Array.from(users.values());
  for (const user of allUsers) {
    if (user.username === username) {
      const isValid = await verifyPassword(password, user.passwordHash);
      if (isValid) {
        return user;
      }
    }
  }
  return null;
}

export function getUserById(userId: string): User | undefined {
  return users.get(userId);
}

