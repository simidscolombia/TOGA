import { supabase } from './supabaseClient';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Jurisprudence } from '../types';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Constants for Gemini Model
// Use 'gemini-1.0-pro' specific version. gemini-pro alias seems broken for this key.
const MODEL_NAME = "gemini-1.0-pro";
console.log("JurisprudenceService initialized with model:", MODEL_NAME);

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const JurisprudenceService = {

    /**
     * Uploads and parses a Bulletin or Full Sentence file using Gemini AI.
     * @param file The File object (Word/PDF) uploaded by user
     * @param apiKey The Gemini API Key (from user profile or env)
     * @param type 'bulletin' | 'upload'
     */
    async processDocument(file: File, apiKey: string, type: 'bulletin' | 'upload'): Promise<{ saved: number, skipped: number, errors: string[] }> {

        if (!apiKey) throw new Error("API Key de Gemini no encontrada.");

        // 1. Extract Text from File (Word or PDF)
        let extractedText = "";
        try {
            extractedText = await this.extractTextFromFile(file);
        } catch (error) {
            console.error("Error extracting text:", error);
            throw new Error("No se pudo leer el texto del archivo. Asegúrate de que sea un PDF o Word válido y no esté corrupto.");
        }

        if (!extractedText || extractedText.length < 50) {
            throw new Error("El archivo parece estar vacío o no contiene texto legible (quizás es una imagen escaneada).");
        }

        // Limit text length if too huge (Gemini Pro limit is ~30k tokens, roughly 120k chars)
        // Bulletins are usually smaller, but let's be safe to avoid 400 Bad Request
        const MAX_CHARS = 100000;
        if (extractedText.length > MAX_CHARS) {
            console.warn(`Text truncated from ${extractedText.length} to ${MAX_CHARS} chars`);
            extractedText = extractedText.substring(0, MAX_CHARS) + "... [Truncado]";
        }

        // 2. Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // 3. Define the Prompt based on doc type
        let prompt = "";
        if (type === 'bulletin') {
            prompt = `
            Actúa como un Relator de la Corte Suprema experto en indexación.
            Analiza el siguiente TEXTO EXTRAÍDO de un Boletín Jurisprudencial:
            
            --- COMIENZO DEL DOCUMENTO ---
            ${extractedText}
            --- FIN DEL DOCUMENTO ---

            TAREA:
            Extrae CADA UNA de las fichas jurisprudenciales encontradas en el texto anterior.
            
            FORMATO ESPERADO (JSON Array):
            [
              {
                "radicado": "Número del radicado (ej: 52059)",
                "sentencia_id": "Código de sentencia (ej: SP2163-2018)",
                "ddp_number": "Número DDP si existe (ej: 110)",
                "tema": "Tema principal (ej: Inasistencia alimentaria)",
                "tesis": "Texto completo de la tesis jurídica (los puntos i, ii, iii...)",
                "source_url": "Enlace/Link si aparece en el texto asociado a este item"
              }
            ]
            
            REGLAS:
            - Extrae TODAS las entradas.
            - Sé preciso con los números de radicado.
            - Si encuentras un link de OneDrive/Sharepoint junto a la ficha, inclúyelo en 'source_url'.
            - Retorna SOLO el JSON válido, sin bloques de código markdown.
            `;
        } else {
            prompt = `Analiza el siguiente texto de una sentencia judicial y extrae sus datos clave... \n\n ${extractedText.substring(0, 5000)}`;
        }

        // 4. Call Gemini (Text only mode)
        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Clean Markdown code blocks if present
            let cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const cleanJsonIdx = cleanJson.indexOf('[');
            const cleanJsonEnd = cleanJson.lastIndexOf(']') + 1;

            if (cleanJsonIdx === -1 || cleanJsonEnd === 0) {
                console.error("Invalid JSON response:", responseText);
                throw new Error("La IA no devolvió un formato válido. Intenta de nuevo.");
            }

            cleanJson = cleanJson.substring(cleanJsonIdx, cleanJsonEnd);

            const items: Partial<Jurisprudence>[] = JSON.parse(cleanJson);

            // 5. Save to Supabase (Upsert logic to handle duplicates)
            let savedCount = 0;
            let skippedCount = 0;
            const errors: string[] = [];

            if (!supabase) throw new Error("Base de datos no conectada");

            for (const item of items) {
                if (!item.radicado) continue;

                // Check for duplicates
                const { data: existing } = await supabase
                    .from('jurisprudence')
                    .select('id')
                    .eq('radicado', item.radicado)
                    .single();

                if (existing) {
                    // Update existing? Or Skip? For now Skip to be safe unless empty.
                    skippedCount++;
                } else {
                    const { error } = await supabase.from('jurisprudence').insert({
                        ...item,
                        source_type: type,
                        analysis_level: 'basic'
                    });

                    if (error) {
                        console.error('Error saving item:', item.radicado, error);
                        errors.push(`Error guardando Rad. ${item.radicado}`);
                    } else {
                        savedCount++;
                    }
                }
            }

            return { saved: savedCount, skipped: skippedCount, errors };

        } catch (error: any) {
            console.error("Jurisprudence AI Error:", error);
            const keyUsed = apiKey ? `...${apiKey.slice(-4)}` : 'NONE';
            throw new Error(`Error procesando el documento con IA (Key: ${keyUsed}): ` + (error.message || error));
        }
    },

    // --- Helper: Extract Text ---
    async extractTextFromFile(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();

        if (file.name.toLowerCase().endsWith('.docx')) {
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        }
        else if (file.name.toLowerCase().endsWith('.pdf')) {
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = "";

            // Limit pages to avoid browser hanging on massive PDFs
            const maxPages = Math.min(pdf.numPages, 20);

            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + "\n";
            }
            return fullText;
        }
        else {
            // Text file
            return new TextDecoder().decode(arrayBuffer);
        }
    }
};
