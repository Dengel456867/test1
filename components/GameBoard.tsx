'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Character, Position } from '@/lib/types/game';

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (position: Position, isRightClick: boolean) => void;
  selectedCharacter: Character | null;
}

// Tuile plate
function Tile({ position, isSpecial, specialType, isHighlighted, onClick, onRightClick }: {
  position: Position;
  isSpecial: boolean;
  specialType?: string;
  isHighlighted: boolean;
  onClick: () => void;
  onRightClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const getColor = () => {
    if (isHighlighted) return '#3b82f6'; // Bleu pour case sélectionnable
    if (!isSpecial) {
      // Damier classique
      const isEven = (position.x + position.y) % 2 === 0;
      return isEven ? '#2a2a3a' : '#1a1a2a';
    }
    switch (specialType) {
      case 'heal': return '#22c55e'; // Vert
      case 'damage_boost': return '#ef4444'; // Rouge
      case 'movement_boost': return '#a855f7'; // Violet
      default: return '#2a2a3a';
    }
  };
  
  return (
    <mesh
      ref={meshRef}
      position={[position.x - 7.5, 0, position.y - 7.5]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => {
        if (e.button === 2) {
          e.stopPropagation();
          onRightClick();
        }
      }}
    >
      <planeGeometry args={[0.95, 0.95]} />
      <meshStandardMaterial 
        color={getColor()} 
        transparent
        opacity={isSpecial ? 0.9 : 1}
      />
    </mesh>
  );
}

// Personnage - Cylindre avec couleur équipe
function CharacterModel({ character, isSelected }: { character: Character; isSelected: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Animation de flottement pour le personnage sélectionné
  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    } else if (groupRef.current) {
      groupRef.current.position.y = 0.4;
    }
  });
  
  // Couleur basée sur l'équipe uniquement
  const teamColor = character.team === 'player' ? '#3b82f6' : '#ef4444'; // Bleu vs Rouge
  const glowColor = character.team === 'player' ? '#60a5fa' : '#f87171';
  
  // Emoji du type
  const getEmoji = () => {
    switch (character.type) {
      case 'warrior': return '⚔️';
      case 'mage': return '🔮';
      case 'thief': return '🗡️';
      default: return '👤';
    }
  };
  
  const scale = isSelected ? 1.3 : 1;
  
  return (
    <group
      ref={groupRef}
      position={[character.position.x - 7.5, 0.4, character.position.y - 7.5]}
    >
      {/* Base / socle */}
      <mesh position={[0, -0.35, 0]} scale={[scale, 0.1, scale]}>
        <cylinderGeometry args={[0.35, 0.4, 0.1, 16]} />
        <meshStandardMaterial color={teamColor} emissive={teamColor} emissiveIntensity={0.3} />
      </mesh>
      
      {/* Corps du personnage */}
      <mesh scale={[scale, scale, scale]}>
        <cylinderGeometry args={[0.25, 0.3, 0.6, 16]} />
        <meshStandardMaterial 
          color={teamColor} 
          emissive={isSelected ? glowColor : teamColor} 
          emissiveIntensity={isSelected ? 0.5 : 0.2}
        />
      </mesh>
      
      {/* Tête */}
      <mesh position={[0, 0.45 * scale, 0]} scale={[scale, scale, scale]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color={teamColor} 
          emissive={isSelected ? glowColor : teamColor} 
          emissiveIntensity={isSelected ? 0.5 : 0.2}
        />
      </mesh>
      
      {/* Indicateur de sélection */}
      {isSelected && (
        <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.15, 0.2, 4]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>
      )}
      
      {/* Barre de vie */}
      <group position={[0, 0.8, 0]} rotation={[0, 0, 0]}>
        {/* Fond de la barre */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.6, 0.08]} />
          <meshBasicMaterial color="#1f2937" />
        </mesh>
        {/* Vie restante */}
        <mesh position={[(character.health / character.maxHealth - 1) * 0.3, 0, 0.02]}>
          <planeGeometry args={[0.6 * (character.health / character.maxHealth), 0.06]} />
          <meshBasicMaterial color={character.health > 5 ? '#22c55e' : character.health > 2 ? '#eab308' : '#ef4444'} />
        </mesh>
      </group>
    </group>
  );
}

// Sol du plateau
function BoardFloor() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[17, 17]} />
      <meshStandardMaterial color="#0f0f1a" />
    </mesh>
  );
}

// Bordure du plateau
function BoardBorder() {
  return (
    <lineSegments position={[0, 0.01, 0]}>
      <edgesGeometry args={[new THREE.BoxGeometry(16, 0.02, 16)]} />
      <lineBasicMaterial color="#6366f1" linewidth={2} />
    </lineSegments>
  );
}

export default function GameBoard({ gameState, onTileClick, selectedCharacter }: GameBoardProps) {
  // Cases où le personnage sélectionné peut se déplacer
  const getHighlightedTiles = (): Set<string> => {
    if (!selectedCharacter || selectedCharacter.movement <= 0) return new Set();
    const highlighted = new Set<string>();
    const { x: sx, y: sy } = selectedCharacter.position;
    const range = selectedCharacter.movement;
    
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const distance = Math.abs(x - sx) + Math.abs(y - sy);
        if (distance > 0 && distance <= range && !gameState.board[y][x]) {
          highlighted.add(`${x}-${y}`);
        }
      }
    }
    return highlighted;
  };
  
  const highlightedTiles = getHighlightedTiles();
  
  return (
    <div 
      style={{ 
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, #1a1a3a 0%, #0a0a1a 70%, #050510 100%)'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas shadows style={{ width: '100%', height: '100%' }}>
        <PerspectiveCamera 
          makeDefault 
          position={[0, 22, 16]} 
          fov={45}
        />
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 15, 10]} 
          intensity={1} 
          castShadow
        />
        <pointLight position={[0, 10, 0]} intensity={0.3} color="#6366f1" />
        
        <OrbitControls
          enablePan={false}
          minDistance={12}
          maxDistance={35}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />
        
        {/* Sol */}
        <BoardFloor />
        <BoardBorder />
        
        {/* Tuiles */}
        {Array.from({ length: 16 }, (_, y) =>
          Array.from({ length: 16 }, (_, x) => {
            const specialTile = gameState.specialTiles.find(
              t => t.position.x === x && t.position.y === y && !t.used
            );
            const isHighlighted = highlightedTiles.has(`${x}-${y}`);
            return (
              <Tile
                key={`${x}-${y}`}
                position={{ x, y }}
                isSpecial={!!specialTile}
                specialType={specialTile?.type}
                isHighlighted={isHighlighted}
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
