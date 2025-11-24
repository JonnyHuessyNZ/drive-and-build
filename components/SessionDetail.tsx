import React from 'react';
import { IdeaSession, TranscriptItem } from '../types';
import { ArrowLeft, MessageSquare, Copy, Check, Mic } from 'lucide-react';

interface SessionDetailProps {
  session: IdeaSession;
  onBack: () => void;
  onResume: () => void;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({ session, onBack, onResume }) => {
  const [copied, setCopied] = React.useState(false);

  const copyTranscript = () => {
    const text = session.transcript
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white font-semibold max-w-[200px] md:max-w-md truncate">{session.title}</h2>
            <p className="text-xs text-gray-500">{new Date(session.date).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button
            onClick={onResume}
            className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-sm text-white transition-colors font-medium shadow-lg shadow-indigo-500/20"
          >
            <Mic className="w-4 h-4" />
            Resume Idea
          </button>
          <button
            onClick={copyTranscript}
            className="p-2 md:px-3 md:py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
            title="Copy Transcript"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative">
        {session.transcript.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            No transcription data available for this session.
          </div>
        ) : (
          session.transcript.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex gap-4 max-w-3xl mx-auto ${item.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0
                ${item.role === 'model' ? 'bg-indigo-600' : 'bg-gray-700'}
              `}>
                {item.role === 'model' ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              
              <div className={`
                flex flex-col max-w-[80%]
                ${item.role === 'user' ? 'items-end' : 'items-start'}
              `}>
                <div className={`
                  px-4 py-3 rounded-2xl text-sm leading-relaxed
                  ${item.role === 'model' 
                    ? 'bg-gray-800 text-gray-200 rounded-tl-none' 
                    : 'bg-indigo-600 text-white rounded-tr-none'
                  }
                `}>
                  {item.text}
                </div>
                <span className="text-[10px] text-gray-600 mt-1">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Floating Action Button for Resume */}
      <div className="md:hidden absolute bottom-6 right-6">
        <button
          onClick={onResume}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
        >
          <Mic className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};