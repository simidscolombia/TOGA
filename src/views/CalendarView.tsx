
import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { Button, Card, Modal } from '../components/UIComponents';
import { RefreshCw, Plus, Edit2, Trash2 } from 'lucide-react';

export const CalendarView = ({ events, onAddEvent, onUpdateEvent, onDeleteEvent, showToast }: { events: CalendarEvent[], onAddEvent: (e: CalendarEvent) => void, onUpdateEvent: (e: CalendarEvent) => void, onDeleteEvent: (id: string) => void, showToast: (t: any, m: string) => void }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventType, setEventType] = useState<'Audiencia' | 'Vencimiento' | 'Reunión'>('Audiencia');
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            showToast('success', 'Agenda sincronizada con Rama Judicial');
        }, 2000);
    };

    const openNew = () => {
        setEditingId(null);
        setEventTitle('');
        setEventDate('');
        setEventType('Audiencia');
        setIsModalOpen(true);
    };

    const openEdit = (e: CalendarEvent) => {
        setEditingId(e.id);
        setEventTitle(e.title);
        setEventDate(e.date.slice(0, 16)); // Format for datetime-local
        setEventType(e.type);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!eventTitle || !eventDate) return;

        const payload: CalendarEvent = {
            id: editingId || Date.now().toString(),
            title: eventTitle,
            date: new Date(eventDate).toISOString(),
            type: eventType
        };

        if (editingId) {
            onUpdateEvent(payload);
        } else {
            onAddEvent(payload);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        onDeleteEvent(id);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Agenda Judicial</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSync} isLoading={isSyncing}><RefreshCw className="w-4 h-4 mr-2" /> Sincronizar</Button>
                    <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Nuevo Evento</Button>
                </div>
            </div>
            <Card className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex justify-between font-bold text-slate-700">
                    <span>Próximos Eventos</span>
                    <span>{new Date().getFullYear()}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {events.length === 0 && <p className="text-center text-slate-400 mt-10">No hay eventos programados.</p>}
                    {events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(e => (
                        <div key={e.id} className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition-all items-center group bg-white">
                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-blue-50 text-blue-700 rounded-lg shrink-0">
                                <span className="text-xs font-bold uppercase">{new Date(e.date).toLocaleDateString('es-CO', { month: 'short' })}</span>
                                <span className="text-2xl font-bold">{new Date(e.date).getDate()}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800">{e.title}</h4>
                                <p className="text-sm text-slate-500">{new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {e.type}</p>
                            </div>
                            {/* Actions (Visible on Hover) */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(e)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(e.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${e.type === 'Vencimiento' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        </div>
                    ))}
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Evento" : "Nuevo Evento"}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Título</label>
                        <input className="w-full p-2 border rounded" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Ej: Audiencia Inicial" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Tipo</label>
                        <select className="w-full p-2 border rounded" value={eventType} onChange={e => setEventType(e.target.value as any)}>
                            <option value="Audiencia">Audiencia</option>
                            <option value="Vencimiento">Vencimiento</option>
                            <option value="Reunión">Reunión</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Fecha y Hora</label>
                        <input type="datetime-local" className="w-full p-2 border rounded" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                    </div>
                    <Button onClick={handleSave} className="w-full">{editingId ? 'Guardar Cambios' : 'Agendar'}</Button>
                </div>
            </Modal>
        </div>
    );
};
