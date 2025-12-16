import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { GameState, Position } from '@/lib/game/types';
import { canAttack, executeAttack } from '@/lib/game/combat';
import { checkGameOver } from '@/lib/game/board';

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
    
    if (character.attacksRemaining <= 0) {
      return NextResponse.json({ error: 'No attacks remaining' }, { status: 400 });
    }
    
    const pos: Position = targetPosition;
    if (!canAttack(character, pos, gameState.board)) {
      return NextResponse.json({ error: 'Cannot attack this position' }, { status: 400 });
    }
    
    const allCharacters = [...gameState.playerTeam, ...gameState.enemyTeam];
    const attackResult = executeAttack(character, pos, gameState.board, allCharacters);
    
    // Vérifier si le jeu est terminé
    const { gameOver, winner } = checkGameOver(gameState);
    gameState.gameOver = gameOver;
    gameState.winner = winner;
    
    // Finir le tour après l'attaque
    gameState.currentTurn = 'enemy';
    gameState.turnCount++;
    
    return NextResponse.json({ gameState, attackResult });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to attack' },
      { status: 500 }
    );
  }
}

