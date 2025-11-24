
import React, { useState, useRef, useEffect } from 'react';
import { StudySection, AppTheme } from '../types';

interface StudyGuideViewProps {
  sections: StudySection[];
  theme: AppTheme;
  onUpdateContent?: (sectionIndex: number, contentIndex: number, field: 'english' | 'chinese', newValue: string) => void;
}

// Lazy Image Component using IntersectionObserver
const LazyImage: React.FC<{ src: string; alt: string; className?: string; style?: React.CSSProperties }> = ({ src, alt, className, style }) => {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      });
    });

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : ''}
      alt={alt}
      className={`${className} ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
      style={style}
      loading="lazy"
    />
  );
};

// Editable Block Component with Toggle
const EditableBlock: React.FC<{
  text: string;
  theme: AppTheme;
  onSave: (val: string) => void;
  className?: string;
}> = ({ text, theme, onSave, className }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(text);

  const handleBlur = () => {
    setIsEditing(false);
    if (value !== text) {
      onSave(value);
    }
  };

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className="w-full min-h-[100px] p-2 rounded border focus:ring-2 focus:outline-none bg-white text-sm leading-relaxed"
        style={{ 
          borderColor: theme.colors.primary, 
          '--tw-ring-color': theme.colors.primary 
        } as React.CSSProperties}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className={`relative group cursor-text rounded transition-colors hover:bg-black/5 p-1 -m-1 ${className}`}
      title="Click to edit text"
    >
      <RichTextRenderer text={text} theme={theme} />
      <span className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-white shadow-sm border rounded px-1.5 py-0.5 text-[10px] text-slate-400 pointer-events-none">
        Edit
      </span>
    </div>
  );
};


// Utility to render rich text with basic Markdown features
const RichTextRenderer: React.FC<{ text: string, theme: AppTheme }> = ({ text, theme }) => {
  // Basic Table Detection
  const isTable = text.trim().startsWith('|');

  if (isTable) {
    const rows = text.trim().split('\n').filter(r => r.trim() !== '');
    return (
      <div className="overflow-x-auto my-4 rounded-lg border shadow-sm" style={{ borderColor: theme.colors.border }}>
        <table className="w-full text-sm text-left border-collapse">
          <tbody>
            {rows.map((row, i) => {
              if (row.includes('---')) return null;
              const cells = row.split('|').filter(c => c.trim() !== '');
              return (
                <tr key={i} className={i === 0 ? 'font-bold' : 'border-t hover:bg-black/5'} 
                    style={{ backgroundColor: i === 0 ? theme.colors.secondary : 'transparent', borderColor: theme.colors.border }}>
                  {cells.map((cell, j) => (
                    <td key={j} className="px-4 py-3 border-r last:border-r-0 leading-relaxed" style={{ borderColor: theme.colors.border }}>
                       <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(cell.trim()) }} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return <div className="rich-text-content space-y-2" dangerouslySetInnerHTML={{ __html: formatInlineStyles(text) }} />;
};

const formatInlineStyles = (text: string) => {
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-sm border border-slate-200">$1</code>')
    .replace(/\[\s*\]/g, '<input type="checkbox" class="mr-1 form-checkbox h-4 w-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500">')
    .replace(/_{3,}/g, '<span class="inline-block border-b-2 border-slate-300 min-w-[50px] mx-1"></span>');

  formatted = formatted.replace(/\n- /g, '<br/><span class="inline-block mr-2">•</span>');
  formatted = formatted.replace(/\n/g, '<br/>');
  
  formatted = formatted.replace(/(Example:|For example:|e\.g\.)/gi, '<span class="font-bold underline decoration-2 decoration-sky-200">$1</span>');

  return formatted;
};

const StudyGuideView: React.FC<StudyGuideViewProps> = ({ sections, theme, onUpdateContent }) => {
  if (sections.length === 0) return null;

  return (
    <div 
      className="w-full max-w-5xl mx-auto space-y-16 pb-20 transition-colors duration-300" 
      id="study-guide-container"
      style={{ color: theme.colors.text }}
    >
      {sections.map((section, idx) => (
        <div 
            key={idx} 
            className="study-section-export rounded-2xl shadow-sm border overflow-hidden break-inside-avoid transition-all duration-300 hover:shadow-md"
            style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}
        >
          {/* Section Header */}
          <div 
            className="px-8 py-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ backgroundColor: theme.colors.secondary, borderColor: theme.colors.border }}
          >
            <div className="flex items-center">
                <span 
                  className="text-white text-xs font-bold px-3 py-1.5 rounded-lg mr-4 uppercase tracking-wider shadow-sm"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                Section {idx + 1}
                </span>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: theme.colors.text }}>{section.topic}</h2>
            </div>
          </div>

          {/* Visual Context / Source Page */}
          {section.images && section.images.length > 0 && (
            <div 
              className="border-b p-8"
              style={{ backgroundColor: `${theme.colors.bg}80`, borderColor: theme.colors.border }} 
            >
                <div className="flex items-center mb-4">
                   <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: theme.colors.subtext}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                   <p className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.colors.subtext }}>Original Source Context</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {section.images.map((img, imgIdx) => (
                        <LazyImage 
                            key={imgIdx} 
                            src={img} 
                            alt={`Source Material for ${section.topic}`} 
                            className="w-full h-auto rounded-lg shadow-sm border object-contain bg-white transition-transform"
                            style={{ borderColor: theme.colors.border, maxHeight: '500px' }}
                        />
                    ))}
                    {section.visualSummary && (
                      <div className="flex items-start bg-white/60 p-4 rounded-lg border border-dashed" style={{ borderColor: theme.colors.border }}>
                         <span className="text-xs font-bold mr-2 mt-1 uppercase" style={{ color: theme.colors.primary }}>AI Note:</span>
                         <p className="text-sm italic leading-relaxed" style={{ color: theme.colors.subtext }}>
                           {section.visualSummary}
                         </p>
                      </div>
                    )}
                </div>
            </div>
          )}

          {/* Content Table */}
          <div className="divide-y" style={{ borderColor: theme.colors.secondary }}>
            {section.content.map((point, pIdx) => (
              <div key={pIdx} className="grid grid-cols-1 lg:grid-cols-2 group">
                
                {/* English Column */}
                <div className="p-8 lg:border-r" style={{ borderColor: theme.colors.secondary }}>
                  <div className="flex items-start">
                    <span 
                      className="font-serif mr-4 select-none text-lg mt-0.5 opacity-30 font-bold"
                      style={{ color: theme.colors.subtext }}
                    >
                      {pIdx + 1}
                    </span>
                    <div className="w-full">
                      {point.keyTerm && (
                        <div className="mb-3">
                            <span 
                            className="inline-block text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wide"
                            style={{ backgroundColor: theme.colors.secondary, color: theme.colors.primary }}
                            >
                            {point.keyTerm}
                            </span>
                        </div>
                      )}
                      <div className="leading-loose text-lg" style={{ color: theme.colors.text }}>
                        {onUpdateContent ? (
                          <EditableBlock 
                            text={point.english} 
                            theme={theme} 
                            onSave={(val) => onUpdateContent(idx, pIdx, 'english', val)}
                          />
                        ) : (
                          <RichTextRenderer text={point.english} theme={theme} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chinese Column */}
                <div className="p-8 bg-opacity-30 transition-colors hover:bg-opacity-50" style={{ backgroundColor: `${theme.colors.bg}40` }}>
                  <div className="font-serif leading-loose text-lg text-justify" style={{ color: theme.colors.text }}>
                    {onUpdateContent ? (
                       <EditableBlock 
                         text={point.chinese} 
                         theme={theme} 
                         onSave={(val) => onUpdateContent(idx, pIdx, 'chinese', val)}
                       />
                     ) : (
                       <RichTextRenderer text={point.chinese} theme={theme} />
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudyGuideView;
