
import React, { useState } from 'react';
import { Button } from '../components/UIComponents';
import { supabase } from '../services/supabaseClient';

export const LoginView = ({ onBack }: { onBack: () => void }) => {
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        if (!supabase) {
            alert("Error: Supabase no está configurado correctamente.");
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            alert(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl max-w-sm w-full shadow-2xl">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Iniciar Sesión</h2>
                    <p className="text-slate-500 text-sm">Accede a tu cuenta Toga</p>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                        {loading ? 'Redirigiendo...' : 'Continuar con Google'}
                    </Button>
                </div>

                <button onClick={onBack} className="block w-full text-center mt-6 text-sm text-slate-400 hover:text-slate-600">
                    Volver al Inicio
                </button>
            </div>
        </div>
    );
};
