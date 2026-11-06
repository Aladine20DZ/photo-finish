import { describe, it, expect, beforeEach } from 'vitest';
import { crdtSyncEngine, SyncMutation } from '../src/services/crdtSyncEngine';

describe('Stage 6: Competition Mode & Offline CRDT Synchronization', () => {
  beforeEach(() => {
    crdtSyncEngine.clearQueue();
  });

  it('advances Lamport logical clock monotonically', () => {
    const clock1 = crdtSyncEngine.tick();
    const clock2 = crdtSyncEngine.tick();
    expect(clock2).toBeGreaterThan(clock1);

    // Syncing with a higher incoming peer clock
    const clock3 = crdtSyncEngine.tick(50);
    expect(clock3).toBe(51);
  });

  it('enqueues mutations offline without network dependencies', () => {
    expect(crdtSyncEngine.getPendingCount()).toBe(0);

    const mut1 = crdtSyncEngine.enqueueMutation({
      table: 'results',
      operation: 'UPSERT',
      recordId: 'res_ath_101',
      payload: { rank: 1, time_millis: 10120 },
      priority: 50
    });

    expect(mut1.id).toBeDefined();
    expect(mut1.lamportClock).toBeGreaterThan(0);
    expect(crdtSyncEngine.getPendingCount()).toBe(1);
  });

  it('resolves conflicts with Chief Judge priority overriding Field Judge', () => {
    const fieldJudgeMutation: SyncMutation = {
      id: 'mut_fj',
      table: 'results',
      operation: 'UPSERT',
      recordId: 'res_ath_101',
      payload: { rank: 2, time_millis: 10180 },
      lamportClock: 10,
      timestamp: 1000,
      deviceId: 'dev_phone_judge_01',
      priority: 50, // Field judge
      synced: false
    };

    const chiefJudgeMutation: SyncMutation = {
      id: 'mut_cj',
      table: 'results',
      operation: 'UPSERT',
      recordId: 'res_ath_101',
      payload: { rank: 1, time_millis: 10120 }, // Chief judge certified correction
      lamportClock: 9, // Even with slightly earlier logical clock
      timestamp: 990,
      deviceId: 'dev_chief_laptop',
      priority: 100, // Chief judge priority
      synced: false
    };

    const winner = crdtSyncEngine.resolveConflict(fieldJudgeMutation, chiefJudgeMutation);
    expect(winner.id).toBe('mut_cj');
    expect(winner.payload.rank).toBe(1);
  });

  it('resolves same-priority conflicts via Lamport LWW logical timestamp', () => {
    const mutA: SyncMutation = {
      id: 'mut_a',
      table: 'race_passages',
      operation: 'INSERT',
      recordId: 'pass_1',
      payload: { bib: '101', timestamp: 5000 },
      lamportClock: 12,
      timestamp: 1000,
      deviceId: 'dev_a',
      priority: 50,
      synced: false
    };

    const mutB: SyncMutation = {
      id: 'mut_b',
      table: 'race_passages',
      operation: 'INSERT',
      recordId: 'pass_1',
      payload: { bib: '101', timestamp: 5005 },
      lamportClock: 15, // Higher Lamport clock wins
      timestamp: 1001,
      deviceId: 'dev_b',
      priority: 50,
      synced: false
    };

    const winner = crdtSyncEngine.resolveConflict(mutA, mutB);
    expect(winner.id).toBe('mut_b');
    expect(winner.payload.timestamp).toBe(5005);
  });
});
