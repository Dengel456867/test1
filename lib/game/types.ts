export type CharacterType = 'warrior' | 'mage' | 'thief' | 'royal';
export type Team = 'player' | 'enemy';
export type SpecialTileType = 'heal' | 'damage_boost' | 'movement_boost' | 'initiative_boost' | 'armor' | 'shield' | 'regeneration' | 'star' | 'normal';

export interface Position {
  x: number;
  y: number;
}

export interface Character {
  id: string;
  type: CharacterType;
  team: Team;
  position: Position;
  health: number;
  maxHealth: number;
  movement: number;
  maxMovement: number;
  isAlive: boolean;
  damageBoost: number; // Bonus de dÃ©gÃ¢ts cumulÃ©s
  movementBoost: number; // Bonus de mouvement pour le prochain tour
  attacksRemaining: number; // Pour le guerrier qui peut attaquer 2 fois
  initiative: number; // Initiative pour l'ordre de jeu (plus bas = joue en premier)
  armor: number; // RÃ©duction de dÃ©gÃ¢ts subis (permanent)
  shield: number; // Points de bouclier (absorbent les dÃ©gÃ¢ts avant la vie)
  regeneration: number; // PV rÃ©gÃ©nÃ©rÃ©s par tour
}

export interface SpecialTile {
  position: Position;
  type: SpecialTileType;
  used: boolean;
}

export interface GameState {
  board: (Character | null)[][];
  playerTeam: Character[];
  enemyTeam: Character[];
  specialTiles: SpecialTile[];
  currentTurn: Team; // ConservÃ© pour compatibilitÃ©, mais basÃ© sur le personnage actif
  currentCharacterIndex: number;
  selectedCharacter: Character | null;
  gameOver: boolean;
  winner: Team | null;
  turnCount: number; // Tour global
  moveCount: number;
  movementCount: number;
  // Nouveau systÃ¨me de tour global
  turnOrder: string[]; // IDs des personnages dans l'ordre d'initiative
  currentTurnOrderIndex: number; // Index dans turnOrder
}

export interface AttackResult {
  attacker: Character;
  targets: Array<{
    character: Character;
    damage: number;
    isCritical: boolean;
  }>;
}
