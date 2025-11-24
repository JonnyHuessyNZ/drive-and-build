import React from 'react';
import { IdeaSession, TranscriptItem } from '../types';
import { Play, Calendar, FileText, ArrowRight, Plus } from 'lucide-react';

interface SessionListProps {
  sessions: IdeaSession[];
  onStartNew: () => void;
  onSelectSession: (id: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({ sessions, onStartNew, onSelectSession }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Drive & Build</h1>
          <p className="text-gray-400">Your voice-first requirements engineering assistant.</p>
        </div>
        <button
          onClick={onStartNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>New Drive Session</span>
        </button>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
            <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MicIcon className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300">No sessions yet</h3>
            <p className="text-gray-500 mt-2">Start a new session before you start your commute.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className="group bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-all duration-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="bg-gray-800 p-3 rounded-lg group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors text-gray-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white mb-1">
                      {session.title || "Untitled Session"}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(session.date).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{session.transcript.length} turns</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
              </div>
              
              {session.transcript.length > 0 && (
                <div className="mt-4 p-3 bg-black/20 rounded border border-white/5 text-sm text-gray-400 line-clamp-2">
                  <span className="font-mono text-xs text-indigo-400 mr-2">LAST MSG:</span>
                  {session.transcript[session.transcript.length - 1].text}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Simple icon wrapper for the empty state
const MicIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);
