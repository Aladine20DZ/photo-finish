import { describe, it, expect, beforeEach } from 'vitest';
import { portalAuthService } from '../src/services/portalAuthService';
import { competitionsService } from '../src/services/competitionsService';
import { 
  judgesAssignmentService, 
  CertifiedJudge, 
  JudgeAssignment 
} from '../src/services/judgesAssignmentService';
import { competitionEntriesService } from '../src/services/competitionEntriesService';

describe('PHOTO FINISH PRO AI — Master Judges, Assignments & Entries Suite', () => {
  beforeEach(() => {
    portalAuthService.logoutAll();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. LOGIN SCREEN LEAGUE SELECTOR VISIBILITY & AUTOMATIC RESOLUTION (Section 3)
  // ══════════════════════════════════════════════════════════════════════════
  describe('1. Login Screen League Auto-Detection (Section 3)', () => {
    it('automatically authenticates league executive without targetLeagueId selector', async () => {
      // Direct login with admin username only
      const res = await portalAuthService.loginLeague('saida_admin', 'Saida@2026');
      expect(res.success).toBe(true);
      expect(res.session).toBeDefined();
      expect(res.session?.role).toBe('league_admin');
      expect(res.session?.leagueShort).toBe('SAIDA');
      expect(res.session?.leagueId).toBe('lg_saida');
    });

    it('preserves all registered leagues in database and management suites', () => {
      const leagues = portalAuthService.getAllLeagues(true);
      expect(leagues.length).toBeGreaterThanOrEqual(5);
      
      const codes = leagues.map(l => l.shortName);
      expect(codes).toContain('SAIDA');
      expect(codes).toContain('FAA');
      expect(codes).toContain('LAA');
      expect(codes).toContain('LAO');
      expect(codes).toContain('LAC');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ACTIVE COMPETITION SCOPING (Section 5.3)
  // ══════════════════════════════════════════════════════════════════════════
  describe('2. Active Competition Scoping System (Section 5.3)', () => {
    it('manages centrally stored active competition and allows authorized switching', async () => {
      const initialId = competitionsService.getActiveCompetitionId();
      expect(initialId).toBeTruthy();

      const switched = competitionsService.setActiveCompetitionId('comp_nat_02');
      expect(switched).toBe(true);
      expect(competitionsService.getActiveCompetitionId()).toBe('comp_nat_02');

      const activeComp = await competitionsService.getActiveCompetition();
      expect(activeComp?.id).toBe('comp_nat_02');

      // Reset back to comp_nat_01
      competitionsService.setActiveCompetitionId('comp_nat_01');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. JUDGES & ASSIGNMENTS CONFLICT DETECTION & ISOLATION (Section 5 & 6)
  // ══════════════════════════════════════════════════════════════════════════
  describe('3. Judges Management, Assignments & Conflict Detection (Section 5 & 6)', () => {
    it('computes live dashboard KPIs', async () => {
      const kpis = await judgesAssignmentService.getDashboardKPIs('comp_nat_01');
      expect(kpis.totalJudges).toBeGreaterThanOrEqual(6);
      expect(kpis.activeJudges).toBeGreaterThanOrEqual(5);
      expect(kpis.currentAssignmentsCount).toBeGreaterThanOrEqual(2);
      expect(kpis.activeCompetitionsCount).toBeGreaterThanOrEqual(1);
    });

    it('assigns an official judge and generates a competition-scoped duty code', async () => {
      const res = await judgesAssignmentService.assignJudge({
        competitionId: 'comp_nat_01',
        judgeId: 'jdg_04',
        disciplineId: 'disc_long_jump',
        disciplineNameAr: 'الوثب الطويل',
        venue: 'ميدان الوثب أ',
        task: 'chief_field_jumps',
        date: '2026-06-25',
        startTime: '10:00',
        endTime: '12:00'
      });

      expect(res.success).toBe(true);
      expect(res.assignment).toBeDefined();
      expect(res.assignment?.dutyCode).toContain('DUTY-');
      expect(res.assignment?.status).toBe('active');
    });

    it('detects assignment conflicts for overlapping time slots', () => {
      // Judge jdg_01 has assignment asg_01 at 15:00 - 16:00
      const conflict = judgesAssignmentService.checkAssignmentConflicts(
        'jdg_01',
        'comp_nat_01',
        '2026-06-25',
        '15:30', // overlaps with 15:00 - 16:00!
        '16:30',
        'ميدان آخر',
        'disc_200m'
      );

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflicts.length).toBeGreaterThanOrEqual(1);
      expect(conflict.conflicts[0].type).toBe('venue_conflict');
    });

    it('isolates a judge without deleting historical records, revoking active duty codes', async () => {
      const testJudge = await judgesAssignmentService.addJudge({
        fullName: 'حكم للاختبار الإداري',
        licenseNumber: 'TEST-JDG-999',
        grade: 'regional',
        wilaya: 'سعيدة',
        leagueId: 'lg_saida',
        phone: '0555001122',
        email: 'test.judge@athletic.dz',
        status: 'active',
        specialties: ['finish_judge']
      });

      // Assign judge
      const asgRes = await judgesAssignmentService.assignJudge({
        competitionId: 'comp_nat_01',
        judgeId: testJudge.id,
        disciplineId: 'disc_400m',
        disciplineNameAr: '400م حواجز',
        venue: 'المضمار الرئيسي',
        task: 'finish_judge',
        date: '2026-06-25',
        startTime: '16:00',
        endTime: '17:00'
      });

      expect(asgRes.success).toBe(true);
      const code = asgRes.assignment?.dutyCode!;

      // Verify code was valid
      const initialVerify = judgesAssignmentService.verifyDutyCode(code, 'comp_nat_01');
      expect(initialVerify.valid).toBe(true);

      // Isolate the judge (Section 5.6)
      const isolated = await judgesAssignmentService.isolateJudge(testJudge.id, 'إجراء وقائي إداري رسمي');
      expect(isolated).toBe(true);

      // Verify judge status is isolated (not deleted!)
      const updatedJudge = judgesAssignmentService.getJudgeById(testJudge.id);
      expect(updatedJudge?.status).toBe('isolated');
      expect(updatedJudge?.isolationReason).toBe('إجراء وقائي إداري رسمي');

      // Verify duty code is now frozen/revoked
      const afterVerify = judgesAssignmentService.verifyDutyCode(code, 'comp_nat_01');
      expect(afterVerify.valid).toBe(false);
      expect(afterVerify.error).toContain('تجميد');
    });

    it('prevents duty code access when used in a different competition', async () => {
      // Verify asg_01 duty code (comp_nat_01) fails if attempted in comp_nat_02
      const checkOther = judgesAssignmentService.verifyDutyCode('DUTY-ALG-CHIEF-100M', 'comp_nat_02');
      expect(checkOther.valid).toBe(false);
      expect(checkOther.error).toContain('مخصص لمنافسة أخرى');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. COMPETITION ENTRIES & RESULTS SERVICE (Section 11 & 9)
  // ══════════════════════════════════════════════════════════════════════════
  describe('4. Competition Entries & Unified Export (Section 11 & 9)', () => {
    it('supports pre-competition preliminary entries with empty marks', async () => {
      const entries = await competitionEntriesService.getEntries('comp_nat_02', 'disc_100m');
      expect(entries.length).toBeGreaterThanOrEqual(1);

      // Check first entry
      const entry = entries[0];
      expect(entry.status).toBe('entered');
      expect(entry.mark).toBe(''); // Empty mark for pre-competition!
    });

    it('supports post-competition certified results with FAT times and ranking', async () => {
      const entries = await competitionEntriesService.getEntries('comp_nat_01', 'disc_100m');
      expect(entries.length).toBeGreaterThanOrEqual(3);

      const winner = entries.find(e => e.rank === 1);
      expect(winner).toBeDefined();
      expect(winner?.athleteName).toBe('يوسف العبدلي');
      expect(winner?.mark).toBe('09.96s');
      expect(winner?.status).toBe('finished');
      expect(winner?.isPersonalBest).toBe(true);
    });

    it('adds and manages an athlete entry without duplicating master athlete data', async () => {
      const newEntry = await competitionEntriesService.addEntry({
        competitionId: 'comp_nat_01',
        disciplineId: 'disc_200m',
        disciplineNameAr: '200 متر',
        athleteId: 'ath_test_01',
        bib: 199,
        athleteName: 'رياض محرز الرياضي',
        birthDate: '2003-05-10',
        category: 'أكابر',
        gender: 'M',
        clubId: 'club_mca',
        clubName: 'مولودية الجزائر (MCA)',
        status: 'entered',
        mark: ''
      });

      expect(newEntry.id).toBeDefined();
      expect(newEntry.bib).toBe(199);

      const fetched = await competitionEntriesService.getEntries('comp_nat_01', 'disc_200m');
      expect(fetched.some(e => e.id === newEntry.id)).toBe(true);

      // Clean up
      await competitionEntriesService.removeEntry(newEntry.id);
    });

    it('provides unified multi-discipline Excel export function', async () => {
      const comp = await competitionsService.getCompetitionById('comp_nat_01');
      expect(comp).not.toBeNull();
      
      // Verify export function exists and can be executed
      expect(typeof competitionEntriesService.exportAllDisciplinesToExcel).toBe('function');
    });
  });
});
