'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import IsometricBoard from '@/components/IsometricBoard';
import GameUI from '@/components/GameUI';
import { GameState, Character, Position } from '@/lib/game/types';
import { getAIMove } from '@/lib/game/ai';

export default function GamePage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [attackResult, setAttackResult] = useState<any>(null);

  useEffect(() => {
    startGame();
  }, []);

  useEffect(() => {
    if (gameState && gameState.currentTurn === 'enemy' && !gameState.gameOver) {
      handleAITurn();
    }
  }, [gameState?.currentTurn]);

  const startGame = async () => {
    try {
      const response = await fetch('/api/game/start', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setGameState(data.gameState);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAITurn = async () => {
    if (!gameState) return;

    // Simuler le tour de l'IA (simplifiÃ© pour l'instant)
    setTimeout(() => {
      // Pour l'instant, on passe juste au tour du joueur
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, currentTurn: 'player', selectedCharacter: null };
      });
    }, 1000);
  };

  const handleTileClick = async (pos: Position) => {
    if (!gameState || gameState.currentTurn !== 'player' || gameState.gameOver) return;
    if (!gameState.selectedCharacter) return;

    const response = await fetch('/api/game/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameState,
        characterId: gameState.selectedCharacter.id,
        targetPosition: pos,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      setGameState(data.gameState);
    }
  };

  const handleTileRightClick = async (pos: Position) => {
    if (!gameState || gameState.currentTurn !== 'player' || gameState.gameOver) return;
    if (!gameState.selectedCharacter) return;

    const response = await fetch('/api/game/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameState,
        characterId: gameState.selectedCharacter.id,
        targetPosition: pos,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      setGameState(data.gameState);
      setAttackResult(data.attackResult);
      setTimeout(() => setAttackResult(null), 3000);
    }
  };

  const handleCharacterClick = (character: Character) => {
    if (!gameState || gameState.currentTurn !== 'player' || gameState.gameOver) return;
    if (character.team !== 'player') return;

    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        selectedCharacter: prev.selectedCharacter?.id === character.id ? null : character,
      };
    });
  };

  const handleEndTurn = async () => {
    if (!gameState || gameState.currentTurn !== 'player') return;

    const response = await fetch('/api/game/end-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameState, characterId: gameState.selectedCharacter?.id }),
    });

    const data = await response.json();
    if (response.ok) {
      setGameState(data.gameState);
    }
  };

  const handleNewGame = () => {
    startGame();
  };

  const handleViewStats = () => {
    router.push('/stats');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Chargement...</div>
      </div>
    );
  }

  if (!gameState) {
    return null;
  }

  if (gameState.gameOver) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="bg-white p-8 rounded-lg shadow-2xl text-center">
          <h1 className="text-4xl font-bold mb-4">
            {gameState.winner === 'player' ? 'Victoire !' : 'DÃ©faite !'}
          </h1>
          <p className="text-xl mb-6">Tours: {gameState.turnCount}</p>
          <div className="space-y-4">
            <button
              onClick={handleNewGame}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Nouvelle partie
            </button>
            <button
              onClick={handleViewStats}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Voir les statistiques
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen">
      <IsometricBoard
        gameState={gameState}
        onTileClick={handleTileClick}
        onTileRightClick={handleTileRightClick}
        onCharacterClick={handleCharacterClick}
      />
      <GameUI gameState={gameState} onEndTurn={handleEndTurn} />
      
      {attackResult && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white p-4 rounded z-20">
          <h3 className="font-bold mb-2">Attaque !</h3>
          {attackResult.targets.map((target: any, idx: number) => (
            <div key={idx} className="mb-1">
              {target.character.type}: -{target.damage} PV
              {target.isCritical && <span className="text-yellow-400 ml-2">CRITIQUE!</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

