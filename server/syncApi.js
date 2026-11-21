/**
 * Photo Finish Pro — واجهة مزامنة REST موحدة (Sync API Handler)
 * ==============================================================================
 * نفس المعالج يعمل في بيئتين:
 *   - مدمجاً في خادم تطوير/عرض Vite (vite.config.ts)
 *   - داخل خادم الترحيل المستقل (relay-server) عبر import ديناميكي
 *   - سحابياً في Vercel Serverless عبر api/index.js
 *
 * المسارات:
 *   POST /api/sync/ingest   { room, sessionToken, messages: [...] }
 *                           → { ok, accepted, duplicates, latestSeq }
 *   GET  /api/sync/replay?room=&since=<seq>&limit=<n>&token=<SESSION>
 *                           → { ok, room, since, latestSeq, messages: [...] }
 *   GET  /api/sync/status?room=
 *                           → { ok, room, messageCount, latestSeq }
 *   GET  /api/backup/export?room=&token=<ADMIN_TOKEN>
 *                           → لقطة JSON كاملة (رسائل + تدقيق) للتنزيل
 *   POST /api/backup/import { room, kind, data, token=<ADMIN_TOKEN> }
 *                           → حفظ اللقطة في سجل الخادم
 *   GET  /api/audit?room=&limit=&token=<ADMIN_TOKEN>
 *                           → سجل التدقيق الخادمي
 *
 * الأمان:
 *   - ingest/replay: رمز الجلسة إلزامي (401 بغيره) ومطابقة جلسة الغرفة إلزامية
 *     (403 عند عدم التطابق). تحصل عليه الأجهزة من /api/session أو رسالة الترحيب.
 *   - تحديد المعدل الخادمي لكل IP (دائم على relay/Node، تقريبي على Serverless).
 *   - النسخ الاحتياطي وسجل التدقيق: حصرياً برمز المدير (Ed25519 HMAC token).
 */

import { createSyncStore } from './syncStore.js';

let sharedStore = null;

export function getSyncStore() {
  if (!sharedStore) {
    sharedStore = createSyncStore();
    const engine = sharedStore.engineName
      || (sharedStore.usingSqlite ? 'node:sqlite' : 'memory-fallback');
    console.log(`[SyncAPI] مخزن المزامنة جاهز (${engine})`);
  }
  return sharedStore;
}

// ═══ تحديد المعدل الخادمي لكل IP ═══
const rateBuckets = new Map(); // `${scope}|${ip}` -> { count, resetAt }
const RATE_RULES = {
  ingest: { limit: 600, windowMs: 60_000 }, // دفعة/دقيقة
  replay: { limit: 300, windowMs: 60_000 }  // استرجاع/دقيقة
};

function checkRate(scope, ip) {
  const rule = RATE_RULES[scope];
  if (!rule) return { allowed: true };
  const now = Date.now();
  const key = `${scope}|${String(ip || 'unknown')}`;
  const rec = rateBuckets.get(key) || { count: 0, resetAt: now + rule.windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + rule.windowMs; }
  rec.count += 1;
  rateBuckets.set(key, rec);
  if (rec.count > rule.limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((rec.resetAt - now) / 1000)) };
  }
  return { allowed: true };
}

/**
 * معالج موحد للطلب (async: يدعم مخازن SQLite/Supabase/الذاكرة وجلسات الغرف الدائمة).
 * @param {object} p
 * @param {string} p.pathname
 * @param {URLSearchParams} p.searchParams
 * @param {string} p.method
 * @param {any} p.body جسم الطلب المفكوك (أو null)
 * @param {(room: string) => string | Promise<string>} p.getOrCreateSession
 * @param {(token: string) => boolean} p.verifyAdminToken
 * @param {string} [p.clientIp]
 * @returns {Promise<{ status: number, json: object } | null>} null إذا لم يكن المسار من المسارات المعالجة
 */
export async function handleSyncRequest({ pathname, searchParams, method, body, getOrCreateSession, verifyAdminToken, clientIp = 'unknown' }) {
  const store = getSyncStore();

  // ── 1. إدخال دفعة رسائل (Idempotent Ingest) ──
  if (pathname === '/api/sync/ingest' && method === 'POST') {
    const room = String(body?.room || '').trim().toUpperCase();
    if (!room) return { status: 400, json: { ok: false, error: 'Missing room' } };

    const rl = checkRate('ingest', clientIp);
    if (!rl.allowed) {
      return { status: 429, json: { ok: false, error: `Rate limit exceeded, retry after ${rl.retryAfterSec}s` } };
    }

    // رمز الجلسة إلزامي — كل جهاز يحصل عليه من /api/session أو رسالة الترحيب
    const providedToken = String(body?.sessionToken || '');
    if (!providedToken) {
      return { status: 401, json: { ok: false, error: 'Session token required (fetch /api/session first)' } };
    }
    const real = await getOrCreateSession(room);
    if (providedToken !== real) {
      return { status: 403, json: { ok: false, error: 'Session token mismatch' } };
    }

    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length > 500) {
      return { status: 413, json: { ok: false, error: 'Batch too large (max 500)' } };
    }

    const { accepted, duplicates } = await store.ingest(room, messages);
    return {
      status: 200,
      json: {
        ok: true,
        room,
        acceptedCount: accepted.length,
        duplicatesCount: duplicates.length,
        duplicates,
        latestSeq: await store.latestSeq(room),
        serverTime: Date.now()
      }
    };
  }

  // ── 2. استرجاع الفجوة (Gap Replay) ──
  if (pathname === '/api/sync/replay' && method === 'GET') {
    const room = String(searchParams.get('room') || '').trim().toUpperCase();
    if (!room) return { status: 400, json: { ok: false, error: 'Missing room' } };

    const rl = checkRate('replay', clientIp);
    if (!rl.allowed) {
      return { status: 429, json: { ok: false, error: `Rate limit exceeded, retry after ${rl.retryAfterSec}s` } };
    }

    // رمز الجلسة إلزامي هنا أيضاً
    const providedToken = String(searchParams.get('token') || '');
    if (!providedToken) {
      return { status: 401, json: { ok: false, error: 'Session token required (fetch /api/session first)' } };
    }
    const real = await getOrCreateSession(room);
    if (providedToken !== real) {
      return { status: 403, json: { ok: false, error: 'Session token mismatch' } };
    }

    const since = Number(searchParams.get('since')) || 0;
    const limit = Number(searchParams.get('limit')) || 500;
    const messages = await store.replay(room, since, limit);
    return {
      status: 200,
      json: {
        ok: true,
        room,
        since,
        latestSeq: await store.latestSeq(room),
        count: messages.length,
        messages
      }
    };
  }

  // ── 3. حالة المزامنة ──
  if (pathname === '/api/sync/status' && method === 'GET') {
    const room = String(searchParams.get('room') || '').trim().toUpperCase();
    return {
      status: 200,
      json: {
        ok: true,
        room,
        messageCount: room ? await store.messageCount(room) : 0,
        latestSeq: room ? await store.latestSeq(room) : 0,
        stats: await store.stats(),
        serverTime: Date.now()
      }
    };
  }

  // ── 4. تصدير نسخة احتياطية (مدير فقط) ──
  if (pathname === '/api/backup/export' && method === 'GET') {
    const token = String(searchParams.get('token') || '');
    if (!verifyAdminToken(token)) {
      return { status: 401, json: { ok: false, error: 'Unauthorized: Invalid admin token' } };
    }
    const room = String(searchParams.get('room') || '').trim().toUpperCase();
    const since = Number(searchParams.get('since')) || 0;
    const messages = room ? await store.replay(room, since, 2000) : [];
    const audit = room ? await store.listAudit(room, 1000) : [];
    return {
      status: 200,
      json: {
        ok: true,
        format: 'PFP_BACKUP_V1',
        room,
        exportedAt: new Date().toISOString(),
        latestSeq: room ? await store.latestSeq(room) : 0,
        messageCount: messages.length,
        auditCount: audit.length,
        messages,
        audit
      }
    };
  }

  // ── 5. استيراد نسخة احتياطية (مدير فقط) ──
  if (pathname === '/api/backup/import' && method === 'POST') {
    const token = String(body?.token || '');
    if (!verifyAdminToken(token)) {
      return { status: 401, json: { ok: false, error: 'Unauthorized: Invalid admin token' } };
    }
    const room = String(body?.room || '').trim().toUpperCase();
    if (!room) return { status: 400, json: { ok: false, error: 'Missing room' } };

    // استرجاع الرسائل داخل اللقطة عبر الدفتر نفسه (إلغاء تكرار مضمون)
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const { accepted, duplicates } = await store.ingest(room, messages);
    const audit = Array.isArray(body?.audit) ? body.audit : [];
    if (audit.length) await store.appendAudit(room, audit);

    const snap = await store.saveSnapshot(room, String(body?.kind || 'import'), {
      importedAt: new Date().toISOString(),
      accepted: accepted.length,
      duplicates: duplicates.length
    }, accepted.length);

    return {
      status: 200,
      json: { ok: true, room, acceptedCount: accepted.length, duplicatesCount: duplicates.length, snapshotId: snap.id }
    };
  }

  // ── 6. سجل تدقيق الخادم (مدير فقط) ──
  if (pathname === '/api/audit' && method === 'GET') {
    const token = String(searchParams.get('token') || '');
    if (!verifyAdminToken(token)) {
      return { status: 401, json: { ok: false, error: 'Unauthorized: Invalid admin token' } };
    }
    const room = String(searchParams.get('room') || '').trim().toUpperCase();
    const limit = Number(searchParams.get('limit')) || 100;
    return { status: 200, json: { ok: true, room, entries: room ? await store.listAudit(room, limit) : [] } };
  }

  return null;
}
