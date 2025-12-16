import { Character, CharacterType, Team, Position } from './types';
import { CHARACTER_STATS } from './constants';

export function createCharacter(
  type: CharacterType,
  team: Team,
  position: Position,
  id?: string
): Character {
  const stats = CHARACTER_STATS[type.toUpperCase() as keyof typeof CHARACTER_STATS];
  
  const baseCharacter: Character = {
    id: id || `${team}-${type}-${Date.now()}`,
    type,
    team,
    position,
    health: stats.health,
    maxHealth: stats.health,
    movement: stats.movement,
    maxMovement: stats.movement,
    isAlive: true,
    damageBoost: 0,
    movementBoost: 0,
    attacksRemaining: stats.attacksPerTurn,
    initiative: stats.initiative,
    armor: type === 'warrior' ? 1 : 0,       // Guerrier commence avec 1 armure
    shield: 0,
    regeneration: type === 'mage' ? 1 : 0,   // Mage commence avec 1 régénération
  };

  return baseCharacter;
}

export function resetCharacterTurn(character: Character): Character {
  return {
    ...character,
    movement: character.maxMovement + character.movementBoost,
    movementBoost: 0,
    attacksRemaining: character.type === 'warrior' ? 2 : 1,
  };
}

export function isCharacterAlive(character: Character): boolean {
  return character.health > 0;
}

export function getDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

export function canMoveTo(character: Character, targetPos: Position, board: (Character | null)[][]): boolean {
  const distance = getDistance(character.position, targetPos);
  if (distance > character.movement) return false;
  if (targetPos.x < 0 || targetPos.x >= 16 || targetPos.y < 0 || targetPos.y >= 16) return false;
  if (board[targetPos.y][targetPos.x] !== null) return false;
  return true;
}

