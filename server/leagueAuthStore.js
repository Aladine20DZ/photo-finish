/**
 * Photo Finish Pro — مخزن حسابات الرابطات الخادمي (Server-Side League Accounts)
 * ==============================================================================
 * كلمات مرور الرابطات تعيش هنا حصراً (scrypt + salt) — لا تُخزَّن ولا تُقارن
 * في الواجهة أبداً بعد المرحلة 1.
 *
 * التخزين: Supabase/Postgres عند توفر مفاتيح الخادم (دائم على Vercel)،
 * وإلا node:sqlite (دائم على relay/Node)، وإلا الذاكرة (اختبارات).
 */

import crypto from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

let DatabaseSync = null;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {
  DatabaseSync = null;
}

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS league_accounts (
  league_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  aliases TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), String(salt), 64).toString('hex');
}

function timingSafeEqualHex(a, b) {
  const ab = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function normalizeLogin(s) {
  return String(s || '').trim().toLowerCase();
}

// ════════════════ SQLite Backend ════════════════
class SqliteLeagueAuthStore {
  constructor(dbPath = ':memory:') {
    this.engineName = 'node:sqlite';
    this.db = new DatabaseSync(dbPath);
    this.db.exec(SQLITE_SCHEMA);
  }

  async createAccount({ leagueId, username, email, password, aliases = [] }) {
    const salt = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    try {
      this.db.prepare(
        `INSERT INTO league_accounts (league_id, username, email, aliases, password_hash, salt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        String(leagueId), normalizeLogin(username), normalizeLogin(email),
        aliases.map(normalizeLogin).filter(Boolean).join(','), hashPassword(password, salt), salt, now, now
      );
      return { ok: true };
    } catch (e) {
      if (/UNIQUE/i.test(String(e?.message))) {
        return { ok: false, error: 'اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً لرابطة أخرى.' };
      }
      return { ok: false, error: e?.message || 'فشل إنشاء الحساب' };
    }
  }

  async findAccountByLogin(login) {
    const l = normalizeLogin(login);
    const row = this.db.prepare(
      `SELECT * FROM league_accounts WHERE username = ? OR email = ? OR (',' || aliases || ',') LIKE ? LIMIT 1`
    ).get(l, l, `%${l}%`);
    return row || null;
  }

  async verifyPassword(login, password) {
    const account = await this.findAccountByLogin(login);
    if (!account) return { ok: false, error: 'حساب الرابطة غير موجود. سجّل رابطتك أولاً.' };
    const computed = hashPassword(password, account.salt);
    if (!timingSafeEqualHex(computed, account.password_hash)) {
      return { ok: false, error: 'كلمة المرور غير صحيحة.' };
    }
    return { ok: true, account };
  }

  async hasAccountForLeague(leagueId) {
    const row = this.db.prepare(`SELECT league_id FROM league_accounts WHERE league_id = ?`).get(String(leagueId));
    return Boolean(row);
  }

  async updatePassword(leagueId, passwordHash, salt) {
    try {
      this.db.prepare(
        `UPDATE league_accounts SET password_hash = ?, salt = ?, updated_at = ? WHERE league_id = ?`
      ).run(String(passwordHash), String(salt), Date.now(), String(leagueId));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || 'فشل تحديث كلمة المرور' };
    }
  }

  async close() {
    try { this.db?.close(); } catch { /* */ }
  }
}

// ════════════════ Supabase Backend ════════════════
class SupabaseLeagueAuthStore {
  constructor() {
    const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!url || !key) throw new Error('SupabaseLeagueAuthStore يتطلب SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    this.engineName = 'supabase-postgres';
    this.sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async createAccount({ leagueId, username, email, password, aliases = [] }) {
    const salt = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const { error } = await this.sb.from('pfp_league_accounts').insert({
      league_id: String(leagueId),
      username: normalizeLogin(username),
      email: normalizeLogin(email),
      aliases: aliases.map(normalizeLogin).filter(Boolean).join(','),
      password_hash: hashPassword(password, salt),
      salt,
      created_at: now,
      updated_at: now
    });
    if (error) {
      if (error.code === '23505' || /duplicate/i.test(String(error.message))) {
        return { ok: false, error: 'اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً لرابطة أخرى.' };
      }
      return { ok: false, error: error.message || 'فشل إنشاء الحساب' };
    }
    return { ok: true };
  }

  async findAccountByLogin(login) {
    const l = normalizeLogin(login);
    const { data, error } = await this.sb
      .from('pfp_league_accounts')
      .select('*')
      .or(`username.eq.${l},email.eq.${l},aliases.ilike.%${l}%`)
      .limit(1);
    if (error) {
      console.warn('[LeagueAuthStore] فشل البحث عن الحساب:', error.message);
      return null;
    }
    return data?.[0] || null;
  }

  async verifyPassword(login, password) {
    const account = await this.findAccountByLogin(login);
    if (!account) return { ok: false, error: 'حساب الرابطة غير موجود. سجّل رابطتك أولاً.' };
    const computed = hashPassword(password, account.salt);
    if (!timingSafeEqualHex(computed, account.password_hash)) {
      return { ok: false, error: 'كلمة المرور غير صحيحة.' };
    }
    return { ok: true, account };
  }

  async hasAccountForLeague(leagueId) {
    const { data, error } = await this.sb
      .from('pfp_league_accounts')
      .select('league_id')
      .eq('league_id', String(leagueId))
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  }

  async updatePassword(leagueId, passwordHash, salt) {
    const { error } = await this.sb.from('pfp_league_accounts').update({
      password_hash: String(passwordHash),
      salt: String(salt),
      updated_at: Date.now()
    }).eq('league_id', String(leagueId));
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async close() { /* مُدار تلقائياً */ }
}

// ════════════════ Memory Backend (اختبارات/طوارئ) ════════════════
class MemoryLeagueAuthStore {
  constructor() {
    this.engineName = 'memory-fallback';
    this.accounts = new Map(); // leagueId -> account
  }

  async createAccount({ leagueId, username, email, password, aliases = [] }) {
    const now = Date.now();
    for (const acc of this.accounts.values()) {
      if (normalizeLogin(acc.username) === normalizeLogin(username) || normalizeLogin(acc.email) === normalizeLogin(email)) {
        return { ok: false, error: 'اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً لرابطة أخرى.' };
      }
    }
    const salt = crypto.randomBytes(16).toString('hex');
    this.accounts.set(String(leagueId), {
      league_id: String(leagueId),
      username: normalizeLogin(username),
      email: normalizeLogin(email),
      aliases: aliases.map(normalizeLogin).filter(Boolean).join(','),
      password_hash: hashPassword(password, salt),
      salt,
      created_at: now,
      updated_at: now
    });
    return { ok: true };
  }

  async findAccountByLogin(login) {
    const l = normalizeLogin(login);
    for (const acc of this.accounts.values()) {
      if (
        acc.username === l ||
        acc.email === l ||
        acc.aliases.split(',').filter(Boolean).includes(l)
      ) return acc;
    }
    return null;
  }

  async verifyPassword(login, password) {
    const account = await this.findAccountByLogin(login);
    if (!account) return { ok: false, error: 'حساب الرابطة غير موجود. سجّل رابطتك أولاً.' };
    const computed = hashPassword(password, account.salt);
    if (!timingSafeEqualHex(computed, account.password_hash)) {
      return { ok: false, error: 'كلمة المرور غير صحيحة.' };
    }
    return { ok: true, account };
  }

  async hasAccountForLeague(leagueId) {
    return this.accounts.has(String(leagueId));
  }

  async updatePassword(leagueId, passwordHash, salt) {
    const acc = this.accounts.get(String(leagueId));
    if (!acc) return { ok: false, error: 'الحساب غير موجود' };
    acc.password_hash = String(passwordHash);
    acc.salt = String(salt);
    acc.updated_at = Date.now();
    return { ok: true };
  }

  async close() { /* */ }
}

let sharedStore = null;

/** المصنع: Supabase في السحابة، SQLite على العقد الدائمة، الذاكرة في الاختبارات */
export function createLeagueAuthStore({ dbPath = ':memory:' } = {}) {
  const sbUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const sbKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (sbUrl && sbKey) {
    try { return new SupabaseLeagueAuthStore(); }
    catch (e) { console.warn('[LeagueAuthStore] تعذر تهيئة Supabase:', e?.message); }
  }
  if (DatabaseSync) {
    try { return new SqliteLeagueAuthStore(dbPath); }
    catch (e) { console.warn('[LeagueAuthStore] تعذر فتح SQLite:', e?.message); }
  }
  return new MemoryLeagueAuthStore();
}

export function getLeagueAuthStore() {
  if (!sharedStore) {
    const useMemory = process.env.PFP_SYNC_MEMORY === '1' || process.env.NODE_ENV === 'test';
    const defaultDbPath = path.join(
      String(process.env.PFP_DATA_DIR || process.cwd()),
      'pfp-league-auth.sqlite'
    );
    sharedStore = createLeagueAuthStore({ dbPath: useMemory ? ':memory:' : defaultDbPath });
    console.log(`[LeagueAuthStore] جاهز (${sharedStore.engineName})`);
  }
  return sharedStore;
}

/** إعادة التهيئة للاختبارات (عزل الملفات) */
export function resetLeagueAuthStoreForTest() {
  sharedStore = createLeagueAuthStore({ dbPath: ':memory:' });
  return sharedStore;
}
