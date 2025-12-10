import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Library, 
  CalendarDays, 
  PenTool, 
  Scale, 
  Users, 
  UserCircle,
  LogOut,
  Calculator
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onChangeView: (view: string) => void;
  isMobileOpen: boolean;
  toggleMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onChangeView, isMobileOpen, toggleMobile }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'search', label: 'Buscador', icon: Search },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'calendar', label: 'Agenda', icon: CalendarDays },
    { id: 'tools', label: 'Herramientas', icon: Calculator },
    { id: 'drafter', label: 'Redactor IA', icon: PenTool, badge: 'PRO' },
    { id: 'comparator', label: 'Comparador', icon: Scale, badge: 'PRO' },
    { id: 'community', label: 'Comunidad', icon: Users },
    { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 flex flex-col h-full
      `}
      data-toga-help="sidebar" // General help for the sidebar area
      >
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Scale className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">TOGA <span className="text-blue-400 text-xs font-normal">LegalTech</span></h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    id={`nav-${item.id}`}
                    data-toga-help={`nav-${item.id}`} // Specific help identifier
                    onClick={() => {
                      onChangeView(item.id);
                      if (window.innerWidth < 768) toggleMobile();
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            data-toga-help="nav-logout"
            className="flex items-center gap-3 text-slate-400 hover:text-white text-sm font-medium px-3 py-2 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;