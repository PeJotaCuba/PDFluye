export enum ConversionStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum OutputFormat {
  TXT = 'txt',
  DOC = 'doc',
  XLS = 'xls',
  PPT = 'ppt',
  PDF = 'pdf'
}

export interface FileQueueItem {
  id: string;
  file: File;
  status: ConversionStatus;
  resultContent?: string;
  resultBlob?: Blob;
  errorMessage?: string;
  convertedName: string;
  timestamp: number;
  type: 'pdf-to-txt' | 'docx-to-pdf';
}

export interface ConversionSettings {
  format: OutputFormat;
  instructions: string;
}

// Global declaration for File System Access API (Optional support kept in types but simplified usage)
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