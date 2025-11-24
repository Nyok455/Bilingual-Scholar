
import React, { useState, useMemo } from 'react';
import { StudySection, ExamQuestion, AppTheme } from '../types';

interface ExamViewProps {
  sections: StudySection[];
  theme: AppTheme;
}

const ExamView: React.FC<ExamViewProps> = ({ sections, theme }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  // Flatten all questions
  const questions = useMemo(() => {
    const allQuestions: { q: ExamQuestion; sourceTopic: string }[] = [];
    sections.forEach(section => {
      if (section.questions) {
        section.questions.forEach(q => {
          allQuestions.push({ q, sourceTopic: section.topic });
        });
      }
    });
    return allQuestions;
  }, [sections]);

  if (questions.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-xl">No exam questions generated.</p>
      </div>
    );
  }

  const handleOptionSelect = (optionIndex: number) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((item, idx) => {
      if (selectedAnswers[idx] === item.q.correctIndex) correct++;
    });
    return correct;
  };

  const currentQ = questions[currentQuestionIndex];
  const isAnswered = selectedAnswers[currentQuestionIndex] !== undefined;

  // Results View
  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="max-w-4xl mx-auto pb-20">
        <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8 text-center" style={{ borderColor: theme.colors.border }}>
          <h2 className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>Exam Results</h2>
          <div className="text-6xl font-extrabold my-6" style={{ color: theme.colors.primary }}>
            {percentage}%
          </div>
          <p className="text-lg text-slate-600">
            {score} / {questions.length} Correct
          </p>
          <button 
            onClick={() => { setShowResults(false); setCurrentQuestionIndex(0); setSelectedAnswers({}); }}
            className="mt-6 px-6 py-2 rounded-lg text-white font-medium transition-colors hover:brightness-90"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Retake Exam
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((item, idx) => {
            const userAns = selectedAnswers[idx];
            const isCorrect = userAns === item.q.correctIndex;
            return (
              <div key={idx} className={`rounded-xl border p-6 bg-white ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-sm font-medium px-2 py-1 rounded bg-slate-100 text-slate-500">
                    Q{idx + 1}
                  </div>
                  {isCorrect ? (
                    <span className="text-green-600 font-bold flex items-center">Correct</span>
                  ) : (
                    <span className="text-red-500 font-bold flex items-center">Incorrect</span>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-4 text-slate-800">{item.q.question}</h3>
                <div className="space-y-2 mb-4">
                  {item.q.options.map((opt, optIdx) => (
                    <div 
                      key={optIdx} 
                      className={`p-3 rounded-lg border text-sm flex items-center
                        ${optIdx === item.q.correctIndex ? 'bg-green-50 border-green-300 text-green-900' : ''}
                        ${optIdx === userAns && optIdx !== item.q.correctIndex ? 'bg-red-50 border-red-300 text-red-900' : ''}
                        ${optIdx !== item.q.correctIndex && optIdx !== userAns ? 'bg-slate-50 border-transparent opacity-60' : ''}
                      `}
                    >
                      {optIdx === item.q.correctIndex && <span className="mr-2">✅</span>}
                      {optIdx === userAns && optIdx !== item.q.correctIndex && <span className="mr-2">❌</span>}
                      {opt}
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                  <span className="font-bold block mb-1">Explanation:</span>
                  {item.q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Question View
  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="mb-6 flex items-center justify-between">
         <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Exam Mode</span>
         <span className="text-sm font-medium px-3 py-1 bg-white rounded-full border shadow-sm" style={{ color: theme.colors.subtext }}>
            Question {currentQuestionIndex + 1} / {questions.length}
         </span>
      </div>

      <div className="w-full h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
        <div 
          className="h-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`, backgroundColor: theme.colors.primary }}
        ></div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border p-8 relative overflow-hidden" style={{ borderColor: theme.colors.border }}>
        <h2 className="text-xl sm:text-2xl font-bold mb-8 mt-4 leading-relaxed" style={{ color: theme.colors.text }}>
          {currentQ.q.question}
        </h2>

        <div className="space-y-3">
          {currentQ.q.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center group
                ${selectedAnswers[currentQuestionIndex] === idx 
                   ? 'border-brand-500 bg-brand-50' 
                   : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
              style={{ 
                borderColor: selectedAnswers[currentQuestionIndex] === idx ? theme.colors.primary : undefined,
                backgroundColor: selectedAnswers[currentQuestionIndex] === idx ? `${theme.colors.primary}10` : undefined
              }}
            >
              <div 
                className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0 transition-colors
                  ${selectedAnswers[currentQuestionIndex] === idx ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 group-hover:border-slate-400'}
                `}
                style={{
                    borderColor: selectedAnswers[currentQuestionIndex] === idx ? theme.colors.primary : undefined,
                    backgroundColor: selectedAnswers[currentQuestionIndex] === idx ? theme.colors.primary : 'transparent'
                }}
              >
                {selectedAnswers[currentQuestionIndex] === idx && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className={`text-base ${selectedAnswers[currentQuestionIndex] === idx ? 'font-medium' : ''}`} style={{ color: theme.colors.text }}>
                {option}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 rounded-xl font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          Previous
        </button>

        {currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={() => setShowResults(true)}
            disabled={!isAnswered}
            className="px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-brand-500/30 hover:shadow-xl hover:translate-y-[-1px] transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Submit Exam
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={!isAnswered}
             className="px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-brand-500/30 hover:shadow-xl hover:translate-y-[-1px] transition-all disabled:opacity-50"
             style={{ backgroundColor: theme.colors.primary }}
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
};

export default ExamView;
