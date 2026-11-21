/**
 * Photo Finish Pro — واجهة مصادقة الرابطات الخادمية (League Auth REST API)
 * ==============================================================================
 * نقل مصادقة الرابطات من الواجهة إلى طبقة موثوقة (Stage 1):
 *   POST /api/league/login     { username, password, targetLeagueId? }
 *   POST /api/league/register  { leagueId, username, email, password, aliases? }
 *   POST /api/league/verify    { token }              ← فحص جلسة موقعة (للمكاتب)
 *   POST /api/league/logout    { token }              ← قلب الإصدار (التدقيق فقط)
 *
 * الأمن:
 *   - كلمات المرور: scrypt + salt على الخادم حصراً — لا تُخزَّن في الواجهة.
 *   - الجلسات: رموز HMAC موقعة بـ SESSION_SECRET (لا يمكن تزوير الدور/الرابطة).
 *   - Rate Limiting: 5 محاولات فاشلة / 15 دقيقة / IP (تسجيل الدخول والتسجيل).
 *   - انتهاء صلاحية الجلسة: 7 أيام.
 */

import crypto from 'node:crypto';
import { getLeagueAuthStore } from './leagueAuthStore.js';
import { signSessionToken, verifySessionToken } from './sessionTokens.js';

// ═══ تحديد معدل محاولات المصادقة ═══
const authAttempts = new Map(); // `${scope}|${ip}` -> { count, resetAt }
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkAuthRate(scope, ip) {
  const now = Date.now();
  const key = `${scope}|${String(ip || 'unknown')}`;
  const rec = authAttempts.get(key) || { count: 0, resetAt: now + LOCKOUT_MS };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + LOCKOUT_MS; }
  rec.count += 1;
  authAttempts.set(key, rec);
  if (rec.count > MAX_ATTEMPTS) {
    const remainingMin = Math.ceil((rec.resetAt - now) / 60000);
    return { allowed: false, error: `تم تجاوز الحد المسموح به من المحاولات. أعد المحاولة بعد ${remainingMin} دقيقة.` };
  }
  return { allowed: true };
}

function clearAuthFailures(scope, ip) {
  authAttempts.delete(`${scope}|${String(ip || 'unknown')}`);
}

function validatePasswordStrength(password) {
  const p = String(password || '');
  if (p.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'كلمة المرور يجب أن تضم أحرفاً وأرقاماً معاً.';
  return null;
}

/**
 * بناء جلسة الواجهة من حساب موثّق.
 */
async function issueLeagueSession(account) {
  const userId = `usr_league_${String(account.league_id).replace(/[^a-z0-9_]/gi, '').slice(0, 24)}`;
  const signed = signSessionToken({
    portal: 'league',
    leagueId: account.league_id,
    userId,
    username: account.username,
    role: 'league_admin'
  });
  if (!signed.ok) {
    return { status: 503, json: { ok: false, error: signed.error } };
  }
  return {
    status: 200,
    json: {
      ok: true,
      session: {
        token: signed.token,
        leagueId: account.league_id,
        userId,
        username: account.username,
        role: 'league_admin',
        expiresAt: signed.expiresAt
      }
    }
  };
}

export async function handleLeagueAuthRequest({ pathname, method, body, clientIp = '127.0.0.1' }) {
  const store = getLeagueAuthStore();

  // ── 1. تسجيل الدخول ──
  if (pathname === '/api/league/login' && method === 'POST') {
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');
    const targetLeagueId = String(body?.targetLeagueId || '').trim();

    if (!username || !password) {
      return { status: 400, json: { ok: false, error: 'اسم المستخدم وكلمة المرور مطلوبان.' } };
    }

    const rl = checkAuthRate('login', clientIp);
    if (!rl.allowed) return { status: 429, json: { ok: false, error: rl.error } };

    const result = await store.verifyPassword(username, password);
    if (!result.ok) {
      return { status: 401, json: { ok: false, error: result.error } };
    }

    if (targetLeagueId && result.account.league_id !== targetLeagueId) {
      return { status: 403, json: { ok: false, error: 'هذا الحساب لا يعود للرابطة المطلوبة.' } };
    }

    clearAuthFailures('login', clientIp);
    return issueLeagueSession(result.account);
  }

  // ── 2. تسجيل حساب رابطة جديد ──
  if (pathname === '/api/league/register' && method === 'POST') {
    const leagueId = String(body?.leagueId || '').trim();
    const username = String(body?.username || '').trim();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const aliases = Array.isArray(body?.aliases) ? body.aliases : [];

    if (!leagueId) return { status: 400, json: { ok: false, error: 'معرف الرابطة مطلوب.' } };
    if (username.length < 3 || username.length > 40) {
      return { status: 400, json: { ok: false, error: 'اسم المستخدم بين 3 و40 حرفاً.' } };
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { status: 400, json: { ok: false, error: 'البريد الإلكتروني غير صالح.' } };
    }
    const weak = validatePasswordStrength(password);
    if (weak) return { status: 400, json: { ok: false, error: weak } };

    const rl = checkAuthRate('register', clientIp);
    if (!rl.allowed) return { status: 429, json: { ok: false, error: rl.error } };

    const created = await store.createAccount({ leagueId, username, email, password, aliases });
    if (!created.ok) return { status: 409, json: { ok: false, error: created.error } };

    clearAuthFailures('register', clientIp);
    const account = await store.findAccountByLogin(username);
    return issueLeagueSession(account);
  }

  // ── 3. التحقق الخادمي من جلسة (للمكاتب والصلاحيات) ──
  if (pathname === '/api/league/verify' && method === 'POST') {
    const token = String(body?.token || '');
    const result = verifySessionToken(token);
    if (!result.valid) {
      return { status: 401, json: { ok: false, valid: false, error: result.error } };
    }
    const p = result.payload;
    return {
      status: 200,
      json: {
        ok: true,
        valid: true,
        portal: p.portal,
        leagueId: p.leagueId || null,
        userId: p.userId || null,
        username: p.username || null,
        role: p.role || null,
        expiresAt: p.exp
      }
    };
  }

  // ── 4. تغيير كلمة مرور حساب رابطة (يتطلب جلسة موقعة) ──
  if (pathname === '/api/league/password' && method === 'POST') {
    const token = String(body?.token || '');
    const session = verifySessionToken(token);
    if (!session.valid || session.payload?.portal !== 'league') {
      return { status: 401, json: { ok: false, error: 'جلسة غير صالحة — أعد تسجيل الدخول.' } };
    }
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || '');
    const weak = validatePasswordStrength(newPassword);
    if (weak) return { status: 400, json: { ok: false, error: weak } };

    const store2 = getLeagueAuthStore();
    const check = await store2.verifyPassword(session.payload.username, currentPassword);
    if (!check.ok) return { status: 401, json: { ok: false, error: 'كلمة المرور الحالية غير صحيحة.' } };

    // إعادة تعيين كلمة المرور لنفس الهوية
    const acc = check.account;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
    const updated = await store2.updatePassword(acc.league_id, hash, salt);
    if (!updated.ok) return { status: 500, json: { ok: false, error: updated.error } };
    return { status: 200, json: { ok: true, message: 'تم تحديث كلمة المرور بنجاح.' } };
  }

  return null;
}
