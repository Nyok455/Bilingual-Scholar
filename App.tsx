
import React, { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import StudyGuideView from './components/StudyGuideView';
import FlashcardView from './components/FlashcardView';
import ExamView from './components/ExamView';
import { FileIcon, LoadingIcon, PdfIcon, PptxIcon } from './components/Icons';
import { extractTextFromFile } from './services/fileParser';
import { generateStudyGuide } from './services/geminiService';
import { exportToPdf, exportToPptx } from './services/exportService';
import { ProcessingStatus, StudySection, THEMES, AppTheme } from './types';

type ViewMode = 'guide' | 'flashcards' | 'exam';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'idle' });
  const [studyData, setStudyData] = useState<StudySection[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('guide');
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(THEMES[0]);

  const handleFileSelect = useCallback(async (file: File) => {
    setFileName(file.name);
    setStudyData([]);
    setStatus({ step: 'parsing', message: 'Extracting text and images from document...' });

    try {
      // Step 1: Parse File (Get text AND images)
      const { text, imageMap } = await extractTextFromFile(file);
      
      if (!text || text.length < 50) {
        throw new Error("Could not extract enough text. The file might be empty or image-based.");
      }

      // Step 2: Generate Content
      setStatus({ step: 'generating', message: 'Analyzing text, generating detailed notes, and creating exam questions...' });
      const rawSections = await generateStudyGuide(text);
      
      // Step 3: Post-process - Map Images to Sections
      const enrichedSections = rawSections.map(section => {
        let matchedImages: string[] = [];
        const match = section.topic.match(/(?:Slide|Page)\s?(\d+)/i);
        if (match && match[1]) {
          const index = parseInt(match[1]);
          if (imageMap[index]) {
            matchedImages = imageMap[index];
          }
        }
        return {
          ...section,
          images: matchedImages
        };
      });

      setStudyData(enrichedSections);
      setStatus({ step: 'complete' });

    } catch (error: any) {
      console.error(error);
      setStatus({ step: 'error', message: error.message || 'Something went wrong.' });
    }
  }, []);

  const handleReset = () => {
    setStatus({ step: 'idle' });
    setStudyData([]);
    setFileName('');
    setViewMode('guide');
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // Pass the current theme to the export function
      await exportToPdf(fileName, currentTheme);
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPptx = async () => {
    setIsExporting(true);
    try {
      await exportToPptx(studyData, fileName);
    } catch (e) {
      console.error(e);
      alert("Failed to export PPTX.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: currentTheme.colors.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-500 shadow-sm" 
        style={{ 
          backgroundColor: `${currentTheme.colors.bg}E6`, // 90% opacity
          borderColor: currentTheme.colors.border 
        }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleReset}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl shadow-md"
              style={{ backgroundColor: currentTheme.colors.primary }}
            >
              B
            </div>
            <span className="text-xl font-extrabold tracking-tight" style={{ color: currentTheme.colors.text }}>Bilingual Scholar</span>
          </div>
          
          <div className="flex items-center gap-6">
             {/* Theme Selector */}
             {status.step === 'complete' && (
               <div className="hidden md:flex items-center space-x-3">
                 <span className="text-xs font-bold uppercase tracking-wider" style={{ color: currentTheme.colors.subtext }}>Theme</span>
                 <div className="flex bg-black/5 rounded-full p-1 border" style={{ borderColor: currentTheme.colors.border }}>
                   {THEMES.map(theme => (
                     <button
                       key={theme.id}
                       onClick={() => setCurrentTheme(theme)}
                       className={`w-5 h-5 rounded-full mx-1 border transition-all ${currentTheme.id === theme.id ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                       style={{ 
                         backgroundColor: theme.colors.primary, 
                         borderColor: currentTheme.id === theme.id ? theme.colors.text : 'transparent',
                         '--tw-ring-color': theme.colors.text
                       } as React.CSSProperties}
                       title={theme.name}
                     />
                   ))}
                 </div>
               </div>
             )}

            {status.step === 'complete' && (
              <button 
                onClick={handleReset}
                className="text-sm font-semibold hover:underline transition-colors px-3 py-1 rounded-md hover:bg-black/5"
                style={{ color: currentTheme.colors.subtext }}
              >
                New Upload
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Intro / Upload State */}
        {status.step === 'idle' && (
          <div className="max-w-3xl mx-auto text-center space-y-10 animate-fade-in-up">
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight" style={{ color: currentTheme.colors.text }}>
                Turn Slides into <br/><span style={{ color: currentTheme.colors.primary }}>Deep Bilingual Knowledge</span>.
              </h1>
              <p className="text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: currentTheme.colors.subtext }}>
                Upload your course PDF or PPTX. Our AI extracts text & images, generates comprehensive notes, and creates practice exams to help you master the material.
              </p>
            </div>
            
            <div className="p-4 transform hover:scale-[1.01] transition-transform duration-300">
              <FileUpload onFileSelect={handleFileSelect} />
            </div>

            <div className="pt-8 flex flex-wrap justify-center gap-8 text-sm font-medium" style={{ color: currentTheme.colors.subtext }}>
              <span className="flex items-center px-4 py-2 rounded-full bg-white shadow-sm border" style={{ borderColor: currentTheme.colors.border }}>
                 <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                 Detailed Notes
              </span>
              <span className="flex items-center px-4 py-2 rounded-full bg-white shadow-sm border" style={{ borderColor: currentTheme.colors.border }}>
                 <span className="w-2.5 h-2.5 bg-purple-500 rounded-full mr-3 animate-pulse"></span>
                 Smart Practice Exams
              </span>
              <span className="flex items-center px-4 py-2 rounded-full bg-white shadow-sm border" style={{ borderColor: currentTheme.colors.border }}>
                 <span className="w-2.5 h-2.5 bg-orange-500 rounded-full mr-3 animate-pulse"></span>
                 Flashcards
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(status.step === 'parsing' || status.step === 'generating') && (
          <div className="max-w-md mx-auto text-center py-24">
            <div className="rounded-3xl shadow-xl border relative overflow-hidden p-10 bg-white"
              style={{ borderColor: currentTheme.colors.border }}
            >
               <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                  <div className="h-full animate-progress" style={{ backgroundColor: currentTheme.colors.primary }}></div>
               </div>
               <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner"
                 style={{ backgroundColor: currentTheme.colors.secondary }}
               >
                 <LoadingIcon />
               </div>
               <h3 className="text-2xl font-bold mb-3" style={{ color: currentTheme.colors.text }}>AI is Thinking...</h3>
               <p className="text-lg leading-relaxed" style={{ color: currentTheme.colors.subtext }}>{status.message}</p>
               {fileName && (
                 <div className="mt-8 flex items-center justify-center space-x-3 text-sm py-3 px-4 rounded-xl border border-dashed"
                   style={{ backgroundColor: currentTheme.colors.bg, color: currentTheme.colors.subtext, borderColor: currentTheme.colors.border }}
                 >
                    <FileIcon />
                    <span className="truncate max-w-[200px] font-medium">{fileName}</span>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Error State */}
        {status.step === 'error' && (
          <div className="max-w-md mx-auto text-center py-12">
             <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-red-900 shadow-sm">
                <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-bold text-xl mb-2">Processing Error</h3>
                <p className="mb-6">{status.message}</p>
                <button 
                  onClick={handleReset}
                  className="px-6 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-bold shadow-sm"
                >
                  Try Again
                </button>
             </div>
          </div>
        )}

        {/* Results State */}
        {status.step === 'complete' && studyData.length > 0 && (
          <div className="animate-fade-in">
             <div className="flex flex-col xl:flex-row items-end justify-between mb-10 gap-6">
                <div>
                   <h2 className="text-3xl font-extrabold mb-2" style={{ color: currentTheme.colors.text }}>
                     {viewMode === 'guide' && 'Comprehensive Notes'}
                     {viewMode === 'flashcards' && 'Active Recall Deck'}
                     {viewMode === 'exam' && 'Practice Examination'}
                   </h2>
                   <p className="text-base font-medium flex items-center" style={{ color: currentTheme.colors.subtext }}>
                     <FileIcon />
                     <span className="ml-2">{fileName}</span>
                   </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* View Toggles */}
                  <div className="flex p-1.5 rounded-xl border shadow-sm" style={{ backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.border }}>
                    <button 
                      onClick={() => setViewMode('guide')}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                        viewMode === 'guide' 
                          ? 'shadow-sm text-white' 
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                      style={{ 
                        backgroundColor: viewMode === 'guide' ? currentTheme.colors.primary : 'transparent',
                        color: viewMode === 'guide' ? '#fff' : undefined
                      }}
                    >
                      Notes
                    </button>
                    <button 
                      onClick={() => setViewMode('flashcards')}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                        viewMode === 'flashcards' 
                          ? 'shadow-sm text-white' 
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                      style={{ 
                        backgroundColor: viewMode === 'flashcards' ? currentTheme.colors.primary : 'transparent',
                        color: viewMode === 'flashcards' ? '#fff' : undefined
                      }}
                    >
                      Cards
                    </button>
                    <button 
                      onClick={() => setViewMode('exam')}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                        viewMode === 'exam' 
                          ? 'shadow-sm text-white' 
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                      style={{ 
                        backgroundColor: viewMode === 'exam' ? currentTheme.colors.primary : 'transparent',
                        color: viewMode === 'exam' ? '#fff' : undefined
                      }}
                    >
                      Exam
                    </button>
                  </div>

                  {/* Export Actions */}
                  {viewMode === 'guide' && (
                    <div className="flex items-center gap-3 border-l pl-4" style={{ borderColor: currentTheme.colors.border }}>
                       <button 
                        onClick={handleExportPptx}
                        disabled={isExporting}
                        className="flex items-center px-4 py-2.5 border shadow-sm text-sm font-bold rounded-xl hover:brightness-95 focus:outline-none disabled:opacity-50 transition-all bg-white"
                        style={{ borderColor: currentTheme.colors.border, color: currentTheme.colors.text }}
                      >
                        {isExporting ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></span> : <PptxIcon />}
                        Save PPTX
                      </button>
                      <button 
                        onClick={handleExportPdf}
                        disabled={isExporting}
                        className="flex items-center px-4 py-2.5 border shadow-sm text-sm font-bold rounded-xl text-white hover:brightness-90 focus:outline-none disabled:opacity-50 transition-all"
                        style={{ backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }}
                      >
                        {isExporting ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span> : <PdfIcon />}
                        Save PDF
                      </button>
                    </div>
                  )}
                </div>
             </div>
             
             {viewMode === 'guide' && <StudyGuideView sections={studyData} theme={currentTheme} />}
             {viewMode === 'flashcards' && <FlashcardView sections={studyData} />}
             {viewMode === 'exam' && <ExamView sections={studyData} theme={currentTheme} />}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t py-10 mt-auto transition-colors duration-500" 
        style={{ 
            backgroundColor: currentTheme.colors.bg, 
            borderColor: currentTheme.colors.border 
        }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm font-medium mb-2" style={{ color: currentTheme.colors.text }}>Bilingual Scholar</p>
            <p className="text-xs opacity-60" style={{ color: currentTheme.colors.subtext }}>© {new Date().getFullYear()} AI-Powered Learning Assistant. All rights reserved.</p>
        </div>
      </footer>
      
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 90%; }
        }
        .animate-progress {
          animation: progress 30s ease-out forwards;
        }
        @keyframes fade-in-up {
           from { opacity: 0; transform: translateY(20px); }
           to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
           animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
         @keyframes fade-in {
           from { opacity: 0; }
           to { opacity: 1; }
        }
        .animate-fade-in {
           animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
