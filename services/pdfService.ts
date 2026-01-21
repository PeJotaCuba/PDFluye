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
  file: File
): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF file
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";

    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      
      const items: TextItem[] = textContent.items.map((item: any) => {
        const tx = item.transform;
        // Normalize coordinates: (0,0) at top-left
        return {
          str: item.str,
          x: tx[4],
          y: viewport.height - tx[5], // Flip Y
          w: item.width,
          h: item.height,
          hasEOL: item.hasEOL
        };
      });

      // Group items by line (Y coordinate)
      // We use a Map where key is the rounded Y coordinate to group text on the "same line"
      const lines = new Map<number, TextItem[]>();
      const yTolerance = 4; // Pixels of tolerance to consider items on the same line

      items.forEach(item => {
        let foundLineY = -1;
        // Check if a line exists within tolerance
        for (const y of lines.keys()) {
          if (Math.abs(y - item.y) < yTolerance) {
            foundLineY = y;
            break;
          }
        }

        if (foundLineY !== -1) {
          lines.get(foundLineY)?.push(item);
        } else {
          lines.set(item.y, [item]);
        }
      });

      // Sort lines by Y (top to bottom)
      const sortedY = Array.from(lines.keys()).sort((a, b) => a - b);

      let pageText = "";
      sortedY.forEach(y => {
        const lineItems = lines.get(y);
        if (!lineItems) return;

        // Sort items in line by X (left to right)
        lineItems.sort((a, b) => a.x - b.x);

        // Join items with logic for spacing
        let lineStr = "";
        let lastXEnd = 0;

        lineItems.forEach((item, index) => {
          // If there is a significant gap between previous item end and current item start, add space
          if (index > 0 && item.x - lastXEnd > 4) { // 4px gap threshold
             lineStr += " ";
          }
          lineStr += item.str;
          lastXEnd = item.x + item.w;
        });

        pageText += lineStr + "\n";
      });
      
      fullText += pageText + "\n";
    }

    return fullText.trim();

  } catch (error) {
    console.error("Error converting PDF locally:", error);
    throw new Error("No se pudo leer el archivo PDF. Asegúrate de que no esté corrupto.");
  }
};