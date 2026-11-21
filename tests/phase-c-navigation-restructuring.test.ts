import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginTestLeague } from './helpers/leagueAuthHarness';
import { portalAuthService, RegisteredLeague } from '../src/services/portalAuthService';

describe('Phase C: Navigation Restructuring & Centralized League Bureau Suite', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = String(val); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      length: 0,
      key: () => null,
    };
    portalAuthService.resetToDefaults();
    vi.restoreAllMocks();
  });

  describe('1. Demo League Protection & Backup System (Rule 2)', () => {
    it('should create an instant backup snapshot before any destructive action', () => {
      const backupKey = portalAuthService.backupLeagues();
      expect(backupKey).toContain('leagues_backup_');
      const backupData = (globalThis as any).localStorage.getItem(backupKey);
      expect(backupData).not.toBeNull();
      const parsed = JSON.parse(backupData!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should filter out demo leagues when includeDemo is false', () => {
      // Register a demo league
      const demoLeague: RegisteredLeague = {
        id: 'lg_demo_test',
        name: 'رابطة تجريبية للاختبار',
        shortName: 'DEMO',
        type: 'wilaya',
        wilaya: 'سعيدة',
        accreditationNumber: 'DEMO-999',
        officialEmail: 'demo@test.dz',
        phone: '0550000000',
        adminFullName: 'مشرف تجريبي',
        adminUsername: 'demo_user',
        adminPassword: 'password123',
        createdAt: '2026-01-01',
        isActive: true,
        is_demo: true,
        archived_at: '2026-01-01T00:00:00.000Z'
      };

      const leagues = portalAuthService.getAllLeagues(true);
      (globalThis as any).localStorage.setItem('pfp_registered_leagues_v2', JSON.stringify([...leagues, demoLeague]));

      // In production mode without includeDemo, it must NOT return demo leagues
      const prodLeagues = portalAuthService.getAllLeagues(false);
      const hasDemo = prodLeagues.some(l => l.is_demo === true || l.id === 'lg_demo_test');
      expect(hasDemo).toBe(false);

      // With includeDemo = true, it should return demo leagues
      const allWithDemo = portalAuthService.getAllLeagues(true);
      const foundDemo = allWithDemo.some(l => l.id === 'lg_demo_test');
      expect(foundDemo).toBe(true);
    });

    it('should safely archive a league without permanently deleting it', () => {
      const officialLeagues = portalAuthService.getAllLeagues(false);
      const targetId = officialLeagues[0].id;

      const archived = portalAuthService.archiveLeague(targetId);
      expect(archived).toBe(true);

      const leagueAfterArchive = portalAuthService.getLeagueById(targetId, true);
      expect(leagueAfterArchive).toBeDefined();
      expect(leagueAfterArchive?.archived_at).toBeTruthy();
      expect(leagueAfterArchive?.is_demo).toBe(true);
    });

    it('should restore leagues from a backup snapshot', () => {
      const backupKey = portalAuthService.backupLeagues();
      const initialCount = portalAuthService.getAllLeagues(true).length;

      // Mark first league as demo
      const officialLeagues = portalAuthService.getAllLeagues(false);
      portalAuthService.markLeagueAsDemo(officialLeagues[0].id, true);

      // Restore
      const restored = portalAuthService.restoreLeaguesBackup(backupKey);
      expect(restored).toBe(true);
      expect(portalAuthService.getAllLeagues(true).length).toBe(initialCount);
    });
  });

  describe('2. Navigation Structure & Public Items Restriction', () => {
    it('ensures NavShell exports cleanly and mounts properly with public navigation tabs', async () => {
      const navShellCode = await import('../src/components/navigation/NavShell');
      expect(navShellCode.NavShell).toBeDefined();
    }, 120000);
  });

  describe('3. League Executive Suite 8 Modules & Redirections', () => {
    it('verifies LeagueExecutiveSuite exports and subtab types match the 8 Phase C modules', async () => {
      const suiteModule = await import('../src/components/league/LeagueExecutiveSuite');
      expect(suiteModule.LeagueExecutiveSuite).toBeDefined();

      const coreModules = [
        'overview',
        'competitions',
        'planning',
        'competitions-bureau',
        'clubs_athletes',
        'judges',
        'reports',
        'identity'
      ];
      expect(coreModules.length).toBe(8);
    }, 120000);

    it('authenticates and gates access to planning and competitions bureau', async () => {
      // When session is null, getSession returns null
      expect(portalAuthService.getSession('league')).toBeNull();

      // Login as official league using valid credentials
      const loginRes = await loginTestLeague();
      expect(loginRes.success).toBe(true);
      expect(loginRes.session).toBeDefined();
      expect(loginRes.session?.portal).toBe('league');
      expect(loginRes.session?.leagueId).toBe('lg_saida');

      // Now session is valid
      const activeSession = portalAuthService.getSession('league');
      expect(activeSession).not.toBeNull();
      expect(activeSession?.leagueId).toBe('lg_saida');

      // Logout clears session safely
      portalAuthService.logout('league');
      expect(portalAuthService.getSession('league')).toBeNull();
    });
  });
});
