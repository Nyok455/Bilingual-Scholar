import React, { useRef, useState } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.pptx')) {
      onFileSelect(file);
    } else {
      alert("Please upload a valid PDF or PPTX file.");
    }
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ease-in-out cursor-pointer group
        ${isDragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-slate-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        accept=".pdf,.pptx"
      />
      
      <div className="flex flex-col items-center space-y-4">
        <div className={`p-4 rounded-full bg-slate-100 group-hover:bg-white transition-colors ${isDragging ? 'bg-white' : ''}`}>
           <UploadIcon />
        </div>
        <div>
            <p className="text-lg font-medium text-slate-700">
                Click to upload or drag and drop
            </p>
            <p className="text-sm text-slate-500 mt-1">
                PDF or PPTX (Presentation) files
            </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
