import React from 'react';
import { FileQueueItem, ConversionStatus, OutputFormat } from '../types';
import { downloadFile } from '../utils/fileHelpers';

interface QueueListProps {
  items: FileQueueItem[];
  onRemove: (id: string) => void;
  format: OutputFormat;
}

const QueueList: React.FC<QueueListProps> = ({ items, onRemove, format }) => {
  if (items.length === 0) return null;

  const getStatusBadge = (status: ConversionStatus) => {
    switch (status) {
      case ConversionStatus.PROCESSING:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando
          </span>
        );
      case ConversionStatus.COMPLETED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">Completado</span>;
      case ConversionStatus.ERROR:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">Error</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">Pendiente</span>;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg shadow-black/20 border border-zinc-800 overflow-hidden mt-6">
      <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Cola de Archivos ({items.length})</h3>
      </div>
      <ul className="divide-y divide-zinc-800">
        {items.map((item) => (
          <li key={item.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">{item.file.name}</p>
                    <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(item.status)}
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-zinc-500">
                    <span>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  {item.status === ConversionStatus.ERROR && (
                      <p className="mt-1 text-xs text-red-400">{item.errorMessage}</p>
                  )}
                </div>
              </div>
              
              <div className="ml-6 flex items-center space-x-4">
                {item.status === ConversionStatus.COMPLETED && item.resultContent && (
                  <button
                    onClick={() => downloadFile(item.convertedName, item.resultContent!, format)}
                    className="text-yellow-400 hover:text-yellow-300 font-bold text-sm flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar
                  </button>
                )}
                
                {item.status === ConversionStatus.IDLE && (
                   <button
                   onClick={() => onRemove(item.id)}
                   className="text-zinc-600 hover:text-red-400 transition-colors"
                   title="Eliminar"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                   </svg>
                 </button>
                )}
               
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QueueList;