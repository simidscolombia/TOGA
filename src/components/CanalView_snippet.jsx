// -- CANAL 24/7 --
const CanalView = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-black rounded-xl overflow-hidden shadow-2xl aspect-video relative group">
                    {/* Mock Player UI */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 group-hover:bg-slate-900/40 transition-colors cursor-pointer">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-8 h-8 text-white fill-current ml-1" />
                        </div>
                    </div>

                    <div className="absolute top-4 left-4 flex gap-2">
                        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse flex items-center gap-1">
                            <div className="w-2 h-2 bg-white rounded-full"></div> EN VIVO
                        </div>
                        <div className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-md">
                            1.2k espectadores
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                        <h2 className="text-white text-2xl font-bold mb-1">Audiencia Pública: Reforma Pensional</h2>
                        <p className="text-slate-200 text-sm">Corte Constitucional • Sala Plena</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="hover:border-blue-300 cursor-pointer transition-colors group">
                        <div className="aspect-video bg-slate-200 mb-3 rounded-lg relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                                <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                            </div>
                        </div>
                        <h4 className="font-bold text-slate-800 leading-tight">Conferencia: Inteligencia Artificial en el Derecho</h4>
                        <p className="text-xs text-slate-500 mt-1">Hace 2 horas • Dr. Juan Pérez</p>
                    </Card>
                    <Card className="hover:border-blue-300 cursor-pointer transition-colors group">
                        <div className="aspect-video bg-slate-200 mb-3 rounded-lg relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                                <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                            </div>
                        </div>
                        <h4 className="font-bold text-slate-800 leading-tight">Tutorial: Uso de Toga Premium</h4>
                        <p className="text-xs text-slate-500 mt-1">Hace 1 día • Equipo Toga</p>
                    </Card>
                </div>
            </div>

            <div className="space-y-4">
                <Card title="Programación">
                    <div className="space-y-4">
                        {[
                            { time: '10:00 AM', title: 'Audiencia Reforma Pensional', status: 'live' },
                            { time: '02:00 PM', title: 'Análisis Jurisprudencial', status: 'upcoming' },
                            { time: '04:00 PM', title: 'Entrevista: Fiscal General', status: 'upcoming' },
                            { time: '06:00 PM', title: 'Resumen Semanal', status: 'upcoming' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-3 items-start border-l-2 border-slate-200 pl-3">
                                <div className="text-xs font-bold text-slate-500 min-w-[60px]">{item.time}</div>
                                <div>
                                    <div className={`text-sm font-semibold ${item.status === 'live' ? 'text-red-600' : 'text-slate-700'}`}>
                                        {item.title}
                                    </div>
                                    {item.status === 'live' && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">En Transmisión</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};
