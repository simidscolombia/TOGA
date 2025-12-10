
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text content from a PDF file
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        // Iterate through all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Concatenate text items with space
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += `[PÁGINA ${i}]\n${pageText}\n\n`;
        }

        return fullText.trim();
    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error("No se pudo leer el archivo PDF. Asegúrate de que no esté protegido o dañado.");
    }
};

/**
 * Extracts raw text from a DOCX file
 */
export const extractTextFromDocx = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        if (result.messages.length > 0) {
            console.warn("Mammoth warnings:", result.messages);
        }

        return result.value.trim();
    } catch (error) {
        console.error("Error parsing DOCX:", error);
        throw new Error("No se pudo leer el archivo Word. Asegúrate de que sea .docx (no .doc antiguo).");
    }
};
