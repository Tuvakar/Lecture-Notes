import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface AudioRecorderProps {
  onTranscriptUpdate: (text: string) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
}

export function AudioRecorder({ onTranscriptUpdate, isRecording, setIsRecording }: AudioRecorderProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'recording'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const audioChunksRef = useRef<Float32Array[]>([]);
  const recordingLengthRef = useRef(0);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../lib/whisper.worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      const { type, progress, text, error } = e.data;
      if (type === 'progress') {
        if (progress?.status === 'progress') {
           setProgress(Math.round(progress.progress));
        }
      } else if (type === 'ready') {
        setStatus('ready');
        startAudioCapture();
      } else if (type === 'result') {
        if (text && text.trim()) {
          onTranscriptUpdate(text.trim() + ' ');
        }
      } else if (type === 'error') {
        console.error('Whisper Worker Error:', error);
        alert('Error loading Whisper model: ' + error);
        stopRecording();
        setStatus('idle');
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const startRecording = async () => {
    if (status === 'idle') {
      setStatus('loading');
      workerRef.current?.postMessage({ type: 'load' });
    } else if (status === 'ready') {
      startAudioCapture();
    }
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      audioChunksRef.current = [];
      recordingLengthRef.current = 0;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(inputData);
        audioChunksRef.current.push(chunk);
        recordingLengthRef.current += chunk.length;

        // Process every ~3 seconds (16000 * 3 = 48000)
        if (recordingLengthRef.current >= 48000) {
          const merged = new Float32Array(recordingLengthRef.current);
          let offset = 0;
          for (const c of audioChunksRef.current) {
            merged.set(c, offset);
            offset += c.length;
          }
          workerRef.current?.postMessage({ type: 'transcribe', audio: merged });

          audioChunksRef.current = [];
          recordingLengthRef.current = 0;
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setStatus('recording');
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start audio capture:", err);
      alert("Failed to access microphone.");
      setStatus('ready');
    }
  };

  const stopRecording = () => {
    // Process any remaining audio
    if (recordingLengthRef.current > 0) {
       const merged = new Float32Array(recordingLengthRef.current);
       let offset = 0;
       for (const c of audioChunksRef.current) {
         merged.set(c, offset);
         offset += c.length;
       }
       workerRef.current?.postMessage({ type: 'transcribe', audio: merged });
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setStatus('ready');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <AnimatePresence mode="wait">
          {status === 'idle' || status === 'ready' ? (
            <motion.button
              key="start"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={startRecording}
              className="group relative flex items-center justify-center w-20 h-20 bg-slate-800 border border-slate-700 rounded-full transition-all hover:scale-105 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] active:scale-95"
            >
              <Mic className="h-8 w-8 text-cyan-400 group-hover:animate-pulse" />
              <div className="absolute -inset-1 bg-cyan-500 rounded-full opacity-0 group-hover:opacity-10 blur transition-opacity" />
            </motion.button>
          ) : status === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center justify-center w-20 h-20 bg-slate-800 border border-slate-700 rounded-full"
            >
              <Download className="h-6 w-6 text-cyan-400 animate-bounce mb-1" />
              <span className="text-[10px] font-mono text-cyan-400">{progress}%</span>
            </motion.div>
          ) : (
            <motion.button
              key="stop"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={stopRecording}
              className="group relative flex items-center justify-center w-20 h-20 bg-cyan-500 rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
            >
              <Square className="h-8 w-8 text-slate-950 fill-current" />
              <div className="absolute -inset-4 bg-cyan-500 rounded-full opacity-20 animate-ping" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
        {status === 'idle' ? 'Click to Load Model & Record' :
         status === 'loading' ? 'Downloading AI Model...' :
         status === 'ready' ? 'Click to Record' :
         'Recording Live (Local AI)'}
      </p>
    </div>
  );
}
