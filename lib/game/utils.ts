// Utilitaires pour le jeu

import { Position, Character, CharacterType, SpecialTileType } from '../types/game';
import { BOARD_SIZE, DAMAGE_RANGES } from './constants';

export function getDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

export function isValidPosition(pos: Position): boolean {
  return pos.x >= 0 && pos.x < BOARD_SIZE && pos.y >= 0 && pos.y < BOARD_SIZE;
}

// Génère un nombre aléatoire entre min et max inclus
export function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateDamage(
  attackerType: CharacterType,
  defenderType: CharacterType,
  damageBoost: number = 0
): number {
  const damageConfig = DAMAGE_RANGES[attackerType.toUpperCase() as keyof typeof DAMAGE_RANGES];
  const defenderKey = `vs_${defenderType}` as keyof typeof damageConfig;
  const range = damageConfig[defenderKey];
  
  const baseDamage = randomRange(range.min, range.max);
  return baseDamage + damageBoost;
}

export function canAttack(attacker: Character, target: Character, isMelee: boolean): boolean {
  const distance = getDistance(attacker.position, target.position);
  const maxRange = isMelee ? 1 : 4;
  return distance <= maxRange;
}

export function getAttackTargets(
  attacker: Character,
  allCharacters: Character[],
  attackRange: number,
  isAreaAttack: boolean
): Character[] {
  if (isAreaAttack) {
    // Attaque de zone : tous les personnages dans la portée
    return allCharacters.filter(char => {
      if (char.id === attacker.id) return false; // Le mage ne s'attaque pas lui-même
      const distance = getDistance(attacker.position, char.position);
      return distance <= attackRange;
    });
  } else {
    // Attaque ciblée : le personnage le plus proche dans la portée
    const targets = allCharacters.filter(char => {
      if (char.team === attacker.team) return false; // Pas d'attaques alliées pour les attaques ciblées
      const distance = getDistance(attacker.position, char.position);
      return distance <= attackRange;
    });
    
    if (targets.length === 0) return [];
    
    // Retourner le plus proche
    targets.sort((a, b) => {
      const distA = getDistance(attacker.position, a.position);
      const distB = getDistance(attacker.position, b.position);
      return distA - distB;
    });
    
    return [targets[0]];
  }
}

export function generateSpecialTiles(): Array<{ position: Position; type: SpecialTileType }> {
  const tiles: Array<{ position: Position; type: SpecialTileType }> = [];
  const usedPositions = new Set<string>();
  
  // Positions de départ des personnages - à exclure
  const startingPositions = new Set([
    '2,2', '3,2', '2,3',    // Joueur
    '13,13', '12,13', '13,12' // Ennemi
  ]);
  
  const tileTypes: SpecialTileType[] = ['heal', 'damage_boost', 'movement_boost'];
  const counts = [10, 10, 10];
  
  tileTypes.forEach((type, typeIndex) => {
    for (let i = 0; i < counts[typeIndex]; i++) {
      let position: Position;
      let key: string;
      
      do {
        position = {
          x: Math.floor(Math.random() * BOARD_SIZE),
          y: Math.floor(Math.random() * BOARD_SIZE),
        };
        key = `${position.x},${position.y}`;
      } while (usedPositions.has(key) || startingPositions.has(key));
      
      usedPositions.add(key);
      tiles.push({ position, type });
    }
  });
  
  return tiles;
}

export function initializeCharacters(): {
  playerTeam: Character[];
  enemyTeam: Character[];
} {
  const playerTeam: Character[] = [
    {
      id: 'player-warrior',
      type: 'warrior',
      team: 'player',
      position: { x: 2, y: 2 },
      health: 15,
      maxHealth: 15,
      movement: 4,
      maxMovement: 4,
      isAlive: true,
      damageBoost: 0,
      movementBoost: 0,
      attacksRemaining: 2,
      initiative: 10,
    },
    {
      id: 'player-mage',
      type: 'mage',
      team: 'player',
      position: { x: 3, y: 2 },
      health: 10,
      maxHealth: 10,
      movement: 4,
      maxMovement: 4,
      isAlive: true,
      damageBoost: 0,
      movementBoost: 0,
      attacksRemaining: 1,
      initiative: 11,
    },
    {
      id: 'player-thief',
      type: 'thief',
      team: 'player',
      position: { x: 2, y: 3 },
      health: 12,
      maxHealth: 12,
      movement: 5,
      maxMovement: 5,
      isAlive: true,
      damageBoost: 0,
      movementBoost: 0,
      attacksRemaining: 1,
      initiative: 8,
    },
  ];
  
  const enemyTeam: Character[] = [
    {
      id: 'enemy-warrior',
      type: 'warrior',
      team: 'enemy',
      position: { x: 13, y: 13 },
      health: 15,
      maxHealth: 15,
      movement: 4,
      maxMovement: 4,
      isAlive: true,
      damageBoost: 0,
      movementBoost: 0,
      attacksRemaining: 2,
      initiative: 10,
    },
    {
      id: 'enemy-mage',
      type: 'mage',
      team: 'enemy',
      position: { x: 12, y: 13 },
      health: 10,
      maxHealth: 10,
      movement: 4,
      maxMovement: 4,
      isAlive: true,
      damageBoost: 0,
      movementBoost: 0,
      attacksRemaining: 1,
      initiative: 11,
    },
    {
      id: 'enemy-thief',
      type: 'thief',
      team: 'enemy',
      position: { x: 13, y: 12 },
      health: 12,
      maxHealth: 12,
      movement: 5,
      maxMovement: 5,
      isAlive: true,
      damageBoost: 0,
      movementBoost: 0,
      attacksRemaining: 1,
      initiative: 8,
    },
  ];
  
  return { playerTeam, enemyTeam };
}

// Génère l'ordre de jeu basé sur l'initiative
export function generateTurnOrder(playerTeam: Character[], enemyTeam: Character[]): string[] {
  const allCharacters = [...playerTeam, ...enemyTeam].filter(c => c.isAlive);
  
  // Trier par initiative (plus bas = joue en premier)
  // En cas d'égalité: joueur d'abord, puis aléatoire si même équipe
  allCharacters.sort((a, b) => {
    if (a.initiative !== b.initiative) {
      return a.initiative - b.initiative;
    }
    // Initiative égale
    if (a.team !== b.team) {
      return a.team === 'player' ? -1 : 1; // Joueur d'abord
    }
    // Même équipe, même initiative: aléatoire
    return Math.random() - 0.5;
  });
  
  return allCharacters.map(c => c.id);
}

