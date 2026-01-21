import React, { useState, useCallback } from 'react';
import DropZone from './components/DropZone';
import SettingsPanel from './components/SettingsPanel';
import QueueList from './components/QueueList';
import { FileQueueItem, ConversionStatus, OutputFormat, ConversionSettings } from './types';
import { generateId } from './utils/fileHelpers';
import { convertPdfLocal } from './services/pdfService';

const App: React.FC = () => {
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: OutputFormat.TXT,
  });

  const handleFilesAdded = useCallback((files: File[]) => {
    const newItems: FileQueueItem[] = files.map(file => ({
      id: generateId(),
      file,
      status: ConversionStatus.IDLE,
      convertedName: file.name.replace('.pdf', `.${settings.format}`)
    }));
    setQueue(prev => [...prev, ...newItems]);
  }, [settings.format]);

  const handleRemoveItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const processQueue = async () => {
    setIsProcessing(true);
    
    // Process sequentially
    const itemsToProcess = queue.filter(item => item.status === ConversionStatus.IDLE);
    
    for (const item of itemsToProcess) {
      // Update status to processing
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: ConversionStatus.PROCESSING } : q));

      try {
        // Ensure extension matches current settings at time of processing
        const extension = settings.format === OutputFormat.DOC ? 'doc' : 'txt';
        const convertedName = item.file.name.replace(/\.pdf$/i, `.${extension}`);

        // Call Local PDF Service
        const result = await convertPdfLocal(item.file, settings);

        setQueue(prev => prev.map(q => q.id === item.id ? {
          ...q,
          status: ConversionStatus.COMPLETED,
          resultContent: result,
          convertedName: convertedName
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 selection:bg-yellow-400 selection:text-black">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 text-black p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">PDFluye</h1>
          </div>
          <div className="text-sm text-zinc-400 font-medium">
            Procesamiento 100% Local
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-3xl font-bold text-white mb-2">Fluye de PDF a Texto sin límites</h2>
          <p className="text-zinc-400 max-w-2xl">
            Transforma documentos PDF a formatos editables instantáneamente en tu navegador.
            Privado, rápido y sin uso de IA.
          </p>
        </div>

        {/* Settings Area */}
        <SettingsPanel 
          settings={settings} 
          setSettings={setSettings} 
          disabled={isProcessing} 
        />

        {/* Upload Area */}
        <DropZone onFilesAdded={handleFilesAdded} disabled={isProcessing} />

        {/* Action Button */}
        {pendingCount > 0 && (
          <div className="mt-6 flex justify-end animate-fade-in">
            <button
              onClick={processQueue}
              disabled={isProcessing}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-bold shadow-lg shadow-yellow-400/20 transition-all
                ${isProcessing 
                  ? 'bg-yellow-600 text-yellow-200 cursor-wait' 
                  : 'bg-yellow-400 text-black hover:bg-yellow-300 hover:shadow-yellow-400/40 hover:-translate-y-0.5'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Convertir {pendingCount} Archivo{pendingCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}

        {/* Queue / Results */}
        <QueueList 
          items={queue} 
          onRemove={handleRemoveItem} 
          format={settings.format}
        />
      </main>
    </div>
  );
};

export default App;