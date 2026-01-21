import React, { useState, useCallback } from 'react';
import DropZone from './components/DropZone';
import QueueList from './components/QueueList';
import { FileQueueItem, ConversionStatus, OutputFormat } from './types';
import { generateId, downloadFile } from './utils/fileHelpers';
import { convertPdfLocal } from './services/pdfService';

const App: React.FC = () => {
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Hardcoded Spanish texts
  const t = {
    title: 'PDFluye',
    subtitle: 'Conversor PDF a TXT',
    heroTitle: 'Extracción de Texto Simple y Limpia',
    heroDesc: 'Convierte tus documentos PDF a archivos de texto plano (.txt) manteniendo el formato de líneas original.',
    convert: 'Convertir a TXT',
    files: 'Archivo(s)',
    processing: 'Procesando...',
    clickToUpload: 'Haz clic para subir',
    orDrag: 'o arrastra tus archivos aquí',
    onlyPdf: 'Solo archivos PDF',
    alertPdf: 'Por favor, sube solo archivos PDF.',
    queue: 'Cola de Archivos',
    clear: 'Limpiar Todo',
    download: 'Descargar .txt',
    delete: 'Eliminar',
    completed: 'Completado',
    error: 'Error'
  };

  const handleFilesAdded = useCallback((files: File[]) => {
    const newItems: FileQueueItem[] = files.map(file => ({
      id: generateId(),
      file,
      status: ConversionStatus.IDLE,
      convertedName: file.name.replace(/\.pdf$/i, `.txt`),
      timestamp: Date.now()
    }));
    setQueue(prev => [...newItems, ...prev]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setQueue([]);
  }, []);

  const processQueue = async () => {
    setIsProcessing(true);
    const itemsToProcess = queue.filter(item => item.status === ConversionStatus.IDLE);
    
    for (const item of itemsToProcess) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: ConversionStatus.PROCESSING } : q));

      try {
        const result = await convertPdfLocal(item.file);
        
        // Auto download is optional, but user requested specific format output.
        // We will stick to manual download to let user review in the list first, 
        // or trigger it if desired. Sticking to QueueList logic.

        setQueue(prev => prev.map(q => q.id === item.id ? {
          ...q,
          status: ConversionStatus.COMPLETED,
          resultContent: result,
          convertedName: item.convertedName
        } : q));

      } catch (error) {
        setQueue(prev => prev.map(q => q.id === item.id ? {
          ...q,
          status: ConversionStatus.ERROR,
          errorMessage: error instanceof Error ? error.message : "Error desconocido"
        } : q));
      }
    }

    setIsProcessing(false);
  };

  const pendingCount = queue.filter(item => item.status === ConversionStatus.IDLE).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 selection:bg-yellow-400 selection:text-black font-inter">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 text-black p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{t.title}</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <span className="hidden sm:block text-sm text-zinc-500 font-medium">
                {t.subtitle}
             </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">{t.heroTitle}</h2>
          <p className="text-zinc-400">
            {t.heroDesc}
          </p>
        </div>

        {/* Upload Area */}
        <DropZone 
            onFilesAdded={handleFilesAdded} 
            disabled={isProcessing} 
            texts={{
                clickToUpload: t.clickToUpload,
                orDrag: t.orDrag,
                onlyPdf: t.onlyPdf,
                alertPdf: t.alertPdf
            }}
        />

        {/* Action Button */}
        {pendingCount > 0 && (
          <div className="mt-8 flex justify-center animate-fade-in">
            <button
              onClick={processQueue}
              disabled={isProcessing}
              className={`
                flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-400/20 transition-all w-full sm:w-auto justify-center
                ${isProcessing 
                  ? 'bg-yellow-600 text-yellow-200 cursor-wait' 
                  : 'bg-yellow-400 text-black hover:bg-yellow-300 hover:shadow-yellow-400/40 hover:-translate-y-1'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t.processing}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {t.convert} ({pendingCount})
                </>
              )}
            </button>
          </div>
        )}

        {/* Queue / Results */}
        <QueueList 
          items={queue} 
          onRemove={handleRemoveItem} 
          onClearAll={handleClearAll}
          format={OutputFormat.TXT}
          language="es"
          texts={{
              queue: t.queue,
              clear: t.clear,
              download: t.download,
              delete: t.delete,
              processing: t.processing,
              completed: t.completed,
              error: t.error
          }}
          directoryHandle={null}
        />
      </main>
    </div>
  );
};

export default App;