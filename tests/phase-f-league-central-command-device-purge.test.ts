/**
 * PHOTO FINISH PRO AI — Phase F Test Suite
 * اختبارات المرحلة F: حساب الرابطة كمركز إدارة شامل ومسح هواتف الحكام الميدانيين
 * 
 * يغطي هذا الجناح:
 * 1. توليد أكواد التكليف الميداني الرسمية (Cryptographic Duty Codes) وتسجيل الدخول الموثوق.
 * 2. الأرشفة غير القابلة للتلاعب (Server-Grade Immutable Archive) قبل المسح.
 * 3. حاجز الأمان قبل المسح (Pre-Purge Safety Barrier): منع مسح الهواتف عند وجود عمليات معلقة.
 * 4. أمر المسح الموجه وتطهير هواتف الحكام (Targeted Device Purge) مع عزل المنافسات (Isolation Guarantee).
 * 5. سجل تدقيق المسح غير القابل للتلاعب (Device Purge Audit Logs) والمراقبة الفورية.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginTestLeague } from './helpers/leagueAuthHarness';
import { portalAuthService } from '../src/services/portalAuthService';
import { competitionsService } from '../src/services/competitionsService';
import { devicePurgeArchiveService } from '../src/services/devicePurgeArchiveService';
import { checkpointStorage } from '../src/services/checkpointStorage';
import { competitionsBureauService } from '../src/services/competitionsBureauService';

describe('Phase F: League Central Command & Targeted Device Purge', () => {
  const targetCompId = 'comp_phase_f_test_100';
  const otherCompId = 'comp_phase_f_other_200';

  beforeEach(async () => {
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
    devicePurgeArchiveService.resetServiceState();
    vi.restoreAllMocks();
  });

  describe('1. League Central Command: Official Duty Codes & Judge Authentication', () => {
    it('authenticates judges correctly using official prefix duty codes', async () => {
      // 1. Finish line camera duty code
      const finishResult = await portalAuthService.loginJudge({
        dutyCode: 'FINISH-SAIDA-PF92'
      });
      expect(finishResult.success).toBe(true);
      expect(finishResult.session).toBeDefined();
      expect(finishResult.session?.dutyCode).toBe('FINISH-SAIDA-PF92');
      expect(finishResult.session?.portal).toBe('judge');

      // 2. Chief judge duty code
      const chiefResult = await portalAuthService.loginJudge({
        dutyCode: 'CHIEF-SAIDA-ZQ88'
      });
      expect(chiefResult.success).toBe(true);
      expect(chiefResult.session?.role).toBe('chief_judge');
      expect(chiefResult.session?.dutyCode).toBe('CHIEF-SAIDA-ZQ88');

      // 3. Starter gun duty code
      const startResult = await portalAuthService.loginJudge({
        dutyCode: 'START-SAIDA-ST01'
      });
      expect(startResult.success).toBe(true);
      expect(startResult.session?.dutyCode).toBe('START-SAIDA-ST01');

      // 4. Call room duty code
      const callResult = await portalAuthService.loginJudge({
        dutyCode: 'CALL-SAIDA-CR14'
      });
      expect(callResult.success).toBe(true);
      expect(callResult.session?.dutyCode).toBe('CALL-SAIDA-CR14');
    });

    it('enforces single active session and stores cryptographic token', async () => {
      const loginRes = await portalAuthService.loginJudge({
        dutyCode: 'FINISH-SAIDA-PF92',
        judgeName: 'سفيان بن عيسى'
      });
      expect(loginRes.success).toBe(true);
      expect(loginRes.session?.token).toBeTruthy();

      const activeSession = portalAuthService.getSession('judge');
      expect(activeSession).not.toBeNull();
      expect(activeSession?.dutyCode).toBe('FINISH-SAIDA-PF92');
      expect(activeSession?.username).toBe('FINISH-SAIDA-PF92');
      expect(activeSession?.fullName).toContain('FINISH-SAIDA-PF92');
    });
  });

  describe('2. Immutable Competition Archival Before Purge', () => {
    it('creates an immutable server-grade archive record when authenticated with league permissions', async () => {
      // 1. Authenticate league admin to get trusted session token
      const leagueLogin = await loginTestLeague();
      expect(leagueLogin.success).toBe(true);
      const token = leagueLogin.session?.token;

      // Setup mock competition in competitionsService
      await competitionsService.saveCompetition({
        id: targetCompId,
        name: 'بطولة كأس الرابطة الممتازة',
        date: '2026-07-20',
        venue: 'ملعب 13 أفريل سعيدة',
        city: 'سعيدة',
        leagueId: 'lg_saida',
        leagueName: 'رابطة ولاية سعيدة',
        leagueShort: 'LAAP-20',
        status: 'live',
        type: 'regional_league',
        categories: ['SENIOR'],
        disciplinesCount: 1,
        registeredAthletesCount: 1,
        isArchived: false,
        createdAt: new Date().toISOString()
      });

      // Initialize bureau operations for competition
      await competitionsBureauService.getCompetitionDisciplinesWithOperations(targetCompId);

      // Execute official archive and close with valid league token
      const archiveResult = await devicePurgeArchiveService.finishAndArchiveCompetition(targetCompId, {
        name: 'أحمد بن علي',
        role: 'رئيس الرابطة الولائية',
        userId: 'usr_president',
        token
      });

      expect(archiveResult.success).toBe(true);
      expect(archiveResult.archive).toBeDefined();
      expect(archiveResult.archive?.status).toBe('archived_immutable');
      expect(archiveResult.archive?.competitionId).toBe(targetCompId);
      expect(archiveResult.archive?.totalDisciplines).toBeGreaterThanOrEqual(1);
      expect(archiveResult.archive?.hashChecksum).toBeTruthy();
      expect(archiveResult.purgeCommand).toBeDefined();
      expect(archiveResult.purgeCommand?.competitionId).toBe(targetCompId);

      // Verify competition status updated to completed
      const comps = await competitionsService.getCompetitions();
      const updatedComp = comps.find(c => c.id === targetCompId);
      expect(updatedComp?.status).toBe('completed');
    });

    it('strictly rejects competition finish and archival if caller lacks league authority (Rule 3 check)', async () => {
      // Login as normal club coach without league credentials
      const judgeLogin = await portalAuthService.loginJudge({
        dutyCode: 'FINISH-SAIDA-PF92'
      });
      const judgeToken = judgeLogin.session?.token;

      const rejectResult = await devicePurgeArchiveService.finishAndArchiveCompetition(targetCompId, {
        name: 'حكم عادي',
        token: judgeToken
      });

      expect(rejectResult.success).toBe(false);
      expect(rejectResult.error).toContain('خطأ في الصلاحيات');
      expect(rejectResult.archive).toBeUndefined();
    });
  });

  describe('3. Pre-Purge Safety Barrier (حاجز أمان العمليات المعلقة)', () => {
    it('strictly blocks device purge when unsynced operations remain in the queue', async () => {
      // Mock pending passages in checkpointStorage
      vi.spyOn(checkpointStorage, 'hasUnsyncedPassages').mockResolvedValue(3);

      const purgeAttempt = await devicePurgeArchiveService.checkAndExecuteDevicePurge(targetCompId, {
        deviceId: 'DEV-FINISH-02',
        judgeId: 'jd_2',
        judgeRole: 'FINISH',
        judgeName: 'سفيان بن عيسى'
      });

      // Purge must be rejected immediately with zero data loss
      expect(purgeAttempt.status).toBe('blocked_pending_sync');
      expect(purgeAttempt.deletedCount).toBe(0);
      expect(purgeAttempt.pendingCount).toBe(3);
      expect(purgeAttempt.message).toContain('تم منع مسح بيانات الجهاز');

      // Verify audit log entry is recorded as blocked
      const logs = devicePurgeArchiveService.getPurgeLogs();
      const blockedLog = logs.find(l => l.deviceId === 'DEV-FINISH-02' && l.status === 'blocked_pending_sync');
      expect(blockedLog).toBeDefined();
      expect(blockedLog?.pendingItemsCount).toBe(3);
    });
  });

  describe('4. Targeted Device Purge & Competition Isolation', () => {
    it('purges data for the target competition only and preserves other competitions', async () => {
      // Guarantee zero pending sync items
      vi.spyOn(checkpointStorage, 'hasUnsyncedPassages').mockResolvedValue(0);

      // Mock purgeCompetitionData on storage
      const purgeSpy = vi.spyOn(checkpointStorage, 'purgeCompetitionData').mockResolvedValue({
        deletedPassages: 14,
        deletedCorrections: 0,
        deletedViolations: 0
      });

      // Seed local storage keys for both competitions
      localStorage.setItem(`pfp_competitions_bureau_ops_v1_${targetCompId}`, JSON.stringify([{ id: 'op1' }]));
      localStorage.setItem(`pfp_passages_cache_${targetCompId}`, JSON.stringify([{ id: 'pass1' }]));
      localStorage.setItem(`pfp_competitions_bureau_ops_v1_${otherCompId}`, JSON.stringify([{ id: 'op_other' }]));
      localStorage.setItem(`pfp_passages_cache_${otherCompId}`, JSON.stringify([{ id: 'pass_other' }]));

      // Execute targeted purge
      const purgeResult = await devicePurgeArchiveService.checkAndExecuteDevicePurge(targetCompId, {
        deviceId: 'DEV-FINISH-02',
        judgeId: 'jd_2',
        judgeRole: 'FINISH',
        judgeName: 'سفيان بن عيسى'
      });

      expect(purgeResult.status).toBe('purged_successfully');
      expect(purgeResult.deletedCount).toBe(14);
      expect(purgeResult.pendingCount).toBe(0);
      expect(purgeSpy).toHaveBeenCalledWith(targetCompId);

      // Verify targeted competition storage is wiped
      expect(localStorage.getItem(`pfp_competitions_bureau_ops_v1_${targetCompId}`)).toBeNull();
      expect(localStorage.getItem(`pfp_passages_cache_${targetCompId}`)).toBeNull();

      // Verify other competition storage is 100% preserved
      expect(localStorage.getItem(`pfp_competitions_bureau_ops_v1_${otherCompId}`)).not.toBeNull();
      expect(localStorage.getItem(`pfp_passages_cache_${otherCompId}`)).not.toBeNull();

      // Verify device registry stamp
      expect(devicePurgeArchiveService.hasDeviceBeenPurged(targetCompId, 'DEV-FINISH-02')).toBe(true);
      expect(devicePurgeArchiveService.hasDeviceBeenPurged(otherCompId, 'DEV-FINISH-02')).toBe(false);
    });
  });

  describe('5. Device Purge Audit Trail & Realtime Listener', () => {
    it('notifies subscribers in real-time when a device purge event occurs', async () => {
      vi.spyOn(checkpointStorage, 'hasUnsyncedPassages').mockResolvedValue(0);
      vi.spyOn(checkpointStorage, 'purgeCompetitionData').mockResolvedValue({
        deletedPassages: 5,
        deletedCorrections: 0,
        deletedViolations: 0
      });

      const auditEventMock = vi.fn();
      const unsubscribe = devicePurgeArchiveService.onDevicePurgeLog(auditEventMock);

      await devicePurgeArchiveService.checkAndExecuteDevicePurge(targetCompId, {
        deviceId: 'DEV-START-03',
        judgeId: 'jd_3',
        judgeRole: 'START',
        judgeName: 'محمد بوشيخي'
      });

      expect(auditEventMock).toHaveBeenCalledTimes(1);
      const payload = auditEventMock.mock.calls[0][0];
      expect(payload.deviceId).toBe('DEV-START-03');
      expect(payload.status).toBe('purged_successfully');
      expect(payload.judgeRole).toBe('START');

      unsubscribe();
    });
  });
});
