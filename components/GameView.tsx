'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Initialisation
  useEffect(() => {
    const newGame = initializeGame();
    setGameState(newGame);
    setSelectedCharacter(newGame.playerTeam.find(c => c.isAlive) || null);
  }, []);
  
  // Tour de l'IA
  useEffect(() => {
    if (!gameState || gameState.gameOver || isProcessing) return;
    if (gameState.currentTurn !== 'enemy') return;
    
    setIsProcessing(true);
    
    const executeEnemyTurn = async () => {
      // Trouver un personnage ennemi vivant
      const aliveEnemy = gameState.enemyTeam.find(c => c.isAlive);
      if (!aliveEnemy) {
        setGameState(prev => prev ? endTurn(prev) : prev);
        setIsProcessing(false);
        return;
      }
      
      // Attendre un peu pour que le joueur voie que c'est le tour de l'IA
      await new Promise(r => setTimeout(r, 1000));
      
      // Obtenir le mouvement de l'IA
      const move = await getEnemyMove(gameState);
      
      let currentState = gameState;
      
      // Exécuter le mouvement
      if (move.action === 'move' && move.position && move.characterId) {
        currentState = moveCharacter(currentState, move.characterId, move.position);
        setGameState(currentState);
        await new Promise(r => setTimeout(r, 500));
      }
      
      // Exécuter l'attaque
      if (move.action === 'attack' && move.targetPosition && move.characterId) {
        const { gameState: newState, attackResult: result } = performAttack(
          currentState,
          move.characterId,
          move.targetPosition,
          move.isMelee ?? true
        );
        currentState = newState;
        
        if (result) {
          setAttackResult(result);
          await new Promise(r => setTimeout(r, 1200));
          setAttackResult(null);
        }
      }
      
      // Fin du tour de l'IA → retour au joueur
      const finalState = endTurn(currentState);
      setGameState(finalState);
      setIsProcessing(false);
      
      // Sélectionner automatiquement un personnage joueur vivant
      const alivePlayer = finalState.playerTeam.find(c => c.isAlive);
      if (alivePlayer) setSelectedCharacter(alivePlayer);
    };
    
    executeEnemyTurn();
  }, [gameState?.currentTurn, gameState?.turnCount]);
  
  // Fin de partie
  useEffect(() => {
    if (gameState?.gameOver) {
      const won = gameState.winner === 'player';
      onGameEnd(won, {
        userId,
        gameId: `game_${Date.now()}`,
        won,
        turns: gameState.turnCount,
        moves: gameState.moveCount,
        duration: 0,
        timestamp: new Date(),
      });
    }
  }, [gameState?.gameOver]);
  
  if (!gameState) {
    return <div className="text-white flex items-center justify-center h-screen bg-black">Chargement...</div>;
  }
  
  // Le joueur ne peut jouer QUE pendant son tour et s'il n'y a pas de traitement en cours
  const canPlayerAct = gameState.currentTurn === 'player' && !isProcessing && !gameState.gameOver;
  
  const handleTileClick = (position: Position, isRightClick: boolean) => {
    if (!canPlayerAct) return;
    if (!selectedCharacter || !selectedCharacter.isAlive) return;
    
    if (isRightClick) {
      // Attaque → fin du tour
      const { gameState: newState, attackResult: result } = performAttack(
        gameState,
        selectedCharacter.id,
        position,
        selectedCharacter.type === 'warrior' || selectedCharacter.type === 'thief'
      );
      
      if (result) {
        setAttackResult(result);
        setTimeout(() => setAttackResult(null), 1500);
      }
      
      setGameState(endTurn(newState));
    } else {
      // Mouvement
      const newState = moveCharacter(gameState, selectedCharacter.id, position);
      setGameState(newState);
      const updated = newState.playerTeam.find(c => c.id === selectedCharacter.id);
      if (updated) setSelectedCharacter(updated);
    }
  };
  
  const handleEndTurn = () => {
    if (canPlayerAct) {
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
  
  const isEnemyTurn = gameState.currentTurn === 'enemy';
  
  return (
    <div className="h-screen w-screen flex flex-col bg-black overflow-hidden">
      {/* Version */}
      <div className="absolute top-1 right-1 z-30 bg-purple-600/70 px-1.5 py-0.5 rounded text-white text-[10px] font-mono">
        v{APP_VERSION}
      </div>
      
      {/* Indicateur tour IA - bloque visuellement */}
      {isEnemyTurn && (
        <div className="absolute inset-0 z-20 pointer-events-auto">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-2 rounded-lg text-white font-bold animate-pulse shadow-lg">
            🤖 L'adversaire réfléchit...
          </div>
        </div>
      )}
      
      {/* Notification d'attaque */}
      {attackResult && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 p-3 bg-orange-900/95 rounded-lg text-white shadow-lg z-30">
          <div className="font-bold text-sm">⚔️ Attaque !</div>
          {attackResult.targets?.map((t: any, i: number) => (
            <div key={i} className="text-xs">
              {t.character?.type}: -{t.damage} PV {t.isCritical && '💥'}
            </div>
          ))}
        </div>
      )}
      
      {/* Zone 3D - MAXIMISÉE (prend tout sauf 48px en bas) */}
      <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 48px)' }}>
        <GameBoard
          gameState={gameState}
          onTileClick={handleTileClick}
          selectedCharacter={selectedCharacter}
        />
      </div>
      
      {/* Barre UI ultra-compacte - 48px */}
      <div className="h-12 bg-gray-900 border-t border-gray-700 flex items-center px-2 gap-2 text-xs">
        {/* Indicateur tour */}
        <div className={`px-2 py-1 rounded font-bold ${isEnemyTurn ? 'bg-red-600' : 'bg-blue-600'}`}>
          {isEnemyTurn ? '🤖' : '🎮'} #{gameState.turnCount}
        </div>
        
        {/* Sélection personnage - seulement si tour joueur */}
        {!isEnemyTurn && (
          <div className="flex gap-1">
            {gameState.playerTeam.filter(c => c.isAlive).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCharacter(c)}
                disabled={!canPlayerAct}
                className={`w-8 h-8 rounded flex items-center justify-center ${
                  selectedCharacter?.id === c.id ? 'bg-blue-600 ring-1 ring-white' : 'bg-gray-700'
                } disabled:opacity-50`}
              >
                {getEmoji(c.type)}
              </button>
            ))}
          </div>
        )}
        
        {/* Stats personnage */}
        {selectedCharacter && !isEnemyTurn && (
          <div className="flex gap-2 text-[11px] bg-gray-800 px-2 py-1 rounded">
            <span className="text-green-400">❤️{selectedCharacter.health}</span>
            <span className="text-blue-400">👟{selectedCharacter.movement}</span>
          </div>
        )}
        
        {/* Équipes */}
        <div className="flex-1 flex justify-center gap-3">
          <div className="flex gap-0.5">
            {gameState.playerTeam.map(c => (
              <span key={c.id} className={c.isAlive ? 'text-blue-400' : 'text-gray-600'}>
                {c.isAlive ? getEmoji(c.type) : '💀'}
              </span>
            ))}
          </div>
          <span className="text-gray-500 font-bold">VS</span>
          <div className="flex gap-0.5">
            {gameState.enemyTeam.map(c => (
              <span key={c.id} className={c.isAlive ? 'text-red-400' : 'text-gray-600'}>
                {c.isAlive ? getEmoji(c.type) : '💀'}
              </span>
            ))}
          </div>
        </div>
        
        {/* Bouton fin tour */}
        <button
          onClick={handleEndTurn}
          disabled={!canPlayerAct}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded font-bold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Fin
        </button>
      </div>
    </div>
  );
}
