import { Character, CharacterType, AttackResult, Position } from './types';
import { getDistance } from './characters';
import { BASE_DAMAGE, getMultiplier, ATTACK_RANGES } from './constants';

// Calcul des dégâts avec le nouveau système de multiplicateurs
// Base damage + multiplicateur selon avantage/désavantage
export function calculateDamage(attacker: Character, target: Character): { damage: number; isCritical: boolean } {
  // Dégâts de base selon la classe de l'attaquant
  const baseDamage = BASE_DAMAGE[attacker.type.toUpperCase() as keyof typeof BASE_DAMAGE];
  
  // Multiplicateur selon l'avantage/désavantage (même logique pour alliés et ennemis)
  const multiplier = getMultiplier(attacker.type, target.type);
  
  // Calcul: (base * multiplicateur) arrondi au supérieur
  let damage = Math.ceil(baseDamage * multiplier);
  
  // Critique pour le voleur en corps à corps (50% de chance)
  const distance = getDistance(attacker.position, target.position);
  const isMelee = distance <= 1;
  const isCritical = attacker.type === 'thief' && isMelee && Math.random() < 0.5;
  
  if (isCritical) {
    damage *= 2;
  }
  
  // Ajouter le bonus de dégâts permanent
  damage += attacker.damageBoost;
  
  // Appliquer la réduction d'armure (minimum 0)
  damage = Math.max(0, damage - (target.armor || 0));
  
  return { damage, isCritical };
}

export function canAttack(attacker: Character, targetPos: Position, board: (Character | null)[][]): boolean {
  const distance = getDistance(attacker.position, targetPos);
  
  if (attacker.type === 'warrior') {
    // Guerrier: corps à corps uniquement (1 case)
    return distance === 1;
  } else if (attacker.type === 'mage') {
    // Mage: zone de 4 cases
    return distance <= 4;
  } else if (attacker.type === 'thief') {
    // Voleur: corps à corps ou distance (4 max)
    return distance >= 1 && distance <= 4;
  } else if (attacker.type === 'royal') {
    // Royal: corps à corps uniquement (1 case)
    return distance === 1;
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
    
    // Appliquer les dégâts au bouclier d'abord, puis à la vie
    let newShield = target.shield || 0;
    let newHealth = target.health;
    
    if (damage > 0) {
      if (newShield > 0) {
        const shieldDamage = Math.min(newShield, damage);
        newShield -= shieldDamage;
        const remainingDamage = damage - shieldDamage;
        newHealth = Math.max(0, newHealth - remainingDamage);
      } else {
        newHealth = Math.max(0, newHealth - damage);
      }
    }
    
    target.health = newHealth;
    target.shield = newShield;
    target.isAlive = newHealth > 0;
    
    attackResult.targets.push({
      character: target,
      damage,
      isCritical,
    });
  });
  
  // Le bonus de dégâts est permanent, on ne le réinitialise plus
  attacker.attacksRemaining--;
  
  return attackResult;
}

