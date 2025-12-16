// IA adverse - stratÃ©gie simple sans OpenAI

import { GameState, Character, Position } from '../types/game';
import { ATTACK_RANGES } from '../game/constants';

interface AIMove {
  action: 'move' | 'attack' | 'end_turn';
  characterId?: string;
  position?: Position;
  targetPosition?: Position;
  isMelee?: boolean;
}

function getDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

export async function getEnemyMove(gameState: GameState): Promise<AIMove> {
  // VÃ©rifications de base
  if (gameState.currentTurn !== 'enemy' || gameState.gameOver) {
    return { action: 'end_turn' };
  }
  
  // Trouver le personnage actuel depuis l'ordre de tour
  const currentCharId = gameState.turnOrder[gameState.currentTurnOrderIndex];
  const currentCharacter = gameState.enemyTeam.find(c => c.id === currentCharId && c.isAlive);
  
  if (!currentCharacter) {
    return { action: 'end_turn' };
  }
  
  // Trouver les cibles (personnages joueur vivants)
  const targets = gameState.playerTeam.filter(c => c.isAlive);
  if (targets.length === 0) {
    return { action: 'end_turn' };
  }
  
  // Trouver la cible la plus proche
  let closestTarget: Character | null = null;
  let closestDistance = Infinity;
  
  for (const target of targets) {
    const dist = getDistance(currentCharacter.position, target.position);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestTarget = target;
    }
  }
  
  if (!closestTarget) {
    return { action: 'end_turn' };
  }
  
  // Logique par type de personnage
  switch (currentCharacter.type) {
    case 'mage':
      // Le mage attaque en zone autour de lui (portÃ©e 3)
      if (closestDistance <= ATTACK_RANGES.MAGE) {
        return {
          action: 'attack',
          characterId: currentCharacter.id,
          targetPosition: closestTarget.position,
          isMelee: false,
        };
      }
      break;
      
    case 'warrior':
      // Le guerrier doit Ãªtre au corps Ã  corps (portÃ©e 1)
      if (closestDistance <= ATTACK_RANGES.WARRIOR) {
        return {
          action: 'attack',
          characterId: currentCharacter.id,
          targetPosition: closestTarget.position,
          isMelee: true,
        };
      }
      break;
      
    case 'thief':
      // Le voleur peut attaquer jusqu'Ã  4 cases de distance
      // Corps Ã  corps si distance <= 1, distance sinon
      if (closestDistance <= ATTACK_RANGES.THIEF) {
        const isMelee = closestDistance <= 1;
        return {
          action: 'attack',
          characterId: currentCharacter.id,
          targetPosition: closestTarget.position,
          isMelee: isMelee,
        };
      }
      break;
      
    case 'royal':
      // Le royal doit Ãªtre au corps Ã  corps (portÃ©e 1)
      if (closestDistance <= ATTACK_RANGES.ROYAL) {
        return {
          action: 'attack',
          characterId: currentCharacter.id,
          targetPosition: closestTarget.position,
          isMelee: true,
        };
      }
      break;
  }
  
  // Si on ne peut pas attaquer, se dÃ©placer vers la cible
  if (currentCharacter.movement > 0) {
    const movePos = findBestMove(currentCharacter, closestTarget.position, gameState);
    if (movePos) {
      return {
        action: 'move',
        characterId: currentCharacter.id,
        position: movePos,
      };
    }
  }
  
  return { action: 'end_turn' };
}

function findBestMove(
  character: Character,
  targetPos: Position,
  gameState: GameState
): Position | null {
  const { position, movement } = character;
  let bestPos: Position | null = null;
  let bestDist = Infinity;
  
  // Explorer toutes les positions accessibles
  for (let dx = -movement; dx <= movement; dx++) {
    for (let dy = -movement; dy <= movement; dy++) {
      const manhattanDist = Math.abs(dx) + Math.abs(dy);
      if (manhattanDist === 0 || manhattanDist > movement) continue;
      
      const newX = position.x + dx;
      const newY = position.y + dy;
      
      // VÃ©rifier les limites du plateau
      if (newX < 0 || newX >= 16 || newY < 0 || newY >= 16) continue;
      
      // VÃ©rifier si la case est libre
      if (gameState.board[newY]?.[newX] !== null) continue;
      
      // Calculer la distance Ã  la cible
      const distToTarget = getDistance({ x: newX, y: newY }, targetPos);
      if (distToTarget < bestDist) {
        bestDist = distToTarget;
        bestPos = { x: newX, y: newY };
      }
    }
  }
  
  return bestPos;
}
