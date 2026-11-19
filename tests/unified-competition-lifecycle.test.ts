import { describe, it, expect, beforeEach } from 'vitest';
import { competitionsService, NationalCompetition, ScheduleEvent } from '../src/services/competitionsService';
import { competitionFileService } from '../src/services/competitionFileService';
import { judgesAssignmentService } from '../src/services/judgesAssignmentService';

// In-memory localStorage mock for node test runner
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); }
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageMock;
}

describe('Unified Competition Management & Real-time Lifecycle Suite', () => {
  beforeEach(() => {
    store.clear();
  });

  it('1. Syncs planned competition from Planning Bureau directly into unified competitionsService', async () => {
    const compId = 'comp_saida_2026_test1';
    
    // Simulate PlanningBureau saving a competition file
    const file = competitionFileService.synthesizeFromFileOrDraft(compId)!;
    file.metadata.name = 'البطولة الولائية الشتوية سعيدة 2026';
    file.metadata.venue = 'المركب الرياضي 13 أفريل، سعيدة';
    file.metadata.startDate = '2026-12-15';
    file.metadata.endDate = '2026-12-16';
    file.metadata.organizingLeagueId = 'lg_saida';
    file.metadata.organizingLeagueName = 'رابطة ألعاب القوى سعيدة';
    file.selectedCategoryCodes = ['SENIOR', 'U20'];
    file.selectedDisciplineIds = ['disc_100m', 'disc_longjump'];
    file.schedule = {
      competitionId: compId,
      allDisciplines: [
        {
          id: 'evt_100m_senior_m',
          disciplineId: 'disc_100m',
          disciplineNameAr: '100م رجال',
          categoryCode: 'SENIOR',
          gender: 'male',
          roundName: 'نهائي',
          startTime: '09:30',
          endTime: '09:45'
        },
        {
          id: 'evt_lj_senior_m',
          disciplineId: 'disc_longjump',
          disciplineNameAr: 'الوثب الطويل رجال',
          categoryCode: 'SENIOR',
          gender: 'male',
          roundName: 'نهائي',
          startTime: '10:00',
          endTime: '11:00'
        }
      ] as any,
      totalEventsCount: 2,
      conflicts: []
    };

    await competitionFileService.saveCompetitionFile(file, 'مسؤول التخطيط', 'اعتماد البرنامج الأولي');

    // Verify it automatically populated competitionsService!
    const savedComp = await competitionsService.getCompetitionById(compId);
    expect(savedComp).toBeDefined();
    expect(savedComp?.name).toBe('البطولة الولائية الشتوية سعيدة 2026');
    expect(savedComp?.leagueId).toBe('lg_saida');
    expect(savedComp?.schedule).toHaveLength(2);
    expect(savedComp?.schedule?.[0].disciplineName).toBe('100م رجال');
    expect(savedComp?.schedule?.[1].disciplineId).toBe('disc_longjump');
  });

  it('2. Enforces active league multi-tenancy and data isolation', async () => {
    // Competition 1 for Saida LWAS
    await competitionsService.saveCompetition({
      id: 'comp_saida_open',
      name: 'بطولة سعيدة المفتوحة',
      venue: 'سعيدة',
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      organizer: 'رابطة سعيدة',
      level: 'regional',
      status: 'active',
      leagueId: 'lg_saida'
    });

    // Competition 2 for Algiers
    await competitionsService.saveCompetition({
      id: 'comp_algiers_open',
      name: 'بطولة العاصمة الكبرى',
      venue: '5 جويلية',
      startDate: '2026-11-25',
      endDate: '2026-11-25',
      organizer: 'رابطة الجزائر',
      level: 'regional',
      status: 'active',
      leagueId: 'lg_algiers'
    });

    // When querying for Saida LWAS:
    const saidaComps = await competitionsService.getCompetitions('lg_saida');
    expect(saidaComps.some(c => c.id === 'comp_saida_open')).toBe(true);
    expect(saidaComps.some(c => c.id === 'comp_algiers_open')).toBe(false);

    // When querying for Algiers:
    const algiersComps = await competitionsService.getCompetitions('lg_algiers');
    expect(algiersComps.some(c => c.id === 'comp_algiers_open')).toBe(true);
    expect(algiersComps.some(c => c.id === 'comp_saida_open')).toBe(false);
  });

  it('3. Computes dynamic progress indicators across all lifecycle phases', () => {
    const comp: NationalCompetition = {
      id: 'comp_prog_test',
      name: 'منافسة تجريبية للمؤشرات',
      venue: 'سعيدة',
      date: '2026-12-01',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      organizer: 'رابطة سعيدة',
      level: 'regional',
      status: 'active',
      leagueId: 'lg_saida',
      disciplines: ['disc_100m', 'disc_200m'],
      categories: ['SENIOR'],
      schedule: [
        {
          id: 'evt_1',
          disciplineId: 'disc_100m',
          disciplineName: '100م مستوية',
          category: 'SENIOR',
          gender: 'M',
          round: 'نهائي',
          scheduledTime: '09:00',
          status: 'completed',
          assignedJudgesCount: 2
        }
      ]
    };

    const progress = competitionsService.computeCompetitionProgress(comp);
    expect(progress).toBeDefined();
    expect(progress.planning).toBe('completed');
    expect(progress.events).toBe('in_progress');
    expect(progress.overallPercentage).toBeGreaterThan(0);
  });

  it('4. Links judges assignments with leagueId, competitionId, and eventId', async () => {
    const compId = 'comp_saida_judges_test';
    const res = await judgesAssignmentService.assignJudge({
      competitionId: compId,
      leagueId: 'lg_saida',
      eventId: 'evt_100m_senior',
      judgeId: 'jdg_01',
      disciplineId: 'disc_100m',
      disciplineNameAr: '100م مستوية',
      venue: 'المضمار الرئيسي',
      task: 'starter',
      date: '2026-12-01',
      startTime: '09:00',
      endTime: '10:00'
    });

    expect(res.success).toBe(true);
    expect(res.assignment).toBeDefined();
    expect(res.assignment?.competitionId).toBe(compId);
    expect(res.assignment?.leagueId).toBe('lg_saida');
    expect(res.assignment?.eventId).toBe('evt_100m_senior');
    expect(res.assignment?.task).toBe('starter');
  });

  it('5. Safe archiving prevents hard deletion of competitions with active assignments or certified results', async () => {
    const compId = 'comp_protected_test';
    await competitionsService.saveCompetition({
      id: compId,
      name: 'منافسة ذات تعيينات رسمية',
      venue: 'سعيدة',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      organizer: 'رابطة سعيدة',
      level: 'regional',
      status: 'active',
      leagueId: 'lg_saida'
    });

    // Assign a judge to this competition
    const asgRes = await judgesAssignmentService.assignJudge({
      competitionId: compId,
      leagueId: 'lg_saida',
      judgeId: 'jdg_02',
      disciplineId: 'disc_longjump',
      disciplineNameAr: 'الوثب الطويل',
      venue: 'حفرة الوثب',
      task: 'chief_judge',
      date: '2026-12-01',
      startTime: '09:00',
      endTime: '11:00'
    });
    expect(asgRes.success).toBe(true);

    // Attempt deletion
    const delRes = await competitionsService.deleteCompetition(compId);
    expect(delRes.success).toBe(false);
    expect(delRes.error).toContain('حكام');

    // Archive instead
    const arcRes = await competitionsService.archiveCompetition(compId);
    expect(arcRes).toBe(true);
    const updated = await competitionsService.getCompetitionById(compId);
    expect(updated?.isArchived).toBe(true);
  });
});
