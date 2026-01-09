
import React, { useState } from 'react';
import { SavedDocument, DocType } from '../types';
import { Button, Card } from '../components/UIComponents';
import { Calculator, Calendar, TrendingUp, Bookmark, Library } from 'lucide-react';

export const ToolsView = ({ onSave, docs }: { onSave: (title: string, content: string, type: string) => void, docs: SavedDocument[] }) => {
    const [activeTool, setActiveTool] = useState<'labor' | 'term' | 'ipc'>('labor');
    const [viewDoc, setViewDoc] = useState<SavedDocument | null>(null);

    // Filter Saved Liquidations
    const savedLiquidations = docs.filter(d => d.type === DocType.LIQUIDACION);

    // Labor State
    const [salary, setSalary] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [hasTransport, setHasTransport] = useState('Sí');
    const [laborResult, setLaborResult] = useState<any>(null);

    // Term State
    const [termDate, setTermDate] = useState('');
    const [termDays, setTermDays] = useState('');
    const [termResult, setTermResult] = useState<string>('');

    // IPC State
    const [capital, setCapital] = useState('');
    const [ipcInitial, setIpcInitial] = useState('');
    const [ipcFinal, setIpcFinal] = useState('');
    const [ipcResult, setIpcResult] = useState<string>('');

    // Colombian Holidays 2024-2025 (YYYY-MM-DD)
    const HOLIDAYS = [
        // 2024
        '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
        '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
        '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
        '2024-11-11', '2024-12-08', '2024-12-25',
        // 2025 (Estimados)
        '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
        '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30', '2025-07-20',
        '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17',
        '2025-12-08', '2025-12-25'
    ];

    // --- LOGIC ---

    const calculateLabor = () => {
        if (!salary || !startDate || !endDate) return;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive

        const sal = parseFloat(salary);
        const transport = hasTransport === 'Sí' ? 162000 : 0; // Approx 2024 value
        const base = sal + transport;

        const cesantias = (base * days) / 360;
        const intereses = (cesantias * days * 0.12) / 360;
        const prima = (base * days) / 360; // Simplified
        const vacaciones = (sal * days) / 720;

        setLaborResult({ cesantias, intereses, prima, vacaciones, total: cesantias + intereses + prima + vacaciones });
    };

    const isBusinessDay = (date: Date) => {
        const day = date.getDay();
        if (day === 0 || day === 6) return false; // Weekend
        const msg = date.toISOString().split('T')[0];
        if (HOLIDAYS.includes(msg)) return false; // Holiday
        return true;
    };

    const calculateTerm = () => {
        if (!termDate || !termDays) return;
        const start = new Date(termDate);
        // Fix Timezone offset issue by setting hours to noon to avoid day shifting
        start.setHours(12, 0, 0, 0);

        const daysToAdd = parseInt(termDays);
        let count = 0;
        let current = new Date(start);

        // Advance 1 day first to start counting from next business day
        // current.setDate(current.getDate() + 1);

        while (count < daysToAdd) {
            current.setDate(current.getDate() + 1);
            if (isBusinessDay(current)) {
                count++;
            }
        }
        setTermResult(current.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };

    const calculateIPC = () => {
        if (!capital || !ipcInitial || !ipcFinal) return;
        const val = parseFloat(capital);
        const init = parseFloat(ipcInitial);
        const final = parseFloat(ipcFinal);

        if (init === 0) return;

        // Formula: VP = VH * (IPC Final / IPC Inicial)
        const inflated = val * (final / init);
        setIpcResult(inflated.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }));
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6" data-toga-help="tools-tab">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Calculadoras Jurídicas</h2>
                <p className="text-slate-500">Herramientas esenciales para tu práctica diaria.</p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
                {[
                    { id: 'labor', label: 'Liquidación Laboral', icon: Calculator },
                    { id: 'term', label: 'Vencimiento Términos', icon: Calendar },
                    { id: 'ipc', label: 'Indexación / IPC', icon: TrendingUp }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTool(t.id as any)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all w-32 ${activeTool === t.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                    >
                        <t.icon className="w-6 h-6" />
                        <span className="text-xs font-bold text-center">{t.label}</span>
                    </button>
                ))}
            </div>

            <Card className="min-h-[300px]">
                {activeTool === 'labor' && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg mb-4">Liquidación de Prestaciones Sociales</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Salario Mensual</label>
                                <input type="number" value={salary} onChange={e => setSalary(e.target.value)} className="w-full p-2 border rounded" placeholder="$ 0" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Auxilio Transporte</label>
                                <select value={hasTransport} onChange={e => setHasTransport(e.target.value)} className="w-full p-2 border rounded"><option>Sí</option><option>No</option></select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Fecha Inicio</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Fecha Fin</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                        </div>
                        <Button className="w-full mt-4" onClick={calculateLabor}>Calcular Liquidación</Button>

                        {laborResult && (
                            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Resultado Estimado</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Cesantías:</span> <span className="font-mono">{laborResult.cesantias.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span></div>
                                    <div className="flex justify-between"><span>Intereses:</span> <span className="font-mono">{laborResult.intereses.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span></div>
                                    <div className="flex justify-between"><span>Prima:</span> <span className="font-mono">{laborResult.prima.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span></div>
                                    <div className="flex justify-between"><span>Vacaciones:</span> <span className="font-mono">{laborResult.vacaciones.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span></div>
                                    <div className="flex justify-between pt-2 border-t font-bold text-lg text-blue-700"><span>Total:</span> <span>{laborResult.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span></div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-end">
                                    <Button size="sm" variant="outline" onClick={() => {
                                        const title = prompt('Nombre para este cálculo:', `Liquidación - ${new Date().toLocaleDateString()}`);
                                        if (title) {
                                            const content = `### Liquidación Laboral\n**Fecha:** ${new Date().toLocaleDateString()}\n\n| Concepto | Valor |\n|---|---|\n| **Salario Base** | ${parseFloat(salary).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} |\n| **Inicio** | ${startDate} |\n| **Fin** | ${endDate} |\n| **Cesantías** | ${laborResult.cesantias.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} |\n| **Intereses** | ${laborResult.intereses.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} |\n| **Prima** | ${laborResult.prima.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} |\n| **Vacaciones** | ${laborResult.vacaciones.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} |\n| **TOTAL** | **${laborResult.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}** |`;
                                            onSave(title, content, DocType.LIQUIDACION);
                                        }
                                    }}>
                                        <Bookmark className="w-4 h-4 mr-2" /> Guardar en Biblioteca
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Saved Liquidations History */}
                        {savedLiquidations.length > 0 && (
                            <div className="mt-8 border-t pt-6">
                                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Library className="w-4 h-4" /> Historial de Liquidaciones
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {savedLiquidations.map(doc => (
                                        <div key={doc.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewDoc(doc)}>
                                            <div className="font-semibold text-sm text-slate-800">{doc.title}</div>
                                            <div className="text-xs text-slate-500">{new Date(doc.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {
                    activeTool === 'term' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg mb-4">Calculadora de Términos Judiciales</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Fecha Notificación / Inicio</label>
                                    <input type="date" value={termDate} onChange={e => setTermDate(e.target.value)} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Días del Término (Hábiles)</label>
                                    <input type="number" value={termDays} onChange={e => setTermDays(e.target.value)} className="w-full p-2 border rounded" placeholder="Ej: 3, 5, 10" />
                                </div>
                            </div>
                            <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-100 italic">
                                Nota: Calcula excluyendo sábados, domingos y festivos principales de Colombia (2024-2025).
                            </div>
                            <Button className="w-full" onClick={calculateTerm}>Calcular Vencimiento</Button>
                            {termResult && (
                                <div className="mt-6 text-center animate-fade-in">
                                    <span className="block text-xs text-slate-500 uppercase">El término vence el:</span>
                                    <div className="text-2xl font-bold text-blue-700 p-2 bg-blue-50 rounded-lg inline-block mt-2 px-6 border border-blue-100">
                                        {termResult}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
                {
                    activeTool === 'ipc' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg mb-4">Indexación de Capital (IPC)</h3>
                            <p className="text-sm text-slate-500 mb-4">Actualiza el valor del dinero en el tiempo usando la fórmula: <code>VH = VP * (IPC Final / IPC Inicial)</code></p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Capital Inicial ($)</label>
                                    <input type="number" value={capital} onChange={e => setCapital(e.target.value)} className="w-full p-2 border rounded text-lg font-mono" placeholder="$ 10.000.000" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">IPC Inicial</label>
                                    <input type="number" step="0.01" value={ipcInitial} onChange={e => setIpcInitial(e.target.value)} className="w-full p-2 border rounded" placeholder="Ej: 139.75" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">IPC Final</label>
                                    <input type="number" step="0.01" value={ipcFinal} onChange={e => setIpcFinal(e.target.value)} className="w-full p-2 border rounded" placeholder="Ej: 145.20" />
                                </div>
                            </div>

                            <div className="text-xs text-right text-blue-500">
                                <a href="https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-al-consumidor-ipc" target="_blank" rel="noreferrer" className="hover:underline">Ver Tabla IPC (DANE) ↗</a>
                            </div>

                            <Button className="w-full" onClick={calculateIPC}>Calcular Valor Indexado</Button>

                            {ipcResult && (
                                <div className="mt-6 text-center animate-fade-in">
                                    <span className="block text-xs text-slate-500 uppercase">Valor Presente Estimado:</span>
                                    <div className="text-3xl font-bold text-green-600 mt-2 p-4 bg-green-50 border border-green-200 rounded-xl">
                                        {ipcResult}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Cálculo meramente indicativo.</p>
                                </div>
                            )}
                        </div>
                    )
                }
            </Card >
        </div >
    );
};
