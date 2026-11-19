-- ==============================================================================
-- PHOTO FINISH PRO AI — Unified Sync & Complete Delete Management System
-- Supabase / PostgreSQL Enterprise Migration Script (Stage 3 / Phase 14)
-- ==============================================================================

-- 1. CENTRALIZED RECYCLE BIN TABLE (Multi-Tenant Scoped by League)
CREATE TABLE IF NOT EXISTS recycle_bin_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- competition, event, judge, assignment, athlete, club, registration, race, result, report, device
  entity_id VARCHAR(100) NOT NULL,
  entity_name VARCHAR(255) NOT NULL,
  source_module VARCHAR(100) NOT NULL, -- competitions, events, judges, assignments, athletes, clubs, call_room, results, reports, devices
  payload JSONB NOT NULL, -- Complete preserved JSON state for zero-loss recovery
  deleted_by VARCHAR(100) DEFAULT 'مدير الرابطة',
  deleted_by_role VARCHAR(50) DEFAULT 'league_admin',
  reason TEXT,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  restored_at TIMESTAMPTZ,
  is_purged BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for high-performance filtering & multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_recycle_bin_league ON recycle_bin_items(league_id);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_type ON recycle_bin_items(entity_type);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON recycle_bin_items(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_active ON recycle_bin_items(league_id, is_purged) WHERE is_purged = false;

-- 2. ACTIVE COMPETITION REGISTRY TABLE (Per League Active Context)
CREATE TABLE IF NOT EXISTS active_competitions (
  league_id UUID PRIMARY KEY REFERENCES leagues(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(100) DEFAULT 'مسؤول الرابطة'
);

CREATE INDEX IF NOT EXISTS idx_active_competitions_comp ON active_competitions(competition_id);

-- 3. ADD SOFT-DELETE COLUMNS TO EXISTING CORE TABLES IF NOT PRESENT
DO $$ BEGIN
  ALTER TABLE competitions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
  ALTER TABLE competitions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE competitions ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);
  ALTER TABLE competitions ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE events ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);
  ALTER TABLE events ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE clubs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
  ALTER TABLE clubs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE clubs ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);
  ALTER TABLE clubs ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
  ALTER TABLE athletes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE athletes ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);
  ALTER TABLE athletes ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE results ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
  ALTER TABLE results ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE results ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);
  ALTER TABLE results ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
  ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);
  ALTER TABLE judge_assignments ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR RECYCLE BIN
ALTER TABLE recycle_bin_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_competitions ENABLE ROW LEVEL SECURITY;

-- 4.1 Recycle Bin Isolation Policy
DROP POLICY IF EXISTS recycle_bin_league_isolation ON recycle_bin_items;
CREATE POLICY recycle_bin_league_isolation ON recycle_bin_items
  FOR ALL
  USING (
    -- Super admins can access everything, league members access their league only
    (auth.jwt() ->> 'role' = 'super_admin') OR
    (league_id = ((auth.jwt() -> 'app_metadata' ->> 'league_id')::uuid))
  )
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'super_admin') OR
    (league_id = ((auth.jwt() -> 'app_metadata' ->> 'league_id')::uuid))
  );

-- 4.2 Active Competitions Isolation Policy
DROP POLICY IF EXISTS active_competitions_isolation ON active_competitions;
CREATE POLICY active_competitions_isolation ON active_competitions
  FOR ALL
  USING (
    (auth.jwt() ->> 'role' = 'super_admin') OR
    (league_id = ((auth.jwt() -> 'app_metadata' ->> 'league_id')::uuid))
  )
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'super_admin') OR
    (league_id = ((auth.jwt() -> 'app_metadata' ->> 'league_id')::uuid))
  );

-- 5. REALTIME REPLICATION CONFIGURATION
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE recycle_bin_items;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE active_competitions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
