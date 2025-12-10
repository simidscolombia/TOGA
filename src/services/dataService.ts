
import { supabase, isBackendConnected } from './supabaseClient';
import { User, SavedDocument, CalendarEvent, Post } from '../types';
import { MOCK_EVENTS, MOCK_POSTS } from '../constants';

// LocalStorage Keys
const KEYS = {
  USER: 'toga_user',
  DOCS: 'toga_docs',
  EVENTS: 'toga_events',
  POSTS: 'toga_posts'
};

export const DataService = {
  // --- USER ---
  async getUser(): Promise<User | null> {
    if (isBackendConnected() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        return {
          id: profile.id,
          name: profile.full_name || 'Abogado',
          email: user.email || '',
          role: profile.role || 'FREE',
          reputation: profile.reputation || 100,
          avatarUrl: profile.avatar_url
        };
      }
    }

    // Fallback LocalStorage
    // CAMBIO: Si no hay usuario guardado, devolvemos null, NO el Mock User.
    const saved = localStorage.getItem(KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  },

  async updateUser(user: User): Promise<void> {
    if (isBackendConnected() && supabase) {
      await supabase.from('profiles').update({
        full_name: user.name,
        avatar_url: user.avatarUrl,
        // Role is usually handled via payment webhooks
      }).eq('id', user.id);
    }
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  async loginStub(name: string, email: string): Promise<User> {
    // NOTE: Real auth happens via supabase.auth.signInWith... 
    // This stub is for the "Demo Login" when no backend is connected.
    const user: User = {
      id: 'u-' + Date.now(),
      name,
      email,
      role: 'FREE',
      reputation: 100
    };
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return user;
  },

  async logout(): Promise<void> {
    if (isBackendConnected() && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(KEYS.USER);
  },

  // --- DOCUMENTS ---
  async getDocuments(userId: string): Promise<SavedDocument[]> {
    if (isBackendConnected() && supabase) {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return (data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        content: d.content,
        timestamp: d.created_at
      }));
    }

    // Fallback
    const saved = localStorage.getItem(KEYS.DOCS);
    return saved ? JSON.parse(saved) : [];
  },

  async saveDocument(userId: string, doc: SavedDocument): Promise<void> {
    if (isBackendConnected() && supabase) {
      // Remove ID to let DB generate it, or handle UUID
      await supabase.from('documents').insert({
        user_id: userId,
        title: doc.title,
        type: doc.type,
        content: doc.content,
        created_at: new Date().toISOString()
      });
      // In a real app we would refetch, but for hybrid sync we save locally too for speed
    }

    // Local
    const saved = localStorage.getItem(KEYS.DOCS);
    const docs = saved ? JSON.parse(saved) : [];
    localStorage.setItem(KEYS.DOCS, JSON.stringify([doc, ...docs]));
  },

  // --- EVENTS ---
  async getEvents(userId: string): Promise<CalendarEvent[]> {
    if (isBackendConnected() && supabase) {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId);

      return (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        date: e.date
      }));
    }

    const saved = localStorage.getItem(KEYS.EVENTS);
    return saved ? JSON.parse(saved) : MOCK_EVENTS;
  },

  async addEvent(userId: string, event: CalendarEvent): Promise<void> {
    if (isBackendConnected() && supabase) {
      await supabase.from('events').insert({
        user_id: userId,
        title: event.title,
        type: event.type,
        date: event.date
      });
    }

    const saved = localStorage.getItem(KEYS.EVENTS);
    const events = saved ? JSON.parse(saved) : MOCK_EVENTS;
    localStorage.setItem(KEYS.EVENTS, JSON.stringify([...events, event]));
  },

  async updateEvent(userId: string, event: CalendarEvent): Promise<void> {
    // Stub for LocalStorage
    const saved = localStorage.getItem(KEYS.EVENTS);
    let events: CalendarEvent[] = saved ? JSON.parse(saved) : MOCK_EVENTS;
    events = events.map(e => e.id === event.id ? event : e);
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  },

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    // Stub for LocalStorage
    const saved = localStorage.getItem(KEYS.EVENTS);
    let events: CalendarEvent[] = saved ? JSON.parse(saved) : MOCK_EVENTS;
    events = events.filter(e => e.id !== eventId);
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  },

  // --- POSTS (Community) ---
  // Posts usually are public, so table structure would be different. Keeping local for MVP.
  async getPosts(): Promise<Post[]> {
    const saved = localStorage.getItem(KEYS.POSTS);
    return saved ? JSON.parse(saved) : MOCK_POSTS;
  },

  async addPost(post: Post): Promise<void> {
    const saved = localStorage.getItem(KEYS.POSTS);
    const posts = saved ? JSON.parse(saved) : MOCK_POSTS;
    localStorage.setItem(KEYS.POSTS, JSON.stringify([post, ...posts]));
  }
};
