import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Database, Search, FileType, X, Trash2 } from 'lucide-react';
import { JurisprudenceService } from '../services/jurisprudenceService';
import { User, Jurisprudence } from '../types';
import { supabase } from '../services/supabaseClient';
import { Card, Button } from '../components/UIComponents';

interface Props {
    user: User | null;
}

export default function JurisprudenceView({ user }: Props) {
    const apiKey = String(user?.apiKeys?.gemini || import.meta.env.VITE_GEMINI_API_KEY || '');
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>('idle');
    const [resultMsg, setResultMsg] = useState('');
    const [recentItems, setRecentItems] = useState<Jurisprudence[]>([]);

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
        setStatus('idle');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        if (!apiKey) {
            alert("No se encontró API Key de Gemini. Por favor verifica tu configuración.");
            return;
        }

        setStatus('processing');
        setResultMsg('Analizando documento y extrayendo datos jurídicos...');

        try {
            // Determine type loosely based on filename content, default to upload
            const type = file.name.toLowerCase().includes('boletin') ? 'bulletin' : 'upload';
            const result = await JurisprudenceService.processDocument(file, apiKey, type);

            if (result.saved > 0) {
                setStatus('success');
                if (result.errors.length > 0) {
                    setResultMsg(`Guardado parcialmente. Algunos errores: ${result.errors.join(', ')}`);
                } else {
                    setResultMsg(`¡Procesado con éxito! Se han indexado ${result.saved} registro(s).`);
                }
            } else if (result.skipped > 0) {
                setStatus('success');
                setResultMsg(`El documento ya estaba en el sistema (Duplicado).`);
            } else if (result.errors.length > 0) {
                setStatus('error');
                setResultMsg(`No se pudo guardar: ${result.errors.join(', ')}`);
            } else {
                setStatus('error');
                setResultMsg("No se extrajo información válida.");
            }

            setFile(null);
            setTimeout(() => loadRecent(), 1500);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setResultMsg('Error técnico: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este documento de la base de datos?')) return;

        if (!supabase) return;

        try {
            const { error } = await supabase.from('jurisprudence').delete().eq('id', id);
            if (error) throw error;

            // Update UI instantly
            setRecentItems(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            console.error(err);
            alert('Error al eliminar: ' + err.message);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col">

            {/* Header */}
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-slate-900">
                    Centro de Carga Jurisprudencial
                </h1>
                <p className="text-slate-500 mt-2">
                    Alimenta la base de datos del Buscador subiendo sentencias o boletines oficiales.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Left: Upload Area */}
                <div className="lg:col-span-1 h-full"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}>

                    <Card className="h-full flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-slate-50 transition-all cursor-pointer group p-8">

                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept=".pdf,.docx,.doc,.txt"
                            onChange={(e) => { setStatus('idle'); if (e.target.files) setFile(e.target.files[0]); }}
                        />

                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${file ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500'}`}>
                            {status === 'processing' ? <div className="animate-spin text-3xl">⏳</div> : <Upload className="w-10 h-10" />}
                        </div>

                        {file ? (
                            <div className="w-full animate-fade-in">
                                <p className="text-lg font-bold text-slate-800 break-words mb-1">{file.name}</p>
                                <p className="text-sm text-slate-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                                {status === 'processing' ? (
                                    <div className="space-y-2">
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 animate-progress"></div>
                                        </div>
                                        <p className="text-xs text-blue-600 font-medium animate-pulse">{resultMsg}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {status === 'success' ? (
                                            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center justify-center gap-2">
                                                <CheckCircle className="w-4 h-4" /> {resultMsg}
                                            </div>
                                        ) : status === 'error' ? (
                                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center justify-center gap-2">
                                                <AlertCircle className="w-4 h-4" /> {resultMsg}
                                            </div>
                                        ) : (
                                            <Button onClick={(e) => { e.stopPropagation(); handleProcess(); }} className="w-full">
                                                Procesar e Indexar
                                            </Button>
                                        )}

                                        {status !== 'processing' && (
                                            <button onClick={(e) => { e.stopPropagation(); setFile(null); setStatus('idle'); }} className="text-xs text-slate-400 hover:text-red-500 underline">
                                                Cancelar / Limpiar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <p className="text-lg font-semibold text-slate-700 mb-1">Haz clic o arrastra aquí</p>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                    Soporta PDF, Word (.docx) y texto.
                                    <br />
                                    <span className="text-xs opacity-70 mt-2 block">Ideal para sentencias individuales o boletines relatoría.</span>
                                </p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: Recent Uploads List */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Database className="w-4 h-4 text-blue-500" />
                                Base de Datos Reciente
                            </h3>
                            <Button variant="ghost" size="sm" onClick={loadRecent}>Refrescar</Button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {recentItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                                    <FileType className="w-12 h-12 mb-2 opacity-20" />
                                    <p>Tu base de datos está vacía.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-3 pl-4">Radicado</th>
                                            <th className="p-3 hidden sm:table-cell">ID</th>
                                            <th className="p-3">Tesis / Tema</th>
                                            <th className="p-3 text-right pr-4">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recentItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                                                <td className="p-3 pl-4 font-mono text-xs font-semibold text-slate-600">{item.radicado}</td>
                                                <td className="p-3 hidden sm:table-cell text-xs text-slate-500">{item.sentencia_id || '-'}</td>
                                                <td className="p-3 max-w-md">
                                                    {item.tema && <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] uppercase font-bold mb-1 tracking-wide">{item.tema}</span>}
                                                    <p className="line-clamp-2 text-slate-700 leading-snug" title={item.tesis}>{item.tesis}</p>
                                                </td>
                                                <td className="p-3 text-right pr-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.analysis_level === 'deep' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {item.analysis_level === 'deep' ? 'Indexado' : 'Básico'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Eliminar registro"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
