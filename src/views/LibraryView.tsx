import React, { useState } from 'react';
import { SavedDocument, DocType } from '../types';
import { FileText, BookOpen, Library, X, Sparkles, ExternalLink, Calendar } from 'lucide-react';
import { Button, Card, MarkdownRenderer } from '../components/UIComponents';

export const LibraryView = ({ docs, onOpen }: { docs: SavedDocument[], onOpen: (doc: SavedDocument) => void }) => {
    const [tab, setTab] = useState<'drafts' | 'research'>('drafts');
    const [selectedDoc, setSelectedDoc] = useState<SavedDocument | null>(null);

    const drafts = docs.filter(d => d.type !== DocType.JURISPRUDENCIA);
    const research = docs.filter(d => d.type === DocType.JURISPRUDENCIA);

    const displayedDocs = tab === 'drafts' ? drafts : research;

    const handleCardClick = (doc: SavedDocument) => {
        if (doc.type === DocType.JURISPRUDENCIA) {
            setSelectedDoc(doc);
        } else {
            // Drafts go to Drafter via parent handler
            onOpen(doc);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Biblioteca Jurídica</h2>
                <div className="flex bg-slate-100 p-1 rounded-lg" data-toga-help="library-tabs">
                    <button
                        onClick={() => setTab('drafts')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'drafts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Mis Borradores
                    </button>
                    <button
                        onClick={() => setTab('research')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'research' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Investigación
                    </button>
                </div>
            </div>

            {displayedDocs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Library className="w-16 h-16 mb-4 opacity-20" />
                    <p>No hay elementos en esta sección.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 overflow-y-auto">
                    {displayedDocs.map(doc => (
                        <div key={doc.id} onClick={() => handleCardClick(doc)} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md cursor-pointer hover:border-blue-400 group relative transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${tab === 'research' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                    {tab === 'research' ? <BookOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(doc.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                            <h4 className="font-semibold text-slate-900 line-clamp-2 mb-2 leading-tight">{doc.title}</h4>

                            {/* Tags or Snippet */}
                            <div className="flex flex-wrap gap-1 mt-auto">
                                {doc.tags?.slice(0, 3).map(t => (
                                    <span key={t} className="text-[10px] px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-full">{t}</span>
                                ))}
                            </div>

                            {/* Analysis Indicator */}
                            {doc.analysis && (
                                <div className="absolute top-4 right-4 text-amber-400 animate-pulse" title="¡Análisis IA incluido!">
                                    <Sparkles className="w-4 h-4 fill-amber-400" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* --- SLIDE-OVER VIEWER FOR RESEARCH DOCS --- */}
            {selectedDoc && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedDoc(null)} />

                    <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800 line-clamp-1 pr-4">{selectedDoc.title}</h3>
                            <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Metadata Header */}
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 pb-4 border-b">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">JURISPRUDENCIA</span>
                                <span>•</span>
                                <span>Guardado el {new Date(selectedDoc.timestamp).toLocaleDateString()}</span>
                                {selectedDoc.sourceUrl && (
                                    <a href={selectedDoc.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-blue-600 hover:underline">
                                        Fuente Original <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>

                            {/* AI Analysis Section (if available) */}
                            {selectedDoc.analysis ? (
                                <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                                    <h4 className="flex items-center gap-2 font-bold text-blue-900 mb-4">
                                        <Sparkles className="w-4 h-4 text-blue-600" /> Ficha Técnica IA
                                    </h4>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <span className="font-semibold text-slate-700 block mb-1">Síntesis:</span>
                                            <p className="text-slate-600 italic leading-relaxed">{selectedDoc.analysis.summary}</p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-700 block mb-1">Decisión:</span>
                                            <div className="bg-white p-3 rounded border border-blue-100 text-slate-800">
                                                {selectedDoc.analysis.decision}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-700 block mb-1">Tags:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedDoc.tags?.map(t => <span key={t} className="bg-white px-2 py-0.5 border border-blue-100 rounded text-xs text-blue-600">{t}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-400 text-sm">
                                    Sin análisis IA asociado.
                                </div>
                            )}

                            {/* Full Content */}
                            <div className="pt-4">
                                <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Contenido Guardado</h4>
                                <div className="prose prose-sm max-w-none font-serif text-slate-700">
                                    <MarkdownRenderer content={selectedDoc.content} />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-slate-50 flex justify-end">
                            <Button variant="secondary" onClick={() => setSelectedDoc(null)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
