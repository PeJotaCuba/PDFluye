export enum ConversionStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum OutputFormat {
  TXT = 'txt',
  DOC = 'docx', 
  XLS = 'xlsx',
  PPT = 'pptx'
}

export type Language = 'es' | 'en' | 'pt';
export type StorageLocation = 'local' | 'drive';

export interface FileQueueItem {
  id: string;
  file: File;
  status: ConversionStatus;
  resultContent?: any; // Can be string, Blob, or Buffer depending on library
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

// Global declaration for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemDirectoryHandle {
    getFileHandle(name: string, options?: { create: boolean }): Promise<FileSystemFileHandle>;
  }
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }
  interface FileSystemWritableFileStream {
    write(data: any): Promise<void>;
    close(): Promise<void>;
  }
}