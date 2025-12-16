import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { GameState, Position } from '@/lib/game/types';
import { canMoveTo } from '@/lib/game/characters';
import { checkSpecialTile, applySpecialTile } from '@/lib/game/board';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const { gameState, characterId, targetPosition } = await request.json();
    
    const character = [...gameState.playerTeam, ...gameState.enemyTeam].find(
      c => c.id === characterId
    );
    
    if (!character || character.team !== 'player') {
      return NextResponse.json({ error: 'Invalid character' }, { status: 400 });
    }
    
    if (gameState.currentTurn !== 'player') {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }
    
    if (character.movement <= 0) {
      return NextResponse.json({ error: 'No movement points left' }, { status: 400 });
    }
    
    const pos: Position = targetPosition;
    if (!canMoveTo(character, pos, gameState.board)) {
      return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }
    
    // Déplacer le personnage
    gameState.board[character.position.y][character.position.x] = null;
    character.position = pos;
    character.movement--;
    gameState.board[pos.y][pos.x] = character;
    gameState.movementCount++;
    
    // Vérifier les cases spéciales
    const specialTile = checkSpecialTile(pos, gameState.specialTiles);
    if (specialTile) {
      const updated = applySpecialTile(character, specialTile);
      Object.assign(character, updated);
    }
    
    return NextResponse.json({ gameState });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to move' },
      { status: 500 }
    );
  }
}

