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

export const downloadFile = (filename: string, content: string, format: OutputFormat) => {
  let mimeType = 'text/plain';
  let finalContent = content;

  if (format === OutputFormat.DOC) {
    mimeType = 'application/msword';
    // XML Header to force "Print Layout" (Diseño de Impresión) in MS Word
    const wordHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Document</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; }
          p { margin: 0; padding: 0; }
          table { border-collapse: collapse; width: 100%; }
          td { border: 1px solid #ddd; padding: 8px; }
        </style>
      </head>
      <body>
    `;
    const wordFooter = `</body></html>`;
    
    // We assume content is pre-formatted HTML from pdfService
    finalContent = wordHeader + content + wordFooter;
  }

  const blob = new Blob([finalContent], { type: mimeType });
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

export const shareContent = async (platform: 'whatsapp' | 'telegram' | 'email', text: string, filename: string) => {
  // Note: Web Share API generally doesn't support sharing File objects to specific apps directly via URL schemes
  // We will share a message or the text content.
  
  const message = `Aquí tienes el archivo convertido: ${filename}`;
  const encodedMsg = encodeURIComponent(message);
  
  if (platform === 'whatsapp') {
    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
  } else if (platform === 'telegram') {
    window.open(`https://t.me/share/url?url=${encodedMsg}&text=${encodedMsg}`, '_blank');
  } else if (platform === 'email') {
    window.open(`mailto:?subject=Archivo PDFluye: ${filename}&body=${encodedMsg}`, '_blank');
  }
};