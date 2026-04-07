import { useState } from 'react';
import { Settings, X, Key, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsPanelProps {
  apiKey: string;
  onSaveKey: (key: string) => void;
  onClose: () => void;
}

export function SettingsPanel({ apiKey, onSaveKey, onClose }: SettingsPanelProps) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSaveKey(tempKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="absolute left-16 top-0 bottom-0 w-80 bg-slate-900 border-r border-slate-800 z-50 flex flex-col shadow-2xl"
    >
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-cyan-400" />
          <h2 className="text-sm font-mono uppercase tracking-widest font-semibold text-slate-200">Settings</h2>
        </div>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-500">
            <Key className="h-3 w-3" />
            <span>Gemini API Configuration</span>
          </div>
          
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              To use AI features on GitHub Pages, you need your own Gemini API key.
            </p>
            <input
              type="password"
              placeholder="Enter your API Key..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500/50 text-slate-200 placeholder:text-slate-600"
            />
            <button
              onClick={handleSave}
              className="w-full py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-mono uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Saved
                </>
              ) : (
                "Save Configuration"
              )}
            </button>
          </div>
        </div>

        <div className="mt-auto p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex gap-3">
          <Info className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Privacy Note</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Your API key is stored locally in your browser and never sent to any server except Google's AI services.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
