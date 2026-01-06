
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import Sidebar from './components/Sidebar';
import { Modal, TogadoCompanion, ToastNotification, ToastProps, WompiWidget } from './components/UIComponents';
import { MobileTabBar } from './components/MobileTabBar';
import { QuestBoard, LevelBadge } from './components/QuestComponents';
import { OnboardingView } from './components/OnboardingView';
import { DataService } from './services/dataService';
import { User, SavedDocument, CalendarEvent, Post, PostComment, AnalyzedDecision, Case, Quest, DocType } from './types';
import { Menu, Bell, Search as SearchIcon, PenTool, Briefcase } from 'lucide-react';

// Views
import { LandingView } from './views/LandingView';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { CasesView } from './views/CasesView';
import { SearchView } from './views/SearchView';
import { LibraryView } from './views/LibraryView';
import { ToolsView } from './views/ToolsView';
import { CalendarView } from './views/CalendarView';
import { DrafterView } from './views/DrafterView';
import { ComparatorView } from './views/ComparatorView';
import { CanalView } from './views/CanalView';
import { CommunityView } from './views/CommunityView';
import { ProfileView } from './views/ProfileView';

// Constantes
import { MOCK_CASES } from './constants';

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

    // [NEW] Quest System State
    const [quests, setQuests] = useState<Quest[]>([]);

    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const addToast = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, message, onClose: removeToast }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleCompleteQuest = async (actionId: string) => {
        if (!user) return;
        const { updatedUser, questCompleted } = await DataService.completeQuest(actionId, user);
        if (questCompleted) {
            setUser(updatedUser);
            // Refresh local quest state
            const newQuests = await DataService.getQuests();
            setQuests(newQuests);
            addToast('success', `¡Misión Completada: ${questCompleted.title}! (+${questCompleted.xpReward} XP)`);
        }
    };

    // [NEW] Dashboard Search State
    const [searchQuery, setSearchQuery] = useState('');

    // --- Initial Data Load & Wompi Payment Check ---
    useEffect(() => {
        // [NEW] Supabase Auth Listener
        if (!supabase) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                // Fetch or Create user profile
                // NOTE: For now we default to Free user.
                const newUser: User = {
                    id: session.user.id,
                    name: session.user.user_metadata.full_name || 'Abogado',
                    email: session.user.email || '',
                    role: 'FREE',
                    reputation: 100,
                    avatarUrl: session.user.user_metadata.avatar_url,
                    onboardingCompleted: false, // Force check
                    togaCoins: 50, // Welcome Bonus
                    apiKeys: {}
                };

                // Check if we have local data for this user to restore interests
                const saved = await DataService.getUser();
                if (saved && saved.id === newUser.id) {
                    newUser.interests = saved.interests;
                    newUser.onboardingCompleted = saved.onboardingCompleted;
                }

                setUser(newUser);
                localStorage.setItem('toga_user', JSON.stringify(newUser));
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                localStorage.removeItem('toga_user');
            }
        });

        // Version 1.0.2 - Force Update
        const initData = async () => {
            setLoadingData(true);
            try {
                // Timeout promise to force load after 5 seconds if connection hangs
                const dataPromise = (async () => {
                    const u = await DataService.getUser();

                    // --- WOMPI PAYMENT CHECK START ---
                    const query = new URLSearchParams(window.location.search);
                    const transactionId = query.get('id');

                    if (transactionId && u && u.role !== 'PREMIUM') {
                        const upgradedUser = { ...u, role: 'PREMIUM' as const };
                        await DataService.updateUser(upgradedUser);
                        setUser(upgradedUser);
                        addToast('success', '¡Pago procesado correctamente! Eres Premium.');
                        window.history.replaceState({}, document.title, window.location.pathname);
                        return upgradedUser; // Use upgraded user for data fetch
                    } else {
                        setUser(u);
                        return u;
                    }
                    // --- WOMPI PAYMENT CHECK END ---
                })();

                // Race between data fetch and 7s timeout
                const u = await Promise.race([
                    dataPromise,
                    new Promise<User | null>((resolve) => setTimeout(() => resolve(null), 7000))
                ]);

                if (u) {
                    const [d, e, p, q, c] = await Promise.all([
                        DataService.getDocuments(u.id),
                        DataService.getEvents(u.id),
                        DataService.getPosts(),
                        DataService.getQuests(),
                        DataService.getCases(u.id)
                    ]);
                    setSavedDocs(d);
                    setEvents(e);
                    setPosts(p);
                    setQuests(q);
                    setCases(c);
                } else {
                    setPosts(await DataService.getPosts());
                }
            } catch (error) {
                console.error("Error initializing data:", error);
                addToast('error', 'Error de conexión. Cargando modo offline.');
            } finally {
                setLoadingData(false);
            }
        };
        initData();
        return () => { subscription.unsubscribe(); };
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
            setUser({ ...loggedUser, onboardingCompleted: false, interests: [], togaCoins: 50, apiKeys: {} });
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
            type: type as DocType,
            content,
            timestamp: new Date().toISOString(),
            tags,
            sourceUrl,
            analysis
        };

        setSavedDocs(prev => [newDoc, ...prev]);
        await DataService.saveDocument(user.id, newDoc);
        handleCompleteQuest('upload_doc');
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
        return <LoginView onBack={() => setAuthView('landing')} />;
    }

    // [NEW] Show Onboarding
    if (user.onboardingCompleted === false) {
        return <OnboardingView onComplete={handleOnboardingComplete} />;
    }

    // [NEW] Quest Navigation
    const handleGoToQuest = (actionId: string) => {
        switch (actionId) {
            case 'create_case': setActiveView('cases'); break;
            case 'upload_doc': setActiveView('library'); break; // Or tools/drafter depending on flow
            case 'chat_ai': setActiveView('search'); break;
            default: break;
        }
    };

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
                                quests={quests}
                                onChangeView={setActiveView}
                                searchQuery={searchQuery}
                                onSearch={setSearchQuery}
                                onGoToQuest={handleGoToQuest}
                            />
                        )}
                        {activeView === 'cases' && <CasesView cases={cases} setCases={setCases} onAction={handleCompleteQuest} />}
                        {activeView === 'search' && <SearchView showToast={addToast} onSave={handleSaveDocument} onAction={handleCompleteQuest} />}
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

            {/* Upgrade Modal */}
            <Modal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} title="Plan Premium Toga">
                <div className="text-center">
                    <div className="mb-6">
                        <h4 className="text-2xl font-bold text-slate-900 mb-2">$89.000 COP / mes</h4>
                        <p className="text-slate-500">Acceso ilimitado a herramientas de IA</p>
                    </div>
                    <div className="mb-4">
                        <p className="text-sm text-slate-600 mb-4">Paga seguro con:</p>
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

export default App;
