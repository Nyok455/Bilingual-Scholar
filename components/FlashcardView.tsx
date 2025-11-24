
import React, { useState, useEffect } from 'react';
import { StudySection, StudyPoint } from '../types';

interface FlashcardViewProps {
  sections: StudySection[];
}

interface FlashcardItem extends StudyPoint {
  topic: string;
  relatedImages?: string[];
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ sections }) => {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Flatten structure: create a card for every content point
    const allPoints: FlashcardItem[] = [];
    sections.forEach(section => {
      section.content.forEach(point => {
        allPoints.push({
          ...point,
          topic: section.topic,
          relatedImages: section.images
        });
      });
    });
    setCards(allPoints);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [sections]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c + 1), 200);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c - 1), 200);
    }
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  if (cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      
      {/* Controls Header */}
      <div className="flex items-center justify-between mb-6 text-slate-600">
        <div className="text-sm font-medium">
          Card {currentIndex + 1} of {cards.length}
        </div>
        <button 
          onClick={handleShuffle}
          className="text-xs flex items-center bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
        >
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Shuffle
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-brand-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Card Container - 3D Perspective */}
      <div className="perspective-1000 w-full h-[600px] cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front of Card */}
          <div className="absolute w-full h-full backface-hidden">
            <div className="h-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute top-0 left-0 w-full h-2 bg-brand-500"></div>
              
              <span className="absolute top-8 left-8 text-xs font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
                Question / Concept
              </span>
              <span className="absolute top-8 right-8 text-xs font-medium text-slate-400 max-w-[200px] truncate">
                {currentCard.topic}
              </span>

              <div className="flex-grow flex flex-col items-center justify-center overflow-y-auto w-full custom-scrollbar py-4">
                {currentCard.relatedImages && currentCard.relatedImages.length > 0 && (
                    <div className="mb-8 max-h-[200px]">
                        <img 
                            src={currentCard.relatedImages[0]} 
                            className="max-h-[200px] w-auto object-contain rounded-lg shadow-md border border-slate-100" 
                            alt="Visual aid"
                        />
                    </div>
                )}
                <div className="prose prose-lg text-slate-800 leading-relaxed max-w-none">
                  <p className="text-xl sm:text-2xl font-medium">
                    {currentCard.english}
                  </p>
                </div>
              </div>

              <div className="mt-8 text-sm text-slate-400 font-medium flex items-center animate-pulse">
                Click card to reveal answer
              </div>
            </div>
          </div>

          {/* Back of Card */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180">
            <div className="h-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8 sm:p-12 flex flex-col items-center justify-center text-center text-white relative">
              
              <span className="absolute top-8 left-8 text-xs font-bold text-brand-400 uppercase tracking-wider bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                Explanation
              </span>
              
              <div className="flex-grow flex flex-col items-center justify-center overflow-y-auto w-full custom-scrollbar py-4">
                {currentCard.keyTerm && (
                  <div className="mb-8">
                    <span className="inline-block bg-brand-600 text-white text-lg font-bold px-6 py-2 rounded-xl shadow-lg border border-brand-500">
                      {currentCard.keyTerm}
                    </span>
                  </div>
                )}
                <div className="prose prose-invert prose-lg leading-relaxed text-slate-100 max-w-none">
                  <p className="text-xl sm:text-2xl font-serif">
                    {currentCard.chinese}
                  </p>
                </div>
              </div>

               <div className="mt-8 text-sm text-slate-500 font-medium">
                Click to flip back
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-10 px-4">
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          disabled={currentIndex === 0}
          className="flex items-center px-6 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all font-medium text-slate-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          disabled={currentIndex === cards.length - 1}
          className="flex items-center px-6 py-3 bg-brand-600 border border-transparent rounded-xl shadow-md hover:bg-brand-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all font-medium text-white"
        >
          Next
          <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.5); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.8); }
      `}</style>
    </div>
  );
};

export default FlashcardView;
