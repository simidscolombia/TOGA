import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Database, Search } from 'lucide-react';
import { JurisprudenceService } from '../services/jurisprudenceService';
import { User, Jurisprudence } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
    user: User | null;
}

export default function JurisprudenceView({ user }: Props) {
    // Fallback key if user doesn't have one? For now assume User has key or Sys Env
    const apiKey = String(user?.apiKeys?.gemini || import.meta.env.VITE_GEMINI_API_KEY || '');

    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [resultMsg, setResultMsg] = useState('');
    const [recentItems, setRecentItems] = useState<Jurisprudence[]>([]);

    // Load recent items on mount
    React.useEffect(() => {
        loadRecent();
    }, []);

    const loadRecent = async () => {
        if (!supabase) return;
        const { data } = await supabase
            .from('jurisprudence')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (data) setRecentItems(data as Jurisprudence[]);
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        if (!apiKey) {
            alert("No se encontró API Key de Gemini. Configúrala en tu perfil para usar la IA.");
            return;
        }

        setStatus('processing');
        setResultMsg('La IA está leyendo el documento... esto puede tardar unos segundos.');

        try {
            const result = await JurisprudenceService.processDocument(file, apiKey, 'bulletin', user?.id);

            if (result.saved > 0) {
                setStatus('success');
                // Check if errors exist even if saved (means Fallback was used)
                if (result.errors.length > 0) {
                    setResultMsg(`Guardado como borrador (IA no disponible). Errores: ${result.errors.join(', ')}`);
                } else {
                    setResultMsg(`¡Éxito! Guardadas: ${result.saved}.`);
                }
            } else if (result.skipped > 0) {
                setStatus('processing'); // Use yellow/neutral visual if possible, or keep processing style for warning
                setResultMsg(`El documento ya existía (Duplicado). No se guardaron cambios.`);
            } else if (result.errors.length > 0) {
                setStatus('error');
                setResultMsg(`Error al guardar: ${result.errors.join(', ')}`);
            } else {
                setStatus('error');
                setResultMsg("Error desconocido: No se guardó nada.");
            }

            setFile(null);
            setTimeout(() => loadRecent(), 1000); // 1s delay to ensure Supabase consistency

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setResultMsg('Error: ' + error.message);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                    Jurisprudencia Viva
                </h1>
                <p className="text-slate-400 mt-2">
                    Importa boletines semanales o sentencias completas. La IA organizará todo por ti.
                </p>
            </div>

            {/* Upload Section */}
            <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
                    ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}
                `}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => e.target.files && setFile(e.target.files[0])}
                />

                <div className="flex flex-col items-center gap-4">
                    <div className={`p-4 rounded-full ${file ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                        {status === 'processing' ? (
                            <div className="animate-spin text-2xl">⏳</div>
                        ) : (
                            <Upload size={32} />
                        )}
                    </div>

                    {file ? (
                        <div>
                            <p className="text-lg font-medium text-white">{file.name}</p>
                            <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-lg font-medium text-slate-200">Arrastra tu Boletín o Sentencia aquí</p>
                            <p className="text-sm text-slate-500">Soporta PDF y Word</p>
                        </div>
                    )}
                </div>

                {file && status !== 'processing' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleProcess(); }}
                        className="mt-6 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all"
                    >
                        Procesar con IA
                    </button>
                )}
            </div>

            {/* Status Messages */}
            {status === 'success' && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400">
                    <CheckCircle size={20} />
                    <span>{resultMsg}</span>
                </div>
            )}
            {status === 'error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle size={20} />
                    <span>{resultMsg}</span>
                </div>
            )}

            {/* Recent Items Table */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Database size={18} className="text-blue-400" />
                        Últimas Importaciones
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-800/50 text-slate-200 font-medium">
                            <tr>
                                <th className="p-4">Radicado</th>
                                <th className="p-4">Sentencia ID</th>
                                <th className="p-4">Tesis (Resumen)</th>
                                <th className="p-4">Origen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {recentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                        No hay sentencias importadas aún.
                                    </td>
                                </tr>
                            ) : (
                                recentItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-mono text-blue-300">{item.radicado}</td>
                                        <td className="p-4">{item.sentencia_id || '-'}</td>
                                        <td className="p-4 max-w-md truncate text-slate-300" title={item.tesis}>
                                            {item.tema && <span className="block text-xs text-indigo-400 mb-1">{item.tema}</span>}
                                            {item.tesis}
                                        </td>
                                        <td className="p-4">
                                            {item.source_url ? (
                                                <a href={item.source_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                                                    Link ↗
                                                </a>
                                            ) : (
                                                <span className="text-slate-600">Local</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
