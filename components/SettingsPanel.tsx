import React from 'react';
import { ConversionSettings, OutputFormat } from '../types';

interface SettingsPanelProps {
  settings: ConversionSettings;
  setSettings: React.Dispatch<React.SetStateAction<ConversionSettings>>;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, disabled }) => {
  
  const handleFormatChange = (format: OutputFormat) => {
    setSettings(prev => ({ ...prev, format }));
  };

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg shadow-black/20 border border-zinc-800 p-6 mb-6">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        Configuración de Conversión
      </h2>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-3">Formato de Salida</label>
        <div className="flex gap-4">
          <button
            onClick={() => handleFormatChange(OutputFormat.TXT)}
            disabled={disabled}
            className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
              settings.format === OutputFormat.TXT
                ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                : 'border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            <span className="font-semibold">Texto (.txt)</span>
          </button>

          <button
            onClick={() => handleFormatChange(OutputFormat.DOC)}
            disabled={disabled}
            className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
              settings.format === OutputFormat.DOC
                ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                : 'border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M14 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            <span className="font-semibold">Word (.doc)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;