import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { pcmToGeminiBlob, decodeBase64ToBytes, pcmToAudioBuffer, resampleAudioBuffer } from '../utils/audioUtils';
import { SessionStatus, TranscriptItem } from '../types';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000; // Gemini often returns 24kHz
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

interface UseLiveSessionProps {
  apiKey: string;
  systemInstruction: string;
  onTranscriptUpdate: (item: TranscriptItem) => void;
}

export const useLiveSession = ({ apiKey, systemInstruction, onTranscriptUpdate }: UseLiveSessionProps) => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [volume, setVolume] = useState(0); // For visualizer (0-100)
  
  // Audio Contexts & Nodes
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  
  // State for playback
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); // Type is loosely defined as the SDK types are complex to import fully without direct access
  const streamRef = useRef<MediaStream | null>(null);

  // Buffer for incoming partial transcription
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const connect = useCallback(async () => {
    if (!apiKey) {
      console.error("No API Key provided");
      return;
    }
    
    try {
      setStatus(SessionStatus.CONNECTING);

      // 1. Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      outputContextRef.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      outputNodeRef.current = outputContextRef.current.createGain();
      outputNodeRef.current.connect(outputContextRef.current.destination);

      // 2. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Setup GenAI Client
      const ai = new GoogleGenAI({ apiKey });
      
      // 4. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, 
          },
          tools: [{ googleSearch: {} }], // Enable Research capabilities
          inputAudioTranscription: { }, // Enable user transcription
          outputAudioTranscription: { }, // Enable model transcription
        },
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.CONNECTED);
            
            // Start recording pipeline
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              let inputData = e.inputBuffer.getChannelData(0);

              // Resample if necessary to match the 16kHz we promise the API
              if (e.inputBuffer.sampleRate !== INPUT_SAMPLE_RATE) {
                inputData = resampleAudioBuffer(e.inputBuffer, INPUT_SAMPLE_RATE);
              }
              
              // Calculate volume for visualizer
              let sum = 0;
              for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(100, rms * 400)); // Scale for UI

              const pcmBlob = pcmToGeminiBlob(inputData, INPUT_SAMPLE_RATE);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContextRef.current.destination);
            
            inputSourceRef.current = source;
            processorRef.current = scriptProcessor;
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Transcriptions
             const serverContent = message.serverContent;
             if (serverContent?.inputTranscription) {
               currentInputTranscription.current += serverContent.inputTranscription.text;
             }
             if (serverContent?.outputTranscription) {
               currentOutputTranscription.current += serverContent.outputTranscription.text;
             }

             // Turn complete: commit transcripts
             if (serverContent?.turnComplete) {
               if (currentInputTranscription.current.trim()) {
                 onTranscriptUpdate({
                   role: 'user',
                   text: currentInputTranscription.current.trim(),
                   timestamp: new Date().toISOString()
                 });
                 currentInputTranscription.current = '';
               }
               if (currentOutputTranscription.current.trim()) {
                 onTranscriptUpdate({
                   role: 'model',
                   text: currentOutputTranscription.current.trim(),
                   timestamp: new Date().toISOString()
                 });
                 currentOutputTranscription.current = '';
               }
             }

            // Handle Audio Output
            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current && outputNodeRef.current) {
               // Update next start time to prevent overlap
               nextStartTimeRef.current = Math.max(
                 nextStartTimeRef.current,
                 outputContextRef.current.currentTime
               );

               const audioBuffer = await pcmToAudioBuffer(
                 decodeBase64ToBytes(base64Audio),
                 outputContextRef.current,
                 OUTPUT_SAMPLE_RATE,
                 1
               );
               
               const source = outputContextRef.current.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNodeRef.current);
               
               source.addEventListener('ended', () => {
                 audioSourcesRef.current.delete(source);
               });
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               audioSourcesRef.current.add(source);
               
               // Visualizer for model speaking (simple simulation based on playback)
               setVolume(50); 
               setTimeout(() => setVolume(0), audioBuffer.duration * 1000);
            }

            // Handle Interruption
            if (serverContent?.interrupted) {
              // Stop all currently playing sources
              audioSourcesRef.current.forEach(source => {
                try { source.stop(); } catch(e) {}
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputTranscription.current = ''; // Discard interrupted text
            }
          },
          onclose: () => {
            setStatus(SessionStatus.IDLE);
          },
          onerror: (err) => {
            console.error('Session error:', err);
            setStatus(SessionStatus.ERROR);
          }
        }
      });
      
      sessionRef.current = await sessionPromise;

    } catch (e) {
      console.error("Failed to connect:", e);
      setStatus(SessionStatus.ERROR);
    }
  }, [apiKey, systemInstruction, onTranscriptUpdate]);

  const disconnect = useCallback(() => {
    // 1. Close Session
    if (sessionRef.current) {
       sessionRef.current = null;
    }

    // 2. Stop Microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 3. Disconnect Audio Nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    
    // 4. Close Audio Contexts
    if (inputContextRef.current?.state !== 'closed') inputContextRef.current?.close();
    if (outputContextRef.current?.state !== 'closed') outputContextRef.current?.close();

    // 5. Clear Buffer Sources
    audioSourcesRef.current.forEach(s => s.stop());
    audioSourcesRef.current.clear();

    setStatus(SessionStatus.IDLE);
    setVolume(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect, status, volume };
};