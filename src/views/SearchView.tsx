
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

export const SearchView = ({ showToast, onSave, onAction }: { showToast: (t: any, m: string) => void, onSave: (t: string, c: string, type: string, tags?: string[], url?: string, analysis?: AnalyzedDecision) => void, onAction: (id: string) => void }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeDecision, setActiveDecision] = useState<SearchResult | null>(null);
    const [analysis, setAnalysis] = useState<AnalyzedDecision | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [viewTab, setViewTab] = useState<'analysis' | 'chat'>('analysis');
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

    // Refs for Audio
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsSearching(true);
        setActiveDecision(null);
        try {
            const data = await semanticSearch(query);
            setResults(data);
        } catch (err) {
            showToast('error', 'Error en la búsqueda');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRead = async (result: SearchResult) => {
        setActiveDecision(result);
        setAnalyzing(true);
        setViewTab('analysis');
        setChatHistory([]); // Reset chat
        const analyzed = await analyzeDecision(result.title, result.content);
        setAnalysis(analyzed);
        setAnalyzing(false);
    };

    const handleSaveToLibrary = () => {
        if (!activeDecision || !analysis) return;
        onSave(
            activeDecision.title,
            `### Resumen\n${analysis.summary}\n\n### Hechos\n${analysis.facts.map(f => `- ${f}`).join('\n')}\n\n### Resuelve\n${analysis.decision}`,
            DocType.JURISPRUDENCIA,
            analysis.tags,
            activeDecision.url,
            analysis
        );
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || !activeDecision) return;

        const userMsg = chatInput;
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setChatLoading(true);

        const answer = await chatWithDocument(activeDecision.content, userMsg);
        setChatHistory(prev => [...prev, { role: 'ai', text: answer }]);
        setChatLoading(false);
        onAction('chat_ai');
    };

    const toggleSpeech = async () => {
        if (!analysis) return;

        if (isPlaying) {
            // Stop playback
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
                sourceNodeRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            setIsPlaying(false);
            return;
        }

        // Start generation
        setIsGeneratingAudio(true);
        const textToRead = `Resumen del caso ${activeDecision?.title}. ${analysis.summary}. Decisión: ${analysis.decision}`;

        try {
            const base64Audio = await generateAudioFromText(textToRead);
            if (base64Audio) {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                audioContextRef.current = audioCtx;

                const audioBytes = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);

                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.onended = () => {
                    setIsPlaying(false);
                    sourceNodeRef.current = null;
                };
                source.start();
                sourceNodeRef.current = source;
                setIsPlaying(true);
            } else {
                showToast('error', 'No se pudo generar el audio.');
            }
        } catch (e) {
            console.error(e);
            showToast('error', 'Error reproduciendo audio.');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const copyCitation = () => {
        if (!activeDecision) return;
        const citation = `${activeDecision.title}, ${new Date().getFullYear()}, Fuente: ${activeDecision.source}`;
        navigator.clipboard.writeText(citation);
        showToast('success', 'Cita copiada');
    }

    // Cleanup audio on unmount or change
    useEffect(() => {
        return () => {
            if (sourceNodeRef.current) sourceNodeRef.current.stop();
            if (audioContextRef.current) audioContextRef.current.close();
        }
    }, [activeDecision]);

    if (activeDecision) {
        return (
            <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <button onClick={() => { setActiveDecision(null); }} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold line-clamp-1 flex-1 min-w-[200px]">{activeDecision.title}</h2>

                    {/* Actions Bar */}
                    <div className="flex items-center gap-2">
                        {/* View Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setViewTab('analysis')} className={`px-3 py-1 text-xs font-medium rounded ${viewTab === 'analysis' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Ficha</button>
                            <button onClick={() => setViewTab('chat')} className={`px-3 py-1 text-xs font-medium rounded ${viewTab === 'chat' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Chat</button>
                        </div>

                        <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                        <button
                            onClick={toggleSpeech}
                            disabled={isGeneratingAudio}
                            className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isPlaying ? 'text-red-500 bg-red-50' : 'text-slate-600'} ${isGeneratingAudio ? 'animate-pulse opacity-50' : ''}`}
                            title="Escuchar Resumen (Gemini TTS)"
                        >
                            {isGeneratingAudio ? <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button onClick={copyCitation} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors" title="Copiar Cita Jurídica">
                            <Quote className="w-4 h-4" />
                        </button>

                        <Button size="sm" onClick={handleSaveToLibrary} className="gap-2 hidden sm:flex">
                            <Bookmark className="w-4 h-4" /> Guardar
                        </Button>
                        <a href={activeDecision.url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                    {/* Left Panel: Analysis or Chat */}
                    <div className="lg:col-span-1 overflow-y-auto pr-2 flex flex-col h-full" data-toga-help="reader-analysis">
                        {viewTab === 'analysis' ? (
                            <div className="space-y-4">
                                <Card className="bg-blue-50 border-blue-100">
                                    <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> Análisis IA
                                    </h3>
                                    {analyzing ? (
                                        <div className="space-y-2 animate-pulse">
                                            <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-blue-200 rounded w-1/2"></div>
                                        </div>
                                    ) : analysis ? (
                                        <div className="text-sm space-y-4">
                                            <div>
                                                <span className="font-semibold text-blue-900 block mb-1">Resumen</span>
                                                <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-blue-900 block mb-1">Etiquetas</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {analysis.tags.map(t => (
                                                        <span key={t} className="px-2 py-0.5 bg-white rounded-full border border-blue-200 text-xs text-blue-700">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </Card>
                                {analysis && !analyzing && (
                                    <Card title="Ficha Técnica" className="text-sm">
                                        <div className="space-y-3">
                                            <div>
                                                <span className="font-bold block text-slate-700">Hechos Relevantes</span>
                                                <ul className="list-disc pl-4 text-slate-600 space-y-1 mt-1">
                                                    {analysis.facts.slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <span className="font-bold block text-slate-700">Decisión (Resuelve)</span>
                                                <p className="p-2 bg-green-50 text-green-800 rounded border border-green-100 mt-1">
                                                    {analysis.decision}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <Card className="h-full flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
                                <div className="bg-white p-3 border-b text-sm font-semibold flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-blue-500" /> Chat con Sentencia
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {chatHistory.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center mt-10">Pregunta algo sobre este documento...</p>
                                    )}
                                    {chatHistory.map((m, i) => (
                                        <div key={i} className={`p-2 rounded-lg text-sm max-w-[90%] ${m.role === 'user' ? 'bg-blue-100 text-blue-900 self-end ml-auto' : 'bg-white border text-slate-800'}`}>
                                            {m.text}
                                        </div>
                                    ))}
                                    {chatLoading && <div className="text-xs text-slate-400 animate-pulse ml-2">Escribiendo...</div>}
                                </div>
                                <div className="p-2 bg-white border-t flex gap-2">
                                    <input
                                        className="flex-1 text-xs border rounded p-2"
                                        placeholder="Ej: ¿Qué dijo sobre..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                    />
                                    <button onClick={handleSendChat} disabled={!chatInput} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                                        <Send className="w-3 h-3" />
                                    </button>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Document Content */}
                    <Card className="lg:col-span-2 overflow-y-auto h-full">
                        <div className="prose prose-sm max-w-none font-serif">
                            <p className="text-center text-slate-400 italic mb-4">Vista previa del contenido extraído...</p>
                            <MarkdownRenderer content={activeDecision.content} />
                            <div className="mt-8 pt-8 border-t text-center">
                                <Button variant="outline" onClick={() => window.open(activeDecision.url, '_blank')}>
                                    Leer Sentencia Completa en Fuente Original
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // --- SEARCH LIST MODE ---
    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Buscador Inteligente</h2>
                <p className="text-slate-500">Investiga jurisprudencia con análisis IA instantáneo.</p>
            </div>

            <form onSubmit={handleSearch} className="relative mb-8" data-toga-help="search-input">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ej: 'Sentencias sobre estabilidad laboral reforzada'..."
                    className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 text-lg"
                />
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                <Button type="submit" isLoading={isSearching} className="absolute right-2 top-2 bottom-2">Buscar</Button>
            </form>

            <div className="space-y-4">
                {results.map((item, idx) => (
                    <div key={idx} onClick={() => handleRead(item)} className="cursor-pointer group">
                        <Card className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-blue-500">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold text-blue-700 group-hover:underline">{item.title}</h3>
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1">
                                    {item.source} <BookOpen className="w-3 h-3" />
                                </span>
                            </div>
                            <p className="text-slate-600 line-clamp-2 text-sm">{item.content}</p>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};
