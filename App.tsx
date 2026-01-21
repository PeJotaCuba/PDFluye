import React, { useState, useCallback } from 'react';
import DropZone from './components/DropZone';
import SettingsPanel from './components/SettingsPanel';
import QueueList from './components/QueueList';
import { FileQueueItem, ConversionStatus, OutputFormat, ConversionSettings, GlobalSettings } from './types';
import { generateId, downloadFile } from './utils/fileHelpers';
import { convertPdfLocal } from './services/pdfService';

// Translation Dictionary
const translations = {
  es: {
    title: 'PDFluye',
    subtitle: 'Procesamiento 100% Local',
    heroTitle: 'Fluye de PDF a Todo sin límites',
    heroDesc: 'Transforma documentos PDF a formatos editables (Word, Excel, PowerPoint) en tu dispositivo.',
    convert: 'Convertir',
    files: 'Archivo(s)',
    settings: 'Ajustes',
    lang: 'Idioma',
    dest: 'Carpeta de Salida',
    processing: 'Procesando',
    clickToUpload: 'Haz clic para subir',
    orDrag: 'o arrastra tus archivos aquí',
    onlyPdf: 'Solo archivos PDF',
    alertPdf: 'Por favor, sube solo archivos PDF.',
    queue: 'Cola de Archivos',
    clear: 'Limpiar Todo',
    download: 'Descargar',
    delete: 'Eliminar',
    completed: 'Completado',
    error: 'Error',
    stgsTitle: 'Configuración de Conversión',
    stgsFormat: 'Formato de Salida',
    fmtTxt: 'Texto (.txt)',
    fmtDoc: 'Word (.docx)',
    fmtXls: 'Excel (.xlsx)',
    fmtPpt: 'PowerPoint (.pptx)',
    local: 'Local',
    drive: 'Google Drive',
    driveAuth: 'Autenticación con Google Drive',
    driveMsg: 'Esto abriría el selector de cuentas de Google para elegir tu carpeta de Drive. (Simulación: Requiere API Key configurada).'
  },
  en: {
    title: 'PDFluye',
    subtitle: '100% Local Processing',
    heroTitle: 'Flow from PDF to Everything',
    heroDesc: 'Transform PDF documents into editable formats (Word, Excel, PowerPoint) on your device.',
    convert: 'Convert',
    files: 'File(s)',
    settings: 'Settings',
    lang: 'Language',
    dest: 'Output Folder',
    processing: 'Processing',
    clickToUpload: 'Click to upload',
    orDrag: 'or drag your files here',
    onlyPdf: 'PDF files only',
    alertPdf: 'Please upload only PDF files.',
    queue: 'File Queue',
    clear: 'Clear All',
    download: 'Download',
    delete: 'Delete',
    completed: 'Completed',
    error: 'Error',
    stgsTitle: 'Conversion Settings',
    stgsFormat: 'Output Format',
    fmtTxt: 'Text (.txt)',
    fmtDoc: 'Word (.docx)',
    fmtXls: 'Excel (.xlsx)',
    fmtPpt: 'PowerPoint (.pptx)',
    local: 'Local',
    drive: 'Google Drive',
    driveAuth: 'Google Drive Authentication',
    driveMsg: 'This would open the Google account picker to select your Drive folder. (Simulation: Requires Configured API Key).'
  },
  pt: {
    title: 'PDFluye',
    subtitle: 'Processamento 100% Local',
    heroTitle: 'Flui de PDF para Tudo',
    heroDesc: 'Transforme documentos PDF em formatos editáveis (Word, Excel, PowerPoint) no seu dispositivo.',
    convert: 'Converter',
    files: 'Arquivo(s)',
    settings: 'Configurações',
    lang: 'Idioma',
    dest: 'Pasta de Saída',
    processing: 'Processando',
    clickToUpload: 'Clique para enviar',
    orDrag: 'ou arraste seus arquivos',
    onlyPdf: 'Apenas arquivos PDF',
    alertPdf: 'Por favor, envie apenas arquivos PDF.',
    queue: 'Fila de Arquivos',
    clear: 'Limpar Tudo',
    download: 'Baixar',
    delete: 'Excluir',
    completed: 'Concluído',
    error: 'Erro',
    stgsTitle: 'Configuração de Conversão',
    stgsFormat: 'Formato de Saída',
    fmtTxt: 'Texto (.txt)',
    fmtDoc: 'Word (.docx)',
    fmtXls: 'Excel (.xlsx)',
    fmtPpt: 'PowerPoint (.pptx)',
    local: 'Local',
    drive: 'Google Drive',
    driveAuth: 'Autenticação Google Drive',
    driveMsg: 'Isso abriria o seletor de contas do Google para escolher sua pasta do Drive. (Simulação: Requer API Key configurada).'
  }
};

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

  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const t = translations[globalSettings.language];

  // Logic for selecting local folder
  const handleLocalFolderSelect = async () => {
      setGlobalSettings(prev => ({ ...prev, destination: 'local' }));
      if ('showDirectoryPicker' in window) {
          try {
              const handle = await window.showDirectoryPicker();
              setDirectoryHandle(handle);
          } catch (e) {
              console.log("User cancelled folder selection");
          }
      } else {
          alert("Tu navegador no soporta selección de carpetas avanzada. Los archivos se guardarán en Descargas.");
      }
  };

  // Logic for Drive (Simulation)
  const handleDriveSelect = () => {
      setGlobalSettings(prev => ({ ...prev, destination: 'drive' }));
      // Simulate Auth Flow
      setTimeout(() => {
          alert(`${t.driveAuth}\n\n${t.driveMsg}`);
      }, 300);
      setDirectoryHandle(null); // Reset local handle
  };

  const handleFilesAdded = useCallback((files: File[]) => {
    const newItems: FileQueueItem[] = files.map(file => ({
      id: generateId(),
      file,
      status: ConversionStatus.IDLE,
      convertedName: file.name.replace(/\.pdf$/i, `.${settings.format}`),
      timestamp: Date.now()
    }));
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
    const itemsToProcess = queue.filter(item => item.status === ConversionStatus.IDLE);
    
    for (const item of itemsToProcess) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: ConversionStatus.PROCESSING } : q));

      try {
        const ext = settings.format; // txt, docx, xlsx, pptx
        const convertedName = item.file.name.replace(/\.pdf$/i, `.${ext}`);

        const result = await convertPdfLocal(item.file, settings);

        // Auto-save if directory handle exists
        if (directoryHandle) {
             await downloadFile(convertedName, result, settings.format, directoryHandle);
        }

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
                    <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-40 p-4 animate-fade-in">
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
                                        onClick={handleLocalFolderSelect}
                                        className={`p-2 text-xs rounded-lg border font-medium flex items-center justify-center gap-1 ${globalSettings.destination === 'local' ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}
                                    >
                                        {directoryHandle ? '✓' : ''} {t.local}
                                    </button>
                                    <button 
                                        onClick={handleDriveSelect}
                                        className={`p-2 text-xs rounded-lg border font-medium ${globalSettings.destination === 'drive' ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}
                                    >
                                        {t.drive}
                                    </button>
                                </div>
                                {directoryHandle && (
                                    <p className="mt-2 text-[10px] text-green-400 truncate">
                                        Carpeta seleccionada: {directoryHandle.name}
                                    </p>
                                )}
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
          texts={{
              title: t.stgsTitle,
              format: t.stgsFormat,
              formats: {
                  txt: t.fmtTxt,
                  doc: t.fmtDoc,
                  xls: t.fmtXls,
                  ppt: t.fmtPpt
              }
          }}
        />

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
          texts={{
              queue: t.queue,
              clear: t.clear,
              download: t.download,
              delete: t.delete,
              processing: t.processing,
              completed: t.completed,
              error: t.error
          }}
          directoryHandle={directoryHandle}
        />
      </main>
    </div>
  );
};

export default App;