import { OutputFormat } from '../types';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const convertPdfLocal = async (
  file: File, 
  settings: { format: OutputFormat }
): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF file
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Basic text extraction logic to reconstruct lines
      let lastY = -1;
      let pageText = '';
      
      for (const item of textContent.items) {
         const itemY = item.transform[5]; // The y coordinate of the text
         const itemStr = item.str;
         
         if (lastY !== -1 && Math.abs(itemY - lastY) > 5) {
            // Significant vertical difference implies new line
            pageText += '\n' + itemStr;
         } else {
            // Same line, append with space if needed
            pageText += (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n') ? ' ' : '') + itemStr;
         }
         lastY = itemY;
      }
      
      fullText += pageText + '\n\n';
    }

    const cleanText = fullText.trim();

    // Formatting logic based on OutputFormat
    if (settings.format === OutputFormat.DOC) {
      // Simple HTML wrapper for Word
      // We treat double newlines as paragraphs to create structure
      const paragraphs = cleanText.split(/\n\s*\n/);
      const htmlBody = paragraphs
        .map(p => {
            const cleanP = p.trim();
            return cleanP ? `<p>${cleanP.replace(/\n/g, '<br>')}</p>` : '';
        })
        .join('');
        
      return htmlBody;
    }

    return cleanText;
  } catch (error) {
    console.error("Error converting PDF locally:", error);
    throw new Error("No se pudo leer el archivo PDF. Asegúrate de que no esté corrupto o protegido con contraseña.");
  }
};