// Constantes du jeu

export const BOARD_SIZE = 16;

// Stats par type de personnage
export const CHARACTER_STATS = {
  WARRIOR: {
    health: 15,
    movement: 4,
    attacksPerTurn: 2,
    initiative: 10,
  },
  MAGE: {
    health: 10,
    movement: 4,
    attacksPerTurn: 1,
    initiative: 11,
  },
  THIEF: {
    health: 12,
    movement: 5,
    attacksPerTurn: 1,
    initiative: 8,
  },
};

// Nombre de cases spéciales
export const SPECIAL_TILES_COUNT = {
  HEAL: 7,
  DAMAGE_BOOST: 7,
  MOVEMENT_BOOST: 7,
  INITIATIVE_BOOST: 7,
  ARMOR: 7,
  SHIELD: 7,
  REGENERATION: 7,
};

// Effets des cases spéciales (tous permanents jusqu'à fin de partie)
export const SPECIAL_TILE_EFFECTS = {
  HEAL_MAX_HP: 3,        // +3 PV max (permanent)
  HEAL_AMOUNT: 2,        // Soigne 2 PV (changé de 6 à 2)
  DAMAGE_BOOST: 1,       // +1 dégâts (permanent)
  MOVEMENT_BOOST: 1,     // +1 mouvement (permanent)
  INITIATIVE_BOOST: 1,   // -1 initiative (permanent)
  ARMOR: 1,              // -1 dégâts subis (permanent, cumulable)
  SHIELD: 4,             // +4 points de bouclier
  REGENERATION: 1,       // +1 PV régénéré par tour (permanent, cumulable)
};

// Portées d'attaque
export const ATTACK_RANGES = {
  WARRIOR: 1,        // Corps à corps uniquement
  MAGE: 3,           // Zone autour du mage (AOE)
  THIEF: 4,          // Jusqu'à 4 cases
};

// Dégâts de base par classe
export const BASE_DAMAGE = {
  WARRIOR: 5,
  MAGE: 5,
  THIEF: 6,
};

// Multiplicateurs de dégâts
export const DAMAGE_MULTIPLIERS = {
  ADVANTAGE: 1.5,      // x1.5 arrondi au supérieur
  NEUTRAL: 1.0,        // x1
  DISADVANTAGE: 0.7,   // x0.7 arrondi au supérieur
};

// Triangle d'avantages :
// Guerrier > Voleur > Mage > Guerrier
// (Pierre-Feuille-Ciseaux)
export const getMultiplier = (attackerType: string, defenderType: string): number => {
  const attacker = attackerType.toLowerCase();
  const defender = defenderType.toLowerCase();
  
  if (attacker === defender) return DAMAGE_MULTIPLIERS.NEUTRAL;
  
  // Guerrier a l'avantage sur Voleur, désavantage sur Mage
  if (attacker === 'warrior') {
    if (defender === 'thief') return DAMAGE_MULTIPLIERS.ADVANTAGE;
    if (defender === 'mage') return DAMAGE_MULTIPLIERS.DISADVANTAGE;
  }
  
  // Voleur a l'avantage sur Mage, désavantage sur Guerrier
  if (attacker === 'thief') {
    if (defender === 'mage') return DAMAGE_MULTIPLIERS.ADVANTAGE;
    if (defender === 'warrior') return DAMAGE_MULTIPLIERS.DISADVANTAGE;
  }
  
  // Mage a l'avantage sur Guerrier, désavantage sur Voleur
  if (attacker === 'mage') {
    if (defender === 'warrior') return DAMAGE_MULTIPLIERS.ADVANTAGE;
    if (defender === 'thief') return DAMAGE_MULTIPLIERS.DISADVANTAGE;
  }
  
  return DAMAGE_MULTIPLIERS.NEUTRAL;
};

// Ancien format pour compatibilité (sera supprimé)
export const DAMAGE_RANGES = {
  WARRIOR: {
    vs_warrior: { min: 5, max: 5 },
    vs_mage: { min: 4, max: 4 },
    vs_thief: { min: 8, max: 8 },
  },
  MAGE: {
    vs_warrior: { min: 8, max: 8 },
    vs_mage: { min: 5, max: 5 },
    vs_thief: { min: 4, max: 4 },
  },
  THIEF: {
    vs_warrior: { min: 5, max: 5 },
    vs_mage: { min: 9, max: 9 },
    vs_thief: { min: 6, max: 6 },
  },
};

// Nombre d'attaques par tour
export const ATTACKS_PER_TURN = {
  WARRIOR: 2,
  MAGE: 1,
  THIEF: 1,
};

// Ancien format pour compatibilité (sera supprimé)
export const DAMAGE_DICE = DAMAGE_RANGES;
export const THIEF_CRIT_CHANCE = 0.5;
