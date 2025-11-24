import React from 'react';
import { SessionStatus } from '../types';
import { Visualizer } from './Visualizer';
import { Mic, MicOff, Square, X } from 'lucide-react';

interface DrivingViewProps {
  status: SessionStatus;
  volume: number;
  onToggleConnection: () => void;
  onEndSession: () => void;
  sessionTitle: string;
}

export const DrivingView: React.FC<DrivingViewProps> = ({
  status,
  volume,
  onToggleConnection,
  onEndSession,
  sessionTitle
}) => {
  const isConnected = status === SessionStatus.CONNECTED;
  const isConnecting = status === SessionStatus.CONNECTING;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-6 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black opacity-50 -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-gray-400 text-sm uppercase tracking-wider">Current Session</h2>
          <h1 className="text-2xl font-bold truncate max-w-[250px]">{sessionTitle}</h1>
        </div>
        <button 
          onClick={onEndSession}
          className="p-4 bg-gray-800 rounded-full hover:bg-gray-700 active:scale-95 transition-all border border-gray-700"
          aria-label="Exit Driving Mode"
        >
          <X className="w-6 h-6 text-gray-300" />
        </button>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Visualizer 
          volume={volume} 
          isActive={isConnected && volume > 5} 
          status={status} 
        />
        
        {isConnecting && (
          <p className="mt-4 text-indigo-400 animate-pulse">Establishing secure link...</p>
        )}
      </div>

      {/* Controls - Optimized for Touch/Driving */}
      <div className="mb-12 flex justify-center">
        <button
          onClick={onToggleConnection}
          disabled={isConnecting}
          className={`
            relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300
            ${isConnected 
              ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-[0_0_30px_rgba(79,70,229,0.4)]'
            }
            active:scale-95
          `}
        >
           {/* Ripple effect rings */}
           {isConnected && (
             <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
           )}

           {isConnected ? (
             <MicOff className="w-12 h-12 text-white" />
           ) : (
             <Mic className="w-12 h-12 text-white" />
           )}
        </button>
      </div>

      <div className="text-center text-gray-500 text-sm">
        {isConnected ? "Tap to Pause • Audio Active" : "Tap Microphone to Start"}
      </div>
    </div>
  );
};