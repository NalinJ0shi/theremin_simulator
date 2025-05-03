import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Particle system component
function ParticleSystem({ isPlaying, mousePosition }) {
  const particlesCount = 500;
  const positions = useRef(new Float32Array(particlesCount * 3));
  const colors = useRef(new Float32Array(particlesCount * 3));
  const sizes = useRef(new Float32Array(particlesCount));
  const velocities = useRef([]);
  const pointsRef = useRef();

  // Initialize particles
  useEffect(() => {
    // Initialize positions randomly
    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3;
      
      // Random position within a sphere
      positions.current[i3] = (Math.random() - 0.5) * 10;
      positions.current[i3 + 1] = (Math.random() - 0.5) * 10;
      positions.current[i3 + 2] = (Math.random() - 0.5) * 10;
      
      // Initial colors (blue-ish)
      colors.current[i3] = 0.1;
      colors.current[i3 + 1] = 0.3;
      colors.current[i3 + 2] = 0.8;
      
      // Random sizes
      sizes.current[i] = Math.random() * 0.5 + 0.5;
      
      // Initialize velocities
      velocities.current[i] = {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      };
    }
  }, []);

  // Animation loop
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array;
    const colors = pointsRef.current.geometry.attributes.color.array;
    const sizes = pointsRef.current.geometry.attributes.size.array;
    
    // Active mouse position
    const mx = isPlaying ? (mousePosition.x - 0.5) * 10 : 0;
    const my = isPlaying ? (mousePosition.y - 0.5) * -10 : 0; // Invert Y
    
    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3;
      
      // Update position with velocity
      positions[i3] += velocities.current[i].x;
      positions[i3 + 1] += velocities.current[i].y;
      positions[i3 + 2] += velocities.current[i].z;
      
      // Attract to center (0,0,0) to keep particles in view
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      
      // Reset if too far away
      if (Math.sqrt(x*x + y*y + z*z) > 20) {
        positions[i3] = (Math.random() - 0.5) * 5;
        positions[i3 + 1] = (Math.random() - 0.5) * 5;
        positions[i3 + 2] = (Math.random() - 0.5) * 5;
      }
      
      // Attraction to center
      velocities.current[i].x -= x * 0.0005;
      velocities.current[i].y -= y * 0.0005;
      velocities.current[i].z -= z * 0.0005;
      
      // Attraction to mouse position when playing
      if (isPlaying) {
        const dx = mx - x;
        const dy = my - y;
        const dist = Math.sqrt(dx*dx + dy*dy) + 0.1;
        const force = Math.min(0.01, 1 / (dist * dist));
        
        velocities.current[i].x += dx * force;
        velocities.current[i].y += dy * force;
        
        // Change color based on distance to mouse
        colors[i3] = 0.5 + 0.5 * Math.sin(dist * 0.2);
        colors[i3 + 1] = 0.2 + 0.3 * Math.cos(dist * 0.1);
        colors[i3 + 2] = 0.5 + 0.5 * Math.sin(dist * 0.3);
        
        // Change size based on distance
        sizes[i] = Math.min(3, 1 + 3 / dist);
      } else {
        // Slowly return to original colors when not playing
        colors[i3] = colors[i3] * 0.99 + 0.1 * 0.01;
        colors[i3 + 1] = colors[i3 + 1] * 0.99 + 0.3 * 0.01;
        colors[i3 + 2] = colors[i3 + 2] * 0.99 + 0.8 * 0.01;
        
        // Return to original size
        sizes[i] = sizes[i] * 0.99 + (Math.random() * 0.5 + 0.5) * 0.01;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    pointsRef.current.geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positions.current}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particlesCount}
          array={colors.current}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particlesCount}
          array={sizes.current}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1}
        sizeAttenuation={true}
        vertexColors={true}
        transparent={true}
        alphaTest={0.01}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Scene setup
function Scene({ isPlaying, mousePosition }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <ParticleSystem isPlaying={isPlaying} mousePosition={mousePosition} />
    </>
  );
}

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Initialize audio on first user interaction
  const initAudio = () => {
    if (!audioContextRef.current) {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create gain node (volume control)
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0; // Start with volume at 0
      gainNodeRef.current.connect(audioContextRef.current.destination);
      
      // Create oscillator (sound source)
      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = 'sine'; // Sine wave - smooth sound
      oscillatorRef.current.frequency.value = 440; // A4 note
      oscillatorRef.current.connect(gainNodeRef.current);
      oscillatorRef.current.start();
    }
  };

  const handleMouseDown = () => {
    initAudio();
    setIsPlaying(true);
    
    // Set volume to audible level
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = 0.5;
    }
  };

  const handleMouseUp = () => {
    setIsPlaying(false);
    
    // Set volume to 0
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = 0;
    }
  };

  const handleMouseMove = (e) => {
    // Update mouse position normalized to 0-1
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    setMousePosition({ x, y });
    
    if (!isPlaying || !oscillatorRef.current) return;
    
    // Map x position to frequency range (220-880 Hz)
    const frequency = 220 + x * 660;
    
    // Map y position to volume (0-1)
    const volume = 1 - y;
    
    // Update frequency and volume
    oscillatorRef.current.frequency.value = frequency;
    gainNodeRef.current.gain.value = volume;
  };

  // Clean up audio resources when component unmounts
  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100vh', 
        backgroundColor: 'black', 
        overflow: 'hidden',
        cursor: 'crosshair',
        userSelect: 'none',
        position: 'relative'
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <Canvas
        style={{ position: 'absolute', top: 0, left: 0 }}
        camera={{ position: [0, 0, 10], fov: 75 }}
      >
        <Scene isPlaying={isPlaying} mousePosition={mousePosition} />
      </Canvas>
      
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, padding: '20px' }}>
        <h1 style={{ color: 'white', margin: 0 }}>Theremin Simulator</h1>
        <p style={{ color: 'white' }}>
          Click and move mouse to play. X-axis: pitch, Y-axis: volume.
        </p>
      </div>
    </div>
  );
}

export default App;

