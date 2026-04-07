import { HistoryItem } from '../types';
import { Clock, Trash2, X, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function HistoryPanel({ history, onSelect, onDelete, onClose }: HistoryPanelProps) {
  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="absolute left-16 top-0 bottom-0 w-80 bg-slate-900 border-r border-slate-800 z-50 flex flex-col shadow-2xl"
    >
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-cyan-400" />
          <h2 className="text-sm font-mono uppercase tracking-widest font-semibold text-slate-200">Session History</h2>
        </div>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
            <Clock className="h-12 w-12 mb-4" />
            <p className="text-xs font-mono uppercase tracking-widest">No history found</p>
          </div>
        ) : (
          history.sort((a, b) => b.timestamp - a.timestamp).map((item) => (
            <div
              key={item.id}
              className="group relative p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
              onClick={() => onSelect(item)}
            >
              <div className="flex flex-col gap-1 pr-8">
                <span className="text-xs font-mono text-cyan-500/70">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
                <h3 className="text-sm font-medium text-slate-200 truncate">
                  {item.title || "Untitled Session"}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-mono uppercase">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {item.transcript.split(/\s+/).length} words
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
