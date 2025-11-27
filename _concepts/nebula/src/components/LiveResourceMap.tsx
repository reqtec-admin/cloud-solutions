'use client';

import { motion } from 'framer-motion';
import { liveMapNodes, liveMapEdges } from '@/lib/mocks';

export function LiveResourceMap() {
  return (
    <div className="glass-card relative h-64 w-full overflow-hidden p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>Live resource map</span>
        <span className="text-cyan-300">real-time topo</span>
      </div>
      <div className="mt-3 h-full w-full">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {liveMapEdges.map((edge) => {
            const fromNode = liveMapNodes.find((node) => node.id === edge.from);
            const toNode = liveMapNodes.find((node) => node.id === edge.to);
            if (!fromNode || !toNode) return null;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#38bdf8"
                strokeOpacity={0.4}
                strokeWidth={0.4}
              />
            );
          })}
          {liveMapNodes.map((node) => (
            <motion.g
              key={node.id}
              initial={{ scale: 0.5 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={4}
                fill={node.color}
                stroke="#fff"
                strokeWidth={0.3}
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <text
                x={node.x}
                y={node.y + 7}
                fontSize={3.5}
                textAnchor="middle"
                fill="#e2e8f0"
              >
                {node.label}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>
    </div>
  );
}
