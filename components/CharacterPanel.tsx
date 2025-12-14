'use client';

import { Character } from '@/lib/types/game';

interface CharacterPanelProps {
  characters: Character[];
  teamName: string;
  currentCharacter: Character | null;
}

export default function CharacterPanel({ characters, teamName, currentCharacter }: CharacterPanelProps) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-white">{teamName}</h3>
      <div className="space-y-2">
        {characters.map(character => {
          const healthPercent = (character.health / character.maxHealth) * 100;
          const isCurrent = currentCharacter?.id === character.id;
          
          return (
            <div
              key={character.id}
              className={`p-3 rounded border-2 ${
                isCurrent ? 'border-yellow-400 bg-yellow-900/20' : 'border-gray-600 bg-gray-700'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-white capitalize">
                  {character.type} {isCurrent && '(Actif)'}
                </span>
                <span className={`text-sm ${character.isAlive ? 'text-green-400' : 'text-red-400'}`}>
                  {character.isAlive ? 'Vivant' : 'Mort'}
                </span>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>PV</span>
                  <span>{character.health}/{character.maxHealth}</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>Mouvement</span>
                  <span>{character.movement}/{character.maxMovement}</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(character.movement / character.maxMovement) * 100}%` }}
                  />
                </div>
              </div>
              
              {character.damageBoost > 0 && (
                <div className="text-xs text-red-400 mt-1">
                  Bonus dÃ©gÃ¢ts: +{character.damageBoost}
                </div>
              )}
              
              {character.movementBoost > 0 && (
                <div className="text-xs text-purple-400 mt-1">
                  Bonus mouvement: +{character.movementBoost}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

