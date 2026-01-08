import { supabase, isBackendConnected } from './supabaseClient';
import { User, SavedDocument, CalendarEvent, Post, Case, Quest, Transaction } from '../types';
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
      // if (!user) return null; // [FIX] Don't return null early. Fallback to localStorage logic below.

      if (user) {
        // Only fetch profile if we have a real Supabase user
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
    }

    // [FALLBACK] LocalStorage Logic (Run if backend fails or no user in backend)
    const saved = localStorage.getItem(KEYS.USER);
    // Avoid redeclaring 'user' if it causes TS issues, use 'localUser'
    const localUser = saved ? JSON.parse(saved) : null;

    if (localUser && localUser.email === 'simidscolombia@gmail.com') {
      localUser.role = 'ADMIN';
      localUser.permissions = ['ADMIN_ACCESS', 'MANAGE_STAFF', 'MANAGE_USERS', 'MANAGE_BALANCE', 'VIEW_FINANCIALS', 'MANAGE_KNOWLEDGE'];
    }

    return localUser;
  },

  async updateUser(user: User): Promise<User> {
    if (isBackendConnected() && supabase) {
      const updates = {
        full_name: user.name,
        avatar_url: user.avatarUrl,
        onboarding_completed: user.onboardingCompleted,
        interests: user.interests,
        role: user.role,
        xp: user.xp,
        level: user.level,
        toga_coins: user.togaCoins,
        api_keys: user.apiKeys,
        updated_at: new Date().toISOString(),
      };
      // [NEW] Use RPC for Admin updates if available (safer bypass)
      // Check if we are updating another user (implies Admin context usually)
      const { data: { user: currentUserAuth } } = await supabase.auth.getUser();
      const isSelfUpdate = currentUserAuth?.id === user.id;

      if (!isSelfUpdate) {
        // It's an admin update on someone else
        console.log("Admin Update detected via RPC...");
        const { error: rpcError } = await supabase.rpc('admin_update_user', {
          target_user_id: user.id,
          new_toga_coins: user.togaCoins,
          new_role: user.role,
          new_permissions: user.permissions
        });

        if (rpcError) {
          // Fallback if RPC fails or doesn't exist yet
          console.warn("RPC admin_update_user failed, trying normal update:", rpcError);
          const { error } = await supabase.from('profiles').upsert({ id: user.id, ...updates });
          if (error) throw new Error(`Error Admin RPC y Fallback: ${error.message}`);
        }
      } else {
        // Self update (Standard RLS)
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          ...updates
        });
        if (error) {
          console.error("CRITICAL DB SAVE ERROR:", error.message, error.details);
          throw new Error(`Error guardando en nube: ${error.message}`);
        }
      }
    }
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    localStorage.setItem('toga_user_backup', JSON.stringify(user)); // [FIX] Create Backup
    return user;
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
    localStorage.setItem('toga_user_backup', JSON.stringify(user)); // [FIX] Create Backup
    return user;
  },

  async deductCoins(amount: number): Promise<boolean> {
    const userStr = localStorage.getItem(KEYS.USER);
    if (!userStr) return false;

    const user = JSON.parse(userStr) as User;
    if (user.togaCoins < amount) return false;

    user.togaCoins -= amount;
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    localStorage.setItem('toga_user_backup', JSON.stringify(user)); // [FIX] Create Backup

    if (isBackendConnected() && supabase) {
      // Atomic update via RPC
      const { error } = await supabase.rpc('decrement_coins', { x: amount, row_id: user.id });

      if (error) {
        console.warn('RPC failed, using update fallback:', error.message);
        const newBalance = (user.togaCoins || 0) - amount;
        const { error: updateError } = await supabase.from('profiles').update({ toga_coins: newBalance }).eq('id', user.id);
        if (updateError) return false;
      }

      user.togaCoins = (user.togaCoins || 0) - amount;
    } else {
      user.togaCoins -= amount;
    }

    // Update local storage as fallback/cache
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return true;
  },

  async recordTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): Promise<void> {
    const userStr = localStorage.getItem(KEYS.USER);
    if (!userStr) return;
    const user = JSON.parse(userStr);

    if (isBackendConnected() && supabase) {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        action: transaction.action,
        amount: -transaction.cost, // Negative for cost
        model_used: transaction.modelUsed
      });
      if (error) console.error('Error logging transaction:', error);
    }

    // Local Storage Fallback
    const newTx: Transaction = {
      ...transaction,
      id: 'tx-' + Date.now(),
      userId: user.id,
      timestamp: new Date().toISOString()
    };
    const txsStr = localStorage.getItem('toga_transactions') || '[]';
    const txs = JSON.parse(txsStr);
    txs.unshift(newTx);
    localStorage.setItem('toga_transactions', JSON.stringify(txs));
  },

  async getTransactions(userId: string): Promise<Transaction[]> {
    if (isBackendConnected() && supabase) {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        return data.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          action: t.action,
          modelUsed: t.model_used,
          cost: Math.abs(t.amount), // Convert back to positive cost for UI
          timestamp: t.created_at
        }));
      }
    }
    const txsStr = localStorage.getItem('toga_transactions') || '[]';
    const txs = JSON.parse(txsStr) as Transaction[];
    return txs.filter(t => t.userId === userId);
  },



  async logout(): Promise<void> {
    if (isBackendConnected() && supabase) {
      await supabase.auth.signOut();
    }
    // Clear ALL app state to avoid ghost users
    localStorage.clear(); // [FIX] Wipe everything to be safe

    // Force reload to login screen (Hard Reload)
    window.location.reload();
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
    if (isBackendConnected() && supabase) {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        return data.map((p: any) => ({
          id: p.id,
          author: p.author_name,
          authorRole: p.author_role || 'Abogado',
          content: p.content,
          likes: p.likes_count,
          comments: p.comments_count,
          isAnonymous: p.is_anonymous,
          tags: p.tags || [],
          timestamp: new Date(p.created_at).toLocaleDateString() + ' ' + new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
      }
    }
    const saved = localStorage.getItem(KEYS.POSTS);
    return saved ? JSON.parse(saved) : MOCK_POSTS;
  },

  async addPost(post: Post): Promise<void> {
    if (isBackendConnected() && supabase) {
      // Get current user ID to link relation if possible
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('posts').insert({
        user_id: user?.id,
        author_name: post.author,
        author_role: post.authorRole,
        content: post.content,
        is_anonymous: post.isAnonymous,
        tags: post.tags,
        likes_count: 0,
        comments_count: 0
      });
    }

    const saved = localStorage.getItem(KEYS.POSTS);
    const posts = saved ? JSON.parse(saved) : MOCK_POSTS;
    localStorage.setItem(KEYS.POSTS, JSON.stringify([post, ...posts]));
  }
};
// End of DataService - Forced Update
