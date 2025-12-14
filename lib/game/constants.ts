// Constantes du jeu

export const BOARD_SIZE = 16;
export const CHARACTER_START_HEALTH = 10;
export const CHARACTER_START_MOVEMENT = 5;

// Nombre de cases spÃ©ciales
export const SPECIAL_TILES_COUNT = {
  HEAL: 10,
  DAMAGE_BOOST: 10,
  MOVEMENT_BOOST: 10,
};

// Effets des cases spÃ©ciales
export const SPECIAL_TILE_EFFECTS = {
  HEAL: 3,
  DAMAGE_BOOST: 2,
  MOVEMENT_BOOST: 3,
};

// PortÃ©es d'attaque
export const ATTACK_RANGES = {
  WARRIOR: 1,
  MAGE: 4,
  THIEF_MELEE: 1,
  THIEF_RANGED: 4,
};

// DÃ©gÃ¢ts par type de personnage
export const DAMAGE_DICE = {
  WARRIOR: {
    vs_warrior: { dice: 6, sides: 6 },
    vs_mage: { dice: 1, sides: 4 },
    vs_thief: { dice: 1, sides: 10 },
  },
  MAGE: {
    vs_warrior: { dice: 1, sides: 10 },
    vs_mage: { dice: 1, sides: 6 },
    vs_thief: { dice: 1, sides: 4 },
  },
  THIEF: {
    vs_warrior: { dice: 1, sides: 4 },
    vs_mage: { dice: 1, sides: 10 },
    vs_thief: { dice: 1, sides: 6 },
  },
};

// ProbabilitÃ© de critique pour le voleur (50%)
export const THIEF_CRIT_CHANCE = 0.5;

// Nombre d'attaques par tour
export const ATTACKS_PER_TURN = {
  WARRIOR: 2,
  MAGE: 1,
  THIEF: 1,
};

