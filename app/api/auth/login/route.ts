import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
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
    
    const result = await loginUser(username, password);
    
    const response = NextResponse.json(result);
    response.cookies.set('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}
