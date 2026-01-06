
import { supabase, isBackendConnected } from './supabaseClient';
import { User, SavedDocument, CalendarEvent, Post, Case, Quest } from '../types';
import { MOCK_EVENTS, MOCK_POSTS, MOCK_CASES } from '../constants';

const MOCK_QUESTS: Quest[] = [
  { id: 'q1', title: 'Primeros Pasos', description: 'Crea tu primer caso en el tablero.', xpReward: 100, completed: false, actionId: 'create_case' },
  { id: 'q2', title: 'Investigador', description: 'Sube un documento a la biblioteca.', xpReward: 150, completed: false, actionId: 'upload_doc' },
  { id: 'q3', title: 'Curioso', description: 'Hazle una pregunta a Togado (Chat).', xpReward: 50, completed: false, actionId: 'chat_ai' },
];

// LocalStorage Keys
const KEYS = {
  USER: 'toga_user',
  DOCS: 'toga_docs',
  EVENTS: 'toga_events',
  POSTS: 'toga_posts',
  CASES: 'toga_cases',
  QUESTS: 'toga_quests'
};

export const DataService = {
  // --- QUESTS (Gamification) ---
  async getQuests(): Promise<Quest[]> {
    const saved = localStorage.getItem(KEYS.QUESTS);
    return saved ? JSON.parse(saved) : MOCK_QUESTS;
  },

  async completeQuest(actionId: string, user: User): Promise<{ updatedUser: User, questCompleted: Quest | null }> {
    const quests = await this.getQuests();
    const questIndex = quests.findIndex(q => q.actionId === actionId && !q.completed);

    if (questIndex === -1) return { updatedUser: user, questCompleted: null };

    // Mark completed
    quests[questIndex].completed = true;
    localStorage.setItem(KEYS.QUESTS, JSON.stringify(quests));

    // Award XP
    const xpGain = quests[questIndex].xpReward;
    const newXp = (user.xp || 0) + xpGain;

    // Level Logic (Simple: Level up every 500 XP)
    // Level 1: 0-499
    // Level 2: 500-999
    const newLevel = Math.floor(newXp / 500) + 1;

    const updatedUser = { ...user, xp: newXp, level: newLevel };
    await this.updateUser(updatedUser);

    return { updatedUser, questCompleted: quests[questIndex] };
  },

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
          avatarUrl: profile.avatar_url,
          onboardingCompleted: profile.onboarding_completed,
          interests: profile.interests || [],
          xp: profile.xp || 0,
          level: profile.level || 1,
          togaCoins: profile.toga_coins || 0,
          apiKeys: profile.api_keys || {}
        };
      }
    }

    const saved = localStorage.getItem(KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  },

  async updateUser(user: User): Promise<void> {
    if (isBackendConnected() && supabase) {
      const updates = {
        full_name: user.name,
        avatar_url: user.avatarUrl,
        onboarding_completed: user.onboardingCompleted,
        interests: user.interests,
        // For this hybrid MVP, we allow client updates to support the Wompi redirect flow.
        role: user.role,
        xp: user.xp,
        level: user.level,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('profiles').update(updates).eq('id', user.id);
    }
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  async loginStub(name: string, email: string): Promise<User> {
    // Demo Stub
    const user: User = {
      id: 'u-' + Date.now(),
      name,
      email,
      role: 'FREE',
      reputation: 100,
      togaCoins: 50, // Welcome Bonus
      apiKeys: {}
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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching docs:', error);

      return (data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        content: d.content,
        timestamp: d.created_at,
        tags: d.tags || [],
        sourceUrl: d.source_url, // Assuming mapped column
        analysis: d.analysis // Assuming JSONB column or similar
      }));
    }

    const saved = localStorage.getItem(KEYS.DOCS);
    return saved ? JSON.parse(saved) : [];
  },

  async saveDocument(userId: string, doc: SavedDocument): Promise<void> {
    if (isBackendConnected() && supabase) {
      const { error } = await supabase.from('documents').insert({
        user_id: userId,
        title: doc.title,
        type: doc.type,
        content: doc.content,
        tags: doc.tags,
        // Optional fields if your schema supports them:
        // source_url: doc.sourceUrl,
        // analysis: doc.analysis 
      });
      if (error) console.error('Error saving doc:', error);
    }

    // Always save local for redundancy/offline potential
    const saved = localStorage.getItem(KEYS.DOCS);
    const docs = saved ? JSON.parse(saved) : [];
    localStorage.setItem(KEYS.DOCS, JSON.stringify([doc, ...docs]));
  },

  // --- EVENTS ---
  async getEvents(userId: string): Promise<CalendarEvent[]> {
    if (isBackendConnected() && supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        // If table doesn't exist yet, silence error and return empty/mock
        console.warn('Events table check failed:', error.message);
      }

      if (data) {
        return data.map((e: any) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          date: e.date
        }));
      }
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
    if (isBackendConnected() && supabase) {
      await supabase.from('events').update({
        title: event.title,
        type: event.type,
        date: event.date
      }).eq('id', event.id);
    }

    const saved = localStorage.getItem(KEYS.EVENTS);
    let events: CalendarEvent[] = saved ? JSON.parse(saved) : MOCK_EVENTS;
    events = events.map(e => e.id === event.id ? event : e);
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  },

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    if (isBackendConnected() && supabase) {
      await supabase.from('events').delete().eq('id', eventId);
    }

    const saved = localStorage.getItem(KEYS.EVENTS);
    let events: CalendarEvent[] = saved ? JSON.parse(saved) : MOCK_EVENTS;
    events = events.filter(e => e.id !== eventId);
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  },

  // --- CASES (Kanban) ---
  async getCases(userId: string): Promise<Case[]> {
    if (isBackendConnected() && supabase) {
      const { data } = await supabase.from('cases').select('*').eq('user_id', userId);
      if (data) {
        return data.map((c: any) => ({
          id: c.id,
          title: c.title,
          client: c.client,
          stage: c.stage,
          priority: c.priority,
          type: c.type,
          status: 'Activo', // Default for now
          lastUpdate: new Date().toISOString() // Default for now
        }));
      }
    }
    const saved = localStorage.getItem(KEYS.CASES);
    return saved ? JSON.parse(saved) : MOCK_CASES;
  },

  async addCase(userId: string, newCase: Case): Promise<void> {
    if (isBackendConnected() && supabase) {
      await supabase.from('cases').insert({
        user_id: userId,
        title: newCase.title,
        client: newCase.client,
        stage: newCase.stage,
        priority: newCase.priority,
        type: newCase.type
      });
    }
    const saved = localStorage.getItem(KEYS.CASES);
    const cases = saved ? JSON.parse(saved) : MOCK_CASES;
    localStorage.setItem(KEYS.CASES, JSON.stringify([...cases, newCase]));
  },

  async updateCase(userId: string, updatedCase: Case): Promise<void> {
    if (isBackendConnected() && supabase) {
      await supabase.from('cases').update({
        stage: updatedCase.stage,
        priority: updatedCase.priority
      }).eq('id', updatedCase.id);
    }
    // Local
    const saved = localStorage.getItem(KEYS.CASES);
    let cases = saved ? JSON.parse(saved) : MOCK_CASES;
    cases = cases.map((c: Case) => c.id === updatedCase.id ? updatedCase : c);
    localStorage.setItem(KEYS.CASES, JSON.stringify(cases));
  },

  // --- POSTS (Community) ---
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
