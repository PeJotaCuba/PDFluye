import { OutputFormat } from '../types';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

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
): Promise<any> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF file
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Extraction container
    const pagesContent: TextItem[][] = [];

    // Extract all text first
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      
      const items: TextItem[] = textContent.items.map((item: any) => {
        const tx = item.transform;
        // Normalize coordinates
        return {
          str: item.str,
          x: tx[4],
          y: viewport.height - tx[5], // Flip Y
          w: item.width,
          h: item.height,
          hasEOL: item.hasEOL
        };
      });
      pagesContent.push(items);
    }

    // Switch strategy based on format
    switch (settings.format) {
      case OutputFormat.DOC:
        return await generateDocx(pagesContent);
      case OutputFormat.XLS:
        return await generateXlsx(pagesContent);
      case OutputFormat.PPT:
        return await generatePptx(pagesContent);
      case OutputFormat.TXT:
      default:
        return generateTxt(pagesContent);
    }

  } catch (error) {
    console.error("Error converting PDF locally:", error);
    throw new Error("No se pudo leer el archivo PDF. Intenta con otro formato o archivo.");
  }
};

// --- Generators ---

const generateTxt = (pages: TextItem[][]): string => {
  let fullText = "";
  pages.forEach(items => {
    // Sort items by Y then X
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
      return a.y - b.y;
    });

    let lastY = -1;
    items.forEach(item => {
      if (lastY !== -1 && Math.abs(item.y - lastY) > 10) fullText += "\n";
      fullText += item.str + " ";
      lastY = item.y;
    });
    fullText += "\n\n-------------------\n\n";
  });
  return fullText;
};

const generateDocx = async (pages: TextItem[][]): Promise<Blob> => {
  const sections = [];

  for (const items of pages) {
    // Basic sorting
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
      return a.y - b.y;
    });

    const paragraphs: Paragraph[] = [];
    let currentLine: TextRun[] = [];
    let lastY = -1;

    items.forEach(item => {
        // Simple Heuristic: New paragraph if Y difference is large
        if (lastY !== -1 && Math.abs(item.y - lastY) > 12) {
             if (currentLine.length > 0) {
                 paragraphs.push(new Paragraph({ children: currentLine }));
                 currentLine = [];
             }
        }
        
        currentLine.push(new TextRun({ text: item.str + " " }));
        lastY = item.y;
    });
    
    if (currentLine.length > 0) {
        paragraphs.push(new Paragraph({ children: currentLine }));
    }

    // Add page break logic if needed, or separate sections per page
    sections.push({
        properties: {},
        children: paragraphs,
    });
  }

  const doc = new Document({
    sections: sections
  });

  return await Packer.toBlob(doc);
};

const generateXlsx = (pages: TextItem[][]): Blob => {
  const wb = XLSX.utils.book_new();
  
  pages.forEach((items, index) => {
    // Sort
    items.sort((a, b) => {
       if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
       return a.y - b.y;
    });

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let lastY = -1;
    
    items.forEach(item => {
        if (lastY !== -1 && Math.abs(item.y - lastY) > 10) {
            rows.push(currentRow);
            currentRow = [];
        }
        // Very basic column separation logic
        currentRow.push(item.str);
        lastY = item.y;
    });
    if (currentRow.length > 0) rows.push(currentRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `Page ${index + 1}`);
  });

  // Write to buffer then blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/octet-stream' });
};

const generatePptx = async (pages: TextItem[][]): Promise<Blob> => {
  const pres = new PptxGenJS();
  
  pages.forEach(items => {
     const slide = pres.addSlide();
     
     items.forEach(item => {
        // Convert coords (PDF points usually 72dpi) to Inches
        // PPTXGenJS uses inches by default or percentage.
        // Assuming Standard PDF page ~600x800 pts. 
        // Heuristic conversion: 1 pt = 0.0138 inch. 
        const x = item.x * 0.0138;
        const y = item.y * 0.0138;
        const w = Math.max(item.w * 0.0138, 1); 
        const h = Math.max(item.h * 0.0138, 0.3);

        slide.addText(item.str, { 
            x: x, 
            y: y, 
            w: w,
            h: h,
            fontSize: 11,
            color: '000000'
        });
     });
  });

  return await pres.write("blob") as Blob; 
};