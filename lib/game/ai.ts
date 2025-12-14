import { GameState, Character, Position } from './types';
import { canAttack } from './combat';
import { canMoveTo, getDistance } from './characters';

interface AIMove {
  characterId: string;
  action: 'move' | 'attack' | 'end_turn';
  targetPosition?: Position;
  attackPosition?: Position;
}

export async function getAIMove(gameState: GameState): Promise<AIMove> {
  const aliveEnemies = gameState.enemyTeam.filter(c => c.health > 0);
  
  if (aliveEnemies.length === 0) {
    return { characterId: '', action: 'end_turn' };
  }
  
  // SÃ©lectionner le personnage avec le plus de points de vie
  const selectedCharacter = aliveEnemies.reduce((best, current) => 
    current.health > best.health ? current : best
  );
  
  // StratÃ©gie simple: essayer d'attaquer, sinon se rapprocher
  const playerCharacters = gameState.playerTeam.filter(c => c.health > 0);
  
  if (playerCharacters.length === 0) {
    return { characterId: selectedCharacter.id, action: 'end_turn' };
  }
  
  // Chercher une cible Ã  portÃ©e d'attaque
  for (const target of playerCharacters) {
    const distance = getDistance(selectedCharacter.position, target.position);
    
    if (canAttack(selectedCharacter, target.position, gameState.board)) {
      return {
        characterId: selectedCharacter.id,
        action: 'attack',
        attackPosition: target.position,
      };
    }
    
    // Si on peut se rapprocher
    if (selectedCharacter.movement > 0 && distance > 1) {
      const moveDirection = {
        x: target.position.x > selectedCharacter.position.x ? 1 : 
           target.position.x < selectedCharacter.position.x ? -1 : 0,
        y: target.position.y > selectedCharacter.position.y ? 1 : 
           target.position.y < selectedCharacter.position.y ? -1 : 0,
      };
      
      const newPos: Position = {
        x: selectedCharacter.position.x + moveDirection.x,
        y: selectedCharacter.position.y + moveDirection.y,
      };
      
      if (canMoveTo(selectedCharacter, newPos, gameState.board)) {
        return {
          characterId: selectedCharacter.id,
          action: 'move',
          targetPosition: newPos,
        };
      }
    }
  }
  
  // Si on ne peut rien faire, finir le tour
  return { characterId: selectedCharacter.id, action: 'end_turn' };
}

