
import React, { useState, useEffect, useRef } from 'react';
import { extractTextFromPdf, extractTextFromDocx } from './services/documentParser';
import Sidebar from './components/Sidebar';
import { Card, Button, Modal, PremiumLock, MarkdownRenderer, TogadoCompanion, VoiceRecorder, ToastNotification, ToastProps, WompiWidget } from './components/UIComponents';
import { OnboardingView } from './components/OnboardingView'; // [NEW]
import { generateLegalDocumentStream, compareJurisprudence, semanticSearch, getLegalNews, analyzeDecision, chatWithDocument, generateAudioFromText } from './services/geminiService';
import { DataService } from './services/dataService';
import { MOCK_CASES } from './constants';
import { User, DocType, SavedDocument, CalendarEvent, SearchResult, Post, PostComment, NewsItem, AnalyzedDecision, Case, CaseStage } from './types';
import {
    Menu, Bell, Search as SearchIcon, FileText,
    Calendar as CalIcon, MessageSquare, ThumbsUp, Send, Check,
    PenTool, Library, Copy, FileDown, Trash2, Printer, Save, Plus, ArrowLeft, Mail, Lock, ArrowRight, ExternalLink, Shield, Zap, Globe, Download, Edit2, UserCheck, Maximize2, Minimize2, Calculator, DollarSign, AlertCircle, Calendar, TrendingUp, Briefcase, Bookmark, BookOpen, Share2, Sparkles, MessageCircle, Play, Pause, Quote, Clock, RefreshCw, Eye, LayoutDashboard, UserCircle
} from 'lucide-react';

// --- LEGAL TEXT CONSTANTS ---
const TERMS_TEXT = `
## TÉRMINOS Y CONDICIONES DE USO

**1. Aceptación:** Al usar TOGA, aceptas estos términos. Si no estás de acuerdo, no uses la plataforma.
**2. Uso de IA:** Toga utiliza inteligencia artificial. El usuario (abogado) es el único responsable de verificar y validar el contenido generado. Toga no reemplaza el criterio profesional.
**3. Propiedad:** Los documentos generados pertenecen al usuario. El software pertenece a Toga LegalTech S.A.S.
**4. Responsabilidad:** No nos hacemos responsables por pérdidas de pleitos o vencimientos de términos derivados del uso de la app.
**5. Pagos:** Las suscripciones Premium se renuevan automáticamente salvo cancelación.
`;

const PRIVACY_TEXT = `
## POLÍTICA DE PRIVACIDAD Y DATOS

**1. Recolección:** Recolectamos datos de registro y uso para mejorar el servicio.
**2. Datos Sensibles:** Los expedientes y nombres de clientes ingresados en el "Redactor IA" se procesan de forma encriptada y no se usan para entrenar modelos públicos sin consentimiento.
**3. Cookies:** Usamos almacenamiento local (LocalStorage) para mejorar tu experiencia.
**4. Derechos:** Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento enviando un correo a soporte@toga.legal.
`;

function App() {
    const [activeView, setActiveView] = useState('dashboard');
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // --- Auth Flow State ---
    const [authView, setAuthView] = useState<'landing' | 'login'>('landing');

    // --- Zen Mode State ---
    const [isZenMode, setIsZenMode] = useState(false);

    // --- State ---
    // CORRECCIÓN 1: Iniciar en null para obligar al Login
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('toga_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [cases, setCases] = useState<Case[]>(MOCK_CASES); // Cases for Kanban
    const [loadingData, setLoadingData] = useState(true);

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // [NEW] Dashboard Search State
    const [searchQuery, setSearchQuery] = useState('');

    // --- Toast System State ---
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const addToast = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, message, onClose: removeToast }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // --- Initial Data Load & Wompi Payment Check ---
    useEffect(() => {
        // Version 1.0.2 - Force Update
        const initData = async () => {
            setLoadingData(true);
            const u = await DataService.getUser();

            // --- WOMPI PAYMENT CHECK START ---
            // Check if we just returned from Wompi payment
            const query = new URLSearchParams(window.location.search);
            const transactionId = query.get('id'); // Wompi appends ?id=...&env=...

            if (transactionId && u && u.role !== 'PREMIUM') {
                const upgradedUser = { ...u, role: 'PREMIUM' as const };
                await DataService.updateUser(upgradedUser);
                setUser(upgradedUser);
                addToast('success', '¡Pago procesado correctamente! Eres Premium.');

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                // Si el servicio devuelve null (no hay localStorage), se queda en null
                setUser(u);
            }
            // --- WOMPI PAYMENT CHECK END ---

            if (u) {
                const [d, e, p] = await Promise.all([
                    DataService.getDocuments(u.id),
                    DataService.getEvents(u.id),
                    DataService.getPosts()
                ]);
                setSavedDocs(d);
                setEvents(e);
                setPosts(p);
            } else {
                setPosts(await DataService.getPosts());
            }
            setLoadingData(false);
        };
        initData();
    }, []);

    // Refresh data when user changes (e.g. login)
    useEffect(() => {
        if (user) {
            localStorage.setItem('toga_user', JSON.stringify(user)); // Persistir sesión
            DataService.getDocuments(user.id).then(setSavedDocs);
            DataService.getEvents(user.id).then(setEvents);
        }
    }, [user]);


    // State to pass content from Library to Drafter
    const [draftToLoad, setDraftToLoad] = useState<{ content: string, type: string } | null>(null);

    // --- Handlers ---

    // [NEW] Onboarding Handler
    const handleOnboardingComplete = (interests: string[]) => {
        if (!user) return;
        const updatedUser = { ...user, interests, onboardingCompleted: true };
        setUser(updatedUser);
        localStorage.setItem('toga_user', JSON.stringify(updatedUser));
        addToast('success', '¡Perfil personalizado correctamente!');
    };

    const handleLogin = async (name: string, email: string) => {
        const loggedUser = await DataService.loginStub(name, email);

        // Check if existing mock user or new
        if (email === 'alejandro@legal.co') {
            setUser(loggedUser);
        } else {
            // New user starts with onboarding
            setUser({ ...loggedUser, onboardingCompleted: false, interests: [] });
        }
        addToast('success', `Bienvenido, ${name}`);
    };

    const handleLogout = async () => {
        await DataService.logout();
        setUser(null);
        setActiveView('dashboard');
        setAuthView('landing');
        localStorage.removeItem('toga_user'); // Limpiar sesión local
        addToast('info', 'Sesión cerrada correctamente');
    };

    const handleSaveDocument = async (title: string, content: string, type: string, tags?: string[], sourceUrl?: string, analysis?: AnalyzedDecision) => {
        if (!user) return;
        const newDoc: SavedDocument = {
            id: Date.now().toString(),
            title,
            type,
            content,
            timestamp: new Date().toISOString(),
            tags,
            sourceUrl,
            analysis
        };

        setSavedDocs(prev => [newDoc, ...prev]);
        await DataService.saveDocument(user.id, newDoc);
        addToast('success', 'Guardado en Biblioteca');
    };

    const handleOpenDocument = (doc: SavedDocument) => {
        if (doc.type === DocType.JURISPRUDENCIA) {
            addToast('info', 'Abriendo ficha de jurisprudencia...');
        } else {
            setDraftToLoad({ content: doc.content, type: doc.type });
            setActiveView('drafter');
            addToast('info', `Cargando: ${doc.title}`);
        }
    };

    const handleAddEvent = async (event: CalendarEvent) => {
        if (!user) return;
        setEvents(prev => [...prev, event]);
        await DataService.addEvent(user.id, event);
        addToast('success', 'Evento agendado');
    };

    const handleUpdateEvent = async (event: CalendarEvent) => {
        if (!user) return;
        setEvents(prev => prev.map(e => e.id === event.id ? event : e));
        await DataService.updateEvent(user.id, event);
        addToast('success', 'Evento actualizado');
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!user) return;
        setEvents(prev => prev.filter(e => e.id !== eventId));
        await DataService.deleteEvent(user.id, eventId);
        addToast('success', 'Evento eliminado');
    };

    const handleAddPost = async (post: Post) => {
        setPosts(prev => [post, ...prev]);
        await DataService.addPost(post);
        addToast('success', 'Publicación creada');
    }

    const handleDeletePost = (id: string) => {
        setPosts(prev => prev.filter(p => p.id !== id));
        addToast('success', 'Publicación eliminada');
    };

    const handleAddComment = (postId: string, content: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const newComment: PostComment = {
                    id: Date.now().toString(),
                    author: user?.name || 'Usuario',
                    content,
                    timestamp: 'Ahora'
                };
                return {
                    ...p,
                    replies: [...(p.replies || []), newComment],
                    comments: p.comments + 1
                };
            }
            return p;
        }));
        addToast('success', 'Comentario agregado');
    };

    const handleUpdateProfile = async (u: User) => {
        setUser(u);
        await DataService.updateUser(u);
        addToast('success', 'Perfil actualizado');
    }

    // --- Togado Knowledge Base ---
    const TOGADO_KNOWLEDGE_BASE = {
        'sidebar': { title: 'Barra de Navegación', description: 'Tu centro de mando.' },
        'nav-dashboard': { title: 'Inicio / Noticias', description: 'Panel de control y noticias jurídicas en tiempo real.' },
        'news-feed': { title: 'Noticias Jurídicas', description: 'Feed actualizado de cortes y reformas.', tip: 'Haz clic en la fuente para ir a la noticia original.' },
        'search-input': { title: 'Buscador Inteligente', description: 'Encuentra jurisprudencia por tema.', tip: 'Usa lenguaje natural: "sentencias sobre pensiones de vejez".' },
        'reader-analysis': { title: 'Análisis IA', description: 'Ficha técnica generada automáticamente por Gemini.', tip: 'Revisa el "Resuelve" antes de leer todo el texto.' },
        'library-tabs': { title: 'Secciones de Biblioteca', description: 'Separa tus escritos de tus investigaciones.', tip: 'Usa la pestaña "Investigación" para ver las sentencias que guardaste.' },
        'kanban-board': { title: 'Tablero de Casos', description: 'Gestión visual de tus procesos legales.', tip: 'Arrastra tus casos de izquierda a derecha conforme avanzan procesalmente.' },
        'tools-tab': { title: 'Calculadoras', description: 'Herramientas para liquidación, términos e indexación.', tip: 'La calculadora de términos excluye fines de semana automáticamente.' },
    };

    if (loadingData) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando Toga...</div>;
    }

    if (!user) {
        if (authView === 'landing') {
            return <LandingView onEnter={() => setAuthView('login')} />;
        }
        return <LoginView onLogin={handleLogin} onBack={() => setAuthView('landing')} />;
    }

    // [NEW] Show Onboarding
    if (user.onboardingCompleted === false) {
        return <OnboardingView onComplete={handleOnboardingComplete} />;
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
            <div className="fixed top-4 right-4 z-[200] flex flex-col items-end pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastNotification {...toast} />
                    </div>
                ))}
            </div>

            <TogadoCompanion knowledgeBase={TOGADO_KNOWLEDGE_BASE} />

            {!isZenMode && (
                <Sidebar
                    activeView={activeView}
                    onChangeView={setActiveView}
                    isMobileOpen={isMobileOpen}
                    toggleMobile={() => setIsMobileOpen(!isMobileOpen)}
                />
            )}

            <main className="flex-1 flex flex-col overflow-hidden">
                {!isZenMode && (
                    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 print:hidden">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMobileOpen(true)}
                                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-semibold text-slate-800 capitalize">
                                {activeView === 'drafter' ? 'Redactor IA' : activeView === 'tools' ? 'Herramientas Legales' : activeView === 'cases' ? 'Mis Casos (Kanban)' : activeView === 'canal' ? 'Canal 24/7 (En Vivo)' : activeView}
                            </h2>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            </button>
                            <div
                                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setActiveView('profile')}
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                    {user.avatarUrl && <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />}
                                </div>
                                <span className="hidden sm:block text-sm font-medium text-slate-700">{user.name}</span>
                            </div>
                        </div>
                    </header>
                )}

                <div className={`flex-1 overflow-y-auto ${isZenMode ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
                    <div className={`${isZenMode ? 'h-full' : 'max-w-7xl mx-auto h-full'}`}>
                        {activeView === 'dashboard' && (
                            <DashboardView
                                user={user}
                                events={events}
                                onChangeView={setActiveView}
                                searchQuery={searchQuery} // [NEW]
                                onSearch={setSearchQuery} // [NEW]
                            />
                        )}
                        {activeView === 'cases' && <CasesView cases={cases} setCases={setCases} />}
                        {activeView === 'search' && <SearchView showToast={addToast} onSave={handleSaveDocument} />}
                        {activeView === 'library' && <LibraryView docs={savedDocs} onOpen={handleOpenDocument} />}

                        {activeView === 'calendar' && (
                            <CalendarView
                                events={events}
                                onAddEvent={handleAddEvent}
                                onUpdateEvent={handleUpdateEvent}
                                onDeleteEvent={handleDeleteEvent}
                                showToast={addToast}
                            />
                        )}
                        {activeView === 'tools' && <ToolsView onSave={(t, c, ty) => handleSaveDocument(t, c, ty)} docs={savedDocs} />}
                        {activeView === 'drafter' && (
                            <DrafterView
                                user={user}
                                onUpgrade={() => setShowUpgradeModal(true)}
                                onSave={(title: string, content: string, type: string) => handleSaveDocument(title, content, type)}
                                initialContent={draftToLoad}
                                showToast={addToast}
                                isZenMode={isZenMode}
                                toggleZenMode={() => setIsZenMode(!isZenMode)}
                            />
                        )}
                        {activeView === 'canal' && <CanalView />}
                        {activeView === 'comparator' && <ComparatorView user={user} onUpgrade={() => setShowUpgradeModal(true)} showToast={addToast} />}
                        {activeView === 'community' && <CommunityView user={user} posts={posts} onAddPost={handleAddPost} onDeletePost={handleDeletePost} onAddComment={handleAddComment} />}
                        {activeView === 'profile' && (
                            <ProfileView
                                user={user}
                                docs={savedDocs}
                                events={events}
                                posts={posts}
                                onUpdateUser={handleUpdateProfile}
                                onUpgrade={() => setShowUpgradeModal(true)}
                                onLogout={handleLogout}
                                showToast={addToast}
                            />
                        )}
                    </div>
                </div>
            </main>

            {/* Upgrade Modal - CORRECCIÓN 2: Solo Widget Wompi, sin botones falsos */}
            <Modal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} title="Plan Premium Toga">
                <div className="text-center">
                    <div className="mb-6">
                        <h4 className="text-2xl font-bold text-slate-900 mb-2">$89.000 COP / mes</h4>
                        <p className="text-slate-500">Acceso ilimitado a herramientas de IA</p>
                    </div>
                    <div className="mb-4">
                        <p className="text-sm text-slate-600 mb-4">Paga seguro con:</p>
                        {/* Aquí renderizamos el widget real */}
                        <WompiWidget />
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                        Serás redirigido a la pasarela segura de Bancolombia. Al finalizar, tu cuenta se activará automáticamente.
                    </p>
                </div>
            </Modal>

            {/* Mobile Navigation */}
            {user && <MobileTabBar activeView={activeView} onChangeView={setActiveView} />}
        </div>
    );
}

// --- UTILS FOR PCM AUDIO ---
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// --- VIEW COMPONENTS ---

// ... LandingView ...
const LandingView = ({ onEnter }: { onEnter: () => void }) => {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 flex items-center justify-center">
            <div className="text-center max-w-2xl px-4">
                <h1 className="text-5xl font-bold mb-6 text-blue-900">TOGA</h1>
                <p className="text-xl mb-8 text-slate-600">Tu Despacho Jurídico Potenciado por IA</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <SearchIcon className="w-8 h-8 text-blue-600 mb-2" />
                        <h3 className="font-bold">Investiga</h3>
                        <p className="text-sm text-slate-500">Jurisprudencia con análisis semántico.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <PenTool className="w-8 h-8 text-purple-600 mb-2" />
                        <h3 className="font-bold">Redacta</h3>
                        <p className="text-sm text-slate-500">Documentos legales en segundos con IA.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <Briefcase className="w-8 h-8 text-amber-600 mb-2" />
                        <h3 className="font-bold">Gestiona</h3>
                        <p className="text-sm text-slate-500">Tablero Kanban para tus casos.</p>
                    </div>
                </div>
                <Button size="lg" onClick={onEnter} className="px-10 shadow-xl shadow-blue-200">Ingresar a la Plataforma</Button>

                {/* Legal Footer Links */}
                <div className="mt-12 text-xs text-slate-400 flex gap-4 justify-center">
                    <button onClick={() => alert(TERMS_TEXT)} className="hover:underline">Términos y Condiciones</button>
                    <button onClick={() => alert(PRIVACY_TEXT)} className="hover:underline">Política de Privacidad</button>
                </div>
            </div>
        </div>
    );
};
const LoginView = ({ onLogin, onBack }: { onLogin: (n: string, e: string) => void, onBack: () => void }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl max-w-sm w-full shadow-2xl">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Iniciar Sesión</h2>
                    <p className="text-slate-500 text-sm">Accede a tu cuenta Toga</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre</label>
                        <input className="w-full p-2 border rounded" placeholder="Tu Nombre" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
                        <input className="w-full p-2 border rounded" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <Button className="w-full" disabled={!name || !email} onClick={() => onLogin(name, email)}>Ingresar</Button>
                </div>
                <button onClick={onBack} className="block w-full text-center mt-6 text-sm text-slate-400 hover:text-slate-600">Volver al Inicio</button>
            </div>
        </div>
    );
};

// ... DashboardView ...
const DashboardView = ({ user, events, onChangeView, searchQuery, onSearch }: { user: User, events: CalendarEvent[], onChangeView: (view: string) => void, searchQuery: string, onSearch: (q: string) => void }) => {
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
                </div>

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

// --- CASES VIEW (KANBAN) ---
const CasesView = ({ cases, setCases }: { cases: Case[], setCases: React.Dispatch<React.SetStateAction<Case[]>> }) => {
    const stages: CaseStage[] = ['Pre-Jurídico', 'Admisión', 'Probatoria', 'Alegatos', 'Fallo'];

    // Helper to simulate drag and drop by cycling stages
    const advanceStage = (caseId: string) => {
        setCases(prev => prev.map(c => {
            if (c.id !== caseId || !c.stage) return c;
            const idx = stages.indexOf(c.stage);
            const nextStage = stages[Math.min(idx + 1, stages.length - 1)];
            return { ...c, stage: nextStage };
        }));
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
                        // Note: Using CSS class hidden logic or conditional rendering for cleaner DOM
                        // For simplicity in this mono-file: conditional rendering
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
                                    <button className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 text-sm hover:border-blue-400 hover:text-blue-500 transition-colors active:bg-slate-200 font-medium">
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

// ... SearchView (Updated with Chat) ...
const SearchView = ({ showToast, onSave }: { showToast: (t: any, m: string) => void, onSave: (t: string, c: string, type: string, tags?: string[], url?: string, analysis?: AnalyzedDecision) => void }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeDecision, setActiveDecision] = useState<SearchResult | null>(null);
    const [analysis, setAnalysis] = useState<AnalyzedDecision | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [viewTab, setViewTab] = useState<'analysis' | 'chat'>('analysis');
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

    // Refs for Audio
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsSearching(true);
        setActiveDecision(null);
        try {
            const data = await semanticSearch(query);
            setResults(data);
        } catch (err) {
            showToast('error', 'Error en la búsqueda');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRead = async (result: SearchResult) => {
        setActiveDecision(result);
        setAnalyzing(true);
        setViewTab('analysis');
        setChatHistory([]); // Reset chat
        const analyzed = await analyzeDecision(result.title, result.content);
        setAnalysis(analyzed);
        setAnalyzing(false);
    };

    const handleSaveToLibrary = () => {
        if (!activeDecision || !analysis) return;
        onSave(
            activeDecision.title,
            `### Resumen\n${analysis.summary}\n\n### Hechos\n${analysis.facts.map(f => `- ${f}`).join('\n')}\n\n### Resuelve\n${analysis.decision}`,
            DocType.JURISPRUDENCIA,
            analysis.tags,
            activeDecision.url,
            analysis
        );
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || !activeDecision) return;

        const userMsg = chatInput;
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setChatLoading(true);

        const answer = await chatWithDocument(activeDecision.content, userMsg);
        setChatHistory(prev => [...prev, { role: 'ai', text: answer }]);
        setChatLoading(false);
    };

    const toggleSpeech = async () => {
        if (!analysis) return;

        if (isPlaying) {
            // Stop playback
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
                sourceNodeRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            setIsPlaying(false);
            return;
        }

        // Start generation
        setIsGeneratingAudio(true);
        const textToRead = `Resumen del caso ${activeDecision?.title}. ${analysis.summary}. Decisión: ${analysis.decision}`;

        try {
            const base64Audio = await generateAudioFromText(textToRead);
            if (base64Audio) {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                audioContextRef.current = audioCtx;

                const audioBytes = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);

                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.onended = () => {
                    setIsPlaying(false);
                    sourceNodeRef.current = null;
                };
                source.start();
                sourceNodeRef.current = source;
                setIsPlaying(true);
            } else {
                showToast('error', 'No se pudo generar el audio.');
            }
        } catch (e) {
            console.error(e);
            showToast('error', 'Error reproduciendo audio.');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const copyCitation = () => {
        if (!activeDecision) return;
        const citation = `${activeDecision.title}, ${new Date().getFullYear()}, Fuente: ${activeDecision.source}`;
        navigator.clipboard.writeText(citation);
        showToast('success', 'Cita copiada');
    }

    // Cleanup audio on unmount or change
    useEffect(() => {
        return () => {
            if (sourceNodeRef.current) sourceNodeRef.current.stop();
            if (audioContextRef.current) audioContextRef.current.close();
        }
    }, [activeDecision]);

    if (activeDecision) {
        return (
            <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <button onClick={() => { setActiveDecision(null); }} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold line-clamp-1 flex-1 min-w-[200px]">{activeDecision.title}</h2>

                    {/* Actions Bar */}
                    <div className="flex items-center gap-2">
                        {/* View Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setViewTab('analysis')} className={`px-3 py-1 text-xs font-medium rounded ${viewTab === 'analysis' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Ficha</button>
                            <button onClick={() => setViewTab('chat')} className={`px-3 py-1 text-xs font-medium rounded ${viewTab === 'chat' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Chat</button>
                        </div>

                        <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                        <button
                            onClick={toggleSpeech}
                            disabled={isGeneratingAudio}
                            className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isPlaying ? 'text-red-500 bg-red-50' : 'text-slate-600'} ${isGeneratingAudio ? 'animate-pulse opacity-50' : ''}`}
                            title="Escuchar Resumen (Gemini TTS)"
                        >
                            {isGeneratingAudio ? <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button onClick={copyCitation} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors" title="Copiar Cita Jurídica">
                            <Quote className="w-4 h-4" />
                        </button>

                        <Button size="sm" onClick={handleSaveToLibrary} className="gap-2 hidden sm:flex">
                            <Bookmark className="w-4 h-4" /> Guardar
                        </Button>
                        <a href={activeDecision.url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                    {/* Left Panel: Analysis or Chat */}
                    <div className="lg:col-span-1 overflow-y-auto pr-2 flex flex-col h-full" data-toga-help="reader-analysis">
                        {viewTab === 'analysis' ? (
                            <div className="space-y-4">
                                <Card className="bg-blue-50 border-blue-100">
                                    <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> Análisis IA
                                    </h3>
                                    {analyzing ? (
                                        <div className="space-y-2 animate-pulse">
                                            <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-blue-200 rounded w-1/2"></div>
                                        </div>
                                    ) : analysis ? (
                                        <div className="text-sm space-y-4">
                                            <div>
                                                <span className="font-semibold text-blue-900 block mb-1">Resumen</span>
                                                <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-blue-900 block mb-1">Etiquetas</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {analysis.tags.map(t => (
                                                        <span key={t} className="px-2 py-0.5 bg-white rounded-full border border-blue-200 text-xs text-blue-700">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </Card>
                                {analysis && !analyzing && (
                                    <Card title="Ficha Técnica" className="text-sm">
                                        <div className="space-y-3">
                                            <div>
                                                <span className="font-bold block text-slate-700">Hechos Relevantes</span>
                                                <ul className="list-disc pl-4 text-slate-600 space-y-1 mt-1">
                                                    {analysis.facts.slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <span className="font-bold block text-slate-700">Decisión (Resuelve)</span>
                                                <p className="p-2 bg-green-50 text-green-800 rounded border border-green-100 mt-1">
                                                    {analysis.decision}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <Card className="h-full flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
                                <div className="bg-white p-3 border-b text-sm font-semibold flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-blue-500" /> Chat con Sentencia
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {chatHistory.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center mt-10">Pregunta algo sobre este documento...</p>
                                    )}
                                    {chatHistory.map((m, i) => (
                                        <div key={i} className={`p-2 rounded-lg text-sm max-w-[90%] ${m.role === 'user' ? 'bg-blue-100 text-blue-900 self-end ml-auto' : 'bg-white border text-slate-800'}`}>
                                            {m.text}
                                        </div>
                                    ))}
                                    {chatLoading && <div className="text-xs text-slate-400 animate-pulse ml-2">Escribiendo...</div>}
                                </div>
                                <div className="p-2 bg-white border-t flex gap-2">
                                    <input
                                        className="flex-1 text-xs border rounded p-2"
                                        placeholder="Ej: ¿Qué dijo sobre..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                    />
                                    <button onClick={handleSendChat} disabled={!chatInput} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                                        <Send className="w-3 h-3" />
                                    </button>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Document Content */}
                    <Card className="lg:col-span-2 overflow-y-auto h-full">
                        <div className="prose prose-sm max-w-none font-serif">
                            <p className="text-center text-slate-400 italic mb-4">Vista previa del contenido extraído...</p>
                            <MarkdownRenderer content={activeDecision.content} />
                            <div className="mt-8 pt-8 border-t text-center">
                                <Button variant="outline" onClick={() => window.open(activeDecision.url, '_blank')}>
                                    Leer Sentencia Completa en Fuente Original
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // --- SEARCH LIST MODE ---
    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Buscador Inteligente</h2>
                <p className="text-slate-500">Investiga jurisprudencia con análisis IA instantáneo.</p>
            </div>

            <form onSubmit={handleSearch} className="relative mb-8" data-toga-help="search-input">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ej: 'Sentencias sobre estabilidad laboral reforzada'..."
                    className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 text-lg"
                />
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                <Button type="submit" isLoading={isSearching} className="absolute right-2 top-2 bottom-2">Buscar</Button>
            </form>

            <div className="space-y-4">
                {results.map((item, idx) => (
                    <div key={idx} onClick={() => handleRead(item)} className="cursor-pointer group">
                        <Card className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-blue-500">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold text-blue-700 group-hover:underline">{item.title}</h3>
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1">
                                    {item.source} <BookOpen className="w-3 h-3" />
                                </span>
                            </div>
                            <p className="text-slate-600 line-clamp-2 text-sm">{item.content}</p>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- RESTORED VIEW COMPONENTS ---

const LibraryView = ({ docs, onOpen }: { docs: SavedDocument[], onOpen: (doc: SavedDocument) => void }) => {
    const [tab, setTab] = useState<'drafts' | 'research'>('drafts');

    const drafts = docs.filter(d => d.type !== DocType.JURISPRUDENCIA);
    const research = docs.filter(d => d.type === DocType.JURISPRUDENCIA);

    const displayedDocs = tab === 'drafts' ? drafts : research;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Biblioteca</h2>
                <div className="flex bg-slate-100 p-1 rounded-lg" data-toga-help="library-tabs">
                    <button
                        onClick={() => setTab('drafts')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'drafts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Mis Borradores
                    </button>
                    <button
                        onClick={() => setTab('research')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'research' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Investigación
                    </button>
                </div>
            </div>

            {displayedDocs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Library className="w-16 h-16 mb-4 opacity-20" />
                    <p>No hay elementos en esta sección.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedDocs.map(doc => (
                        <div key={doc.id} onClick={() => onOpen(doc)} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md cursor-pointer hover:border-blue-400 group relative">
                            <div className="flex items-start justify-between mb-2">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${tab === 'research' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                    {tab === 'research' ? <BookOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <span className="text-[10px] text-slate-400">{new Date(doc.timestamp).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-semibold text-slate-900 line-clamp-2 mb-1">{doc.title}</h4>
                            {tab === 'research' && doc.tags && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {doc.tags.slice(0, 3).map(t => (
                                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{t}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// -- TOOLS SUITE (IMPLEMENTED) --
const ToolsView = ({ onSave, docs }: { onSave: (title: string, content: string, type: string) => void, docs: SavedDocument[] }) => {
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
    const [ipcResult, setIpcResult] = useState<string>('');

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
        const prima = (base * days) / 360; // Simplified for total period
        const vacaciones = (sal * days) / 720;

        setLaborResult({ cesantias, intereses, prima, vacaciones, total: cesantias + intereses + prima + vacaciones });
    };

    const calculateTerm = () => {
        if (!termDate || !termDays) return;
        const start = new Date(termDate);
        const daysToAdd = parseInt(termDays);
        let count = 0;
        let current = new Date(start);

        // Advance 1 day to start counting from next business day usually, 
        // but here we just count N business days forward.
        while (count < daysToAdd) {
            current.setDate(current.getDate() + 1);
            const day = current.getDay();
            if (day !== 0 && day !== 6) { // Not Sun (0) or Sat (6)
                count++;
            }
        }
        setTermResult(current.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };

    const calculateIPC = () => {
        if (!capital) return;
        // Mock inflation logic (approx 5% annual) since we don't have real IPC table
        // VP = VH * (IPC Final / IPC Inicial)
        const val = parseFloat(capital);
        const inflated = val * 1.05; // Dummy 5% adjustment
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
                                    <label className="text-xs font-bold uppercase text-slate-500">Fecha Notificación</label>
                                    <input type="date" value={termDate} onChange={e => setTermDate(e.target.value)} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Días del Término (Hábiles)</label>
                                    <input type="number" value={termDays} onChange={e => setTermDays(e.target.value)} className="w-full p-2 border rounded" placeholder="Ej: 3, 5, 10" />
                                </div>
                            </div>
                            <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-100">
                                Nota: Esta herramienta excluye automáticamente sábados y domingos. No tiene en cuenta festivos específicos.
                            </div>
                            <Button className="w-full" onClick={calculateTerm}>Calcular Vencimiento</Button>
                            {termResult && (
                                <div className="mt-6 text-center">
                                    <span className="block text-xs text-slate-500 uppercase">El término vence el:</span>
                                    <span className="text-2xl font-bold text-blue-700">{termResult}</span>
                                </div>
                            )}
                        </div>
                    )
                }
                {
                    activeTool === 'ipc' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg mb-4">Indexación de Capital (IPC)</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Capital Inicial</label>
                                    <input type="number" value={capital} onChange={e => setCapital(e.target.value)} className="w-full p-2 border rounded" placeholder="$ Valor a indexar" />
                                </div>
                                <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded">
                                    * En esta versión Demo, aplicamos una tasa fija de indexación del 5% anual como ejemplo.
                                </div>
                            </div>
                            <Button className="w-full" onClick={calculateIPC}>Actualizar Valor</Button>
                            {ipcResult && (
                                <div className="mt-6 text-center">
                                    <span className="block text-xs text-slate-500 uppercase">Valor Indexado (Estimado):</span>
                                    <span className="text-3xl font-bold text-green-600">{ipcResult}</span>
                                </div>
                            )}
                        </div>
                    )
                }
            </Card >
        </div >
    );
}

// -- CALENDAR --
const CalendarView = ({ events, onAddEvent, onUpdateEvent, onDeleteEvent, showToast }: { events: CalendarEvent[], onAddEvent: (e: CalendarEvent) => void, onUpdateEvent: (e: CalendarEvent) => void, onDeleteEvent: (id: string) => void, showToast: (t: any, m: string) => void }) => {
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

// -- DRAFTER (RESTORED) --
const DrafterView = ({ user, onUpgrade, onSave, initialContent, showToast, isZenMode, toggleZenMode }: any) => {
    const [type, setType] = useState(initialContent?.type || DocType.TUTELA);
    const [details, setDetails] = useState(initialContent?.content || '');

    // Persistence for draft result only
    const [result, setResult] = useState(() => localStorage.getItem('toga_draft_result') || '');
    const [isEditing, setIsEditing] = useState(false);

    const [loading, setLoading] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => { localStorage.setItem('toga_draft_result', result); }, [result]);

    const handleDraft = async () => {
        setLoading(true);
        setResult('');
        try {
            const stream = generateLegalDocumentStream(type, details);
            for await (const chunk of stream) {
                setResult(prev => prev + chunk);
                if (resultRef.current) resultRef.current.scrollTop = resultRef.current.scrollHeight;
            }
        } catch (e) { showToast('error', "Error generando documento"); }
        finally { setLoading(false); }
    };

    const copyToClipboard = () => { navigator.clipboard.writeText(result); showToast('success', "Copiado"); };

    const handleDownload = () => {
        // Export to Word-compatible HTML
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Document</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; text-align: justify;">${document.getElementById('legal-document-content')?.innerHTML}</div>` + footer;

        const sourceBlob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(sourceBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `borrador_${type.toLowerCase().replace(/ /g, '_')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveBtn = () => {
        if (!result) return;
        const title = window.prompt("Nombre del documento:", `${type} - ${new Date().toLocaleDateString()}`);
        if (title) onSave(title, result, type);
    }

    return (
        <div className={`grid grid-cols-1 ${isZenMode ? 'lg:grid-cols-1 h-screen' : 'lg:grid-cols-2 h-[calc(100vh-140px)]'} gap-8 print:block print:h-auto`}>
            {/* Settings Panel */}
            {!isZenMode && (
                <Card title="Configuración" className="flex flex-col h-full print:hidden">
                    <PremiumLock isPremium={user.role === 'PREMIUM'} onUpgrade={onUpgrade}>
                        <div className="space-y-6" data-toga-help="drafter-config">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Documento</label>
                                <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500">
                                    {Object.values(DocType).filter(t => t !== DocType.JURISPRUDENCIA).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-700">Hechos y Detalles</label>
                                    <VoiceRecorder onResult={(text) => setDetails((prev: string) => (prev ? prev + ' ' : '') + text)} />
                                </div>
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Describe los hechos..."
                                    className="flex-1 w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 resize-none text-sm leading-relaxed"
                                />
                            </div>
                            <Button onClick={handleDraft} isLoading={loading} className="w-full py-3" disabled={!details}>
                                {loading ? 'Redactando...' : 'Generar Borrador con IA'}
                            </Button>
                        </div>
                    </PremiumLock>
                </Card>
            )}

            {/* Result Panel */}
            <Card className={`flex flex-col h-full bg-slate-50 relative p-0 overflow-hidden print:shadow-none print:border-none print:bg-white print:overflow-visible ${isZenMode ? 'rounded-none border-none' : ''}`}>
                <div className="px-4 py-3 border-b border-slate-200 bg-white flex justify-between items-center sticky top-0 z-10 print:hidden">
                    <div className="flex items-center gap-2">
                        <button onClick={toggleZenMode} title={isZenMode ? "Salir Modo Zen" : "Modo Zen"} className="p-2 hover:bg-slate-100 rounded text-slate-600">
                            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <h3 className="font-semibold text-slate-800 hidden sm:block">Editor</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded flex items-center gap-2 text-sm font-medium ${isEditing ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}>
                            {isEditing ? <><Eye className="w-4 h-4" /> Ver</> : <><Edit2 className="w-4 h-4" /> Editar</>}
                        </button>
                        <div className="h-8 w-px bg-slate-200 mx-1"></div>
                        <Button size="sm" onClick={handleSaveBtn} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Save className="w-4 h-4" /> Guardar
                        </Button>
                        <div className="h-8 w-px bg-slate-200 mx-1"></div>
                        <button onClick={() => window.print()} title="Imprimir" className="p-2 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"><Printer className="w-4 h-4" /></button>
                        <button onClick={handleDownload} title="Word (.doc)" className="p-2 text-white bg-blue-700 hover:bg-blue-800 rounded"><FileText className="w-4 h-4" /></button>
                        <button onClick={copyToClipboard} title="Copiar" className="p-2 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm("¿Limpiar?")) setResult('') }} title="Limpiar" className="p-2 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>

                <div data-toga-help="drafter-result" ref={resultRef} className={`flex-1 overflow-y-auto bg-white print:p-0 print:overflow-visible ${isZenMode ? 'p-12 max-w-3xl mx-auto shadow-2xl my-8' : 'p-8'}`}>
                    {result ? (
                        <div id="legal-document-content" className="h-full">
                            {isEditing ? (
                                <textarea
                                    className="w-full h-full p-4 border rounded font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    value={result}
                                    onChange={(e) => setResult(e.target.value)}
                                />
                            ) : (
                                <MarkdownRenderer content={result} />
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center border-2 border-dashed border-slate-100 rounded-lg m-4 print:hidden">
                            <PenTool className="w-12 h-12 mb-4 opacity-30" />
                            <p>El documento generado aparecerá aquí.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

// -- COMPARATOR --
const ComparatorView = ({ user, onUpgrade, showToast }: any) => {
    const [textA, setTextA] = useState('');
    const [textB, setTextB] = useState('');
    const [comparison, setComparison] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileRead = async (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            let extractedText = '';

            if (file.type === 'application/pdf') {
                showToast('info', `Leyendo PDF: ${file.name}...`);
                extractedText = await extractTextFromPdf(file);
            } else if (file.name.endsWith('.docx')) {
                showToast('info', `Leyendo Word: ${file.name}...`);
                extractedText = await extractTextFromDocx(file);
            } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                // Text/Markdown file
                extractedText = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            } else {
                showToast('error', 'Formato no soportado. Usa PDF, DOCX, TXT o BASENAME.');
                setLoading(false);
                return;
            }

            if (target === 'A') setTextA(extractedText);
            else setTextB(extractedText);

            showToast('success', 'Texto extraído correctamente');

        } catch (error: any) {
            console.error(error);
            showToast('error', error.message || 'Error leyendo el archivo');
        } finally {
            setLoading(false);
        }
    };

    const handleCompare = async () => {
        setLoading(true);
        try {
            const res = await compareJurisprudence(textA, textB);
            setComparison(res);
            showToast('success', 'Comparación completada');
        } catch (error) { showToast('error', "Error"); } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <PremiumLock isPremium={user.role === 'PREMIUM'} onUpgrade={onUpgrade}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-toga-help="comparator-inputs">
                    <Card title="Texto A / Archivo 1">
                        <div className="mb-2">
                            <input type="file" accept=".txt,.md,.pdf,.docx" onChange={(e) => handleFileRead(e, 'A')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        <textarea className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-xs" placeholder="O pega el texto aquí..." value={textA} onChange={(e) => setTextA(e.target.value)} />
                    </Card>
                    <Card title="Texto B / Archivo 2">
                        <div className="mb-2">
                            <input type="file" accept=".txt,.md,.pdf,.docx" onChange={(e) => handleFileRead(e, 'B')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        <textarea className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-xs" placeholder="O pega el texto aquí..." value={textB} onChange={(e) => setTextB(e.target.value)} />
                    </Card>
                </div>
                <div className="flex justify-center mt-6">
                    <Button onClick={handleCompare} isLoading={loading} disabled={!textA || !textB} className="px-8">Comparar Jurisprudencia</Button>
                </div>
                {comparison && (
                    <Card title="Análisis Comparativo IA" className="mt-8 bg-blue-50/50 border-blue-100">
                        <MarkdownRenderer content={comparison} />
                    </Card>
                )}
            </PremiumLock>
        </div>
    );
};



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

// -- COMMUNITY --
const CommunityView = ({ user, posts, onAddPost }: any) => {
    const [newPostContent, setNewPostContent] = useState('');
    const [isAnon, setIsAnon] = useState(false);

    const handlePost = () => {
        if (!newPostContent.trim()) return;
        onAddPost({
            id: Date.now().toString(),
            author: isAnon ? 'Anónimo' : user.name,
            authorRole: 'Abogado',
            content: newPostContent,
            likes: 0,
            comments: 0,
            isAnonymous: isAnon,
            tags: ['General'],
            timestamp: 'Ahora'
        });
        setNewPostContent('');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-4 bg-white">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold">{user.name[0]}</div>
                    <div className="flex-1" data-toga-help="community-post-input">
                        <textarea
                            value={newPostContent}
                            onChange={e => setNewPostContent(e.target.value)}
                            placeholder="Comparte una duda jurídica o un caso de éxito..."
                            className="w-full p-2 bg-slate-50 rounded-lg border-transparent focus:bg-white focus:border-slate-300 focus:ring-0 transition-all resize-none h-20"
                        />
                        <div className="flex justify-between items-center mt-2">
                            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                                <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                Publicar como anónimo
                            </label>
                            <Button onClick={handlePost} disabled={!newPostContent}>Publicar</Button>
                        </div>
                    </div>
                </div>
            </Card>

            {posts.map((post: Post) => (
                <Card key={post.id} className="p-0">
                    <div className="p-4 border-b border-slate-50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                ${post.isAnonymous ? 'bg-slate-400' : 'bg-blue-600'}`}>
                                {post.author[0]}
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">{post.author}</h4>
                                <p className="text-xs text-slate-500">{post.authorRole} • {post.timestamp}</p>
                            </div>
                        </div>
                        <p className="text-slate-700 leading-relaxed mb-3">{post.content}</p>
                        <div className="flex gap-2">
                            {post.tags.map(tag => (
                                <span key={tag} className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">#{tag}</span>
                            ))}
                        </div>
                    </div>
                    <div className="px-4 py-3 bg-slate-50 flex gap-6 text-sm text-slate-500 font-medium">
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <ThumbsUp className="w-4 h-4" /> {post.likes}
                        </button>
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <MessageSquare className="w-4 h-4" /> {post.comments}
                        </button>
                    </div>
                </Card>
            ))}
        </div>
    );
};

const ProfileView = ({ user, docs, events, posts, onUpdateUser, onUpgrade, onLogout, showToast }: any) => {
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


export default App;

// --- MOBILE NAVIGATION BAR ---
const MobileTabBar = ({ activeView, onChangeView }: { activeView: string, onChangeView: (v: string) => void }) => {
    const tabs = [
        { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
        { id: 'cases', label: 'Casos', icon: Briefcase },
        { id: 'search', label: 'Buscador', icon: SearchIcon },
        { id: 'chat', label: 'Chat IA', icon: MessageSquare },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] px-4 py-2 pb-safe z-50 flex justify-around items-center h-16">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeView === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            onChangeView(tab.id);
                        }}
                        className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${isActive ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <div className={`p-1 rounded-full ${isActive ? 'bg-blue-50' : ''}`}>
                            <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
                        </div>
                        <span className="text-[10px] font-medium">{tab.label}</span>
                    </button>
                )
            })}
            <button
                onClick={() => onChangeView('profile')}
                className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${activeView === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}
            >
                <div className={`p-1 rounded-full ${activeView === 'profile' ? 'bg-blue-50' : ''}`}>
                    <UserCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">Perfil</span>
            </button>
        </div>
    );
};
