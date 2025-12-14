'use client';

import { UserStats } from '@/lib/types/game';

interface StatsViewProps {
  stats: UserStats;
}

export default function StatsView({ stats }: StatsViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-3xl font-bold text-white mb-6">Statistiques</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-700 p-4 rounded">
          <div className="text-gray-400 text-sm">Parties totales</div>
          <div className="text-2xl font-bold text-white">{stats.totalGames}</div>
        </div>
        
        <div className="bg-green-900/30 p-4 rounded border border-green-500">
          <div className="text-green-400 text-sm">Victoires</div>
          <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
        </div>
        
        <div className="bg-red-900/30 p-4 rounded border border-red-500">
          <div className="text-red-400 text-sm">DÃ©faites</div>
          <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
        </div>
        
        <div className="bg-blue-900/30 p-4 rounded border border-blue-500">
          <div className="text-blue-400 text-sm">Taux de victoire</div>
          <div className="text-2xl font-bold text-blue-400">
            {stats.totalGames > 0
              ? Math.round((stats.wins / stats.totalGames) * 100)
              : 0}%
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-bold text-white mb-4">Moyennes - Victoires</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Tours par partie:</span>
              <span className="text-white font-semibold">{stats.averageTurnsPerWin}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Mouvements par partie:</span>
              <span className="text-white font-semibold">{stats.averageMovesPerWin}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-bold text-white mb-4">Moyennes - DÃ©faites</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Tours par partie:</span>
              <span className="text-white font-semibold">{stats.averageTurnsPerLoss}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Mouvements par partie:</span>
              <span className="text-white font-semibold">{stats.averageMovesPerLoss}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-700 p-4 rounded">
        <h3 className="text-lg font-bold text-white mb-4">10 derniÃ¨res parties</h3>
        <div className="space-y-2">
          {stats.recentGames.length === 0 ? (
            <div className="text-gray-400">Aucune partie enregistrÃ©e</div>
          ) : (
            stats.recentGames.map((game, index) => (
              <div
                key={game.gameId}
                className={`p-3 rounded flex justify-between items-center ${
                  game.won ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'
                }`}
              >
                <div>
                  <span className={`font-semibold ${game.won ? 'text-green-400' : 'text-red-400'}`}>
                    {game.won ? 'Victoire' : 'DÃ©faite'}
                  </span>
                  <span className="text-gray-400 text-sm ml-2">
                    {new Date(game.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-gray-300">
                  {game.turns} tours â€¢ {game.moves} mouvements
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

