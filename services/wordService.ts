import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const convertWordToPdfLocal = async (file: File): Promise<Blob> => {
  const container = document.createElement('div');
  const style = document.createElement('style');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const filename = file.name.toLowerCase();
    
    // Only support .docx as requested
    if (!filename.endsWith('.docx')) {
      throw new Error("Formato de archivo no soportado. Por favor, sube un archivo en formato .docx.");
    }
    
    // Convert docx directly to HTML keeping underlying structures
    const result = await mammoth.convertToHtml(
      { arrayBuffer }, 
      { 
        styleMap: [
          "u => u",
          "strike => del",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "b => strong",
          "i => em"
        ] 
      }
    );
    
    const htmlContent = result.value;
    
    if (!htmlContent || htmlContent.trim() === "") {
      throw new Error("No se pudo extraer texto legible o estructura del documento .docx.");
    }
    
    // Create temporary absolute container positioned under current app layers to avoid flicker.
    container.id = 'pdf-render-temp-container';
    container.style.position = 'absolute';
    container.style.top = '0px';
    container.style.left = '0px';
    container.style.width = '794px'; 
    container.style.background = '#f3f4f6'; // neutral backdrop for pages
    container.style.zIndex = '-9999'; // Rendered underneath the opaque bg of the App
    container.style.opacity = '1';
    
    // Attach clean stylesheet
    style.id = 'pdf-render-temp-styles';
    style.innerHTML = `
      .pdf-page {
        width: 794px;
        height: 1123px; /* standard A4 golden ratio height */
        padding: 60px 45px 60px 45px; /* Clean 60px vertical margin, 45px lateral */
        background: #ffffff;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        margin-bottom: 20px;
      }
      .pdf-content-area {
        width: 100%;
        height: 1003px; /* 1123px - 60px top - 60px bottom */
        box-sizing: border-box;
        display: block;
        overflow: hidden;
      }
      
      .pdf-content-area h1, 
      .pdf-content-area h2, 
      .pdf-content-area h3, 
      .pdf-content-area h4 {
        color: #000000;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 700;
        margin-top: 0.85em;
        margin-bottom: 0.4em;
        line-height: 1.25;
      }
      .pdf-content-area h1 { font-size: 19pt; border-bottom: 1.2px solid #b0b0b0; padding-bottom: 0.25em; }
      .pdf-content-area h2 { font-size: 16pt; }
      .pdf-content-area h3 { font-size: 14pt; }
      .pdf-content-area h4 { font-size: 12.5pt; }
      
      .pdf-content-area p {
        margin-top: 0;
        margin-bottom: 0.85em;
        text-align: left; /* Left align is much more legible and natural for radio announcement scripts */
        line-height: 1.55;
        font-size: 12.5pt; /* Large readable size requested by speaker */
        color: #000000;
      }
      
      .pdf-content-area p.pdf-paragraph-cue {
        padding-left: 130px !important;
        text-indent: -130px !important;
        margin-bottom: 0.85em !important;
      }
      
      .pdf-content-area p.pdf-paragraph-dialogue {
        padding-left: 130px !important;
        margin-bottom: 0.85em !important;
      }
      
      .pdf-content-area strong, 
      .pdf-content-area b {
        font-weight: 700 !important;
      }
      
      .pdf-content-area em, 
      .pdf-content-area i {
        font-style: italic !important;
      }
      
      .pdf-content-area u {
        text-decoration: underline !important;
        text-underline-offset: 3px !important;
      }
      
      .pdf-content-area ul {
        list-style-type: disc !important;
        margin-left: 24px !important;
        margin-top: 0 !important;
        margin-bottom: 0.85em !important;
        padding-left: 0 !important;
      }
      
      .pdf-content-area ol {
        list-style-type: decimal !important;
        margin-left: 24px !important;
        margin-top: 0 !important;
        margin-bottom: 0.85em !important;
        padding-left: 0 !important;
      }
      
      .pdf-content-area li {
        margin-bottom: 0.35em !important;
        padding-left: 4px !important;
        display: list-item !important;
        list-style-position: outside !important;
        font-size: 12.5pt;
        line-height: 1.55;
        color: #000000;
      }
      
      .pdf-content-area table {
        width: 100% !important;
        margin-top: 0.8em !important;
        margin-bottom: 0.8em !important;
        border-collapse: collapse !important;
        font-size: 11.5pt !important;
        color: #000000;
      }
      
      .pdf-content-area th, 
      .pdf-content-area td {
        border: 1px solid #777777 !important;
        padding: 6px 10px !important;
        text-align: left !important;
      }
      
      .pdf-content-area th {
        background-color: #f0f0f0 !important;
        font-weight: bold !important;
      }
      
      .pdf-content-area blockquote {
        border-left: 3.5px solid #a0a0a0 !important;
        padding-left: 15px !important;
        color: #444444 !important;
        margin: 1em 0 !important;
        font-style: italic !important;
      }
    `;
    
    document.body.appendChild(container);
    document.body.appendChild(style);
    
    // Parse source elements
    const sourceDiv = document.createElement('div');
    sourceDiv.innerHTML = htmlContent;
    
    // Pre-filtering empty spacing paragraphs at the roots
    const children = (Array.from(sourceDiv.children) as HTMLElement[]).filter(child => {
      if (['UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'HR', 'IMG'].includes(child.tagName)) {
        return true;
      }
      const text = child.textContent?.trim() || '';
      const hasChildren = child.children.length > 0;
      return text !== '' || hasChildren;
    });
    
    // Detect if this is a script document (contains speaker cues like '11 JOHAN:')
    const cueRegex = /^\s*(?:[IVXLCDM\d]+[.\-]*\s+)?\s*[A-ZÁÉÍÓÚÑ0-9_.\-\s]{2,25}\s*:/;
    const isScript = children.some(child => {
      if (child.tagName === 'P') {
        const text = child.textContent?.trim() || '';
        return cueRegex.test(text);
      }
      return false;
    });

    if (isScript) {
      children.forEach(child => {
        if (child.tagName === 'P') {
          const text = child.textContent?.trim() || '';
          if (cueRegex.test(text)) {
            child.classList.add('pdf-paragraph-cue');
          } else {
            child.classList.add('pdf-paragraph-dialogue');
          }
        }
      });
    }
    
    const pages: HTMLDivElement[] = [];
    const maxContentHeight = 1003; // 1123 - 60 (top) - 60 (bottom)
    
    const createNewPage = (): { page: HTMLDivElement, contentArea: HTMLDivElement } => {
      const page = document.createElement('div');
      page.className = 'pdf-page';
      
      const contentArea = document.createElement('div');
      contentArea.className = 'pdf-content-area';
      
      page.appendChild(contentArea);
      container.appendChild(page);
      pages.push(page);
      
      return { page, contentArea };
    };
    
    let { page: currentPage, contentArea: currentContentArea } = createNewPage();
    
    for (const child of children) {
      if (child.tagName === 'UL' || child.tagName === 'OL') {
        const listTagName = child.tagName;
        const listStyleAttr = child.getAttribute('style') || '';
        
        let currentList = document.createElement(listTagName);
        if (listStyleAttr) currentList.setAttribute('style', listStyleAttr);
        currentContentArea.appendChild(currentList);
        
        const listItems = Array.from(child.children) as HTMLElement[];
        for (const li of listItems) {
          const cloneLi = li.cloneNode(true) as HTMLElement;
          currentList.appendChild(cloneLi);
          
          // Check if appending this list item overflowed the available space
          if (currentContentArea.scrollHeight > maxContentHeight) {
            const isOnlyItemOnEmptyPage = (currentContentArea.children.length === 1 && currentList.children.length === 1);
            
            if (!isOnlyItemOnEmptyPage) {
              // Overflowed. Roll back on current list.
              currentList.removeChild(cloneLi);
              if (currentList.children.length === 0) {
                currentContentArea.removeChild(currentList);
              }
              
              // Transition to a new page
              const next = createNewPage();
              currentPage = next.page;
              currentContentArea = next.contentArea;
              
              // Create brand new list element
              currentList = document.createElement(listTagName);
              if (listStyleAttr) currentList.setAttribute('style', listStyleAttr);
              currentContentArea.appendChild(currentList);
              currentList.appendChild(cloneLi);
            }
          }
        }
      } else {
        const cloneChild = child.cloneNode(true) as HTMLElement;
        currentContentArea.appendChild(cloneChild);
        
        if (currentContentArea.scrollHeight > maxContentHeight) {
          // If the page already has content, transition it cleanly to the next page.
          if (currentContentArea.children.length > 1) {
            currentContentArea.removeChild(cloneChild);
            
            const next = createNewPage();
            currentPage = next.page;
            currentContentArea = next.contentArea;
            currentContentArea.appendChild(cloneChild);
          }
        }
      }
    }
    
    // Wait for the browser layout engine to paint and stabilize
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate the PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    
    const pdfWidth = 595.28;
    const pdfHeight = 841.89;
    
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      
      const pageElement = pages[i];
      const canvas = await html2canvas(pageElement, {
        scale: 3.0, // Ultra-sharp rendered text (ideal for vocal announcer scripting)
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      pdf.addImage(
        imgData,
        'PNG',
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        'FAST'
      );
    }
    
    return pdf.output('blob');
  } catch (error) {
    console.error("Error converting Word to PDF:", error);
    throw error;
  } finally {
    // ALWAYS clean up offscreen DOM elements to prevent memory leaks and screen footprint clutter!
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    if (style && style.parentNode) {
      document.body.removeChild(style);
    }
  }
};
