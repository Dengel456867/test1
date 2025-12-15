import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { initDB } from '@/lib/db';

// Compte admin hardcodé
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '0000';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Vérifier le compte admin en premier
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const adminResult = {
        token: 'admin-token-' + Date.now(),
        user: { id: 'admin', username: 'admin' },
        userId: 'admin'
      };
      
      const response = NextResponse.json(adminResult);
      response.cookies.set('token', adminResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      
      return response;
    }
    
    // Sinon, login normal via la base de données
    await initDB();
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
