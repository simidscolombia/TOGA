
import React, { useState, useEffect, useRef } from 'react';
import { DocType, User } from '../types';
import { Button, Card, PremiumLock, VoiceRecorder, MarkdownRenderer } from '../components/UIComponents';
import { generateLegalDocumentStream } from '../services/geminiService';
import { PenTool, Minimize2, Maximize2, Eye, Edit2, Save, Printer, FileText, Copy, Trash2 } from 'lucide-react';

export const DrafterView = ({ user, onUpgrade, onSave, initialContent, showToast, isZenMode, toggleZenMode }: any) => {
    const [type, setType] = useState(initialContent?.type || DocType.TUTELA);
    const [details, setDetails] = useState(initialContent?.content || '');

    // Persistence for draft result only
    const [result, setResult] = useState(() => localStorage.getItem('toga_draft_result') || '');
    const [isEditing, setIsEditing] = useState(false);

    const [loading, setLoading] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => { localStorage.setItem('toga_draft_result', result); }, [result]);

    const handleDraft = async () => {
        setLoading(true);
        setResult('');
        try {
            const stream = generateLegalDocumentStream(type, details);
            for await (const chunk of stream) {
                setResult(prev => prev + chunk);
                if (resultRef.current) resultRef.current.scrollTop = resultRef.current.scrollHeight;
            }
        } catch (e) { showToast('error', "Error generando documento"); }
        finally { setLoading(false); }
    };

    const copyToClipboard = () => { navigator.clipboard.writeText(result); showToast('success', "Copiado"); };

    const handleDownload = () => {
        // Export to Word-compatible HTML
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Document</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; text-align: justify;">${document.getElementById('legal-document-content')?.innerHTML}</div>` + footer;

        const sourceBlob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(sourceBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `borrador_${type.toLowerCase().replace(/ /g, '_')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveBtn = () => {
        if (!result) return;
        const title = window.prompt("Nombre del documento:", `${type} - ${new Date().toLocaleDateString()}`);
        if (title) onSave(title, result, type);
    }

    return (
        <div className={`grid grid-cols-1 ${isZenMode ? 'lg:grid-cols-1 h-screen' : 'lg:grid-cols-2 h-[calc(100vh-140px)]'} gap-8 print:block print:h-auto`}>
            {/* Settings Panel */}
            {!isZenMode && (
                <Card title="Configuración" className="flex flex-col h-full print:hidden">
                    <PremiumLock isPremium={user.role === 'PREMIUM'} onUpgrade={onUpgrade}>
                        <div className="space-y-6" data-toga-help="drafter-config">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Documento</label>
                                <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500">
                                    {Object.values(DocType).filter(t => t !== DocType.JURISPRUDENCIA).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-700">Hechos y Detalles</label>
                                    <VoiceRecorder onResult={(text: string) => setDetails((prev: string) => (prev ? prev + ' ' : '') + text)} />
                                </div>
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Describe los hechos..."
                                    className="flex-1 w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 resize-none text-sm leading-relaxed"
                                />
                            </div>
                            <Button onClick={handleDraft} isLoading={loading} className="w-full py-3" disabled={!details}>
                                {loading ? 'Redactando...' : 'Generar Borrador con IA'}
                            </Button>
                        </div>
                    </PremiumLock>
                </Card>
            )}

            {/* Result Panel */}
            <Card className={`flex flex-col h-full bg-slate-50 relative p-0 overflow-hidden print:shadow-none print:border-none print:bg-white print:overflow-visible ${isZenMode ? 'rounded-none border-none' : ''}`}>
                <div className="px-4 py-3 border-b border-slate-200 bg-white flex justify-between items-center sticky top-0 z-10 print:hidden">
                    <div className="flex items-center gap-2">
                        <button onClick={toggleZenMode} title={isZenMode ? "Salir Modo Zen" : "Modo Zen"} className="p-2 hover:bg-slate-100 rounded text-slate-600">
                            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <h3 className="font-semibold text-slate-800 hidden sm:block">Editor</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded flex items-center gap-2 text-sm font-medium ${isEditing ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}>
                            {isEditing ? <><Eye className="w-4 h-4" /> Ver</> : <><Edit2 className="w-4 h-4" /> Editar</>}
                        </button>
                        <div className="h-8 w-px bg-slate-200 mx-1"></div>
                        <Button size="sm" onClick={handleSaveBtn} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Save className="w-4 h-4" /> Guardar
                        </Button>
                        <div className="h-8 w-px bg-slate-200 mx-1"></div>
                        <button onClick={() => window.print()} title="Imprimir" className="p-2 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"><Printer className="w-4 h-4" /></button>
                        <button onClick={handleDownload} title="Word (.doc)" className="p-2 text-white bg-blue-700 hover:bg-blue-800 rounded"><FileText className="w-4 h-4" /></button>
                        <button onClick={copyToClipboard} title="Copiar" className="p-2 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm("¿Limpiar?")) setResult('') }} title="Limpiar" className="p-2 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>

                <div data-toga-help="drafter-result" ref={resultRef} className={`flex-1 overflow-y-auto bg-white print:p-0 print:overflow-visible ${isZenMode ? 'p-12 max-w-3xl mx-auto shadow-2xl my-8' : 'p-8'}`}>
                    {result ? (
                        <div id="legal-document-content" className="h-full">
                            {isEditing ? (
                                <textarea
                                    className="w-full h-full p-4 border rounded font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    value={result}
                                    onChange={(e) => setResult(e.target.value)}
                                />
                            ) : (
                                <MarkdownRenderer content={result} />
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center border-2 border-dashed border-slate-100 rounded-lg m-4 print:hidden">
                            <PenTool className="w-12 h-12 mb-4 opacity-30" />
                            <p>El documento generado aparecerá aquí.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
