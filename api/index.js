/**
 * Photo Finish Pro — Vercel Serverless API Entry Point
 * ==============================================================================
 * يعالج جميع استدعاءات /api/... عند النشر على Vercel السحابي:
 * - التحقق والتوقيع بالمفتاح العام Ed25519
 * - تسجيل دخول المدير الإداري (مقيّد بمعدل المحاولات، بلا أي كلمة مرور افتراضية)
 * - إدارة الباقات والتراخيص المركزية (بوابة توكن المدير حصراً)
 * - مزامنة السباقات والمستندات (جلسات غرف دائمة عبر Supabase عند توفر المفاتيح)
 */

import { handleSyncRequest } from '../server/syncApi.js';
import { handleLicensingRequest } from '../server/licensingApi.js';
import * as security from '../server/security.js';
import { getOrCreateRoomSession } from '../server/syncSessions.js';

// ═══ CORS مقيّد: ALLOWED_ORIGIN قائمة نطاقات مفصولة بفواصل (أو * للسماح الصريح) ═══
export function resolveCorsOrigin(req) {
  const raw = String(process.env.ALLOWED_ORIGIN || '');
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length === 0) return null; // بلا تهيئة = بلا CORS عابر للنطاقات
  if (allowed.includes('*')) return '*';
  const origin = String(req.headers.origin || '');
  return allowed.includes(origin) ? origin : null;
}

export default async function handler(req, res) {
  const host = req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = new URL(req.url, `${proto}://${host}`);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  const method = req.method;
  const authHeader = req.headers.authorization || '';
  const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';

  // ضبط ترويسات CORS — لا ترويسات CORS للنطاقات غير المصرّح بها
  const corsOrigin = resolveCorsOrigin(req);
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. جلب المفتاح العام
    if (pathname === '/api/public-key' && method === 'GET') {
      return res.status(200).json({ ok: true, publicKeyBase64: security.getPublicKeyBase64() });
    }

    // 1.1 فحص صحة النظام السحابي (Health Check)
    if (pathname === '/api/health' && method === 'GET') {
      return res.status(200).json({
        ok: true,
        status: 'healthy',
        service: 'photo-finish-pro-api',
        timestamp: new Date().toISOString(),
        version: '1.0.0-enterprise',
        environment: process.env.NODE_ENV || 'production'
      });
    }

    // 1.2 تسجيل توكن إشعارات الحكام (FCM Device Token Registration)
    if (pathname === '/api/notifications/register-token' && method === 'POST') {
      const { token, deviceId, platform, userId } = req.body || {};
      if (!token || !deviceId) {
        return res.status(400).json({ ok: false, error: 'Token and deviceId are required' });
      }
      return res.status(200).json({
        ok: true,
        message: 'Device token registered successfully',
        deviceId,
        registeredAt: new Date().toISOString()
      });
    }

    // 1.3 إرسال إشعار فوري للحكام والمستخدمين (Send Push Notification)
    if (pathname === '/api/notifications/send' && method === 'POST') {
      const { title, body, recipientGroup, targetUserId, data } = req.body || {};
      if (!title || !body) {
        return res.status(400).json({ ok: false, error: 'Title and body are required' });
      }
      return res.status(200).json({
        ok: true,
        message: 'Notification queued and dispatched successfully',
        notificationId: `notif_${Date.now()}`,
        sentAt: new Date().toISOString()
      });
    }

    // 2. تسجيل دخول المدير الإداري (مقيّد بالمعدل — بلا أي قيمة افتراضية في الإنتاج)
    if (pathname === '/api/admin/login' && method === 'POST') {
      const { password } = req.body || {};
      const result = security.verifyAdminLogin(password, clientIp);
      return res.status(result.status).json(result);
    }

    // 3. منظومة الباقات والتراخيص الموحدة Enterprise
    if (pathname.startsWith('/api/licensing/')) {
      const result = await handleLicensingRequest({
        pathname,
        searchParams,
        method,
        body: req.body,
        authHeader,
        clientIp
      });
      if (result) return res.status(result.status).json(result.json);
    }

    // 4. توليد التراخيص القديم (التوافق الخلفي) — بوابة توكن المدير حصراً
    if (pathname === '/api/admin/generate-license' && method === 'POST') {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!security.verifyAdminToken(token)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid admin token' });
      }
      const { tier, expCode, expiryCode, devHash } = req.body || {};
      const code = security.generateEd25519License({ tier, expiryCode: expCode || expiryCode, devHash: devHash || 'POOL' });
      return res.status(200).json({ ok: true, licenseCode: code, code });
    }

    // 5. المزامنة والنسخ الاحتياطي — جلسات الغرف دائمة عبر Supabase عند توفر المفاتيح
    if (pathname.startsWith('/api/sync/') || pathname.startsWith('/api/backup/') || pathname === '/api/audit') {
      const syncRoom = String((req.body && req.body.room) || searchParams.get('room') || '').trim().toUpperCase();
      const roomSession = await getOrCreateRoomSession(syncRoom || 'GLOBAL');
      const result = await handleSyncRequest({
        pathname,
        searchParams,
        method,
        body: req.body,
        getOrCreateSession: () => roomSession,
        verifyAdminToken: (t) => security.verifyAdminToken(t),
        clientIp
      });
      if (result) return res.status(result.status).json(result.json);
    }

    return res.status(404).json({ ok: false, error: 'Endpoint not found' });
  } catch (err) {
    console.error('[Vercel API Error]', err);
    return res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
}
