import { GameState, SpecialTile, SpecialTileType, Position, Character, Team } from './types';
import { createCharacter } from './characters';
import { generateTurnOrder } from './utils';

export function createBoard(): (Character | null)[][] {
  const board: (Character | null)[][] = [];
  for (let y = 0; y < 16; y++) {
    board[y] = [];
    for (let x = 0; x < 16; x++) {
      board[y][x] = null;
    }
  }
  return board;
}

export function generateSpecialTiles(): SpecialTile[] {
  const tiles: SpecialTile[] = [];
  const usedPositions = new Set<string>();
  
  // 10 cases de soin (vertes)
  for (let i = 0; i < 10; i++) {
    const pos = getRandomPosition(usedPositions);
    tiles.push({ position: pos, type: 'heal', used: false });
    usedPositions.add(`${pos.x},${pos.y}`);
  }
  
  // 10 cases de bonus dégâts (rouges)
  for (let i = 0; i < 10; i++) {
    const pos = getRandomPosition(usedPositions);
    tiles.push({ position: pos, type: 'damage_boost', used: false });
    usedPositions.add(`${pos.x},${pos.y}`);
  }
  
  // 10 cases de bonus mouvement (violettes)
  for (let i = 0; i < 10; i++) {
    const pos = getRandomPosition(usedPositions);
    tiles.push({ position: pos, type: 'movement_boost', used: false });
    usedPositions.add(`${pos.x},${pos.y}`);
  }
  
  return tiles;
}

function getRandomPosition(usedPositions: Set<string>): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * 16),
      y: Math.floor(Math.random() * 16),
    };
  } while (usedPositions.has(`${pos.x},${pos.y}`));
  return pos;
}

export function initializeGame(): GameState {
  const board = createBoard();
  const playerTeam: Character[] = [];
  const enemyTeam: Character[] = [];
  
  // Positionner l'équipe du joueur en bas (y proche de 15)
  const playerPositions: Position[] = [
    { x: 6, y: 13 },
    { x: 7, y: 14 },
    { x: 8, y: 13 },
  ];
  
  // Positionner l'équipe ennemie en haut (y proche de 0)
  const enemyPositions: Position[] = [
    { x: 6, y: 2 },
    { x: 7, y: 1 },
    { x: 8, y: 2 },
  ];
  
  // Créer les personnages du joueur
  const playerTypes: Character['type'][] = ['warrior', 'mage', 'thief'];
  playerPositions.forEach((pos, index) => {
    const character = createCharacter(playerTypes[index], 'player', pos);
    playerTeam.push(character);
    board[pos.y][pos.x] = character;
  });
  
  // Créer les personnages de l'adversaire
  const enemyTypes: Character['type'][] = ['warrior', 'mage', 'thief'];
  enemyPositions.forEach((pos, index) => {
    const character = createCharacter(enemyTypes[index], 'enemy', pos);
    enemyTeam.push(character);
    board[pos.y][pos.x] = character;
  });
  
  const specialTiles = generateSpecialTiles();
  
  // Générer l'ordre de jeu basé sur l'initiative
  const turnOrder = generateTurnOrder(playerTeam, enemyTeam);
  const firstCharId = turnOrder[0];
  const firstChar = [...playerTeam, ...enemyTeam].find(c => c.id === firstCharId);
  
  return {
    board,
    playerTeam,
    enemyTeam,
    specialTiles,
    currentTurn: firstChar?.team || 'player',
    currentCharacterIndex: 0,
    selectedCharacter: null,
    gameOver: false,
    winner: null,
    turnCount: 1,
    moveCount: 0,
    movementCount: 0,
    turnOrder,
    currentTurnOrderIndex: 0,
  };
}

export function checkSpecialTile(position: Position, specialTiles: SpecialTile[]): SpecialTile | null {
  return specialTiles.find(
    tile => tile.position.x === position.x && 
            tile.position.y === position.y && 
            !tile.used
  ) || null;
}

export function applySpecialTile(character: Character, tile: SpecialTile): Character {
  const updated = { ...character };
  
  switch (tile.type) {
    case 'heal':
      updated.health = Math.min(updated.maxHealth, updated.health + 3);
      break;
    case 'damage_boost':
      updated.damageBoost += 2;
      break;
    case 'movement_boost':
      updated.movementBoost = 3;
      break;
  }
  
  tile.used = true;
  return updated;
}

export function checkGameOver(gameState: GameState): { gameOver: boolean; winner: Team | null } {
  const playerAlive = gameState.playerTeam.some(c => c.health > 0);
  const enemyAlive = gameState.enemyTeam.some(c => c.health > 0);
  
  if (!playerAlive) {
    return { gameOver: true, winner: 'enemy' };
  }
  if (!enemyAlive) {
    return { gameOver: true, winner: 'player' };
  }
  
  return { gameOver: false, winner: null };
}

