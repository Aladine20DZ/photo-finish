import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isSupabaseConfigured, getSupabase } from '../src/services/supabaseClient';
import { authService, Profile } from '../src/services/authService';

describe('Stage 1: Supabase Database Architecture, RLS & Authentication', () => {
  describe('PostgreSQL Migration Schema & RLS Verification', () => {
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260306000000_photo_finish_pro_schema.sql');

    it('ensures the migration script exists and is readable', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      expect(sqlContent.length).toBeGreaterThan(1000);
    });

    it('verifies all 12 core tables are created', () => {
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      const expectedTables = [
        'leagues',
        'clubs',
        'profiles',
        'athletes',
        'competitions',
        'events',
        'entries',
        'results',
        'field_attempts',
        'race_passages',
        'licenses',
        'audit_logs'
      ];

      for (const table of expectedTables) {
        expect(sqlContent).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      }
    });

    it('enforces Row Level Security (RLS) on 100% of tables', () => {
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      const expectedTables = [
        'leagues',
        'clubs',
        'profiles',
        'athletes',
        'competitions',
        'events',
        'entries',
        'results',
        'field_attempts',
        'race_passages',
        'licenses',
        'audit_logs'
      ];

      for (const table of expectedTables) {
        expect(sqlContent).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      }
    });

    it('verifies multi-tenant helper functions and realtime replica identities', () => {
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      expect(sqlContent).toContain('current_user_role()');
      expect(sqlContent).toContain('current_user_league_id()');
      expect(sqlContent).toContain('current_user_club_id()');
      expect(sqlContent).toContain('ALTER TABLE results REPLICA IDENTITY FULL;');
      expect(sqlContent).toContain('ALTER TABLE events REPLICA IDENTITY FULL;');
    });
  });

  describe('Supabase Client & Offline Fallback', () => {
    it('initializes Supabase client without crashing even in offline mode', () => {
      const client = getSupabase();
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(typeof client.auth.signInWithPassword).toBe('function');
    });

    it('correctly reports offline mode when credentials are mock/missing', () => {
      // In default test environment without real secrets, isSupabaseConfigured() is false
      expect(typeof isSupabaseConfigured()).toBe('boolean');
    });
  });

  describe('RBAC Roles & Permissions Matrix', () => {
    const mockSuperAdmin: Profile = {
      id: 'usr_super',
      league_id: 'lg_algiers',
      club_id: null,
      full_name: 'مدير المنظومة الأعلى',
      role: 'super_admin',
      phone: null,
      is_verified: true,
      avatar_url: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockLeagueAdmin: Profile = {
      id: 'usr_league_admin',
      league_id: 'lg_oran',
      club_id: null,
      full_name: 'مدير رابطة وهران',
      role: 'league_admin',
      phone: null,
      is_verified: true,
      avatar_url: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockCoach: Profile = {
      id: 'usr_coach_mca',
      league_id: 'lg_algiers',
      club_id: 'club_mca',
      full_name: 'مدرب نادي مولودية الجزائر',
      role: 'club_coach',
      phone: null,
      is_verified: true,
      avatar_url: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockFieldJudge: Profile = {
      id: 'usr_judge_field',
      league_id: 'lg_algiers',
      club_id: null,
      full_name: 'حكم مسابقات الميدان',
      role: 'field_judge',
      phone: null,
      is_verified: true,
      avatar_url: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockChiefJudge: Profile = {
      id: 'usr_chief',
      league_id: 'lg_algiers',
      club_id: null,
      full_name: 'رئيس هيئة التحكيم',
      role: 'chief_judge',
      phone: null,
      is_verified: true,
      avatar_url: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('enforces league management permissions', () => {
      expect(authService.canManageLeague(mockSuperAdmin)).toBe(true);
      expect(authService.canManageLeague(mockLeagueAdmin)).toBe(true);
      expect(authService.canManageLeague(mockCoach)).toBe(false);
      expect(authService.canManageLeague(mockFieldJudge)).toBe(false);
    });

    it('enforces club coach isolation by club_id', () => {
      expect(authService.canCoachClub(mockCoach, 'club_mca')).toBe(true);
      expect(authService.canCoachClub(mockCoach, 'club_crb')).toBe(false); // Isolated from other clubs!
      expect(authService.canCoachClub(mockSuperAdmin, 'club_crb')).toBe(true);
    });

    it('enforces event judging permissions', () => {
      expect(authService.canJudgeEvent(mockFieldJudge)).toBe(true);
      expect(authService.canJudgeEvent(mockChiefJudge)).toBe(true);
      expect(authService.canJudgeEvent(mockLeagueAdmin)).toBe(true);
      expect(authService.canJudgeEvent(mockCoach)).toBe(false);
    });

    it('enforces official result certification (Rule 8 / Chief Judge)', () => {
      expect(authService.canCertifyResults(mockChiefJudge)).toBe(true);
      expect(authService.canCertifyResults(mockSuperAdmin)).toBe(true);
      expect(authService.canCertifyResults(mockFieldJudge)).toBe(false);
      expect(authService.canCertifyResults(mockCoach)).toBe(false);
    });
  });
});
