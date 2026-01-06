import React, { useState, useEffect } from 'react';
import { User, Permission, hasPermission } from '../types';
import { DataService } from '../services/dataService';
import { Card, Button } from '../components/UIComponents';
import { Shield, Lock, Users, TrendingUp, Search, UserCheck, AlertTriangle, Calculator } from 'lucide-react';
import { supabase } from '../services/supabaseClient'; // Direct access for specialized queries

interface AdminViewProps {
    currentUser: User;
    showToast: (type: 'success' | 'error', message: string) => void;
}

const PERMISSION_LABELS: Record<Permission, string> = {
    'ADMIN_ACCESS': 'Acceso Panel Admin',
    'MANAGE_STAFF': 'Gestionar Staff (Superadmin)',
    'MANAGE_USERS': 'Gestionar Usuarios',
    'MANAGE_BALANCE': 'Gestión Financiera (Saldo)',
    'VIEW_FINANCIALS': 'Ver Finanzas Globales',
    'MANAGE_KNOWLEDGE': 'Gestión de Contenido/IA'
};

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, showToast }) => {
    // 1. Security Check
    if (!hasPermission(currentUser, 'ADMIN_ACCESS')) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <Lock className="w-16 h-16 mb-4 text-red-300" />
                <h2 className="text-2xl font-bold text-slate-800">Acceso Restringido</h2>
                <p>No tienes los permisos necesarios para estar aquí.</p>
            </div>
        );
    }

    const [activeTab, setActiveTab] = useState<'users' | 'staff' | 'financials'>('users');
    const [searchQuery, setSearchQuery] = useState('');
    const [usersList, setUsersList] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Staff Management State
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // --- FETCH DATA ---
    // Note: In a real app, this would be a paginated query to a specialized Admin API endpoint.
    // Since we are using RLS, we need to ensure the policy allows this user to see everyone.
    // For MVP, if we are 'simidscolombia', we might need to use a Service Role Key or
    // rely on the RLS policy "Admins can view all profiles" we created.
    const fetchUsers = async () => {
        setIsLoading(true);
        // Mock fetch for MVP if not connected or RLS blocks
        // In FULL implementation, this calls Supabase.
        // Validar cliente Supabase
        if (!supabase) {
            console.error("CRITICAL: Supabase Client is NULL. Check Environment Variables.");
            showToast('error', "Error Crítico: No hay conexión a base de datos.");
            return;
        }

        console.log("Fetching users with Supabase..."); // Debug log
        const { data, error } = await supabase.from('profiles').select('*').limit(50);

        if (error) {
            console.error("ADMIN FETCH ERROR:", error);
            showToast('error', `Error cargando usuarios: ${error.message}`);
        } else {
            console.log("ADMIN FETCH SUCCESS:", data?.length, "rows");
        }

        if (data) {
            const mappedUsers: User[] = data.map((p: any) => ({
                id: p.id,
                name: p.full_name || 'Sin Nombre',
                email: p.email || 'No Email', // Note: Email is in auth.users, difficult to join without function
                role: p.role || 'FREE',
                permissions: p.permissions || [],
                reputation: p.reputation || 0,
                togaCoins: p.toga_coins || 0
            }));
            setUsersList(mappedUsers);
        } else {
            // Fallback for demo
            setUsersList([currentUser]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // --- ACTIONS ---

    const handleTogglePermission = async (user: User, permission: Permission) => {
        if (!hasPermission(currentUser, 'MANAGE_STAFF')) {
            showToast('error', 'No tienes permiso para gestionar staff.');
            return;
        }

        const currentPermissions = user.permissions || [];
        const hasIt = currentPermissions.includes(permission);

        let newPermissions: Permission[];
        if (hasIt) {
            newPermissions = currentPermissions.filter(p => p !== permission);
        } else {
            newPermissions = [...currentPermissions, permission];
        }

        // Optimistic Update
        const updatedUser = { ...user, permissions: newPermissions };
        setUsersList(prev => prev.map(u => u.id === user.id ? updatedUser : u));
        setSelectedUser(updatedUser);

        // Save to DB
        await DataService.updateUser(updatedUser);
        showToast('success', `Permisos de ${user.name} actualizados`);
    };

    const handleRecharge = async (user: User, amount: number) => {
        if (!hasPermission(currentUser, 'MANAGE_BALANCE')) {
            showToast('error', 'No tienes permiso para gestionar saldo.');
            return;
        }

        const updatedUser = { ...user, togaCoins: (user.togaCoins || 0) + amount };
        setUsersList(prev => prev.map(u => u.id === user.id ? updatedUser : u));
        await DataService.updateUser(updatedUser);
        showToast('success', `Recarga exitosa. Nuevo saldo: ${updatedUser.togaCoins}`);
    };


    // --- RENDER ---
    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <header className="bg-slate-900 text-white p-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-red-500" />
                        <div>
                            <h1 className="text-2xl font-bold">Panel de Comando Toga</h1>
                            <p className="text-slate-400 text-sm">Administración y Seguridad</p>
                        </div>
                    </div>
                    {/* DEBUG PANEL */}
                    <div className="bg-slate-800 p-2 rounded text-xs font-mono border border-slate-700">
                        <p className={supabase ? "text-green-400" : "text-red-500"}>
                            ● Client: {supabase ? "OK" : "NULL"}
                        </p>
                        <p className="text-slate-400">
                            Users: {usersList.length}
                        </p>
                        <button
                            onClick={fetchUsers}
                            className="mt-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
                        >
                            🔄 Re-Fetch
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                        <Users className="w-4 h-4 inline mr-2" /> Usuarios
                    </button>
                    {hasPermission(currentUser, 'MANAGE_STAFF') && (
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'staff' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                        >
                            <UserCheck className="w-4 h-4 inline mr-2" /> Staff & Permisos
                        </button>
                    )}
                    {hasPermission(currentUser, 'VIEW_FINANCIALS') && (
                        <button
                            onClick={() => setActiveTab('financials')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'financials' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                        >
                            <TrendingUp className="w-4 h-4 inline mr-2" /> Finanzas
                        </button>
                    )}
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-hidden flex">

                {/* USER LIST (Left Pane) */}
                <div className="w-1/3 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col mr-6">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            className="flex-1 outline-none text-sm"
                            placeholder="Buscar usuario (email, nombre)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {usersList
                            .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* DETAIL VIEW (Right Pane) */}
                <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm p-6 overflow-y-auto">
                    {selectedUser ? (
                        <>
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden">
                                        {selectedUser.avatarUrl && <img src={selectedUser.avatarUrl} className="w-full h-full object-cover" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedUser.name}</h2>
                                        <p className="text-slate-500">{selectedUser.email}</p>
                                        <p className="text-xs font-mono text-slate-400 mt-1">{selectedUser.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">Saldo Actual</p>
                                    <p className="text-2xl font-bold text-slate-800">{selectedUser.togaCoins} <span className="text-sm font-normal">TC</span></p>
                                </div>
                            </div>

                            {/* TAB: STAFF MANAGEMENT */}
                            {activeTab === 'staff' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-purple-600" /> Permisos & Seguridad
                                    </h3>

                                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                        <div className="grid grid-cols-2 gap-4">
                                            {(Object.entries(PERMISSION_LABELS) as [Permission, string][]).map(([permKey, label]) => (
                                                <label key={permKey} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                        checked={selectedUser.permissions?.includes(permKey) || false}
                                                        onChange={() => handleTogglePermission(selectedUser, permKey)}
                                                        disabled={
                                                            (permKey === 'MANAGE_STAFF' && currentUser.email !== 'simidscolombia@gmail.com') ||
                                                            (selectedUser.email === 'simidscolombia@gmail.com') // Can't edit God
                                                        }
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200 flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <p>Cuidado: Otorgar "ADMIN_ACCESS" permite al usuario ver este panel. "MANAGE_STAFF" permite crear otros administradores.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: USERS / BALANCE */}
                            {activeTab === 'users' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Calculator className="w-5 h-5 text-green-600" /> Gestión de Saldo
                                    </h3>

                                    {hasPermission(currentUser, 'MANAGE_BALANCE') ? (
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <button onClick={() => handleRecharge(selectedUser, 50)} className="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-700 font-bold transition-colors">
                                                + 50 TC
                                            </button>
                                            <button onClick={() => handleRecharge(selectedUser, 100)} className="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-700 font-bold transition-colors">
                                                + 100 TC
                                            </button>
                                            <button onClick={() => handleRecharge(selectedUser, 500)} className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-purple-700 font-bold transition-colors">
                                                + 500 TC
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 italic">No tienes permisos para modificar el saldo.</p>
                                    )}
                                </div>
                            )}

                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <UserCheck className="w-16 h-16 mb-4 opacity-20" />
                            <p>Selecciona un usuario de la lista</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
