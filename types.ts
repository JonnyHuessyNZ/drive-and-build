export interface TranscriptItem {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface IdeaSession {
  id: string;
  title: string;
  date: string; // ISO String
  transcript: TranscriptItem[];
  summary?: string;
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerData {
  volume: number;
}
