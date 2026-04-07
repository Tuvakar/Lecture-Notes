/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AudioRecorder } from './components/AudioRecorder';
import { ContextPanel } from './components/ContextPanel';
import { NotesPanel } from './components/NotesPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { NoteContext, HistoryItem } from './types';
import { BookOpen, History, FileText, Save, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contexts, setContexts] = useState<NoteContext[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  const transcriptRef = useRef('');
  const lastTopicExtractionRef = useRef(0);
  const lastHealLengthRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    const savedHistory = localStorage.getItem('akane_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
    const savedKey = localStorage.getItem('akane_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('akane_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('akane_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // Periodically "heal" the transcript to fix splicing and typos
  useEffect(() => {
    const healTranscript = async () => {
      if (!transcript || transcript.length < 50) return;
      if (transcript.length === lastHealLengthRef.current) return;
      if (isRecording) return; // Don't heal while recording to avoid jumping text

      const activeKey = process.env.GEMINI_API_KEY || apiKey;
      if (!activeKey) return;

      try {
        const ai = new GoogleGenAI({ apiKey: activeKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `The following is a raw lecture transcript with potential word splicing (e.g. "trans crip tion"), typos, and stutters. 
          Please heal the text by joining spliced words and fixing obvious errors. 
          Keep it verbatim otherwise. DO NOT add any commentary or summaries.
          
          TRANSCRIPT:
          ${transcript}`,
        });
        
        const healed = response.text?.trim();
        if (healed && healed.length > transcript.length * 0.7) {
          transcriptRef.current = healed;
          setTranscript(healed);
          lastHealLengthRef.current = healed.length;
        }
      } catch (err) {
        console.error("Transcript healing error:", err);
      }
    };

    const timer = setTimeout(healTranscript, 10000);
    return () => clearTimeout(timer);
  }, [transcript, isRecording]);

  // Periodically extract key topics from transcript
  useEffect(() => {
    const extractTopics = async () => {
      if (transcript.length - lastTopicExtractionRef.current < 500) return;
      
      const activeKey = process.env.GEMINI_API_KEY || apiKey;
      if (!activeKey) return;

      try {
        const ai = new GoogleGenAI({ apiKey: activeKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Extract 3-5 key topics or keywords from this lecture transcript. Return them as a comma-separated list. No extra text.\n\nTRANSCRIPT:\n${transcript}`,
        });
        
        const newTopics = response.text?.split(',').map(t => t.trim()).filter(Boolean) || [];
        if (newTopics.length > 0) {
          setTopics(newTopics);
          lastTopicExtractionRef.current = transcript.length;
        }
      } catch (err) {
        console.error("Topic extraction error:", err);
      }
    };

    const timer = setTimeout(extractTopics, 5000);
    return () => clearTimeout(timer);
  }, [transcript]);

  const handleTranscriptUpdate = useCallback((text: string) => {
    const newText = text.trim();
    if (!newText) return;
    
    // Filter out AI "thinking", "reasoning", or conversational responses
    const lowerText = newText.toLowerCase();
    const ignoreKeywords = [
      '**', 
      "grappling", 
      "clarifying", 
      "uncertainty", 
      "intended", 
      "intended meaning",
      "source of the frustration",
      "immediate next step",
      "seeking more information",
      "understand the intended",
      "pinpointing the user",
      "the ai is back",
      "stupid",
      "huh.",
      "okay,"
    ];
    
    if (ignoreKeywords.some(keyword => lowerText.includes(keyword)) || 
        (newText.length > 500 && (newText.includes('**') || newText.includes('grappling')))) { 
      console.log("Filtered out AI meta-commentary:", newText);
      return;
    }
    
    // Simple deduplication: don't append if the last few words are identical
    const currentTranscript = transcriptRef.current.trim();
    
    // Check if the new text is already at the end of the transcript
    if (currentTranscript.endsWith(newText)) return;
    
    // More robust overlap check: if the last 3 words of current match the first 3 of new
    const currentWords = currentTranscript.split(/\s+/);
    const newWords = newText.split(/\s+/);
    
    if (currentWords.length >= 3 && newWords.length >= 3) {
      const lastThree = currentWords.slice(-3).join(' ').toLowerCase();
      const firstThree = newWords.slice(0, 3).join(' ').toLowerCase();
      if (lastThree === firstThree) {
        // Overlap detected, append only the remainder
        const remainder = newWords.slice(3).join(' ');
        if (remainder) {
          transcriptRef.current = `${currentTranscript} ${remainder}`;
          setTranscript(transcriptRef.current);
        }
        return;
      }
    }

    transcriptRef.current = currentTranscript ? `${currentTranscript} ${newText}` : newText;
    setTranscript(transcriptRef.current);
  }, []);

  const downloadTranscript = () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddContext = (ctx: NoteContext) => {
    setContexts(prev => [...prev, ctx]);
  };

  const handleRemoveContext = (id: string) => {
    setContexts(prev => prev.filter(c => c.id !== id));
  };

  const saveToHistory = useCallback(() => {
    if (!transcriptRef.current && !notes) return;
    
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      title: topics.length > 0 ? topics[0] : "New Session",
      transcript: transcriptRef.current,
      notes: notes,
      contexts: contexts
    };
    
    setHistory(prev => [newItem, ...prev]);
  }, [notes, contexts, topics]);

  const loadFromHistory = (item: HistoryItem) => {
    setTranscript(item.transcript);
    transcriptRef.current = item.transcript;
    setNotes(item.notes);
    setContexts(item.contexts);
    setShowHistory(false);
  };

  const deleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const generateNotes = async () => {
    if (!transcriptRef.current && contexts.length === 0) return;
    
    setIsGenerating(true);
    try {
      const activeKey = process.env.GEMINI_API_KEY || apiKey;
      if (!activeKey) {
        throw new Error("No Gemini API key configured. Please set it in Settings.");
      }
      const ai = new GoogleGenAI({ apiKey: activeKey });
      
      const pdfContexts = contexts.filter(c => c.type === 'pdf').map(c => `PDF (${c.title}): ${c.content}`).join('\n\n');
      const ytContexts = contexts.filter(c => c.type === 'youtube').map(c => c.url).join(', ');

      const systemInstruction = `
        You are an expert assistant. Your goal is to generate high-quality, structured notes from a transcript and optional context.
        
        STRICT GUIDELINES:
        1. Use the provided transcript as the primary source.
        2. If the transcript is brief, summarize ONLY the brief content.
        3. NEVER include meta-commentary about the transcript's quality, length, or completeness.
        4. NEVER ask for more information or suggest providing a full transcript.
        5. NEVER include "Action Items" that are about the recording process itself (e.g., "Await further instruction").
        6. If PDF context is provided, use it to clarify technical terms, definitions, and context.
        7. If YouTube links are provided, assume they contain relevant background information.
        8. Organize notes logically with clear headings.
        9. Use standard Markdown headers (# and ##) and bullet points (-).
        10. Focus on clarity and accuracy.
        11. Translate all non-English content in the transcript to English in the notes.
        12. Structure the output as:
           # Summary
           [A brief 2-3 sentence summary of the content]
           
           # Key Points
           - [Point 1]
           - [Point 2]
           ...
           
           # Action Items
           - [Action 1]
           - [Action 2]
           ...
      `;

      const prompt = `
        CONTEXT:
        ${pdfContexts}
        
        TRANSCRIPT:
        ${transcriptRef.current}
        
        ${ytContexts ? `YOUTUBE LINKS: ${ytContexts}` : ''}
        
        Please generate the lecture notes now.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
          tools: ytContexts ? [{ urlContext: {} }] : []
        }
      });

      setNotes(response.text || '');
      // Automatically save to history after successful generation
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        title: topics.length > 0 ? topics[0] : "New Session",
        transcript: transcriptRef.current,
        notes: response.text || '',
        contexts: contexts
      };
      setHistory(prev => [newItem, ...prev]);
    } catch (err) {
      console.error("Note generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden transition-colors duration-300 selection:bg-cyan-500/30">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-8 border-r border-slate-800 bg-slate-900 z-[60]">
        <div className="mb-12">
          <BookOpen className="h-8 w-8 text-cyan-400" />
        </div>
        <nav className="flex flex-col gap-8">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-xl transition-colors ${showHistory ? 'text-cyan-400 bg-slate-800' : 'text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-700'}`}
          >
            <History className="h-6 w-6" />
          </button>
          <button 
            onClick={saveToHistory}
            disabled={!transcript && !notes}
            title="Save current session"
            className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-30"
          >
            <Save className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-colors ${showSettings ? 'text-cyan-400 bg-slate-800' : 'text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-700'}`}
          >
            <Settings className="h-6 w-6" />
          </button>
        </nav>
      </aside>

      <AnimatePresence>
        {showHistory && (
          <HistoryPanel 
            history={history}
            onSelect={loadFromHistory}
            onDelete={deleteFromHistory}
            onClose={() => setShowHistory(false)}
          />
        )}
        {showSettings && (
          <SettingsPanel 
            apiKey={apiKey}
            onSaveKey={setApiKey}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 flex items-center justify-between px-8 bg-slate-900/80 backdrop-blur border-b border-slate-800">
          <div className="flex flex-col">
            <h1 className="text-sm font-mono uppercase tracking-widest font-semibold text-cyan-400">Lecture Notes</h1>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">Powered by Akane AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={downloadTranscript}
              disabled={!transcript}
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest border border-slate-700 text-slate-300 rounded-md hover:bg-cyan-950/30 hover:text-cyan-400 hover:border-cyan-800/50 transition-colors disabled:opacity-30"
            >
              Export .txt
            </button>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isRecording ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-slate-700'}`} />
              <span className="text-xs font-mono text-slate-500">{isRecording ? 'LIVE' : 'IDLE'}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Live Transcript Feed */}
          <div className="flex-1 flex flex-col border-r border-slate-800">
            <div className="p-6 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex flex-col gap-1 flex-1 mr-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">Live Transcript</h2>
                  <div className="relative w-48">
                    <input 
                      type="text"
                      placeholder="Search transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-8 py-1 text-[10px] bg-slate-950 border border-slate-700 rounded-md focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>
                {topics.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {topics.map((topic, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-cyan-950/30 text-cyan-400 rounded-full whitespace-nowrap border border-cyan-800/50">
                        #{topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 px-2 py-1 bg-cyan-950/30 border border-cyan-900/50 rounded-md self-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  <span className="text-[10px] font-mono text-cyan-400">RECORDING</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-950 font-sans">
              <AnimatePresence mode="popLayout">
                {transcript ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-slate-300 leading-relaxed whitespace-pre-wrap text-lg"
                  >
                    {searchQuery ? (
                      transcript.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark key={i} className="bg-cyan-500/20 text-cyan-300 rounded px-1">{part}</mark>
                        ) : part
                      )
                    ) : transcript}
                    <div ref={transcriptEndRef} />
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 italic gap-4">
                    <BookOpen className="h-8 w-8 opacity-20" />
                    <p className="font-mono text-sm">Awaiting audio input...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Controls */}
            <div className="p-8 bg-slate-900 border-t border-slate-800 flex justify-center">
              <AudioRecorder 
                onTranscriptUpdate={handleTranscriptUpdate}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
              />
            </div>
          </div>

          {/* Notes View */}
          <div className="flex-[1.5] flex flex-col">
            <NotesPanel 
              notes={notes}
              isGenerating={isGenerating}
              onGenerate={generateNotes}
            />
          </div>
        </div>
      </main>

      {/* Context Panel */}
      <ContextPanel 
        contexts={contexts}
        onAddContext={handleAddContext}
        onRemoveContext={handleRemoveContext}
      />
    </div>
  );
}

