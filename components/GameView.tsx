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
  onLogout: () => void;
}

export default function GameView({ userId, onGameEnd, onLogout }: GameViewProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [attackResult, setAttackResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
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
      const aliveEnemy = gameState.enemyTeam.find(c => c.isAlive);
      if (!aliveEnemy) {
        setGameState(prev => prev ? endTurn(prev) : prev);
        setIsProcessing(false);
        return;
      }
      
      await new Promise(r => setTimeout(r, 1000));
      const move = await getEnemyMove(gameState);
      
      let currentState = gameState;
      
      if (move.action === 'move' && move.position && move.characterId) {
        currentState = moveCharacter(currentState, move.characterId, move.position);
        setGameState(currentState);
        await new Promise(r => setTimeout(r, 500));
      }
      
      if (move.action === 'attack' && move.targetPosition && move.characterId) {
        const { gameState: newState, attackResult: result } = performAttack(
          currentState, move.characterId, move.targetPosition, move.isMelee ?? true
        );
        currentState = newState;
        if (result) {
          setAttackResult(result);
          await new Promise(r => setTimeout(r, 1200));
          setAttackResult(null);
        }
      }
      
      const finalState = endTurn(currentState);
      setGameState(finalState);
      setIsProcessing(false);
      
      const alivePlayer = finalState.playerTeam.find(c => c.isAlive);
      if (alivePlayer) setSelectedCharacter(alivePlayer);
    };
    
    executeEnemyTurn();
  }, [gameState?.currentTurn, gameState?.turnCount]);
  
  useEffect(() => {
    if (gameState?.gameOver) {
      onGameEnd(gameState.winner === 'player', {
        userId, gameId: `game_${Date.now()}`, won: gameState.winner === 'player',
        turns: gameState.turnCount, moves: gameState.moveCount, duration: 0, timestamp: new Date(),
      });
    }
  }, [gameState?.gameOver]);
  
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="text-6xl mb-4 animate-float">⚔️</div>
          <p className="text-gray-400">Préparation du combat...</p>
        </div>
      </div>
    );
  }
  
  const canPlayerAct = gameState.currentTurn === 'player' && !isProcessing && !gameState.gameOver;
  const isEnemyTurn = gameState.currentTurn === 'enemy';
  
  const handleTileClick = (position: Position, isRightClick: boolean) => {
    if (!canPlayerAct || !selectedCharacter?.isAlive) return;
    
    if (isRightClick) {
      const { gameState: newState, attackResult: result } = performAttack(
        gameState, selectedCharacter.id, position,
        selectedCharacter.type === 'warrior' || selectedCharacter.type === 'thief'
      );
      if (result) {
        setAttackResult(result);
        setTimeout(() => setAttackResult(null), 1500);
      }
      setGameState(endTurn(newState));
    } else {
      const newState = moveCharacter(gameState, selectedCharacter.id, position);
      setGameState(newState);
      const updated = newState.playerTeam.find(c => c.id === selectedCharacter.id);
      if (updated) setSelectedCharacter(updated);
    }
  };

  const getEmoji = (type: string) => {
    const emojis: Record<string, string> = { warrior: '⚔️', mage: '🔮', thief: '🗡️' };
    return emojis[type.toLowerCase()] || '👤';
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = { warrior: 'Guerrier', mage: 'Mage', thief: 'Voleur' };
    return names[type.toLowerCase()] || type;
  };
  
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative">
      {/* Header bar */}
      <div className="h-12 glass flex items-center justify-between px-4 border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <span className="font-title text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-bold">
            TEST 1
          </span>
          <span className="text-xs text-gray-500 font-mono">v{APP_VERSION}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Turn indicator */}
          <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 ${
            isEnemyTurn 
              ? 'bg-red-500/30 text-red-300 border border-red-500/50' 
              : 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
          }`}>
            {isEnemyTurn ? '🤖 Adversaire' : '🎮 Votre tour'}
            <span className="text-xs opacity-70">#{gameState.turnCount}</span>
          </div>
          
          {/* Menu button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ⚙️
          </button>
        </div>
      </div>
      
      {/* Menu dropdown */}
      {showMenu && (
        <div className="absolute top-14 right-4 z-30 glass-strong p-4 w-48 animate-slide-up">
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-red-400 transition-colors"
          >
            🚪 Déconnexion
          </button>
        </div>
      )}
      
      {/* AI thinking overlay */}
      {isEnemyTurn && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
          <div className="glass px-6 py-3 animate-pulse flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <span className="text-red-300 font-medium">L'adversaire réfléchit...</span>
          </div>
        </div>
      )}
      
      {/* Attack notification */}
      {attackResult && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
          <div className="glass-strong px-6 py-4 border border-orange-500/50">
            <div className="font-title text-orange-400 text-lg mb-2">⚔️ ATTAQUE !</div>
            {attackResult.targets?.map((t: any, i: number) => (
              <div key={i} className="text-sm flex items-center gap-2">
                <span>{getEmoji(t.character?.type)}</span>
                <span className="text-red-400 font-bold">-{t.damage} PV</span>
                {t.isCritical && <span className="text-yellow-400 animate-pulse">💥 CRITIQUE!</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Game board - main area */}
      <div className="flex-1 relative">
        <GameBoard
          gameState={gameState}
          onTileClick={handleTileClick}
          selectedCharacter={selectedCharacter}
        />
      </div>
      
      {/* Bottom control bar */}
      <div className="h-24 glass border-t border-white/10 flex items-center px-4 gap-4 z-20">
        {/* Character selection */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Personnage</span>
          <div className="flex gap-2">
            {gameState.playerTeam.map(c => (
              <button
                key={c.id}
                onClick={() => c.isAlive && setSelectedCharacter(c)}
                disabled={!c.isAlive || !canPlayerAct}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                  !c.isAlive 
                    ? 'bg-gray-800/50 opacity-40' 
                    : selectedCharacter?.id === c.id
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 glow-primary'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                } disabled:cursor-not-allowed`}
              >
                <span className="text-xl">{c.isAlive ? getEmoji(c.type) : '💀'}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Selected character stats */}
        {selectedCharacter && (
          <div className="glass px-4 py-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getEmoji(selectedCharacter.type)}</span>
              <span className="font-title text-sm">{getTypeName(selectedCharacter.type)}</span>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="text-green-400">❤️</span>
                <span className="font-mono">{selectedCharacter.health}/{selectedCharacter.maxHealth}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-blue-400">👟</span>
                <span className="font-mono">{selectedCharacter.movement}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-orange-400">⚔️</span>
                <span className="font-mono">{selectedCharacter.attacksRemaining}</span>
              </span>
            </div>
          </div>
        )}
        
        {/* Teams status */}
        <div className="flex-1 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-400 uppercase tracking-wider">Vous</span>
            <div className="flex gap-1">
              {gameState.playerTeam.map(c => (
                <div key={c.id} className={`w-8 h-2 rounded-full ${
                  c.isAlive 
                    ? `bg-gradient-to-r from-blue-500 to-cyan-500`
                    : 'bg-gray-700'
                }`} style={{ width: `${Math.max(8, (c.health / c.maxHealth) * 32)}px` }} />
              ))}
            </div>
          </div>
          
          <span className="text-gray-600 font-title">VS</span>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {gameState.enemyTeam.map(c => (
                <div key={c.id} className={`w-8 h-2 rounded-full ${
                  c.isAlive 
                    ? `bg-gradient-to-r from-red-500 to-orange-500`
                    : 'bg-gray-700'
                }`} style={{ width: `${Math.max(8, (c.health / c.maxHealth) * 32)}px` }} />
              ))}
            </div>
            <span className="text-xs text-red-400 uppercase tracking-wider">IA</span>
          </div>
        </div>
        
        {/* End turn button */}
        <button
          onClick={() => canPlayerAct && setGameState(endTurn(gameState))}
          disabled={!canPlayerAct}
          className="btn btn-primary px-6 py-3 disabled:opacity-30"
        >
          Fin du tour
        </button>
      </div>
      
      {/* Game over overlay */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-strong p-8 text-center animate-slide-up max-w-md">
            <div className="text-6xl mb-4">
              {gameState.winner === 'player' ? '🏆' : '💀'}
            </div>
            <h2 className="font-title text-3xl mb-2">
              {gameState.winner === 'player' ? 'VICTOIRE !' : 'DÉFAITE'}
            </h2>
            <p className="text-gray-400 mb-6">
              {gameState.winner === 'player' 
                ? 'Vous avez vaincu l\'adversaire !' 
                : 'L\'adversaire vous a terrassé...'}
            </p>
            <button
              onClick={() => {
                const newGame = initializeGame();
                setGameState(newGame);
                setSelectedCharacter(newGame.playerTeam[0]);
              }}
              className="btn btn-primary"
            >
              🔄 Rejouer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
