/**
 * Photo Finish Pro — رموز الجلسة الموقعة خادمياً (Server-Signed Session Tokens)
 * ==============================================================================
 * التنسيق: PFPs1.<base64url(payload JSON)>.<base64url(HMAC-SHA256)>
 * - السر: SESSION_SECRET من بيئة الخادم حصراً — لا يوجد في الواجهة أبداً،
 *   لذا لا يمكن لأي عميل تزوير أو تعديل دور/رابطة داخل الرمز.
 * - الإنتاج بلا SESSION_SECRET: يرفض إصدار جلسات بـ503 (بدل سر زائل).
 * - التطوير: سر عشوائي لكل إقلاع (يُطبع تحذير واحد).
 */

import crypto from 'node:crypto';

const TOKEN_PREFIX = 'PFPs1';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 أيام

let devEphemeralSecret = '';

function isProductionEnvironment() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function resolveSessionSecret() {
  const fromEnv = String(process.env.SESSION_SECRET || '').trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (fromEnv) {
    console.warn('[SessionTokens] SESSION_SECRET أقصر من 16 حرفاً — يُرفض في الإنتاج ويعمل مؤقتاً في التطوير.');
    if (isProductionEnvironment()) return null;
  }
  if (isProductionEnvironment()) return null;
  if (!devEphemeralSecret) {
    devEphemeralSecret = crypto.randomBytes(32).toString('base64url');
    console.warn('[SessionTokens] SESSION_SECRET غير مضبوط — سر عشوائي لجلسة التطوير الحالية فقط (الجلسات تموت مع كل إقلاع).');
  }
  return devEphemeralSecret;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function hmac(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

/**
 * إصدار رمز جلسة موقّع.
 * @param {object} claims { portal, leagueId?, userId, username?, role, extra? }
 * @param {number} [ttlMs]
 * @returns {{ ok: boolean, token?: string, expiresAt?: number, error?: string }}
 */
export function signSessionToken(claims, ttlMs = DEFAULT_TTL_MS) {
  const secret = resolveSessionSecret();
  if (!secret) {
    return { ok: false, error: 'SESSION_SECRET غير مضبوط على الخادم — تعذر إصدار جلسة موقعة.' };
  }
  const now = Date.now();
  const exp = now + Math.max(60_000, Number(ttlMs) || DEFAULT_TTL_MS);
  const payload = { v: 1, iat: now, exp, ...claims };
  const payloadB64 = b64url(JSON.stringify(payload));
  const token = `${TOKEN_PREFIX}.${payloadB64}.${hmac(payloadB64, secret)}`;
  return { ok: true, token, expiresAt: exp };
}

/**
 * التحقق الخادمي من رمز جلسة (توقيع + صلاحية زمنية).
 * @returns {{ valid: boolean, payload?: object, error?: string }}
 */
export function verifySessionToken(token) {
  const secret = resolveSessionSecret();
  if (!secret) return { valid: false, error: 'SESSION_SECRET غير مضبوط على الخادم.' };
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return { valid: false, error: 'تنسيق رمز الجلسة غير صالح (يتوقع PFPs1)' };
  }
  const [, payloadB64, receivedSig] = parts;
  const expectedSig = hmac(payloadB64, secret);
  const a = Buffer.from(receivedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, error: 'توقيع رمز الجلسة غير صالح أو تم التلاعب به' };
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, error: 'حمولة رمز الجلسة غير صالحة' };
  }
  if (!payload?.exp || Date.now() > Number(payload.exp)) {
    return { valid: false, error: 'انتهت صلاحية رمز الجلسة' };
  }
  return { valid: true, payload };
}

/** فك الحمولة دون تحقق (للعرض في الواجهة فقط — القرارات الأمنية على الخادم) */
export function decodeSessionTokenUnsafe(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export default {
  signSessionToken,
  verifySessionToken,
  decodeSessionTokenUnsafe
};
