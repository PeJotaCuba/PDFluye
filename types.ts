export enum ConversionStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum OutputFormat {
  TXT = 'txt',
  DOC = 'doc', 
}

export type Language = 'es' | 'en' | 'pt';
export type StorageLocation = 'local' | 'drive';

export interface FileQueueItem {
  id: string;
  file: File;
  status: ConversionStatus;
  resultContent?: string;
  errorMessage?: string;
  convertedName: string;
  timestamp: number;
}

export interface ConversionSettings {
  format: OutputFormat;
}

export interface GlobalSettings {
  language: Language;
  destination: StorageLocation;
}