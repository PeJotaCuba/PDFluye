import React, { useState } from 'react';
import { FileQueueItem, ConversionStatus, OutputFormat } from '../types';
import { downloadFile, shareContent } from '../utils/fileHelpers';

interface QueueListProps {
  items: FileQueueItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  format: OutputFormat;
  language: string;
}

const QueueList: React.FC<QueueListProps> = ({ items, onRemove, onClearAll, format, language }) => {
  const [shareMenuOpen, setShareMenuOpen] = useState<string | null>(null);

  if (items.length === 0) return null;

  const t = {
    queue: language === 'pt' ? 'Fila de Arquivos' : language === 'en' ? 'File Queue' : 'Cola de Archivos',
    clear: language === 'pt' ? 'Limpar Tudo' : language === 'en' ? 'Clear All' : 'Limpiar Todo',
    open: language === 'pt' ? 'Abrir' : language === 'en' ? 'Open' : 'Abrir',
    folder: language === 'pt' ? 'Pasta' : language === 'en' ? 'Folder' : 'Carpeta',
    delete: language === 'pt' ? 'Excluir' : language === 'en' ? 'Delete' : 'Eliminar',
    processing: language === 'pt' ? 'Processando' : language === 'en' ? 'Processing' : 'Procesando',
    completed: language === 'pt' ? 'Concluído' : language === 'en' ? 'Completed' : 'Completado',
    error: language === 'pt' ? 'Erro' : language === 'en' ? 'Error' : 'Error',
    share: language === 'pt' ? 'Compartilhar' : language === 'en' ? 'Share' : 'Compartir',
  };

  const getStatusBadge = (status: ConversionStatus) => {
    switch (status) {
      case ConversionStatus.PROCESSING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t.processing}
          </span>
        );
      case ConversionStatus.COMPLETED:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">{t.completed}</span>;
      case ConversionStatus.ERROR:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">{t.error}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">Pendiente</span>;
    }
  };

  const handleOpenFolder = (item: FileQueueItem) => {
    // Browser security restriction workaround
    if (item.resultContent) {
        downloadFile(item.convertedName, item.resultContent, format);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg shadow-black/20 border border-zinc-800 overflow-visible mt-6">
      <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.queue} ({items.length})</h3>
        <button 
            onClick={onClearAll}
            className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
        >
            {t.clear}
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
              
              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                
                {item.status === ConversionStatus.COMPLETED && (
                    <>
                        {/* Open / Download */}
                        <button
                            onClick={() => downloadFile(item.convertedName, item.resultContent!, format)}
                            className="p-2 rounded-lg bg-yellow-400 text-black hover:bg-yellow-300 transition-all font-bold text-xs flex items-center gap-1"
                            title={t.open}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {t.open}
                        </button>

                         {/* Open Folder (Simulated) */}
                         <button
                            onClick={() => handleOpenFolder(item)}
                            className="p-2 rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-all font-medium text-xs flex items-center gap-1"
                            title="Guardar en..."
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        </button>

                        {/* Share */}
                        <div className="relative">
                            <button
                                onClick={() => setShareMenuOpen(shareMenuOpen === item.id ? null : item.id)}
                                className="p-2 rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                            </button>
                            {shareMenuOpen === item.id && (
                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 z-20 overflow-hidden">
                                    <div className="p-1">
                                        <button onClick={() => shareContent('email', item.resultContent!, item.convertedName)} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 rounded flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Gmail
                                        </button>
                                        <button onClick={() => shareContent('whatsapp', item.resultContent!, item.convertedName)} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 rounded flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> WhatsApp
                                        </button>
                                        <button onClick={() => shareContent('telegram', item.resultContent!, item.convertedName)} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 rounded flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Telegram
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Delete */}
                <button
                   onClick={() => onRemove(item.id)}
                   className="p-2 rounded-lg bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-all"
                   title={t.delete}
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