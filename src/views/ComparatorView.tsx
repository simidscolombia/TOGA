
import React, { useState } from 'react';
import { User } from '../types';
import { Button, Card, PremiumLock, MarkdownRenderer } from '../components/UIComponents';
import { extractTextFromPdf, extractTextFromDocx } from '../services/documentParser';
import { compareJurisprudence } from '../services/geminiService';

export const ComparatorView = ({ user, onUpgrade, showToast }: any) => {
    const [textA, setTextA] = useState('');
    const [textB, setTextB] = useState('');
    const [comparison, setComparison] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileRead = async (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            let extractedText = '';

            if (file.type === 'application/pdf') {
                showToast('info', `Leyendo PDF: ${file.name}...`);
                extractedText = await extractTextFromPdf(file);
            } else if (file.name.endsWith('.docx')) {
                showToast('info', `Leyendo Word: ${file.name}...`);
                extractedText = await extractTextFromDocx(file);
            } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                // Text/Markdown file
                extractedText = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            } else {
                showToast('error', 'Formato no soportado. Usa PDF, DOCX, TXT o BASENAME.');
                setLoading(false);
                return;
            }

            if (target === 'A') setTextA(extractedText);
            else setTextB(extractedText);

            showToast('success', 'Texto extraído correctamente');

        } catch (error: any) {
            console.error(error);
            showToast('error', error.message || 'Error leyendo el archivo');
        } finally {
            setLoading(false);
        }
    };

    const handleCompare = async () => {
        setLoading(true);
        try {
            const res = await compareJurisprudence(textA, textB);
            setComparison(res);
            showToast('success', 'Comparación completada');
        } catch (error) { showToast('error', "Error"); } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <PremiumLock isPremium={user.role === 'PREMIUM'} onUpgrade={onUpgrade}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-toga-help="comparator-inputs">
                    <Card title="Texto A / Archivo 1">
                        <div className="mb-2">
                            <input type="file" accept=".txt,.md,.pdf,.docx" onChange={(e) => handleFileRead(e, 'A')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        <textarea className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-xs" placeholder="O pega el texto aquí..." value={textA} onChange={(e) => setTextA(e.target.value)} />
                    </Card>
                    <Card title="Texto B / Archivo 2">
                        <div className="mb-2">
                            <input type="file" accept=".txt,.md,.pdf,.docx" onChange={(e) => handleFileRead(e, 'B')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        <textarea className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-xs" placeholder="O pega el texto aquí..." value={textB} onChange={(e) => setTextB(e.target.value)} />
                    </Card>
                </div>
                <div className="flex justify-center mt-6">
                    <Button onClick={handleCompare} isLoading={loading} disabled={!textA || !textB} className="px-8">Comparar Jurisprudencia</Button>
                </div>
                {comparison && (
                    <Card title="Análisis Comparativo IA" className="mt-8 bg-blue-50/50 border-blue-100">
                        <MarkdownRenderer content={comparison} />
                    </Card>
                )}
            </PremiumLock>
        </div>
    );
};
