// IA adverse utilisant OpenAI

import OpenAI from 'openai';
import { GameState, Character, Position, Team } from '../types/game';
import { moveCharacter, performAttack, endTurn } from '../game/gameLogic';
import { getDistance, getAttackTargets } from '../game/utils';
import { ATTACK_RANGES } from '../game/constants';

// OpenAI client (initialisÃ© seulement si la clÃ© API est disponible)
let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface AIMove {
  action: 'move' | 'attack' | 'end_turn';
  characterId?: string;
  position?: Position;
  targetPosition?: Position;
  isMelee?: boolean;
}

export async function getEnemyMove(gameState: GameState): Promise<AIMove> {
  // Si ce n'est pas le tour de l'ennemi, ne rien faire
  if (gameState.currentTurn !== 'enemy' || gameState.gameOver) {
    return { action: 'end_turn' };
  }
  
  const currentCharacter = gameState.enemyTeam[gameState.currentCharacterIndex];
  
  if (!currentCharacter || !currentCharacter.isAlive) {
    return { action: 'end_turn' };
  }
  
  // StratÃ©gie simple : chercher Ã  attaquer si possible, sinon se rapprocher
  const playerCharacters = gameState.playerTeam.filter(c => c.isAlive);
  
  if (playerCharacters.length === 0) {
    return { action: 'end_turn' };
  }
  
  // VÃ©rifier si on peut attaquer
  const canAttackMelee = currentCharacter.type === 'warrior' || 
                         (currentCharacter.type === 'thief' && currentCharacter.movement > 0);
  const canAttackRanged = currentCharacter.type === 'mage' || 
                          (currentCharacter.type === 'thief' && currentCharacter.movement === 0);
  
  // Trouver les cibles Ã  portÃ©e
  let bestTarget: Character | null = null;
  let bestDistance = Infinity;
  
  for (const target of playerCharacters) {
    const distance = getDistance(currentCharacter.position, target.position);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = target;
    }
  }
  
  if (!bestTarget) {
    return { action: 'end_turn' };
  }
  
  // Si on peut attaquer, attaquer
  if (currentCharacter.type === 'mage') {
    // Le mage attaque toujours en zone
    return {
      action: 'attack',
      characterId: currentCharacter.id,
      targetPosition: bestTarget.position,
      isMelee: false,
    };
  }
  
  if (currentCharacter.type === 'warrior' && bestDistance <= ATTACK_RANGES.WARRIOR) {
    return {
      action: 'attack',
      characterId: currentCharacter.id,
      targetPosition: bestTarget.position,
      isMelee: true,
    };
  }
  
  if (currentCharacter.type === 'thief') {
    if (bestDistance <= ATTACK_RANGES.THIEF_MELEE && currentCharacter.movement > 0) {
      return {
        action: 'attack',
        characterId: currentCharacter.id,
        targetPosition: bestTarget.position,
        isMelee: true,
      };
    } else if (bestDistance <= ATTACK_RANGES.THIEF_RANGED && currentCharacter.movement === 0) {
      return {
        action: 'attack',
        characterId: currentCharacter.id,
        targetPosition: bestTarget.position,
        isMelee: false,
      };
    }
  }
  
  // Sinon, se rapprocher
  if (currentCharacter.movement > 0) {
    const movePosition = findBestMovePosition(
      currentCharacter,
      bestTarget.position,
      gameState
    );
    
    if (movePosition) {
      return {
        action: 'move',
        characterId: currentCharacter.id,
        position: movePosition,
      };
    }
  }
  
  return { action: 'end_turn' };
}

function findBestMovePosition(
  character: Character,
  targetPosition: Position,
  gameState: GameState
): Position | null {
  const currentPos = character.position;
  const availableMovement = character.movement;
  
  let bestPosition: Position | null = null;
  let bestDistance = Infinity;
  
  // Chercher la meilleure position dans la portÃ©e de mouvement
  for (let dx = -availableMovement; dx <= availableMovement; dx++) {
    for (let dy = -availableMovement; dy <= availableMovement; dy++) {
      if (Math.abs(dx) + Math.abs(dy) > availableMovement) continue;
      
      const newPos: Position = {
        x: currentPos.x + dx,
        y: currentPos.y + dy,
      };
      
      // VÃ©rifier si la position est valide et libre
      if (newPos.x < 0 || newPos.x >= 16 || newPos.y < 0 || newPos.y >= 16) continue;
      if (gameState.board[newPos.y][newPos.x] !== null) continue;
      
      const distance = getDistance(newPos, targetPosition);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPosition = newPos;
      }
    }
  }
  
  return bestPosition;
}

// Version avec OpenAI (optionnelle, pour une IA plus intelligente)
export async function getEnemyMoveWithAI(gameState: GameState): Promise<AIMove> {
  if (!openai || !process.env.OPENAI_API_KEY) {
    // Fallback sur la stratÃ©gie simple
    return getEnemyMove(gameState);
  }
  
  try {
    const prompt = buildGameStatePrompt(gameState);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an AI playing a tactical turn-based game. Make optimal moves to defeat the player.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    
    // Parser la rÃ©ponse (format JSON attendu)
    const move = JSON.parse(response.choices[0].message.content || '{}');
    return move as AIMove;
  } catch (error) {
    console.error('Erreur OpenAI:', error);
    // Fallback sur la stratÃ©gie simple
    return getEnemyMove(gameState);
  }
}

function buildGameStatePrompt(gameState: GameState): string {
  const currentChar = gameState.enemyTeam[gameState.currentCharacterIndex];
  const playerChars = gameState.playerTeam.filter(c => c.isAlive);
  const enemyChars = gameState.enemyTeam.filter(c => c.isAlive);
  
  return `Game State:
Current Character: ${currentChar?.type} at (${currentChar?.position.x}, ${currentChar?.position.y})
Health: ${currentChar?.health}/${currentChar?.maxHealth}
Movement: ${currentChar?.movement}

Enemy Team:
${enemyChars.map(c => `- ${c.type} at (${c.position.x}, ${c.position.y}), HP: ${c.health}`).join('\n')}

Player Team:
${playerChars.map(c => `- ${c.type} at (${c.position.x}, ${c.position.y}), HP: ${c.health}`).join('\n')}

Make a move. Respond with JSON: {"action": "move"|"attack"|"end_turn", "characterId": "...", "position": {"x": 0, "y": 0}, "targetPosition": {"x": 0, "y": 0}, "isMelee": true/false}`;
}

