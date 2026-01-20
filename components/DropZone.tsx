import React, { useCallback, useState } from 'react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesAdded, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    
    // Fix: Explicitly type file as File to avoid implicit unknown type error
    const files = Array.from(e.dataTransfer.files).filter((file: File) => file.type === 'application/pdf');
    if (files.length > 0) {
      onFilesAdded(files);
    } else {
      alert("Por favor, sube solo archivos PDF.");
    }
  }, [onFilesAdded, disabled]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;
    // Fix: Explicitly type file as File to avoid implicit unknown type error
    const files = Array.from(e.target.files).filter((file: File) => file.type === 'application/pdf');
    onFilesAdded(files);
    // Reset value to allow uploading the same file again if needed
    e.target.value = '';
  }, [onFilesAdded, disabled]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer group
        ${isDragOver 
          ? 'border-indigo-500 bg-indigo-50' 
          : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
        }
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        multiple
        accept=".pdf"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full bg-slate-100 group-hover:bg-white transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M12 18v-6"/>
            <path d="M9 15l3-3 3 3"/>
          </svg>
        </div>
        <div className="text-slate-600">
          <span className="font-semibold text-indigo-600">Haz clic para subir</span> o arrastra tus archivos aquí
          <p className="text-sm text-slate-400 mt-1">Solo archivos PDF</p>
        </div>
      </div>
    </div>
  );
};

export default DropZone;