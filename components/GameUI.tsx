'use client';

import { GameState, Character } from '@/lib/game/types';
import { APP_VERSION } from '@/lib/version';

interface GameUIProps {
  gameState: GameState;
  onEndTurn: () => void;
}

export default function GameUI({ gameState, onEndTurn }: GameUIProps) {
  const selectedCharacter = gameState.selectedCharacter;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      {/* Version en haut Ã  droite */}
      <div className="absolute top-4 right-4 bg-purple-600 px-3 py-1 rounded-full text-white text-sm font-mono shadow-lg">
        v{APP_VERSION}
      </div>
      
      {/* Panneau d'info en bas */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4">
        {/* Barre de tour et actions */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Test 1</h1>
            <span className="text-lg text-yellow-400">
              Tour: {gameState.currentTurn === 'player' ? 'ðŸŽ® Joueur' : 'ðŸ¤– Adversaire'}
            </span>
          </div>
          <button
            onClick={onEndTurn}
            disabled={gameState.currentTurn !== 'player' || !selectedCharacter}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Finir le tour
          </button>
        </div>

        {/* Personnage sÃ©lectionnÃ© */}
        {selectedCharacter && (
          <div className="mb-3 p-3 bg-blue-900/80 rounded-lg inline-block">
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg">{getCharacterEmoji(selectedCharacter.type)} {selectedCharacter.type}</span>
              <span className="text-green-400">â¤ï¸ {selectedCharacter.health}/{selectedCharacter.maxHealth}</span>
              <span className="text-blue-400">ðŸ‘Ÿ {selectedCharacter.movement}/{selectedCharacter.maxMovement}</span>
              <span className="text-orange-400">âš”ï¸ {selectedCharacter.attacksRemaining}</span>
              {selectedCharacter.damageBoost > 0 && (
                <span className="text-red-400">ðŸ’¥ +{selectedCharacter.damageBoost}</span>
              )}
              {selectedCharacter.movementBoost > 0 && (
                <span className="text-purple-400">ðŸƒ +{selectedCharacter.movementBoost}</span>
              )}
            </div>
          </div>
        )}

        {/* Ã‰quipes cÃ´te Ã  cÃ´te */}
        <div className="grid grid-cols-2 gap-4">
          <TeamPanel title="ðŸŽ® Joueur" characters={gameState.playerTeam} isPlayer={true} />
          <TeamPanel title="ðŸ¤– Adversaire" characters={gameState.enemyTeam} isPlayer={false} />
        </div>
      </div>
    </div>
  );
}

function getCharacterEmoji(type: string): string {
  switch (type.toLowerCase()) {
    case 'warrior': return 'âš”ï¸';
    case 'mage': return 'ðŸ”®';
    case 'thief': return 'ðŸ—¡ï¸';
    default: return 'ðŸ‘¤';
  }
}

function TeamPanel({ title, characters, isPlayer }: { title: string; characters: Character[]; isPlayer: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${isPlayer ? 'bg-blue-900/50' : 'bg-red-900/50'}`}>
      <h3 className="font-bold mb-2 text-sm">{title}</h3>
      <div className="flex gap-2 flex-wrap">
        {characters.map((char) => (
          <CharacterStatus key={char.id} character={char} />
        ))}
      </div>
    </div>
  );
}

function CharacterStatus({ character }: { character: Character }) {
  const healthPercent = (character.health / character.maxHealth) * 100;
  const isDead = character.health <= 0;

  return (
    <div className={`p-2 rounded ${isDead ? 'bg-gray-800/80 opacity-50' : 'bg-gray-700/80'} min-w-[120px]`}>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold">{getCharacterEmoji(character.type)} {character.type}</span>
        <span>{character.health}/{character.maxHealth}</span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${
            healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.max(0, healthPercent)}%` }}
        />
      </div>
      {isDead && <span className="text-red-400 text-xs">ðŸ’€</span>}
    </div>
  );
}
