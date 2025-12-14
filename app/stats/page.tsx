'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Game {
  id: number;
  won: boolean;
  turns: number;
  movements: number;
  created_at: string;
}

interface Stats {
  victories: number;
  defeats: number;
  total_games: number;
  total_turns: number;
  total_movements: number;
}

export default function StatsPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setGames(data.games || []);
        setStats(data.stats);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold mb-6">Statistiques</h1>
          
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-100 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{stats.victories}</div>
                <div className="text-sm text-gray-600">Victoires</div>
              </div>
              <div className="bg-red-100 p-4 rounded">
                <div className="text-2xl font-bold text-red-600">{stats.defeats}</div>
                <div className="text-sm text-gray-600">DÃ©faites</div>
              </div>
              <div className="bg-green-100 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">{stats.total_games}</div>
                <div className="text-sm text-gray-600">Parties totales</div>
              </div>
              <div className="bg-purple-100 p-4 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.total_games > 0 ? Math.round(stats.total_turns / stats.total_games) : 0}
                </div>
                <div className="text-sm text-gray-600">Tours moyens</div>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4">10 derniÃ¨res parties</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">RÃ©sultat</th>
                  <th className="p-2 text-left">Tours</th>
                  <th className="p-2 text-left">Mouvements</th>
                  <th className="p-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="border-b">
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded ${game.won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {game.won ? 'Victoire' : 'DÃ©faite'}
                      </span>
                    </td>
                    <td className="p-2">{game.turns}</td>
                    <td className="p-2">{game.movements}</td>
                    <td className="p-2">{new Date(game.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/game')}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
          >
            Nouvelle partie
          </button>
        </div>
      </div>
    </div>
  );
}

