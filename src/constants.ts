
import { Case, CalendarEvent, Post, User } from './types';

export const MOCK_USER: User = {
  id: 'u-123',
  name: 'Dr. Alejandro Martínez',
  email: 'alejandro@legal.co',
  role: 'FREE', // Default to free to demonstrate lock
  reputation: 850,
  avatarUrl: 'https://picsum.photos/200',
  interests: [],
  onboardingCompleted: true, // Mock user has already finished onboarding
  togaCoins: 50
};

export const MOCK_CASES: Case[] = [
  { id: 'c-1', title: 'Restitución Inmueble Torres', client: 'Constructora Torres SAS', status: 'Activo', lastUpdate: '2023-10-25', type: 'Civil', stage: 'Probatoria', priority: 'Alta' },
  { id: 'c-2', title: 'Divorcio Mutuo Acuerdo Perez', client: 'Juan Perez', status: 'En Espera', lastUpdate: '2023-10-22', type: 'Familia', stage: 'Admisión', priority: 'Media' },
  { id: 'c-3', title: 'Laboral vs TechSolutions', client: 'Maria Gonzalez', status: 'Activo', lastUpdate: '2023-10-20', type: 'Laboral', stage: 'Pre-Jurídico', priority: 'Alta' },
  { id: 'c-4', title: 'Sucesión Familia Ruiz', client: 'Familia Ruiz', status: 'Archivado', lastUpdate: '2023-09-15', type: 'Familia', stage: 'Fallo', priority: 'Baja' },
];

export const MOCK_EVENTS: CalendarEvent[] = [
  { id: 'e-1', title: 'Audiencia de Conciliación', date: new Date(Date.now() + 86400000).toISOString(), type: 'Audiencia' },
  { id: 'e-2', title: 'Vencimiento Términos Contestación', date: new Date(Date.now() + 172800000).toISOString(), type: 'Vencimiento' },
  { id: 'e-3', title: 'Reunión Cliente Nuevo', date: new Date(Date.now() + 259200000).toISOString(), type: 'Reunión' },
];

export const MOCK_POSTS: Post[] = [
  { id: 'p-1', author: 'Dra. Camila Osorio', authorRole: 'Penalista', content: '¿Alguien tiene experiencia reciente con los juzgados de Paloquemao en temas de libertad por vencimiento de términos?', likes: 12, comments: 4, isAnonymous: false, tags: ['Penal', 'Procesal'], timestamp: '2h' },
  { id: 'p-2', author: 'Anónimo', authorRole: 'Abogado', content: 'Colegas, ¿cómo están manejando la tarifa de honorarios para tutelas de salud este año?', likes: 35, comments: 18, isAnonymous: true, tags: ['Honorarios', 'Constitucional'], timestamp: '5h' },
];

export const JURISPRUDENCE_MOCK_DB = [
  { id: 'j-1', title: 'Sentencia T-025/04', snippet: 'Estado de Cosas Inconstitucional en materia de desplazamiento forzado.', court: 'Corte Constitucional' },
  { id: 'j-2', title: 'Sentencia C-355/06', snippet: 'Despenalización del aborto en tres causales específicas en Colombia.', court: 'Corte Constitucional' },
  { id: 'j-3', title: 'Sentencia SU-014/01', snippet: 'Unificación de jurisprudencia sobre el derecho a la salud y conexidad.', court: 'Corte Constitucional' },
  { id: 'j-4', title: 'Sentencia SL1234-2022', snippet: 'Estabilidad laboral reforzada en casos de debilidad manifiesta.', court: 'Corte Suprema' },
];