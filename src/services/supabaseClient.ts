/**
 * PHOTO FINISH PRO AI — Supabase Client & Connection Engine (Stage 1)
 * Handles Cloud Database, Authentication, Realtime Channels, and Offline Fallbacks.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-ref')
  );
};

// Singleton Client
let clientInstance: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!clientInstance) {
    if (isSupabaseConfigured()) {
      clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined
        },
        realtime: {
          params: {
            eventsPerSecond: 20
          }
        }
      });
    } else {
      // Fallback dummy client for pure offline mode / test environments
      clientInstance = createClient<Database>(
        'https://mock-photo-finish-pro.supabase.co',
        'mock-anon-key-offline-mode',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            storageKey: 'pfp_offline_dummy_auth'
          }
        }
      );
    }
  }

  return clientInstance;
}

export const supabase = getSupabase();

/**
 * Health check to verify connectivity to Supabase
 */
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      latencyMs: 0,
      error: 'Supabase credentials are not configured (Offline Field Mode active).'
    };
  }

  const start = performance.now();
  try {
    const { error } = await supabase.from('leagues').select('id').limit(1);
    const latency = Math.round(performance.now() - start);

    if (error && error.code !== 'PGRST116') {
      return { connected: false, latencyMs: latency, error: error.message };
    }

    return { connected: true, latencyMs: latency };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Math.round(performance.now() - start),
      error: err?.message || 'Network error reaching Supabase'
    };
  }
}
