import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IdeaSession, TranscriptItem, SessionStatus } from './types';
import { useLiveSession } from './hooks/useLiveSession';
import { SessionList } from './components/SessionList';
import { DrivingView } from './components/DrivingView';
import { SessionDetail } from './components/SessionDetail';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// System instruction for the assistant
const BASE_SYSTEM_INSTRUCTION = `
You are a senior Critical Business Analyst and Product Strategist.
Your goal is to rigorously stress-test the user's business ideas to ensure they are viable, profitable, and scalable. You are NOT a cheerleader; you are a critical partner.

**Core Identity & Behavior:**
1.  **Be Critical, Not Affirmative**: Do not just say "That's a great idea!". Instead, say "That is an interesting space, but it's crowded. How is this different from [Competitor X]?"
2.  **Verbalize Your Plan**: Before diving into an answer or performing a search, explicitly tell the user what you are doing.
    *   *Example:* "I need to verify if the API pricing allows for good margins. I'm going to look up the current rates for [Service]."
    *   *Example:* "Let me check the recent funding trends in this sector to see if investor interest is drying up."
3.  **Research-First**: Use your search tools to find *facts*, *numbers*, and *competitors*. Base your advice on data, not intuition.
    *   Look for market size, CAC (Customer Acquisition Cost), and failed startups in the same space.
4.  **Initiate**: Start the conversation by asking: "What business hypothesis do you want to test today?"
5.  **Concise & Interruptible**: Keep spoken responses to 2-3 sentences max. If the user interrupts, stop immediately.

**Workflow:**
-   **Step 1: Listen** to the user's pitch.
-   **Step 2: State Plan**. "I'm going to research the top 3 competitors."
-   **Step 3: Execute & Report**. "I found X, Y, and Z. They dominate 80% of the market. How do you plan to compete?"
`;

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<'list' | 'driving' | 'detail'>('list');
  const [sessions, setSessions] = useState<IdeaSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('drive_build_sessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
  }, []);

  // Save to local storage whenever sessions change
  useEffect(() => {
    localStorage.setItem('drive_build_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // --- Live Session Hook ---
  
  // Get current session object
  const activeSession = sessions.find(s => s.id === currentSessionId);

  // Construct dynamic system instruction with context if resuming
  const currentSystemInstruction = useMemo(() => {
    if (!activeSession || activeSession.transcript.length === 0) {
      return BASE_SYSTEM_INSTRUCTION;
    }

    // If resuming, inject context
    const contextStr = activeSession.transcript
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n');
      
    return `${BASE_SYSTEM_INSTRUCTION}\n\n[CONTEXT FROM PREVIOUS SESSION]\nThe user is resuming a previous brainstorming session. Here is the history so far. Use this context to continue iterating on the idea. Do not repeat old questions.\n\n${contextStr}\n\n[END CONTEXT]\nGreet the user by saying "Welcome back. I've reviewed our notes on [Idea Name]. Let's continue validating the [Next Step]. Ready?"`;
  }, [activeSession]);

  // Callback to handle new transcript items
  const handleTranscriptUpdate = useCallback((item: TranscriptItem) => {
    if (!currentSessionId) return;

    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        // Auto-generate title if it's "New Session" and we have user input
        let newTitle = session.title;
        if (session.title === "New Session" && item.role === 'user' && session.transcript.length < 2) {
           // Simple heuristic: First few words of first user message
           newTitle = item.text.split(' ').slice(0, 5).join(' ') + '...';
        }

        return {
          ...session,
          title: newTitle,
          transcript: [...session.transcript, item]
        };
      }
      return session;
    }));
  }, [currentSessionId]);

  const { connect, disconnect, status, volume } = useLiveSession({
    apiKey: process.env.API_KEY || '', // Injected by environment
    systemInstruction: currentSystemInstruction,
    onTranscriptUpdate: handleTranscriptUpdate
  });

  // --- Handlers ---

  const startNewSession = () => {
    const newSession: IdeaSession = {
      id: generateId(),
      title: "New Session",
      date: new Date().toISOString(),
      transcript: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setView('driving');
  };

  const selectSession = (id: string) => {
    setCurrentSessionId(id);
    setView('detail');
  };

  const resumeDrivingSession = () => {
    if (currentSessionId) {
      setView('driving');
    }
  };

  const toggleDrivingConnection = () => {
    if (status === SessionStatus.CONNECTED || status === SessionStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const endDrivingSession = () => {
    disconnect();
    // Go to detail view after ending driving to review
    setView('detail');
  };

  const backToHome = () => {
    disconnect(); // Ensure we disconnect if backing out
    setView('list');
    setCurrentSessionId(null);
  };

  // --- Render ---

  if (view === 'driving' && activeSession) {
    return (
      <DrivingView 
        status={status}
        volume={volume}
        onToggleConnection={toggleDrivingConnection}
        onEndSession={endDrivingSession}
        sessionTitle={activeSession.title}
      />
    );
  }

  if (view === 'detail' && activeSession) {
    return (
      <SessionDetail 
        session={activeSession}
        onBack={backToHome}
        onResume={resumeDrivingSession}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <SessionList 
        sessions={sessions}
        onStartNew={startNewSession}
        onSelectSession={selectSession}
      />
    </div>
  );
};

export default App;