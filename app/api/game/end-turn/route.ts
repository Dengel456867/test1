import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { GameState } from '@/lib/game/types';
import { resetCharacterTurn } from '@/lib/game/characters';

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
    
    const { gameState, characterId } = await request.json();
    
    if (gameState.currentTurn !== 'player') {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }
    
    // Passer au tour de l'adversaire
    gameState.currentTurn = 'enemy';
    gameState.turnCount++;
    gameState.selectedCharacter = null;
    
    return NextResponse.json({ gameState });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to end turn' },
      { status: 500 }
    );
  }
}

