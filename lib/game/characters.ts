import { Character, CharacterType, Team, Position } from './types';

export function createCharacter(
  type: CharacterType,
  team: Team,
  position: Position,
  id?: string
): Character {
  const baseCharacter: Character = {
    id: id || `${team}-${type}-${Date.now()}`,
    type,
    team,
    position,
    health: 10,
    maxHealth: 10,
    movement: 5,
    maxMovement: 5,
    isAlive: true,
    damageBoost: 0,
    movementBoost: 0,
    attacksRemaining: type === 'warrior' ? 2 : 1,
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

