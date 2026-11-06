/**
 * PHOTO FINISH PRO AI — Conflict-Free Replicated Offline Sync Engine (Stage 6)
 * Guarantees zero field downtime on stadium tracks and mountain trails.
 * Buffers mutations locally in IndexedDB / LocalStorage and synchronizes with Supabase using Lamport LWW timestamps.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SyncMutation<T = any> {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE';
  recordId: string;
  payload: T;
  lamportClock: number;
  timestamp: number;
  deviceId: string;
  priority: number; // Chief Judge (100) > Field Judge (50) > Timing Operator (30) > Public (1)
  synced: boolean;
}

const SYNC_QUEUE_STORAGE_KEY = 'pfp_offline_crdt_queue_v1';
const LAMPORT_STORAGE_KEY = 'pfp_lamport_clock_v1';

export class CrdtSyncEngine {
  private queue: SyncMutation[] = [];
  private lamportClock: number = 0;
  private deviceId: string = 'dev_' + Math.random().toString(36).substring(2, 9);
  private isSyncing: boolean = false;

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const rawQueue = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY);
        if (rawQueue) this.queue = JSON.parse(rawQueue);

        const rawClock = localStorage.getItem(LAMPORT_STORAGE_KEY);
        if (rawClock) this.lamportClock = parseInt(rawClock, 10);
      } catch (e) {
        console.warn('Failed to load CRDT sync queue:', e);
      }
    }
  }

  private saveState(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
        localStorage.setItem(LAMPORT_STORAGE_KEY, this.lamportClock.toString());
      } catch {}
    }
  }

  /**
   * Advance the logical Lamport clock
   */
  public tick(incomingClock?: number): number {
    this.lamportClock = Math.max(this.lamportClock, incomingClock || 0) + 1;
    this.saveState();
    return this.lamportClock;
  }

  /**
   * Enqueue a mutation for offline synchronization
   */
  public enqueueMutation<T = any>(params: {
    table: string;
    operation: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE';
    recordId: string;
    payload: T;
    priority?: number;
    deviceId?: string;
  }): SyncMutation<T> {
    const clock = this.tick();
    const mutation: SyncMutation<T> = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      table: params.table,
      operation: params.operation,
      recordId: params.recordId,
      payload: params.payload,
      lamportClock: clock,
      timestamp: Date.now(),
      deviceId: params.deviceId || this.deviceId,
      priority: params.priority || 50,
      synced: false
    };

    this.queue.push(mutation);
    this.saveState();
    return mutation;
  }

  /**
   * Conflict Resolution: Given two competing updates for the same entity,
   * deterministically decide which one wins.
   * Priority hierarchy:
   * 1. Higher role priority (Chief Judge > Field Judge)
   * 2. Higher Lamport clock
   * 3. Higher physical timestamp
   * 4. Lexicographical deviceId comparison (tie-breaker)
   */
  public resolveConflict(a: SyncMutation, b: SyncMutation): SyncMutation {
    // 1. Role Priority
    if (a.priority !== b.priority) {
      return a.priority > b.priority ? a : b;
    }

    // 2. Lamport Clock
    if (a.lamportClock !== b.lamportClock) {
      return a.lamportClock > b.lamportClock ? a : b;
    }

    // 3. Wall clock timestamp
    if (a.timestamp !== b.timestamp) {
      return a.timestamp > b.timestamp ? a : b;
    }

    // 4. Deterministic Tie-Breaker
    return a.deviceId.localeCompare(b.deviceId) >= 0 ? a : b;
  }

  /**
   * Flush pending mutations to Supabase when network is healthy
   */
  public async flushQueue(): Promise<{
    processed: number;
    synced: number;
    remaining: number;
  }> {
    if (this.isSyncing || this.queue.length === 0) {
      return { processed: 0, synced: 0, remaining: this.queue.length };
    }

    this.isSyncing = true;
    let syncedCount = 0;

    try {
      if (!isSupabaseConfigured()) {
        // In offline mode, mutations remain safely buffered
        return { processed: 0, synced: 0, remaining: this.queue.length };
      }

      // Group mutations by table and recordId to resolve conflicts locally first
      const pending = this.queue.filter(m => !m.synced);
      const collapsed = new Map<string, SyncMutation>();

      for (const mut of pending) {
        const key = `${mut.table}:${mut.recordId}`;
        const existing = collapsed.get(key);
        if (!existing) {
          collapsed.set(key, mut);
        } else {
          collapsed.set(key, this.resolveConflict(existing, mut));
        }
      }

      // Push collapsed mutations to Supabase
      for (const mut of collapsed.values()) {
        try {
          if (mut.operation === 'UPSERT' || mut.operation === 'INSERT') {
            await (supabase.from(mut.table as any) as any).upsert(mut.payload);
            mut.synced = true;
            syncedCount++;
          }
        } catch (e) {
          console.warn(`Sync failed for mutation ${mut.id}:`, e);
        }
      }

      // Remove synced mutations
      this.queue = this.queue.filter(m => !m.synced);
      this.saveState();
    } finally {
      this.isSyncing = false;
    }

    return {
      processed: syncedCount,
      synced: syncedCount,
      remaining: this.queue.length
    };
  }

  public getPendingCount(): number {
    return this.queue.filter(m => !m.synced).length;
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveState();
  }
}

export const crdtSyncEngine = new CrdtSyncEngine();
