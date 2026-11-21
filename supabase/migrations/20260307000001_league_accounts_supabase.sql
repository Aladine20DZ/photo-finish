-- ==============================================================================
-- Photo Finish Pro — Migration: Server-Side League Accounts (Stage 1 Security)
-- ==============================================================================
-- حسابات دخول الرابطات تعيش هنا حصراً (scrypt hash + salt على الخادم).
-- الواجهة لا تحفظ ولا تقارن كلمات مرور الرابطات بعد هذه المرحلة.
-- RLS مفعّل بلا سياسات: الوصول عبر service_role الخادمي فقط.
-- التراجع: DROP TABLE pfp_league_accounts;
-- ==============================================================================

CREATE TABLE IF NOT EXISTS pfp_league_accounts (
  league_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  aliases TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pfp_league_accounts_username ON pfp_league_accounts(username);
CREATE INDEX IF NOT EXISTS idx_pfp_league_accounts_email ON pfp_league_accounts(email);

ALTER TABLE pfp_league_accounts ENABLE ROW LEVEL SECURITY;
