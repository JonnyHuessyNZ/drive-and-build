import React from 'react';

interface VisualizerProps {
  volume: number; // 0-100
  isActive: boolean;
  status: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive, status }) => {
  // Generate bars
  const bars = Array.from({ length: 5 });

  return (
    <div className="flex flex-col items-center justify-center h-48 w-full">
      <div className={`text-sm mb-4 font-mono uppercase tracking-widest ${
        status === 'ERROR' ? 'text-red-500' :
        status === 'CONNECTED' ? 'text-emerald-400' : 
        'text-gray-500'
      }`}>
        {status}
      </div>
      
      <div className="flex items-center gap-3 h-24">
        {bars.map((_, i) => {
          // Add some randomness to make it look organic based on volume
          const height = isActive 
            ? Math.max(10, volume * (0.5 + Math.random())) 
            : 10;
            
          return (
            <div 
              key={i}
              className={`w-3 md:w-4 rounded-full transition-all duration-75 ease-out ${
                isActive ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-gray-700'
              }`}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
    </div>
  );
};