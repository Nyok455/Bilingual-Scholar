
import React, { useState, useCallback, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import StudyGuideView from './components/StudyGuideView';
import FlashcardView from './components/FlashcardView';
import ExamView from './components/ExamView';
import { FileIcon, LoadingIcon, PdfIcon, PptxIcon, PaletteIcon } from './components/Icons';
import { extractTextFromFile } from './services/fileParser';
import { generateStudyGuide } from './services/geminiService';
import { exportToPdf, exportToPptx } from './services/exportService';
import { ProcessingStatus, StudySection, THEMES, AppTheme, StudyFile } from './types';

type ViewMode = 'guide' | 'flashcards' | 'exam';

const STORAGE_KEY = 'bilingual-scholar-files';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'idle' });
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('guide');
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(THEMES[0]);
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);

  const activeFile = files.find(f => f.id === activeFileId);

  // Load Persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedFiles: StudyFile[] = JSON.parse(saved);
        setFiles(parsedFiles);
        if (parsedFiles.length > 0) {
          const sorted = [...parsedFiles].sort((a, b) => b.lastAccessed - a.lastAccessed);
          setActiveFileId(sorted[0].id);
          setStatus({ step: 'complete' });
        }
      }
    } catch (e) {
      console.error("Failed to load files", e);
    }
  }, []);

  // Save Persistence (Handle Quota Limit)
  useEffect(() => {
    if (files.length > 0) {
       try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
       } catch (e) {
          console.warn("Storage quota exceeded. Images might be too large.");
          // Fallback: Try saving without images if quota exceeded
          const stripped = files.map(f => ({
            ...f,
            sections: f.sections.map(s => ({ ...s, images: [] }))
          }));
          try {
             localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
          } catch(e2) {
             console.error("Critical storage failure", e2);
          }
       }
    }
  }, [files]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status.step !== 'complete' || !activeFileId) return;

      if (e.metaKey || e.ctrlKey) {
        switch(e.key) {
          case '1': e.preventDefault(); setViewMode('guide'); break;
          case '2': e.preventDefault(); setViewMode('flashcards'); break;
          case '3': e.preventDefault(); setViewMode('exam'); break;
          case 'ArrowRight': 
             e.preventDefault();
             const currIdx = files.findIndex(f => f.id === activeFileId);
             if (currIdx < files.length - 1) setActiveFileId(files[currIdx + 1].id);
             break;
          case 'ArrowLeft':
             e.preventDefault();
             const cIdx = files.findIndex(f => f.id === activeFileId);
             if (cIdx > 0) setActiveFileId(files[cIdx - 1].id);
             break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, files, status.step]);

  const handleFileSelect = useCallback(async (file: File) => {
    setStatus({ step: 'parsing', message: 'Extracting text and high-res visuals from document...' });

    try {
      const { text, imageMap } = await extractTextFromFile(file);
      
      setStatus({ step: 'generating', message: 'Analyzing content, generating detailed bilingual notes...' });
      const rawSections = await generateStudyGuide(text);
      
      // Match AI sections to source images
      const enrichedSections = rawSections.map(section => {
        let matchedImages: string[] = [];
        const match = section.topic.match(/(?:Slide|Page)\s?(\d+)/i);
        if (match && match[1]) {
          const index = parseInt(match[1]);
          if (imageMap[index]) {
            matchedImages = imageMap[index];
          }
        }
        return { ...section, images: matchedImages };
      });

      const newFile: StudyFile = {
        id: Date.now().toString(),
        name: file.name,
        uploadDate: Date.now(),
        lastAccessed: Date.now(),
        sections: enrichedSections,
        flashcardProgress: { mastered: [], queue: [] },
      };

      setFiles(prev => [newFile, ...prev]);
      setActiveFileId(newFile.id);
      setStatus({ step: 'complete' });
      setViewMode('guide');

    } catch (error: any) {
      console.error(error);
      setStatus({ step: 'error', message: error.message || 'Something went wrong.' });
    }
  }, []);

  const updateActiveFile = (updates: Partial<StudyFile>) => {
    if (!activeFileId) return;
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, ...updates, lastAccessed: Date.now() } : f));
  };

  const handleUpdateContent = (sectionIndex: number, contentIndex: number, field: 'english' | 'chinese', newValue: string) => {
    if (!activeFile) return;
    const newSections = [...activeFile.sections];
    const section = { ...newSections[sectionIndex] };
    const content = [...section.content];
    content[contentIndex] = { ...content[contentIndex], [field]: newValue };
    section.content = content;
    newSections[sectionIndex] = section;
    updateActiveFile({ sections: newSections });
  };

  const handleExportPdf = async () => {
    if (!activeFile) return;
    setIsExporting(true);
    try {
      await exportToPdf(activeFile.name, currentTheme);
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPptx = async () => {
    if (!activeFile) return;
    setIsExporting(true);
    try {
      await exportToPptx(activeFile.sections, activeFile.name, currentTheme);
    } catch (e) {
      console.error(e);
      alert("Failed to export PPTX.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this file?")) {
        const newFiles = files.filter(f => f.id !== id);
        setFiles(newFiles);
        if (activeFileId === id) {
            setActiveFileId(newFiles.length > 0 ? newFiles[0].id : null);
            if (newFiles.length === 0) setStatus({ step: 'idle' });
        }
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: currentTheme.colors.bg }}>
      
      {/* Sidebar Navigation */}
      {files.length > 0 && status.step === 'complete' && (
        <aside className="w-64 border-r flex flex-col sticky top-0 h-screen overflow-y-auto flex-shrink-0 bg-white z-40 shadow-lg" style={{ borderColor: currentTheme.colors.border }}>
           <div className="p-6 border-b" style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.secondary }}>
             <div className="flex items-center space-x-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md" style={{ backgroundColor: currentTheme.colors.primary }}>BS</div>
                <span className="font-bold tracking-tight text-lg" style={{ color: currentTheme.colors.text }}>Library</span>
             </div>
           </div>
           
           <div className="flex-grow p-4 space-y-2">
              <button 
                 onClick={() => { setStatus({ step: 'idle' }); setActiveFileId(null); }}
                 className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg text-sm font-bold transition-all border border-dashed mb-6 hover:bg-slate-50 hover:border-slate-400 group"
                 style={{ borderColor: currentTheme.colors.border, color: currentTheme.colors.subtext }}
              >
                 <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs group-hover:bg-slate-200">+</span>
                 <span>Upload New</span>
              </button>

              {files.map(file => (
                  <div 
                    key={file.id}
                    onClick={() => { setActiveFileId(file.id); setStatus({ step: 'complete' }); }}
                    className={`group relative w-full text-left p-3 rounded-lg text-sm transition-all cursor-pointer ${activeFileId === file.id ? 'shadow-md translate-x-1' : 'hover:bg-slate-50'}`}
                    style={{ 
                        backgroundColor: activeFileId === file.id ? currentTheme.colors.card : 'transparent',
                        borderLeft: activeFileId === file.id ? `4px solid ${currentTheme.colors.primary}` : '4px solid transparent'
                    }}
                  >
                     <h4 className="font-bold truncate pr-6" style={{ color: activeFileId === file.id ? currentTheme.colors.primary : currentTheme.colors.text }}>{file.name}</h4>
                     <div className="flex justify-between items-center mt-1">
                        <span className="text-xs opacity-50">{new Date(file.lastAccessed).toLocaleDateString()}</span>
                     </div>
                     <button 
                       onClick={(e) => handleDeleteFile(file.id, e)}
                       className="absolute top-3 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                       title="Delete"
                     >
                        ×
                     </button>
                  </div>
              ))}
           </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-grow flex flex-col w-full min-w-0">
        <header className="sticky top-0 z-30 backdrop-blur-md border-b transition-colors duration-500 shadow-sm" 
            style={{ backgroundColor: `${currentTheme.colors.bg}E6`, borderColor: currentTheme.colors.border }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {status.step !== 'complete' ? (
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.reload()}>
                        <span className="text-xl font-extrabold tracking-tight" style={{ color: currentTheme.colors.text }}>Bilingual Scholar</span>
                    </div>
                ) : (
                    <h2 className="text-lg font-bold truncate max-w-md" style={{ color: currentTheme.colors.text }}>
                        {activeFile?.name}
                    </h2>
                )}
                <div className="flex items-center gap-4">
                    {status.step === 'complete' && (
                        <div className="hidden md:flex items-center space-x-2 bg-black/5 rounded-full p-1 border">
                            {THEMES.map(theme => (
                                <button
                                key={theme.id}
                                onClick={() => setCurrentTheme(theme)}
                                className={`w-5 h-5 rounded-full mx-1 border transition-all ${currentTheme.id === theme.id ? 'ring-2 ring-offset-1 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                style={{ 
                                    backgroundColor: theme.colors.primary, 
                                    borderColor: currentTheme.id === theme.id ? theme.colors.text : 'transparent',
                                    '--tw-ring-color': theme.colors.text
                                } as React.CSSProperties}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>

        <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            
            {status.step === 'idle' && (
                <div className="max-w-3xl mx-auto text-center space-y-10 animate-fade-in-up mt-10">
                     <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight" style={{ color: currentTheme.colors.text }}>
                        Your Personal <br/><span style={{ color: currentTheme.colors.primary }}>Bilingual Tutor</span>.
                     </h1>
                     <p className="text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: currentTheme.colors.subtext }}>
                        Upload PDF or PPTX. Get instant side-by-side notes, interactive flashcards, and exams.
                     </p>
                     <div className="p-4 transform hover:scale-[1.01] transition-transform duration-300">
                        <FileUpload onFileSelect={handleFileSelect} />
                     </div>
                </div>
            )}

            {(status.step === 'parsing' || status.step === 'generating') && (
                <div className="max-w-md mx-auto text-center py-24">
                    <div className="rounded-3xl shadow-xl border relative overflow-hidden p-10 bg-white" style={{ borderColor: currentTheme.colors.border }}>
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                            <div className="h-full animate-progress" style={{ backgroundColor: currentTheme.colors.primary }}></div>
                        </div>
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner" style={{ backgroundColor: currentTheme.colors.secondary }}>
                            <LoadingIcon />
                        </div>
                        <h3 className="text-2xl font-bold mb-3" style={{ color: currentTheme.colors.text }}>Processing...</h3>
                        <p className="text-lg" style={{ color: currentTheme.colors.subtext }}>{status.message}</p>
                    </div>
                </div>
            )}

            {status.step === 'error' && (
                <div className="max-w-md mx-auto text-center py-12">
                    <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-red-900 shadow-sm">
                        <h3 className="font-bold text-xl mb-2">Error</h3>
                        <p className="mb-6">{status.message}</p>
                        <button onClick={() => setStatus({ step: 'idle' })} className="px-6 py-2 bg-white border border-red-200 rounded-lg shadow-sm font-bold">Try Again</button>
                    </div>
                </div>
            )}

            {status.step === 'complete' && activeFile && (
                <div className="animate-fade-in">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b pb-6" style={{ borderColor: currentTheme.colors.border }}>
                        <nav className="flex p-1 rounded-xl bg-slate-100/50 border" style={{ borderColor: currentTheme.colors.border }}>
                             {(['guide', 'flashcards', 'exam'] as ViewMode[]).map((mode) => (
                                 <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${viewMode === mode ? 'shadow-sm text-white' : 'text-slate-500 hover:text-slate-800'}`}
                                    style={{ backgroundColor: viewMode === mode ? currentTheme.colors.primary : 'transparent' }}
                                 >
                                     {mode === 'guide' ? 'Notes' : mode}
                                 </button>
                             ))}
                        </nav>
                        {viewMode === 'guide' && (
                            <div className="flex items-center gap-3">
                                {/* Theme Selector for Export */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowThemeMenu(!showThemeMenu)}
                                        className="flex items-center px-3 py-2 border rounded-lg bg-white hover:bg-slate-50 shadow-sm text-sm font-medium transition-colors"
                                        style={{ borderColor: currentTheme.colors.border, color: currentTheme.colors.text }}
                                        title="Select Export Theme"
                                    >
                                        <PaletteIcon />
                                    </button>
                                    
                                    {showThemeMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border p-2 z-50 grid grid-cols-1 gap-1" style={{ borderColor: currentTheme.colors.border }}>
                                            <div className="text-xs font-bold px-3 py-2 text-slate-400 uppercase tracking-wider">Select Theme</div>
                                            {THEMES.map(theme => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => { setCurrentTheme(theme); setShowThemeMenu(false); }}
                                                    className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all text-left ${currentTheme.id === theme.id ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}
                                                >
                                                    <div className="w-4 h-4 rounded-full mr-3 border" style={{ backgroundColor: theme.colors.primary, borderColor: theme.colors.text }}></div>
                                                    <span style={{ color: theme.colors.text }}>{theme.name}</span>
                                                    {currentTheme.id === theme.id && <span className="ml-auto text-xs font-bold text-slate-400">Active</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <button onClick={handleExportPptx} disabled={isExporting} className="flex items-center px-4 py-2 border rounded-lg bg-white hover:bg-slate-50 shadow-sm text-sm font-medium" style={{ borderColor: currentTheme.colors.border }}>
                                     {isExporting ? '...' : <PptxIcon />} <span className="ml-2">PPTX</span>
                                </button>
                                <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center px-4 py-2 border rounded-lg text-white shadow-sm text-sm font-medium" style={{ backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }}>
                                     {isExporting ? '...' : <PdfIcon />} <span className="ml-2">PDF</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {viewMode === 'guide' && (
                        <StudyGuideView 
                            sections={activeFile.sections} 
                            theme={currentTheme} 
                            onUpdateContent={handleUpdateContent}
                        />
                    )}
                    {viewMode === 'flashcards' && <FlashcardView sections={activeFile.sections} />}
                    {viewMode === 'exam' && <ExamView sections={activeFile.sections} theme={currentTheme} />}
                </div>
            )}
        </main>
      </div>

      <style>{`
        @keyframes progress { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 90%; } }
        .animate-progress { animation: progress 30s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default App;
