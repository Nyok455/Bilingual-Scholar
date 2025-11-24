
import React from 'react';
import { StudySection, AppTheme } from '../types';

interface StudyGuideViewProps {
  sections: StudySection[];
  theme: AppTheme;
}

// Utility to render rich text with Markdown-like features
const RichTextRenderer: React.FC<{ text: string, theme: AppTheme }> = ({ text, theme }) => {
  // Check for Table (basic check if lines start with |)
  const isTable = text.trim().startsWith('|');

  if (isTable) {
    const rows = text.trim().split('\n').filter(r => r.trim() !== '');
    return (
      <div className="overflow-x-auto my-4 rounded-lg border shadow-sm" style={{ borderColor: theme.colors.border }}>
        <table className="w-full text-sm text-left border-collapse">
          <tbody>
            {rows.map((row, i) => {
              // Skip separator lines like |---|---|
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

// Helper for bold, code, form inputs
const formatInlineStyles = (text: string) => {
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-sm border border-slate-200">$1</code>') // Inline Code
    .replace(/\[\s*\]/g, '<input type="checkbox" class="mr-1 form-checkbox h-4 w-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500">') // Checkbox
    .replace(/_{3,}/g, '<span class="inline-block border-b-2 border-slate-300 min-w-[50px] mx-1"></span>'); // Form underline

  // Lists and examples
  formatted = formatted.replace(/\n- /g, '<br/><span class="inline-block mr-2">•</span>');
  formatted = formatted.replace(/\n/g, '<br/>');
  
  // Highlight "Example:" text
  formatted = formatted.replace(/(Example:|For example:|e\.g\.)/gi, '<span class="font-bold underline decoration-2 decoration-sky-200">$1</span>');

  return formatted;
};

const StudyGuideView: React.FC<StudyGuideViewProps> = ({ sections, theme }) => {
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
            {section.questions && section.questions.length > 0 && (
                 <span className="text-xs font-semibold px-2 py-1 rounded border bg-white/50 self-start md:self-center" style={{ borderColor: theme.colors.border, color: theme.colors.subtext }}>
                    {section.questions.length} Practice Questions Available
                 </span>
            )}
          </div>

          {/* Extracted Images & Context Gallery */}
          {section.images && section.images.length > 0 && (
            <div 
              className="border-b p-8"
              style={{ backgroundColor: `${theme.colors.bg}80`, borderColor: theme.colors.border }} 
            >
                <div className="flex items-center mb-4">
                   <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: theme.colors.subtext}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                   <p className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.colors.subtext }}>Key Visuals & Diagrams</p>
                </div>

                <div className="flex flex-col gap-6">
                     <div className="flex flex-wrap gap-4">
                        {section.images.map((img, imgIdx) => (
                            <img 
                                key={imgIdx} 
                                src={img} 
                                alt={`Figure from ${section.topic}`} 
                                className="max-h-[300px] w-auto rounded-lg shadow-sm border object-contain bg-white transition-transform hover:scale-[1.02]"
                                style={{ borderColor: theme.colors.border }}
                            />
                        ))}
                    </div>
                    {/* Visual Summary / Caption */}
                    {section.visualSummary && (
                      <div className="flex items-start bg-white/60 p-4 rounded-lg border border-dashed" style={{ borderColor: theme.colors.border }}>
                         <span className="text-xs font-bold mr-2 mt-1 uppercase" style={{ color: theme.colors.primary }}>Figure Notes:</span>
                         <p className="text-sm italic leading-relaxed" style={{ color: theme.colors.subtext }}>
                           {section.visualSummary}
                         </p>
                      </div>
                    )}
                </div>
            </div>
          )}

          {/* Section Content Table - Comprehensive View */}
          <div className="divide-y" style={{ borderColor: theme.colors.secondary }}>
            {section.content.map((point, pIdx) => (
              <div key={pIdx} className="grid grid-cols-1 lg:grid-cols-2 group">
                
                {/* English Column (Comprehensive) */}
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
                        <RichTextRenderer text={point.english} theme={theme} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chinese Column */}
                <div className="p-8 bg-opacity-30 transition-colors hover:bg-opacity-50" style={{ backgroundColor: `${theme.colors.bg}40` }}>
                  <div className="font-serif leading-loose text-lg text-justify" style={{ color: theme.colors.text }}>
                    <RichTextRenderer text={point.chinese} theme={theme} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center pt-8 border-t" style={{ borderColor: theme.colors.border }}>
        <p className="text-sm opacity-50" style={{ color: theme.colors.subtext }}>End of Comprehensive Study Guide</p>
      </div>
    </div>
  );
};

export default StudyGuideView;
