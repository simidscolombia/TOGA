
import React, { useState, useRef, useEffect } from 'react';
import { SearchResult, AnalyzedDecision, DocType } from '../types';
import { semanticSearch, analyzeDecision, chatWithDocument, generateAudioFromText } from '../services/geminiService';
import { Button, Card, MarkdownRenderer } from '../components/UIComponents';
import { Search as SearchIcon, BookOpen, ArrowLeft, Send, Sparkles, MessageCircle, Play, Pause, Quote, Bookmark, ExternalLink } from 'lucide-react';

// --- UTILS FOR PCM AUDIO ---
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export const SearchView = ({ initialQuery, showToast, onSave, onAction }: { initialQuery?: string, showToast: (t: any, m: string) => void, onSave: (t: string, c: string, type: string, tags?: string[], url?: string, analysis?: AnalyzedDecision) => void, onAction: (id: string) => void }) => {
    const [query, setQuery] = useState(initialQuery || '');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Preview State (Slide-Over)
    const [activeDecision, setActiveDecision] = useState<SearchResult | null>(null);

    const [analysis, setAnalysis] = useState<AnalyzedDecision | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Chat & Audio State
    const [viewTab, setViewTab] = useState<'content' | 'analysis' | 'chat'>('content');
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Audio State (Kept from original)
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    // Initial Search on Load
    useEffect(() => {
        if (initialQuery && initialQuery.trim()) {
            handleSearch(new Event('submit') as any);
        }
    }, [initialQuery]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsSearching(true);
        setActiveDecision(null); // Close sidebar on new search
        try {
            // [CHANGED] Use Database Search
            const data = await import('../services/dataService').then(m => m.DataService.searchJurisprudence(query));
            setResults(data);
            if (data.length === 0) showToast('info', 'No se encontraron coincidencias exactas.');
        } catch (err) {
            console.error(err);
            showToast('error', 'Error en la búsqueda');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRead = async (result: SearchResult) => {
        setActiveDecision(result);
        setViewTab('content'); // Start reading content
        // Reset analysis when opening new doc
        setAnalysis(null);
        setChatHistory([]);
    };

    const handleGenerateSummary = async () => {
        if (!activeDecision) return;
        setAnalyzing(true);
        setViewTab('analysis');
        try {
            // Call Gemini
            const analyzed = await analyzeDecision(activeDecision.title, activeDecision.content);
            setAnalysis(analyzed);
        } catch (e) {
            showToast('error', 'Error generando resumen');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSaveToLibrary = () => {
        if (!activeDecision) return;
        // If no analysis yet, just save raw. If analysis exists, include it.
        onSave(
            activeDecision.title,
            activeDecision.content, // Save full content
            DocType.JURISPRUDENCIA,
            analysis?.tags,
            activeDecision.url,
            analysis || undefined
        );
        onAction('upload_doc'); // Trigger Quest
    };

    // --- Highlighting Logic ---
    const getHighlightedText = (text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ?
                        <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 font-bold">{part}</mark> :
                        part
                )}
            </span>
        );
    };

    return (
        <div className="relative h-full flex flex-col max-w-5xl mx-auto">
            {/* 1. Header & Search Bar */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Motor de Búsqueda Jurídica</h2>
                <p className="text-slate-500 mb-6">Explora nuestra base de jurisprudencia y doctrina.</p>

                <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto" data-toga-help="search-input">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ej: 'Sentencia SU-012 derechos fundamentales'..."
                        className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-lg transition-all"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                    <Button type="submit" isLoading={isSearching} className="absolute right-2 top-2 bottom-2 rounded-xl">Buscar</Button>
                </form>
            </div>

            {/* 2. Results List */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                {results.length > 0 ? (
                    results.map((item, idx) => (
                        <div key={idx} onClick={() => handleRead(item)} className="cursor-pointer group">
                            <Card className="hover:shadow-lg transition-all border border-slate-100 hover:border-blue-200 group-hover:-translate-y-0.5 duration-300">
                                <div className="flex gap-4">
                                    <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 mb-1">
                                            {getHighlightedText(item.title, query)}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded">{item.source || 'Fuente Externa'}</span>
                                            {item.tags?.map(t => <span key={t} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{t}</span>)}
                                        </div>
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                            {getHighlightedText(item.content || '', query)} // Preview snippet
                                        </p>
                                    </div>
                                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="sm" className="text-blue-600">Leer <ArrowLeft className="w-4 h-4 rotate-180 ml-1" /></Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))
                ) : (
                    !isSearching && query && <div className="text-center text-slate-400 py-10">No se encontraron resultados para "{query}"</div>
                )}
            </div>

            {/* 3. SLIDE-OVER PREVIEW DRAWER */}
            {activeDecision && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setActiveDecision(null)} />

                    {/* Drawer Panel */}
                    <div className="relative w-full max-w-3xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

                        {/* Drawer Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-slate-50/80 backdrop-blur">
                            <h3 className="font-bold text-lg text-slate-800 line-clamp-1 flex-1 pr-4">{activeDecision.title}</h3>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="secondary" onClick={handleSaveToLibrary} title="Guardar en Biblioteca">
                                    <Bookmark className="w-4 h-4 mr-2" /> Guardar
                                </Button>
                                <button onClick={() => setActiveDecision(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <ArrowLeft className="w-5 h-5 rotate-180" />
                                </button>
                            </div>
                        </div>

                        {/* Drawer Navigation Tabs */}
                        <div className="flex border-b px-4 gap-6 bg-white">
                            <button
                                onClick={() => setViewTab('content')}
                                className={`py-3 text-sm font-medium border-b-2 transition-colors ${viewTab === 'content' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Texto Completo
                            </button>
                            <button
                                onClick={() => setViewTab('analysis')}
                                className={`py-3 text-sm font-medium border-b-2 transition-colors ${viewTab === 'analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <Sparkles className="w-3 h-3 inline mr-1" /> Análisis IA
                            </button>
                            <button
                                onClick={() => setViewTab('chat')}
                                className={`py-3 text-sm font-medium border-b-2 transition-colors ${viewTab === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Chat
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            {viewTab === 'content' && (
                                <div className="prose prose-sm max-w-none font-serif text-slate-800">
                                    {/* Content with Highlights */}
                                    <div className="whitespace-pre-wrap leading-relaxed">
                                        {getHighlightedText(activeDecision.content || 'Sin contenido visualizable.', query)}
                                    </div>
                                    <div className="mt-8 pt-6 border-t flex justify-center">
                                        <Button onClick={handleGenerateSummary} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                                            <Sparkles className="w-4 h-4 mr-2" /> Generar Resumen con IA
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {viewTab === 'analysis' && (
                                <div className="space-y-6">
                                    {!analysis && !analyzing && (
                                        <div className="text-center py-12">
                                            <p className="text-slate-500 mb-4">Aún no has analizado este documento.</p>
                                            <Button onClick={handleGenerateSummary}>
                                                <Sparkles className="w-4 h-4 mr-2" /> Generar Informe Ejecutivo
                                            </Button>
                                        </div>
                                    )}

                                    {analyzing && (
                                        <div className="space-y-4 animate-pulse">
                                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                                            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                            <div className="h-40 bg-slate-100 rounded-lg w-full mt-4"></div>
                                            <p className="text-center text-xs text-blue-500 font-medium">Gemini está leyendo la sentencia...</p>
                                        </div>
                                    )}

                                    {analysis && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <h4 className="font-bold text-blue-900 mb-2">📌 Síntesis</h4>
                                                <p className="text-sm text-slate-700">{analysis.summary}</p>
                                            </div>

                                            <div>
                                                <h4 className="font-bold text-slate-800 mb-2">Hechos Relevantes</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                                                    {analysis.facts.map((f, i) => <li key={i}>{f}</li>)}
                                                </ul>
                                            </div>

                                            <div>
                                                <h4 className="font-bold text-slate-800 mb-2">Decisión (Resuelve)</h4>
                                                <div className="p-3 bg-green-50 text-green-800 text-sm rounded border border-green-100 font-medium">
                                                    {analysis.decision}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Chat Tab - Implement logic similar to before if needed, or keep simple */}
                            {viewTab === 'chat' && (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 text-slate-400 flex items-center justify-center text-sm">
                                        Chat disponible en versión PRO.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
