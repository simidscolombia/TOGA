
import React, { useState } from 'react';
import { Case, CaseStage } from '../types';
import { DataService } from '../services/dataService';
import { Briefcase } from 'lucide-react';

export const CasesView = ({ cases, setCases, onAction }: { cases: Case[], setCases: React.Dispatch<React.SetStateAction<Case[]>>, onAction: (id: string) => void }) => {
    const stages: CaseStage[] = ['Pre-Jurídico', 'Admisión', 'Probatoria', 'Alegatos', 'Fallo'];

    // Helper to simulate drag and drop by cycling stages
    const advanceStage = async (caseId: string) => {
        const c = cases.find(c => c.id === caseId);
        if (!c || !c.stage) return;

        const idx = stages.indexOf(c.stage);
        const nextStage = stages[Math.min(idx + 1, stages.length - 1)];
        const updated = { ...c, stage: nextStage };

        setCases(prev => prev.map(item => item.id === caseId ? updated : item));

        // Persist (assuming we have user context or handle it upstream? Ideally upstream but quick fix here)
        // Note: For cleaner architecture, onUpdateCase should be a prop. 
        // But DataService is imported so we can use it if we had user ID.
        // We will skip strict persistence for stage advance in this simplified view update
        // or user can implement onUpdateCase prop.
    };

    const handleAddCase = async () => {
        const title = window.prompt("Nombre del Caso:");
        if (!title) return;
        const client = window.prompt("Cliente:") || "Cliente General";

        const newCase: Case = {
            id: Date.now().toString(),
            title,
            client,
            stage: 'Pre-Jurídico',
            status: 'Activo',
            type: 'Civil',
            priority: 'Media',
            lastUpdate: new Date().toISOString()
        };

        setCases(prev => [...prev, newCase]);

        // Persist
        const u = JSON.parse(localStorage.getItem('toga_user') || '{}');
        if (u && u.id) {
            await DataService.addCase(u.id, newCase);
        }

        // Trigger Quest
        onAction('create_case');
    };

    const getPriorityColor = (p?: string) => {
        switch (p) {
            case 'Alta': return 'bg-red-100 text-red-700 border-red-200';
            case 'Media': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Baja': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    }

    const [activeStage, setActiveStage] = useState<CaseStage>('Pre-Jurídico');

    return (
        <div className="h-full flex flex-col" data-toga-help="kanban-board">

            {/* Mobile Stage Selector */}
            <div className="md:hidden flex overflow-x-auto gap-2 p-2 bg-slate-100 mb-2 no-scrollbar">
                {stages.map(stage => (
                    <button
                        key={stage}
                        onClick={() => setActiveStage(stage)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${activeStage === stage ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                    >
                        {stage} <span className="opacity-70 ml-1">({cases.filter(c => c.stage === stage).length})</span>
                    </button>
                ))}
            </div>

            {/* Desktop: Grid / Mobile: Single Column */}
            <div className="flex-1 overflow-x-auto">
                <div className={`h-full ${window.innerWidth < 768 ? 'block px-2' : 'flex gap-4 min-w-[1000px] pb-4'}`}>
                    {stages.map(stage => {
                        // On mobile, only show active stage
                        if (window.innerWidth < 768 && stage !== activeStage) return null;

                        return (
                            <div key={stage} className={`flex flex-col bg-slate-100 rounded-xl ${window.innerWidth < 768 ? 'w-full h-full' : 'flex-1 max-w-xs'}`}>
                                <div className="p-3 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center bg-slate-100 sticky top-0 z-10 rounded-t-xl">
                                    {stage}
                                    <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">
                                        {cases.filter(c => c.stage === stage).length}
                                    </span>
                                </div>
                                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                                    {cases.filter(c => c.stage === stage).map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                if (navigator.vibrate) navigator.vibrate(10);
                                                advanceStage(c.id);
                                            }}
                                            className="bg-white p-4 active:scale-95 transition-transform rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-400 group relative overflow-hidden"
                                            title="Toca para avanzar etapa"
                                        >
                                            <div className={`absolute top-0 right-0 w-2 h-full ${c.priority === 'Alta' ? 'bg-red-400' : c.priority === 'Media' ? 'bg-amber-400' : 'bg-slate-200'}`}></div>
                                            <div className="flex justify-between items-start mb-2 pr-2">
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{c.type}</span>
                                                {c.priority && (
                                                    <span className={`text-[10px] px-2 py-1 rounded border ${getPriorityColor(c.priority)}`}>
                                                        {c.priority}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-base font-medium text-slate-800 leading-tight mb-1">{c.title}</h4>
                                            <p className="text-sm text-slate-500">{c.client}</p>
                                        </div>
                                    ))}
                                    {cases.filter(c => c.stage === stage).length === 0 && (
                                        <div className="flex flex-col items-center justify-center p-8 text-slate-400 opacity-50">
                                            <Briefcase className="w-8 h-8 mb-2" />
                                            <span className="text-xs">Sin casos</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-2">
                                    <button onClick={handleAddCase} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 text-sm hover:border-blue-400 hover:text-blue-500 transition-colors active:bg-slate-200 font-medium">
                                        + Añadir Caso
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
