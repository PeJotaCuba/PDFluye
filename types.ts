export enum ConversionStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum OutputFormat {
  TXT = 'txt',
  DOC = 'doc', // We will generate HTML and save as .doc for Word compatibility
}

export interface FileQueueItem {
  id: string;
  file: File;
  status: ConversionStatus;
  resultContent?: string;
  errorMessage?: string;
  convertedName: string;
}

export interface ConversionSettings {
  format: OutputFormat;
}