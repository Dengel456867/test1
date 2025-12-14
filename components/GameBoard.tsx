'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Character, Position } from '@/lib/types/game';

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (position: Position, isRightClick: boolean) => void;
  selectedCharacter: Character | null;
  originalPosition?: Position | null;
  originalMovement?: number;
  hasAttacked?: boolean;
  onCharacterClick?: (character: Character) => void;
}

// Tuile plate avec symboles pour les cases spéciales
function Tile({ position, isSpecial, specialType, isHighlighted, onClick, onRightClick }: {
  position: Position;
  isSpecial: boolean;
  specialType?: string;
  isHighlighted: boolean;
  onClick: () => void;
  onRightClick: () => void;
}) {
  // Symbole et couleur selon le type de case spéciale
  const getSpecialInfo = () => {
    switch (specialType) {
      case 'heal': return { symbol: '❤', color: '#22c55e' }; // Coeur vert
      case 'damage_boost': return { symbol: '✊', color: '#ef4444' }; // Poing rouge
      case 'movement_boost': return { symbol: '👟', color: '#a855f7' }; // Chaussure violette
      case 'initiative_boost': return { symbol: '⚡', color: '#eab308' }; // Éclair jaune
      default: return null;
    }
  };
  
  const getBaseColor = () => {
    const isEven = (position.x + position.y) % 2 === 0;
    return isEven ? '#2a2a3a' : '#1a1a2a';
  };
  
  const highlightColor = '#1e40af'; // Bleu plus sombre/terne
  const specialInfo = getSpecialInfo();
  const baseColor = getBaseColor();
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick();
  };
  
  const handleRightClick = (e: any) => {
    if (e.button === 2) {
      e.stopPropagation();
      onRightClick();
    }
  };
  
  const xPos = position.x - 7.5;
  const yPos = position.y - 7.5;
  
  // Cas: Case surlignée (mouvement) ET spéciale -> fond bleu avec symbole
  if (isHighlighted && isSpecial && specialInfo) {
    return (
      <group position={[xPos, 0, yPos]}>
        {/* Fond bleu (mouvement) - terne */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleClick}
          onPointerDown={handleRightClick}
        >
          <planeGeometry args={[0.95, 0.95]} />
          <meshStandardMaterial color={highlightColor} emissive={highlightColor} emissiveIntensity={0.15} transparent opacity={0.85} />
        </mesh>
        {/* Symbole de la case spéciale */}
        <Text
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.5}
          color={specialInfo.color}
          anchorX="center"
          anchorY="middle"
        >
          {specialInfo.symbol}
        </Text>
      </group>
    );
  }
  
  // Cas: Case spéciale (non surlignée) -> fond normal avec symbole simple
  if (isSpecial && specialInfo) {
    return (
      <group position={[xPos, 0, yPos]}>
        {/* Fond normal */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleClick}
          onPointerDown={handleRightClick}
        >
          <planeGeometry args={[0.95, 0.95]} />
          <meshStandardMaterial color={baseColor} />
        </mesh>
        {/* Symbole coloré simple */}
        <Text
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.55}
          color={specialInfo.color}
          anchorX="center"
          anchorY="middle"
        >
          {specialInfo.symbol}
        </Text>
      </group>
    );
  }
  
  // Cas normal: case simple (surlignée ou non)
  const tileColor = isHighlighted ? highlightColor : baseColor;
  const emissiveIntensity = isHighlighted ? 0.15 : 0; // Moins lumineux
  
  return (
    <mesh
      position={[xPos, 0, yPos]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
      onPointerDown={handleRightClick}
    >
      <planeGeometry args={[0.95, 0.95]} />
      <meshStandardMaterial 
        color={tileColor} 
        emissive={isHighlighted ? tileColor : undefined}
        emissiveIntensity={emissiveIntensity}
        transparent={isHighlighted}
        opacity={isHighlighted ? 0.8 : 1}
      />
    </mesh>
  );
}

// Tour (Rook) pour le Guerrier
function RookPiece({ color, emissive, emissiveIntensity, scale }: { color: string; emissive: string; emissiveIntensity: number; scale: number }) {
  return (
    <group scale={[scale, scale, scale]}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.15, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Anneau noir sur la base */}
      <mesh position={[0, 0.08, 0]}>
        <torusGeometry args={[0.28, 0.025, 8, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Corps */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.35, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Bande noire au milieu du corps */}
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[0.23, 0.02, 8, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Haut évasé */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.15, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Anneau noir sous les créneaux */}
      <mesh position={[0, 0.56, 0]}>
        <torusGeometry args={[0.27, 0.02, 8, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Créneaux (4) */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.18, 0.65, Math.sin(i * Math.PI / 2) * 0.18]}>
          <boxGeometry args={[0.12, 0.15, 0.12]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
        </mesh>
      ))}
      {/* Détails noirs sur les créneaux */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`detail-${i}`} position={[Math.cos(i * Math.PI / 2) * 0.18, 0.72, Math.sin(i * Math.PI / 2) * 0.18]}>
          <boxGeometry args={[0.06, 0.02, 0.06]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
    </group>
  );
}

// Fou (Bishop) pour le Mage
function BishopPiece({ color, emissive, emissiveIntensity, scale }: { color: string; emissive: string; emissiveIntensity: number; scale: number }) {
  return (
    <group scale={[scale, scale, scale]}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Anneau noir sur la base */}
      <mesh position={[0, 0.06, 0]}>
        <torusGeometry args={[0.27, 0.02, 8, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Corps inférieur */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.18, 0.26, 0.2, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Bande noire transition */}
      <mesh position={[0, 0.24, 0]}>
        <torusGeometry args={[0.185, 0.015, 8, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Corps principal (forme de goutte) */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Fente diagonale (représentée par un anneau) - noir */}
      <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.12, 0.025, 8, 16]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Bande noire horizontale sur le corps */}
      <mesh position={[0, 0.35, 0]}>
        <torusGeometry args={[0.19, 0.015, 8, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Pointe */}
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Anneau noir sous la pointe */}
      <mesh position={[0, 0.58, 0]}>
        <torusGeometry args={[0.06, 0.015, 8, 16]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}

// Cavalier (Knight) pour le Voleur
function KnightPiece({ color, emissive, emissiveIntensity, scale }: { color: string; emissive: string; emissiveIntensity: number; scale: number }) {
  return (
    <group scale={[scale, scale, scale]}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Anneau noir sur la base */}
      <mesh position={[0, 0.06, 0]}>
        <torusGeometry args={[0.27, 0.02, 8, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Support */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.2, 0.26, 0.12, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Corps du cheval (simplifié) */}
      <mesh position={[0, 0.35, 0.05]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.2, 0.35, 0.25]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Crinière noire sur le dos */}
      <mesh position={[0, 0.48, -0.02]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.04, 0.2, 0.08]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Tête du cheval */}
      <mesh position={[0, 0.55, 0.18]} rotation={[0.8, 0, 0]}>
        <boxGeometry args={[0.15, 0.25, 0.18]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Crinière sur la tête */}
      <mesh position={[0, 0.62, 0.08]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.04, 0.15, 0.06]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Museau */}
      <mesh position={[0, 0.5, 0.32]} rotation={[1.2, 0, 0]}>
        <boxGeometry args={[0.1, 0.18, 0.1]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Yeux noirs */}
      <mesh position={[-0.06, 0.56, 0.26]} rotation={[0.8, 0, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[0.06, 0.56, 0.26]} rotation={[0.8, 0, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Narines */}
      <mesh position={[-0.025, 0.48, 0.37]} rotation={[1.2, 0, 0]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[0.025, 0.48, 0.37]} rotation={[1.2, 0, 0]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Oreilles */}
      <mesh position={[-0.06, 0.68, 0.12]} rotation={[0.3, 0, -0.2]}>
        <coneGeometry args={[0.04, 0.1, 4]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      <mesh position={[0.06, 0.68, 0.12]} rotation={[0.3, 0, 0.2]}>
        <coneGeometry args={[0.04, 0.1, 4]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {/* Intérieur des oreilles noir */}
      <mesh position={[-0.055, 0.66, 0.13]} rotation={[0.3, 0, -0.2]}>
        <coneGeometry args={[0.02, 0.06, 4]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[0.055, 0.66, 0.13]} rotation={[0.3, 0, 0.2]}>
        <coneGeometry args={[0.02, 0.06, 4]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}

// Personnage - Pièce d'échecs selon le type
function CharacterModel({ character, isSelected, onClick }: { 
  character: Character; 
  isSelected: boolean;
  onClick?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = 0.15 + Math.sin(state.clock.elapsedTime * 3) * 0.08;
    } else if (groupRef.current) {
      groupRef.current.position.y = 0.15;
    }
  });
  
  const teamColor = character.team === 'player' ? '#3b82f6' : '#ef4444';
  const glowColor = character.team === 'player' ? '#60a5fa' : '#f87171';
  const emissiveIntensity = isSelected ? 0.6 : 0.25;
  const scale = isSelected ? 1.7 : 1.5; // Pions encore plus grands
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClick) onClick();
  };
  
  return (
    <group
      ref={groupRef}
      position={[character.position.x - 7.5, 0.15, character.position.y - 7.5]}
      onClick={handleClick}
    >
      {/* Pièce selon le type */}
      {character.type === 'warrior' && (
        <RookPiece color={teamColor} emissive={isSelected ? glowColor : teamColor} emissiveIntensity={emissiveIntensity} scale={scale} />
      )}
      {character.type === 'mage' && (
        <BishopPiece color={teamColor} emissive={isSelected ? glowColor : teamColor} emissiveIntensity={emissiveIntensity} scale={scale} />
      )}
      {character.type === 'thief' && (
        <KnightPiece color={teamColor} emissive={isSelected ? glowColor : teamColor} emissiveIntensity={emissiveIntensity} scale={scale} />
      )}
      
      {/* Indicateur de sélection */}
      {isSelected && (
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.12, 0.18, 4]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.9} />
        </mesh>
      )}
      
      {/* Barre de vie - Billboard pour toujours faire face à la caméra */}
      <Billboard position={[0, 0.95, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.5, 0.06]} />
          <meshBasicMaterial color="#1f2937" />
        </mesh>
        <mesh position={[(character.health / character.maxHealth - 1) * 0.25, 0, 0.02]}>
          <planeGeometry args={[0.5 * (character.health / character.maxHealth), 0.04]} />
          <meshBasicMaterial color={character.health > 5 ? '#22c55e' : character.health > 2 ? '#eab308' : '#ef4444'} />
        </mesh>
      </Billboard>
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

// Coordonnées du plateau (A-P en colonnes, 1-16 en lignes)
function BoardCoordinates() {
  const columns = 'ABCDEFGHIJKLMNOP'.split('');
  const rows = Array.from({ length: 16 }, (_, i) => i + 1);
  
  return (
    <group>
      {/* Colonnes A-P en bas du plateau */}
      {columns.map((letter, i) => (
        <Text
          key={`col-${letter}`}
          position={[i - 7.5, 0.1, 8.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="#9ca3af"
          anchorX="center"
          anchorY="middle"
        >
          {letter}
        </Text>
      ))}
      
      {/* Colonnes A-P en haut du plateau */}
      {columns.map((letter, i) => (
        <Text
          key={`col-top-${letter}`}
          position={[i - 7.5, 0.1, -8.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="#9ca3af"
          anchorX="center"
          anchorY="middle"
        >
          {letter}
        </Text>
      ))}
      
      {/* Lignes 1-16 à gauche du plateau */}
      {rows.map((num, i) => (
        <Text
          key={`row-left-${num}`}
          position={[-8.8, 0.1, i - 7.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.35}
          color="#9ca3af"
          anchorX="center"
          anchorY="middle"
        >
          {num.toString()}
        </Text>
      ))}
      
      {/* Lignes 1-16 à droite du plateau */}
      {rows.map((num, i) => (
        <Text
          key={`row-right-${num}`}
          position={[8.8, 0.1, i - 7.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.35}
          color="#9ca3af"
          anchorX="center"
          anchorY="middle"
        >
          {num.toString()}
        </Text>
      ))}
    </group>
  );
}

export default function GameBoard({ 
  gameState, 
  onTileClick, 
  selectedCharacter, 
  originalPosition,
  originalMovement,
  hasAttacked,
  onCharacterClick 
}: GameBoardProps) {
  // Cases où le personnage sélectionné peut se déplacer (basé sur la position d'origine)
  const getHighlightedTiles = (): Set<string> => {
    if (!selectedCharacter || hasAttacked) return new Set();
    
    // Utiliser la position d'origine et le mouvement d'origine pour le calcul
    const originPos = originalPosition || selectedCharacter.position;
    const range = originalMovement ?? selectedCharacter.movement;
    
    if (range <= 0) return new Set();
    
    const highlighted = new Set<string>();
    
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const distance = Math.abs(x - originPos.x) + Math.abs(y - originPos.y);
        // Exclure la position actuelle du personnage
        const isCurrentPos = x === selectedCharacter.position.x && y === selectedCharacter.position.y;
        // La case d'origine doit toujours être accessible (pour revenir)
        const isOriginPos = x === originPos.x && y === originPos.y;
        // La case est valide si: dans la portée ET (vide OU c'est l'origine) ET pas la position actuelle
        const isTileEmpty = !gameState.board[y][x];
        
        if (distance <= range && !isCurrentPos && (isTileEmpty || isOriginPos)) {
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
        <BoardCoordinates />
        
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
              onClick={character.team === 'player' && onCharacterClick ? () => onCharacterClick(character) : undefined}
            />
          ))}
      </Canvas>
    </div>
  );
}
