
import React from 'react';
import { Search as SearchIcon, PenTool, Briefcase } from 'lucide-react';
import { Button } from '../components/UIComponents';

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

export const LandingView = ({ onEnter }: { onEnter: () => void }) => {
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
