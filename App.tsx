import React, { useState, useCallback } from 'react';
import DropZone from './components/DropZone';
import QueueList from './components/QueueList';
import { FileQueueItem, ConversionStatus, OutputFormat } from './types';
import { generateId } from './utils/fileHelpers';
import { convertPdfLocal } from './services/pdfService';
import { convertWordToPdfLocal } from './services/wordService';
import { convertWordToTxtLocal } from './services/wordToTxtService';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'pdf-to-txt' | 'docx-to-pdf' | 'docx-to-txt'>('pdf-to-txt');
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Hardcoded Spanish texts dynamically adapted to the screen
  const t = {
    title: 'PDFluye',
    subtitle: currentScreen === 'pdf-to-txt' 
      ? 'Conversor PDF a TXT' 
      : currentScreen === 'docx-to-pdf' 
        ? 'Conversor DOCX a PDF' 
        : 'Conversor DOCX a TXT (Tablas)',
    heroTitle: currentScreen === 'pdf-to-txt' 
      ? 'Extracción de Texto Simple y Limpia' 
      : currentScreen === 'docx-to-pdf' 
        ? 'Conversor DOCX a PDF de Alta Fidelidad' 
        : 'Conversor DOCX a TXT Estructurado',
    heroDesc: currentScreen === 'pdf-to-txt' 
      ? 'Convierte tus documentos PDF a archivos de texto plano (.txt) manteniendo el formato de líneas original.' 
      : currentScreen === 'docx-to-pdf'
        ? 'Convierte tus documentos DOCX (.docx) a archivos PDF vectorizados de alta calidad y alta fidelidad.'
        : 'Convierte informes con tablas DOCX (.docx) a archivos TXT estructurados optimizados para otros sistemas.',
    convert: currentScreen === 'pdf-to-txt' 
      ? 'Convertir a TXT' 
      : currentScreen === 'docx-to-pdf' 
        ? 'Convertir a PDF' 
        : 'Convertir a TXT',
    files: 'Archivo(s)',
    processing: 'Procesando...',
    clickToUpload: 'Haz clic para subir',
    orDrag: 'o arrastra tus archivos aquí',
    onlyPdf: currentScreen === 'pdf-to-txt' ? 'Solo archivos PDF (.pdf)' : 'Solo archivos DOCX (.docx)',
    alertPdf: currentScreen === 'pdf-to-txt' ? 'Por favor, sube solo archivos PDF.' : 'Por favor, sube solo archivos DOCX (.docx).',
    queue: currentScreen === 'pdf-to-txt' 
      ? 'Cola de Archivos (PDF a TXT)' 
      : currentScreen === 'docx-to-pdf'
        ? 'Cola de Archivos (DOCX a PDF)'
        : 'Cola de Archivos (DOCX a TXT)',
    clear: 'Limpiar Todo',
    download: currentScreen === 'docx-to-pdf' ? 'Descargar .pdf' : 'Descargar .txt',
    delete: 'Eliminar',
    completed: 'Completado',
    error: 'Error'
  };

  const handleFilesAdded = useCallback((files: File[]) => {
    const newItems: FileQueueItem[] = files.map(file => {
      let convertedName = "";
      if (currentScreen === 'pdf-to-txt') {
        convertedName = file.name.replace(/\.pdf$/i, '.txt');
        // fallback in case replacement was skipped due to case sensitivity
        if (!convertedName.endsWith('.txt')) {
          convertedName += '.txt';
        }
      } else if (currentScreen === 'docx-to-txt') {
        convertedName = file.name.replace(/\.docx$/i, '.txt');
        if (!convertedName.endsWith('.txt')) {
          convertedName += '.txt';
        }
      } else {
        // replace extension with .pdf
        convertedName = file.name.replace(/\.docx$/i, '') + '.pdf';
      }
      
      return {
        id: generateId(),
        file,
        type: currentScreen,
        status: ConversionStatus.IDLE,
        convertedName,
        timestamp: Date.now()
      };
    });
    setQueue(prev => [...newItems, ...prev]);
  }, [currentScreen]);

  const handleRemoveItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    // Clear only elements of the selected screen segment
    setQueue(prev => prev.filter(item => item.type !== currentScreen));
  }, [currentScreen]);

  const processQueue = async () => {
    setIsProcessing(true);
    
    // Process only IDLE items belonging to the active flow screen
    const itemsToProcess = queue.filter(
      item => item.status === ConversionStatus.IDLE && item.type === currentScreen
    );
    
    for (const item of itemsToProcess) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: ConversionStatus.PROCESSING } : q));

      try {
        if (item.type === 'pdf-to-txt') {
          const result = await convertPdfLocal(item.file);
          setQueue(prev => prev.map(q => q.id === item.id ? {
            ...q,
            status: ConversionStatus.COMPLETED,
            resultContent: result,
            convertedName: item.convertedName
          } : q));
        } else if (item.type === 'docx-to-txt') {
          const result = await convertWordToTxtLocal(item.file);
          setQueue(prev => prev.map(q => q.id === item.id ? {
            ...q,
            status: ConversionStatus.COMPLETED,
            resultContent: result,
            convertedName: item.convertedName
          } : q));
        } else {
          // docx-to-pdf conversion using client-side mammoth helper
          const resultBlob = await convertWordToPdfLocal(item.file);
          setQueue(prev => prev.map(q => q.id === item.id ? {
            ...q,
            status: ConversionStatus.COMPLETED,
            resultBlob: resultBlob,
            convertedName: item.convertedName
          } : q));
        }

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

  // Filter queue elements as segment per current screen
  const filteredQueue = queue.filter(item => item.type === currentScreen);
  const pendingCount = filteredQueue.filter(item => item.status === ConversionStatus.IDLE).length;

  return (
    <div className="relative z-10 min-h-screen bg-zinc-950 text-zinc-100 pb-20 selection:bg-yellow-400 selection:text-black font-inter">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 text-black p-1.5 rounded-lg shadow-md shadow-yellow-400/10">
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
        
        {/* Navigation Tab Switcher */}
        <div className="flex bg-zinc-900/80 border border-zinc-800 p-1.5 rounded-xl mb-12 w-full max-w-xl mx-auto shadow-xl">
          <button
            onClick={() => setCurrentScreen('pdf-to-txt')}
            disabled={isProcessing}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm transition-all focus:outline-none ${
              currentScreen === 'pdf-to-txt'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            id="tab-pdf-to-txt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            PDF a TXT
          </button>
          <button
            onClick={() => setCurrentScreen('docx-to-pdf')}
            disabled={isProcessing}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm transition-all focus:outline-none ${
              currentScreen === 'docx-to-pdf'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            id="tab-docx-to-pdf"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2a2 2 0 1 0 0-4H8v8"/><path d="M12 13h2a2 2 0 1 0 0-4h-2v8"/></svg>
            DOCX a PDF
          </button>
          <button
            onClick={() => setCurrentScreen('docx-to-txt')}
            disabled={isProcessing}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm transition-all focus:outline-none ${
              currentScreen === 'docx-to-txt'
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            id="tab-docx-to-txt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><path d="M8 9h2v8H8z"/></svg>
            DOCX a TXT
          </button>
        </div>

        <div className="mb-10 text-center animate-fade-in">
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">{t.heroTitle}</h2>
          <p className="text-zinc-400 text-base max-w-xl mx-auto">
            {t.heroDesc}
          </p>
        </div>

        {/* Upload Area */}
        <DropZone 
            onFilesAdded={handleFilesAdded} 
            disabled={isProcessing} 
            accept={currentScreen === 'pdf-to-txt' ? '.pdf' : '.docx'}
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
                flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-400/20 transition-all w-full sm:w-auto justify-center cursor-pointer
                ${isProcessing 
                  ? 'bg-yellow-600 text-yellow-200 cursor-wait' 
                  : 'bg-yellow-400 text-black hover:bg-yellow-300 hover:shadow-yellow-400/40 hover:-translate-y-1'
                }
              `}
              id="btn-process-queue"
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
          items={filteredQueue} 
          onRemove={handleRemoveItem} 
          onClearAll={handleClearAll}
          format={currentScreen === 'docx-to-pdf' ? OutputFormat.PDF : OutputFormat.TXT}
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
