import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginTestLeague } from './helpers/leagueAuthHarness';
import { 
  competitionsBureauService, 
  BureauDisciplineWithOps 
} from '../src/services/competitionsBureauService';
import { portalAuthService } from '../src/services/portalAuthService';
import { unifiedExportService } from '../src/services/unifiedExportService';
import { competitionsService, NationalCompetition } from '../src/services/competitionsService';

describe('Phase E: Competitions Bureau & Certified Official Reports (المرحلة E)', () => {
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

    const listeners: Record<string, Function[]> = {};
    (globalThis as any).window = {
      addEventListener: (type: string, fn: any) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener: (type: string, fn: any) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter(f => f !== fn);
        }
      },
      dispatchEvent: (event: any) => {
        const list = listeners[event.type] || [];
        list.forEach(fn => fn(event));
        return true;
      }
    };

    portalAuthService.resetToDefaults();
    vi.restoreAllMocks();
  });

  const getSampleCompetition = (): NationalCompetition => ({
    id: 'comp_algiers_pro_2026',
    name: 'البطولة الوطنية الاحترافية لألعاب القوى',
    type: 'national_championship',
    date: '2026-06-25',
    venue: 'ملعب 5 جويلية الأولمبي',
    city: 'الجزائر العاصمة',
    leagueId: 'lg_saida',
    leagueName: 'رابطة ولاية الجزائر',
    status: 'live',
    categories: ['SENIOR_M', 'SENIOR_F'],
    disciplinesCount: 8,
    registeredAthletesCount: 140,
    isArchived: false,
    createdAt: '2026-01-01'
  });

  describe('1. Official Discipline Certification Lifecycle (Stage 5 / Phase E)', () => {
    it('should block certification if user session is invalid or unauthorized (Server Verification Rule 3)', async () => {
      // No active session
      const res = await competitionsBureauService.certifyDiscipline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        { chiefJudge: 'حكم عام غير مصرح' },
        { token: 'invalid_fake_token' }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('خطأ في الصلاحيات');
    });

    it('should successfully certify a discipline when authenticated as League Admin or Chief Judge', async () => {
      // Login as League Admin
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);
      const session = auth.session;

      const res = await competitionsBureauService.certifyDiscipline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        {
          chiefJudge: 'أحمد بن علي (الحكم العام)',
          timingJudge: 'محمد لمين (FAT Chief)',
          trackJudge: 'كريم بلحاج (Track Judge)'
        },
        { token: session?.token }
      );

      expect(res.success).toBe(true);
      expect(res.discipline).toBeDefined();
      expect(res.discipline?.status).toBe('certified');
      expect(res.discipline?.pvNumber).toBeDefined();
      expect(res.discipline?.pvNumber).toContain('PV-');
      expect(res.discipline?.chiefJudgeSignature).toBe('أحمد بن علي (الحكم العام)');
      expect(res.discipline?.timingJudgeSignature).toBe('محمد لمين (FAT Chief)');
      expect(res.discipline?.certifiedAt).toBeDefined();

      // Check tamper-evident audit trail entry
      const auditLog = competitionsBureauService.getAuditLog('comp_algiers_pro_2026', 'disc_100m_final');
      const certEntry = auditLog.find(e => e.operationId === 'cert_disc_100m_final');
      expect(certEntry).toBeDefined();
      expect(certEntry?.newValue).toBe('certified');
      expect(certEntry?.reason).toContain('المصادقة الرسمية');
    });

    it('should allow reopening a certified discipline only with valid admin authorization and reason', async () => {
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);
      const session = auth.session;

      // 1. First certify
      await competitionsBureauService.certifyDiscipline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        {},
        { token: session?.token }
      );

      // 2. Reopen with reason
      const reopenRes = await competitionsBureauService.reopenDiscipline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        'مراجعة توقيت الرواق الثالث بناءً على تقرير صورة خط النهاية',
        { token: session?.token }
      );

      expect(reopenRes.success).toBe(true);
      expect(reopenRes.discipline?.status).toBe('under_review');

      // Check audit log contains reopen reason
      const auditLog = competitionsBureauService.getAuditLog('comp_algiers_pro_2026', 'disc_100m_final');
      const reopenEntry = auditLog.find(e => e.operationId === 'reopen_disc_100m_final');
      expect(reopenEntry).toBeDefined();
      expect(reopenEntry?.oldValue).toBe('certified');
      expect(reopenEntry?.newValue).toBe('under_review');
      expect(reopenEntry?.reason).toContain('مراجعة توقيت الرواق الثالث');
    });
  });

  describe('2. Inline Editing & Server Permission Control', () => {
    it('should reject inline cell update when rank or bib is invalid', async () => {
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);
      const session = auth.session;

      const res = await competitionsBureauService.updateOperationInline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        'op_100m_1',
        { rank: -5 },
        { token: session?.token }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('الرتبة يجب أن تكون رقماً موجباً');
    });

    it('should successfully update cell inline and log change in audit trail', async () => {
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);
      const session = auth.session;

      const res = await competitionsBureauService.updateOperationInline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        'op_100m_1',
        { mark: '09.94s', reactionTime: '0.132s' },
        { token: session?.token },
        'تصحيح رسمي من غرفة قراءة الصور'
      );

      expect(res.success).toBe(true);
      expect(res.updatedOperation?.mark).toBe('09.94s');
      expect(res.updatedOperation?.reactionTime).toBe('0.132s');
      expect(res.updatedOperation?.auditTrail.length).toBeGreaterThan(0);
      expect(res.updatedOperation?.auditTrail[0].reason).toContain('تصحيح رسمي');
    });
  });

  describe('3. Certified Official Multi-Format Export Adapter (PDF, Word, Excel)', () => {
    it('should trigger PDF export with official federation header and certification protocol number', async () => {
      const pdfSpy = vi.spyOn(unifiedExportService, 'exportToPdf').mockImplementation(() => {});

      const comp = getSampleCompetition();
      const disciplines = await competitionsBureauService.getCompetitionDisciplinesWithOperations(comp.id);
      const targetDisc = disciplines[0];
      targetDisc.status = 'certified';
      targetDisc.pvNumber = 'PV-ALGIERS-100M-001';

      competitionsBureauService.exportOfficialDisciplinePV(comp, targetDisc, 'pdf', {
        chiefJudge: 'الحكم العام الفيدرالي',
        timingJudge: 'رئيس قضاة الميقاتية'
      });

      expect(pdfSpy).toHaveBeenCalledTimes(1);
      const payload = pdfSpy.mock.calls[0][0];
      expect(payload.header.disciplineName).toContain('100 متر');
      expect(payload.header.disciplineName).toContain('PV-ALGIERS-100M-001');
      expect(payload.header.chiefJudgeName).toBe('الحكم العام الفيدرالي');
      expect(payload.sections.length).toBe(1);
      expect(payload.sections[0].rows.length).toBeGreaterThan(0);
    });

    it('should trigger Word (.docx) export with valid section structure and signatures', async () => {
      const wordSpy = vi.spyOn(unifiedExportService, 'exportToWord').mockImplementation(() => {});

      const comp = getSampleCompetition();
      const disciplines = await competitionsBureauService.getCompetitionDisciplinesWithOperations(comp.id);
      const targetDisc = disciplines[0];

      competitionsBureauService.exportOfficialDisciplinePV(comp, targetDisc, 'word');

      expect(wordSpy).toHaveBeenCalledTimes(1);
      const payload = wordSpy.mock.calls[0][0];
      expect(payload.sections[0].columns.some(c => c.key === 'mark')).toBe(true);
      expect(payload.sections[0].columns.some(c => c.key === 'rank')).toBe(true);
    });

    it('should trigger Excel (.xlsx) export with native RTL direction', async () => {
      const excelSpy = vi.spyOn(unifiedExportService, 'exportToExcel').mockImplementation(() => {});

      const comp = getSampleCompetition();
      const disciplines = await competitionsBureauService.getCompetitionDisciplinesWithOperations(comp.id);
      const targetDisc = disciplines[0];

      competitionsBureauService.exportOfficialDisciplinePV(comp, targetDisc, 'excel');

      expect(excelSpy).toHaveBeenCalledTimes(1);
      const payload = excelSpy.mock.calls[0][0];
      expect(payload.header.competitionName).toBe(comp.name);
      expect(payload.sections[0].rows.length).toBeGreaterThan(0);
    });
  });

  describe('4. Track Pro Design System & UI Integration', () => {
    it('should preserve discipline certification state across retrieval cycles', async () => {
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);
      const session = auth.session;

      // Certify long jump
      await competitionsBureauService.certifyDiscipline(
        'comp_algiers_pro_2026',
        'disc_long_jump_final',
        { chiefJudge: 'حكم الميدان الرئيسي' },
        { token: session?.token }
      );

      // Reload disciplines
      const reloaded = await competitionsBureauService.getCompetitionDisciplinesWithOperations('comp_algiers_pro_2026');
      const longJump = reloaded.find(d => d.id === 'disc_long_jump_final');

      expect(longJump).toBeDefined();
      expect(longJump?.status).toBe('certified');
      expect(longJump?.pvNumber).toBeDefined();
      expect(longJump?.chiefJudgeSignature).toBe('حكم الميدان الرئيسي');
    });
  });

  describe('5. Operation Lifecycle Status Transitions & Locking Integrity (Phase E)', () => {
    it('should block lifecycle status updates from unauthenticated callers', async () => {
      const res = await competitionsBureauService.updateOperationLifecycleStatus(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        'op_100m_1',
        'certified',
        { token: 'bad_token' }
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('خطأ في الصلاحيات');
    });

    it('should require a mandatory legal/technical reason when rejecting an operation', async () => {
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);

      const res = await competitionsBureauService.updateOperationLifecycleStatus(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        'op_100m_1',
        'rejected',
        { token: auth.session?.token },
        '' // Empty reason
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('يجب ذكر سبب');
    });

    it('should successfully transition status to rejected with WA rule citation and track transition', async () => {
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);

      const reason = 'استبعاد لارتكاب انطلاقة خاطئة WA TR 16.8';
      const res = await competitionsBureauService.updateOperationLifecycleStatus(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        'op_100m_1',
        'rejected',
        { token: auth.session?.token },
        reason
      );
      expect(res.success).toBe(true);
      expect(res.updatedOperation?.lifecycleStatus).toBe('rejected');
      expect(res.updatedOperation?.rejectionReason).toBe(reason);
      expect(res.updatedOperation?.stateTransitions?.[0].toState).toBe('rejected');
      expect(res.updatedOperation?.stateTransitions?.[0].reason).toContain('TR 16.8');
    });

    it('should prevent inline editing when discipline is certified and locked', async () => {
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);

      // Certify discipline
      const certRes = await competitionsBureauService.certifyDiscipline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        {},
        { token: auth.session?.token }
      );
      expect(certRes.success).toBe(true);
      expect(certRes.discipline?.isLocked).toBe(true);

      // Attempt to edit operation inline while locked
      const editRes = await competitionsBureauService.updateOperationInline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        'op_100m_1',
        { mark: '09.80s' },
        { token: auth.session?.token }
      );
      expect(editRes.success).toBe(false);
      expect(editRes.error).toContain('مقفل');
    });

    it('should increment revision when re-certifying a reopened discipline', async () => {
      const auth = await loginTestLeague();
      expect(auth.success).toBe(true);

      // First certification
      const cert1 = await competitionsBureauService.certifyDiscipline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        {},
        { token: auth.session?.token }
      );
      const initialRev = cert1.discipline?.revision || 1;

      // Reopen
      await competitionsBureauService.reopenDiscipline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        'إعادة فتح للتدقيق بعد مراجعة تقرير صورة خط النهاية',
        { token: auth.session?.token }
      );

      // Re-certify -> incremented revision
      const cert2 = await competitionsBureauService.certifyDiscipline(
        'comp_algiers_pro_2026',
        'disc_100m_final',
        {},
        { token: auth.session?.token }
      );
      expect(cert2.discipline?.revision).toBe(initialRev + 1);
      expect(cert2.discipline?.pvNumber).toBeDefined();
    });
  });

  describe('6. Realtime Judge Passages Broadcasting (Phase E)', () => {
    it('should register listener and receive simulated judge entries', () => {
      let receivedOp: any = null;
      let receivedDiscId: string | null = null;

      const unsub = competitionsBureauService.listenToRealtimeJudgePassages(
        'comp_algiers_pro_2026',
        (op, discId) => {
          receivedOp = op;
          receivedDiscId = discId;
        }
      );

      // Dispatch simulated custom event
      const eventPayload = {
        type: 'pfp:judge-entry',
        detail: {
          competitionId: 'comp_algiers_pro_2026',
          disciplineId: 'disc_100m_final',
          athleteName: 'سليم بن عيسى',
          bibNumber: 42,
          mark: '10.24s',
          judgeName: 'حكم الميقاتية الميداني'
        }
      };
      (globalThis as any).window.dispatchEvent(
        typeof CustomEvent !== 'undefined' 
          ? new CustomEvent('pfp:judge-entry', { detail: eventPayload.detail }) 
          : eventPayload
      );

      expect(receivedOp).toBeDefined();
      expect(receivedOp.athleteName).toBe('سليم بن عيسى');
      expect(receivedOp.bibNumber).toBe(42);
      expect(receivedOp.mark).toBe('10.24s');
      expect(receivedOp.lifecycleStatus).toBe('received');
      expect(receivedDiscId).toBe('disc_100m_final');

      unsub();
    });
  });
});
