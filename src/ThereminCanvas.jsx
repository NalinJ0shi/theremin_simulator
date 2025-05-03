import { useState, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Audio context and oscillator setup
const useAudio = () => {
  const audioContextRef = useRef(null)
  const oscillatorRef = useRef(null)
  const gainNodeRef = useRef(null)
  
  useEffect(() => {
    // Create audio context
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    
    // Create gain node
    gainNodeRef.current = audioContextRef.current.createGain()
    gainNodeRef.current.gain.value = 0
    gainNodeRef.current.connect(audioContextRef.current.destination)
    
    // Create oscillator
    oscillatorRef.current = audioContextRef.current.createOscillator()
    oscillatorRef.current.type = 'sine'
    oscillatorRef.current.frequency.value = 440 // A4 note
    oscillatorRef.current.connect(gainNodeRef.current)
    oscillatorRef.current.start()
    
    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])
  
  const updateFrequency = (x) => {
    if (oscillatorRef.current) {
      // Map x position (0-1) to frequency range (220-880 Hz)
      const frequency = 220 + x * 660
      oscillatorRef.current.frequency.setValueAtTime(
        frequency,
        audioContextRef.current.currentTime
      )
    }
  }
  
  const updateVolume = (y) => {
    if (gainNodeRef.current) {
      // Map y position (0-1) to volume (0-1)
      const volume = 1 - y
      gainNodeRef.current.gain.setValueAtTime(
        volume,
        audioContextRef.current.currentTime
      )
    }
  }
  
  return { updateFrequency, updateVolume }
}

// Particle system
const ParticleSystem = ({ isActive, touchPosition }) => {
  const particlesCount = 2000
  const positions = useRef(new Float32Array(particlesCount * 3))
  const velocities = useRef(new Float32Array(particlesCount * 3))
  const colors = useRef(new Float32Array(particlesCount * 3))
  const sizes = useRef(new Float32Array(particlesCount))
  const geometry = useRef(null)
  const particles = useRef(null)
  
  // Initialize particle system
  useEffect(() => {
    // Initialize positions randomly in a sphere
    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3
      
      // Random position in a sphere
      const radius = 2 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions.current[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions.current[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions.current[i3 + 2] = radius * Math.cos(phi)
      
      // Random velocities
      velocities.current[i3] = (Math.random() - 0.5) * 0.01
      velocities.current[i3 + 1] = (Math.random() - 0.5) * 0.01
      velocities.current[i3 + 2] = (Math.random() - 0.5) * 0.01
      
      // Color based on position
      colors.current[i3] = 0.5 + positions.current[i3] / 10
      colors.current[i3 + 1] = 0.5 + positions.current[i3 + 1] / 10
      colors.current[i3 + 2] = 0.5 + positions.current[i3 + 2] / 10
      
      // Random sizes
      sizes.current[i] = Math.random() * 2 + 1
    }
  }, [])
  
  useFrame((state, delta) => {
    if (!geometry.current) return
    
    const positionAttribute = geometry.current.getAttribute('position')
    const positionArray = positionAttribute.array
    const colorAttribute = geometry.current.getAttribute('color')
    const colorArray = colorAttribute.array
    const sizeAttribute = geometry.current.getAttribute('size')
    
    // Touch influence point
    let touchX = 0
    let touchY = 0
    let touchZ = 0
    
    if (isActive && touchPosition) {
      touchX = (touchPosition.x - 0.5) * 10
      touchY = (touchPosition.y - 0.5) * -10
      touchZ = 0
    }
    
    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3
      
      // Update position
      positionArray[i3] += velocities.current[i3]
      positionArray[i3 + 1] += velocities.current[i3 + 1]
      positionArray[i3 + 2] += velocities.current[i3 + 2]
      
      // Attraction to center
      const x = positionArray[i3]
      const y = positionArray[i3 + 1]
      const z = positionArray[i3 + 2]
      
      // Distance from center
      const distance = Math.sqrt(x * x + y * y + z * z)
      
      // Reset if too far away
      if (distance > 10) {
        positionArray[i3] = (Math.random() - 0.5) * 5
        positionArray[i3 + 1] = (Math.random() - 0.5) * 5
        positionArray[i3 + 2] = (Math.random() - 0.5) * 5
      }
      
      // Attraction force to center
      velocities.current[i3] -= x * 0.0001
      velocities.current[i3 + 1] -= y * 0.0001
      velocities.current[i3 + 2] -= z * 0.0001
      
      // Touch influence if active
      if (isActive) {
        // Vector from particle to touch
        const dx = touchX - x
        const dy = touchY - y
        const dz = touchZ - z
        
        // Distance from touch point (with small offset to prevent division by zero)
        const touchDistance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1
        
        // Attraction force proportional to inverse square of distance
        const forceFactor = 0.01 / (touchDistance * touchDistance)
        
        velocities.current[i3] += dx * forceFactor
        velocities.current[i3 + 1] += dy * forceFactor
        velocities.current[i3 + 2] += dz * forceFactor
        
        // Change color based on touch
        colorArray[i3] = 0.5 + Math.sin(touchDistance + state.clock.elapsedTime)
        colorArray[i3 + 1] = 0.2 + Math.cos(touchDistance * 0.5 + state.clock.elapsedTime * 0.3)
        colorArray[i3 + 2] = 0.8 + Math.sin(touchDistance * 0.2 + state.clock.elapsedTime * 0.5)
        
        // Change size based on touch
        sizeAttribute.array[i] = Math.min(4, 1 + 5 / (touchDistance + 1))
      } else {
        // Slowly return to original colors when not touching
        colorArray[i3] = THREE.MathUtils.lerp(colorArray[i3], colors.current[i3], 0.01)
        colorArray[i3 + 1] = THREE.MathUtils.lerp(colorArray[i3 + 1], colors.current[i3 + 1], 0.01)
        colorArray[i3 + 2] = THREE.MathUtils.lerp(colorArray[i3 + 2], colors.current[i3 + 2], 0.01)
        
        // Return to original size
        sizeAttribute.array[i] = THREE.MathUtils.lerp(sizeAttribute.array[i], sizes.current[i], 0.01)
      }
    }
    
    positionAttribute.needsUpdate = true
    colorAttribute.needsUpdate = true
    sizeAttribute.needsUpdate = true
  })
  
  return (
    <points ref={particles}>
      <bufferGeometry ref={geometry}>
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
        size={2}
        sizeAttenuation={true}
        vertexColors={true}
        transparent={true}
        alphaTest={0.01}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Theremin interaction handler
const ThereminScene = () => {
  const [isActive, setIsActive] = useState(false)
  const [touchPosition, setTouchPosition] = useState({ x: 0.5, y: 0.5 })
  const { viewport } = useThree()
  const { updateFrequency, updateVolume } = useAudio()
  
  // Handle mouse/touch movement
  const handlePointerMove = (e) => {
    if (!isActive) return
    
    // Normalize coordinates to 0-1
    const x = e.clientX / window.innerWidth
    const y = e.clientY / window.innerHeight
    
    setTouchPosition({ x, y })
    updateFrequency(x)
    updateVolume(y)
  }
  
  // Handle start of interaction
  const handlePointerDown = (e) => {
    // Resume audio context if suspended
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
    
    setIsActive(true)
    
    // Initial position
    const x = e.clientX / window.innerWidth
    const y = e.clientY / window.innerHeight
    
    setTouchPosition({ x, y })
    updateFrequency(x)
    updateVolume(y)
  }
  
  // Handle end of interaction
  const handlePointerUp = () => {
    setIsActive(false)
    updateVolume(1) // Set volume to 0
  }
  
  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isActive])
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <OrbitControls enablePan={false} enableZoom={false} enabled={!isActive} />
      <ParticleSystem isActive={isActive} touchPosition={touchPosition} />
    </>
  )
}

const ThereminCanvas = () => {
  return (
    <div className="w-full h-screen cursor-none">
      <div className="fixed top-0 left-0 w-full p-4 text-white z-10 pointer-events-none">
        <h1 className="text-2xl font-bold">Theremin Simulator</h1>
        <p>Touch or click to play. Move horizontally to change pitch, vertically to change volume.</p>
      </div>
      
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ antialias: true }}
        className="bg-black"
      >
        <ThereminScene />
      </Canvas>
    </div>
  )
}

export default ThereminCanvas