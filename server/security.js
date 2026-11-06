/**
 * Photo Finish Pro — وحدة الأمان وإصدار التراخيص الخادمية (Server Security Engine)
 * ==============================================================================
 * 
 * المزايا:
 * 1. التوقيع غير المتماثل (Ed25519 Asymmetric Cryptography):
 *    - المفتاح الخاص محفوظ حصراً على الخادم ولا يُرسل أبداً للواجهة الأمامية.
 *    - التطبيق يحمل المفتاح العام فقط ويتحقق من التوقيع محلياً وأوفلاين.
 * 2. بوابة الإدارة الآمنة (Rate-Limited Admin Gate):
 *    - حماية ضد التخمين (Brute-Force Protection): بحد أقصى 5 محاولات فاشلة لكل 15 دقيقة لكل عنوان IP.
 *    - مقارنة ثابتة التوقيت (Timing-Safe Equality) لمنع هجمات التوقيت (Timing Attacks).
 *    - جلسات إدارية مشفرة ومحددة المدة.
 */

import crypto from 'node:crypto';

// ═══ مفاتيح التشفير الافتراضية والبيئة ═══
const DEFAULT_PRIV_BASE64 = 'gW5tU3jF63FHmofys6AdKy9340A34SErmp+7OfTHy4Q=';
const DEFAULT_PUB_BASE64 = 'hbH1fBBC+kL3K6u7pWufQqHoKRjM0iS/+GA5L+j0nMg=';

const safeEnv = typeof process !== 'undefined' && process.env ? process.env : {};

// إمكانية الاستبدال عبر متغيرات البيئة في الإنتاج
export const PRIV_KEY_RAW = typeof Buffer !== 'undefined'
  ? (safeEnv.LICENSE_PRIVATE_KEY_BASE64 
      ? Buffer.from(safeEnv.LICENSE_PRIVATE_KEY_BASE64, 'base64')
      : Buffer.from(DEFAULT_PRIV_BASE64, 'base64'))
  : null;

export const PUB_KEY_RAW = typeof Buffer !== 'undefined'
  ? (safeEnv.LICENSE_PUBLIC_KEY_BASE64 
      ? Buffer.from(safeEnv.LICENSE_PUBLIC_KEY_BASE64, 'base64')
      : Buffer.from(DEFAULT_PUB_BASE64, 'base64'))
  : null;

// بناء مفتاح خاص Ed25519 بصيغة PKCS8
const PKCS8_HEADER = typeof Buffer !== 'undefined' ? Buffer.from('302e020100300506032b657004220420', 'hex') : null;
const privateKeyObject = (crypto && typeof crypto.createPrivateKey === 'function' && PKCS8_HEADER && PRIV_KEY_RAW)
  ? crypto.createPrivateKey({
      key: Buffer.concat([PKCS8_HEADER, PRIV_KEY_RAW]),
      format: 'der',
      type: 'pkcs8'
    })
  : null;

// كلمات مرور المدير المعتمدة (تُقرأ من متغيرات البيئة مع قيمة افتراضية آمنة للتطوير والمعاينة)
export function getValidPasswords() {
  const env = typeof process !== 'undefined' && process.env ? process.env : {};
  const custom = [env.ADMIN_PORTAL_PASSWORD].filter(Boolean);
  if (custom.length > 0) return custom;
  return ['Admin@PhotoFinish2026!'];
}
export const VALID_PASSWORDS = typeof process !== 'undefined' && process.env
  ? [process.env.ADMIN_PORTAL_PASSWORD || 'Admin@PhotoFinish2026!'].filter(Boolean)
  : ['Admin@PhotoFinish2026!'];

// ═══ حماية محاولات تسجيل الدخول (Rate Limiting) ═══
const loginAttempts = new Map(); // ip -> { count: number, resetAt: number }
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 دقيقة

function cleanExpiredAttempts() {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now > record.resetAt) {
      loginAttempts.delete(ip);
    }
  }
}

// تنظيف دوري للذاكرة
setInterval(cleanExpiredAttempts, 5 * 60 * 1000);

/**
 * التحقق من كلمة مرور المدير مع تحديد المعدل وحماية التوقيت
 */
export function verifyAdminLogin(password, clientIp = '127.0.0.1') {
  cleanExpiredAttempts();
  const now = Date.now();
  const record = loginAttempts.get(clientIp) || { count: 0, resetAt: now + LOCKOUT_MS };

  if (record.count >= MAX_ATTEMPTS && now < record.resetAt) {
    const remainingMin = Math.ceil((record.resetAt - now) / 60000);
    return {
      success: false,
      status: 429,
      error: `تم تجاوز الحد المسموح به من المحاولات الفاشلة. يرجى الانتظار ${remainingMin} دقيقة.`
    };
  }

  const activePasswords = getValidPasswords();
  if (activePasswords.length === 0) {
    return {
      success: false,
      status: 403,
      error: 'لم يتم تعيين كلمة مرور المدير في متغيرات البيئة (ADMIN_PORTAL_PASSWORD).'
    };
  }

  // مقارنة آمنة ضد هجمات التوقيت مع كلمة المرور المعينة في البيئة
  const cleanInput = String(password || '').trim();
  const inputBuffer = Buffer.from(cleanInput);
  let isMatch = false;

  for (const validPass of activePasswords) {
    const targetBuffer = Buffer.from(validPass);
    if (inputBuffer.length === targetBuffer.length && crypto.timingSafeEqual(inputBuffer, targetBuffer)) {
      isMatch = true;
      break;
    }
  }

  if (!isMatch) {
    record.count++;
    record.resetAt = now + LOCKOUT_MS;
    loginAttempts.set(clientIp, record);
    return {
      success: false,
      status: 401,
      error: 'كلمة المرور غير صحيحة.',
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - record.count)
    };
  }

  // تسجيل دخول ناجح - مسح المحاولات الفاشلة
  loginAttempts.delete(clientIp);

  // توليد رمز جلسة إداري مشفر ومحدد بـ 8 ساعات
  const sessionPayload = `${clientIp}|${Date.now() + 8 * 3600 * 1000}`;
  const sessionHmac = crypto.createHmac('sha256', PRIV_KEY_RAW).update(sessionPayload).digest('hex');
  const adminToken = Buffer.from(`${sessionPayload}|${sessionHmac}`).toString('base64');

  return {
    success: true,
    status: 200,
    adminToken,
    token: adminToken
  };
}

/**
 * التحقق من صلاحية الرمز الإداري
 */
export function verifyAdminToken(token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return false;
    const [ip, expiryStr, receivedHmac] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) return false;

    const expectedHmac = crypto.createHmac('sha256', PRIV_KEY_RAW).update(`${ip}|${expiryStr}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac));
  } catch (e) {
    return false;
  }
}

/**
 * توليد كود ترخيص موقع رسمياً بـ Ed25519
 * @param {{ tier: 'CLB8' | 'ENTX', expiryCode: string, devHash?: string }} params
 */
export function generateEd25519License({ tier, expiryCode, devHash = 'POOL' }) {
  const payload = `PFP2|${tier}|${expiryCode}|${devHash}`;
  const signatureBuffer = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKeyObject);
  // ترميز التوقيع بصيغة Base64Url لتكون صالحة في كود نصي
  const sigBase64Url = signatureBuffer.toString('base64url');
  // كود الترخيص الرسمي V2
  return `PFP2-${tier}-${expiryCode}-${devHash}-${sigBase64Url}`;
}

/**
 * التحقق من توقيع كود Ed25519 على الخادم (اختياري للفحص والتحقق)
 */
export function verifyEd25519Signature(payload, signatureBuffer) {
  const SPKI_HEADER = Buffer.from('302a300506032b6570032100', 'hex');
  const publicKeyObject = crypto.createPublicKey({
    key: Buffer.concat([SPKI_HEADER, PUB_KEY_RAW]),
    format: 'der',
    type: 'spki'
  });
  return crypto.verify(null, Buffer.from(payload, 'utf8'), publicKeyObject, signatureBuffer);
}

/**
 * جلب المفتاح العام بصيغة Base64 للواجهة الأمامية
 */
export function getPublicKeyBase64() {
  return PUB_KEY_RAW.toString('base64');
}

// ═══ توقيع رموز نقاط المراقبة (Checkpoint QR Signing) ═══
// النص القياسي الموقع: PFP_CP1|cid|cpid|code|km|iat|exp
// التوقيع Ed25519 يتحقق على العميل أوفلاين بالمفتاح العام — لا يوجد أي سر في الواجهة.

/**
 * بناء النص القياسي (Canonical String) لحمولة نقطة مراقبة
 */
export function buildCheckpointCanonical({ cid, cpid, code, km, iat, exp }) {
  return `PFP_CP1|${cid}|${cpid}|${code}|${km}|${iat}|${exp}`;
}

/**
 * توقيع حمولة نقطة مراقبة بـ Ed25519 من الخادم
 * @returns {string} توقيع Base64Url (64 بايت)
 */
export function signCheckpointQr({ cid, cpid, code, km, iat, exp }) {
  const canonical = buildCheckpointCanonical({ cid, cpid, code, km, iat, exp });
  const signatureBuffer = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKeyObject);
  return signatureBuffer.toString('base64url');
}

/**
 * التحقق من توقيع نقطة مراقبة (للاختبار والفحص الخادمي)
 */
export function verifyCheckpointQrSignature({ cid, cpid, code, km, iat, exp }, sigBase64Url) {
  const canonical = buildCheckpointCanonical({ cid, cpid, code, km, iat, exp });
  const SPKI_HEADER = Buffer.from('302a300506032b6570032100', 'hex');
  const publicKeyObject = crypto.createPublicKey({
    key: Buffer.concat([SPKI_HEADER, PUB_KEY_RAW]),
    format: 'der',
    type: 'spki'
  });
  const sigBytes = Buffer.from(String(sigBase64Url || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return crypto.verify(null, Buffer.from(canonical, 'utf8'), publicKeyObject, sigBytes);
}

export default {
  verifyAdminLogin,
  verifyAdminToken,
  generateEd25519License,
  verifyEd25519Signature,
  getPublicKeyBase64,
  buildCheckpointCanonical,
  signCheckpointQr,
  verifyCheckpointQrSignature,
  PUB_KEY_RAW,
  PRIV_KEY_RAW
};
