import mammoth from 'mammoth';

// Standard title-casing and accent restoration dictionary for common fields/names
const accentRestore = (text: string): string => {
  if (!text) return "";
  
  const replacements: { [key: string]: string } = {
    "FILOSOFIA": "FILOSOFÍA",
    "PALIDA": "PÁLIDA",
    "OJALA": "OJALÁ",
    "MONTON": "MONTÓN",
    "COMO": "CÓMO",
    "RODRIGUEZ": "RODRÍGUEZ",
    "GONZALEZ": "GONZÁLEZ",
    "RONDON": "RONDÓN",
    "ESTADISTICAS": "ESTADÍSTICAS",
    "GEOGRAFICAS": "GEOGRÁFICAS",
    "GENERO": "GÉNERO",
    "GENEROS": "GÉNEROS",
    "INTERPRETE": "INTÉRPRETE",
    "INTERPRETES": "INTÉRPRETES",
    "MUSICA": "MÚSICA",
    "MUSICALES": "MUSICALES",
    "PROGRAMACION": "PROGRAMACIÓN",
    "JOSE": "JOSÉ",
    "RONDÓN": "RONDÓN",
    "ACUÑA": "ACUÑA"
  };

  let formatted = text;
  
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp('\\b' + key + '\\b', 'gi');
    formatted = formatted.replace(regex, (match) => {
      if (match === match.toUpperCase()) {
        return value.toUpperCase();
      }
      if (match.charAt(0) === match.charAt(0).toUpperCase()) {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return value.toLowerCase();
    });
  }
  
  return formatted;
};

// Formats nationality like "CUBA" or "cuba" to "Cuba"
const formatNac = (nac: string): string => {
  if (!nac) return "";
  const trimmed = nac.trim();
  if (trimmed.toLowerCase() === "cuba") return "Cuba";
  if (trimmed.length <= 4) {
    // short abbreviation or all uppercase
    return trimmed.toUpperCase();
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// Helper functions to clean and extract metadata safely without case/accent sensitivity
const cleanLower = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const extractMetadataNormalized = (text: string, termNormalized: string): string | null => {
  const normText = cleanLower(text);
  const index = normText.indexOf(termNormalized);
  if (index === -1) return null;
  
  let after = text.substring(index + termNormalized.length).trim();
  after = after.replace(/^[:\-\s'`,]+/, "").trim();
  if (after) {
    const segments = after.split(/[;\n]/);
    return segments[0].trim();
  }
  return null;
};

export const convertWordToTxtLocal = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const filename = file.name.toLowerCase();
    
    if (!filename.endsWith('.docx')) {
      throw new Error("Formato de archivo no soportado. Por favor, sube un archivo en formato .docx.");
    }
    
    // Convert docx directly to HTML structured tables using mammoth
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const htmlContent = result.value;
    
    if (!htmlContent || htmlContent.trim() === "") {
      throw new Error("No se pudo extraer texto legible o estructura del documento .docx.");
    }
    
    // Create temporary parser document
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    
    // State machine to partition rows into sections dynamically, supporting single giant table or multiple split tables robustly
    const sectionRows: {
      zonas: HTMLTableRowElement[];
      obras: HTMLTableRowElement[];
      autores: HTMLTableRowElement[];
      interpretes: HTMLTableRowElement[];
      generos: HTMLTableRowElement[];
    } = {
      zonas: [],
      obras: [],
      autores: [],
      interpretes: [],
      generos: []
    };

    let currentSection: "unknown" | "zonas" | "obras" | "autores" | "interpretes" | "generos" = "unknown";
    const allTableRows = Array.from(doc.querySelectorAll('tr'));
    
    for (const tr of allTableRows) {
      const rowTextWithSpaces = tr.textContent || "";
      const rowText = cleanLower(rowTextWithSpaces);
      const cells = Array.from(tr.querySelectorAll('td, th')).map(c => c.textContent?.trim() || "");
      const cellsLower = cells.map(c => cleanLower(c));
      
      // Triggers for transitioning between sections
      if (rowText.includes("zonas geograficas") || rowText.includes("obras, autores e interpretes") || cellsLower.some(c => c === "zonas" || c === "zona")) {
        currentSection = "zonas";
      } else if (rowText.includes("obras musicales mas") || rowText.includes("obras mas difundidas") || (cellsLower.some(c => c.includes("titulo") || c.includes("obra")) && cellsLower.some(c => c.includes("interprete")))) {
        currentSection = "obras";
      } else if (rowText.includes("autores mas") || rowText.includes("autores mas difundidos") || (cellsLower.some(c => c === "autores" || c === "autor") && cellsLower.some(c => c.includes("cant")))) {
        currentSection = "autores";
      } else if (rowText.includes("interpretes mas") || rowText.includes("intérpretes mas") || rowText.includes("interpretes mas difundidos") || (cellsLower.some(c => c.includes("interprete") || c.includes("interpretes")) && cellsLower.some(c => c.includes("cant")))) {
        currentSection = "interpretes";
      } else if (rowText.includes("generos") || rowText.includes("generos musicales") || rowText.includes("generos mas") || cellsLower.some(c => c.includes("genero") || c.includes("generos"))) {
        currentSection = "generos";
      }
      
      if (currentSection !== "unknown") {
        sectionRows[currentSection].push(tr);
      }
    }
    
    // 1. Scan doc for layout metadata (Emisora, Provincia, Año, Mes)
    const allTexts: string[] = [];
    doc.querySelectorAll('p, td, th').forEach(el => {
      const txt = el.textContent?.trim();
      if (txt) allTexts.push(txt);
    });
    
    let emisora = "";
    let provincia = "";
    let anio = "";
    let mes = "";
    let coordinador = "";
    let programacion = "";
    
    for (const text of allTexts) {
      if (!emisora) {
        const val = extractMetadataNormalized(text, "emisora");
        if (val) emisora = val;
      }
      if (!provincia) {
        const val = extractMetadataNormalized(text, "provincia");
        if (val) provincia = val;
      }
      if (!anio) {
        const val = extractMetadataNormalized(text, "ano");
        if (val) {
          const m = val.match(/\d{4}/);
          if (m) anio = m[0];
        }
      }
      if (!mes) {
        const val = extractMetadataNormalized(text, "mes");
        if (val) {
          const m = val.match(/[A-ZÁÉÍÓÚÑa-záéíóúñ]+/i);
          if (m) mes = m[0];
        }
      }
      if (!coordinador) {
        const val = extractMetadataNormalized(text, "coordinador musical") || extractMetadataNormalized(text, "coordinador");
        if (val) coordinador = val;
      }
      if (!programacion) {
        const val = extractMetadataNormalized(text, "programacion");
        if (val) programacion = val;
      }
    }
    
    // Check paragraphs at the bottom of the document specifically for coordinators
    const paragraphs = Array.from(doc.querySelectorAll('p')).map(p => p.textContent?.trim() || "");
    for (const p of paragraphs) {
      if (!coordinador) {
        const val = extractMetadataNormalized(p, "coordinador musical") || extractMetadataNormalized(p, "coordinador");
        if (val) coordinador = val;
      }
      if (!programacion) {
        const val = extractMetadataNormalized(p, "programacion");
        if (val) programacion = val;
      }
    }
    
    // Defaults if anything is missing
    emisora = emisora || "RADIO CIUDAD MONUMENTO";
    provincia = provincia || "GRANMA";
    anio = anio || "2026";
    mes = mes || "ENERO";
    coordinador = coordinador || "Pedro José Reyes Acuña";
    programacion = programacion || "Beatriz González Rondón";
    
    // Start layout construction
    const outLines: string[] = [];
    
    // Header Line 1
    outLines.push(`EMISORA: ${emisora.toUpperCase()}; PROVINCIA: ${provincia.toUpperCase()}; AÑO: ${anio.toUpperCase()}; MES: ${mes.toUpperCase()}`);
    
    // Header Line 2
    const cleanCoordinador = accentRestore(coordinador.replace(/^Coordinador\s+musical\s*:\s*/i, '').replace(/\.$/, '').trim());
    const cleanProgramacion = accentRestore(programacion.replace(/^J['\.]?\s*Programaci[oó]n\s*:\s*/i, '').replace(/\.$/, '').trim());
    outLines.push(`COORDINADOR MUSICAL: ${cleanCoordinador}; J' PROGRAMACIÓN: ${cleanProgramacion}`);
    outLines.push(""); // empty spacing row
    
    // ==========================================
    // Table 1: Estadísticas por zonas geográficas
    // ==========================================
    const zonasRows = sectionRows.zonas;
    if (zonasRows.length > 0) {
      outLines.push("=== Estadísticas por zonas geográficas ===");
      const zoneDataList: any[] = [];
      let totalGeneralRow: any = null;
      
      for (const row of zonasRows) {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || "");
        
        // Skip header indicators
        if (cells.some(c => c.toLowerCase().includes('zonas') || c.toLowerCase().includes('cantidad de obras') || c.toLowerCase().includes('obras, autores'))) {
          continue;
        }
        
        // Scan for the name column index
        let nameVal = "";
        let nameIdx = -1;
        for (let i = 0; i < cells.length; i++) {
          const val = cells[i];
          if (/^(Cuba|Extranjera|Total|Latinoam|Norte|Europa|Asia|Áfr|Afr|Otras)/i.test(val)) {
            nameVal = val;
            nameIdx = i;
            break;
          }
        }
        
        if (nameIdx === -1) continue;
        
        const dataCells = cells.slice(nameIdx + 1);
        if (dataCells.length < 6) continue;
        
        const obras = dataCells[0];
        const obrasPorc = dataCells[1];
        const autores = dataCells[2];
        const autoresPorc = dataCells[3];
        const interpretes = dataCells[4];
        const interpretesPorc = dataCells[5];
        
        let normalizedZone = nameVal;
        if (/Cuba/i.test(nameVal)) normalizedZone = "Cuba";
        else if (/Extranjera/i.test(nameVal)) normalizedZone = "Extranjera";
        else if (/Latinoam/i.test(nameVal)) normalizedZone = "Latinoamérica y Caribe";
        else if (/Norte/i.test(nameVal)) normalizedZone = "Norteamericana";
        else if (/Europa/i.test(nameVal)) normalizedZone = "Europa";
        else if (/Asia/i.test(nameVal)) normalizedZone = "Asia";
        else if (/Áfr|Afr/i.test(nameVal)) normalizedZone = "África";
        else if (/Otras/i.test(nameVal)) normalizedZone = "Otras zonas";
        else if (/Total/i.test(nameVal)) normalizedZone = "Total general";
        
        const itemObj = {
          zone: normalizedZone,
          obras,
          obrasPorc,
          autores,
          autoresPorc,
          interpretes,
          interpretesPorc
        };
        
        if (normalizedZone === "Total general") {
          totalGeneralRow = itemObj;
        } else {
          zoneDataList.push(itemObj);
        }
      }
      
      // Output Total General first
      if (totalGeneralRow) {
        outLines.push(`Total general; Obras: ${totalGeneralRow.obras} (${totalGeneralRow.obrasPorc}%); Autores: ${totalGeneralRow.autores} (${totalGeneralRow.autoresPorc}%); Intérpretes: ${totalGeneralRow.interpretes} (${totalGeneralRow.interpretesPorc}%)`);
      }
      
      // Then sequence other zones in exact user-requested order
      const zoneSequence = [
        "Cuba",
        "Extranjera",
        "Latinoamérica y Caribe",
        "Norteamericana",
        "Europa",
        "Asia",
        "África",
        "Otras zonas"
      ];
      
      for (const targetZone of zoneSequence) {
        const found = zoneDataList.find(z => z.zone === targetZone);
        if (found) {
          outLines.push(`Zona: ${found.zone}; Obras: ${found.obras} (${found.obrasPorc}%); Autores: ${found.autores} (${found.autoresPorc}%); Intérpretes: ${found.interpretes} (${found.interpretesPorc}%)`);
        } else {
          outLines.push(`Zona: ${targetZone}; Obras: 0 (0%); Autores: 0 (0%); Intérpretes: 0 (0%)`);
        }
      }
      outLines.push("");
    }
    
    // ==========================================
    // Table 2: Obras musicales más difundidas
    // ==========================================
    const obrasRows = sectionRows.obras;
    if (obrasRows.length > 0) {
      outLines.push("=== Obras musicales más difundidas ===");
      
      let titleIndex = 1;
      let intIndex = 2;
      let nacIntIndex = 3;
      let autIndex = 4;
      let nacAutIndex = 5;
      let execIndex = 6;
      
      const headerRow = obrasRows.find(r => {
        const cells = Array.from(r.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || "");
        if (cells.length < 3) return false;
        if (cells.some(c => c.includes("más") || c.includes("mas") || c.includes("difundidas") || c.includes("difundidos"))) return false;
        return cells.some(c => c.includes("título") || c.includes("titulo") || c.includes("obra"));
      });
      
      if (headerRow) {
        const cols = Array.from(headerRow.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || "");
        
        const tIdx = cols.findIndex(c => c.includes("título") || c.includes("titulo") || c.includes("obra"));
        if (tIdx !== -1) titleIndex = tIdx;
        
        const intIdx = cols.findIndex(c => c.includes("intérprete") || c.includes("interprete") || c.includes("ejecutante"));
        if (intIdx !== -1) intIndex = intIdx;
        
        const autIdx = cols.findIndex(c => c.includes("autor"));
        if (autIdx !== -1) autIndex = autIdx;
        
        const nacIndices = cols.map((c, idx) => c.includes("nac") ? idx : -1).filter(idx => idx !== -1);
        if (nacIndices.length >= 2) {
          nacIntIndex = nacIndices[0];
          nacAutIndex = nacIndices[1];
        } else if (nacIndices.length === 1) {
          const singleNac = nacIndices[0];
          if (Math.abs(singleNac - intIndex) < Math.abs(singleNac - autIndex)) {
            nacIntIndex = singleNac;
            nacAutIndex = autIndex + 1;
          } else {
            nacAutIndex = singleNac;
            nacIntIndex = intIndex + 1;
          }
        } else {
          nacIntIndex = intIndex + 1;
          nacAutIndex = autIndex + 1;
        }
        
        const execIdx = cols.findIndex(c => /frec|cant|ejec|reprod|difund|exec/i.test(c));
        if (execIdx !== -1) {
          execIndex = execIdx;
        } else {
          execIndex = cols.length - 1;
        }
      }
      
      for (const row of obrasRows) {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || "");
        if (cells.length < 3) continue;
        
        // Skip header indicators
        if (cells.some(c => c.toLowerCase().includes("título") || c.toLowerCase().includes("titulo") || c.toLowerCase().includes("obras musicales"))) {
          continue;
        }
        
        const rawNum = cells[0]?.trim() || "";
        const cleanedNum = rawNum.replace(/\.$/, "").trim();
        if (!/^\d+$/.test(cleanedNum)) continue;
        
        const titulo = accentRestore(cells[titleIndex] || "").toUpperCase();
        const interprete = accentRestore(cells[intIndex] || "").toUpperCase();
        const nacInt = formatNac(cells[nacIntIndex] || "");
        const autor = accentRestore(cells[autIndex] || "").toUpperCase();
        const nacAut = formatNac(cells[nacAutIndex] || "");
        const exec = cells[execIndex] || "0";
        
        outLines.push(`${cleanedNum}; Título: ${titulo}; Intérprete: ${interprete} (${nacInt}); Autor: ${autor} (${nacAut}); Frecuencia: ${exec}`);
      }
      outLines.push("");
    }
    
    // ==========================================
    // Table 3: Autores más difundidos
    // ==========================================
    const autoresRows = sectionRows.autores;
    if (autoresRows.length > 0) {
      outLines.push("=== Autores más difundidos ===");
      
      let autIndex = 1, nacIndex = 2, cantIndex = 3, execIndex = 4;
      
      const headerRow = autoresRows.find(r => {
        const cells = Array.from(r.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || "");
        if (cells.length < 3) return false;
        if (cells.some(c => c.includes("más") || c.includes("mas") || c.includes("difundidos") || c.includes("difundidas"))) return false;
        return cells.some(c => c.includes("autor") || c.includes("autores"));
      });
      
      if (headerRow) {
        const cols = Array.from(headerRow.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || "");
        const aIdx = cols.findIndex(c => c.includes("autor") || c.includes("autores"));
        if (aIdx !== -1) autIndex = aIdx;
        
        const nIdx = cols.findIndex(c => c.includes("nac"));
        if (nIdx !== -1) nacIndex = nIdx;
        
        const cIdx = cols.findIndex(c => c.includes("cant") || c.includes("obras"));
        if (cIdx !== -1) cantIndex = cIdx;
        
        const eIdx = cols.findIndex(c => /frec|ejec|reprod|difund|cant|exec/i.test(c) && c !== cols[cIdx]);
        if (eIdx !== -1) {
          execIndex = eIdx;
        } else {
          execIndex = cols.length - 1;
        }
      }
      
      for (const row of autoresRows) {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || "");
        if (cells.length < 3) continue;
        
        if (cells.some(c => c.toLowerCase().includes("autores") || c.toLowerCase().includes("autor"))) {
          continue;
        }
        
        const rawNum = cells[0]?.trim() || "";
        const cleanedNum = rawNum.replace(/\.$/, "").trim();
        if (!/^\d+$/.test(cleanedNum)) continue;
        
        const autor = accentRestore(cells[autIndex] || "").toUpperCase();
        const nac = formatNac(cells[nacIndex] || "");
        const cant = cells[cantIndex] || "0";
        const exec = cells[execIndex] || "0";
        
        outLines.push(`${cleanedNum}; Autor: ${autor} (${nac}); Cantidad de obras: ${cant}; Frecuencia: ${exec}`);
      }
      outLines.push("");
    }
    
    // ==========================================
    // Table 4: Intérpretes más difundidos
    // ==========================================
    const interpretesRows = sectionRows.interpretes;
    if (interpretesRows.length > 0) {
      outLines.push("=== Intérpretes más difundidos ===");
      
      let intIndex = 1, nacIndex = 2, cantIndex = 3, execIndex = 4;
      
      const headerRow = interpretesRows.find(r => {
        const cells = Array.from(r.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || "");
        if (cells.length < 3) return false;
        if (cells.some(c => c.includes("más") || c.includes("mas") || c.includes("difundidos") || c.includes("difundidas"))) return false;
        return cells.some(c => c.includes("interprete") || c.includes("intérprete") || c.includes("interpretes") || c.includes("intérpretes"));
      });
      
      if (headerRow) {
        const cols = Array.from(headerRow.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || "");
        const iIdx = cols.findIndex(c => c.includes("interprete") || c.includes("intérprete") || c.includes("interpretes") || c.includes("intérpretes"));
        if (iIdx !== -1) intIndex = iIdx;
        
        const nIdx = cols.findIndex(c => c.includes("nac"));
        if (nIdx !== -1) nacIndex = nIdx;
        
        const cIdx = cols.findIndex(c => c.includes("cant") || c.includes("obras"));
        if (cIdx !== -1) cantIndex = cIdx;
        
        const eIdx = cols.findIndex(c => /frec|ejec|reprod|difund|cant|exec/i.test(c) && c !== cols[cIdx]);
        if (eIdx !== -1) {
          execIndex = eIdx;
        } else {
          execIndex = cols.length - 1;
        }
      }
      
      for (const row of interpretesRows) {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || "");
        if (cells.length < 3) continue;
        
        if (cells.some(c => c.toLowerCase().includes("interprete") || c.toLowerCase().includes("intérprete"))) {
          continue;
        }
        
        const rawNum = cells[0]?.trim() || "";
        const cleanedNum = rawNum.replace(/\.$/, "").trim();
        if (!/^\d+$/.test(cleanedNum)) continue;
        
        const interprete = accentRestore(cells[intIndex] || "").toUpperCase();
        const nac = formatNac(cells[nacIndex] || "");
        const cant = cells[cantIndex] || "0";
        const exec = cells[execIndex] || "0";
        
        outLines.push(`${cleanedNum}; Intérprete: ${interprete} (${nac}); Cantidad de obras: ${cant}; Frecuencia: ${exec}`);
      }
      outLines.push("");
    }
    
    // ==========================================
    // Table 5: Géneros musicales más difundidos
    // ==========================================
    const generosRows = sectionRows.generos;
    if (generosRows.length > 0) {
      outLines.push("=== Géneros musicales más difundidos ===");
      
      let genIndex = 1, cantIndex = 3, execIndex = 4;
      
      const headerRow = generosRows.find(r => {
        const cells = Array.from(r.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || "");
        if (cells.length < 3) return false;
        if (cells.some(c => c.includes("más") || c.includes("mas") || c.includes("difundidos") || c.includes("difundidas") || c.includes("musicales"))) return false;
        return cells.some(c => c.includes("géneros") || c.includes("generos") || c.includes("género") || c.includes("genero"));
      });
      
      if (headerRow) {
        const cols = Array.from(headerRow.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || "");
        const gIdx = cols.findIndex(c => c.includes("genero") || c.includes("género") || c.includes("generos") || c.includes("géneros"));
        if (gIdx !== -1) genIndex = gIdx;
        
        const cIdx = cols.findIndex(c => c.includes("cant") || c.includes("obras"));
        if (cIdx !== -1) cantIndex = cIdx;
        
        const eIdx = cols.findIndex(c => /frec|ejec|reprod|difund|cant|exec/i.test(c) && c !== cols[cIdx]);
        if (eIdx !== -1) {
          execIndex = eIdx;
        } else {
          execIndex = cols.length - 1;
        }
      }
      
      for (const row of generosRows) {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || "");
        if (cells.length < 2) continue;
        
        if (cells.some(c => c.toLowerCase().includes("genero") || c.toLowerCase().includes("género") || c.toLowerCase().includes("generos") || c.toLowerCase().includes("géneros"))) {
          continue;
        }
        
        const rawNum = cells[0]?.trim() || "";
        const cleanedNum = rawNum.replace(/\.$/, "").trim();
        if (!/^\d+$/.test(cleanedNum)) continue;
        
        const genero = accentRestore(cells[genIndex] || "").toUpperCase();
        const cant = cells[cantIndex] || "0";
        const exec = cells[execIndex] || "0";
        
        outLines.push(`${cleanedNum}; Género: ${genero}; Cantidad de obras: ${cant}; Frecuencia: ${exec}`);
      }
    }
    
    // Join lines and clean edge case duplicates/extra spacing
    return outLines.join("\n").trim() + "\n";
    
  } catch (err) {
    console.error("Error converting DOCX to TXT:", err);
    throw new Error("No se pudo extraer o estructurar las tablas del archivo DOCX. Revisa el formato.");
  }
};
