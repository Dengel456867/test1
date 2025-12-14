'use client';

import { GameState, Character } from '@/lib/game/types';

interface GameUIProps {
  gameState: GameState;
  onEndTurn: () => void;
}

export default function GameUI({ gameState, onEndTurn }: GameUIProps) {
  const selectedCharacter = gameState.selectedCharacter;

  return (
    <div className="absolute top-4 left-4 right-4 z-10">
      <div className="bg-black bg-opacity-70 text-white p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Tour: {gameState.currentTurn === 'player' ? 'Joueur' : 'Adversaire'}
          </h2>
          <button
            onClick={onEndTurn}
            disabled={gameState.currentTurn !== 'player' || !selectedCharacter}
            className="bg-red-600 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Finir le tour
          </button>
        </div>

        {selectedCharacter && (
          <div className="mb-4 p-2 bg-blue-900 rounded">
            <h3 className="font-bold">
              {selectedCharacter.type} ({selectedCharacter.team === 'player' ? 'Joueur' : 'Adversaire'})
            </h3>
            <div>PV: {selectedCharacter.health}/{selectedCharacter.maxHealth}</div>
            <div>Mouvement: {selectedCharacter.movement}/{selectedCharacter.maxMovement}</div>
            <div>Attaques restantes: {selectedCharacter.attacksRemaining}</div>
            {selectedCharacter.damageBoost > 0 && (
              <div className="text-red-400">Bonus dÃ©gÃ¢ts: +{selectedCharacter.damageBoost}</div>
            )}
            {selectedCharacter.movementBoost > 0 && (
              <div className="text-purple-400">Bonus mouvement: +{selectedCharacter.movementBoost}</div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-2">Ã‰quipe Joueur</h3>
            {gameState.playerTeam.map((char) => (
              <CharacterStatus key={char.id} character={char} />
            ))}
          </div>
          <div>
            <h3 className="font-bold mb-2">Ã‰quipe Adversaire</h3>
            {gameState.enemyTeam.map((char) => (
              <CharacterStatus key={char.id} character={char} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CharacterStatus({ character }: { character: Character }) {
  const healthPercent = (character.health / character.maxHealth) * 100;
  const isDead = character.health <= 0;

  return (
    <div className={`mb-2 p-2 rounded ${isDead ? 'bg-gray-800' : 'bg-gray-700'}`}>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-bold">{character.type}</span>
        <span>{character.health}/{character.maxHealth} PV</span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.max(0, healthPercent)}%` }}
        />
      </div>
      {isDead && <span className="text-red-400 text-xs">MORT</span>}
    </div>
  );
}

