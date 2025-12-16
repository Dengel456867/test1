'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GameView from '@/components/GameView';

interface User {
  username: string;
  id: string;
}

export default function GamePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Vérifier la session utilisateur
    const savedUser = localStorage.getItem('test1_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.username) {
          setUser(parsed);
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      }
    } else {
      router.push('/');
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('test1_user');
    router.push('/');
  };

  const handleGameEnd = (won: boolean, stats: any) => {
    // Sauvegarder les stats si nécessaire
    console.log('Game ended:', { won, stats });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="text-6xl mb-4 animate-float">🎮</div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <GameView 
      userId={user.id} 
      onGameEnd={handleGameEnd}
      onLogout={handleLogout}
    />
  );
}
