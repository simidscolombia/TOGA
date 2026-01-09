
import { GoogleGenAI, Modality } from "@google/genai";
import { SearchResult, NewsItem, AnalyzedDecision } from '../types';

// Initialize the API client. 
const apiKey = process.env.API_KEY || '';
// Deployment fix trigger
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// System instruction
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

export async function* generateLegalDocumentStream(
  docType: string,
  details: string,
  modelId: string = 'gemini-flash'
): AsyncGenerator<string, void, unknown> {

  if (!ai) {
    console.warn("API Key not found. Streaming mock data.");
    const mockText = `[MODO DEMO - STREAMING]\n\n# BORRADOR DE ${docType.toUpperCase()}\n\n**Referencia:** Caso basado en los hechos proporcionados.\n\n**Ciudad y Fecha:** Bogotá D.C., ${new Date().toLocaleDateString()}\n\n**Señor Juez / Entidad Competente:**\n\nPor medio del presente escrito, actuando en derecho, procedo a exponer los hechos y pretensiones...\n\n1. **Hechos:** ${details}\n\n2. **Fundamentos de Derecho:** Se invoca la Constitución Política de Colombia y la jurisprudencia aplicable.\n\n(Texto simulado generado progresivamente...)`;

    const chunks = mockText.split(/(?=[ \n])/);
    for (const chunk of chunks) {
      yield chunk;
      await new Promise(r => setTimeout(r, 30));
    }
    return;
  }

  try {
    // Map internal IDs to real Gemini Model Names
    const realModelName = modelId === 'gemini-pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash-001';

    const prompt = `Redacta un borrador formal de un documento tipo "${docType}".
    
    Detalles del caso: ${details}
    
    El documento debe incluir:
    1. Encabezado formal.
    2. Hechos narrados jurídicamente (numerados).
    3. Fundamentos de derecho (Leyes colombianas aplicables).
    4. Pretensiones claras.
    5. Espacio para firmas.
    
    Usa formato Markdown para dar estructura.`;

    const responseStream = await ai.models.generateContentStream({
      model: realModelName,
      contents: prompt,
      config: {
        systemInstruction: LEGAL_SYSTEM_INSTRUCTION,
        temperature: 0.3,
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
    const prompt = `Analiza y compara los siguientes dos textos jurídicos o extractos de documentos bajo la ley colombiana:
    
    TEXTO A: "${textA}"
    
    TEXTO B: "${textB}"
    
    Genera una **TABLA COMPARATIVA EN MARKDOWN** detallada con las siguientes columnas (si aplica):
    | Aspecto | Texto A | Texto B | Análisis/Conclusión |
    |---|---|---|---|
    | Hechos Relevantes | ... | ... | ... |
    | Problema Jurídico | ... | ... | ... |
    | Ratio Decidendi | ... | ... | ... |
    | Decisión/Fallo | ... | ... | ... |
    
    Asegúrate de que la tabla sea legible y esté bien estructurada.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
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
    return [
      { title: 'Corte Constitucional - Sentencia T-025/04 (Demo)', url: 'https://www.corteconstitucional.gov.co', content: 'Estado de Cosas Inconstitucional en materia de desplazamiento forzado.', source: 'corteconstitucional.gov.co' },
      { title: 'Ley 100 de 1993 (Demo)', url: 'https://www.funcionpublica.gov.co', content: 'Sistema de Seguridad Social Integral.', source: 'funcionpublica.gov.co' }
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: `Find recent Colombian jurisprudence, laws, or legal analysis regarding: "${query}". Return relevant sources with summaries.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const results: SearchResult[] = chunks.map((chunk: any) => {
      return {
        title: chunk.web?.title || 'Fuente Jurídica',
        url: chunk.web?.uri || '#',
        content: 'Fuente encontrada vía Google Search Grounding',
        source: chunk.web?.uri ? new URL(chunk.web.uri).hostname : 'web'
      };
    }).filter((r: any) => r.url !== '#');

    if (results.length === 0 && response.text) {
      return [{
        title: 'Resumen IA (Gemini)',
        url: '#',
        content: response.text,
        source: 'gemini-ai'
      }];
    }

    const uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);
    return uniqueResults;

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}

export const askTogado = async (message: string): Promise<string> => {
  if (!ai) {
    return "¡Hoo hoo! 🦉 Parece que estoy en modo desconectado (Demo).";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: message,
      config: {
        systemInstruction: TOGADO_PERSONA,
        temperature: 0.7
      }
    });
    return response.text || "Hoo... No te escuché bien, ¿puedes repetir?";
  } catch (error) {
    console.error("Togado Error:", error);
    return "Error de conexión. Intenta de nuevo.";
  }
};

export const getLegalNews = async (): Promise<NewsItem[]> => {
  if (!ai) {
    return [
      { id: '1', title: 'Corte Constitucional tumba reforma (Demo)', snippet: 'La sala plena declaró inexequible la norma...', source: 'El Tiempo', url: '#', date: 'Hoy', category: 'Constitucional' },
      { id: '2', title: 'Nueva reforma laboral en debate (Demo)', snippet: 'Puntos clave del proyecto presentado al congreso...', source: 'Ámbito Jurídico', url: '#', date: 'Ayer', category: 'Laboral' }
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: "Busca noticias jurídicas recientes en Colombia sobre sentencias de la Corte Constitucional, Corte Suprema y reformas legales. Retorna los 5 titulares más importantes de la última semana.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return chunks.slice(0, 5).map((chunk: any, i: number) => ({
      id: `news-${i}`,
      title: chunk.web?.title || 'Noticia Jurídica',
      snippet: 'Noticia encontrada en la web legal colombiana.',
      source: chunk.web?.uri ? new URL(chunk.web.uri).hostname : 'Web',
      url: chunk.web?.uri || '#',
      date: 'Reciente',
      category: 'General' as const
    })).filter((n: any) => n.url !== '#');

  } catch (error) {
    console.error("News Error:", error);
    return [];
  }
};

export const analyzeDecision = async (title: string, context: string): Promise<AnalyzedDecision> => {
  if (!ai) {
    return {
      summary: "Resumen simulado de la sentencia. La IA analizará el texto completo cuando se conecte.",
      facts: ["Hecho 1: Tutela presentada por x", "Hecho 2: Negación de servicio"],
      arguments: ["Derecho a la salud es fundamental", "La EPS vulneró el derecho"],
      decision: "CONCEDER el amparo solicitado y ordenar el tratamiento.",
      tags: ["Salud", "Tutela", "Demo"]
    };
  }

  try {
    const prompt = `Analiza la siguiente información sobre una decisión judicial colombiana:
        Título: ${title}
        Contexto/Snippet: ${context}
        
        Si tienes acceso a herramientas de búsqueda, úsalas para encontrar más detalles de este caso.
        
        IMPORTANTE: Responde ÚNICAMENTE con un JSON válido. No uses bloques de código Markdown (no uses \`\`\`json).
        
        Estructura JSON requerida:
        {
          "summary": "Resumen ejecutivo de 1 párrafo",
          "facts": ["Hecho 1", "Hecho 2"],
          "arguments": ["Argumento 1", "Argumento 2"],
          "decision": "El resuelve o decisión final",
          "tags": ["Tag1", "Tag2", "Tag3"]
        }`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: prompt,
      config: {
        // responseMimeType: "application/json", // Removed because it conflicts with googleSearch tool
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || '{}';
    // Clean potential Markdown wrappers just in case
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);

  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      summary: "No se pudo analizar automáticamente.",
      facts: [],
      arguments: [],
      decision: "Consultar texto completo.",
      tags: ["Error"]
    };
  }
};

/**
 * Chat with a document/sentence content
 */
export const chatWithDocument = async (context: string, question: string): Promise<string> => {
  if (!ai) {
    return "Modo Demo: En este modo no puedo leer el documento real. Conecta tu API Key para chatear con esta sentencia.";
  }

  try {
    const prompt = `Tienes el siguiente documento legal (Sentencia/Ley):
        "${context.substring(0, 30000)}..." (Truncado si es muy largo)
        
        Responde a la siguiente pregunta del usuario basándote EXCLUSIVAMENTE en el texto anterior. Si no está en el texto, dilo.
        Pregunta: "${question}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: prompt,
      config: {
        systemInstruction: "Eres un analista jurídico. Responde de forma precisa basándote en el texto proporcionado.",
      }
    });
    return response.text || "No encontré una respuesta en el documento.";
  } catch (error) {
    console.error("Chat Doc Error:", error);
    return "Error al procesar la pregunta.";
  }
}

/**
 * Generate Audio from Text using Gemini TTS
 * Returns base64 encoded audio string (PCM)
 */
export const generateAudioFromText = async (text: string): Promise<string | null> => {
  if (!ai) {
    console.warn("API Key required for Gemini TTS");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is good for formal reading
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;

  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
