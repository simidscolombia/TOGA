
import { createClient } from '@supabase/supabase-js';

// Access environment variables using Vite's import.meta.env for better compatibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Export the client. If keys are missing (during dev), it will be null.
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Helper to check if backend is connected
 */
export const isBackendConnected = (): boolean => {
  return !!supabase;
};