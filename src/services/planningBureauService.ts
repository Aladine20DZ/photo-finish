/**
 * PHOTO FINISH PRO AI — Planning Bureau Service (Stage 3)
 * Automated competition scheduling, dual-table program generation (Course & Concours),
 * category time slot allocation, and unified export interfaces.
 */

import { disciplinesSeedService } from './disciplinesSeedService';
import { unifiedExportService, UnifiedExportPayload, ExportDisciplineSection } from './unifiedExportService';

export interface ParticipatingCategory {
  id: string;
  code: string;
  nameAr: string;
  ageRange: string;
  gender: 'M' | 'F' | 'MIXED';
}

export const OFFICIAL_PARTICIPATING_CATEGORIES: ParticipatingCategory[] = [
  { id: 'cat_u14_m', code: 'U14_M', nameAr: 'براعم ذكور (U14)', ageRange: 'أقل من 14 سنة', gender: 'M' },
  { id: 'cat_u14_f', code: 'U14_F', nameAr: 'براعم إناث (U14)', ageRange: 'أقل من 14 سنة', gender: 'F' },
  { id: 'cat_u16_m', code: 'U16_M', nameAr: 'أصاغر ذكور (U16)', ageRange: '14 - 15 سنة', gender: 'M' },
  { id: 'cat_u16_f', code: 'U16_F', nameAr: 'أصاغر إناث (U16)', ageRange: '14 - 15 سنة', gender: 'F' },
  { id: 'cat_u18_m', code: 'U18_M', nameAr: 'أشبال ذكور (U18)', ageRange: '16 - 17 سنة', gender: 'M' },
  { id: 'cat_u18_f', code: 'U18_F', nameAr: 'أشبال إناث (U18)', ageRange: '16 - 17 سنة', gender: 'F' },
  { id: 'cat_u20_m', code: 'U20_M', nameAr: 'أواسط ذكور (U20)', ageRange: '18 - 19 سنة', gender: 'M' },
  { id: 'cat_u20_f', code: 'U20_F', nameAr: 'أواسط إناث (U20)', ageRange: '18 - 19 سنة', gender: 'F' },
  { id: 'cat_senior_m', code: 'SENIOR_M', nameAr: 'أكابر رجال (Senior)', ageRange: '20 - 34 سنة', gender: 'M' },
  { id: 'cat_senior_f', code: 'SENIOR_F', nameAr: 'كبريات سيدات (Senior)', ageRange: '20 - 34 سنة', gender: 'F' },
  { id: 'cat_master_m', code: 'MASTER_M', nameAr: 'قدماء رجال (Masters)', ageRange: '35 سنة فأكثر', gender: 'M' },
  { id: 'cat_master_f', code: 'MASTER_F', nameAr: 'قدماء سيدات (Masters)', ageRange: '35 سنة فأكثر', gender: 'F' },
];

export interface ScheduledDisciplineItem {
  id: string;
  disciplineId: string;
  disciplineCode: string;
  disciplineNameAr: string;
  group: 'course' | 'concours' | 'combined';
  subCategory: string;
  isRelay?: boolean;
  dayIndex: number; // 1 = اليوم الأول، 2 = اليوم الثاني...
  time: string;     // "09:00", "15:30"
  categoryCode: string;
  categoryNameAr: string;
  gender: 'M' | 'F' | 'MIXED';
  round: 'heats' | 'semi' | 'final';
  roundLabelAr: string;
  notes?: string;
}

export interface CompetitionPlanningDraft {
  competitionName: string;
  startDate: string;
  endDate?: string;
  venue: string;
  organizingLeagueId: string;
  organizingLeagueName: string;
  selectedCategoryCodes: string[];
  selectedDisciplineIds: string[];
  disciplineTimings: Record<string, { dayIndex: number; time: string; round: 'heats' | 'semi' | 'final'; notes?: string }>;
}

export interface GeneratedCompetitionSchedule {
  id: string;
  competitionName: string;
  datesText: string;
  venue: string;
  organizingLeagueName: string;
  generatedAt: string;
  
  // جدول Course: السباقات ثم جدول سباقات التتابع تحته
  tableCourse: {
    individualRaces: ScheduledDisciplineItem[];
    relays: ScheduledDisciplineItem[];
  };

  // جدول Concours: القفز والرمي
  tableConcours: {
    jumps: ScheduledDisciplineItem[];
    throws: ScheduledDisciplineItem[];
  };

  // المسابقات المركبة (الافتراض: جدول مخصص بحسب المنطق المتبع)
  tableCombined: ScheduledDisciplineItem[];

  totalEventsCount: number;
}

/**
 * Unified Export Interface (to be connected in Stage 4 with Unified Header Service)
 */
export interface ExportHeaderOptions {
  title?: string;
  leagueName?: string;
  federationLogo?: boolean;
  dateStamp?: boolean;
  includeSignatures?: boolean;
}

export interface CompetitionScheduleExportAdapter {
  exportToPdf(schedule: GeneratedCompetitionSchedule, options?: ExportHeaderOptions): Promise<{ success: boolean; blob?: Blob; filename: string }>;
  exportToWord(schedule: GeneratedCompetitionSchedule, options?: ExportHeaderOptions): Promise<{ success: boolean; blob?: Blob; filename: string }>;
  exportToExcel(schedule: GeneratedCompetitionSchedule, options?: ExportHeaderOptions): Promise<{ success: boolean; blob?: Blob; filename: string }>;
}

export class PlanningBureauService {
  /**
   * Generates the structured competition schedule in the two required tables:
   * 1. Course Table (Individual races + Relay races)
   * 2. Concours Table (Jumps + Throws)
   */
  public generateSchedule(draft: CompetitionPlanningDraft): GeneratedCompetitionSchedule {
    const allDisciplines = disciplinesSeedService.getAllDisciplines();
    const categoriesMap = new Map<string, ParticipatingCategory>(
      OFFICIAL_PARTICIPATING_CATEGORIES.map(c => [c.code, c])
    );

    const individualRaces: ScheduledDisciplineItem[] = [];
    const relays: ScheduledDisciplineItem[] = [];
    const jumps: ScheduledDisciplineItem[] = [];
    const throwsList: ScheduledDisciplineItem[] = [];
    const combined: ScheduledDisciplineItem[] = [];

    // Fallback base time counter
    let baseTimeMinutes = 9 * 60; // 09:00 AM

    for (const discId of draft.selectedDisciplineIds) {
      const disc = allDisciplines.find(d => d.id === discId);
      if (!disc) continue;

      // For each selected category
      for (const catCode of draft.selectedCategoryCodes) {
        const cat = categoriesMap.get(catCode);
        if (!cat) continue;

        // Skip gender mismatch if discipline is strictly gendered
        if (disc.id.includes('_m') && cat.gender === 'F') continue;
        if (disc.id.includes('_f') && cat.gender === 'M') continue;

        const timingKey = `${disc.id}_${cat.code}`;
        const timingConfig = draft.disciplineTimings[timingKey] || draft.disciplineTimings[disc.id] || {
          dayIndex: 1,
          time: this.formatMinutesToTime(baseTimeMinutes),
          round: 'final' as const
        };

        const item: ScheduledDisciplineItem = {
          id: `item_${disc.id}_${cat.code}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          disciplineId: disc.id,
          disciplineCode: disc.code,
          disciplineNameAr: disc.nameAr,
          group: disc.group,
          subCategory: disc.subCategory,
          isRelay: disc.isRelay,
          dayIndex: timingConfig.dayIndex,
          time: timingConfig.time,
          categoryCode: cat.code,
          categoryNameAr: cat.nameAr,
          gender: cat.gender,
          round: timingConfig.round,
          roundLabelAr: timingConfig.round === 'heats' ? 'تصفيات' :
                        timingConfig.round === 'semi' ? 'نصف نهائي' : 'نهائي مباشر',
          notes: timingConfig.notes
        };

        if (disc.group === 'course') {
          if (disc.isRelay) {
            relays.push(item);
          } else {
            individualRaces.push(item);
          }
        } else if (disc.group === 'concours') {
          if (disc.subCategory === 'jump') {
            jumps.push(item);
          } else {
            throwsList.push(item);
          }
        } else if (disc.group === 'combined') {
          combined.push(item);
        }

        baseTimeMinutes += 15; // advance 15 mins for default spacing
      }
    }

    // Sort all arrays by dayIndex, then by time
    const sortByTime = (a: ScheduledDisciplineItem, b: ScheduledDisciplineItem) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      return a.time.localeCompare(b.time);
    };

    individualRaces.sort(sortByTime);
    relays.sort(sortByTime);
    jumps.sort(sortByTime);
    throwsList.sort(sortByTime);
    combined.sort(sortByTime);

    const totalEventsCount = individualRaces.length + relays.length + jumps.length + throwsList.length + combined.length;

    return {
      id: `sched_${Date.now()}`,
      competitionName: draft.competitionName || 'برنامج منافسة ألعاب القوى',
      datesText: draft.endDate && draft.endDate !== draft.startDate 
        ? `من ${draft.startDate} إلى ${draft.endDate}` 
        : draft.startDate || new Date().toISOString().split('T')[0],
      venue: draft.venue || 'المضمار الرسمي',
      organizingLeagueName: draft.organizingLeagueName || 'الرابطة الولائية لألعاب القوى',
      generatedAt: new Date().toISOString(),
      tableCourse: {
        individualRaces,
        relays
      },
      tableConcours: {
        jumps,
        throws: throwsList
      },
      tableCombined: combined,
      totalEventsCount
    };
  }

  private formatMinutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private parseTimeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PER-COMPETITION STORAGE & ISOLATION ENGINE (Phase D Core)
  // ═══════════════════════════════════════════════════════════════════════════
  private static readonly PLANNING_STORAGE_PREFIX = 'pfp_competition_planning_v2_';
  private inMemoryPlans: Map<string, { draft: CompetitionPlanningDraft; schedule: GeneratedCompetitionSchedule; savedAt: string }> = new Map();

  /**
   * Saves the planning draft and generated schedule under a per-competition isolated key.
   */
  public savePlanningForCompetition(
    competitionId: string, 
    draft: CompetitionPlanningDraft, 
    schedule: GeneratedCompetitionSchedule
  ): void {
    if (!competitionId) return;
    const record = {
      draft,
      schedule,
      savedAt: new Date().toISOString()
    };
    this.inMemoryPlans.set(competitionId, record);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${PlanningBureauService.PLANNING_STORAGE_PREFIX}${competitionId}`, JSON.stringify(record));
      } catch (err) {
        console.warn('Failed to persist planning for competition', competitionId, err);
      }
    }
  }

  /**
   * Retrieves the isolated planning for a specific competition.
   */
  public getPlanningForCompetition(
    competitionId: string
  ): { draft: CompetitionPlanningDraft; schedule: GeneratedCompetitionSchedule; savedAt?: string } | null {
    if (!competitionId) return null;
    if (this.inMemoryPlans.has(competitionId)) {
      return this.inMemoryPlans.get(competitionId)!;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${PlanningBureauService.PLANNING_STORAGE_PREFIX}${competitionId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.draft && parsed.schedule) {
            this.inMemoryPlans.set(competitionId, parsed);
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  }

  /**
   * Exports the entire competition plan as a portable JSON document (.pfp-plan).
   */
  public exportPlanToJson(competitionId: string): string {
    const plan = this.getPlanningForCompetition(competitionId);
    const bundle = {
      format: 'PFP_PLANNING_BUNDLE',
      version: '2.0',
      competitionId,
      exportedAt: new Date().toISOString(),
      plan: plan || null
    };
    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Imports and validates an external plan JSON document (.pfp-plan).
   */
  public importPlanFromJson(jsonString: string): { 
    competitionId: string; 
    draft: CompetitionPlanningDraft; 
    schedule: GeneratedCompetitionSchedule 
  } {
    const parsed = JSON.parse(jsonString);
    if (!parsed || (parsed.format !== 'PFP_PLANNING_BUNDLE' && !parsed.draft && !parsed.plan)) {
      throw new Error('الملف غير متطابق مع بنية خطط المنافسات المعتمدة (Invalid PFP Plan format).');
    }
    const compId = parsed.competitionId || parsed.plan?.schedule?.id || `comp_imported_${Date.now()}`;
    const draft: CompetitionPlanningDraft = parsed.plan?.draft || parsed.draft;
    const schedule: GeneratedCompetitionSchedule = parsed.plan?.schedule || parsed.schedule || this.generateSchedule(draft);

    if (!draft || !schedule) {
      throw new Error('بيانات الخطة أو المسودة غير مكتملة.');
    }

    this.savePlanningForCompetition(compId, draft, schedule);
    return { competitionId: compId, draft, schedule };
  }

  /**
   * Validates rest intervals according to World Athletics Rule TR20.3:
   * Minimum rest between rounds of the same discipline and category must be at least 45 minutes.
   */
  public validateRestIntervals(schedule: GeneratedCompetitionSchedule): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const allItems: ScheduledDisciplineItem[] = [
      ...schedule.tableCourse.individualRaces,
      ...schedule.tableCourse.relays,
      ...schedule.tableConcours.jumps,
      ...schedule.tableConcours.throws,
      ...schedule.tableCombined
    ];

    // Group by dayIndex and (disciplineId + categoryCode)
    const groups = new Map<string, ScheduledDisciplineItem[]>();
    for (const item of allItems) {
      const key = `day_${item.dayIndex}_${item.disciplineId}_${item.categoryCode}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    for (const [, items] of groups.entries()) {
      if (items.length > 1) {
        items.sort((a, b) => this.parseTimeToMinutes(a.time) - this.parseTimeToMinutes(b.time));
        for (let i = 0; i < items.length - 1; i++) {
          const current = items[i];
          const next = items[i + 1];
          const diffMinutes = this.parseTimeToMinutes(next.time) - this.parseTimeToMinutes(current.time);
          if (diffMinutes < 45) {
            warnings.push(
              `تنبيه لائحة World Athletics TR20.3: الفارق الزمني بين ${current.roundLabelAr} (${current.time}) و ${next.roundLabelAr} (${next.time}) لتخصص "${current.disciplineNameAr}" لفئة "${current.categoryNameAr}" هو ${diffMinutes} دقيقة فقط (الحد الأدنى القانوني 45 دقيقة).`
            );
          }
        }
      }
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Automatically calculates intelligent, staggered event timings based on discipline nature.
   */
  public autoCalculateIntelligentTimings(
    selectedDisciplineIds: string[], 
    selectedCategoryCodes: string[], 
    startHour: number = 9
  ): Record<string, { dayIndex: number; time: string; round: 'heats' | 'semi' | 'final'; notes?: string }> {
    const timings: Record<string, { dayIndex: number; time: string; round: 'heats' | 'semi' | 'final'; notes?: string }> = {};
    let currentMinutes = startHour * 60;

    for (const discId of selectedDisciplineIds) {
      // Determine duration based on discipline type
      let durationMins = 15;
      if (discId.includes('100m') || discId.includes('200m') || discId.includes('60m')) durationMins = 10;
      else if (discId.includes('400m') || discId.includes('800m')) durationMins = 15;
      else if (discId.includes('1500m') || discId.includes('3000m')) durationMins = 20;
      else if (discId.includes('5000m') || discId.includes('10000m')) durationMins = 35;
      else if (discId.includes('jump')) durationMins = 40;
      else if (discId.includes('throw') || discId.includes('put')) durationMins = 40;
      else if (discId.includes('4x')) durationMins = 20;

      for (const catCode of selectedCategoryCodes) {
        const timingKey = `${discId}_${catCode}`;
        timings[timingKey] = {
          dayIndex: 1,
          time: this.formatMinutesToTime(currentMinutes),
          round: 'final',
          notes: 'توقيت تقديري ذكي مبني على المعايير الرسمية'
        };
        currentMinutes += durationMins;
      }
    }

    return timings;
  }

  /**
   * Enterprise Export Adapter bound to Stage 4 Unified Export Engine
   */
  public createExportAdapter(): CompetitionScheduleExportAdapter {
    const toPayload = (schedule: GeneratedCompetitionSchedule): UnifiedExportPayload => {
      const baseHeader = unifiedExportService.getDefaultHeader(schedule.competitionName, schedule.venue, schedule.datesText);
      
      const sections: ExportDisciplineSection[] = [
        {
          disciplineId: 'course_table',
          disciplineNameAr: 'الجدول الأول: سباقات المضمار الفردية (Course Individual)',
          group: 'course',
          columns: [
            { header: 'اليوم', key: 'day', align: 'center', width: '50px' },
            { header: 'توقيت الانطلاق', key: 'time', align: 'center', width: '80px' },
            { header: 'غرفة النداء', key: 'callRoom', align: 'center', width: '80px' },
            { header: 'التخصص والمسابقة', key: 'name', align: 'right', width: '160px' },
            { header: 'الفئة العمرية', key: 'category', align: 'right', width: '130px' },
            { header: 'الدور والمرحلة', key: 'round', align: 'center', width: '100px' },
            { header: 'المكان', key: 'venue', align: 'center', width: '100px' }
          ],
          rows: schedule.tableCourse.individualRaces.map(r => ({
            day: `اليوم ${r.dayIndex}`,
            time: r.time,
            callRoom: '-',
            name: r.disciplineNameAr,
            category: r.categoryNameAr,
            round: r.roundLabelAr,
            venue: schedule.venue
          }))
        },
        {
          disciplineId: 'relays_table',
          disciplineNameAr: 'الجدول الفرعي: سباقات التتابع (Relays)',
          group: 'course',
          columns: [
            { header: 'اليوم', key: 'day', align: 'center', width: '50px' },
            { header: 'توقيت الانطلاق', key: 'time', align: 'center', width: '80px' },
            { header: 'غرفة النداء', key: 'callRoom', align: 'center', width: '80px' },
            { header: 'سباق التتابع', key: 'name', align: 'right', width: '160px' },
            { header: 'الفئة', key: 'category', align: 'right', width: '130px' },
            { header: 'الدور', key: 'round', align: 'center', width: '100px' },
            { header: 'المكان', key: 'venue', align: 'center', width: '100px' }
          ],
          rows: schedule.tableCourse.relays.map(r => ({
            day: `اليوم ${r.dayIndex}`,
            time: r.time,
            callRoom: '-',
            name: r.disciplineNameAr,
            category: r.categoryNameAr,
            round: r.roundLabelAr,
            venue: schedule.venue
          }))
        },
        {
          disciplineId: 'concours_table',
          disciplineNameAr: 'الجدول الثاني: مسابقات الميدان (Concours - الوثب والرمي)',
          group: 'concours',
          columns: [
            { header: 'اليوم', key: 'day', align: 'center', width: '50px' },
            { header: 'التوقيت', key: 'time', align: 'center', width: '80px' },
            { header: 'المسابقة', key: 'name', align: 'right', width: '160px' },
            { header: 'الفئة', key: 'category', align: 'right', width: '130px' },
            { header: 'الدور', key: 'round', align: 'center', width: '100px' },
            { header: 'الميدان', key: 'venue', align: 'center', width: '100px' }
          ],
          rows: [...schedule.tableConcours.jumps, ...schedule.tableConcours.throws].map(r => ({
            day: `اليوم ${r.dayIndex}`,
            time: r.time,
            name: r.disciplineNameAr,
            category: r.categoryNameAr,
            round: r.roundLabelAr,
            venue: schedule.venue
          }))
        }
      ];

      return {
        header: {
          ...baseHeader,
          competitionName: schedule.competitionName,
          venue: schedule.venue,
          date: schedule.datesText,
          leagueName: schedule.organizingLeagueName || baseHeader.leagueName,
          disciplineName: 'برنامج ومخطط المنافسة الرسمي'
        },
        sections
      };
    };

    return {
      async exportToPdf(schedule, _options) {
        const payload = toPayload(schedule);
        unifiedExportService.exportToPdf(payload);
        return {
          success: true,
          filename: `Programme_${schedule.competitionName.replace(/\s+/g, '_')}.pdf`
        };
      },
      async exportToWord(schedule, _options) {
        const payload = toPayload(schedule);
        unifiedExportService.exportToWord(payload);
        return {
          success: true,
          filename: `Programme_${schedule.competitionName.replace(/\s+/g, '_')}.docx`
        };
      },
      async exportToExcel(schedule, _options) {
        const payload = toPayload(schedule);
        unifiedExportService.exportToExcel(payload);
        return {
          success: true,
          filename: `Programme_${schedule.competitionName.replace(/\s+/g, '_')}.xlsx`
        };
      }
    };
  }
}

export const planningBureauService = new PlanningBureauService();
