import { OutputFormat } from '../types';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hasEOL: boolean;
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
    
    let fullOutput = '';
    
    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better coordinate precision
      const textContent = await page.getTextContent();
      
      const items: TextItem[] = textContent.items.map((item: any) => {
        // PDF coordinates: (0,0) is bottom-left. We convert to top-left for easier logic.
        const tx = item.transform;
        const x = tx[4];
        const y = viewport.height - tx[5]; // Flip Y
        return {
          str: item.str,
          x: x,
          y: y,
          w: item.width,
          h: item.height,
          hasEOL: item.hasEOL
        };
      });

      // Sort items: First by Y (top to bottom), then by X (left to right)
      // Allow a small error margin for Y to group items on the "same line"
      items.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 5) {
          return a.x - b.x;
        }
        return a.y - b.y;
      });

      let pageHtml = '';
      let pageText = '';
      let lastY = -1;
      let lastX = -1;

      // Simple heuristic to reconstruct layout
      items.forEach((item) => {
        if (lastY !== -1 && Math.abs(item.y - lastY) > 8) {
          // New Line
          if (settings.format === OutputFormat.DOC) {
            pageHtml += '<br>'; 
          } else {
            pageText += '\n';
          }
          lastX = -1; 
        }

        // Detect large gaps (simulating tabs/columns)
        if (lastX !== -1 && (item.x - lastX) > 20) {
           if (settings.format === OutputFormat.DOC) {
             // Use non-breaking spaces or a span with margin for DOC visual fidelity
             pageHtml += '&nbsp;&nbsp;&nbsp;&nbsp;'; 
           } else {
             pageText += '\t';
           }
        } else if (lastX !== -1) {
           // Small gap, just a space
           if (settings.format === OutputFormat.DOC) pageHtml += ' ';
           else pageText += ' ';
        }

        if (settings.format === OutputFormat.DOC) {
           pageHtml += item.str;
        } else {
           pageText += item.str;
        }

        lastY = item.y;
        lastX = item.x + item.w;
      });

      if (settings.format === OutputFormat.DOC) {
        // Wrap page content in a div to simulate a page break if needed later
        fullOutput += `<div style="page-break-after: always; margin-bottom: 2rem;">${pageHtml}</div>`;
      } else {
        fullOutput += pageText + '\n\n-------------------\n\n';
      }
    }

    return fullOutput;

  } catch (error) {
    console.error("Error converting PDF locally:", error);
    throw new Error("No se pudo leer el archivo PDF. Asegúrate de que no esté corrupto o protegido con contraseña.");
  }
};