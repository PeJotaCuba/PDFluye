import { OutputFormat } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const downloadFile = async (filename: string, content: string | Blob, format: OutputFormat) => {
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else {
    blob = new Blob([content], { 
      type: format === OutputFormat.PDF ? 'application/pdf' : 'text/plain;charset=utf-8' 
    });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Use a delay for URL revocation. Immediate revocation often aborts download in some modern browsers, 
  // especially when triggering multiple downloads sequentially.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 12000);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};