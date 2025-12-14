// Logique principale du jeu

import { GameState, Character, Position, AttackResult, Team } from '../types/game';
import { initializeCharacters, generateSpecialTiles, getDistance, isValidPosition, calculateDamage, canAttack, getAttackTargets } from './utils';
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
  
  return {
    board,
    playerTeam,
    enemyTeam,
    currentTurn: 'player',
    currentCharacterIndex: 0,
    selectedCharacter: null,
    specialTiles,
    gameOver: false,
    winner: null,
    turnCount: 0,
    moveCount: 0,
    movementCount: 0,
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
  const availableMovement = character.movement + character.movementBoost;
  
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
    movementBoost: 0, // Consommé après le mouvement
  };
  
  // Appliquer les effets des cases spéciales
  const specialTile = gameState.specialTiles.find(
    tile => tile.position.x === newPosition.x &&
            tile.position.y === newPosition.y &&
            !tile.used
  );
  
  if (specialTile) {
    switch (specialTile.type) {
      case 'heal':
        updatedCharacter.health = Math.min(
          updatedCharacter.maxHealth,
          updatedCharacter.health + SPECIAL_TILE_EFFECTS.HEAL
        );
        break;
      case 'damage_boost':
        updatedCharacter.damageBoost += SPECIAL_TILE_EFFECTS.DAMAGE_BOOST;
        break;
      case 'movement_boost':
        updatedCharacter.movementBoost = SPECIAL_TILE_EFFECTS.MOVEMENT_BOOST;
        break;
    }
    
    specialTile.used = true;
  }
  
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
  
  const attackRange = attacker.type === 'warrior' ? ATTACK_RANGES.WARRIOR :
                      attacker.type === 'mage' ? ATTACK_RANGES.MAGE :
                      isMelee ? ATTACK_RANGES.THIEF_MELEE : ATTACK_RANGES.THIEF_RANGED;
  
  const isAreaAttack = attacker.type === 'mage';
  const allCharacters = [...gameState.playerTeam, ...gameState.enemyTeam].filter(c => c.isAlive);
  
  // Pour les attaques ciblées, trouver les cibles autour de la position cliquée
  let targets: Character[] = [];
  
  if (isAreaAttack) {
    // Attaque de zone autour de l'attaquant
    targets = getAttackTargets(attacker, allCharacters, attackRange, true);
  } else {
    // Attaque ciblée : trouver les personnages autour de la position cliquée
    const charactersAtPosition = allCharacters.filter(char => {
      const distance = getDistance(char.position, targetPosition);
      return distance <= (isMelee ? 1 : attackRange);
    });
    
    if (charactersAtPosition.length > 0) {
      targets = charactersAtPosition;
    } else {
      // Attaque dans le vide - ne consomme pas les bonus de dégâts
      return { gameState, attackResult: null };
    }
  }
  
  if (targets.length === 0) {
    return { gameState, attackResult: null };
  }
  
  // Calculer les dégâts
  const attackResults = targets.map(target => {
    let damage = calculateDamage(attacker.type, target.type, attacker.damageBoost);
    let isCritical = false;
    
    // Critique pour le voleur en corps à corps
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
  
  // Mettre à jour les personnages
  const newBoard = gameState.board.map(row => [...row]);
  const updatedPlayerTeam = gameState.playerTeam.map(char => {
    const result = attackResults.find(r => r.character.id === char.id);
    if (result) {
      const updated = result.character;
      newBoard[updated.position.y][updated.position.x] = updated;
      return updated;
    }
    return char;
  });
  
  const updatedEnemyTeam = gameState.enemyTeam.map(char => {
    const result = attackResults.find(r => r.character.id === char.id);
    if (result) {
      const updated = result.character;
      newBoard[updated.position.y][updated.position.x] = updated;
      return updated;
    }
    return char;
  });
  
  // Réinitialiser le bonus de dégâts après l'attaque
  const updatedAttacker = {
    ...attacker,
    damageBoost: 0,
  };
  
  const team = attacker.team === 'player' ? 'playerTeam' : 'enemyTeam';
  const finalTeam = gameState[team].map(c =>
    c.id === attackerId ? updatedAttacker : c
  );
  
  const attackResult: AttackResult = {
    attacker: updatedAttacker,
    targets: attackResults,
  };
  
  const newGameState = {
    ...gameState,
    board: newBoard,
    playerTeam: updatedPlayerTeam,
    enemyTeam: updatedEnemyTeam,
    [team]: finalTeam,
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

export function endTurn(gameState: GameState): GameState {
  // Alterner immédiatement entre joueur et adversaire après chaque tour
  const nextTurn: Team = gameState.currentTurn === 'player' ? 'enemy' : 'player';
  
  // Réinitialiser les points de mouvement du personnage qui vient de jouer
  const currentTeamKey = gameState.currentTurn === 'player' ? 'playerTeam' : 'enemyTeam';
  const nextTeamKey = nextTurn === 'player' ? 'playerTeam' : 'enemyTeam';
  
  // Réinitialiser le mouvement pour tous les personnages de la prochaine équipe
  const resetNextTeam = gameState[nextTeamKey].map(char => ({
    ...char,
    movement: char.maxMovement,
    attacksRemaining: char.type === 'warrior' ? 2 : 1,
  }));
  
  return {
    ...gameState,
    currentTurn: nextTurn,
    currentCharacterIndex: 0,
    [nextTeamKey]: resetNextTeam,
    turnCount: gameState.turnCount + 1,
  };
}

