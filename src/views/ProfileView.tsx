
import React, { useState, useEffect } from 'react';
import { User, SavedDocument, CalendarEvent, Post, Transaction } from '../types';
import { DataService } from '../services/dataService';
import { Card, Button } from '../components/UIComponents';
import { Check, Edit2, Download, Shield, History, ArrowDownRight } from 'lucide-react';

export const ProfileView = ({ user, docs, events, posts, onUpdateUser, onUpgrade, onLogout, showToast }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [editUrl, setEditUrl] = useState(user.avatarUrl || '');

    // API Keys State
    const [openAIKey, setOpenAIKey] = useState(user.apiKeys?.openai || '');
    const [anthropicKey, setAnthropicKey] = useState(user.apiKeys?.anthropic || '');

    // Transactions State
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        DataService.getTransactions(user.id).then(setTransactions);
    }, [user.id]);

    const handleSaveProfile = () => {
        onUpdateUser({ ...user, name: editName, avatarUrl: editUrl });
        setIsEditing(false);
    };

    const handleSaveKeys = async () => {
        const updatedUser = {
            ...user,
            apiKeys: {
                ...user.apiKeys,
                openai: openAIKey,
                anthropic: anthropicKey
            }
        };
        await DataService.updateUser(updatedUser);
        onUpdateUser(updatedUser); // Update local app state
        showToast('success', 'Llaves API guardadas correctamente');
    };

    const handleBackup = () => {
        const backupData = { user, docs, events, posts, timestamp: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `toga_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showToast('success', 'Backup descargado');
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card className="mb-6" >
                <div className="flex flex-col items-center text-center p-6" data-toga-help="profile-card">
                    <div className="w-24 h-24 rounded-full bg-slate-200 mb-4 overflow-hidden relative group">
                        {isEditing ? (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <input type="text" className="text-xs p-1 w-20" placeholder="URL" value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                            </div>
                        ) : (
                            user.avatarUrl && <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        )}
                    </div>
                    {isEditing ? (
                        <input className="text-2xl font-bold text-center border-b mb-2" value={editName} onChange={e => setEditName(e.target.value)} />
                    ) : (
                        <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
                    )}
                    <p className="text-slate-500 mb-4">{user.email}</p>
                    <div className="flex gap-4">
                        {isEditing ? (
                            <Button size="sm" onClick={handleSaveProfile}><Check className="w-4 h-4 mr-1" /> Guardar</Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}><Edit2 className="w-4 h-4 mr-1" /> Editar</Button>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                            {user.role === 'PREMIUM' ? 'Premium' : 'Gratis'}
                        </div>
                    </div>

                    {/* AI Wallet & Preferences */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6 w-full text-left">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="bg-purple-100 text-purple-600 p-1 rounded-lg">💎</span>
                            Billetera & IA
                        </h3>

                        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Tu Saldo</p>
                                <p className="text-3xl font-bold text-slate-800">{user.togaCoins || 0} <span className="text-sm font-normal text-slate-400">TogaCoins</span></p>
                            </div>
                            <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm">
                                Recargar
                            </button>
                        </div>

                        {/* Transaction History */}
                        {transactions.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <History className="w-3 h-3" /> Últimos Movimientos
                                </h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {transactions.slice(0, 5).map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded">
                                            <div>
                                                <p className="font-medium text-slate-700">{tx.action}</p>
                                                <p className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleDateString()} - {tx.modelUsed}</p>
                                            </div>
                                            <span className={`font-mono font-bold ${tx.cost > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                {tx.cost > 0 ? `-${tx.cost}` : '0'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <p className="text-sm text-slate-600">Configura tus propias llaves para uso ilimitado (BYOK):</p>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700">OpenAI API Key (GPT-4)</label>
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-200 outline-none"
                                    value={openAIKey}
                                    onChange={(e) => setOpenAIKey(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700">Anthropic API Key (Claude)</label>
                                <input
                                    type="password"
                                    placeholder="sk-ant-..."
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-200 outline-none"
                                    value={anthropicKey}
                                    onChange={(e) => setAnthropicKey(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end mt-2">
                                <button onClick={handleSaveKeys} className="text-xs text-purple-600 font-medium hover:underline">
                                    Guardar Configuración IA
                                </button>
                            </div>
                        </div>
                    </div>
                </div> {/* Closes the flex flex-col items-center text-center p-6 div */}

                {/* Stats - Existing Logic */}
                <div className="border-t border-slate-100 p-6 flex justify-around">
                    <div className="text-center">
                        <div className="text-xl font-bold text-slate-900">{user.reputation}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">Reputación</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-bold text-slate-900">{docs.length}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">Docs</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-bold text-slate-900">{posts.length}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">Posts</div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <button onClick={handleBackup} className="p-4 bg-white border rounded-xl hover:shadow-md text-left flex flex-col gap-2 group">
                    <Download className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                    <span className="font-semibold text-slate-700">Exportar Datos</span>
                    <span className="text-xs text-slate-400">Descarga un JSON con tu info.</span>
                </button>
                <button className="p-4 bg-white border rounded-xl hover:shadow-md text-left flex flex-col gap-2 group">
                    <Shield className="w-6 h-6 text-slate-400 group-hover:text-green-600" />
                    <span className="font-semibold text-slate-700">Privacidad</span>
                    <span className="text-xs text-slate-400">Gestiona tus permisos.</span>
                </button>
            </div>

            {user.role !== 'PREMIUM' && (
                <div data-toga-help="profile-upgrade" className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white text-center shadow-xl">
                    <h3 className="text-2xl font-bold mb-2">Sube de Nivel</h3>
                    <p className="text-slate-300 mb-6">Acceso ilimitado a herramientas de IA.</p>
                    <Button variant="premium" onClick={onUpgrade} className="px-8 py-3 text-lg">
                        Mejorar a Premium
                    </Button>
                </div>
            )}

            <div className="mt-8 text-center">
                <button onClick={onLogout} className="text-red-500 hover:text-red-700 text-sm font-medium">Cerrar Sesión</button>
            </div>
        </div>
    );
};
