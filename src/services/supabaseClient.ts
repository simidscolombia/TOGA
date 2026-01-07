
import { createClient } from '@supabase/supabase-js';

// Access environment variables using Vite's import.meta.env OR process.env (fallback)
const getEnv = (key: string): string => {
  if (import.meta.env[key] !== undefined) {
    return String(import.meta.env[key]);
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return String(process.env[key]);
    }
  } catch (e) {
    // Ignore
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

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