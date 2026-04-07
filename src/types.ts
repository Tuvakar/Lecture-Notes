export interface NoteContext {
  id: string;
  type: 'pdf' | 'youtube';
  title: string;
  content?: string; // For PDF text
  url?: string; // For YouTube
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  transcript: string;
  notes: string;
  contexts: NoteContext[];
}

export interface LectureSession {
  transcript: string;
  notes: string;
  isRecording: boolean;
  contexts: NoteContext[];
}
