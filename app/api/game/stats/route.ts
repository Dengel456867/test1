// API route pour les statistiques

import { NextRequest, NextResponse } from 'next/server';
import { getUserStats } from '@/lib/db/stats';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'UserId required' },
        { status: 400 }
      );
    }
    
    const stats = getUserStats(userId);
    
    if (!stats) {
      return NextResponse.json({
        totalGames: 0,
        wins: 0,
        losses: 0,
        recentGames: [],
      });
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

