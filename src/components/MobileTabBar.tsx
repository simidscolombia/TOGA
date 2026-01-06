
import React from 'react';
import { LayoutDashboard, Search, Briefcase, Menu } from 'lucide-react';

export const MobileTabBar = ({ activeView, onChangeView }: { activeView: string, onChangeView: (view: string) => void }) => {
    return (
        <div className="md:hidden fixed bottom-1 left-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 flex justify-around p-3 z-50 mb-4">
            <button onClick={() => onChangeView('dashboard')} className={`p-2 rounded-xl transition-all ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                <LayoutDashboard className="w-5 h-5" />
            </button>
            <button onClick={() => onChangeView('search')} className={`p-2 rounded-xl transition-all ${activeView === 'search' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                <Search className="w-5 h-5" />
            </button>
            <button onClick={() => onChangeView('cases')} className={`p-2 rounded-xl transition-all ${activeView === 'cases' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                <Briefcase className="w-5 h-5" />
            </button>
            <button onClick={() => onChangeView('profile')} className={`p-2 rounded-xl transition-all ${activeView === 'profile' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                <Menu className="w-5 h-5" />
            </button>
        </div>
    );
};
