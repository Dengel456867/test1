// Constantes du jeu

export const BOARD_SIZE = 16;

// Stats par type de personnage
export const CHARACTER_STATS = {
  WARRIOR: {
    health: 15,
    movement: 3,
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
  ROYAL: {
    health: 13,
    movement: 4,
    attacksPerTurn: 1,
    initiative: 9,
  },
};

// Nombre de cases spÃ©ciales
export const SPECIAL_TILES_COUNT = {
  HEAL: 7,
  DAMAGE_BOOST: 7,
  MOVEMENT_BOOST: 7,
  INITIATIVE_BOOST: 7,
  ARMOR: 7,
  SHIELD: 7,
  REGENERATION: 7,
};

// Effets des cases spÃ©ciales (tous permanents jusqu'Ã  fin de partie)
export const SPECIAL_TILE_EFFECTS = {
  HEAL_MAX_HP: 3,        // +3 PV max (permanent)
  HEAL_AMOUNT: 2,        // Soigne 2 PV (changÃ© de 6 Ã  2)
  DAMAGE_BOOST: 1,       // +1 dÃ©gÃ¢ts (permanent)
  MOVEMENT_BOOST: 1,     // +1 mouvement (permanent)
  INITIATIVE_BOOST: 1,   // -1 initiative (permanent)
  ARMOR: 1,              // -1 dÃ©gÃ¢ts subis (permanent, cumulable)
  SHIELD: 4,             // +4 points de bouclier
  REGENERATION: 1,       // +1 PV rÃ©gÃ©nÃ©rÃ© par tour (permanent, cumulable)
};

// PortÃ©es d'attaque
export const ATTACK_RANGES = {
  WARRIOR: 1,        // Corps Ã  corps uniquement
  MAGE: 3,           // Zone autour du mage (AOE)
  THIEF: 4,          // Jusqu'Ã  4 cases
  ROYAL: 1,          // Corps Ã  corps uniquement
};

// DÃ©gÃ¢ts de base par classe
export const BASE_DAMAGE = {
  WARRIOR: 5,
  MAGE: 5,
  THIEF: 6,
  ROYAL: 7,
};

// Multiplicateurs de dÃ©gÃ¢ts
export const DAMAGE_MULTIPLIERS = {
  ADVANTAGE: 1.5,      // x1.5 arrondi au supÃ©rieur
  NEUTRAL: 1.0,        // x1
  DISADVANTAGE: 0.7,   // x0.7 arrondi au supÃ©rieur
};

// Triangle d'avantages :
// Guerrier > Voleur > Mage > Guerrier
// (Pierre-Feuille-Ciseaux)
// Royal : avantage vs Royal, neutre sinon
export const getMultiplier = (attackerType: string, defenderType: string): number => {
  const attacker = attackerType.toLowerCase();
  const defender = defenderType.toLowerCase();
  
  // Royal a l'avantage uniquement contre un autre Royal
  if (attacker === 'royal') {
    if (defender === 'royal') return DAMAGE_MULTIPLIERS.ADVANTAGE;
    return DAMAGE_MULTIPLIERS.NEUTRAL; // Neutre contre tous les autres
  }
  
  // Les autres classes sont neutres contre Royal
  if (defender === 'royal') {
    return DAMAGE_MULTIPLIERS.NEUTRAL;
  }
  
  if (attacker === defender) return DAMAGE_MULTIPLIERS.NEUTRAL;
  
  // Guerrier a l'avantage sur Voleur, dÃ©savantage sur Mage
  if (attacker === 'warrior') {
    if (defender === 'thief') return DAMAGE_MULTIPLIERS.ADVANTAGE;
    if (defender === 'mage') return DAMAGE_MULTIPLIERS.DISADVANTAGE;
  }
  
  // Voleur a l'avantage sur Mage, dÃ©savantage sur Guerrier
  if (attacker === 'thief') {
    if (defender === 'mage') return DAMAGE_MULTIPLIERS.ADVANTAGE;
    if (defender === 'warrior') return DAMAGE_MULTIPLIERS.DISADVANTAGE;
  }
  
  // Mage a l'avantage sur Guerrier, dÃ©savantage sur Voleur
  if (attacker === 'mage') {
    if (defender === 'warrior') return DAMAGE_MULTIPLIERS.ADVANTAGE;
    if (defender === 'thief') return DAMAGE_MULTIPLIERS.DISADVANTAGE;
  }
  
  return DAMAGE_MULTIPLIERS.NEUTRAL;
};

// Ancien format pour compatibilitÃ© (sera supprimÃ©)
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
  ROYAL: 1,
};

// Ancien format pour compatibilitÃ© (sera supprimÃ©)
export const DAMAGE_DICE = DAMAGE_RANGES;
export const THIEF_CRIT_CHANCE = 0.5;
