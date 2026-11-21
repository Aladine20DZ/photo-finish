/**
 * Photo Finish Pro — مخزن المزامنة السحابي (Supabase/Postgres Sync Store)
 * ==============================================================================
 * نفس واجهة SyncStore بالضبط (ingest/replay/latestSeq/...) لكن ضد جداول Postgres
 * في Supabase عبر مفتاح service_role من الخادم حصراً.
 *
 * لماذا؟ Vercel Serverless لا يحتفظ بالملفات بين الطلبات — SQLite يبني من الصفر
 * عند كل cold-start فيفقد دفتر إلغاء التكرار والسجل الزمني. Postgres دائم.
 *
 * الأمن: RLS مفعّل على الجداول بلا أي سياسات — لا يستطيع anon client (المفتاح العام)
 * القراءة أو الكتابة إطلاقاً؛ فقط الخادم بمفتاح service_role يتجاوز RLS.
 * الرسائل نفسها مشفرة/موقعة على العميل قبل وصولها هنا (بوابة HMAC في networkService).
 */

import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cachedClient;
}

function isUniqueViolation(error) {
  return Boolean(error && (error.code === '23505' || /duplicate key|unique/i.test(String(error.message || error))));
}

export class SupabaseSyncStore {
  constructor() {
    this.engineName = 'supabase-postgres';
    const client = getClient();
    if (!client) {
      throw new Error('SupabaseSyncStore يتطلب SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    }
    this.sb = client;
  }

  /** إدخال دفعة رسائل مع إلغاء التكرار حسب (room, _msgId) */
  async ingest(room, messages) {
    const accepted = [];
    const duplicates = [];
    const now = Date.now();

    for (const msg of (Array.isArray(messages) ? messages : [])) {
      const msgId = String(msg?._msgId || msg?.id || '').trim();
      if (!msgId) continue; // رسالة بلا معرف لا يمكن ضمان عدم تكرارها — تُرفض

      const row = {
        msg_id: msgId,
        room: String(room),
        sender_id: msg?._senderId ? String(msg._senderId) : null,
        sender_role: msg?._senderRole ? String(msg._senderRole) : null,
        msg_type: msg?.type ? String(msg.type) : null,
        received_at: Number(msg?.timestamp) || now,
        payload: JSON.stringify(msg)
      };

      const { error } = await this.sb.from('pfp_sync_messages').insert(row);
      if (error) {
        if (isUniqueViolation(error)) {
          duplicates.push(msgId); // سبق قبولها — السلوك المطلوب تحديداً
        } else {
          console.warn('[SyncStoreSupabase] فشل إدخال رسالة:', error.message);
        }
      } else {
        accepted.push(msgId);
      }
    }

    return { accepted, duplicates };
  }

  /** استرجاع الرسائل بعد تسلسل معين (لتعويض فجوة الانقطاع) */
  async replay(room, sinceSeq = 0, limit = 500) {
    const cap = Math.min(Math.max(1, Number(limit) || 500), 2000);
    const { data, error } = await this.sb
      .from('pfp_sync_messages')
      .select('seq, msg_id, room, sender_id, sender_role, msg_type, received_at, payload')
      .eq('room', String(room))
      .gt('seq', Number(sinceSeq) || 0)
      .order('seq', { ascending: true })
      .limit(cap);
    if (error) {
      console.warn('[SyncStoreSupabase] فشل الاسترجاع:', error.message);
      return [];
    }
    return (data || []).map(row => ({
      seq: row.seq,
      msg_id: row.msg_id,
      room: row.room,
      sender_id: row.sender_id,
      sender_role: row.sender_role,
      type: row.msg_type,
      received_at: Number(row.received_at),
      payload: safeParse(row.payload)
    }));
  }

  async latestSeq(room) {
    const { data, error } = await this.sb
      .from('pfp_sync_messages')
      .select('seq')
      .eq('room', String(room))
      .order('seq', { ascending: false })
      .limit(1);
    if (error) return 0;
    return data?.[0]?.seq || 0;
  }

  async messageCount(room) {
    const { count, error } = await this.sb
      .from('pfp_sync_messages')
      .select('msg_id', { count: 'exact', head: true })
      .eq('room', String(room));
    if (error) return 0;
    return count || 0;
  }

  /** توثيق سجل تدقيق خادمي (يدعم الدفعات) */
  async appendAudit(room, entries) {
    const now = Date.now();
    const rows = [];
    for (const e of (Array.isArray(entries) ? entries : [])) {
      rows.push({
        id: String(e?.id || `srv_${now}_${Math.random().toString(36).slice(2, 8)}`),
        room: room || null,
        actor_role: e?.actorRole || null,
        action: String(e?.action || 'UNKNOWN'),
        target: e?.target ? String(e.target) : null,
        old_value: e?.oldValue != null ? JSON.stringify(e.oldValue) : null,
        new_value: e?.newValue != null ? JSON.stringify(e.newValue) : null,
        reason: e?.reason ? String(e.reason) : null,
        created_at: Number(e?.timestamp) || now
      });
    }
    if (rows.length) {
      const { error } = await this.sb.from('pfp_sync_audit').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.warn('[SyncStoreSupabase] فشل توثيق التدقيق:', error.message);
    }
  }

  async listAudit(room, limit = 100) {
    const cap = Math.min(Math.max(1, Number(limit) || 100), 1000);
    const { data, error } = await this.sb
      .from('pfp_sync_audit')
      .select('id, room, actor_role, action, target, old_value, new_value, reason, created_at')
      .eq('room', String(room))
      .order('created_at', { ascending: false })
      .limit(cap);
    if (error) return [];
    return data || [];
  }

  /** لقطة نسخة احتياطية (JSON كامل) */
  async saveSnapshot(room, kind, dataObj, messageCount) {
    const createdAt = Date.now();
    const { data, error } = await this.sb
      .from('pfp_backup_snapshots')
      .insert({
        room: String(room),
        kind: String(kind),
        created_at: createdAt,
        message_count: messageCount || 0,
        data: JSON.stringify(dataObj)
      })
      .select('id')
      .single();
    if (error || !data) {
      console.warn('[SyncStoreSupabase] فشل حفظ اللقطة:', error?.message);
      return { id: -1, createdAt };
    }
    return { id: Number(data.id), createdAt };
  }

  async listSnapshots(room) {
    const { data, error } = await this.sb
      .from('pfp_backup_snapshots')
      .select('id, room, kind, created_at, message_count')
      .eq('room', String(room))
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  }

  async getSnapshot(id) {
    const { data, error } = await this.sb
      .from('pfp_backup_snapshots')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle();
    if (error || !data) return null;
    return { ...data, data: safeParse(data.data) };
  }

  async stats() {
    return {
      engine: this.engineName,
      rooms: await this._knownRooms()
    };
  }

  async _knownRooms() {
    const { data, error } = await this.sb
      .from('pfp_sync_messages')
      .select('room')
      .limit(1000);
    if (error) return [];
    const unique = [...new Set((data || []).map(r => r.room))].slice(0, 200);
    const rooms = [];
    for (const room of unique) {
      rooms.push({
        room,
        messages: await this.messageCount(room),
        latestSeq: await this.latestSeq(room)
      });
    }
    return rooms;
  }

  async close() { /* اتصال Supabase مُدار تلقائياً */ }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
