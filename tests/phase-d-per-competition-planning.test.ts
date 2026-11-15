import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  planningBureauService, 
  type CompetitionPlanningDraft, 
  type GeneratedCompetitionSchedule,
  OFFICIAL_PARTICIPATING_CATEGORIES
} from '../src/services/planningBureauService';
import { 
  competitionFileService, 
  type CompetitionFile,
  type CompetitionLevel 
} from '../src/services/competitionFileService';
import { disciplinesSeedService } from '../src/services/disciplinesSeedService';

describe('Phase D: Per-Competition Planning Isolation, File Architecture & Planning Bureau', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = String(val); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      length: 0,
      key: (i: number) => Object.keys(store)[i] || null,
    };
    Object.defineProperty((globalThis as any).localStorage, 'length', {
      get: () => Object.keys(store).length,
      configurable: true
    });
    vi.restoreAllMocks();
  });

  const createSampleDraft = (name: string, leagueName: string): CompetitionPlanningDraft => ({
    competitionName: name,
    startDate: '2026-05-10',
    endDate: '2026-05-11',
    venue: 'مركب السعادة الأولمبي',
    organizingLeagueId: 'lg_saida',
    organizingLeagueName: leagueName,
    selectedCategoryCodes: ['SENIOR_M', 'U20_M'],
    selectedDisciplineIds: ['disc_100m', 'disc_long_jump', 'disc_4x100m_m', 'disc_shot_put'],
    disciplineTimings: {
      'disc_100m': { dayIndex: 1, time: '09:00', round: 'heats', venueLocation: 'المضمار الرئيسي' },
      'disc_long_jump': { dayIndex: 1, time: '09:30', round: 'final', venueLocation: 'حفرة الوثب 1' },
      'disc_4x100m_m': { dayIndex: 1, time: '11:00', round: 'final', venueLocation: 'المضمار الرئيسي' },
      'disc_shot_put': { dayIndex: 1, time: '11:30', round: 'final', venueLocation: 'دائرة الرمي A' }
    }
  });

  describe('1. Per-Competition Storage & Plan Isolation', () => {
    it('should strictly isolate plans between two different competitions', () => {
      const comp1Id = 'comp_championship_oran_2026';
      const draft1 = createSampleDraft('بطولة وهران المفتوحة', 'رابطة وهران');
      const schedule1 = planningBureauService.generateSchedule(draft1);

      const comp2Id = 'comp_championship_saida_2026';
      const draft2 = createSampleDraft('بطولة سعيدة الولائية', 'رابطة سعيدة');
      const schedule2 = planningBureauService.generateSchedule(draft2);

      // Save both
      planningBureauService.savePlanningForCompetition(comp1Id, draft1, schedule1);
      planningBureauService.savePlanningForCompetition(comp2Id, draft2, schedule2);

      // Retrieve each independently
      const retrieved1 = planningBureauService.getPlanningForCompetition(comp1Id);
      const retrieved2 = planningBureauService.getPlanningForCompetition(comp2Id);

      expect(retrieved1).not.toBeNull();
      expect(retrieved2).not.toBeNull();
      expect(retrieved1?.draft.competitionName).toBe('بطولة وهران المفتوحة');
      expect(retrieved2?.draft.competitionName).toBe('بطولة سعيدة الولائية');
      expect(retrieved1?.schedule.organizingLeagueName).toBe('رابطة وهران');
      expect(retrieved2?.schedule.organizingLeagueName).toBe('رابطة سعيدة');

      // Verify localStorage keys are prefixed and isolated
      const rawStored1 = (globalThis as any).localStorage.getItem(`pfp_competition_planning_v2_${comp1Id}`);
      const rawStored2 = (globalThis as any).localStorage.getItem(`pfp_competition_planning_v2_${comp2Id}`);
      expect(rawStored1).not.toBeNull();
      expect(rawStored2).not.toBeNull();
      expect(JSON.parse(rawStored1).draft.competitionName).toBe('بطولة وهران المفتوحة');
      expect(JSON.parse(rawStored2).draft.competitionName).toBe('بطولة سعيدة الولائية');
    });

    it('should return null when retrieving planning for an unknown competition ID', () => {
      const result = planningBureauService.getPlanningForCompetition('non_existent_comp_id');
      expect(result).toBeNull();
    });
  });

  describe('2. Unified Competition File Architecture (ملف مستقل لكل منافسة)', () => {
    it('should synthesize and persist a complete competition file bundle', async () => {
      const compId = 'comp_file_national_2026';
      const file = competitionFileService.synthesizeFromFileOrDraft(compId);

      expect(file).not.toBeNull();
      expect(file!.format).toBe('PFP_COMPETITION_FILE');
      expect(file!.version).toBe('2.0');
      expect(file!.metadata.id).toBe(compId);
      expect(file!.schedule).toBeDefined();
      expect(file!.auditTrail.length).toBeGreaterThan(0);
      expect(file!.syncStatus).toBe('pending_sync');

      // Save file
      file!.metadata.name = 'البطولة الوطنية للنوادي 2026';
      file!.metadata.level = 'national';
      const saveRes = await competitionFileService.saveCompetitionFile(file!, 'رئيس اللجنة الفنية', 'إنشاء واعتماد ملف المنافسة');

      expect(saveRes.success).toBe(true);

      // Verify independent retrieval
      const loaded = competitionFileService.getCompetitionFile(compId);
      expect(loaded).not.toBeNull();
      expect(loaded?.metadata.name).toBe('البطولة الوطنية للنوادي 2026');
      expect(loaded?.metadata.level).toBe('national');
      expect(loaded?.auditTrail.some(a => a.details.includes('إنشاء واعتماد'))).toBe(true);
    });

    it('should track offline synchronization status and sync timestamp', async () => {
      const compId = 'comp_sync_test_2026';
      const file = competitionFileService.synthesizeFromFileOrDraft(compId)!;
      
      await competitionFileService.saveCompetitionFile(file);
      expect(file.syncStatus).toBe('pending_sync');

      // Perform sync
      const syncResult = await competitionFileService.syncWithServer(compId);
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedAt).toBeDefined();

      const syncedFile = competitionFileService.getCompetitionFile(compId);
      expect(syncedFile?.syncStatus).toBe('synced');
      expect(syncedFile?.lastSyncedAt).toBe(syncResult.syncedAt);
    });

    it('should support reordering schedule items with audit trail logging', async () => {
      const compId = 'comp_reorder_test_2026';
      const file = competitionFileService.synthesizeFromFileOrDraft(compId)!;
      const draft = createSampleDraft('منافسة إعادة الترتيب', 'رابطة سعيدة');
      file.schedule = planningBureauService.generateSchedule(draft);
      await competitionFileService.saveCompetitionFile(file);

      const initialFirst = file.schedule.tableCourse.individualRaces[0];
      const initialSecond = file.schedule.tableCourse.individualRaces[1];

      // Reorder: swap index 0 and 1
      const updatedSchedule = competitionFileService.reorderScheduleItem(compId, 'individualRaces', 0, 1);
      expect(updatedSchedule).not.toBeNull();
      expect(updatedSchedule!.tableCourse.individualRaces[0].id).toBe(initialSecond.id);
      expect(updatedSchedule!.tableCourse.individualRaces[1].id).toBe(initialFirst.id);

      // Check audit trail updated
      const reloaded = competitionFileService.getCompetitionFile(compId);
      expect(reloaded?.auditTrail.some(a => a.details.includes('إعادة ترتيب'))).toBe(true);
    });
  });

  describe('3. Portable Plan Bundle Export & Import (.pfp-plan & .pfp-competition)', () => {
    it('should export a competition plan to a portable JSON bundle', () => {
      const compId = 'comp_export_test_2026';
      const draft = createSampleDraft('تظاهرة التصدير التجريبية', 'رابطة الجزائر');
      const schedule = planningBureauService.generateSchedule(draft);
      planningBureauService.savePlanningForCompetition(compId, draft, schedule);

      const jsonStr = planningBureauService.exportPlanToJson(compId);
      expect(typeof jsonStr).toBe('string');

      const bundle = JSON.parse(jsonStr);
      expect(bundle.format).toBe('PFP_PLANNING_BUNDLE');
      expect(bundle.version).toBe('2.0');
      expect(bundle.competitionId).toBe(compId);
      expect(bundle.plan.draft.competitionName).toBe('تظاهرة التصدير التجريبية');
      expect(bundle.plan.schedule).toBeDefined();
    });

    it('should export and import full .pfp-competition bundles', () => {
      const compId = 'comp_full_bundle_2026';
      const file = competitionFileService.synthesizeFromFileOrDraft(compId)!;
      file.metadata.name = 'تظاهرة كاملة للتصدير';
      file.metadata.level = 'regional';
      (globalThis as any).localStorage.setItem(`pfp_competition_file_v2_${compId}`, JSON.stringify(file));

      const bundleJson = competitionFileService.exportCompetitionBundle(compId);
      expect(typeof bundleJson).toBe('string');

      const imported = competitionFileService.importCompetitionBundle(bundleJson);
      expect(imported.metadata.id).toBe(compId);
      expect(imported.metadata.name).toBe('تظاهرة كاملة للتصدير');
      expect(imported.metadata.level).toBe('regional');
    });

    it('should reject invalid or corrupt JSON bundles during import', () => {
      expect(() => planningBureauService.importPlanFromJson('invalid json string')).toThrow();
      expect(() => planningBureauService.importPlanFromJson(JSON.stringify({ format: 'UNKNOWN', some: 'data' }))).toThrow();
      expect(() => competitionFileService.importCompetitionBundle('corrupted text')).toThrow();
    });
  });

  describe('4. World Athletics Rule TR20.3 Rest Interval Validation', () => {
    it('should approve schedule when rest between preliminary round and final is >= 45 mins', () => {
      const schedule: GeneratedCompetitionSchedule = {
        id: 'sched_valid_rest',
        competitionName: 'بطولة مطابقة للقوانين',
        datesText: '10 ماي 2026',
        venue: 'مركب الشلف',
        organizingLeagueName: 'رابطة الشلف',
        generatedAt: new Date().toISOString(),
        tableCourse: {
          individualRaces: [
            {
              id: 'r1',
              disciplineId: 'disc_100m',
              disciplineCode: '100m',
              disciplineNameAr: '100 متر مستوية',
              group: 'course',
              subCategory: 'sprint',
              dayIndex: 1,
              time: '09:00',
              categoryCode: 'SENIOR_M',
              categoryNameAr: 'أكابر رجال',
              gender: 'M',
              round: 'heats',
              roundLabelAr: 'التصفيات'
            },
            {
              id: 'r2',
              disciplineId: 'disc_100m',
              disciplineCode: '100m',
              disciplineNameAr: '100 متر مستوية',
              group: 'course',
              subCategory: 'sprint',
              dayIndex: 1,
              time: '10:15', // 75 minutes gap (> 45 min)
              categoryCode: 'SENIOR_M',
              categoryNameAr: 'أكابر رجال',
              gender: 'M',
              round: 'final',
              roundLabelAr: 'النهائي'
            }
          ],
          relays: []
        },
        tableConcours: {
          jumps: [],
          throws: []
        },
        tableCombined: []
      };

      const result = planningBureauService.validateRestIntervals(schedule);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should warn when rest between preliminary round and final is less than 45 mins (WA Rule TR20.3)', () => {
      const schedule: GeneratedCompetitionSchedule = {
        id: 'sched_invalid_rest',
        competitionName: 'بطولة مخالفة للراحة القانونية',
        datesText: '10 ماي 2026',
        venue: 'مركب سعيدة',
        organizingLeagueName: 'رابطة سعيدة',
        generatedAt: new Date().toISOString(),
        tableCourse: {
          individualRaces: [
            {
              id: 'r1',
              disciplineId: 'disc_100m',
              disciplineCode: '100m',
              disciplineNameAr: '100 متر مستوية',
              group: 'course',
              subCategory: 'sprint',
              dayIndex: 1,
              time: '09:00',
              categoryCode: 'SENIOR_M',
              categoryNameAr: 'أكابر رجال',
              gender: 'M',
              round: 'heats',
              roundLabelAr: 'التصفيات'
            },
            {
              id: 'r2',
              disciplineId: 'disc_100m',
              disciplineCode: '100m',
              disciplineNameAr: '100 متر مستوية',
              group: 'course',
              subCategory: 'sprint',
              dayIndex: 1,
              time: '09:30', // Only 30 minutes gap (< 45 min)
              categoryCode: 'SENIOR_M',
              categoryNameAr: 'أكابر رجال',
              gender: 'M',
              round: 'final',
              roundLabelAr: 'النهائي'
            }
          ],
          relays: []
        },
        tableConcours: {
          jumps: [],
          throws: []
        },
        tableCombined: []
      };

      const result = planningBureauService.validateRestIntervals(schedule);
      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain('World Athletics TR20.3');
      expect(result.warnings[0]).toContain('100 متر مستوية');
      expect(result.warnings[0]).toContain('30 دقيقة');
    });
  });

  describe('5. Intelligent Auto-Timing Calculation', () => {
    it('should generate staggered valid sequential timings based on discipline durations', () => {
      const disciplines = ['disc_100m', 'disc_400m', 'disc_long_jump'];
      const categories = ['SENIOR_M'];
      const timings = planningBureauService.autoCalculateIntelligentTimings(disciplines, categories, 9);

      expect(timings['disc_100m_SENIOR_M']).toBeDefined();
      expect(timings['disc_100m_SENIOR_M'].time).toBe('09:00');

      expect(timings['disc_400m_SENIOR_M']).toBeDefined();
      expect(timings['disc_400m_SENIOR_M'].time).toBe('09:10');

      expect(timings['disc_long_jump_SENIOR_M']).toBeDefined();
      expect(timings['disc_long_jump_SENIOR_M'].time).toBe('09:25');
    });
  });

  describe('6. Disciplines Reference Catalog (39 Disciplines + Extensibility)', () => {
    it('should provide complete official participating categories with Arabic names', () => {
      expect(OFFICIAL_PARTICIPATING_CATEGORIES.length).toBeGreaterThanOrEqual(10);
      const seniorM = OFFICIAL_PARTICIPATING_CATEGORIES.find(c => c.code === 'SENIOR_M');
      expect(seniorM).toBeDefined();
      expect(seniorM?.gender).toBe('M');
      expect(seniorM?.nameAr).toContain('أكابر');
    });

    it('should provide all 39 reference disciplines categorized across Course, Relays, Jumps, Throws, Combined', () => {
      const all = disciplinesSeedService.getAllDisciplines();
      expect(all.length).toBeGreaterThanOrEqual(39);

      const course = disciplinesSeedService.getCourseDisciplines();
      const relays = disciplinesSeedService.getRelayDisciplines();
      const jumps = disciplinesSeedService.getConcoursJumps();
      const throws = disciplinesSeedService.getConcoursThrows();
      const combined = disciplinesSeedService.getCombinedDisciplines();

      expect(course.length).toBeGreaterThan(0);
      expect(relays.length).toBeGreaterThan(0);
      expect(jumps.length).toBeGreaterThan(0);
      expect(throws.length).toBeGreaterThan(0);
      expect(combined.length).toBeGreaterThan(0);
    });

    it('should allow easy extension of custom disciplines from administration', () => {
      const initialCount = disciplinesSeedService.getAllDisciplines().length;
      const custom = disciplinesSeedService.addCustomDiscipline({
        code: '600M',
        nameAr: '600 متر تجريبي',
        nameFr: '600 mètres test',
        nameEn: '600 metres test',
        group: 'course',
        subCategory: 'middle_distance',
        windGaugeRequired: false,
        defaultRounds: ['final']
      });

      expect(custom.id).toBeDefined();
      expect(custom.isCustom).toBe(true);
      expect(disciplinesSeedService.getAllDisciplines().length).toBe(initialCount + 1);
    });
  });
});
