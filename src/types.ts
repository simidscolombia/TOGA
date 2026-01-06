

export type UserRole = 'FREE' | 'PREMIUM' | 'ADMIN';


export type Permission =
  | 'ADMIN_ACCESS'
  | 'MANAGE_STAFF'
  | 'MANAGE_USERS'
  | 'MANAGE_BALANCE'
  | 'VIEW_FINANCIALS'
  | 'MANAGE_KNOWLEDGE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: Permission[]; // New RBAC field
  reputation: number;
  avatarUrl?: string;
  interests?: string[];
  onboardingCompleted?: boolean;
  xp?: number;
  level?: number;
  // [NEW] Economy & AI
  togaCoins: number;
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    gemini?: string;
  };
}

export const hasPermission = (user: User | null, permission: Permission): boolean => {
  if (!user) return false;
  // Super User Override
  if (user.email === 'simidscolombia@gmail.com') return true;
  // Role Override
  if (user.role === 'ADMIN' && permission === 'ADMIN_ACCESS') return true;

  return user.permissions?.includes(permission) || false;
};

export interface Transaction {
  id: string;
  userId: string;
  action: string; // e.g., 'Draft Document', 'Legal Search'
  modelUsed: string; // e.g., 'GPT-4', 'Gemini Flash'
  cost: number;
  timestamp: string;
}

export const AI_MODELS = {
  GEMINI_FLASH: { id: 'gemini-flash', name: 'Togado Básico (Gemini Flash)', cost: 0, provider: 'google' },
  GEMINI_PRO: { id: 'gemini-pro', name: 'Gemini 1.5 Pro', cost: 5, provider: 'google' },
  GPT_4: { id: 'gpt-4', name: 'GPT-4o (OpenAI)', cost: 10, provider: 'openai' },
  CLAUDE_3: { id: 'claude-3', name: 'Claude 3.5 Sonnet', cost: 15, provider: 'anthropic' }
} as const;

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  actionId: string; // 'create_case', 'upload_doc', 'chat_ai'
}

export type CaseStage = 'Pre-Jurídico' | 'Admisión' | 'Probatoria' | 'Alegatos' | 'Fallo';
export type CasePriority = 'Alta' | 'Media' | 'Baja';

export interface Case {
  id: string;
  title: string;
  client: string;
  status: 'Activo' | 'Archivado' | 'En Espera';
  lastUpdate: string;
  type: string;
  stage?: CaseStage;
  priority?: CasePriority; // New field
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO String
  type: 'Audiencia' | 'Vencimiento' | 'Reunión';
}

export interface PostComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface Post {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  likes: number;
  comments: number;
  replies?: PostComment[]; // New field for actual comments
  isAnonymous: boolean;
  tags: string[];
  timestamp: string;
}

export interface SavedDocument {
  id: string;
  title: string;
  type: string;
  content: string;
  timestamp: string;
  tags?: string[];
  sourceUrl?: string;
  analysis?: AnalyzedDecision;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  source?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  snippet: string;
  source: string;
  url: string;
  date: string;
  category: 'Constitucional' | 'Penal' | 'Laboral' | 'General';
}

export interface AnalyzedDecision {
  summary: string;
  facts: string[];
  arguments: string[];
  decision: string;
  tags: string[];
}

export enum DocType {
  TUTELA = 'Acción de Tutela',
  PETICION = 'Derecho de Petición',
  CONTRATO = 'Contrato de Prestación de Servicios',
  PODER = 'Poder General',
  DEMANDA = 'Demanda Civil',
  JURISPRUDENCIA = 'Jurisprudencia Guardada',
  LIQUIDACION = 'Liquidación Laboral'
}

// --- Web Speech API Types ---
export interface SpeechRecognition extends EventTarget {
  grammarList: any;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}