'use client';

import { useState, useEffect } from 'react';
import GameBoard from './GameBoard';
import { GameState, Character, Position } from '@/lib/types/game';
import { initializeGame, moveCharacter, performAttack, endTurn } from '@/lib/game/gameLogic';
import { getEnemyMove } from '@/lib/ai/enemyAI';
import { APP_VERSION } from '@/lib/version';

interface GameViewProps {
  userId: string;
  onGameEnd: (won: boolean, stats: any) => void;
}

export default function GameView({ userId, onGameEnd }: GameViewProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [attackResult, setAttackResult] = useState<any>(null);
  
  useEffect(() => {
    const newGame = initializeGame();
    setGameState(newGame);
    setSelectedCharacter(newGame.playerTeam[0]);
  }, []);
  
  useEffect(() => {
    // Gérer le tour de l'IA
    if (gameState && gameState.currentTurn === 'enemy' && !gameState.gameOver) {
      const handleEnemyTurn = async () => {
        const currentChar = gameState.enemyTeam[gameState.currentCharacterIndex];
        if (!currentChar || !currentChar.isAlive) {
          const newState = endTurn(gameState);
          setGameState(newState);
          return;
        }
        
        const move = await getEnemyMove(gameState);
        
        let newState = gameState;
        
        if (move.action === 'move' && move.position && move.characterId) {
          newState = moveCharacter(gameState, move.characterId, move.position);
          setGameState(newState);
          
          // Attendre un peu avant la prochaine action
          setTimeout(() => {
            if (move.action === 'attack' && move.targetPosition && move.characterId) {
              const { gameState: updatedState } = performAttack(
                newState,
                move.characterId,
                move.targetPosition,
                move.isMelee || false
              );
              setGameState(endTurn(updatedState));
            } else {
              setGameState(endTurn(newState));
            }
          }, 500);
        } else if (move.action === 'attack' && move.targetPosition && move.characterId) {
          const { gameState: updatedState } = performAttack(
            gameState,
            move.characterId,
            move.targetPosition,
            move.isMelee || false
          );
          setGameState(endTurn(updatedState));
        } else {
          setGameState(endTurn(gameState));
        }
      };
      
      const timer = setTimeout(handleEnemyTurn, 1000);
      return () => clearTimeout(timer);
    }
    
    // Vérifier si le jeu est terminé
    if (gameState?.gameOver) {
      const won = gameState.winner === 'player';
      const stats = {
        userId,
        gameId: `game_${Date.now()}`,
        won,
        turns: gameState.turnCount,
        moves: gameState.moveCount,
        duration: 0, // À calculer
        timestamp: new Date(),
      };
      onGameEnd(won, stats);
    }
  }, [gameState, userId, onGameEnd]);
  
  if (!gameState) {
    return <div className="text-white flex items-center justify-center h-screen">Chargement...</div>;
  }
  
  const currentCharacter = gameState.currentTurn === 'player'
    ? gameState.playerTeam[gameState.currentCharacterIndex]
    : gameState.enemyTeam[gameState.currentCharacterIndex];
  
  const handleTileClick = (position: Position, isRightClick: boolean) => {
    if (gameState.currentTurn !== 'player' || gameState.gameOver) return;
    if (!selectedCharacter || !selectedCharacter.isAlive) return;
    
    if (isRightClick) {
      // Attaque
      const { gameState: newState, attackResult: result } = performAttack(
        gameState,
        selectedCharacter.id,
        position,
        selectedCharacter.type === 'warrior' || 
        (selectedCharacter.type === 'thief' && selectedCharacter.movement > 0)
      );
      
      if (result) {
        setAttackResult(result);
        setTimeout(() => setAttackResult(null), 2000);
      }
      
      setGameState(endTurn(newState));
    } else {
      // Mouvement
      const newState = moveCharacter(gameState, selectedCharacter.id, position);
      setGameState(newState);
      
      // Mettre à jour le personnage sélectionné
      const updated = newState.playerTeam.find(c => c.id === selectedCharacter.id);
      if (updated) setSelectedCharacter(updated);
    }
  };
  
  const handleEndTurn = () => {
    if (gameState.currentTurn === 'player') {
      setGameState(endTurn(gameState));
    }
  };

  const getCharacterEmoji = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'warrior': return '⚔️';
      case 'mage': return '🔮';
      case 'thief': return '🗡️';
      default: return '👤';
    }
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Version badge - coin supérieur droit */}
      <div className="absolute top-2 right-2 z-20 bg-purple-600/90 px-3 py-1 rounded-full text-white text-sm font-mono shadow-lg">
        v{APP_VERSION}
      </div>
      
      {/* Zone de jeu 3D - prend tout l'espace disponible en haut */}
      <div className="flex-1 relative">
        <GameBoard
          gameState={gameState}
          onTileClick={handleTileClick}
          selectedCharacter={selectedCharacter}
        />
        
        {/* Notification d'attaque */}
        {attackResult && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 p-4 bg-yellow-900/90 rounded-lg text-white shadow-lg z-20">
            <div className="font-bold text-lg">⚔️ Attaque !</div>
            {attackResult.targets.map((target: any, i: number) => (
              <div key={i} className="text-sm">
                {target.character.type} : -{target.damage} PV
                {target.isCritical && <span className="text-yellow-400 ml-2">💥 CRITIQUE!</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Panneau inférieur - UI compacte */}
      <div className="bg-gradient-to-t from-gray-900 via-gray-900/95 to-gray-900/80 border-t border-gray-700">
        {/* Barre d'actions */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">Test 1</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              gameState.currentTurn === 'player' ? 'bg-blue-600' : 'bg-red-600'
            }`}>
              {gameState.currentTurn === 'player' ? '🎮 Votre tour' : '🤖 Adversaire'}
            </span>
            <span className="text-gray-400 text-sm">Tour #{gameState.turnCount}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleEndTurn}
              disabled={gameState.currentTurn !== 'player'}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Finir le tour
            </button>
          </div>
        </div>
        
        {/* Contenu principal du panneau */}
        <div className="px-4 py-3">
          <div className="flex gap-4">
            {/* Sélection personnage */}
            <div className="flex-shrink-0">
              <h3 className="text-xs text-gray-400 mb-1">Personnage actif</h3>
              <div className="flex gap-1">
                {gameState.playerTeam
                  .filter(c => c.isAlive)
                  .map(char => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacter(char)}
                      className={`px-3 py-2 rounded text-sm font-bold transition-all ${
                        selectedCharacter?.id === char.id
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {getCharacterEmoji(char.type)} {char.type}
                    </button>
                  ))}
              </div>
            </div>
            
            {/* Stats du personnage sélectionné */}
            {selectedCharacter && (
              <div className="flex-shrink-0 bg-blue-900/50 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-400">❤️ {selectedCharacter.health}/{selectedCharacter.maxHealth}</span>
                  <span className="text-blue-400">👟 {selectedCharacter.movement}/{selectedCharacter.maxMovement}</span>
                  <span className="text-orange-400">⚔️ {selectedCharacter.attacksRemaining} attaque(s)</span>
                  {selectedCharacter.damageBoost > 0 && (
                    <span className="text-red-400">💥 +{selectedCharacter.damageBoost}</span>
                  )}
                  {selectedCharacter.movementBoost > 0 && (
                    <span className="text-purple-400">🏃 +{selectedCharacter.movementBoost}</span>
                  )}
                </div>
              </div>
            )}
            
            {/* Équipes */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              {/* Joueur */}
              <div className="bg-blue-900/30 p-2 rounded-lg">
                <h4 className="text-xs text-blue-300 mb-1">🎮 Joueur</h4>
                <div className="flex gap-1 flex-wrap">
                  {gameState.playerTeam.map(char => (
                    <CharacterMini key={char.id} character={char} getEmoji={getCharacterEmoji} />
                  ))}
                </div>
              </div>
              
              {/* Adversaire */}
              <div className="bg-red-900/30 p-2 rounded-lg">
                <h4 className="text-xs text-red-300 mb-1">🤖 Adversaire</h4>
                <div className="flex gap-1 flex-wrap">
                  {gameState.enemyTeam.map(char => (
                    <CharacterMini key={char.id} character={char} getEmoji={getCharacterEmoji} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CharacterMini({ character, getEmoji }: { character: Character; getEmoji: (type: string) => string }) {
  const healthPercent = (character.health / character.maxHealth) * 100;
  const isDead = !character.isAlive;
  
  return (
    <div className={`px-2 py-1 rounded text-xs ${isDead ? 'bg-gray-800 opacity-50' : 'bg-gray-700'}`}>
      <div className="flex items-center gap-1">
        <span>{getEmoji(character.type)}</span>
        <div className="w-12 bg-gray-600 rounded-full h-1">
          <div
            className={`h-1 rounded-full ${
              healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, healthPercent)}%` }}
          />
        </div>
        {isDead && <span>💀</span>}
      </div>
    </div>
  );
}
