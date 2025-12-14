import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { initializeGame } from '@/lib/game/board';

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
    
    const gameState = initializeGame();
    
    return NextResponse.json({ gameState });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to start game' },
      { status: 500 }
    );
  }
}

