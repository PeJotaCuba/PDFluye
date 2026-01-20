import { GoogleGenAI } from "@google/genai";
import { OutputFormat } from "../types";

// Initialize Gemini Client
// IMPORTANT: The API key is obtained exclusively from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const convertPdfContent = async (
  base64Data: string, 
  settings: { format: OutputFormat; instructions: string }
): Promise<string> => {
  
  const formatInstruction = settings.format === OutputFormat.DOC 
    ? "El formato de salida debe ser texto enriquecido (HTML básico sin CSS complejo) adecuado para ser guardado como un archivo .doc de Word." 
    : "El formato de salida debe ser texto plano (.txt).";

  const userInstruction = settings.instructions.trim() 
    ? `Instrucciones adicionales del usuario: ${settings.instructions}`
    : "Convierte el contenido del documento fielmente.";

  const prompt = `
    Actúa como un conversor de documentos profesional.
    Tu tarea es extraer y transformar el contenido del archivo PDF adjunto.
    
    ${formatInstruction}
    ${userInstruction}
    
    Si es texto plano, no uses markdown, solo texto.
    Si es para Word (HTML), usa etiquetas como <h1>, <p>, <b> para mantener la estructura.
    
    Devuelve SOLO el contenido convertido, sin explicaciones ni bloques de código de markdown (como \`\`\`html).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest', // Using 2.5 Flash as it is robust for multimodal document tasks
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    return response.text || "No se pudo generar contenido.";
  } catch (error) {
    console.error("Error converting PDF:", error);
    throw new Error("Falló la conversión con Gemini API.");
  }
};