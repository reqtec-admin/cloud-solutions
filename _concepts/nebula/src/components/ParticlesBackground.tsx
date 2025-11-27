'use client';

import Particles from 'react-tsparticles';
import { useMemo } from 'react';

export function ParticlesBackground() {
  const particlesOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: { enable: true, mode: 'bubble' },
          onClick: { enable: true, mode: 'push' }
        },
        modes: {
          bubble: { distance: 200, size: 6, duration: 2, opacity: 0.8 },
          push: { quantity: 4 }
        }
      },
      particles: {
        color: { value: ['#38bdf8', '#a855f7', '#f472b6'] },
        links: {
          color: '#0ea5e9',
          distance: 150,
          enable: true,
          opacity: 0.4,
          width: 1.5
        },
        move: {
          direction: 'none',
          enable: true,
          outModes: { default: 'bounce' },
          speed: 0.8
        },
        number: { density: { enable: true, area: 800 }, value: 80 },
        opacity: { value: 0.9, animation: { enable: true, speed: 1, minimumValue: 0.5 } },
        size: { value: { min: 2, max: 6 } }
      },
      detectRetina: true
    }),
    []
  );

  return (
    <div 
      className="fixed inset-0 pointer-events-none" 
      style={{ 
        zIndex: -1, 
        width: '100vw', 
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <Particles
        options={particlesOptions}
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
    </div>
  );
}
