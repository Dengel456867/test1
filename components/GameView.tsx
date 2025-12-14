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

// Panneau d'équipe
function TeamPanel({ 
  team, 
  title, 
  isPlayer, 
  selectedCharacter, 
  onSelectCharacter,
  canSelect 
}: {
  team: Character[];
  title: string;
  isPlayer: boolean;
  selectedCharacter: Character | null;
  onSelectCharacter?: (char: Character) => void;
  canSelect: boolean;
}) {
  const getEmoji = (type: string) => {
    const emojis: Record<string, string> = { warrior: '⚔️', mage: '🔮', thief: '🗡️' };
    return emojis[type.toLowerCase()] || '👤';
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = { warrior: 'Guerrier', mage: 'Mage', thief: 'Voleur' };
    return names[type.toLowerCase()] || type;
  };

  const teamColor = isPlayer ? 'blue' : 'red';
  const gradientFrom = isPlayer ? 'from-blue-600' : 'from-red-600';
  const gradientTo = isPlayer ? 'to-cyan-600' : 'to-orange-600';
  const borderColor = isPlayer ? 'border-blue-500/30' : 'border-red-500/30';
  const bgColor = isPlayer ? 'bg-blue-500/10' : 'bg-red-500/10';

  return (
    <div className={`h-full flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`}>
      {/* Header */}
      <div className={`glass px-4 py-2 mb-4 ${isPlayer ? 'rounded-l-xl' : 'rounded-r-xl'}`}>
        <h2 className={`font-title text-lg bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent font-bold`}>
          {title}
        </h2>
      </div>
      
      {/* Characters */}
      <div className="flex-1 flex flex-col gap-3 w-full px-2">
        {team.map((char) => {
          const isSelected = selectedCharacter?.id === char.id;
          const healthPercent = (char.health / char.maxHealth) * 100;
          const isDead = !char.isAlive;
          
          return (
            <div
              key={char.id}
              onClick={() => canSelect && char.isAlive && onSelectCharacter?.(char)}
              className={`
                glass p-3 rounded-xl transition-all cursor-pointer
                ${borderColor} border
                ${isDead ? 'opacity-40 grayscale' : ''}
                ${isSelected ? `ring-2 ${isPlayer ? 'ring-blue-400' : 'ring-red-400'} ${bgColor}` : ''}
                ${canSelect && char.isAlive ? 'hover:scale-105' : ''}
              `}
            >
              {/* Character header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{isDead ? '💀' : getEmoji(char.type)}</span>
                <div className="flex-1">
                  <div className="font-title text-sm font-bold">{getTypeName(char.type)}</div>
                  <div className={`text-xs ${isPlayer ? 'text-blue-400' : 'text-red-400'}`}>
                    {isPlayer ? 'Joueur' : 'Adversaire'}
                  </div>
                </div>
              </div>
              
              {/* Health bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">PV</span>
                  <span className={healthPercent > 50 ? 'text-green-400' : healthPercent > 25 ? 'text-yellow-400' : 'text-red-400'}>
                    {char.health}/{char.maxHealth}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      healthPercent > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 
                      healthPercent > 25 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 
                      'bg-gradient-to-r from-red-500 to-rose-400'
                    }`}
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 bg-black/20 rounded px-2 py-1">
                  <span>👟</span>
                  <span className="text-blue-300">{char.movement}/{char.maxMovement}</span>
                </div>
                <div className="flex items-center gap-1 bg-black/20 rounded px-2 py-1">
                  <span>⚔️</span>
                  <span className="text-orange-300">{char.attacksRemaining}</span>
                </div>
              </div>
              
              {/* Bonus indicators */}
              {(char.damageBoost > 0 || char.movementBoost > 0) && (
                <div className="flex gap-2 mt-2">
                  {char.damageBoost > 0 && (
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                      💥 +{char.damageBoost} DMG
                    </span>
                  )}
                  {char.movementBoost > 0 && (
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                      🏃 +{char.movementBoost} MOV
                    </span>
                  )}
                </div>
              )}
              
              {/* Selected indicator */}
              {isSelected && (
                <div className={`mt-2 text-xs text-center py-1 rounded ${isPlayer ? 'bg-blue-500/30 text-blue-300' : 'bg-red-500/30 text-red-300'}`}>
                  ✨ Sélectionné
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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

  const handleEndTurn = () => {
    if (canPlayerAct) {
      setGameState(endTurn(gameState));
    }
  };
  
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 glass flex items-center justify-between px-4 border-b border-white/10 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-title text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-bold">
            TEST 1
          </span>
          <span className="text-xs text-gray-500 font-mono">v{APP_VERSION}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Turn indicator */}
          <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
            isEnemyTurn 
              ? 'bg-red-500/30 text-red-300 border border-red-500/50' 
              : 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
          }`}>
            {isEnemyTurn ? '🤖 Tour Adversaire' : '🎮 Votre Tour'}
            <span className="text-xs opacity-70">#{gameState.turnCount}</span>
          </div>
          
          {/* End turn button */}
          <button
            onClick={handleEndTurn}
            disabled={!canPlayerAct}
            className="btn btn-primary px-4 py-2 text-sm disabled:opacity-30"
          >
            Fin du tour
          </button>
          
          {/* Menu button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ⚙️
          </button>
        </div>
      </div>
      
      {/* Menu dropdown */}
      {showMenu && (
        <div className="absolute top-16 right-4 z-30 glass-strong p-4 w-48 animate-slide-up">
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-red-400 transition-colors"
          >
            🚪 Déconnexion
          </button>
        </div>
      )}
      
      {/* Main content - 3 columns */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - Player team (15%) */}
        <div className="w-[15%] min-w-[180px] p-2 overflow-y-auto">
          <TeamPanel
            team={gameState.playerTeam}
            title="🎮 JOUEUR"
            isPlayer={true}
            selectedCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacter}
            canSelect={canPlayerAct}
          />
        </div>
        
        {/* Center - Game board (70%) */}
        <div className="flex-1 relative flex items-center justify-center">
          <GameBoard
            gameState={gameState}
            onTileClick={handleTileClick}
            selectedCharacter={selectedCharacter}
          />
          
          {/* AI thinking overlay */}
          {isEnemyTurn && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="glass px-6 py-3 animate-pulse flex items-center gap-3 rounded-full">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                <span className="text-red-300 font-medium">L'adversaire réfléchit...</span>
              </div>
            </div>
          )}
          
          {/* Attack notification */}
          {attackResult && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
              <div className="glass-strong px-6 py-4 border border-orange-500/50 rounded-xl">
                <div className="font-title text-orange-400 text-lg mb-2">⚔️ ATTAQUE !</div>
                {attackResult.targets?.map((t: any, i: number) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span className="text-red-400 font-bold">-{t.damage} PV</span>
                    {t.isCritical && <span className="text-yellow-400 animate-pulse">💥 CRITIQUE!</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right panel - Enemy team (15%) */}
        <div className="w-[15%] min-w-[180px] p-2 overflow-y-auto">
          <TeamPanel
            team={gameState.enemyTeam}
            title="🤖 ENNEMI"
            isPlayer={false}
            selectedCharacter={null}
            canSelect={false}
          />
        </div>
      </div>
      
      {/* Game over overlay */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-strong p-8 text-center animate-slide-up max-w-md rounded-2xl">
            <div className="text-7xl mb-4">
              {gameState.winner === 'player' ? '🏆' : '💀'}
            </div>
            <h2 className="font-title text-4xl mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              {gameState.winner === 'player' ? 'VICTOIRE !' : 'DÉFAITE'}
            </h2>
            <p className="text-gray-400 mb-6 text-lg">
              {gameState.winner === 'player' 
                ? 'Vous avez vaincu l\'adversaire !' 
                : 'L\'adversaire vous a terrassé...'}
            </p>
            <div className="flex gap-4 justify-center">
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
              <button
                onClick={onLogout}
                className="btn bg-gray-700 hover:bg-gray-600 text-white"
              >
                🚪 Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
