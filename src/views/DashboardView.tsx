
import React, { useState, useEffect } from 'react';
import { User, CalendarEvent, Quest, NewsItem } from '../types';
import { Button, Card } from '../components/UIComponents';
import { QuestBoard, LevelBadge } from '../components/QuestComponents';
import { getLegalNews } from '../services/geminiService';
import { Search as SearchIcon, PenTool, Briefcase, ExternalLink } from 'lucide-react';

export const DashboardView = ({ user, events, quests, onChangeView, searchQuery, onSearch, onGoToQuest }: {
    user: User,
    events: CalendarEvent[],
    quests: Quest[],
    onChangeView: (view: string) => void,
    searchQuery: string,
    onSearch: (q: string) => void,
    onGoToQuest: (actionId: string) => void
}) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            const data = await getLegalNews();
            setNews(data);
            setLoadingNews(false);
        };
        fetchNews();
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Stats & Actions */}
            <div className="lg:col-span-2 space-y-6">
                <div id="welcome-banner" className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Hola, {user.name}</h2>
                                <p className="text-blue-100 opacity-90">
                                    Tu reputación está en <span className="font-bold text-white">{user.reputation} puntos</span>.
                                </p>
                            </div>
                            {/* [NEW] Search Bar in Dashboard */}
                            <div className="relative w-full md:w-72 group text-slate-800" data-toga-help="dashboard-search">
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:bg-white focus:text-slate-900 text-white placeholder-blue-200 transition-all backdrop-blur-sm"
                                    value={searchQuery}
                                    onChange={(e) => onSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && onChangeView('search')}
                                />
                                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-100 w-4 h-4 pointer-events-none group-focus-within:text-slate-400" />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <Button onClick={() => onChangeView('drafter')} className="bg-white text-blue-700 hover:bg-blue-50 border-none shadow-md">
                                <PenTool className="w-4 h-4 mr-2" /> Redactar
                            </Button>
                            <Button onClick={() => onChangeView('cases')} className="bg-white text-blue-700 hover:bg-blue-50 border-none shadow-md">
                                <Briefcase className="w-4 h-4 mr-2" /> Mis Casos
                            </Button>
                            <Button onClick={() => onChangeView('search')} variant="secondary" className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm">
                                <SearchIcon className="w-4 h-4 mr-2" /> Investigar
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Casos', value: '12', color: 'text-blue-600' },
                        { label: 'Docs', value: '45', color: 'text-purple-600' },
                        { label: 'Audiencias', value: events.length, color: 'text-amber-600' },
                        { label: 'Reputación', value: user.reputation, color: 'text-green-600' },
                    ].map((stat, i) => (
                        <Card key={i} className="flex flex-col justify-center items-center py-6">
                            <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                            <span className="text-sm text-slate-500 mt-1">{stat.label}</span>
                        </Card>
                    ))}
                    {/* [NEW] Level Badge */}
                    <div className="col-span-2 sm:col-span-4 flex justify-end">
                        <LevelBadge level={user.level || 1} xp={user.xp || 0} nextLevelXp={(user.level || 1) * 500} />
                    </div>
                </div>

                {/* [NEW] Quest Board */}
                <QuestBoard quests={quests} onGoToQuest={onGoToQuest} />

                <Card title="Próximos Eventos">
                    <div className="space-y-4">
                        {events.slice(0, 3).map(e => (
                            <div key={e.id} className="flex gap-3 items-start border-l-4 border-blue-500 pl-3 py-1">
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-800">{e.title}</h5>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {new Date(e.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {events.length === 0 && <p className="text-xs text-slate-400">Sin eventos próximos.</p>}
                    </div>
                </Card>
            </div>

            {/* Right Column: Legal News Feed */}
            <div className="space-y-6">
                <Card title="Noticias Jurídicas al Día" className="h-full border-blue-100 bg-blue-50/30">
                    <div className="space-y-4" data-toga-help="news-feed">
                        {loadingNews ? (
                            <p className="text-slate-400 text-sm text-center py-4">Buscando noticias...</p>
                        ) : (
                            news.map((item) => (
                                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-2 inline-block">
                                        {item.category}
                                    </span>
                                    <h4 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-blue-700 mb-1">{item.title}</h4>
                                    <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
                                        <span>{item.source}</span>
                                        <span>{item.date}</span>
                                    </div>
                                </a>
                            ))
                        )}
                        <Button variant="ghost" className="w-full text-xs" onClick={() => window.open('https://ambitojuridico.com', '_blank')}>
                            Ver más noticias <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
