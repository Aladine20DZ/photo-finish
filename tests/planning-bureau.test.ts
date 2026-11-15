import { describe, it, expect, beforeEach } from 'vitest';
import { 
  disciplinesSeedService, 
  SEED_ATHLETICS_DISCIPLINES 
} from '../src/services/disciplinesSeedService';
import { 
  planningBureauService, 
  OFFICIAL_PARTICIPATING_CATEGORIES, 
  CompetitionPlanningDraft 
} from '../src/services/planningBureauService';

describe('Stage 3: Planning Bureau & Automated Dual-Table Schedule Engine', () => {
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
  });

  describe('1. Reference Table (Seed) for All Athletics Disciplines', () => {
    it('contains all standard Course disciplines (sprints, middle, long, hurdles, steeplechase, race walking, road)', () => {
      const course = disciplinesSeedService.getCourseDisciplines();
      expect(course.length).toBeGreaterThanOrEqual(18);

      const codes = course.map(d => d.code);
      // Sprints
      expect(codes).toContain('60M');
      expect(codes).toContain('100M');
      expect(codes).toContain('200M');
      expect(codes).toContain('400M');
      // Middle
      expect(codes).toContain('800M');
      expect(codes).toContain('1500M');
      // Long
      expect(codes).toContain('3000M');
      expect(codes).toContain('5000M');
      expect(codes).toContain('10000M');
      // Hurdles & Steeplechase
      expect(codes).toContain('100MH');
      expect(codes).toContain('110MH');
      expect(codes).toContain('400MH');
      expect(codes).toContain('3000MST');
      // Walking
      expect(codes).toContain('3000MW');
      expect(codes).toContain('5000MW');
      expect(codes).toContain('20KMW');
      // Road
      expect(codes).toContain('HALF_MARA');
      expect(codes).toContain('MARATHON');
    });

    it('contains Relays as a dedicated sub-group under Course', () => {
      const relays = disciplinesSeedService.getRelayDisciplines();
      expect(relays.length).toBeGreaterThanOrEqual(4);

      const codes = relays.map(d => d.code);
      expect(codes).toContain('4X100M_M');
      expect(codes).toContain('4X100M_F');
      expect(codes).toContain('4X400M_M');
      expect(codes).toContain('4X400M_F');
      expect(codes).toContain('4X400M_MIXED');
    });

    it('contains all Concours field events (Jumps and Throws)', () => {
      const jumps = disciplinesSeedService.getConcoursJumps();
      const throwsList = disciplinesSeedService.getConcoursThrows();

      expect(jumps.map(d => d.code)).toEqual(expect.arrayContaining(['HJ', 'PV', 'LJ', 'TJ']));
      expect(throwsList.map(d => d.code)).toEqual(expect.arrayContaining(['SP', 'DT', 'JT', 'HT']));
    });

    it('contains Combined Multi-Events (Decathlon, Heptathlon, Pentathlon)', () => {
      const combined = disciplinesSeedService.getCombinedDisciplines();
      const codes = combined.map(d => d.code);
      expect(codes).toContain('DEC');
      expect(codes).toContain('HEP');
      expect(codes).toContain('PENT');
    });

    it('allows administrators to extend and add custom disciplines dynamically', () => {
      const beforeCount = disciplinesSeedService.getAllDisciplines().length;
      const custom = disciplinesSeedService.addCustomDiscipline({
        code: '150M_STREET',
        nameAr: '150 متر شوارع استعراضي',
        nameFr: '150m Street',
        nameEn: '150m Street Exhibition',
        group: 'course',
        subCategory: 'sprint',
        windGaugeRequired: true,
        defaultRounds: ['final']
      });

      expect(custom.id).toBeDefined();
      expect(disciplinesSeedService.getAllDisciplines().length).toBe(beforeCount + 1);
    });
  });

  describe('2. Participating Categories Reference Table', () => {
    it('provides all official age categories with male and female separation', () => {
      expect(OFFICIAL_PARTICIPATING_CATEGORIES.length).toBeGreaterThanOrEqual(10);
      const codes = OFFICIAL_PARTICIPATING_CATEGORIES.map(c => c.code);

      expect(codes).toContain('U16_M');
      expect(codes).toContain('U16_F');
      expect(codes).toContain('U18_M');
      expect(codes).toContain('U18_F');
      expect(codes).toContain('U20_M');
      expect(codes).toContain('U20_F');
      expect(codes).toContain('SENIOR_M');
      expect(codes).toContain('SENIOR_F');
      expect(codes).toContain('MASTER_M');
      expect(codes).toContain('MASTER_F');
    });
  });

  describe('3. Automated Program Generation in Dual Tables (Course & Concours)', () => {
    it('generates structured Course table (individual races + relays sub-table) and Concours table (jumps + throws)', () => {
      const draft: CompetitionPlanningDraft = {
        competitionName: 'بطولة الولاية لألعاب القوى 2026',
        startDate: '2026-06-20',
        endDate: '2026-06-21',
        venue: 'المركب الأولمبي بسعيدة',
        organizingLeagueId: 'lg_saida',
        organizingLeagueName: 'الرابطة الولائية لألعاب القوى - سعيدة',
        selectedCategoryCodes: ['U18_M', 'U18_F', 'SENIOR_M', 'SENIOR_F'],
        selectedDisciplineIds: [
          'disc_100m', 'disc_400m', // individual course
          'disc_4x100m_m', 'disc_4x400m_mixed', // relays
          'disc_long_jump', 'disc_high_jump', // jumps
          'disc_shot_put' // throws
        ],
        disciplineTimings: {
          'disc_100m': { dayIndex: 1, time: '09:00', round: 'heats' },
          'disc_400m': { dayIndex: 1, time: '11:00', round: 'final' },
          'disc_4x100m_m': { dayIndex: 1, time: '17:00', round: 'final' },
          'disc_4x400m_mixed': { dayIndex: 1, time: '18:00', round: 'final' },
          'disc_long_jump': { dayIndex: 1, time: '09:30', round: 'final' },
          'disc_high_jump': { dayIndex: 1, time: '10:30', round: 'final' },
          'disc_shot_put': { dayIndex: 1, time: '15:00', round: 'final' },
        }
      };

      const schedule = planningBureauService.generateSchedule(draft);

      expect(schedule.id).toBeDefined();
      expect(schedule.competitionName).toBe('بطولة الولاية لألعاب القوى 2026');
      expect(schedule.organizingLeagueName).toContain('سعيدة');

      // 1. Course Table
      expect(schedule.tableCourse.individualRaces.length).toBeGreaterThan(0);
      expect(schedule.tableCourse.relays.length).toBeGreaterThan(0);

      // Verify that relays are in the relays sub-table and NOT mixed into individual races
      for (const relay of schedule.tableCourse.relays) {
        expect(relay.isRelay).toBe(true);
      }
      for (const race of schedule.tableCourse.individualRaces) {
        expect(race.isRelay).toBeFalsy();
      }

      // 2. Concours Table
      expect(schedule.tableConcours.jumps.length).toBeGreaterThan(0);
      expect(schedule.tableConcours.throws.length).toBeGreaterThan(0);

      for (const jump of schedule.tableConcours.jumps) {
        expect(jump.subCategory).toBe('jump');
      }
      for (const thr of schedule.tableConcours.throws) {
        expect(thr.subCategory).toBe('throw');
      }

      // 3. Ordering by day and time
      const races = schedule.tableCourse.individualRaces;
      for (let i = 0; i < races.length - 1; i++) {
        expect(races[i].time.localeCompare(races[i + 1].time)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('4. Export Interface for Stage 4 Unified Header Integration', () => {
    it('provides unified export adapter methods for PDF, Word, and Excel', async () => {
      const adapter = planningBureauService.createExportAdapter();
      const mockSchedule = planningBureauService.generateSchedule({
        competitionName: 'بطولة تجريبية',
        startDate: '2026-06-20',
        venue: 'المضمار',
        organizingLeagueId: 'lg_saida',
        organizingLeagueName: 'سعيدة',
        selectedCategoryCodes: ['SENIOR_M'],
        selectedDisciplineIds: ['disc_100m'],
        disciplineTimings: {}
      });

      const pdf = await adapter.exportToPdf(mockSchedule);
      expect(pdf.success).toBe(true);
      expect(pdf.filename).toContain('.pdf');

      const word = await adapter.exportToWord(mockSchedule);
      expect(word.success).toBe(true);
      expect(word.filename).toContain('.docx');

      const excel = await adapter.exportToExcel(mockSchedule);
      expect(excel.success).toBe(true);
      expect(excel.filename).toContain('.xlsx');
    });
  });
});
