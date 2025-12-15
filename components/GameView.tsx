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
  isCurrentTurn,
  turnPosition
}: {
  char: Character;
  isPlayer: boolean;
  isSelected: boolean;
  isCurrentTurn?: boolean;
  turnPosition?: number;
}) {
  const getEmoji = (type: string) => ({ warrior: '⚔️', mage: '🔮', thief: '🗡️' }[type] || '👤');
  const getName = (type: string) => ({ warrior: 'Guerrier', mage: 'Mage', thief: 'Voleur' }[type] || type);
  const healthPercent = (char.health / char.maxHealth) * 100;
  const color = isPlayer ? 'blue' : 'red';

  return (
    <div
      className={`
        p-2 rounded-lg mb-2 transition-all relative
        ${!char.isAlive ? 'opacity-30 grayscale' : ''}
        ${isCurrentTurn ? `ring-2 ring-yellow-400 bg-yellow-900/30` : isSelected ? `ring-2 ring-${color}-400 bg-${color}-900/40` : 'bg-white/5'}
      `}
    >
      {turnPosition !== undefined && char.isAlive && (
        <div style={{ 
          position: 'absolute', 
          top: '-8px', 
          right: '-8px', 
          background: isCurrentTurn ? '#fbbf24' : '#6b7280',
          color: isCurrentTurn ? '#000' : '#fff',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          {turnPosition + 1}
        </div>
      )}
      {/* En-tête avec nom et type */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{char.isAlive ? getEmoji(char.type) : '💀'}</span>
        <span className="font-bold text-sm">{getName(char.type)}</span>
      </div>
      
      {/* Barre de vie */}
      <div className="h-1.5 bg-gray-700 rounded-full mb-2">
        <div 
          className={`h-full rounded-full ${healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${healthPercent}%` }}
        />
      </div>
      
      {/* Stats en colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '14px' }}>
        <div title="Points de vie actuels / maximum" style={{ cursor: 'help' }}>
          <span style={{ color: '#06b6d4' }}>❤</span> <span style={{ color: '#fff' }}>{char.health}/{char.maxHealth}</span>
        </div>
        <div title="Bouclier : absorbe les dégâts avant les points de vie" style={{ cursor: 'help', opacity: char.shield > 0 ? 1 : 0.4 }}>
          <span style={{ color: '#ffffff' }}>🛡</span> <span style={{ color: '#fff' }}>{char.shield}</span>
        </div>
        <div title="Armure : réduit les dégâts reçus de ce montant" style={{ cursor: 'help', opacity: char.armor > 0 ? 1 : 0.4 }}>
          <span style={{ color: '#f97316' }}>🦺</span> <span style={{ color: '#fff' }}>{char.armor}</span>
        </div>
        <div title="Régénération : PV récupérés au début de chaque tour" style={{ cursor: 'help', opacity: char.regeneration > 0 ? 1 : 0.4 }}>
          <span style={{ color: '#166534' }}>+</span> <span style={{ color: '#fff' }}>{char.regeneration}/t</span>
        </div>
        <div title="Points de mouvement restants pour ce tour" style={{ cursor: 'help' }}>
          <span style={{ color: '#a855f7' }}>👟</span> <span style={{ color: '#fff' }}>{char.movement}</span>
        </div>
        <div title="Initiative : plus elle est basse, plus le personnage joue tôt dans le tour" style={{ cursor: 'help' }}>
          <span style={{ color: '#eab308' }}>⚡</span> <span style={{ color: '#fff' }}>{char.initiative}</span>
        </div>
        <div title="Nombre d'attaques restantes ce tour" style={{ cursor: 'help' }}>
          <span style={{ color: '#9ca3af' }}>🗡</span> <span style={{ color: '#fff' }}>{char.attacksRemaining}</span>
        </div>
        <div title="Bonus de dégâts : ajouté à chaque attaque (permanent)" style={{ cursor: 'help', opacity: char.damageBoost > 0 ? 1 : 0.4 }}>
          <span style={{ color: '#ef4444' }}>✊</span> <span style={{ color: '#fff' }}>+{char.damageBoost}</span>
        </div>
      </div>
    </div>
  );
}

const TURN_TIMER = 30; // 30 secondes par tour

// Fonction pour obtenir le personnage actuel depuis l'ordre de tour
function getCurrentCharacter(gameState: GameState): Character | null {
  if (!gameState.turnOrder || gameState.turnOrder.length === 0) return null;
  const currentId = gameState.turnOrder[gameState.currentTurnOrderIndex];
  return [...gameState.playerTeam, ...gameState.enemyTeam].find(c => c.id === currentId) || null;
}

export default function GameView({ userId, onGameEnd, onLogout }: GameViewProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [attackResult, setAttackResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Indique si le joueur a déjà attaqué ce tour (bloque le mouvement)
  const [hasAttacked, setHasAttacked] = useState<boolean>(false);
  // Position d'origine du personnage au début du tour (pour mouvement hypothétique)
  const [originalPosition, setOriginalPosition] = useState<Position | null>(null);
  // Points de mouvement d'origine
  const [originalMovement, setOriginalMovement] = useState<number>(0);
  // Timer du tour (en secondes)
  const [turnTimer, setTurnTimer] = useState<number>(TURN_TIMER);
  
  // Le personnage actuel est déterminé par l'ordre d'initiative
  const currentCharacter = gameState ? getCurrentCharacter(gameState) : null;
  const isPlayerTurn = currentCharacter?.team === 'player';
  
  useEffect(() => {
    const newGame = initializeGame();
    setGameState(newGame);
    const firstChar = getCurrentCharacter(newGame);
    setHasAttacked(false);
    setOriginalPosition(firstChar?.position || null);
    setOriginalMovement(firstChar?.movement || 0);
    setTurnTimer(TURN_TIMER);
  }, []);
  
  // Réinitialiser originalPosition et originalMovement quand le personnage actif change
  useEffect(() => {
    if (!gameState || !currentCharacter) return;
    
    // Réinitialiser pour le nouveau personnage actif
    setOriginalPosition(currentCharacter.position);
    setOriginalMovement(currentCharacter.movement);
    setHasAttacked(false);
    setTurnTimer(TURN_TIMER);
  }, [gameState?.currentTurnOrderIndex, gameState?.turnCount]);
  
  // Gérer le tour de l'ennemi (quand c'est le tour d'un personnage ennemi)
  useEffect(() => {
    if (!gameState || gameState.gameOver || isProcessing) return;
    
    const current = getCurrentCharacter(gameState);
    if (!current || current.team !== 'enemy') return;
    
    setIsProcessing(true);
    
    const executeEnemyTurn = async () => {
      await new Promise(r => setTimeout(r, 1000));
      
      // L'IA joue avec le personnage actuel (déterminé par l'ordre d'initiative)
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
      
      // Passer au personnage suivant dans l'ordre
      const finalState = endTurn(currentState, current.id);
      setGameState(finalState);
      setIsProcessing(false);
      
      // Réinitialiser pour le prochain personnage
      setHasAttacked(false);
      setTurnTimer(TURN_TIMER);
      
      const nextChar = getCurrentCharacter(finalState);
      if (nextChar) {
        setOriginalPosition(nextChar.position);
        setOriginalMovement(nextChar.movement);
      }
    };
    
    executeEnemyTurn();
  }, [gameState?.currentTurnOrderIndex, gameState?.turnCount]);
  
  // Timer du tour du joueur
  useEffect(() => {
    if (!gameState || gameState.gameOver || isProcessing) return;
    if (!isPlayerTurn) return;
    
    const interval = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          // Temps écoulé - fin automatique du tour
          clearInterval(interval);
          setGameState(endTurn(gameState, currentCharacter?.id));
          setHasAttacked(false);
          return TURN_TIMER;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState?.currentTurnOrderIndex, gameState?.turnCount, isProcessing, isPlayerTurn]);
  
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
  
  const canPlayerAct = isPlayerTurn && !isProcessing && !gameState.gameOver;
  const selectedCharacter = currentCharacter; // Le personnage actuel est celui de l'ordre d'initiative
  const isEnemyTurn = gameState.currentTurn === 'enemy';
  
  const handleTileClick = (position: Position, isRightClick: boolean) => {
    if (!canPlayerAct || !currentCharacter?.isAlive) return;
    
    if (isRightClick) {
      // ATTAQUE
      const attacksRemaining = currentCharacter.attacksRemaining;
      if (attacksRemaining <= 0) return; // Plus d'attaques disponibles
      
      const { gameState: newState, attackResult: result } = performAttack(
        gameState, currentCharacter.id, position,
        currentCharacter.type === 'warrior' || currentCharacter.type === 'thief'
      );
      
      if (result) {
        setAttackResult(result);
        setTimeout(() => setAttackResult(null), 1500);
        
        setHasAttacked(true); // Bloque le mouvement après attaque
        
        // Trouver le personnage mis à jour
        const updated = [...newState.playerTeam, ...newState.enemyTeam].find(c => c.id === currentCharacter.id);
        const newAttacksLeft = (updated?.attacksRemaining ?? attacksRemaining) - 1;
        
        // Mettre à jour les attaques restantes du personnage
        let finalState = newState;
        if (updated) {
          const updatedChar = { ...updated, attacksRemaining: newAttacksLeft };
          if (currentCharacter.team === 'player') {
            finalState = {
              ...newState,
              playerTeam: newState.playerTeam.map(c => c.id === currentCharacter.id ? updatedChar : c),
              board: newState.board.map((row, y) => row.map((cell, x) => 
                cell?.id === currentCharacter.id ? updatedChar : cell
              ))
            };
          } else {
            finalState = {
              ...newState,
              enemyTeam: newState.enemyTeam.map(c => c.id === currentCharacter.id ? updatedChar : c),
              board: newState.board.map((row, y) => row.map((cell, x) => 
                cell?.id === currentCharacter.id ? updatedChar : cell
              ))
            };
          }
        }
        
        // Si c'est un guerrier avec des attaques restantes, vérifier s'il y a des cibles au corps à corps
        let shouldEndTurn = newAttacksLeft <= 0;
        
        if (!shouldEndTurn && currentCharacter.type === 'warrior' && updated) {
          // Chercher des cibles adjacentes (ennemis OU alliés, distance = 1)
          const allCharacters = [...finalState.playerTeam, ...finalState.enemyTeam];
          const hasAdjacentTarget = allCharacters.some(char => {
            // Exclure le guerrier lui-même et les morts
            if (char.id === updated.id || !char.isAlive) return false;
            const distance = Math.abs(char.position.x - updated.position.x) + 
                           Math.abs(char.position.y - updated.position.y);
            return distance <= 1;
          });
          
          if (!hasAdjacentTarget) {
            shouldEndTurn = true; // Pas de cible au corps à corps, fin du tour
          }
        }
        
        if (shouldEndTurn) {
          setGameState(endTurn(finalState, currentCharacter.id));
          setHasAttacked(false);
          setTurnTimer(TURN_TIMER);
        } else {
          setGameState(finalState);
        }
      }
    } else {
      // MOUVEMENT HYPOTHÉTIQUE - bloqué si on a déjà attaqué
      if (hasAttacked) return;
      
      // Utiliser la position d'origine pour calculer la distance
      const originPos = originalPosition || currentCharacter.position;
      const maxRange = originalMovement || currentCharacter.maxMovement;
      const distanceFromOrigin = Math.abs(position.x - originPos.x) + Math.abs(position.y - originPos.y);
      
      // Vérifier si la case est dans la portée depuis la position d'origine
      if (distanceFromOrigin > maxRange) return;
      
      // Vérifier si la case est la position actuelle (ne rien faire)
      if (position.x === currentCharacter.position.x && position.y === currentCharacter.position.y) return;
      
      // Vérifier si la case est libre OU si c'est la position d'origine (on peut y retourner)
      const isOriginPos = position.x === originPos.x && position.y === originPos.y;
      const cellContent = gameState.board[position.y]?.[position.x];
      if (cellContent !== null && !isOriginPos) return;
      
      // Déplacer le personnage de façon hypothétique
      const newBoard = gameState.board.map(row => [...row]);
      newBoard[currentCharacter.position.y][currentCharacter.position.x] = null;
      
      const updatedCharacter = {
        ...currentCharacter,
        position: position,
        movement: maxRange - distanceFromOrigin,
      };
      
      newBoard[position.y][position.x] = updatedCharacter;
      
      // Mettre à jour dans la bonne équipe
      const teamKey = currentCharacter.team === 'player' ? 'playerTeam' : 'enemyTeam';
      const updatedTeam = gameState[teamKey].map(c =>
        c.id === currentCharacter.id ? updatedCharacter : c
      );
      
      setGameState({
        ...gameState,
        board: newBoard,
        [teamKey]: updatedTeam,
      });
    }
  };

  // Fonction pour obtenir l'icône de classe
  const getClassIcon = (type: string) => {
    switch (type) {
      case 'warrior': return '♜'; // Tour (rook)
      case 'mage': return '♝'; // Fou (bishop)
      case 'thief': return '♞'; // Cavalier (knight)
      default: return '?';
    }
  };

  // Fonction pour obtenir le nom de classe en français
  const getClassName = (type: string) => {
    switch (type) {
      case 'warrior': return 'Guerrier';
      case 'mage': return 'Mage';
      case 'thief': return 'Voleur';
      default: return type;
    }
  };

  // Obtenir tous les personnages dans l'ordre de tour
  const turnOrderCharacters = gameState.turnOrder.map(id => 
    [...gameState.playerTeam, ...gameState.enemyTeam].find(c => c.id === id)
  ).filter(Boolean) as Character[];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'grid',
      gridTemplateColumns: '200px 1fr 200px',
      gridTemplateRows: '50px 1fr 60px',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)',
      overflow: 'hidden'
    }}>
      {/* Header - spans all columns */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        {/* Gauche - Logo + Tour global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontWeight: 'bold', background: 'linear-gradient(to right, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TEST 1</span>
          <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>v{APP_VERSION}</span>
          <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: 'rgba(168,85,247,0.2)', color: '#c4b5fd' }}>
            Tour global #{gameState.turnCount}
          </span>
        </div>
        
        {/* Centre - Timer + Personnage actuel */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flex: 1 }}>
          {isPlayerTurn && !gameState.gameOver && (
            <div style={{ 
              padding: '8px 24px', 
              borderRadius: '12px', 
              fontSize: '20px', 
              fontWeight: 'bold', 
              fontFamily: 'monospace',
              background: turnTimer <= 10 ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.2)',
              color: turnTimer <= 10 ? '#fca5a5' : '#93c5fd',
              border: `2px solid ${turnTimer <= 10 ? 'rgba(239,68,68,0.6)' : 'rgba(59,130,246,0.4)'}`,
              animation: turnTimer <= 5 ? 'pulse 0.5s infinite' : 'none'
            }}>
              ⏱️ {turnTimer}s
            </div>
          )}
          {currentCharacter && (
            <div style={{ 
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontSize: '13px', 
              fontWeight: 'bold', 
              background: isPlayerTurn ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)', 
              color: isPlayerTurn ? '#93c5fd' : '#fca5a5', 
              border: `1px solid ${isPlayerTurn ? 'rgba(59,130,246,0.5)' : 'rgba(239,68,68,0.5)'}` 
            }}>
              {isPlayerTurn ? '🎮' : '🤖'} {currentCharacter.type === 'warrior' ? 'Guerrier' : currentCharacter.type === 'mage' ? 'Mage' : 'Voleur'}
              {' '}({gameState.currentTurnOrderIndex + 1}/{gameState.turnOrder.length})
            </div>
          )}
        </div>
        
        {/* Droite - Contrôles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              if (canPlayerAct) {
                setGameState(endTurn(gameState, currentCharacter?.id));
                setHasAttacked(false);
                setTurnTimer(TURN_TIMER);
              }
            }}
            disabled={!canPlayerAct}
            style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', background: canPlayerAct ? 'linear-gradient(135deg, #6366f1, #ec4899)' : '#374151', color: 'white', border: 'none', cursor: canPlayerAct ? 'pointer' : 'not-allowed', opacity: canPlayerAct ? 1 : 0.5 }}
          >
            Fin tour {currentCharacter?.type === 'warrior' && currentCharacter.attacksRemaining > 0 ? `(${currentCharacter.attacksRemaining}⚔️)` : ''}
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
        {gameState.playerTeam.map(char => {
          const turnPos = gameState.turnOrder.indexOf(char.id);
          return (
            <CharacterCard
              key={char.id}
              char={char}
              isPlayer={true}
              isSelected={selectedCharacter?.id === char.id}
              isCurrentTurn={currentCharacter?.id === char.id}
              turnPosition={turnPos >= gameState.currentTurnOrderIndex ? turnPos - gameState.currentTurnOrderIndex : undefined}
            />
          );
        })}
      </div>
      
      {/* Center - Game Board */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <GameBoard
          gameState={gameState}
          onTileClick={handleTileClick}
          selectedCharacter={selectedCharacter}
          originalPosition={originalPosition}
          originalMovement={originalMovement}
          hasAttacked={hasAttacked}
        />
        
        {!isPlayerTurn && !gameState.gameOver && (
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
        {gameState.enemyTeam.map(char => {
          const turnPos = gameState.turnOrder.indexOf(char.id);
          return (
            <CharacterCard
              key={char.id}
              char={char}
              isPlayer={false}
              isSelected={false}
              isCurrentTurn={currentCharacter?.id === char.id}
              turnPosition={turnPos >= gameState.currentTurnOrderIndex ? turnPos - gameState.currentTurnOrderIndex : undefined}
            />
          );
        })}
      </div>
      
      {/* Bottom Bar - Turn Order - spans all columns */}
      <div style={{ 
        gridColumn: '1 / -1', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '8px',
        padding: '8px 16px', 
        borderTop: '1px solid rgba(255,255,255,0.1)', 
        background: 'rgba(0,0,0,0.4)'
      }}>
        <span style={{ fontSize: '11px', color: '#9ca3af', marginRight: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Ordre de tour:
        </span>
        {turnOrderCharacters.map((char, index) => {
          const isCurrent = index === gameState.currentTurnOrderIndex;
          const hasPlayed = index < gameState.currentTurnOrderIndex;
          const isPlayer = char.team === 'player';
          
          return (
            <div
              key={char.id}
              title={`${getClassName(char.type)} ${isPlayer ? '(Vous)' : '(Ennemi)'} - ${char.health}/${char.maxHealth} PV`}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 'bold',
                cursor: 'default',
                transition: 'all 0.2s ease',
                background: hasPlayed 
                  ? 'rgba(100,100,100,0.3)' 
                  : isCurrent 
                    ? (isPlayer ? 'rgba(59,130,246,0.5)' : 'rgba(239,68,68,0.5)')
                    : 'rgba(30,30,50,0.6)',
                border: isCurrent 
                  ? `3px solid ${isPlayer ? '#3b82f6' : '#ef4444'}` 
                  : '2px solid rgba(255,255,255,0.2)',
                color: hasPlayed 
                  ? '#6b7280' 
                  : (isPlayer ? '#60a5fa' : '#f87171'),
                opacity: hasPlayed ? 0.5 : (char.isAlive ? 1 : 0.3),
                boxShadow: isCurrent ? `0 0 12px ${isPlayer ? 'rgba(59,130,246,0.6)' : 'rgba(239,68,68,0.6)'}` : 'none',
                transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                textDecoration: !char.isAlive ? 'line-through' : 'none'
              }}
            >
              {getClassIcon(char.type)}
            </div>
          );
        })}
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
                const firstChar = getCurrentCharacter(newGame);
                setOriginalPosition(firstChar?.position || null);
                setOriginalMovement(firstChar?.movement || 0);
                setHasAttacked(false);
                setTurnTimer(TURN_TIMER);
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
