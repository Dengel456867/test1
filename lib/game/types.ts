export type CharacterType = 'warrior' | 'mage' | 'thief';
export type Team = 'player' | 'enemy';
export type SpecialTileType = 'heal' | 'damage_boost' | 'movement_boost' | 'normal';

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
  damageBoost: number; // Bonus de dÃ©gÃ¢ts cumulÃ©s
  movementBoost: number; // Bonus de mouvement pour le prochain tour
  attacksRemaining: number; // Pour le guerrier qui peut attaquer 2 fois
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
  currentTurn: Team;
  selectedCharacter: Character | null;
  gameOver: boolean;
  winner: Team | null;
  turnCount: number;
  movementCount: number;
}

export interface AttackResult {
  attacker: Character;
  targets: Array<{
    character: Character;
    damage: number;
    isCritical: boolean;
  }>;
}

