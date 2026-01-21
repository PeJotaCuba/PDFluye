import React, { useState, useCallback } from 'react';
import DropZone from './components/DropZone';
import SettingsPanel from './components/SettingsPanel';
import QueueList from './components/QueueList';
import { FileQueueItem, ConversionStatus, OutputFormat, ConversionSettings, GlobalSettings } from './types';
import { generateId } from './utils/fileHelpers';
import { convertPdfLocal } from './services/pdfService';

const App: React.FC = () => {
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: OutputFormat.TXT,
  });
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    language: 'es',
    destination: 'local'
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Translations
  const t = {
    title: 'PDFluye',
    subtitle: globalSettings.language === 'pt' ? 'Processamento Local 100%' : globalSettings.language === 'en' ? '100% Local Processing' : 'Procesamiento 100% Local',
    heroTitle: globalSettings.language === 'pt' ? 'Flui de PDF para Texto' : globalSettings.language === 'en' ? 'Flow from PDF to Text' : 'Fluye de PDF a Texto sin límites',
    heroDesc: globalSettings.language === 'pt' ? 'Transforme PDFs em formatos editáveis instantaneamente no seu navegador. Privado, rápido e sem IA.' : globalSettings.language === 'en' ? 'Instantly transform PDFs into editable formats in your browser. Private, fast, and no AI.' : 'Transforma documentos PDF a formatos editables instantáneamente en tu navegador. Privado, rápido y sin uso de IA.',
    convert: globalSettings.language === 'pt' ? 'Converter' : globalSettings.language === 'en' ? 'Convert' : 'Convertir',
    files: globalSettings.language === 'pt' ? 'Arquivo(s)' : globalSettings.language === 'en' ? 'File(s)' : 'Archivo',
    settings: globalSettings.language === 'pt' ? 'Configurações' : globalSettings.language === 'en' ? 'Settings' : 'Ajustes',
    lang: globalSettings.language === 'pt' ? 'Idioma' : globalSettings.language === 'en' ? 'Language' : 'Idioma',
    dest: globalSettings.language === 'pt' ? 'Pasta de Saída' : globalSettings.language === 'en' ? 'Output Folder' : 'Carpeta de Salida',
    processing: globalSettings.language === 'pt' ? 'Processando' : globalSettings.language === 'en' ? 'Processing' : 'Procesando',
  };

  const handleFilesAdded = useCallback((files: File[]) => {
    const newItems: FileQueueItem[] = files.map(file => ({
      id: generateId(),
      file,
      status: ConversionStatus.IDLE,
      convertedName: file.name.replace('.pdf', `.${settings.format}`),
      timestamp: Date.now()
    }));
    // Newest files first (prepend)
    setQueue(prev => [...newItems, ...prev]);
  }, [settings.format]);

  const handleRemoveItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setQueue([]);
  }, []);

  const processQueue = async () => {
    setIsProcessing(true);
    
    // Determine which items to process (usually from top down, or all idle)
    // Since we display newest first, we process queue naturally.
    const itemsToProcess = queue.filter(item => item.status === ConversionStatus.IDLE);
    
    for (const item of itemsToProcess) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: ConversionStatus.PROCESSING } : q));

      try {
        const extension = settings.format === OutputFormat.DOC ? 'doc' : 'txt';
        const convertedName = item.file.name.replace(/\.pdf$/i, `.${extension}`);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 selection:bg-yellow-400 selection:text-black font-inter">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 text-black p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{t.title}</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <span className="hidden sm:block text-sm text-zinc-500 font-medium">
                {t.subtitle}
             </span>
             
             {/* Settings Dropdown Trigger */}
             <div className="relative">
                <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                
                {isSettingsOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-40 p-4 animate-fade-in">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t.lang}</label>
                                <select 
                                    value={globalSettings.language}
                                    onChange={(e) => setGlobalSettings({...globalSettings, language: e.target.value as any})}
                                    className="w-full bg-zinc-800 text-white text-sm rounded-lg p-2 border border-zinc-700 focus:border-yellow-400 outline-none"
                                >
                                    <option value="es">Español</option>
                                    <option value="en">English</option>
                                    <option value="pt">Português</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t.dest}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setGlobalSettings({...globalSettings, destination: 'local'})}
                                        className={`p-2 text-xs rounded-lg border font-medium ${globalSettings.destination === 'local' ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}
                                    >
                                        Local
                                    </button>
                                    <button 
                                        onClick={() => setGlobalSettings({...globalSettings, destination: 'drive'})}
                                        className={`p-2 text-xs rounded-lg border font-medium ${globalSettings.destination === 'drive' ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}
                                    >
                                        Drive
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-3xl font-bold text-white mb-2">{t.heroTitle}</h2>
          <p className="text-zinc-400 max-w-2xl">
            {t.heroDesc}
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
                  {t.processing}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {t.convert} {pendingCount} {t.files}
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
          format={settings.format}
          language={globalSettings.language}
        />
      </main>
    </div>
  );
};

export default App;