'use client';

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Character, Position, SpecialTile } from '@/lib/types/game';

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (position: Position, isRightClick: boolean) => void;
  selectedCharacter: Character | null;
}

function Tile({ position, isSpecial, specialType, onClick, onRightClick }: {
  position: Position;
  isSpecial: boolean;
  specialType?: string;
  onClick: () => void;
  onRightClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const getColor = () => {
    if (!isSpecial) return '#8B7355';
    switch (specialType) {
      case 'heal': return '#4CAF50';
      case 'damage_boost': return '#F44336';
      case 'movement_boost': return '#9C27B0';
      default: return '#8B7355';
    }
  };
  
  return (
    <mesh
      ref={meshRef}
      position={[position.x - 7.5, 0, position.y - 7.5]}
      rotation={[-Math.PI / 2, 0, 0]}
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

function CharacterModel({ character, isSelected }: { character: Character; isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  const getColor = () => {
    if (character.team === 'player') {
      switch (character.type) {
        case 'warrior': return '#2196F3';
        case 'mage': return '#9C27B0';
        case 'thief': return '#4CAF50';
      }
    } else {
      switch (character.type) {
        case 'warrior': return '#F44336';
        case 'mage': return '#FF9800';
        case 'thief': return '#FFC107';
      }
    }
  };
  
  const scale = isSelected ? 1.2 : 1;
  
  return (
    <mesh
      ref={meshRef}
      position={[character.position.x - 7.5, 0.5, character.position.y - 7.5]}
      scale={[scale, scale, scale]}
    >
      <cylinderGeometry args={[0.3, 0.3, 0.8, 8]} />
      <meshStandardMaterial color={getColor()} />
    </mesh>
  );
}

export default function GameBoard({ gameState, onTileClick, selectedCharacter }: GameBoardProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(15, 20, 15);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, []);
  
  return (
    <div style={{ width: '100%', height: '600px', background: '#1a1a1a' }}>
      <Canvas>
        <PerspectiveCamera ref={cameraRef} makeDefault fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls
          enablePan={false}
          minDistance={10}
          maxDistance={30}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.5}
        />
        
        {/* Plateau */}
        {Array.from({ length: 16 }, (_, y) =>
          Array.from({ length: 16 }, (_, x) => {
            const specialTile = gameState.specialTiles.find(
              t => t.position.x === x && t.position.y === y && !t.used
            );
            return (
              <Tile
                key={`${x}-${y}`}
                position={{ x, y }}
                isSpecial={!!specialTile}
                specialType={specialTile?.type}
                onClick={() => onTileClick({ x, y }, false)}
                onRightClick={() => onTileClick({ x, y }, true)}
              />
            );
          })
        )}
        
        {/* Personnages */}
        {[...gameState.playerTeam, ...gameState.enemyTeam]
          .filter(c => c.isAlive)
          .map(character => (
            <CharacterModel
              key={character.id}
              character={character}
              isSelected={selectedCharacter?.id === character.id}
            />
          ))}
      </Canvas>
    </div>
  );
}

