import React from 'react';
import { FileQueueItem, ConversionStatus, OutputFormat } from '../types';
import { downloadFile } from '../utils/fileHelpers';

interface QueueListProps {
  items: FileQueueItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  format: OutputFormat;
  language: string;
  texts: {
    queue: string;
    clear: string;
    download: string;
    delete: string;
    processing: string;
    completed: string;
    error: string;
  };
  directoryHandle: any;
}

const QueueList: React.FC<QueueListProps> = ({ items, onRemove, onClearAll, format, texts, directoryHandle }) => {
  
  if (items.length === 0) return null;

  const getStatusBadge = (status: ConversionStatus) => {
    switch (status) {
      case ConversionStatus.PROCESSING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {texts.processing}
          </span>
        );
      case ConversionStatus.COMPLETED:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">{texts.completed}</span>;
      case ConversionStatus.ERROR:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">{texts.error}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">...</span>;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg shadow-black/20 border border-zinc-800 overflow-visible mt-6">
      <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{texts.queue} ({items.length})</h3>
        <button 
            onClick={onClearAll}
            className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
        >
            {texts.clear}
        </button>
      </div>
      <ul className="divide-y divide-zinc-800">
        {items.map((item) => (
          <li key={item.id} className="p-4 hover:bg-zinc-800/30 transition-colors relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* File Info */}
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex-shrink-0">
                  <svg className="h-10 w-10 text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-zinc-200 truncate max-w-[200px]">{item.file.name}</p>
                    <span className="text-zinc-500 text-xs">→</span>
                    <p className="text-sm font-medium text-yellow-400 truncate max-w-[200px]">{item.convertedName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(item.status)}
                    <span className="text-xs text-zinc-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  {item.status === ConversionStatus.ERROR && (
                      <p className="mt-1 text-xs text-red-400">{item.errorMessage}</p>
                  )}
                </div>
              </div>
              
              {/* Actions: Download & Delete */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                
                {item.status === ConversionStatus.COMPLETED && (
                    <button
                        onClick={() => downloadFile(item.convertedName, item.resultContent, format, directoryHandle)}
                        className="p-2 rounded-lg bg-yellow-400 text-black hover:bg-yellow-300 transition-all font-bold text-xs flex items-center gap-1"
                        title={texts.download}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {texts.download}
                    </button>
                )}

                {/* Delete */}
                <button
                   onClick={() => onRemove(item.id)}
                   className="p-2 rounded-lg bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-all"
                   title={texts.delete}
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                 </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QueueList;