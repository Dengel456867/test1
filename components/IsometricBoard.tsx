'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Character, Position, SpecialTile } from '@/lib/game/types';

interface TileProps {
  position: [number, number, number];
  isSpecial: boolean;
  specialType?: string;
  onClick: () => void;
  onRightClick: () => void;
}

function Tile({ position, isSpecial, specialType, onClick, onRightClick }: TileProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const getColor = () => {
    if (!isSpecial) return '#8B7355';
    switch (specialType) {
      case 'heal': return '#22c55e';
      case 'damage_boost': return '#ef4444';
      case 'movement_boost': return '#a855f7';
      default: return '#8B7355';
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick();
      }}
    >
      <boxGeometry args={[0.9, 0.1, 0.9]} />
      <meshStandardMaterial color={getColor()} />
    </mesh>
  );
}

interface CharacterModelProps {
  character: Character;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}

function CharacterModel({ character, position, isSelected, onClick }: CharacterModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const getColor = () => {
    if (character.team === 'player') return '#3b82f6';
    return '#ef4444';
  };

  const getShape = () => {
    switch (character.type) {
      case 'warrior': return 'box';
      case 'mage': return 'cone';
      case 'thief': return 'cylinder';
      default: return 'box';
    }
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        position={[0, 0.2, 0]}
      >
        {getShape() === 'box' && <boxGeometry args={[0.3, 0.4, 0.3]} />}
        {getShape() === 'cone' && <coneGeometry args={[0.2, 0.4, 8]} />}
        {getShape() === 'cylinder' && <cylinderGeometry args={[0.2, 0.2, 0.4, 8]} />}
        <meshStandardMaterial color={getColor()} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.5, 0]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshStandardMaterial color="#ffff00" />
        </mesh>
      )}
    </group>
  );
}

interface IsometricBoardProps {
  gameState: GameState;
  onTileClick: (pos: Position) => void;
  onTileRightClick: (pos: Position) => void;
  onCharacterClick: (character: Character) => void;
}

export default function IsometricBoard({
  gameState,
  onTileClick,
  onTileRightClick,
  onCharacterClick,
}: IsometricBoardProps) {
  const convertToIsometric = (x: number, y: number): [number, number, number] => {
    const isoX = (x - y) * 0.5;
    const isoY = (x + y) * 0.25;
    return [isoX, 0, isoY];
  };

  const getSpecialTile = (x: number, y: number): SpecialTile | null => {
    return gameState.specialTiles.find(
      tile => tile.position.x === x && tile.position.y === y && !tile.used
    ) || null;
  };

  const getCharacterAt = (x: number, y: number): Character | null => {
    return gameState.board[y]?.[x] || null;
  };

  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={[8, 12, 8]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={20} />

        {/* Plateau */}
        {Array.from({ length: 16 }, (_, y) =>
          Array.from({ length: 16 }, (_, x) => {
            const specialTile = getSpecialTile(x, y);
            const [isoX, isoY, isoZ] = convertToIsometric(x, y);
            
            return (
              <Tile
                key={`tile-${x}-${y}`}
                position={[isoX, isoY, isoZ]}
                isSpecial={!!specialTile}
                specialType={specialTile?.type}
                onClick={() => onTileClick({ x, y })}
                onRightClick={() => onTileRightClick({ x, y })}
              />
            );
          })
        )}

        {/* Personnages */}
        {[...gameState.playerTeam, ...gameState.enemyTeam].map((character) => {
          if (character.health <= 0) return null;
          const [isoX, isoY, isoZ] = convertToIsometric(character.position.x, character.position.y);
          return (
            <CharacterModel
              key={character.id}
              character={character}
              position={[isoX, isoY + 0.3, isoZ]}
              isSelected={gameState.selectedCharacter?.id === character.id}
              onClick={() => onCharacterClick(character)}
            />
          );
        })}
      </Canvas>
    </div>
  );
}

