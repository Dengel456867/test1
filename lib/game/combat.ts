import { Character, CharacterType, AttackResult, Position } from './types';
import { getDistance } from './characters';

// Matrice de dÃ©gÃ¢ts selon les types
const DAMAGE_MATRIX: Record<CharacterType, Record<CharacterType, { dice: number; sides: number }>> = {
  warrior: {
    warrior: { dice: 1, sides: 6 },
    mage: { dice: 1, sides: 4 },
    thief: { dice: 1, sides: 10 },
  },
  mage: {
    warrior: { dice: 1, sides: 10 },
    mage: { dice: 1, sides: 6 },
    thief: { dice: 1, sides: 4 },
  },
  thief: {
    warrior: { dice: 1, sides: 4 },
    mage: { dice: 1, sides: 10 },
    thief: { dice: 1, sides: 6 },
  },
};

function rollDice(dice: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < dice; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

export function calculateDamage(attacker: Character, target: Character): { damage: number; isCritical: boolean } {
  const damageConfig = DAMAGE_MATRIX[attacker.type][target.type];
  let damage = rollDice(damageConfig.dice, damageConfig.sides);
  const isCritical = attacker.type === 'thief' && Math.random() < 0.5;
  
  if (isCritical) {
    damage *= 2;
  }
  
  // Ajouter le bonus de dÃ©gÃ¢ts
  damage += attacker.damageBoost;
  
  return { damage, isCritical };
}

export function canAttack(attacker: Character, targetPos: Position, board: (Character | null)[][]): boolean {
  const distance = getDistance(attacker.position, targetPos);
  
  if (attacker.type === 'warrior') {
    // Guerrier: corps Ã  corps uniquement (1 case)
    return distance === 1;
  } else if (attacker.type === 'mage') {
    // Mage: zone de 4 cases
    return distance <= 4;
  } else if (attacker.type === 'thief') {
    // Voleur: corps Ã  corps ou distance (4 max)
    return distance >= 1 && distance <= 4;
  }
  
  return false;
}

export function getAttackTargets(
  attacker: Character,
  targetPos: Position,
  board: (Character | null)[][],
  allCharacters: Character[]
): Character[] {
  const targets: Character[] = [];
  
  if (attacker.type === 'mage') {
    // Mage: zone autour de la position cible
    for (let y = Math.max(0, targetPos.y - 4); y <= Math.min(15, targetPos.y + 4); y++) {
      for (let x = Math.max(0, targetPos.x - 4); x <= Math.min(15, targetPos.x + 4); x++) {
        const distance = getDistance(targetPos, { x, y });
        if (distance <= 4) {
          const character = board[y][x];
          if (character && character.id !== attacker.id) {
            targets.push(character);
          }
        }
      }
    }
  } else {
    // Guerrier et Voleur: une seule cible
    const character = board[targetPos.y]?.[targetPos.x];
    if (character && character.id !== attacker.id) {
      targets.push(character);
    }
  }
  
  return targets;
}

export function executeAttack(
  attacker: Character,
  targetPos: Position,
  board: (Character | null)[][],
  allCharacters: Character[]
): AttackResult {
  const targets = getAttackTargets(attacker, targetPos, board, allCharacters);
  
  const attackResult: AttackResult = {
    attacker,
    targets: [],
  };
  
  targets.forEach(target => {
    const { damage, isCritical } = calculateDamage(attacker, target);
    target.health = Math.max(0, target.health - damage);
    
    attackResult.targets.push({
      character: target,
      damage,
      isCritical,
    });
  });
  
  // RÃ©initialiser le bonus de dÃ©gÃ¢ts aprÃ¨s l'attaque
  attacker.damageBoost = 0;
  attacker.attacksRemaining--;
  
  return attackResult;
}

