-- ==============================================================================
-- Photo Finish Pro — Migration: Sync Journal on Supabase (Stage 1 Security)
-- ==============================================================================
-- الهدف: نقل مخزن المزامنة الخادمي من SQLite/ملفات محلية (زائلة على Vercel)
-- إلى جداول Postgres دائمة. يستهلكها server/syncStoreSupabase.js و
-- server/syncSessions.js بمفتاح service_role من الخادم حصراً.
--
-- الأمن: RLS مفعّل على كل الجداول بلا أي سياسات → المفتاح العام (anon) ممنوع
-- من القراءة والكتابة تماماً؛ فقط الخادم (service_role) يتجاوز RLS.
-- التراجع: DROP TABLE ... (لا يمس أي جدول أعمال آخر).
-- ==============================================================================

-- 1) السجل الزمني لرسائل المزامنة (Idempotency Ledger + Replayable Journal)
CREATE TABLE IF NOT EXISTS pfp_sync_messages (
  seq BIGSERIAL PRIMARY KEY,
  msg_id TEXT NOT NULL,
  room TEXT NOT NULL,
  sender_id TEXT,
  sender_role TEXT,
  msg_type TEXT,
  received_at BIGINT NOT NULL,
  payload TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room, msg_id)
);
CREATE INDEX IF NOT EXISTS idx_pfp_sync_room_seq ON pfp_sync_messages(room, seq);
CREATE INDEX IF NOT EXISTS idx_pfp_sync_type ON pfp_sync_messages(msg_type);

-- 2) سجل التدقيق الخادمي
CREATE TABLE IF NOT EXISTS pfp_sync_audit (
  id TEXT PRIMARY KEY,
  room TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target TEXT,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pfp_sync_audit_room_time ON pfp_sync_audit(room, created_at);

-- 3) لقطات النسخ الاحتياطي
CREATE TABLE IF NOT EXISTS pfp_backup_snapshots (
  id BIGSERIAL PRIMARY KEY,
  room TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  message_count INTEGER DEFAULT 0,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pfp_snapshots_room ON pfp_backup_snapshots(room, created_at);

-- 4) جلسات الغرف الدائمة (تحل محل 'vercel-session' الثابتة)
CREATE TABLE IF NOT EXISTS pfp_room_sessions (
  room TEXT PRIMARY KEY,
  session_token TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ═══ RLS: مفعّل بلا سياسات = حجب كامل للمفتاح العام (anon/authenticated) ═══
-- مفتاح service_role الخادمي يتجاوز RLS وهو القارئ/الكاتب الوحيد.
ALTER TABLE pfp_sync_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pfp_sync_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE pfp_backup_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pfp_room_sessions ENABLE ROW LEVEL SECURITY;
