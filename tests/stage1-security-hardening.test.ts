/**
 * PHOTO FINISH PRO — Stage 1 Security Hardening Tests
 * =====================================================
 * يثبت إغلاق الثغرات الحرجة المكتشفة في تدقيق المرحلة 0:
 * 1. لا يوجد أي تجاوز admin (الرمز السحري أو NODE_ENV) على واجهات التراخيص والتوليد.
 * 2. صفر كلمات مرور افتراضية: الإنتاج بلا ADMIN_PORTAL_PASSWORD يرفض الدخول بـ503.
 * 3. رمز جلسة المزامنة إلزامي ومطابقة الغرفة إلزامية.
 * 4. تحديد معدل التفعيل يمنع تخمين الأكواد.
 * 5. CORS يُحكم بـ ALLOWED_ORIGIN حصراً.
 * 6. مخزن المزامنة ينتقل إلى Supabase عند توفر مفاتيح الخادم حصراً.
 * 7. سلامة المصدر: لا أنماط التجاوز/الأسرار القديمة في ملفات الخادم.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { handleLicensingRequest } from '../server/licensingApi.js';
import { createSyncStore } from '../server/syncStore.js';
import { SupabaseSyncStore } from '../server/syncStoreSupabase.js';
import { handleSyncRequest } from '../server/syncApi.js';
import * as security from '../server/security.js';
import fs from 'node:fs';
import path from 'node:path';

const MAGIC_TOKEN = 'offline-standalone-admin-session';

function makeMsg(i: number): any {
  return {
    _msgId: `sec-msg-${i}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'LANE_FINISH',
    _senderRole: 'finish',
    _room: 'R-SEC',
    timestamp: Date.now() + i,
    payload: { lane: (i % 8) + 1, ms: 10000 + i }
  };
}

describe('Stage 1: no admin bypass anywhere', () => {
  it('rejects the old magic token on licensing plan creation (401)', async () => {
    const res = await handleLicensingRequest({
      pathname: '/api/licensing/plans',
      searchParams: new URLSearchParams(),
      method: 'POST',
      body: { name: 'x' },
      authHeader: `Bearer ${MAGIC_TOKEN}`
    });
    expect(res.status).toBe(401);
  });

  it('rejects the old magic token on bulk license generation (401)', async () => {
    const res = await handleLicensingRequest({
      pathname: '/api/licensing/generate',
      searchParams: new URLSearchParams(),
      method: 'POST',
      body: { tier: 'CLB8', expCode: '2712' },
      authHeader: MAGIC_TOKEN
    });
    expect(res.status).toBe(401);
  });

  it('rejects empty/garbage tokens regardless of NODE_ENV value', async () => {
    for (const authHeader of ['', 'Bearer ', 'Bearer garbage-token', MAGIC_TOKEN]) {
      const res = await handleLicensingRequest({
        pathname: '/api/licensing/generate',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: { tier: 'CLB8', expCode: '2712' },
        authHeader
      });
      expect(res.status).toBe(401);
    }
  });

  it('server sources no longer contain the bypass patterns', () => {
    const roots = ['server', 'api', 'relay-server'];
    const forbidden = [
      /offline-standalone-admin-session/,
      /NODE_ENV\s*!==\s*'production'[^;]*\?\?|isOfflineDevToken/
    ];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!/\.(js|ts|mjs|cjs)$/.test(entry.name)) continue;
        const content = fs.readFileSync(full, 'utf8');
        for (const rx of forbidden) {
          if (rx.test(content)) offenders.push(`${full} :: ${rx}`);
        }
      }
    };
    roots.forEach(walk);
    expect(offenders).toEqual([]);
  });

  it('vite dev middleware no longer bypasses admin token for generate-license', () => {
    const content = fs.readFileSync('vite.config.ts', 'utf8');
    expect(content).not.toContain('offline-standalone-admin-session');
    expect(content).not.toContain("Admin@PhotoFinish2026!");
    expect(content).toContain('if (!security.verifyAdminToken(token))');
  });
});

describe('Stage 1: zero default admin passwords', () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedPass = process.env.ADMIN_PORTAL_PASSWORD;

  afterEach(() => {
    process.env.NODE_ENV = savedNodeEnv;
    if (savedPass === undefined) delete process.env.ADMIN_PORTAL_PASSWORD;
    else process.env.ADMIN_PORTAL_PASSWORD = savedPass;
  });

  it('production without ADMIN_PORTAL_PASSWORD resolves to null (no default)', () => {
    delete process.env.ADMIN_PORTAL_PASSWORD;
    process.env.NODE_ENV = 'production';
    expect(security.resolveAdminPassword()).toBeNull();
    expect(security.getValidPasswords()).toEqual([]);
  });

  it('admin login in production without configuration returns 503 (never a default password)', () => {
    delete process.env.ADMIN_PORTAL_PASSWORD;
    process.env.NODE_ENV = 'production';
    const res = security.verifyAdminLogin('Admin@PhotoFinish2026!', 'attacker-ip');
    expect(res.success).toBe(false);
    expect(res.status).toBe(503);
  });

  it('development without configuration generates a non-empty ephemeral password (not the old literal)', () => {
    delete process.env.ADMIN_PORTAL_PASSWORD;
    process.env.NODE_ENV = 'development';
    const pass = security.resolveAdminPassword();
    expect(pass).toBeTruthy();
    expect(pass).not.toBe('Admin@PhotoFinish2026!');
  });

  it('explicit env password always wins', () => {
    process.env.ADMIN_PORTAL_PASSWORD = 'EnvConfiguredPassword#2026!';
    expect(security.resolveAdminPassword()).toBe('EnvConfiguredPassword#2026!');
  });
});

describe('Stage 1: mandatory sync room session token', () => {
  const sessions = new Map<string, string>([['R-SEC', 'tok-secure-1']]);

  function handler(body: any) {
    return handleSyncRequest({
      pathname: '/api/sync/ingest',
      searchParams: new URLSearchParams(),
      method: 'POST',
      body,
      getOrCreateSession: (room: string) => sessions.get(room) || 'tok-new-room',
      verifyAdminToken: () => false
    });
  }

  it('ingest without session token is rejected with 401', async () => {
    const res = await handler({ room: 'R-SEC', messages: [makeMsg(1)] });
    expect(res?.status).toBe(401);
    expect(res?.json.error).toContain('Session token required');
  });

  it('ingest with a wrong token is rejected with 403', async () => {
    const res = await handler({ room: 'R-SEC', sessionToken: 'spoofed-token', messages: [makeMsg(2)] });
    expect(res?.status).toBe(403);
  });

  it('ingest with the correct room token succeeds', async () => {
    const res = await handler({ room: 'R-SEC', sessionToken: 'tok-secure-1', messages: [makeMsg(3)] });
    expect(res?.status).toBe(200);
    expect(res?.json.ok).toBe(true);
    expect(res?.json.acceptedCount).toBe(1);
  });

  it('replay without token is rejected with 401', async () => {
    const res = await handleSyncRequest({
      pathname: '/api/sync/replay',
      searchParams: new URLSearchParams('room=R-SEC&since=0'),
      method: 'GET',
      body: null,
      getOrCreateSession: (room: string) => sessions.get(room) || 'tok',
      verifyAdminToken: () => false
    });
    expect(res?.status).toBe(401);
  });
});

describe('Stage 1: activation rate limiting (anti license-code guessing)', () => {
  it('429 after the allowed attempts window for the same IP', async () => {
    let blocked = 0;
    for (let i = 0; i < 40; i++) {
      const res = await handleLicensingRequest({
        pathname: '/api/licensing/activate',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: { code: `PFP2-CLB8-2712-POOL-FAKE${i}GUESSNOTSTORED`, deviceId: 'PF-RATE-TEST-01' },
        authHeader: '',
        clientIp: `rate-ip-${Math.random() > 0.999 ? 'x' : 'fixed'}`
      });
      if (res.status === 429) blocked++;
      if (blocked > 0) break;
    }
    expect(blocked).toBe(1);
  });
});

describe('Stage 1: CORS governed strictly by ALLOWED_ORIGIN', () => {
  const saved = process.env.ALLOWED_ORIGIN;
  const fakeReq = (origin?: string) => ({ headers: { origin: origin || '' } } as any);

  afterEach(() => {
    if (saved === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = saved;
  });

  it('no configuration = no cross-origin CORS at all', async () => {
    delete process.env.ALLOWED_ORIGIN;
    const { resolveCorsOrigin } = await import('../api/index.js');
    expect(resolveCorsOrigin(fakeReq('https://photo-finish-beta.vercel.app'))).toBeNull();
  });

  it('explicit star allows everything', async () => {
    process.env.ALLOWED_ORIGIN = '*';
    const { resolveCorsOrigin } = await import('../api/index.js');
    expect(resolveCorsOrigin(fakeReq('https://anything.example'))).toBe('*');
  });

  it('list of origins: match passes, mismatch blocked', async () => {
    process.env.ALLOWED_ORIGIN = 'https://photo-finish-beta.vercel.app, https://photo-finish-bouanani20-dz.vercel.app';
    const { resolveCorsOrigin } = await import('../api/index.js');
    expect(resolveCorsOrigin(fakeReq('https://photo-finish-beta.vercel.app'))).toBe('https://photo-finish-beta.vercel.app');
    expect(resolveCorsOrigin(fakeReq('https://evil.example'))).toBeNull();
    expect(resolveCorsOrigin(fakeReq())).toBeNull();
  });
});

describe('Stage 1: sync store backend selection', () => {
  const savedUrl = process.env.SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
    process.env.PFP_SYNC_MEMORY = '1';
  });

  it('without server keys falls back to SQLite/memory (never Supabase)', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const store: any = createSyncStore({ dbPath: ':memory:' });
    expect(store).not.toBeInstanceOf(SupabaseSyncStore);
    expect(typeof store.ingest).toBe('function');
  });

  it('with server keys selects the durable Supabase/Postgres store', () => {
    process.env.SUPABASE_URL = 'https://pfp-test-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    const store = createSyncStore();
    expect(store).toBeInstanceOf(SupabaseSyncStore);
    expect((store as any).engineName).toBe('supabase-postgres');
  });
});
