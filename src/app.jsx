import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Cube particle system component
function ParticleSystem({ isPlaying, mousePosition }) {
  const particlesCount = 500;
  const meshRef = useRef();
  const dummy = useRef(new THREE.Object3D());
  const velocities = useRef([]);
  const colors = useRef([]);
  const sizes = useRef([]);

  // Initialize particles
  useEffect(() => {
    // Initialize velocities, colors and sizes
    for (let i = 0; i < particlesCount; i++) {
      // Initialize positions randomly
      dummy.current.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      
      // Random rotation
      dummy.current.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      // Random scale (size)
      const scale = Math.random() * 0.5 + 0.5;
      dummy.current.scale.set(scale, scale, scale);
      
      // Update the matrix
      dummy.current.updateMatrix();
      
      // Set the matrix of instance i
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
      
      // Store initial velocities
      velocities.current[i] = {
        x: (Math.random() - 0.5) * 0.003,
        y: (Math.random() - 0.5) * 0.003,
        z: (Math.random() - 0.5) * 0.003
      };
      
      // Store initial colors (blue-ish)
      colors.current[i] = {
        r: 0.1,
        g: 0.3,
        b: 0.8
      };
      
      // Store initial sizes
      sizes.current[i] = scale;
    }
    
    // Update the instance matrices
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Setup initial colors
    const instanceColors = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i++) {
      instanceColors[i * 3] = colors.current[i].r;
      instanceColors[i * 3 + 1] = colors.current[i].g;
      instanceColors[i * 3 + 2] = colors.current[i].b;
    }
    
    meshRef.current.geometry.setAttribute(
      'color',
      new THREE.InstancedBufferAttribute(instanceColors, 3)
    );
  }, []);

  // Animation loop
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Active mouse position
    const mx = isPlaying ? (mousePosition.x - 0.5) * 10 : 0;
    const my = isPlaying ? (mousePosition.y - 0.5) * -10 : 0; // Invert Y
    
    // Create new color buffer
    const colors = meshRef.current.geometry.attributes.color.array;
    
    for (let i = 0; i < particlesCount; i++) {
      // Get current matrix
      meshRef.current.getMatrixAt(i, dummy.current.matrix);
      // Decompose matrix to get position, rotation, scale
      dummy.current.matrix.decompose(
        dummy.current.position,
        dummy.current.quaternion,
        dummy.current.scale
      );
      
      // Update position with velocity
      dummy.current.position.x += velocities.current[i].x;
      dummy.current.position.y += velocities.current[i].y;
      dummy.current.position.z += velocities.current[i].z;
      
      // Slowly rotate the cubes
      dummy.current.rotation.x += 0.001;
      dummy.current.rotation.y += 0.001;
      dummy.current.rotation.z += 0.001;
      
      // Get current position
      const x = dummy.current.position.x;
      const y = dummy.current.position.y;
      const z = dummy.current.position.z;
      
      // Reset if too far away
      if (Math.sqrt(x*x + y*y + z*z) > 20) {
        dummy.current.position.set(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        );
      }
      
      // Attraction to center (reduced force)
      velocities.current[i].x -= x * 0.0002;
      velocities.current[i].y -= y * 0.0002;
      velocities.current[i].z -= z * 0.0002;
      
      // Attraction to mouse position when playing
      if (isPlaying) {
        const dx = mx - x;
        const dy = my - y;
        const dist = Math.sqrt(dx*dx + dy*dy) + 0.1;
        const force = Math.min(0.004, 0.4 / (dist * dist));
        
        velocities.current[i].x += dx * force;
        velocities.current[i].y += dy * force;
        
        // Change color based on distance to mouse
        const colorIndex = i * 3;
        colors[colorIndex] = 0.5 + 0.5 * Math.sin(dist * 0.2);     // Red
        colors[colorIndex + 1] = 0.2 + 0.3 * Math.cos(dist * 0.1); // Green
        colors[colorIndex + 2] = 0.5 + 0.5 * Math.sin(dist * 0.3); // Blue
        
        // Change size based on distance
        const newSize = Math.min(3, 1 + 3 / dist);
        dummy.current.scale.set(newSize, newSize, newSize);
      } else {
        // Slowly return to original colors when not playing
        const colorIndex = i * 3;
        colors[colorIndex] = colors[colorIndex] * 0.99 + 0.1 * 0.01;     // Red
        colors[colorIndex + 1] = colors[colorIndex + 1] * 0.99 + 0.3 * 0.01; // Green
        colors[colorIndex + 2] = colors[colorIndex + 2] * 0.99 + 0.8 * 0.01; // Blue
        
        // Return to original size
        const originalSize = sizes.current[i];
        dummy.current.scale.x = dummy.current.scale.x * 0.99 + originalSize * 0.01;
        dummy.current.scale.y = dummy.current.scale.y * 0.99 + originalSize * 0.01;
        dummy.current.scale.z = dummy.current.scale.z * 0.99 + originalSize * 0.01;
      }
      
      // Update the matrix
      dummy.current.updateMatrix();
      
      // Set the matrix at index i
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    
    // Update instance matrices and colors
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, particlesCount]}
    >
      <boxGeometry args={[0.2, 0.2, 0.2]}>
        <instancedBufferAttribute
          attach="attributes-color"
          count={particlesCount}
          array={new Float32Array(particlesCount * 3)}
          itemSize={3}
        />
      </boxGeometry>
      <meshPhongMaterial
        vertexColors={true}
        transparent={true}
        opacity={0.8}
        emissive="blue"
        emissiveIntensity={0.5}
      />
    </instancedMesh>
  );
}

// Scene setup
function Scene({ isPlaying, mousePosition }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
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