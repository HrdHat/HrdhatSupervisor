import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/config/supabaseClient';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  lastActiveProjectId: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setLastActiveProject: (projectId: string) => void;
}

// LocalStorage key for persisting last active project
const LAST_PROJECT_KEY = 'hrdhat_supervisor_last_project';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,
  lastActiveProjectId: localStorage.getItem(LAST_PROJECT_KEY),

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        user: session?.user ?? null,
        initialized: true,
        loading: false,
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ initialized: true, loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({ user: data.user, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, loading: false });
    }
  },

  logout: async () => {
    set({ loading: true });

    try {
      await supabase.auth.signOut();
      set({ user: null, loading: false, error: null });
    } catch (error) {
      console.error('Logout error:', error);
      set({ user: null, loading: false });
    }
  },

  clearError: () => set({ error: null }),

  setLastActiveProject: (projectId: string) => {
    localStorage.setItem(LAST_PROJECT_KEY, projectId);
    set({ lastActiveProjectId: projectId });
  },
}));
