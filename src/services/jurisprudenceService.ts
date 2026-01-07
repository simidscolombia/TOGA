import { supabase } from './supabaseClient';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Jurisprudence } from '../types';

// Constants for Gemini Model
// Use 'gemini-pro' for maximum stability
const MODEL_NAME = "gemini-pro";

export const JurisprudenceService = {

    /**
     * Uploads and parses a Bulletin or Full Sentence file using Gemini AI.
     * @param file The File object (Word/PDF) uploaded by user
     * @param apiKey The Gemini API Key (from user profile or env)
     * @param type 'bulletin' | 'upload'
     */
    async processDocument(file: File, apiKey: string, type: 'bulletin' | 'upload'): Promise<{ saved: number, skipped: number, errors: string[] }> {

        if (!apiKey) throw new Error("API Key de Gemini no encontrada.");

        // 1. Prepare File for Gemini (Base64)
        const base64Data = await this.fileToBase64(file);

        // 2. Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // 3. Define the Prompt based on doc type
        let prompt = "";
        if (type === 'bulletin') {
            prompt = `
            Actúa como un Relator de la Corte Suprema experto en indexación.
            Analiza el siguiente documento (Boletín Jurisprudencial) y extrae CADA UNA de las fichas jurisprudenciales encontradas.
            
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
            - Retorna SOLO el JSON válido.
            `;
        } else {
            // Full sentence analysis prompt (Future implementation)
            prompt = "Analiza esta sentencia completa...";
        }

        // 4. Call Gemini
        try {
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data.split(',')[1], // Remove 'data:application/pdf;base64,' prefix
                        mimeType: file.type
                    }
                }
            ]);

            const responseText = result.response.text();
            const cleanJsonIdx = responseText.indexOf('[');
            const cleanJsonEnd = responseText.lastIndexOf(']') + 1;
            const jsonStr = responseText.substring(cleanJsonIdx, cleanJsonEnd);

            const items: Partial<Jurisprudence>[] = JSON.parse(jsonStr);

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

        } catch (e: any) {
            console.error("Gemini Error:", e);
            throw new Error("Error procesando el documento con IA: " + e.message);
        }
    },

    // Helper to convert File to Base64
    fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }
};
