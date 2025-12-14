// Constantes du jeu

export const BOARD_SIZE = 16;

// Stats par type de personnage
export const CHARACTER_STATS = {
  WARRIOR: {
    health: 15,
    movement: 4,
    attacksPerTurn: 2,
  },
  MAGE: {
    health: 10,
    movement: 4,
    attacksPerTurn: 1,
  },
  THIEF: {
    health: 12,
    movement: 5,
    attacksPerTurn: 1,
  },
};

// Nombre de cases spéciales
export const SPECIAL_TILES_COUNT = {
  HEAL: 10,
  DAMAGE_BOOST: 10,
  MOVEMENT_BOOST: 10,
};

// Effets des cases spéciales
export const SPECIAL_TILE_EFFECTS = {
  HEAL: 3,
  DAMAGE_BOOST: 2,
  MOVEMENT_BOOST: 3,
};

// Portées d'attaque
export const ATTACK_RANGES = {
  WARRIOR: 1,        // Corps à corps uniquement
  MAGE: 3,           // Zone autour du mage (AOE)
  THIEF: 4,          // Jusqu'à 4 cases
};

// Dégâts par type d'attaquant vs type de cible (min-max)
export const DAMAGE_RANGES = {
  WARRIOR: {
    vs_warrior: { min: 4, max: 6 },
    vs_mage: { min: 2, max: 4 },
    vs_thief: { min: 6, max: 10 },
  },
  MAGE: {
    vs_warrior: { min: 6, max: 10 },
    vs_mage: { min: 4, max: 6 },
    vs_thief: { min: 2, max: 4 },
  },
  THIEF: {
    vs_warrior: { min: 2, max: 4 },
    vs_mage: { min: 6, max: 10 },
    vs_thief: { min: 4, max: 6 },
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
