
import React, { useState, useEffect } from 'react';
import { StudySection, StudyPoint } from '../types';

interface FlashcardViewProps {
  sections: StudySection[];
}

interface FlashcardItem extends StudyPoint {
  id: string; 
  topic: string;
  relatedImages?: string[];
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ sections }) => {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [queue, setQueue] = useState<string[]>([]); 
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Generate Flashcards
    const allPoints: FlashcardItem[] = [];
    sections.forEach((section, sIdx) => {
      section.content.forEach((point, pIdx) => {
        allPoints.push({
          ...point,
          id: `card-${sIdx}-${pIdx}`,
          topic: section.topic,
          relatedImages: section.images
        });
      });
    });
    setCards(allPoints);
    const initialQueue = allPoints.map(c => c.id);
    setQueue(initialQueue);
    setMastered(new Set());
    if (initialQueue.length > 0) setCurrentCardId(initialQueue[0]);
    setIsFlipped(false);
  }, [sections]);

  // SRS Algorithm
  const handleResult = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentCardId) return;

    setIsFlipped(false);
    
    setTimeout(() => {
        setQueue(prevQueue => {
            const nextQueue = [...prevQueue];
            nextQueue.shift(); // Remove current

            if (difficulty === 'easy') {
                // Mastered: removed from queue
                setMastered(prev => new Set(prev).add(currentCardId));
            } else if (difficulty === 'medium') {
                // Review Later: push to end
                nextQueue.push(currentCardId);
            } else if (difficulty === 'hard') {
                // Review Soon: insert shortly after
                const insertIndex = Math.min(nextQueue.length, 4);
                nextQueue.splice(insertIndex, 0, currentCardId);
            }

            setCurrentCardId(nextQueue.length > 0 ? nextQueue[0] : null);
            return nextQueue;
        });
    }, 300);
  };

  const getCardById = (id: string | null) => cards.find(c => c.id === id);
  const currentCard = getCardById(currentCardId);

  if (cards.length === 0) return null;

  if (!currentCard) {
      return (
          <div className="w-full max-w-2xl mx-auto text-center py-20 animate-fade-in">
              <div className="bg-white p-10 rounded-3xl shadow-xl border border-green-100">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-4">All Cards Mastered!</h2>
                  <p className="text-slate-500 mb-8 text-lg">You have reviewed all flashcards in this deck using Spaced Repetition.</p>
                  <button 
                    onClick={() => {
                        const allIds = cards.map(c => c.id);
                        setQueue(allIds);
                        setMastered(new Set());
                        setCurrentCardId(allIds[0]);
                    }}
                    className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-all"
                  >
                      Restart Session
                  </button>
              </div>
          </div>
      );
  }

  const masteredCount = mastered.size;
  const progress = (masteredCount / cards.length) * 100;
  const remainingCount = queue.length;

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      
      {/* SRS Stats */}
      <div className="flex items-center justify-between mb-6 text-slate-600 px-2">
        <div className="flex items-center space-x-6">
            <div className="text-sm font-medium flex flex-col">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Queue</span>
                <span className="font-bold text-lg">{remainingCount}</span>
            </div>
            <div className="text-sm font-medium flex flex-col">
                <span className="text-xs text-green-500 uppercase tracking-wider">Mastered</span>
                <span className="font-bold text-lg text-green-600">{masteredCount}</span>
            </div>
        </div>
      </div>

      <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-green-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Card */}
      <div className="perspective-1000 w-full h-[600px] cursor-pointer group" onClick={() => !isFlipped && setIsFlipped(true)}>
        <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden">
            <div className="h-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-brand-500"></div>
              
              <span className="absolute top-8 left-8 text-xs font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-3 py-1 rounded-full border border-brand-100">Front</span>
              <span className="absolute top-8 right-8 text-xs font-medium text-slate-400 max-w-[200px] truncate">{currentCard.topic}</span>

              <div className="flex-grow flex flex-col items-center justify-center overflow-y-auto w-full custom-scrollbar py-4">
                {currentCard.relatedImages && currentCard.relatedImages.length > 0 && (
                    <div className="mb-6 max-h-[200px]">
                        <img 
                            src={currentCard.relatedImages[0]} 
                            className="max-h-[200px] w-auto object-contain rounded-lg shadow-md border border-slate-100" 
                            alt="Visual aid"
                        />
                    </div>
                )}
                <div className="prose prose-lg text-slate-800 leading-relaxed max-w-none">
                  <p className="text-xl sm:text-2xl font-medium">{currentCard.english}</p>
                </div>
              </div>

              <div className="mt-8 text-sm text-slate-400 font-medium flex items-center animate-pulse">
                Click card to reveal answer
              </div>
            </div>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180">
            <div className="h-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8 sm:p-12 flex flex-col items-center justify-center text-center text-white relative">
              
              <span className="absolute top-8 left-8 text-xs font-bold text-brand-400 uppercase tracking-wider bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Back</span>
              
              <div className="flex-grow flex flex-col items-center justify-center overflow-y-auto w-full custom-scrollbar py-4">
                {currentCard.keyTerm && (
                  <div className="mb-8">
                    <span className="inline-block bg-brand-600 text-white text-lg font-bold px-6 py-2 rounded-xl shadow-lg border border-brand-500">
                      {currentCard.keyTerm}
                    </span>
                  </div>
                )}
                <div className="prose prose-invert prose-lg leading-relaxed text-slate-100 max-w-none">
                  <p className="text-xl sm:text-2xl font-serif">{currentCard.chinese}</p>
                </div>
              </div>

               {/* SRS Buttons */}
               <div className="mt-6 grid grid-cols-3 gap-4 w-full">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleResult('hard'); }}
                    className="py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
                  >
                    Hard (Show Soon)
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleResult('medium'); }}
                    className="py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 hover:bg-yellow-500 hover:text-white transition-all font-bold text-sm"
                  >
                    Medium (Later)
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleResult('easy'); }}
                    className="py-3 rounded-xl bg-green-500/20 border border-green-500/50 text-green-200 hover:bg-green-500 hover:text-white transition-all font-bold text-sm"
                  >
                    Easy (Mastered)
                  </button>
               </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.5); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default FlashcardView;
