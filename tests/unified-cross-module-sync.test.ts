import { describe, it, expect, beforeEach } from 'vitest';
import { competitionsService, NationalCompetition } from '../src/services/competitionsService';
import { judgesAssignmentService, JudgeAssignment } from '../src/services/judgesAssignmentService';
import { athleteClubStorage } from '../src/services/athleteClubStorage';
import { recycleBinService } from '../src/services/recycleBinService';
import { competitionsBureauService } from '../src/services/competitionsBureauService';

describe('Unified Cross-Module Synchronization & Complete Delete Architecture', () => {
  const TEST_LEAGUE_ID = 'lg_saida';
  const OTHER_LEAGUE_ID = 'lg_oran';

  beforeEach(async () => {
    // Reset/empty recycle bin for clean test state
    await recycleBinService.emptyRecycleBin(TEST_LEAGUE_ID);
    await recycleBinService.emptyRecycleBin(OTHER_LEAGUE_ID);
  });

  // ── 1. SINGLE SOURCE OF TRUTH & COMPETITION LIFECYCLE ──
  it('creates competition once and makes it available across all modules', async () => {
    const newCompData: Partial<NationalCompetition> = {
      name: 'بطولة كأس ولاية سعيدة الشتوية 2026',
      venue: 'مضمار 13 أفريل 1958، سعيدة',
      date: '2026-12-15',
      leagueId: TEST_LEAGUE_ID,
      leagueName: 'رابطة ألعاب القوى سعيدة (LWAS)',
      leagueShort: 'LWAS',
      competitionType: 'track_and_field'
    };

    const created = await competitionsService.createCompetition(newCompData);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('بطولة كأس ولاية سعيدة الشتوية 2026');

    // Available in getCompetitions scoped by league
    const leagueComps = await competitionsService.getCompetitions(TEST_LEAGUE_ID);
    const found = leagueComps.find(c => c.id === created.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('بطولة كأس ولاية سعيدة الشتوية 2026');

    // Available via getCompetitionById
    const byId = await competitionsService.getCompetitionById(created.id);
    expect(byId).toBeDefined();
    expect(byId?.id).toBe(created.id);

    // Automatically set as active competition for the league
    const active = await competitionsService.getActiveCompetition(TEST_LEAGUE_ID);
    expect(active?.id).toBe(created.id);
  });

  // ── 2. ACTIVE COMPETITION SYSTEM & MULTI-TENANT ISOLATION ──
  it('manages independent active competition per league without leakage', async () => {
    const saidaComp = await competitionsService.createCompetition({
      name: 'منافسة سعيدة التجريبية',
      leagueId: TEST_LEAGUE_ID,
      leagueShort: 'LWAS'
    });

    const oranComp = await competitionsService.createCompetition({
      name: 'منافسة وهران التجريبية',
      leagueId: OTHER_LEAGUE_ID,
      leagueShort: 'LWAO'
    });

    await competitionsService.setActiveCompetitionId(saidaComp.id, TEST_LEAGUE_ID);
    await competitionsService.setActiveCompetitionId(oranComp.id, OTHER_LEAGUE_ID);

    const saidaActive = await competitionsService.getActiveCompetition(TEST_LEAGUE_ID);
    const oranActive = await competitionsService.getActiveCompetition(OTHER_LEAGUE_ID);

    expect(saidaActive?.id).toBe(saidaComp.id);
    expect(oranActive?.id).toBe(oranComp.id);
    expect(saidaActive?.id).not.toBe(oranActive?.id);

    // Multi-tenant isolation filter: Saida comps list should not include Oran comp
    const saidaList = await competitionsService.getCompetitions(TEST_LEAGUE_ID);
    expect(saidaList.some(c => c.id === oranComp.id)).toBe(false);
  });

  // ── 3. JUDGE ASSIGNMENTS & CONFLICT DETECTION ──
  it('assigns judges to active competition and prevents conflict overlap', async () => {
    const comp = await competitionsService.createCompetition({
      name: 'منافسة اختبار الحكام',
      leagueId: TEST_LEAGUE_ID
    });

    const res1 = await judgesAssignmentService.assignJudge({
      competitionId: comp.id,
      leagueId: TEST_LEAGUE_ID,
      judgeId: 'jdg_03',
      disciplineId: 'disc_100m_m',
      disciplineNameAr: '100م نهائي رجال',
      venue: 'مضمار 13 أفريل 1958، سعيدة',
      task: 'chief_finish',
      date: '2026-06-01',
      startTime: '09:00',
      endTime: '10:00'
    });

    expect(res1.success).toBe(true);
    expect(res1.assignment?.id).toBeDefined();

    // Conflicting assignment check: same judge at overlapping time
    const conflictValidation = judgesAssignmentService.checkAssignmentConflicts(
      'jdg_03',
      comp.id,
      '2026-06-01',
      '09:15',
      '10:15',
      'مضمار 13 أفريل 1958، سعيدة',
      'disc_long_jump'
    );
    expect(conflictValidation.hasConflict).toBe(true);
    expect(conflictValidation.conflicts.length).toBeGreaterThan(0);
    expect(conflictValidation.conflicts[0].type).toBe('time_overlap');
  });

  // ── 4. COMPLETE RECYCLE BIN & SOFT DELETE LIFECYCLE ──
  it('soft deletes competition to central recycle bin with zero loss and allows restore', async () => {
    const comp = await competitionsService.createCompetition({
      name: 'منافسة الحذف والاسترجاع',
      leagueId: TEST_LEAGUE_ID
    });

    // 1. Soft delete
    const deleteRes = await competitionsService.deleteCompetition(comp.id, {
      reason: 'إلغاء المنافسة لأسباب تنظيمية',
      deletedBy: 'المشرف العام'
    });
    expect(deleteRes.success).toBe(true);

    // 2. Verified in Recycle Bin
    const binItems = await recycleBinService.listDeletedItems(TEST_LEAGUE_ID, 'competition');
    const inBin = binItems.find(item => item.entityId === comp.id);
    expect(inBin).toBeDefined();
    expect(inBin?.entityName).toBe('منافسة الحذف والاسترجاع');
    expect(inBin?.reason).toBe('إلغاء المنافسة لأسباب تنظيمية');

    // 3. Not in active competitions list
    const activeList = await competitionsService.getCompetitions(TEST_LEAGUE_ID);
    expect(activeList.some(c => c.id === comp.id)).toBe(false);

    // 4. Restore from Recycle Bin
    const restoreRes = await recycleBinService.restoreItem(inBin!.id);
    expect(restoreRes.success).toBe(true);

    // 5. Restored in active competitions
    const restoredList = await competitionsService.getCompetitions(TEST_LEAGUE_ID);
    expect(restoredList.some(c => c.id === comp.id)).toBe(true);
  });

  // ── 5. OFFICIAL CERTIFIED RESULTS PROTECTION ──
  it('protects certified results from accidental deletion without official override', async () => {
    const compId = 'comp_certified_test';
    const discId = 'disc_100m_final';
    const opId = 'op_certified_01';

    // Seed an approved certified operation
    const disc = await competitionsBureauService.getDisciplineWithOps(compId, discId);
    const mockApprovedOp: any = {
      id: opId,
      judgeRole: 'chief_photo_finish',
      judgeName: 'الحكم العام',
      timestamp: Date.now(),
      status: 'approved',
      lifecycleStatus: 'certified',
      athleteName: 'توفيق مخلوفي',
      mark: '1:42.61',
      rank: 1,
      resultsCount: 8,
      isCertified: true,
      certifiedBy: 'رئيس لجنة التحكيم',
      certifiedAt: new Date().toISOString(),
      auditTrail: []
    };
    disc.operations.push(mockApprovedOp);

    // Attempt to delete without official override should fail
    const attempt1 = await competitionsBureauService.softDeleteOperation(
      compId,
      discId,
      opId,
      {
        reason: 'تعديل عادي',
        officialOverride: false,
        deletedBy: 'مساعد تحكيم'
      }
    );

    expect(attempt1.success).toBe(false);
    expect(attempt1.error).toContain('معتمدة رسمياً');

    // Attempt with official override and documented reason succeeds
    const attempt2 = await competitionsBureauService.softDeleteOperation(
      compId,
      discId,
      opId,
      {
        reason: 'قرار استئناف رسمي صادر عن لجنة الاستئناف رقم 12/2026',
        officialOverride: true,
        deletedBy: 'رئيس لجنة الاستئناف'
      }
    );

    expect(attempt2.success).toBe(true);
  });
});
