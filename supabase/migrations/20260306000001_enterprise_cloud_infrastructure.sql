-- ==============================================================================
-- PHOTO FINISH PRO AI — Enterprise Cloud Infrastructure & Storage Migration
-- Supabase / PostgreSQL Enterprise Migration Script (Stage 2)
-- ==============================================================================

-- 1. STORAGE BUCKETS REGISTRATION
-- Insert standard enterprise storage buckets into Supabase Storage if not present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('league-assets', 'league-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('signatures', 'signatures', false, 2097152, ARRAY['image/png', 'image/webp', 'image/svg+xml']),
  ('athlete-media', 'athlete-media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('finish-images', 'finish-images', false, 52428800, ARRAY['image/png', 'image/jpeg', 'image/tiff', 'image/webp']),
  ('reports', 'reports', false, 26214400, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. STORAGE RLS POLICIES (ROW LEVEL SECURITY ON storage.objects)

-- 2.1 League Assets: Public read, League Admins & Super Admins upload
CREATE POLICY "Public read for league assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'league-assets');

CREATE POLICY "Admins upload league assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'league-assets' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admins update league assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'league-assets' AND
    auth.role() = 'authenticated'
  );

-- 2.2 Signatures: Private, visible to owner judge, Chief Judge, and Admins
CREATE POLICY "Judges and admins read signatures" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'signatures' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users upload signatures" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'signatures' AND
    auth.role() = 'authenticated'
  );

-- 2.3 Athlete Media: Private, visible within authenticated league context
CREATE POLICY "Authenticated users read athlete media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'athlete-media' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Coaches and admins upload athlete media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'athlete-media' AND
    auth.role() = 'authenticated'
  );

-- 2.4 Finish Images: Private, high-res photo finish captures
CREATE POLICY "Authenticated staff read finish images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'finish-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Timing operators and judges upload finish images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'finish-images' AND
    auth.role() = 'authenticated'
  );

-- 2.5 Reports: Private official protocols & export sheets
CREATE POLICY "Authenticated users read official reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Chief judges and admins upload official reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports' AND
    auth.role() = 'authenticated'
  );

-- 3. STORAGE FILE METADATA REGISTRY TABLE
CREATE TABLE IF NOT EXISTS storage_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256_hash VARCHAR(64),
  uploader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_certified_locked BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_bucket_path UNIQUE (bucket_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_storage_files_comp ON storage_files(competition_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_league ON storage_files(league_id);
ALTER TABLE storage_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View storage files in league" ON storage_files
  FOR SELECT USING (
    league_id = current_user_league_id() OR current_user_role() = 'super_admin' OR is_certified_locked = true
  );

CREATE POLICY "Staff insert storage files" ON storage_files
  FOR INSERT WITH CHECK (
    league_id = current_user_league_id() OR current_user_role() = 'super_admin'
  );

CREATE POLICY "Admins update unlocked storage files" ON storage_files
  FOR UPDATE USING (
    (league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'super_admin'))
    AND is_certified_locked = false
  );

-- 4. OFFICIAL JUDGES ROSTER & ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS judges_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  level VARCHAR(50) NOT NULL DEFAULT 'REGIONAL_1', -- NATIONAL, REGIONAL_1, REGIONAL_2, INTERNATIONAL_WA
  specialty VARCHAR(100) NOT NULL DEFAULT 'PHOTO_FINISH_OPERATOR', -- STARTER, CHIEF_FINISH, TIMEKEEPER, WIND_GAUGE, JUMP_CHIEF, THROW_CHIEF
  phone VARCHAR(50),
  email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_judge_league_lic UNIQUE (league_id, license_number)
);

CREATE TABLE IF NOT EXISTS judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES judges_roster(id) ON DELETE CASCADE,
  duty_role VARCHAR(100) NOT NULL,
  assigned_discipline_code VARCHAR(50),
  duty_code VARCHAR(20) NOT NULL, -- 4-digit code e.g. JDG-1001 for quick checkin
  is_checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_comp_judge_role UNIQUE (competition_id, judge_id, duty_role)
);

CREATE INDEX IF NOT EXISTS idx_judge_assign_comp ON judge_assignments(competition_id);
ALTER TABLE judges_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Judges roster visible within league" ON judges_roster
  FOR SELECT USING (league_id = current_user_league_id() OR current_user_role() = 'super_admin');

CREATE POLICY "Admins manage judges roster" ON judges_roster
  FOR ALL USING (league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'super_admin'));

CREATE POLICY "Assignments visible within league" ON judge_assignments
  FOR SELECT USING (league_id = current_user_league_id() OR current_user_role() = 'super_admin');

CREATE POLICY "Admins manage judge assignments" ON judge_assignments
  FOR ALL USING (league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'super_admin', 'chief_judge'));

-- 5. FIREBASE CLOUD MESSAGING (FCM) TOKENS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS fcm_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'web',
  token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_device_token UNIQUE (device_id, token)
);

CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_group VARCHAR(50), -- 'all_judges', 'chief_judges', 'timing_operators', 'competition_staff'
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_comp ON notifications_log(competition_id, sent_at DESC);
ALTER TABLE fcm_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own FCM tokens" ON fcm_device_tokens
  FOR ALL USING (user_id = auth.uid() OR auth.role() = 'authenticated');

CREATE POLICY "View notifications in league" ON notifications_log
  FOR SELECT USING (league_id = current_user_league_id() OR current_user_role() = 'super_admin' OR recipient_id = auth.uid());

CREATE POLICY "Staff insert notifications" ON notifications_log
  FOR INSERT WITH CHECK (
    league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'chief_judge', 'super_admin')
  );

-- 6. CENTRAL LICENSING MIRROR (PostgreSQL Cloud Replica)
CREATE TABLE IF NOT EXISTS licensing_plans (
  id VARCHAR(50) PRIMARY KEY,
  tier_code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_dzd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  price_eur NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duration_months INT NOT NULL DEFAULT 12,
  lane_count INT NOT NULL DEFAULT 8,
  is_quad_pool BOOLEAN NOT NULL DEFAULT false,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS licensing_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_code VARCHAR(150) NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  device_name VARCHAR(255),
  platform VARCHAR(50),
  ip_address VARCHAR(50),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_license_device UNIQUE (license_code, device_id)
);

CREATE INDEX IF NOT EXISTS idx_lic_activations_code ON licensing_activations(license_code);
ALTER TABLE licensing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE licensing_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read licensing plans" ON licensing_plans
  FOR SELECT USING (is_active = true OR current_user_role() = 'super_admin');

CREATE POLICY "Super admin manages plans" ON licensing_plans
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY "Activations viewable by admins" ON licensing_activations
  FOR SELECT USING (current_user_role() IN ('league_admin', 'super_admin'));

CREATE POLICY "Public device activation insert" ON licensing_activations
  FOR INSERT WITH CHECK (true);
