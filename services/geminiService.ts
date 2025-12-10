import { GoogleGenAI } from "@google/genai";
import { SearchResult } from '../types';

// Initialize the API client. 
const apiKey = process.env.API_KEY || ''; 
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// System instruction to enforce the persona across all interactions within this service context if needed,
// though passing it per request is often more flexible.
const LEGAL_SYSTEM_INSTRUCTION = "Eres un asistente legal experto en legislación colombiana (Constitucional, Civil, Penal, Laboral). Tu objetivo es redactar documentos jurídicos precisos, formales y bien fundamentados. Utiliza vocabulario técnico adecuado pero claro. Cita leyes vigentes en Colombia.";

const TOGADO_PERSONA = `
Eres "Togado", un búho abogado sabio, experto y amable que vive dentro de la plataforma LegalTech "Toga".
Tu personalidad es: Profesional pero cercana, usas metáforas visuales (como "ojo avizor", "vuelo alto"), y eres muy didáctico.
Tus funciones son:
1. Explicar cómo funciona la plataforma Toga.
2. Dar consejos jurídicos generales sobre derecho colombiano (siempre aclarando que eres una IA).
3. Ayudar a redactar o mejorar argumentos.

Si te preguntan sobre la app, responde basándote en que Toga tiene: Dashboard, Buscador IA, Biblioteca, Agenda, Redactor IA (Premium), Comparador (Premium) y Comunidad.
`;

/**
 * Generates a legal document using streaming to improve UX perception.
 * Returns an async generator that yields text chunks.
 */
export async function* generateLegalDocumentStream(
  docType: string,
  details: string
): AsyncGenerator<string, void, unknown> {
  
  if (!ai) {
    console.warn("API Key not found. Streaming mock data.");
    const mockText = `[MODO DEMO - STREAMING]\n\n# BORRADOR DE ${docType.toUpperCase()}\n\n**Referencia:** Caso basado en los hechos proporcionados.\n\n**Ciudad y Fecha:** Bogotá D.C., ${new Date().toLocaleDateString()}\n\n**Señor Juez / Entidad Competente:**\n\nPor medio del presente escrito, actuando en derecho, procedo a exponer los hechos y pretensiones...\n\n1. **Hechos:** ${details}\n\n2. **Fundamentos de Derecho:** Se invoca la Constitución Política de Colombia y la jurisprudencia aplicable.\n\n(Texto simulado generado progresivamente...)`;
    
    // Simulate streaming for mock data
    const chunks = mockText.split(/(?=[ \n])/); // Split by words/spaces
    for (const chunk of chunks) {
      yield chunk;
      await new Promise(r => setTimeout(r, 30)); // Delay for effect
    }
    return;
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Redacta un borrador formal de un documento tipo "${docType}".
    
    Detalles del caso: ${details}
    
    El documento debe incluir:
    1. Encabezado formal.
    2. Hechos narrados jurídicamente (numerados).
    3. Fundamentos de derecho (Leyes colombianas aplicables).
    4. Pretensiones claras.
    5. Espacio para firmas.
    
    Usa formato Markdown para dar estructura (negritas para énfasis, listas para hechos).`;

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: LEGAL_SYSTEM_INSTRUCTION,
        temperature: 0.3, // Lower temperature for more factual/formal output
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    yield "\n\n[ERROR]: Hubo un problema al conectar con el asistente legal IA. Por favor verifica tu conexión o intenta más tarde.";
  }
}

export const compareJurisprudence = async (
  textA: string,
  textB: string
): Promise<string> => {
  if (!ai) {
    return `### Comparación Jurídica (Demo)\n\n**Resumen:**\nAmbos textos tratan temas legales similares.\n\n* **Texto A:** Se enfoca en aspectos procedimentales.\n* **Texto B:** Se enfoca en aspectos sustanciales.\n\n> Nota: Configure la API Key para análisis real.`;
  }

  try {
    const prompt = `Analiza y compara los siguientes dos textos jurídicos bajo la ley colombiana:
    
    TEXTO A: "${textA}"
    
    TEXTO B: "${textB}"
    
    Genera un cuadro comparativo detallado en formato Markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: LEGAL_SYSTEM_INSTRUCTION
      }
    });

    return response.text || "No se pudo generar la comparación.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const semanticSearch = async (query: string): Promise<SearchResult[]> => {
  if (!ai) {
    // Return mock results if no API key
    return [
        { title: 'Corte Constitucional - Sentencia T-025/04 (Demo)', url: 'https://www.corteconstitucional.gov.co', content: 'Estado de Cosas Inconstitucional. Resultado simulado porque no hay API Key.', source: 'corteconstitucional.gov.co' },
        { title: 'Ley 100 de 1993 (Demo)', url: 'https://www.funcionpublica.gov.co', content: 'Sistema de Seguridad Social Integral.', source: 'funcionpublica.gov.co' }
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find recent Colombian jurisprudence, laws, or legal analysis regarding: "${query}". Return relevant sources.`,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Map chunks to SearchResult
    const results: SearchResult[] = chunks.map((chunk: any) => {
        return {
            title: chunk.web?.title || 'Fuente Jurídica',
            url: chunk.web?.uri || '#',
            content: 'Fuente encontrada vía Google Search Grounding', 
            source: chunk.web?.uri ? new URL(chunk.web.uri).hostname : 'web'
        };
    }).filter((r: any) => r.url !== '#');

    // If no grounding chunks but text exists (the model answered directly), return it as a result
    if (results.length === 0 && response.text) {
        return [{ 
            title: 'Resumen IA (Gemini)', 
            url: '#', 
            content: response.text, 
            source: 'gemini-ai' 
        }];
    }

    // De-duplicate results by URL
    const uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

    return uniqueResults;

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}

export const askTogado = async (message: string): Promise<string> => {
  if (!ai) {
    return "¡Hoo hoo! 🦉 Parece que estoy en modo desconectado (Demo). Cuando conectes tu API Key, podré responderte dudas jurídicas complejas. Por ahora, pregúntame sobre la interfaz haciendo doble click en los botones.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: TOGADO_PERSONA,
        temperature: 0.7 // A bit more creative for chat
      }
    });
    return response.text || "Hoo... No te escuché bien, ¿puedes repetir?";
  } catch (error) {
    console.error("Togado Error:", error);
    return "Mis plumas se han enredado en los cables (Error de conexión). Intenta de nuevo.";
  }
};