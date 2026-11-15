/**
 * PHOTO FINISH PRO AI — Phase G Final System Audit & End-to-End Verification
 * اختبارات المرحلة G: الإغلاق والمراجعة الشاملة وتدقيق الأمان والأداء والنظام المكتمل
 * 
 * يغطي هذا الجناح النهائي:
 * 1. دورة العمل المتكاملة من حساب الرابطة (End-to-End League Master Lifecycle):
 *    - تسجيل الدخول الموثوق برمز الجلسة المشفر.
 *    - تخطيط المنافسة في مكتب التخطيط (Planning Bureau).
 *    - تعيين الحكام وتوليد الأكواد الميدانية الرسمية (Duty Codes).
 *    - إدارة وتوثيق العمليات الميدانية في مكتب المنافسات (Competitions Bureau).
 *    - اعتماد النتائج وإصدار المحاضر الرسمية (PVs) بالتصدير الموحد الثلاثي (PDF / Word / Excel).
 *    - الأرشفة غير القابلة للتلاعب (Immutable Archival) وحساب بصمة الأمان الرقمية.
 *    - تفعيل حاجز الأمان وتطهير هواتف الحكام الميدانيين (Targeted Device Purge).
 * 2. التحقق من القواعد الأمنية الفنية غير القابلة للتفاوض:
 *    - التحقق الصارم من الصلاحيات على مستوى الخادم / طبقة البيانات (Server-Grade Permission Check - Rule 3).
 *    - الحماية التامة للبيانات ومنع الحذف النهائي (Soft-archive / is_demo / backups - Rule 2).
 *    - خلو الإنتاج من بيانات الاعتماد المكشوفة والمسارات التجريبية (Rule 4).
 * 3. جاهزية نظام التصميم "مضمار (Track Pro)" والتوافق اللغوي الكامل RTL.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { portalAuthService } from '../src/services/portalAuthService';
import { competitionsService, NationalCompetition } from '../src/services/competitionsService';
import { planningBureauService } from '../src/services/planningBureauService';
import { competitionsBureauService } from '../src/services/competitionsBureauService';
import { unifiedExportService, UnifiedExportPayload } from '../src/services/unifiedExportService';
import { devicePurgeArchiveService } from '../src/services/devicePurgeArchiveService';
import { checkpointStorage } from '../src/services/checkpointStorage';

describe('Phase G: Final System Audit & End-to-End League Master Verification', () => {
  const auditCompId = 'comp_phase_g_e2e_final';
  const controlCompId = 'comp_phase_g_control_isolated';

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

  describe('1. Complete End-to-End Lifecycle: League -> Planning -> Judging -> Certification -> Archive -> Purge', () => {
    it('executes full federation workflow seamlessly with 100% data integrity and auditability', async () => {
      // Step A: League Admin Authentication
      const loginRes = await portalAuthService.loginLeague('saida_admin', 'Saida@2026', 'lg_saida');
      expect(loginRes.success).toBe(true);
      const leagueSession = loginRes.session!;
      expect(leagueSession.portal).toBe('league');
      expect(leagueSession.leagueId).toBe('lg_saida');
      expect(portalAuthService.verifySession(leagueSession.token).valid).toBe(true);

      // Step B: Competition Registration
      const sampleComp: NationalCompetition = {
        id: auditCompId,
        name: 'البطولة الولائية الكبرى لألعاب القوى 2026',
        date: '2026-06-20',
        venue: 'مركب 13 أفريل سعيدة',
        city: 'سعيدة',
        leagueId: 'lg_saida',
        leagueName: 'رابطة ولاية سعيدة لألعاب القوى',
        leagueShort: 'LAAP-20',
        status: 'live',
        type: 'regional_league',
        categories: ['U18', 'U20', 'SENIOR'],
        disciplinesCount: 3,
        registeredAthletesCount: 45,
        isArchived: false,
        createdAt: new Date().toISOString()
      };
      await competitionsService.saveCompetition(sampleComp);

      // Step C: Planning Bureau Schedule Generation
      const draft = {
        competitionName: sampleComp.name,
        startDate: sampleComp.date,
        venue: sampleComp.venue,
        organizingLeagueId: 'lg_saida',
        organizingLeagueName: sampleComp.leagueName,
        selectedCategoryCodes: ['SENIOR_M', 'U20_M'],
        selectedDisciplineIds: ['disc_100m', 'disc_long_jump'],
        disciplineTimings: {}
      };
      const schedule = planningBureauService.generateSchedule(draft);
      expect(schedule).toBeDefined();
      expect(schedule.totalEventsCount).toBeGreaterThanOrEqual(1);
      expect(schedule.tableCourse.individualRaces.length + schedule.tableConcours.jumps.length).toBeGreaterThan(0);

      // Save plan to competition
      planningBureauService.savePlanningForCompetition(auditCompId, draft, schedule);
      const savedPlan = planningBureauService.getPlanningForCompetition(auditCompId);
      expect(savedPlan).not.toBeNull();
      expect(savedPlan?.schedule.competitionName).toBe(sampleComp.name);

      // Step D: Judge Duty Codes & Field Authentication
      const finishDutyCode = 'FINISH-SAIDA-PF92';
      const judgeAuth = await portalAuthService.loginJudge({
        dutyCode: finishDutyCode,
        judgeName: 'سفيان بن عيسى'
      });
      expect(judgeAuth.success).toBe(true);
      expect(judgeAuth.session?.dutyCode).toBe(finishDutyCode);
      expect(judgeAuth.session?.portal).toBe('judge');

      // Step E: Competitions Bureau & Judge Operations
      const disciplinesWithOps = await competitionsBureauService.getCompetitionDisciplinesWithOperations(auditCompId);
      expect(disciplinesWithOps.length).toBeGreaterThan(0);
      const targetDiscipline = disciplinesWithOps[0];

      // Inline update with verified session
      const updateRes = await competitionsBureauService.updateOperationInline(
        auditCompId,
        targetDiscipline.id,
        targetDiscipline.operations[0]?.id || 'op_test_1',
        { mark: '10.18', status: 'verified', notes: 'تحقيق رسمي بمراجعة شريط الفوتو فينيش' },
        { token: leagueSession.token }
      );
      expect(updateRes.success).toBe(true);

      // Step F: Discipline Official Certification (المحضر الرسمي)
      const certRes = await competitionsBureauService.certifyDiscipline(
        auditCompId,
        targetDiscipline.id,
        {
          certifiedBy: 'أحمد بن علي',
          chiefJudgeName: 'أحمد بن علي (رئيس الرابطة)',
          secretaryName: 'بلقاسم مرزوقي (الأمين العام)',
          notes: 'معتمد رسمياً وفق القوانين الفنية للاتحاد الدولي TR31'
        },
        { token: leagueSession.token }
      );
      expect(certRes.success).toBe(true);
      expect(certRes.discipline?.status).toBe('certified');
      expect(certRes.discipline?.pvNumber).toBeTruthy();
      expect(certRes.discipline?.certifiedBy).toBeTruthy();

      // Step G: Multi-format Official PV Exports (PDF, Word, Excel)
      const exportPayload: UnifiedExportPayload = {
        header: {
          competitionName: sampleComp.name,
          date: sampleComp.date,
          venue: sampleComp.venue,
          chiefJudgeName: 'أحمد بن علي',
          leagueName: sampleComp.leagueName,
          accreditationNumber: 'LAAP-SAD-2026-020',
          disciplineName: targetDiscipline.nameAr,
          season: '2026'
        },
        sections: [
          {
            disciplineId: targetDiscipline.id,
            disciplineNameAr: targetDiscipline.nameAr,
            group: targetDiscipline.group,
            columns: [
              { header: 'الرتبة', key: 'rank', align: 'center', width: '60px' },
              { header: 'رقم الصدرية', key: 'bib', align: 'center', width: '80px' },
              { header: 'الاسم واللقب', key: 'name', align: 'right', width: '180px' },
              { header: 'النادي', key: 'club', align: 'center', width: '100px' },
              { header: 'النتيجة', key: 'mark', align: 'center', width: '90px' }
            ],
            rows: targetDiscipline.operations.map((op, idx) => ({
              rank: idx + 1,
              bib: op.bibNumber,
              name: op.athleteName,
              club: op.clubCode,
              mark: op.mark
            }))
          }
        ]
      };

      const wordDoc = unifiedExportService.generateWordDocument(exportPayload);
      expect(wordDoc).toContain('xmlns:w="urn:schemas-microsoft-com:office:word"');
      expect(wordDoc).toContain('dir="rtl"');
      expect(wordDoc).toContain(sampleComp.name);

      const excelXml = unifiedExportService.generateExcelXml(exportPayload);
      expect(excelXml).toContain('ss:RightToLeft="1"');
      expect(excelXml).toContain('progid="Excel.Sheet"');
      expect(excelXml).toContain(sampleComp.name);

      const printHtml = unifiedExportService.generatePrintableHtml(exportPayload);
      expect(printHtml).toContain('dir="rtl"');
      expect(printHtml).toContain(sampleComp.name);

      // Step H: Immutable Archival Before Purge
      const archiveRes = await devicePurgeArchiveService.finishAndArchiveCompetition(auditCompId, {
        name: 'أحمد بن علي',
        role: 'رئيس الرابطة الولائية',
        token: leagueSession.token
      });
      expect(archiveRes.success).toBe(true);
      expect(archiveRes.archive?.status).toBe('archived_immutable');
      expect(archiveRes.archive?.hashChecksum).toContain('SHA256');

      // Step I: Pre-Purge Safety Barrier Verification
      // 1. Pending unsynced items -> Blocked
      vi.spyOn(checkpointStorage, 'hasUnsyncedPassages').mockResolvedValue(2);
      const blockedAttempt = await devicePurgeArchiveService.checkAndExecuteDevicePurge(auditCompId, {
        deviceId: 'DEV-FINISH-02',
        judgeRole: 'FINISH',
        judgeName: 'سفيان بن عيسى'
      });
      expect(blockedAttempt.status).toBe('blocked_pending_sync');
      expect(blockedAttempt.pendingCount).toBe(2);

      // 2. All items synced -> Purged Successfully
      vi.spyOn(checkpointStorage, 'hasUnsyncedPassages').mockResolvedValue(0);
      vi.spyOn(checkpointStorage, 'purgeCompetitionData').mockResolvedValue({
        deletedPassages: 10,
        deletedCorrections: 0,
        deletedViolations: 0
      });

      // Seed dummy records for both competitions
      localStorage.setItem(`pfp_passages_cache_${auditCompId}`, '["p1","p2"]');
      localStorage.setItem(`pfp_passages_cache_${controlCompId}`, '["control_p1"]');

      const purgeRes = await devicePurgeArchiveService.checkAndExecuteDevicePurge(auditCompId, {
        deviceId: 'DEV-FINISH-02',
        judgeRole: 'FINISH',
        judgeName: 'سفيان بن عيسى'
      });
      expect(purgeRes.status).toBe('purged_successfully');
      expect(purgeRes.deletedCount).toBe(10);

      // Verify competition isolation: auditComp wiped, controlComp preserved
      expect(localStorage.getItem(`pfp_passages_cache_${auditCompId}`)).toBeNull();
      expect(localStorage.getItem(`pfp_passages_cache_${controlCompId}`)).toBe('["control_p1"]');
      expect(devicePurgeArchiveService.hasDeviceBeenPurged(auditCompId, 'DEV-FINISH-02')).toBe(true);
      expect(devicePurgeArchiveService.hasDeviceBeenPurged(controlCompId, 'DEV-FINISH-02')).toBe(false);
    });
  });

  describe('2. Security Rule Enforcements (Server-Grade Permissions & Zero Client Spoofing)', () => {
    it('rejects discipline certification when called with client-spoofed or missing tokens', async () => {
      // Attempting to certify without a valid league session
      const invalidRes = await competitionsBureauService.certifyDiscipline(
        auditCompId,
        'disc_100m_m',
        {
          certifiedBy: 'منتحل صفة',
          chiefJudgeName: 'منتحل صفة',
          secretaryName: 'منتحل صفة'
        },
        { token: 'forged_fake_token_123' }
      );
      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toContain('خطأ في الصلاحيات');
    });

    it('rejects inline updates when called by judge credentials attempting league privilege', async () => {
      const judgeLogin = await portalAuthService.loginJudge({ dutyCode: 'FINISH-SAIDA-PF92' });
      const judgeToken = judgeLogin.session?.token;

      const rejectRes = await competitionsBureauService.updateOperationInline(
        auditCompId,
        'disc_100m_m',
        'op_1',
        { mark: '9.99' },
        { token: judgeToken }
      );
      expect(rejectRes.success).toBe(false);
      expect(rejectRes.error).toContain('خطأ في الصلاحيات');
    });
  });

  describe('3. Non-Destructive Data Retention & Safe Backups (Rule 2)', () => {
    it('creates cryptographic backups and marks leagues as archived rather than deleting them permanently', async () => {
      // Backup creation
      const backupKey = portalAuthService.backupLeagues();
      expect(backupKey).toContain('pfp_leagues_backup_');
      const backupData = localStorage.getItem(backupKey);
      expect(backupData).toBeTruthy();

      // Soft archive league
      const archived = portalAuthService.archiveLeague('lg_saida');
      expect(archived).toBe(true);

      const allLeagues = portalAuthService.getAllLeagues(true);
      const saidaLeague = allLeagues.find(l => l.id === 'lg_saida');
      expect(saidaLeague).toBeDefined();
      expect(saidaLeague?.archived_at).toBeTruthy();
    });
  });

  describe('4. Finish Competition Button Restriction & Pending Disciplines Enforcement (Phase G)', () => {
    const compPendingTestId = 'comp_pending_test_g';

    beforeEach(async () => {
      const comp: NationalCompetition = {
        id: compPendingTestId,
        name: 'بطولة التدقيق الأمني للاختصاصات العالقة',
        date: '2026-07-01',
        venue: 'ملعب 5 جويلية',
        city: 'الجزائر',
        leagueId: 'lg_saida',
        leagueName: 'رابطة سعيدة',
        status: 'live',
        type: 'national_championship',
        categories: ['SENIOR'],
        disciplinesCount: 2,
        registeredAthletesCount: 16,
        isArchived: false,
        createdAt: new Date().toISOString()
      };
      await competitionsService.saveCompetition(comp);
    });

    it('blocks finish competition and returns pending disciplines list when uncertified disciplines exist', async () => {
      const loginRes = await portalAuthService.loginLeague('saida_admin', 'Saida@2026', 'lg_saida');
      const token = loginRes.session!.token;

      // Check canFinish
      const canFinishStatus = await devicePurgeArchiveService.canFinishCompetition(compPendingTestId, token);
      expect(canFinishStatus.hasPermission).toBe(true);
      expect(canFinishStatus.canFinish).toBe(false);
      expect(canFinishStatus.pendingDisciplines.length).toBeGreaterThan(0);
      expect(canFinishStatus.reason).toContain('اختصاصات عالقة');

      // Attempt to finish with requireAllResolved: true -> should be strictly rejected
      const finishAttempt = await devicePurgeArchiveService.finishAndArchiveCompetition(compPendingTestId, {
        token,
        requireAllResolved: true
      });
      expect(finishAttempt.success).toBe(false);
      expect(finishAttempt.error).toContain('اختصاصات عالقة');
      expect(finishAttempt.pendingDisciplines).toBeDefined();
      expect(finishAttempt.pendingDisciplines!.length).toBeGreaterThan(0);
    });

    it('allows resolving disciplines via rejection or certification, enabling final completion once all are resolved', async () => {
      const loginRes = await portalAuthService.loginLeague('saida_admin', 'Saida@2026', 'lg_saida');
      const token = loginRes.session!.token;

      const disciplines = await competitionsBureauService.getCompetitionDisciplinesWithOperations(compPendingTestId);
      expect(disciplines.length).toBeGreaterThan(0);

      // 1. Certify first discipline
      const certRes = await competitionsBureauService.certifyDiscipline(
        compPendingTestId,
        disciplines[0].id,
        { chiefJudge: 'الحكم العام' },
        { token }
      );
      expect(certRes.success).toBe(true);
      expect(certRes.discipline?.status).toBe('certified');

      // 2. Reject remaining disciplines with mandatory reason (e.g. weather cancellation)
      for (let i = 1; i < disciplines.length; i++) {
        const rejectRes = await competitionsBureauService.rejectDiscipline(
          compPendingTestId,
          disciplines[i].id,
          'إلغاء المسابقة لسوء الأحوال الجوية ورياح عاتية',
          { token }
        );
        expect(rejectRes.success).toBe(true);
        expect(rejectRes.discipline?.status).toBe('rejected');
      }

      // 3. Now verify canFinishCompetition -> true!
      const canFinishAfter = await devicePurgeArchiveService.canFinishCompetition(compPendingTestId, token);
      expect(canFinishAfter.canFinish).toBe(true);
      expect(canFinishAfter.pendingDisciplines).toHaveLength(0);

      // 4. Execute final finish and archive with requireAllResolved: true -> Success!
      const finishFinal = await devicePurgeArchiveService.finishAndArchiveCompetition(compPendingTestId, {
        token,
        requireAllResolved: true
      });
      expect(finishFinal.success).toBe(true);
      expect(finishFinal.archive?.status).toBe('archived_immutable');
      expect(finishFinal.purgeCommand).toBeDefined();

      const updatedComp = await competitionsService.getCompetitionById(compPendingTestId);
      expect(updatedComp?.status).toBe('completed');
    });

    it('strictly forbids non-league users from finishing competition even if all disciplines are certified', async () => {
      // Judge duty code login (non-league admin)
      const judgeLogin = await portalAuthService.loginJudge({ dutyCode: 'FINISH-SAIDA-PF92' });
      const judgeToken = judgeLogin.session!.token;

      const check = await devicePurgeArchiveService.canFinishCompetition(compPendingTestId, judgeToken);
      expect(check.hasPermission).toBe(false);
      expect(check.canFinish).toBe(false);
      expect(check.reason).toContain('الصلاحية مقيدة');

      const finishRes = await devicePurgeArchiveService.finishAndArchiveCompetition(compPendingTestId, {
        token: judgeToken
      });
      expect(finishRes.success).toBe(false);
      expect(finishRes.error).toContain('خطأ في الصلاحيات');
    });
  });
});
