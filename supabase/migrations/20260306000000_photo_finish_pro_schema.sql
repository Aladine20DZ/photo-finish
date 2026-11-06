-- ==============================================================================
-- PHOTO FINISH PRO AI — Complete Multi-League Athletics Database Schema
-- Supabase / PostgreSQL Enterprise Migration Script (Stage 1)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'league_admin',
    'chief_judge',
    'field_judge',
    'timing_operator',
    'club_coach',
    'public_viewer'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE competition_type AS ENUM (
    'track_and_field',
    'cross_country',
    'road_race',
    'trail',
    'mountain_race',
    'indoor'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM (
    'scheduled',
    'call_room',
    'in_progress',
    'under_review',
    'official_locked',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE entry_status AS ENUM (
    'registered',
    'confirmed',
    'scratched',
    'dns',
    'active'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE result_status AS ENUM (
    'OK',
    'DNF',
    'DNS',
    'DQ',
    'NM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE license_tier AS ENUM (
    'ENTX',
    'CLUB',
    'BASIC',
    'TRIAL'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. CORE TABLES

-- 3.1 Leagues (Multi-Tenant Root)
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  country_code VARCHAR(3) DEFAULT 'DZA',
  region VARCHAR(100),
  logo_url TEXT,
  settings JSONB DEFAULT '{
    "allow_public_registration": true,
    "require_medical_cert": true,
    "rulebook": "WORLD_ATHLETICS_2026",
    "theme": "athletics_emerald"
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 Clubs
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  city VARCHAR(100),
  wilaya VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_club_league_code UNIQUE (league_id, code)
);

-- 3.3 User Profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'public_viewer',
  phone VARCHAR(50),
  is_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 Athletes Registry
CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(200) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  bib_number VARCHAR(20),
  birth_date DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F')),
  category VARCHAR(20) NOT NULL,
  medical_cert_expiry DATE,
  is_active BOOLEAN DEFAULT true,
  pb_records JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_athlete_league_license UNIQUE (league_id, license_number)
);

-- 3.5 Competitions
CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  competition_type competition_type NOT NULL DEFAULT 'track_and_field',
  venue VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'upcoming',
  is_published BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{
    "photo_finish_required": true,
    "wind_gauge_required": true,
    "max_attempts_field": 6,
    "cross_country_team_runners": 4
  }'::jsonb,
  course_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.6 Events / Disciplines
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  event_code VARCHAR(50) NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F', 'X')),
  category VARCHAR(20) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- sprint, middle_distance, jump, throw, relay, cross_country
  round VARCHAR(50) DEFAULT 'final',
  heat_count INT DEFAULT 1,
  scheduled_time TIMESTAMPTZ,
  status event_status NOT NULL DEFAULT 'scheduled',
  wind_reading NUMERIC(4, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.7 Entries / Heat Assignments
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  status entry_status NOT NULL DEFAULT 'registered',
  heat_number INT DEFAULT 1,
  lane_number INT,
  bib_number VARCHAR(20),
  seed_mark NUMERIC(10, 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_event_athlete UNIQUE (event_id, athlete_id)
);

-- 3.8 Official Results
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  rank INT,
  time_millis BIGINT,
  distance_meters NUMERIC(6, 2),
  status result_status NOT NULL DEFAULT 'OK',
  reaction_time_millis INT,
  wind_reading NUMERIC(4, 2),
  slit_scan_image_url TEXT,
  certified_by UUID REFERENCES profiles(id),
  certified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.9 Field Event Attempts (World Athletics Rule 25 & 26)
CREATE TABLE IF NOT EXISTS field_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL CHECK (attempt_number BETWEEN 1 AND 6),
  height_or_distance NUMERIC(6, 2),
  is_valid BOOLEAN, -- true = valid, false = foul (X), null = pass (-)
  wind_reading NUMERIC(4, 2),
  judge_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_attempt UNIQUE (event_id, athlete_id, attempt_number)
);

-- 3.10 Race Passages & Checkpoints (Cross Country & Road Races)
CREATE TABLE IF NOT EXISTS race_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  checkpoint_id VARCHAR(50) NOT NULL,
  checkpoint_code VARCHAR(50) NOT NULL,
  bib_number VARCHAR(20) NOT NULL,
  athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  timestamp_millis BIGINT NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  judge_id UUID REFERENCES profiles(id),
  sync_status VARCHAR(20) DEFAULT 'synced',
  anomaly_flag VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.11 Software & Device Licenses
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL UNIQUE,
  tier license_tier NOT NULL DEFAULT 'CLUB',
  device_id VARCHAR(100) NOT NULL,
  is_quad_pool BOOLEAN DEFAULT false,
  max_shared_slots INT DEFAULT 4,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3.12 Comprehensive Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PERFORMANCE & SEARCH INDEXES
CREATE INDEX IF NOT EXISTS idx_athletes_league ON athletes(league_id);
CREATE INDEX IF NOT EXISTS idx_athletes_club ON athletes(club_id);
CREATE INDEX IF NOT EXISTS idx_athletes_norm_name ON athletes USING gin (normalized_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_competitions_league ON competitions(league_id);
CREATE INDEX IF NOT EXISTS idx_competitions_dates ON competitions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_competition ON events(competition_id);
CREATE INDEX IF NOT EXISTS idx_entries_event ON entries(event_id);
CREATE INDEX IF NOT EXISTS idx_results_event ON results(event_id);
CREATE INDEX IF NOT EXISTS idx_results_athlete ON results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_race_passages_comp ON race_passages(competition_id, bib_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_league ON audit_logs(league_id, created_at DESC);

-- 5. ROW LEVEL SECURITY (RLS) ON 100% OF TABLES
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. SECURITY POLICIES (MULTI-TENANCY & RBAC)

-- Helper: Get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Get current user's league_id
CREATE OR REPLACE FUNCTION current_user_league_id()
RETURNS UUID AS $$
  SELECT league_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Get current user's club_id
CREATE OR REPLACE FUNCTION current_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6.1 Leagues Policies
CREATE POLICY "Public leagues view" ON leagues
  FOR SELECT USING (true);

CREATE POLICY "Super admin manages leagues" ON leagues
  FOR ALL USING (current_user_role() = 'super_admin');

-- 6.2 Clubs Policies
CREATE POLICY "Clubs visible to league or public" ON clubs
  FOR SELECT USING (
    league_id = current_user_league_id() OR current_user_role() = 'super_admin' OR is_active = true
  );

CREATE POLICY "League admins manage clubs" ON clubs
  FOR ALL USING (
    (league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'super_admin'))
  );

-- 6.3 Profiles Policies
CREATE POLICY "Profiles viewable within league" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR league_id = current_user_league_id() OR current_user_role() = 'super_admin'
  );

CREATE POLICY "Users edit own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins manage profiles" ON profiles
  FOR ALL USING (
    league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'super_admin')
  );

-- 6.4 Athletes Policies
CREATE POLICY "Athletes viewable within league" ON athletes
  FOR SELECT USING (
    league_id = current_user_league_id() OR current_user_role() = 'super_admin'
  );

CREATE POLICY "Coaches manage their club athletes" ON athletes
  FOR ALL USING (
    league_id = current_user_league_id() AND
    (
      (club_id = current_user_club_id() AND current_user_role() = 'club_coach') OR
      current_user_role() IN ('league_admin', 'super_admin')
    )
  );

-- 6.5 Competitions Policies
CREATE POLICY "Published competitions viewable by all" ON competitions
  FOR SELECT USING (
    is_published = true OR league_id = current_user_league_id() OR current_user_role() = 'super_admin'
  );

CREATE POLICY "League admins manage competitions" ON competitions
  FOR ALL USING (
    league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'super_admin')
  );

-- 6.6 Events Policies
CREATE POLICY "Events viewable by all" ON events
  FOR SELECT USING (true);

CREATE POLICY "League admins manage events" ON events
  FOR ALL USING (
    league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'super_admin', 'chief_judge')
  );

-- 6.7 Entries Policies
CREATE POLICY "Entries viewable within competition" ON entries
  FOR SELECT USING (true);

CREATE POLICY "Coaches create entries for their club" ON entries
  FOR INSERT WITH CHECK (
    club_id = current_user_club_id() AND current_user_role() = 'club_coach'
  );

CREATE POLICY "Admins and judges manage entries" ON entries
  FOR ALL USING (
    league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'chief_judge', 'super_admin')
  );

-- 6.8 Results Policies
CREATE POLICY "Certified results viewable by all" ON results
  FOR SELECT USING (true);

CREATE POLICY "Judges and timing operators insert/update results" ON results
  FOR ALL USING (
    league_id = current_user_league_id() AND current_user_role() IN ('chief_judge', 'field_judge', 'timing_operator', 'league_admin', 'super_admin')
  );

-- 6.9 Field Attempts Policies
CREATE POLICY "Field attempts viewable" ON field_attempts
  FOR SELECT USING (true);

CREATE POLICY "Field judges record attempts" ON field_attempts
  FOR ALL USING (
    league_id = current_user_league_id() AND current_user_role() IN ('field_judge', 'chief_judge', 'league_admin', 'super_admin')
  );

-- 6.10 Race Passages Policies
CREATE POLICY "Race passages viewable" ON race_passages
  FOR SELECT USING (true);

CREATE POLICY "Checkpoint judges log passages" ON race_passages
  FOR INSERT WITH CHECK (
    league_id = current_user_league_id() AND current_user_role() IN ('field_judge', 'chief_judge', 'timing_operator', 'league_admin', 'super_admin')
  );

-- 6.11 Licenses Policies
CREATE POLICY "Licenses viewable by league admin" ON licenses
  FOR SELECT USING (
    league_id = current_user_league_id() OR current_user_role() = 'super_admin'
  );

CREATE POLICY "Super admins manage licenses" ON licenses
  FOR ALL USING (current_user_role() = 'super_admin');

-- 6.12 Audit Logs Policies
CREATE POLICY "Audit logs viewable by league admin" ON audit_logs
  FOR SELECT USING (
    (league_id = current_user_league_id() AND current_user_role() IN ('league_admin', 'super_admin'))
  );

CREATE POLICY "System inserts audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- 7. REALTIME REPLICA IDENTITIES
ALTER TABLE results REPLICA IDENTITY FULL;
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE race_passages REPLICA IDENTITY FULL;
ALTER TABLE field_attempts REPLICA IDENTITY FULL;
