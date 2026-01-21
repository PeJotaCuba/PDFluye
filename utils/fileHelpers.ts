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

export const downloadFile = async (filename: string, content: any, format: OutputFormat, directoryHandle?: FileSystemDirectoryHandle | null) => {
  
  let blob: Blob;

  // content is already a Blob for DOC, XLS, PPT from our new service
  if (content instanceof Blob) {
      blob = content;
  } else {
      // It's a string (TXT)
      blob = new Blob([content], { type: 'text/plain' });
  }

  // If we have a directory handle (Local Folder selected), write directly
  if (directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // Saved silently
    } catch (err) {
      console.error("Failed to write to local folder, falling back to download", err);
    }
  }

  // Fallback: Browser Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};