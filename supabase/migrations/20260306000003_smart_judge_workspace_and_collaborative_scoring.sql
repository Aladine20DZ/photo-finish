-- ==============================================================================
-- PHOTO FINISH PRO — SMART JUDGE WORKSPACE & COLLABORATIVE SCORING MIGRATION
-- Migration Version: 20260306000003
-- Compliant with World Athletics Rule 18, 19, 25 & 26
-- ==============================================================================

-- 1. ENHANCE JUDGE ASSIGNMENTS TABLE (World Athletics Rule 18 & 19)
DO $$
BEGIN
  -- Add work location / venue details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'work_location') THEN
    ALTER TABLE judge_assignments ADD COLUMN work_location VARCHAR(150) DEFAULT 'الميدان الرئيسي';
  END IF;

  -- Add assignment type (e.g. chief, assistant, measurement, recorder, track, finish, start, checkpoint)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'assignment_type') THEN
    ALTER TABLE judge_assignments ADD COLUMN assignment_type VARCHAR(50) DEFAULT 'field';
  END IF;

  -- Add assigned list / event reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'assigned_list_id') THEN
    ALTER TABLE judge_assignments ADD COLUMN assigned_list_id VARCHAR(100);
  END IF;

  -- Add assigned group / pool (e.g. Group A, Group B, Heats)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'assigned_group_id') THEN
    ALTER TABLE judge_assignments ADD COLUMN assigned_group_id VARCHAR(100);
  END IF;

  -- Add detailed JSONB permissions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'permissions') THEN
    ALTER TABLE judge_assignments ADD COLUMN permissions JSONB DEFAULT '{"canRecord": true, "canEdit": true, "canCertify": false, "canDelete": false}'::jsonb;
  END IF;

  -- Add assignment status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'assignment_status') THEN
    ALTER TABLE judge_assignments ADD COLUMN assignment_status VARCHAR(50) DEFAULT 'assigned';
  END IF;

  -- Add scheduled start & end time
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'scheduled_start_time') THEN
    ALTER TABLE judge_assignments ADD COLUMN scheduled_start_time VARCHAR(20) DEFAULT '09:00';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'scheduled_end_time') THEN
    ALTER TABLE judge_assignments ADD COLUMN scheduled_end_time VARCHAR(20) DEFAULT '12:00';
  END IF;

  -- Add discipline Arabic title
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'judge_assignments' AND column_name = 'discipline_name_ar') THEN
    ALTER TABLE judge_assignments ADD COLUMN discipline_name_ar VARCHAR(150);
  END IF;
END $$;

-- 2. CREATE JUDGE ACTIVITY LOGS TABLE (Multi-Judge Collaborative Audit Trail)
CREATE TABLE IF NOT EXISTS judge_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES judge_assignments(id) ON DELETE SET NULL,
  judge_id UUID,
  judge_name VARCHAR(150) NOT NULL,
  judge_role VARCHAR(100) NOT NULL,
  discipline_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- RECORD_ATTEMPT, UPDATE_ATTEMPT, CHANGE_HEIGHT, CERTIFY_EVENT, CONCURRENCY_LOCK
  athlete_id VARCHAR(100),
  athlete_bib INT,
  attempt_number INT,
  previous_value TEXT,
  new_value TEXT,
  wind_reading NUMERIC(4, 2),
  device_info VARCHAR(150),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judge_activity_comp ON judge_activity_logs(competition_id);
CREATE INDEX IF NOT EXISTS idx_judge_activity_disc ON judge_activity_logs(discipline_id);
CREATE INDEX IF NOT EXISTS idx_judge_activity_created ON judge_activity_logs(created_at DESC);

-- 3. CREATE RESULT REVISIONS TABLE (Historical Versioning & Conflict Prevention)
CREATE TABLE IF NOT EXISTS result_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  discipline_id VARCHAR(100) NOT NULL,
  athlete_id VARCHAR(100) NOT NULL,
  attempt_number INT NOT NULL,
  previous_mark VARCHAR(50),
  revised_mark VARCHAR(50) NOT NULL,
  previous_status VARCHAR(20),
  revised_status VARCHAR(20) NOT NULL,
  revision_reason TEXT NOT NULL,
  revised_by_judge_id UUID,
  revised_by_judge_name VARCHAR(150) NOT NULL,
  approved_by_chief_judge VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_result_revisions_comp ON result_revisions(competition_id);

-- 4. CREATE ASSIGNMENT SESSIONS TABLE (Active Field Presence & Locking)
CREATE TABLE IF NOT EXISTS assignment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES judge_assignments(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  discipline_id VARCHAR(100) NOT NULL,
  device_uuid VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  current_athlete_lock VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_session_device UNIQUE (assignment_id, device_uuid)
);

CREATE INDEX IF NOT EXISTS idx_sessions_discipline ON assignment_sessions(discipline_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE judge_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_sessions ENABLE ROW LEVEL SECURITY;

-- Activity Logs: Read within league, insert for active judges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Activity logs visible within league' AND tablename = 'judge_activity_logs') THEN
    CREATE POLICY "Activity logs visible within league" ON judge_activity_logs
      FOR SELECT USING (league_id = current_user_league_id() OR current_user_role() = 'super_admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Judges record activity logs' AND tablename = 'judge_activity_logs') THEN
    CREATE POLICY "Judges record activity logs" ON judge_activity_logs
      FOR INSERT WITH CHECK (league_id = current_user_league_id() OR current_user_role() IN ('super_admin', 'league_admin', 'chief_judge', 'judge'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Revisions visible within league' AND tablename = 'result_revisions') THEN
    CREATE POLICY "Revisions visible within league" ON result_revisions
      FOR SELECT USING (league_id = current_user_league_id() OR current_user_role() = 'super_admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sessions visible within league' AND tablename = 'assignment_sessions') THEN
    CREATE POLICY "Sessions visible within league" ON assignment_sessions
      FOR ALL USING (true);
  END IF;
END $$;
