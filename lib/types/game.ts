// Types pour le jeu

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
  isAlive: boolean;
  damageBoost: number;
  movementBoost: number;
  attacksRemaining: number;
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
  currentCharacterIndex: number;
  selectedCharacter: Character | null;
  gameOver: boolean;
  winner: Team | null;
  turnCount: number;
  moveCount: number;
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

export interface GameStats {
  userId: string;
  gameId: string;
  won: boolean;
  turns: number;
  moves: number;
  duration: number;
  timestamp: Date;
}

export interface UserStats {
  userId: string;
  username: string;
  totalGames: number;
  wins: number;
  losses: number;
  averageTurnsPerWin: number;
  averageTurnsPerLoss: number;
  averageMovesPerWin: number;
  averageMovesPerLoss: number;
  recentGames: GameStats[];
}
