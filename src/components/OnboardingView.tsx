import React, { useState } from 'react';
import { Gavel, Scale, Briefcase, BookOpen, Heart, Users, Shield, Globe, Landmark, ArrowRight } from 'lucide-react';

interface OnboardingProps {
    onComplete: (interests: string[]) => void;
}

const INTERESTS = [
    { id: 'Penal', icon: Gavel, label: 'Derecho Penal', color: 'bg-red-100 text-red-600' },
    { id: 'Civil', icon: Scale, label: 'Derecho Civil', color: 'bg-blue-100 text-blue-600' },
    { id: 'Laboral', icon: Briefcase, label: 'Derecho Laboral', color: 'bg-orange-100 text-orange-600' },
    { id: 'Familia', icon: Heart, label: 'Derecho de Familia', color: 'bg-pink-100 text-pink-600' },
    { id: 'Administrativo', icon: Landmark, label: 'D. Administrativo', color: 'bg-slate-100 text-slate-600' },
    { id: 'Comercial', icon: Globe, label: 'Derecho Comercial', color: 'bg-green-100 text-green-600' },
    { id: 'Constitucional', icon: BookOpen, label: 'Constitucional', color: 'bg-purple-100 text-purple-600' },
    { id: 'DDHH', icon: Users, label: 'Derechos Humanos', color: 'bg-yellow-100 text-yellow-600' },
];

export const OnboardingView: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [step, setStep] = useState(1);

    const toggleInterest = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    if (step === 1) {
        return (
            <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6 animate-fade-in">
                <div className="max-w-md text-center space-y-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-200 mb-6">
                        <Scale className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Bienvenido a Toga</h1>
                    <p className="text-slate-500 text-lg leading-relaxed">
                        Tu asistente jurídico inteligente. Antes de empezar, queremos personalizar tu experiencia.
                    </p>
                    <button
                        onClick={() => setStep(2)}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2 group"
                    >
                        Comenzar
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-xs text-slate-400">Configuración inicial (1/2)</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col items-center justify-center p-4 animate-slide-in-from-right">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 text-center bg-white sticky top-0 z-10">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">¿Cuáles son tus áreas de práctica?</h2>
                    <p className="text-slate-500">Selecciona al menos una para adaptar las noticias y la IA.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {INTERESTS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => toggleInterest(item.id)}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-3 text-center group ${selected.includes(item.id)
                                        ? 'border-indigo-600 bg-indigo-50 shadow-md transform scale-105'
                                        : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`p-3 rounded-full ${item.color} ${selected.includes(item.id) ? 'ring-2 ring-white shadow-sm' : ''}`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className={`font-semibold text-sm ${selected.includes(item.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
                                    {item.label}
                                </span>
                                {selected.includes(item.id) && (
                                    <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                        <CheckIcon className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <p className="text-xs text-slate-400">Podrás cambiar esto después en tu perfil.</p>
                    <button
                        onClick={() => onComplete(selected)}
                        disabled={selected.length === 0}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                        Finalizar
                    </button>
                </div>
            </div>
        </div>
    );
};

// Internal Import helper
const CheckIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
