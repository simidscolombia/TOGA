
import React, { useState } from 'react';
import { User, SavedDocument, CalendarEvent, Post } from '../types';
import { Card, Button } from '../components/UIComponents';
import { Check, Edit2, Download, Shield } from 'lucide-react';

export const ProfileView = ({ user, docs, events, posts, onUpdateUser, onUpgrade, onLogout, showToast }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [editUrl, setEditUrl] = useState(user.avatarUrl || '');

    const handleSaveProfile = () => {
        onUpdateUser({ ...user, name: editName, avatarUrl: editUrl });
        setIsEditing(false);
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
                </div>
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
