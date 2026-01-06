
import React, { useState } from 'react';
import { SavedDocument, DocType } from '../types';
import { FileText, BookOpen, Library } from 'lucide-react';

export const LibraryView = ({ docs, onOpen }: { docs: SavedDocument[], onOpen: (doc: SavedDocument) => void }) => {
    const [tab, setTab] = useState<'drafts' | 'research'>('drafts');

    const drafts = docs.filter(d => d.type !== DocType.JURISPRUDENCIA);
    const research = docs.filter(d => d.type === DocType.JURISPRUDENCIA);

    const displayedDocs = tab === 'drafts' ? drafts : research;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Biblioteca</h2>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedDocs.map(doc => (
                        <div key={doc.id} onClick={() => onOpen(doc)} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md cursor-pointer hover:border-blue-400 group relative">
                            <div className="flex items-start justify-between mb-2">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${tab === 'research' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                    {tab === 'research' ? <BookOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <span className="text-[10px] text-slate-400">{new Date(doc.timestamp).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-semibold text-slate-900 line-clamp-2 mb-1">{doc.title}</h4>
                            {tab === 'research' && doc.tags && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {doc.tags.slice(0, 3).map(t => (
                                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{t}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
