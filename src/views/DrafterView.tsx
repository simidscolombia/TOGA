import React, { useState, useEffect } from 'react';
import { PenTool, Copy, Wand2, Info } from 'lucide-react';
import { generateLegalDocumentStream } from '../services/geminiService';
import { DataService } from '../services/dataService';
import { Card, Button, ToastNotification } from '../components/UIComponents';
import { AI_MODELS, User } from '../types';

export const DrafterView = ({ initialDraft, user }: { initialDraft: { content: string, type: string } | null, user: User }) => {
    const [docType, setDocType] = useState('Tutela');
    const [details, setDetails] = useState('');
    const [generatedDoc, setGeneratedDoc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [toast, setToast] = useState<{ id: string, type: 'success' | 'error' | 'info', message: string } | null>(null);

    // [New] Model Selection State
    const [selectedModelId, setSelectedModelId] = useState<string>(AI_MODELS.GEMINI_FLASH.id);

    // Derived state for current model
    const currentModel = Object.values(AI_MODELS).find(m => m.id === selectedModelId) || AI_MODELS.GEMINI_FLASH;

    useEffect(() => {
        if (initialDraft) {
            setDocType(initialDraft.type);
            setDetails(initialDraft.content);
        }
    }, [initialDraft]);

    const handleGenerate = async () => {
        if (!details.trim()) {
            setToast({ id: Date.now().toString(), type: 'error', message: 'Por favor, describe los hechos del caso.' });
            return;
        }

        // [New] Check Funds / Keys Logic
        if (currentModel.cost > 0) {
            const hasKey = user.apiKeys?.[currentModel.provider as keyof typeof user.apiKeys];

            if (!hasKey) {
                const hasConfirm = window.confirm(`Esta acción costará ${currentModel.cost} TogaCoins.\n\n¿Deseas continuar?`);
                if (!hasConfirm) return;

                // Attempt deduction
                const success = await DataService.deductCoins(currentModel.cost);
                if (!success) {
                    setToast({ id: Date.now().toString(), type: 'error', message: 'Saldo insuficiente. ¡Recarga TogaCoins!' });
                    return;
                }
            } else {
                // BYOK - Free usage notification (optional)
                // setToast({ id: Date.now().toString(), type: 'info', message: 'Usando tu propia llave API (Gratis)' });
            }
        }

        setIsGenerating(true);
        setGeneratedDoc('');

        // Record Transaction Start
        const transactionPromise = DataService.recordTransaction({
            userId: user.id,
            action: `Redacción: ${docType}`,
            modelUsed: currentModel.name,
            cost: user.apiKeys?.[currentModel.provider as keyof typeof user.apiKeys] ? 0 : currentModel.cost
        });

        try {
            await transactionPromise; // Ensure tx is recorded
            const stream = generateLegalDocumentStream(docType, details, selectedModelId);
            for await (const chunk of stream) {
                setGeneratedDoc(prev => prev + chunk);
            }
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            setToast({ id: Date.now().toString(), type: 'success', message: 'Documento generado con éxito.' });
        } catch (error) {
            setToast({ id: Date.now().toString(), type: 'error', message: 'Error al generar el documento.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedDoc);
        setToast({ id: Date.now().toString(), type: 'success', message: 'Copiado al portapapeles' });
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in" data-toga-help="legal-drafter">
            {toast && <div className="absolute top-4 right-4 z-50"><ToastNotification {...toast} onClose={() => setToast(null)} /></div>}

            {/* Input Panel */}
            <div className="flex-1 flex flex-col gap-4">
                <Card title="Configuración del Documento" className="h-full flex flex-col">
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Documento</label>
                            <select
                                value={docType}
                                onChange={(e) => setDocType(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            >
                                <option value="Tutela">Acción de Tutela</option>
                                <option value="Derecho de Petición">Derecho de Petición</option>
                                <option value="Contrato de Arrendamiento">Contrato de Arrendamiento</option>
                                <option value="Demanda Ejecutiva">Demanda Ejecutiva</option>
                                <option value="Poder General">Poder General</option>
                            </select>
                        </div>

                        {/* [New] AI Model Selector */}
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                            <label className="block text-xs font-bold text-indigo-800 mb-2 uppercase tracking-wide flex justify-between">
                                Motor de Inteligencia (IA)
                                <span className="text-indigo-400 cursor-help" title="Elige la potencia de la IA"><Info className="w-3 h-3" /></span>
                            </label>
                            <div className="space-y-1">
                                {Object.values(AI_MODELS).map((model) => {
                                    const userHasKey = user.apiKeys?.[model.provider as keyof typeof user.apiKeys];
                                    return (
                                        <label key={model.id} className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${selectedModelId === model.id ? 'bg-white border-indigo-500 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="ai_model"
                                                    value={model.id}
                                                    checked={selectedModelId === model.id}
                                                    onChange={() => setSelectedModelId(model.id)}
                                                    className="text-indigo-600 focus:ring-indigo-500 scale-90"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-slate-800">{model.name}</span>
                                                    {/* <span className="text-[10px] text-slate-500">{model.cost === 0 ? 'Rápido' : 'Preciso'}</span> */}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${model.cost === 0 || userHasKey ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {userHasKey ? 'Tu Llave' : model.cost === 0 ? 'Gratis' : `💎 ${model.cost}`}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hechos y Detalles</label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                className="w-full flex-1 min-h-[200px] p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm leading-relaxed"
                                placeholder="Describe los hechos cronológicamente. Ejemplo: 'El día 1 de marzo solicité... y la EPS no respondió...'"
                            ></textarea>
                            <p className="text-xs text-slate-400 text-right mt-1">Más detalles = Mejor resultado</p>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="w-full relative overflow-hidden group">
                            {isGenerating ? (
                                'Redactando...'
                            ) : (
                                <>
                                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                                    <span className="relative flex items-center gap-2">
                                        <PenTool className="w-5 h-5" />
                                        Redactar con {currentModel.name.split(' ')[0]}
                                    </span>
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Output Panel */}
            <div className="flex-1 h-full min-h-[500px]">
                <Card title="Documento Generado" className="h-full flex flex-col bg-slate-50/50">
                    {generatedDoc ? (
                        <div className="flex-1 flex flex-col relative">
                            <div className="absolute top-0 right-0 flex gap-2">
                                <button onClick={copyToClipboard} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Copiar"><Copy className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-4 bg-white rounded-lg border border-slate-200 shadow-sm font-serif text-slate-800 whitespace-pre-wrap leading-loose">
                                {generatedDoc}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <Wand2 className="w-16 h-16 mb-4 text-slate-300" />
                            <p>Esperando instrucciones...</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
