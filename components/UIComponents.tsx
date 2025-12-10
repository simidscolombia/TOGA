
import React, { useEffect, useState, useRef } from 'react';
import { Lock, X, CheckCircle2, FileDown, Copy, RefreshCw, ChevronRight, ChevronLeft, Zap, Sparkles, HelpCircle, Lightbulb, Send, MessageSquare, Minimize2, Mic, MicOff, AlertCircle, Info } from 'lucide-react';
import { askTogado } from '../services/geminiService';
import { SpeechRecognition } from '../types';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {title && <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-800">{title}</div>}
    <div className="p-6">{children}</div>
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'premium';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', isLoading, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
    secondary: "bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-800",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-200 bg-white",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    premium: "bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:from-amber-500 hover:to-amber-700 shadow-md"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

// --- Toast Notification ---
export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: (id: string) => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ id, type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgColors = {
    success: 'bg-white border-green-100',
    error: 'bg-white border-red-100',
    info: 'bg-white border-blue-100'
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${bgColors[type]} animate-in slide-in-from-right-full duration-300 max-w-sm w-full mb-3`}>
      {icons[type]}
      <p className="flex-1 text-sm font-medium text-slate-700">{message}</p>
      <button onClick={() => onClose(id)} className="text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// --- Voice Recorder Component ---
export const VoiceRecorder: React.FC<{ onResult: (text: string) => void; className?: string }> = ({ onResult, className }) => {
  const [isListening, setIsListening] = useState(false);
  
  const handleListen = () => {
    if (isListening) return; 
    
    // Safety check for browser support
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Tu navegador no soporta dictado por voz. Intenta usar Chrome o Safari.");
      return;
    }
    
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
        console.error("Speech error", event);
        setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
          onResult(transcript);
      }
    };
    
    recognition.start();
  };

  return (
    <button 
      onClick={handleListen} 
      type="button"
      className={`p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-red-100 text-red-600 ring-2 ring-red-400 ring-offset-2 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'} ${className}`}
      title={isListening ? "Escuchando..." : "Dictar por voz"}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
};

// --- Modal ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- Premium Lock Overlay ---
interface PremiumLockProps {
  isPremium: boolean;
  onUpgrade: () => void;
  children: React.ReactNode;
}

export const PremiumLock: React.FC<PremiumLockProps> = ({ isPremium, onUpgrade, children }) => {
  if (isPremium) return <>{children}</>;

  return (
    <div className="relative w-full h-full">
      <div className="blur-sm pointer-events-none select-none opacity-50 h-full overflow-hidden" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-amber-100 max-w-sm">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Función Premium</h3>
          <p className="text-slate-600 text-sm mb-6">
            Desbloquea el poder de la IA, análisis ilimitados y redacción automática actualizando tu plan.
          </p>
          <Button variant="premium" onClick={onUpgrade} className="w-full">
            Actualizar a Premium
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Simple Markdown Renderer ---
export const MarkdownRenderer: React.FC<{ content: string; id?: string }> = ({ content, id }) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div id={id} className="space-y-4 text-slate-900 leading-relaxed font-serif text-justify selection:bg-blue-100 selection:text-blue-900" style={{ fontFamily: "'Merriweather', serif" }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-black mt-6 mb-2 uppercase tracking-wide">{line.replace('### ', '')}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-black mt-8 mb-4 border-b-2 border-slate-200 pb-2 uppercase">{line.replace('## ', '')}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-black mt-8 mb-6 text-center uppercase">{line.replace('# ', '')}</h1>;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={i} className="flex gap-3 ml-6">
              <span className="text-slate-800 mt-1">•</span>
              <p dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^[-*]\s/, '')) }} />
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
           return (
            <div key={i} className="flex gap-3 ml-6">
               <span className="font-bold text-slate-700 min-w-[20px]">{line.match(/^\d+\./)?.[0]}</span>
               <p dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\.\s/, '')) }} />
            </div>
           )
        }
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />;
      })}
    </div>
  );
};

const formatInline = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<u>$1</u>');
};

// --- Togado Avatar (The Owl) ---
const TogadoAvatar = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3"/>
    </filter>
    <g filter="url(#shadow)">
      <circle cx="100" cy="100" r="90" fill="#4f46e5" />
      <circle cx="100" cy="100" r="80" fill="url(#grad1)" fillOpacity="0.5"/>
      <path d="M 30 30 L 60 70 L 90 90 Z" fill="#312e81" /> 
      <path d="M 170 30 L 140 70 L 110 90 Z" fill="#312e81" />
      <ellipse cx="70" cy="85" rx="35" ry="35" fill="#e0e7ff" />
      <ellipse cx="130" cy="85" rx="35" ry="35" fill="#e0e7ff" />
      <circle cx="70" cy="85" r="35" fill="none" stroke="#1e293b" strokeWidth="6" />
      <circle cx="130" cy="85" r="35" fill="none" stroke="#1e293b" strokeWidth="6" />
      <path d="M 105 85 L 95 85" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
      <circle cx="70" cy="85" r="12" fill="#1e293b">
        <animate attributeName="cy" values="85;90;85" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="130" cy="85" r="12" fill="#1e293b">
        <animate attributeName="cy" values="85;90;85" dur="3s" repeatCount="indefinite" />
      </circle>
      <path d="M 100 115 L 90 135 L 110 135 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
      <path d="M 85 160 L 115 160 L 100 175 Z" fill="white" />
      <path d="M 85 160 L 85 175 L 100 170 Z" fill="#e2e8f0" />
      <path d="M 115 160 L 115 175 L 100 170 Z" fill="#e2e8f0" />
    </g>
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'rgb(99,102,241)', stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:'rgb(55,48,163)', stopOpacity:1}} />
      </linearGradient>
    </defs>
  </svg>
);

// --- Togado Chat Companion ---
interface TogadoCompanionProps {
  knowledgeBase: Record<string, { title: string; description: string; tip?: string }>;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'togado';
    text?: string;
    helpContext?: { title: string; description: string; tip?: string }; // Special card message
    timestamp: Date;
}

export const TogadoCompanion: React.FC<TogadoCompanionProps> = ({ knowledgeBase }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ref for Long Press Timer
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial welcome
  useEffect(() => {
    const timer = setTimeout(() => {
        setMessages([{
            id: 'welcome',
            role: 'togado',
            text: "¡Hola! Soy Togado. Haz doble clic en cualquier botón para ver qué hace, o escríbeme aquí si tienes dudas jurídicas.",
            timestamp: new Date()
        }]);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll
  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
      if (!inputValue.trim()) return;

      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: inputValue,
          timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMsg]);
      setInputValue('');
      setIsTyping(true);

      try {
          const responseText = await askTogado(userMsg.text || '');
          const aiMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'togado',
              text: responseText,
              timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMsg]);
      } catch (e) {
          // Error handled in service, but just in case
      } finally {
          setIsTyping(false);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  };

  // --- Interaction Logic (Double Click & Long Press) ---
  useEffect(() => {
    
    const triggerHelp = (target: HTMLElement) => {
        const helpId = target.getAttribute('data-toga-help');
        if (helpId && knowledgeBase[helpId]) {
          const data = knowledgeBase[helpId];
          setHighlightRect(target.getBoundingClientRect());
          setIsOpen(true);
          
          // Add specialized Help Card to chat
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'togado',
              helpContext: data,
              timestamp: new Date()
          }]);

          // Remove Highlight after a few seconds
          setTimeout(() => setHighlightRect(null), 4000);
          
          if (navigator.vibrate) navigator.vibrate(50);
        } else {
             setHighlightRect(null);
        }
    };

    // 1. Double Click Handler
    const handleDoubleClick = (e: MouseEvent) => {
        const target = (e.target as HTMLElement).closest('[data-toga-help]');
        if (target) {
            e.preventDefault(); 
            e.stopPropagation();
            triggerHelp(target as HTMLElement);
        }
    };

    // 2. Long Press Logic
    const startPress = (e: Event) => {
        const target = (e.target as HTMLElement).closest('[data-toga-help]');
        if (!target) return;
        pressTimer.current = setTimeout(() => {
            triggerHelp(target as HTMLElement);
        }, 600); 
    };

    const cancelPress = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    window.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('mousedown', startPress as any);
    window.addEventListener('mouseup', cancelPress);
    window.addEventListener('mouseleave', cancelPress);
    window.addEventListener('touchstart', startPress as any, { passive: true });
    window.addEventListener('touchend', cancelPress);
    window.addEventListener('touchmove', cancelPress);

    return () => {
      window.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('mousedown', startPress as any);
      window.removeEventListener('mouseup', cancelPress);
      window.removeEventListener('mouseleave', cancelPress);
      window.removeEventListener('touchstart', startPress as any);
      window.removeEventListener('touchend', cancelPress);
      window.removeEventListener('touchmove', cancelPress);
    };
  }, [knowledgeBase]);

  return (
    <>
        {/* Floating Bubble UI */}
        <div id="togado-companion-ui" className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
            
            {/* The Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl w-[360px] h-[500px] flex flex-col border border-slate-200 pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    
                    {/* Header */}
                    <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-indigo-800 rounded-full p-1 border border-indigo-400">
                                 <TogadoAvatar className="w-full h-full" />
                             </div>
                             <div>
                                 <h4 className="font-bold text-sm">Togado IA</h4>
                                 <span className="text-xs text-indigo-200 flex items-center gap-1">
                                     <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                     En línea
                                 </span>
                             </div>
                         </div>
                         <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                             <Minimize2 className="w-5 h-5" />
                         </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'user' ? (
                                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-sm shadow-sm">
                                        {msg.text}
                                    </div>
                                ) : (
                                    <div className="flex gap-2 max-w-[90%]">
                                        <div className="w-8 h-8 shrink-0 mt-1">
                                            <TogadoAvatar className="w-full h-full" />
                                        </div>
                                        <div className="space-y-2">
                                            {/* Standard Text Message */}
                                            {msg.text && (
                                                <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm leading-relaxed">
                                                    <MarkdownRenderer content={msg.text} />
                                                </div>
                                            )}

                                            {/* Special Help Card */}
                                            {msg.helpContext && (
                                                <div className="bg-white border border-indigo-100 rounded-xl shadow-md overflow-hidden animate-in zoom-in-95 duration-300">
                                                     <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center gap-2">
                                                         <Sparkles className="w-4 h-4 text-indigo-600" />
                                                         <span className="font-bold text-xs text-indigo-800 uppercase tracking-wide">Contexto: {msg.helpContext.title}</span>
                                                     </div>
                                                     <div className="p-4">
                                                         <p className="text-sm text-slate-700 mb-3">{msg.helpContext.description}</p>
                                                         {msg.helpContext.tip && (
                                                             <div className="flex gap-2 items-start bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                                 <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                                 <p className="text-xs text-amber-800 font-medium">{msg.helpContext.tip}</p>
                                                             </div>
                                                         )}
                                                     </div>
                                                </div>
                                            )}
                                            <span className="text-[10px] text-slate-400 ml-1">{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                             <div className="flex gap-2 items-center text-xs text-slate-400 ml-10">
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                             </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                        <div className="relative flex items-center gap-2">
                            <input 
                                type="text" 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe tu duda jurídica..." 
                                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                            />
                             <div className="absolute right-14">
                                <VoiceRecorder onResult={(text) => setInputValue(prev => prev + ' ' + text)} />
                             </div>
                            <button 
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isTyping}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-[10px] text-center text-slate-400 mt-2">
                            Togado puede cometer errores. Verifica la info legal.
                        </div>
                    </div>
                </div>
            )}

            {/* Minimized Trigger */}
            {!isOpen && (
                 <button 
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform border-2 border-indigo-100 relative group pointer-events-auto"
                 >
                     <TogadoAvatar className="w-10 h-10" />
                     {/* Notification Badge if unread messages existed? For now just visual */}
                     <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                    </span>
                 </button>
            )}
        </div>

        {/* Highlighter Box (Visible when active) */}
        {highlightRect && (
            <div 
                className="fixed z-[90] pointer-events-none transition-all duration-300 ease-out border-2 border-amber-400 bg-amber-400/10 rounded-lg shadow-[0_0_20px_rgba(251,191,36,0.4)] backdrop-brightness-110 animate-pulse"
                style={{
                    top: highlightRect.top - 4,
                    left: highlightRect.left - 4,
                    width: highlightRect.width + 8,
                    height: highlightRect.height + 8,
                }}
            />
        )}
    </>
  );
};
