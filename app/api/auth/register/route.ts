import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { initDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await initDB();
    
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    const user = await registerUser(username, password);
    
    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
