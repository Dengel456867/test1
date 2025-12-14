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

// Carte de personnage compacte
function CharacterCard({ 
  char, 
  isPlayer, 
  isSelected, 
  onClick,
  canSelect 
}: {
  char: Character;
  isPlayer: boolean;
  isSelected: boolean;
  onClick?: () => void;
  canSelect: boolean;
}) {
  const getEmoji = (type: string) => ({ warrior: '⚔️', mage: '🔮', thief: '🗡️' }[type] || '👤');
  const getName = (type: string) => ({ warrior: 'Guerrier', mage: 'Mage', thief: 'Voleur' }[type] || type);
  const healthPercent = (char.health / char.maxHealth) * 100;
  const color = isPlayer ? 'blue' : 'red';

  return (
    <div
      onClick={() => canSelect && char.isAlive && onClick?.()}
      className={`
        p-2 rounded-lg mb-2 transition-all
        ${!char.isAlive ? 'opacity-30 grayscale' : ''}
        ${isSelected ? `ring-2 ring-${color}-400 bg-${color}-900/40` : 'bg-white/5'}
        ${canSelect && char.isAlive ? 'cursor-pointer hover:bg-white/10' : ''}
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{char.isAlive ? getEmoji(char.type) : '💀'}</span>
        <span className="font-bold text-sm">{getName(char.type)}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full mb-1">
        <div 
          className={`h-full rounded-full ${healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${healthPercent}%` }}
        />
      </div>
      <div className="flex gap-2 text-xs text-gray-400">
        <span>❤️{char.health}/{char.maxHealth}</span>
        <span>👟{char.movement}</span>
        <span>⚔️{char.attacksRemaining}</span>
      </div>
    </div>
  );
}

export default function GameView({ userId, onGameEnd, onLogout }: GameViewProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [attackResult, setAttackResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // L'unité qui a été utilisée ce tour (ne peut plus être changée après action)
  const [lockedCharacterId, setLockedCharacterId] = useState<string | null>(null);
  // Compteur d'attaques restantes pour ce tour
  const [attacksLeft, setAttacksLeft] = useState<number>(0);
  
  useEffect(() => {
    const newGame = initializeGame();
    setGameState(newGame);
    const firstAlive = newGame.playerTeam.find(c => c.isAlive);
    setSelectedCharacter(firstAlive || null);
    setLockedCharacterId(null);
    setAttacksLeft(firstAlive?.attacksRemaining || 1);
  }, []);
  
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
      const usedEnemyId = move.characterId || aliveEnemy.id;
      
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
      
      // Passer l'ID du personnage ennemi utilisé pour activer les cases spéciales
      const finalState = endTurn(currentState, usedEnemyId);
      setGameState(finalState);
      setIsProcessing(false);
      
      // Réinitialiser pour le tour du joueur
      setLockedCharacterId(null);
      const alivePlayer = finalState.playerTeam.find(c => c.isAlive);
      if (alivePlayer) {
        setSelectedCharacter(alivePlayer);
        setAttacksLeft(alivePlayer.attacksRemaining);
      }
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
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">⚔️</div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }
  
  const canPlayerAct = gameState.currentTurn === 'player' && !isProcessing && !gameState.gameOver;
  const isEnemyTurn = gameState.currentTurn === 'enemy';
  
  const handleTileClick = (position: Position, isRightClick: boolean) => {
    if (!canPlayerAct || !selectedCharacter?.isAlive) return;
    
    // Si un personnage est verrouillé, on ne peut agir qu'avec lui
    if (lockedCharacterId && lockedCharacterId !== selectedCharacter.id) return;
    
    if (isRightClick) {
      // ATTAQUE
      if (attacksLeft <= 0) return; // Plus d'attaques disponibles
      
      const { gameState: newState, attackResult: result } = performAttack(
        gameState, selectedCharacter.id, position,
        selectedCharacter.type === 'warrior' || selectedCharacter.type === 'thief'
      );
      
      if (result) {
        setAttackResult(result);
        setTimeout(() => setAttackResult(null), 1500);
        
        // Verrouiller ce personnage pour le tour
        setLockedCharacterId(selectedCharacter.id);
        
        const newAttacksLeft = attacksLeft - 1;
        setAttacksLeft(newAttacksLeft);
        
        // Si plus d'attaques restantes, fin du tour
        if (newAttacksLeft <= 0) {
          setGameState(endTurn(newState, selectedCharacter.id));
          setLockedCharacterId(null);
        } else {
          setGameState(newState);
          // Mettre à jour le personnage sélectionné avec les nouvelles stats
          const updated = newState.playerTeam.find(c => c.id === selectedCharacter.id);
          if (updated) setSelectedCharacter(updated);
        }
      }
    } else {
      // MOUVEMENT
      const newState = moveCharacter(gameState, selectedCharacter.id, position);
      
      // Vérifier si le mouvement a eu lieu (position différente)
      const updated = newState.playerTeam.find(c => c.id === selectedCharacter.id);
      if (updated && (updated.position.x !== selectedCharacter.position.x || updated.position.y !== selectedCharacter.position.y)) {
        // Verrouiller ce personnage pour le tour
        setLockedCharacterId(selectedCharacter.id);
        setGameState(newState);
        setSelectedCharacter(updated);
      }
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'grid',
      gridTemplateColumns: '200px 1fr 200px',
      gridTemplateRows: '50px 1fr',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)',
      overflow: 'hidden'
    }}>
      {/* Header - spans all columns */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontWeight: 'bold', background: 'linear-gradient(to right, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TEST 1</span>
          <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>v{APP_VERSION}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', background: isEnemyTurn ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)', color: isEnemyTurn ? '#fca5a5' : '#93c5fd', border: `1px solid ${isEnemyTurn ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'}` }}>
            {isEnemyTurn ? '🤖 Adversaire' : '🎮 Votre tour'} #{gameState.turnCount}
          </div>
          <button
            onClick={() => {
              if (canPlayerAct) {
                // Passer l'ID du personnage utilisé (ou sélectionné) pour activer les cases spéciales
                const charIdToUse = lockedCharacterId || selectedCharacter?.id;
                setGameState(endTurn(gameState, charIdToUse));
                setLockedCharacterId(null);
              }
            }}
            disabled={!canPlayerAct}
            style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', background: canPlayerAct ? 'linear-gradient(135deg, #6366f1, #ec4899)' : '#374151', color: 'white', border: 'none', cursor: canPlayerAct ? 'pointer' : 'not-allowed', opacity: canPlayerAct ? 1 : 0.5 }}
          >
            Fin tour {attacksLeft > 0 && selectedCharacter?.type === 'warrior' && lockedCharacterId ? `(${attacksLeft}⚔️)` : ''}
          </button>
          <button onClick={onLogout} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#f87171', border: 'none', cursor: 'pointer' }}>
            🚪
          </button>
        </div>
      </div>
      
      {/* Left Panel - Player Team */}
      <div style={{ padding: '12px', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#60a5fa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          🎮 Votre équipe
        </div>
        {gameState.playerTeam.map(char => (
          <CharacterCard
            key={char.id}
            char={char}
            isPlayer={true}
            isSelected={selectedCharacter?.id === char.id}
            onClick={() => {
              // Ne peut pas changer de personnage si un autre est verrouillé
              if (!lockedCharacterId || lockedCharacterId === char.id) {
                setSelectedCharacter(char);
                setAttacksLeft(char.attacksRemaining);
              }
            }}
            canSelect={canPlayerAct && (!lockedCharacterId || lockedCharacterId === char.id)}
          />
        ))}
      </div>
      
      {/* Center - Game Board */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <GameBoard
          gameState={gameState}
          onTileClick={handleTileClick}
          selectedCharacter={selectedCharacter}
          onCharacterClick={(char) => {
            // Ne peut sélectionner que les personnages du joueur, et pas changer si verrouillé
            if (canPlayerAct && char.team === 'player' && (!lockedCharacterId || lockedCharacterId === char.id)) {
              setSelectedCharacter(char);
              setAttacksLeft(char.attacksRemaining);
            }
          }}
        />
        
        {isEnemyTurn && (
          <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
            <div style={{ padding: '8px 24px', borderRadius: '20px', background: 'rgba(239,68,68,0.9)', color: 'white', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
              🤖 L'adversaire joue...
            </div>
          </div>
        )}
        
        {attackResult && (
          <div style={{ position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, padding: '16px 24px', borderRadius: '12px', background: 'rgba(234,88,12,0.95)', color: 'white', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚔️ ATTAQUE !</div>
            {attackResult.targets?.map((t: any, i: number) => (
              <div key={i} style={{ fontSize: '14px' }}>-{t.damage} PV {t.isCritical && '💥'}</div>
            ))}
          </div>
        )}
      </div>
      
      {/* Right Panel - Enemy Team */}
      <div style={{ padding: '12px', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#f87171', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          🤖 Adversaire
        </div>
        {gameState.enemyTeam.map(char => (
          <CharacterCard
            key={char.id}
            char={char}
            isPlayer={false}
            isSelected={false}
            canSelect={false}
          />
        ))}
      </div>
      
      {/* Game Over Overlay */}
      {gameState.gameOver && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ textAlign: 'center', padding: '40px', borderRadius: '20px', background: 'rgba(30,30,50,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>{gameState.winner === 'player' ? '🏆' : '💀'}</div>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: gameState.winner === 'player' ? '#fbbf24' : '#ef4444' }}>
              {gameState.winner === 'player' ? 'VICTOIRE !' : 'DÉFAITE'}
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
              {gameState.winner === 'player' ? 'Vous avez gagné !' : 'Vous avez perdu...'}
            </p>
            <button
              onClick={() => {
                const newGame = initializeGame();
                setGameState(newGame);
                setSelectedCharacter(newGame.playerTeam[0]);
              }}
              style={{ padding: '12px 32px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
            >
              🔄 Rejouer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
