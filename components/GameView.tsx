'use client';

import { useState, useEffect } from 'react';
import GameBoard from './GameBoard';
import CharacterPanel from './CharacterPanel';
import { GameState, Character, Position } from '@/lib/types/game';
import { initializeGame, moveCharacter, performAttack, endTurn } from '@/lib/game/gameLogic';
import { getEnemyMove } from '@/lib/ai/enemyAI';

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
    // GÃ©rer le tour de l'IA
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
    
    // VÃ©rifier si le jeu est terminÃ©
    if (gameState?.gameOver) {
      const won = gameState.winner === 'player';
      const stats = {
        userId,
        gameId: `game_${Date.now()}`,
        won,
        turns: gameState.turnCount,
        moves: gameState.moveCount,
        duration: 0, // Ã€ calculer
        timestamp: new Date(),
      };
      onGameEnd(won, stats);
    }
  }, [gameState, userId, onGameEnd]);
  
  if (!gameState) {
    return <div className="text-white">Chargement...</div>;
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
      
      // Mettre Ã  jour le personnage sÃ©lectionnÃ©
      const updated = newState.playerTeam.find(c => c.id === selectedCharacter.id);
      if (updated) setSelectedCharacter(updated);
    }
  };
  
  const handleEndTurn = () => {
    if (gameState.currentTurn === 'player') {
      setGameState(endTurn(gameState));
    }
  };
  
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex-1">
        <GameBoard
          gameState={gameState}
          onTileClick={handleTileClick}
          selectedCharacter={selectedCharacter}
        />
        
        {attackResult && (
          <div className="mt-4 p-4 bg-yellow-900/50 rounded text-white">
            <div className="font-bold">Attaque effectuÃ©e !</div>
            {attackResult.targets.map((target: any, i: number) => (
              <div key={i} className="text-sm">
                {target.character.type} subit {target.damage} dÃ©gÃ¢ts
                {target.isCritical && ' (CRITIQUE!)'}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleEndTurn}
            disabled={gameState.currentTurn !== 'player'}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Finir le tour
          </button>
          
          <div className="text-white">
            Tour: {gameState.currentTurn === 'player' ? 'Joueur' : 'Adversaire'} | 
            Tour #{gameState.turnCount}
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-80 space-y-4">
        <CharacterPanel
          characters={gameState.playerTeam}
          teamName="Votre Ã©quipe"
          currentCharacter={currentCharacter}
        />
        
        <CharacterPanel
          characters={gameState.enemyTeam}
          teamName="L'adversaire"
          currentCharacter={currentCharacter}
        />
        
        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-2">SÃ©lectionner un personnage</h3>
          <div className="space-y-2">
            {gameState.playerTeam
              .filter(c => c.isAlive)
              .map(char => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className={`w-full p-2 rounded text-left ${
                    selectedCharacter?.id === char.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {char.type} - PV: {char.health}/{char.maxHealth} - Mov: {char.movement}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

