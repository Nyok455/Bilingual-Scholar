
export interface StudyPoint {
  english: string;
  chinese: string;
  keyTerm?: string;
}

export interface ExamQuestion {
  question: string;
  options: string[]; // Array of 4 options
  correctIndex: number; // 0-3
  explanation: string; // Why the answer is correct
}

export interface StudySection {
  topic: string; 
  content: StudyPoint[];
  images?: string[]; // Blob URLs/Base64 of the source page/slide for visual context
  visualSummary?: string; 
  questions?: ExamQuestion[];
}

export interface ParsedResult {
  text: string;
  imageMap: Record<number, string[]>; // Map of Page/Slide Number (1-based) to Image URLs
}

export interface ProcessingStatus {
  step: 'idle' | 'parsing' | 'generating' | 'complete' | 'error';
  message?: string;
}

// Complete File Session for Multi-file management
export interface StudyFile {
  id: string;
  name: string;
  uploadDate: number;
  lastAccessed: number;
  sections: StudySection[];
  // SRS Progress Tracking
  flashcardProgress: {
    mastered: string[]; // IDs of mastered cards
    queue: string[]; // IDs remaining to study
  };
  examScore?: {
    score: number;
    total: number;
    date: number;
  };
}

export interface AppTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    bg: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
  };
}

export const THEMES: AppTheme[] = [
  {
    id: 'default',
    name: 'Professional Blue',
    colors: {
      primary: '#0ea5e9', // sky-500
      secondary: '#e0f2fe', // sky-100
      bg: '#f8fafc', // slate-50
      card: '#ffffff',
      text: '#1e293b', // slate-800
      subtext: '#64748b', // slate-500
      border: '#e2e8f0', // slate-200
    }
  },
  {
    id: 'academic',
    name: 'Academic Grayscale',
    colors: {
      primary: '#334155', // slate-700
      secondary: '#f1f5f9', // slate-100
      bg: '#ffffff',
      card: '#ffffff',
      text: '#0f172a', // slate-900
      subtext: '#475569', // slate-600
      border: '#cbd5e1', // slate-300
    }
  },
  {
    id: 'nature',
    name: 'Nature Calm',
    colors: {
      primary: '#059669', // emerald-600
      secondary: '#d1fae5', // emerald-100
      bg: '#f0fdf4', // emerald-50
      card: '#ffffff',
      text: '#064e3b', // emerald-900
      subtext: '#047857', // emerald-700
      border: '#a7f3d0', // emerald-200
    }
  },
  {
    id: 'sepia',
    name: 'Warm Paper',
    colors: {
      primary: '#b45309', // amber-700
      secondary: '#fef3c7', // amber-100
      bg: '#fffbeb', // amber-50
      card: '#fff8dc', // cornsilk-ish
      text: '#451a03', // amber-950
      subtext: '#92400e', // amber-800
      border: '#fde68a', // amber-200
    }
  }
];

declare global {
  interface Window {
    pdfjsLib: any;
    JSZip: any;
    jspdf: any;
    html2canvas: any;
    PptxGenJS: any;
  }
}
