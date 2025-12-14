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
  const [isEnemyThinking, setIsEnemyThinking] = useState(false);
  
  useEffect(() => {
    const newGame = initializeGame();
    setGameState(newGame);
    setSelectedCharacter(newGame.playerTeam[0]);
  }, []);
  
  useEffect(() => {
    // Gérer le tour de l'IA
    if (gameState && gameState.currentTurn === 'enemy' && !gameState.gameOver && !isEnemyThinking) {
      setIsEnemyThinking(true);
      
      const handleEnemyTurn = async () => {
        // Trouver le premier personnage vivant de l'ennemi
        const aliveEnemies = gameState.enemyTeam.filter(c => c.isAlive);
        if (aliveEnemies.length === 0) {
          setGameState(endTurn(gameState));
          setIsEnemyThinking(false);
          return;
        }
        
        const currentEnemy = aliveEnemies[0];
        const move = await getEnemyMove(gameState);
        
        let newState = gameState;
        
        // Mouvement
        if (move.action === 'move' && move.position && move.characterId) {
          newState = moveCharacter(gameState, move.characterId, move.position);
        }
        
        // Attaque
        if (move.targetPosition && move.characterId) {
          const { gameState: updatedState, attackResult: result } = performAttack(
            newState,
            move.characterId,
            move.targetPosition,
            move.isMelee || false
          );
          newState = updatedState;
          
          if (result) {
            setAttackResult(result);
            setTimeout(() => setAttackResult(null), 1500);
          }
        }
        
        // Fin du tour ennemi → tour du joueur
        const finalState = endTurn(newState);
        setGameState(finalState);
        setIsEnemyThinking(false);
      };
      
      const timer = setTimeout(handleEnemyTurn, 800);
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
        duration: 0,
        timestamp: new Date(),
      };
      onGameEnd(won, stats);
    }
  }, [gameState, userId, onGameEnd, isEnemyThinking]);
  
  if (!gameState) {
    return <div className="text-white flex items-center justify-center h-screen">Chargement...</div>;
  }
  
  const handleTileClick = (position: Position, isRightClick: boolean) => {
    if (gameState.currentTurn !== 'player' || gameState.gameOver) return;
    if (!selectedCharacter || !selectedCharacter.isAlive) return;
    
    if (isRightClick) {
      // Attaque → fin du tour
      const { gameState: newState, attackResult: result } = performAttack(
        gameState,
        selectedCharacter.id,
        position,
        selectedCharacter.type === 'warrior' || 
        (selectedCharacter.type === 'thief' && selectedCharacter.movement > 0)
      );
      
      if (result) {
        setAttackResult(result);
        setTimeout(() => setAttackResult(null), 1500);
      }
      
      // Après l'attaque, c'est au tour de l'adversaire
      setGameState(endTurn(newState));
    } else {
      // Mouvement (sans fin de tour)
      const newState = moveCharacter(gameState, selectedCharacter.id, position);
      setGameState(newState);
      
      const updated = newState.playerTeam.find(c => c.id === selectedCharacter.id);
      if (updated) setSelectedCharacter(updated);
    }
  };
  
  const handleEndTurn = () => {
    if (gameState.currentTurn === 'player') {
      setGameState(endTurn(gameState));
    }
  };

  const getEmoji = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'warrior': return '⚔️';
      case 'mage': return '🔮';
      case 'thief': return '🗡️';
      default: return '👤';
    }
  };
  
  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Version - coin supérieur droit */}
      <div className="absolute top-1 right-1 z-20 bg-purple-600/80 px-2 py-0.5 rounded text-white text-xs font-mono">
        v{APP_VERSION}
      </div>
      
      {/* Zone 3D - maximisée */}
      <div className="flex-1 relative min-h-0">
        <GameBoard
          gameState={gameState}
          onTileClick={handleTileClick}
          selectedCharacter={selectedCharacter}
        />
        
        {/* Indicateur tour adversaire */}
        {gameState.currentTurn === 'enemy' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-1 rounded-full text-white text-sm font-bold animate-pulse z-20">
            🤖 L'adversaire joue...
          </div>
        )}
        
        {/* Notification d'attaque */}
        {attackResult && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 p-3 bg-yellow-900/95 rounded-lg text-white shadow-lg z-20">
            <div className="font-bold">⚔️ Attaque !</div>
            {attackResult.targets.map((t: any, i: number) => (
              <div key={i} className="text-sm">
                {t.character.type}: -{t.damage} PV {t.isCritical && '💥 CRIT!'}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* UI compacte en bas - hauteur fixe réduite */}
      <div className="h-20 bg-gray-900/95 border-t border-gray-700 flex items-center px-3 gap-3">
        {/* Tour actuel */}
        <div className={`px-3 py-1 rounded text-sm font-bold ${
          gameState.currentTurn === 'player' ? 'bg-blue-600' : 'bg-red-600'
        }`}>
          {gameState.currentTurn === 'player' ? '🎮' : '🤖'} Tour #{gameState.turnCount}
        </div>
        
        {/* Sélection personnage */}
        <div className="flex gap-1">
          {gameState.playerTeam.filter(c => c.isAlive).map(char => (
            <button
              key={char.id}
              onClick={() => setSelectedCharacter(char)}
              className={`px-2 py-1 rounded text-xs font-bold ${
                selectedCharacter?.id === char.id
                  ? 'bg-blue-600 ring-1 ring-blue-400'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {getEmoji(char.type)}
            </button>
          ))}
        </div>
        
        {/* Stats personnage sélectionné */}
        {selectedCharacter && (
          <div className="flex items-center gap-2 text-xs bg-gray-800 px-2 py-1 rounded">
            <span className="font-bold">{getEmoji(selectedCharacter.type)}</span>
            <span className="text-green-400">❤️{selectedCharacter.health}</span>
            <span className="text-blue-400">👟{selectedCharacter.movement}</span>
            <span className="text-orange-400">⚔️{selectedCharacter.attacksRemaining}</span>
          </div>
        )}
        
        {/* Équipes mini */}
        <div className="flex-1 flex gap-2 justify-center">
          <div className="flex gap-0.5">
            {gameState.playerTeam.map(c => (
              <span key={c.id} className={`text-xs ${c.isAlive ? 'text-blue-400' : 'text-gray-600'}`}>
                {c.isAlive ? getEmoji(c.type) : '💀'}
              </span>
            ))}
          </div>
          <span className="text-gray-500">vs</span>
          <div className="flex gap-0.5">
            {gameState.enemyTeam.map(c => (
              <span key={c.id} className={`text-xs ${c.isAlive ? 'text-red-400' : 'text-gray-600'}`}>
                {c.isAlive ? getEmoji(c.type) : '💀'}
              </span>
            ))}
          </div>
        </div>
        
        {/* Bouton fin de tour */}
        <button
          onClick={handleEndTurn}
          disabled={gameState.currentTurn !== 'player'}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Fin tour
        </button>
      </div>
    </div>
  );
}
