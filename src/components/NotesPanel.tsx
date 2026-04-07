import ReactMarkdown from 'react-markdown';
import { Download, FileText, Loader2 } from 'lucide-react';

interface NotesPanelProps {
  notes: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function NotesPanel({ notes, isGenerating, onGenerate }: NotesPanelProps) {
  const downloadNotes = () => {
    const blob = new Blob([notes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lecture-notes.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 transition-colors duration-300">
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-slate-200">Study Notes</h2>
        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-sm font-medium hover:bg-cyan-500/20 hover:border-cyan-500/50 disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(34,211,238,0.1)]"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "Generate Notes"}
          </button>
          {notes && (
            <button
              onClick={downloadNotes}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-all"
            >
              <Download className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {!notes && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <FileText className="h-12 w-12 mb-4 text-slate-500" />
            <p className="text-sm font-medium text-slate-400">Capture audio and add context to generate notes</p>
          </div>
        ) : (
          <div className="prose prose-invert prose-slate max-w-none prose-headings:text-cyan-400 prose-a:text-cyan-500 hover:prose-a:text-cyan-400 prose-strong:text-slate-200">
            <div className="markdown-body">
              <ReactMarkdown>{notes}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
