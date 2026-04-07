import { useState } from 'react';
import { FileText, Youtube, X, Plus, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { NoteContext } from '@/src/types';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ContextPanelProps {
  contexts: NoteContext[];
  onAddContext: (context: NoteContext) => void;
  onRemoveContext: (id: string) => void;
}

export function ContextPanel({ contexts, onAddContext, onRemoveContext }: ContextPanelProps) {
  const [ytUrl, setYtUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      onAddContext({
        id: Math.random().toString(36).substr(2, 9),
        type: 'pdf',
        title: file.name,
        content: fullText
      });
    } catch (err) {
      console.error("PDF processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddYoutube = () => {
    if (!ytUrl.trim()) return;
    onAddContext({
      id: Math.random().toString(36).substr(2, 9),
      type: 'youtube',
      title: 'YouTube Video',
      url: ytUrl
    });
    setYtUrl('');
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-950 border-l border-slate-800 h-full w-80 transition-colors duration-300">
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-4">Context Sources</h3>
        
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)] transition-all">
            <FileText className="h-5 w-5 text-cyan-500" />
            <span className="text-sm font-medium text-slate-300">Upload PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
          </label>

          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="YouTube URL"
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
              />
              <button
                onClick={handleAddYoutube}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-cyan-400 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {isProcessing && (
            <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
              <span className="text-xs text-slate-400">Processing PDF...</span>
            </div>
          )}
          {contexts.map((ctx) => (
            <div key={ctx.id} className="group relative flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-sm hover:border-cyan-900/50 transition-colors">
              {ctx.type === 'pdf' ? (
                <FileText className="h-4 w-4 text-cyan-400" />
              ) : (
                <Youtube className="h-4 w-4 text-cyan-400" />
              )}
              <span className="text-xs font-medium text-slate-300 truncate flex-1">{ctx.title}</span>
              <button
                onClick={() => onRemoveContext(ctx.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
