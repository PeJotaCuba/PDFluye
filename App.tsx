import React, { useState, useCallback } from 'react';
import DropZone from './components/DropZone';
import SettingsPanel from './components/SettingsPanel';
import QueueList from './components/QueueList';
import { FileQueueItem, ConversionStatus, OutputFormat, ConversionSettings } from './types';
import { generateId, fileToBase64 } from './utils/fileHelpers';
import { convertPdfContent } from './services/geminiService';

const App: React.FC = () => {
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: OutputFormat.TXT,
    instructions: '',
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
    
    // We process sequentially to avoid hitting rate limits easily, 
    // although Promise.all could be used for parallel processing if limits allow.
    const itemsToProcess = queue.filter(item => item.status === ConversionStatus.IDLE);
    
    for (const item of itemsToProcess) {
      // Update status to processing
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: ConversionStatus.PROCESSING } : q));

      try {
        const base64 = await fileToBase64(item.file);
        
        // Ensure extension matches current settings at time of processing
        const extension = settings.format === OutputFormat.DOC ? 'doc' : 'txt';
        const convertedName = item.file.name.replace(/\.pdf$/i, `.${extension}`);

        const result = await convertPdfContent(base64, settings);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">DocuFlow</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Powered by Gemini
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Conversor de PDF con IA</h2>
          <p className="text-slate-600 max-w-2xl">
            Convierte tus documentos PDF a texto editable o Word manteniendo la estructura. 
            Personaliza el resultado con instrucciones naturales.
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
                flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-lg shadow-indigo-200 transition-all
                ${isProcessing 
                  ? 'bg-indigo-400 cursor-wait' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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