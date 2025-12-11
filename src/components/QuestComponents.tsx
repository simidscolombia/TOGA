import React from 'react';
import { CheckCircle2, Circle, Trophy, Star, ChevronRight, Award } from 'lucide-react';
import { Card, Button } from './UIComponents';
import { Quest } from '../types';

interface QuestBoardProps {
    quests: Quest[];
    onGoToQuest: (actionId: string) => void;
    className?: string;
}

export const QuestBoard: React.FC<QuestBoardProps> = ({ quests, onGoToQuest, className }) => {
    const activeQuests = quests.filter(q => !q.completed);
    const completedQuests = quests.filter(q => q.completed);
    const progress = Math.round((completedQuests.length / quests.length) * 100) || 0;

    if (activeQuests.length === 0 && completedQuests.length > 0) {
        return (
            <Card className={`border-green-100 bg-green-50/50 ${className}`}>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Trophy className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800">¡Todo Completado!</h3>
                    <p className="text-green-700 mt-2 max-w-xs">Has dominado los conceptos básicos de Toga. ¡Sigue explorando!</p>
                </div>
            </Card>
        );
    }

    return (
        <Card title="Tu Camino Jurídico" className={className}>
            <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso del Tutorial</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="space-y-3">
                {activeQuests.slice(0, 3).map(quest => (
                    <div key={quest.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group">
                        <div className="shrink-0">
                            <Circle className="w-5 h-5 text-slate-300" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-800">{quest.title}</h4>
                            <p className="text-xs text-slate-500">{quest.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full">
                                <Star className="w-3 h-3 text-amber-600 fill-amber-600" />
                                <span className="text-xs font-bold text-amber-700">+{quest.xpReward}</span>
                            </div>
                            <button
                                onClick={() => onGoToQuest(quest.actionId)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Ir a la tarea"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export const LevelBadge: React.FC<{ level: number; xp: number; nextLevelXp: number }> = ({ level, xp, nextLevelXp }) => {
    return (
        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-full border border-slate-700 shadow-sm cursor-help" title={`XP: ${xp}/${nextLevelXp}`}>
            <Award className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm">Nivel {level}</span>
            <div className="w-16 h-1.5 bg-slate-700 rounded-full ml-1 overflow-hidden">
                <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${Math.min((xp / nextLevelXp) * 100, 100)}%` }}
                />
            </div>
        </div>
    );
};
