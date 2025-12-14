// Logique principale du jeu

import { GameState, Character, Position, AttackResult, Team } from '../types/game';
import { initializeCharacters, generateSpecialTiles, getDistance, isValidPosition, calculateDamage, canAttack, getAttackTargets, generateTurnOrder } from './utils';
import { ATTACK_RANGES, ATTACKS_PER_TURN, SPECIAL_TILE_EFFECTS } from './constants';
import { BOARD_SIZE } from './constants';

export function initializeGame(): GameState {
  const { playerTeam, enemyTeam } = initializeCharacters();
  const specialTiles = generateSpecialTiles().map(tile => ({
    ...tile,
    used: false,
  }));
  
  const board: (Character | null)[][] = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
  
  [...playerTeam, ...enemyTeam].forEach(char => {
    board[char.position.y][char.position.x] = char;
  });
  
  // Générer l'ordre de jeu basé sur l'initiative
  const turnOrder = generateTurnOrder(playerTeam, enemyTeam);
  const firstCharId = turnOrder[0];
  const firstChar = [...playerTeam, ...enemyTeam].find(c => c.id === firstCharId);
  
  return {
    board,
    playerTeam,
    enemyTeam,
    currentTurn: firstChar?.team || 'player',
    currentCharacterIndex: 0,
    selectedCharacter: null,
    specialTiles,
    gameOver: false,
    winner: null,
    turnCount: 1, // Tour global 1
    moveCount: 0,
    movementCount: 0,
    turnOrder,
    currentTurnOrderIndex: 0,
  };
}

export function moveCharacter(
  gameState: GameState,
  characterId: string,
  newPosition: Position
): GameState {
  if (!isValidPosition(newPosition)) {
    return gameState;
  }
  
  const character = [...gameState.playerTeam, ...gameState.enemyTeam].find(
    c => c.id === characterId
  );
  
  if (!character || !character.isAlive) {
    return gameState;
  }
  
  const distance = getDistance(character.position, newPosition);
  const availableMovement = character.movement; // movementBoost n'est plus utilisé (bonus permanent via maxMovement)
  
  if (distance > availableMovement || distance === 0) {
    return gameState;
  }
  
  // Vérifier si la case est libre
  if (gameState.board[newPosition.y][newPosition.x] !== null) {
    return gameState;
  }
  
  // Mettre à jour la position
  const newBoard = gameState.board.map(row => [...row]);
  newBoard[character.position.y][character.position.x] = null;
  newBoard[newPosition.y][newPosition.x] = character;
  
  const updatedCharacter = {
    ...character,
    position: newPosition,
    movement: character.movement - distance,
  };
  
  // NOTE: Les cases spéciales ne s'activent qu'en fin de tour (dans endTurn)
  
  // Mettre à jour l'équipe
  const team = character.team === 'player' ? 'playerTeam' : 'enemyTeam';
  const updatedTeam = gameState[team].map(c =>
    c.id === characterId ? updatedCharacter : c
  );
  
  return {
    ...gameState,
    board: newBoard,
    [team]: updatedTeam,
    moveCount: gameState.moveCount + 1,
  };
}

export function performAttack(
  gameState: GameState,
  attackerId: string,
  targetPosition: Position,
  isMelee: boolean = true
): { gameState: GameState; attackResult: AttackResult | null } {
  const attacker = [...gameState.playerTeam, ...gameState.enemyTeam].find(
    c => c.id === attackerId
  );
  
  if (!attacker || !attacker.isAlive) {
    return { gameState, attackResult: null };
  }
  
  const allCharacters = [...gameState.playerTeam, ...gameState.enemyTeam].filter(c => c.isAlive);
  let targets: Character[] = [];
  
  // Logique d'attaque selon le type de personnage
  if (attacker.type === 'warrior') {
    // GUERRIER: Corps à corps uniquement (1 case de distance)
    const distanceToTarget = getDistance(attacker.position, targetPosition);
    if (distanceToTarget > 1) {
      return { gameState, attackResult: null }; // Trop loin
    }
    
    // Trouver le personnage sur la case ciblée
    const targetChar = allCharacters.find(
      c => c.position.x === targetPosition.x && c.position.y === targetPosition.y && c.id !== attacker.id
    );
    
    if (targetChar) {
      targets = [targetChar];
    } else {
      return { gameState, attackResult: null }; // Pas de cible
    }
  } else if (attacker.type === 'thief') {
    // VOLEUR: Peut attaquer jusqu'à 4 cases de distance
    const distanceToTarget = getDistance(attacker.position, targetPosition);
    if (distanceToTarget > ATTACK_RANGES.THIEF) {
      return { gameState, attackResult: null }; // Trop loin
    }
    
    // Trouver le personnage sur la case ciblée
    const targetChar = allCharacters.find(
      c => c.position.x === targetPosition.x && c.position.y === targetPosition.y && c.id !== attacker.id
    );
    
    if (targetChar) {
      targets = [targetChar];
      // Déterminer si c'est du corps à corps pour le critique
      isMelee = distanceToTarget <= 1;
    } else {
      return { gameState, attackResult: null }; // Pas de cible
    }
  } else if (attacker.type === 'mage') {
    // MAGE: Attaque de zone - touche TOUS les personnages dans un rayon de 3 cases autour du mage
    targets = allCharacters.filter(char => {
      if (char.id === attacker.id) return false; // Le mage ne s'attaque pas lui-même
      const distance = getDistance(attacker.position, char.position);
      return distance <= ATTACK_RANGES.MAGE; // 3 cases
    });
    
    if (targets.length === 0) {
      return { gameState, attackResult: null }; // Personne à portée
    }
  }
  
  if (targets.length === 0) {
    return { gameState, attackResult: null };
  }
  
  // Calculer les dégâts
  const attackResults = targets.map(target => {
    let damage = calculateDamage(attacker.type, target.type, attacker.damageBoost);
    let isCritical = false;
    
    // Critique pour le voleur en corps à corps uniquement (50% de chance)
    if (attacker.type === 'thief' && isMelee && Math.random() < 0.5) {
      damage *= 2;
      isCritical = true;
    }
    
    const newHealth = Math.max(0, target.health - damage);
    const updatedTarget = {
      ...target,
      health: newHealth,
      isAlive: newHealth > 0,
    };
    
    return {
      character: updatedTarget,
      damage,
      isCritical,
    };
  });
  
  // Mettre à jour les personnages (y compris les alliés touchés par le mage)
  const newBoard = gameState.board.map(row => [...row]);
  
  // D'abord appliquer les dégâts à tous les personnages touchés
  let updatedPlayerTeam = gameState.playerTeam.map(char => {
    const result = attackResults.find(r => r.character.id === char.id);
    if (result) {
      const updated = result.character;
      // Si le personnage est mort, libérer la case
      if (!updated.isAlive) {
        newBoard[updated.position.y][updated.position.x] = null;
      } else {
        newBoard[updated.position.y][updated.position.x] = updated;
      }
      return updated;
    }
    return char;
  });
  
  let updatedEnemyTeam = gameState.enemyTeam.map(char => {
    const result = attackResults.find(r => r.character.id === char.id);
    if (result) {
      const updated = result.character;
      // Si le personnage est mort, libérer la case
      if (!updated.isAlive) {
        newBoard[updated.position.y][updated.position.x] = null;
      } else {
        newBoard[updated.position.y][updated.position.x] = updated;
      }
      return updated;
    }
    return char;
  });
  
  // Le bonus de dégâts est maintenant permanent, on ne le réinitialise plus
  
  const attackResult: AttackResult = {
    attacker: attacker,
    targets: attackResults,
  };
  
  const newGameState = {
    ...gameState,
    board: newBoard,
    playerTeam: updatedPlayerTeam,
    enemyTeam: updatedEnemyTeam,
  };
  
  // Vérifier si le jeu est terminé
  const playerAlive = updatedPlayerTeam.some(c => c.isAlive);
  const enemyAlive = updatedEnemyTeam.some(c => c.isAlive);
  
  if (!playerAlive || !enemyAlive) {
    newGameState.gameOver = true;
    newGameState.winner = playerAlive ? 'player' : 'enemy';
  }
  
  return { gameState: newGameState, attackResult };
}

export function endTurn(gameState: GameState, usedCharacterId?: string): GameState {
  let updatedPlayerTeam = [...gameState.playerTeam];
  let updatedEnemyTeam = [...gameState.enemyTeam];
  let updatedSpecialTiles = [...gameState.specialTiles];
  let newBoard = gameState.board.map(row => [...row]);
  
  // Appliquer les effets des cases spéciales au personnage qui vient de jouer
  if (usedCharacterId) {
    const allChars = [...updatedPlayerTeam, ...updatedEnemyTeam];
    const character = allChars.find(c => c.id === usedCharacterId);
    
    if (character) {
      // Trouver si le personnage est sur une case spéciale non utilisée
      const tileIndex = updatedSpecialTiles.findIndex(
        tile => tile.position.x === character.position.x &&
                tile.position.y === character.position.y &&
                !tile.used
      );
      
      if (tileIndex !== -1) {
        const specialTile = updatedSpecialTiles[tileIndex];
        let updatedChar = { ...character };
        
        switch (specialTile.type) {
          case 'heal':
            // +3 PV max (permanent) et soigne 6 PV
            updatedChar.maxHealth += SPECIAL_TILE_EFFECTS.HEAL_MAX_HP;
            updatedChar.health = Math.min(
              updatedChar.maxHealth,
              updatedChar.health + SPECIAL_TILE_EFFECTS.HEAL_AMOUNT
            );
            break;
          case 'damage_boost':
            // +1 dégâts permanent
            updatedChar.damageBoost += SPECIAL_TILE_EFFECTS.DAMAGE_BOOST;
            break;
          case 'movement_boost':
            // +1 mouvement permanent (augmente maxMovement)
            updatedChar.maxMovement += SPECIAL_TILE_EFFECTS.MOVEMENT_BOOST;
            updatedChar.movement += SPECIAL_TILE_EFFECTS.MOVEMENT_BOOST; // Aussi pour ce tour
            break;
          case 'initiative_boost':
            // -1 initiative (permanent, minimum 1)
            updatedChar.initiative = Math.max(1, updatedChar.initiative - SPECIAL_TILE_EFFECTS.INITIATIVE_BOOST);
            break;
        }
        
        // Marquer la case comme utilisée
        updatedSpecialTiles[tileIndex] = { ...specialTile, used: true };
        
        // Mettre à jour le personnage dans la bonne équipe
        if (character.team === 'player') {
          updatedPlayerTeam = updatedPlayerTeam.map(c => c.id === usedCharacterId ? updatedChar : c);
        } else {
          updatedEnemyTeam = updatedEnemyTeam.map(c => c.id === usedCharacterId ? updatedChar : c);
        }
        newBoard[character.position.y][character.position.x] = updatedChar;
      }
    }
  }
  
  // Passer au prochain personnage dans l'ordre de tour
  let nextIndex = gameState.currentTurnOrderIndex + 1;
  let newTurnCount = gameState.turnCount;
  let newTurnOrder = gameState.turnOrder;
  
  // Filtrer les personnages morts de l'ordre de tour
  const allAlive = [...updatedPlayerTeam, ...updatedEnemyTeam].filter(c => c.isAlive);
  newTurnOrder = gameState.turnOrder.filter(id => allAlive.some(c => c.id === id));
  
  // Si on a fait le tour de tous les personnages, nouveau tour global
  if (nextIndex >= newTurnOrder.length) {
    nextIndex = 0;
    newTurnCount++;
    
    // Régénérer l'ordre de tour pour le nouveau tour global
    newTurnOrder = generateTurnOrder(updatedPlayerTeam, updatedEnemyTeam);
    
    // Réinitialiser le mouvement et les attaques pour tous les personnages vivants
    updatedPlayerTeam = updatedPlayerTeam.map(char => ({
      ...char,
      movement: char.isAlive ? char.maxMovement : char.movement,
      attacksRemaining: char.isAlive ? (char.type === 'warrior' ? 2 : 1) : 0,
    }));
    
    updatedEnemyTeam = updatedEnemyTeam.map(char => ({
      ...char,
      movement: char.isAlive ? char.maxMovement : char.movement,
      attacksRemaining: char.isAlive ? (char.type === 'warrior' ? 2 : 1) : 0,
    }));
    
    // Mettre à jour le plateau avec les personnages réinitialisés
    [...updatedPlayerTeam, ...updatedEnemyTeam].forEach(char => {
      if (char.isAlive) {
        newBoard[char.position.y][char.position.x] = char;
      }
    });
  }
  
  // Trouver le prochain personnage
  const nextCharId = newTurnOrder[nextIndex];
  const nextChar = [...updatedPlayerTeam, ...updatedEnemyTeam].find(c => c.id === nextCharId);
  
  return {
    ...gameState,
    board: newBoard,
    playerTeam: updatedPlayerTeam,
    enemyTeam: updatedEnemyTeam,
    specialTiles: updatedSpecialTiles,
    currentTurn: nextChar?.team || 'player',
    currentCharacterIndex: nextIndex,
    turnCount: newTurnCount,
    turnOrder: newTurnOrder,
    currentTurnOrderIndex: nextIndex,
  };
}

