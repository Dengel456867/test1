// IA adverse - stratégie simple sans OpenAI

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
  // Vérifications de base
  if (gameState.currentTurn !== 'enemy' || gameState.gameOver) {
    return { action: 'end_turn' };
  }
  
  // Trouver le premier personnage ennemi vivant
  const aliveEnemies = gameState.enemyTeam.filter(c => c.isAlive);
  if (aliveEnemies.length === 0) {
    return { action: 'end_turn' };
  }
  
  const currentCharacter = aliveEnemies[0];
  
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
      // Le mage attaque en zone autour de lui (portée 3)
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
      // Le guerrier doit être au corps à corps (portée 1)
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
      // Le voleur peut attaquer jusqu'à 4 cases de distance
      // Corps à corps si distance <= 1, distance sinon
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
  }
  
  // Si on ne peut pas attaquer, se déplacer vers la cible
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
      
      // Vérifier les limites du plateau
      if (newX < 0 || newX >= 16 || newY < 0 || newY >= 16) continue;
      
      // Vérifier si la case est libre
      if (gameState.board[newY]?.[newX] !== null) continue;
      
      // Calculer la distance à la cible
      const distToTarget = getDistance({ x: newX, y: newY }, targetPos);
      if (distToTarget < bestDist) {
        bestDist = distToTarget;
        bestPos = { x: newX, y: newY };
      }
    }
  }
  
  return bestPos;
}
