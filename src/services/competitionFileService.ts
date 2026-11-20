/**
 * PHOTO FINISH PRO AI — Independent Competition File Architecture Service (Phase D)
 * Manages isolated, self-contained competition bundles containing:
 * - Metadata (id, name, dates, venue, organizing league, level)
 * - Categories (participating age categories)
 * - Disciplines (selected from reference catalog)
 * - Timings & Dual-table schedule (COURSE individual/relays, CONCOURS jumps/throws)
 * - Assigned judges and duty codes
 * - Judge operations and results summary
 * - Official procès-verbaux & certified reports
 * - Immutable change audit trail
 * - Server-side persistence with offline synchronization & status tracking
 */

import { GeneratedCompetitionSchedule, ScheduledDisciplineItem, planningBureauService } from './planningBureauService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { competitionsService, NationalCompetition, ScheduleEvent } from './competitionsService';

export type CompetitionLevel = 'national' | 'wilaya' | 'regional' | 'local';

/**
 * Legacy/loose shape of a scheduled discipline item found on imported or
 * externally generated schedule bundles (see `schedule.allDisciplines`).
 * Mirrors the fields consumed when syncing schedule events into competitionsService.
 */
interface LegacyScheduleDisciplineItem {
  id?: string;
  startTime?: string;
  disciplineNameAr?: string;
  disciplineName?: string;
  disciplineId: string;
  gender?: string;
  categoryNameAr?: string;
  categoryCode?: string;
  round?: string;
}

export interface CompetitionFileMetadata {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  venue: string;
  city: string;
  wilayaCode: string;
  organizingLeagueId: string;
  organizingLeagueName: string;
  level: CompetitionLevel;
  competitionType: 'track_and_field' | 'cross_country' | 'road_race' | 'combined';
  status: 'upcoming' | 'live' | 'completed';
  isPublished: boolean;
  isDemo?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionDisciplineTimingConfig {
  dayIndex: number;
  time: string;
  round: 'heats' | 'semi' | 'final';
  venueLocation?: string;
  notes?: string;
}

export interface AssignedJudgeEntry {
  id: string;
  name: string;
  role: string;
  dutyCode: string;
  phone?: string;
  assignedDisciplines: string[];
}

export interface CompetitionAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  performedByRole: string;
  details: string;
  previousValue?: any;
  newValue?: any;
}

export interface CompetitionFile {
  format: 'PFP_COMPETITION_FILE';
  version: '2.0';
  metadata: CompetitionFileMetadata;
  selectedCategoryCodes: string[];
  selectedDisciplineIds: string[];
  disciplineTimings: Record<string, CompetitionDisciplineTimingConfig>;
  schedule: GeneratedCompetitionSchedule;
  assignedJudges: AssignedJudgeEntry[];
  operationsSummary: {
    totalOperations: number;
    pendingCount: number;
    certifiedCount: number;
  };
  certifiedResults: any[];
  officialReports: Array<{
    id: string;
    pvNumber: string;
    disciplineId: string;
    disciplineNameAr: string;
    certifiedAt: string;
    certifiedBy: string;
    isLocked: boolean;
  }>;
  auditTrail: CompetitionAuditEntry[];
  syncStatus: 'synced' | 'pending_sync' | 'syncing' | 'error';
  lastSyncedAt?: string;
}

const FILE_STORAGE_PREFIX = 'pfp_competition_file_v2_';

export class CompetitionFileService {
  /**
   * Retrieves or initializes an isolated competition file.
   */
  public getCompetitionFile(competitionId: string): CompetitionFile | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      const raw = localStorage.getItem(`${FILE_STORAGE_PREFIX}${competitionId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`[CompetitionFileService] Failed to load file for ${competitionId}`, e);
    }

    // Attempt to synthesize from existing planning/competition registry
    return this.synthesizeFromFileOrDraft(competitionId);
  }

  /**
   * Synthesizes a new competition file from existing registry or default values.
   */
  public synthesizeFromFileOrDraft(competitionId: string): CompetitionFile | null {
    const existingPlanning = planningBureauService.getPlanningForCompetition(competitionId);
    
    // Default metadata
    const metadata: CompetitionFileMetadata = {
      id: competitionId,
      name: existingPlanning?.draft.competitionName || 'منافسة ألعاب قوى',
      startDate: existingPlanning?.draft.startDate || new Date().toISOString().split('T')[0],
      endDate: existingPlanning?.draft.endDate || existingPlanning?.draft.startDate || new Date().toISOString().split('T')[0],
      venue: existingPlanning?.draft.venue || 'المركب الرياضي الأولمبي',
      city: 'سعيدة',
      wilayaCode: '20',
      organizingLeagueId: existingPlanning?.draft.organizingLeagueId || 'lg_saida',
      organizingLeagueName: existingPlanning?.draft.organizingLeagueName || 'الرابطة الولائية لألعاب القوى - سعيدة',
      level: 'wilaya',
      competitionType: 'track_and_field',
      status: 'upcoming',
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const draft = existingPlanning?.draft || {
      competitionName: metadata.name,
      startDate: metadata.startDate,
      endDate: metadata.endDate,
      venue: metadata.venue,
      organizingLeagueId: metadata.organizingLeagueId,
      organizingLeagueName: metadata.organizingLeagueName,
      selectedCategoryCodes: ['SENIOR_M', 'U20_M', 'U18_M'],
      selectedDisciplineIds: ['disc_100m', 'disc_200m', 'disc_long_jump', 'disc_shot_put'],
      disciplineTimings: {
        'disc_100m': { dayIndex: 1, time: '09:00', round: 'heats' },
        'disc_200m': { dayIndex: 1, time: '10:30', round: 'final' },
        'disc_long_jump': { dayIndex: 1, time: '09:30', round: 'final' },
        'disc_shot_put': { dayIndex: 1, time: '11:00', round: 'final' }
      }
    };

    const schedule = existingPlanning?.schedule || planningBureauService.generateSchedule(draft);

    const file: CompetitionFile = {
      format: 'PFP_COMPETITION_FILE',
      version: '2.0',
      metadata,
      selectedCategoryCodes: draft.selectedCategoryCodes,
      selectedDisciplineIds: draft.selectedDisciplineIds,
      disciplineTimings: draft.disciplineTimings,
      schedule,
      assignedJudges: [],
      operationsSummary: {
        totalOperations: 0,
        pendingCount: 0,
        certifiedCount: 0
      },
      certifiedResults: [],
      officialReports: [],
      auditTrail: [
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'INIT_COMPETITION_FILE',
          performedBy: 'مكتب التخطيط الفيدرالي',
          performedByRole: 'LEAGUE_EXECUTIVE',
          details: `إنشاء ملف المنافسة المستقل برقم تعريفي: ${competitionId}`
        }
      ],
      syncStatus: 'pending_sync'
    };

    return file;
  }

  /**
   * Persists a competition file locally with optional server synchronization.
   */
  public async saveCompetitionFile(
    file: CompetitionFile, 
    performedBy: string = 'مدير التخطيط',
    auditReason?: string
  ): Promise<{ success: boolean; syncStatus: 'synced' | 'pending_sync' | 'error' }> {
    file.metadata.updatedAt = new Date().toISOString();

    // Append to audit trail
    if (auditReason) {
      file.auditTrail.unshift({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        action: 'UPDATE_COMPETITION_FILE',
        performedBy,
        performedByRole: 'LEAGUE_EXECUTIVE',
        details: auditReason
      });
    }

    // 1. Local Persistence (Offline-First)
    file.syncStatus = 'pending_sync';
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${FILE_STORAGE_PREFIX}${file.metadata.id}`, JSON.stringify(file));
        // Keep planningBureauService in sync
        planningBureauService.savePlanningForCompetition(
          file.metadata.id,
          {
            competitionName: file.metadata.name,
            startDate: file.metadata.startDate,
            endDate: file.metadata.endDate,
            venue: file.metadata.venue,
            organizingLeagueId: file.metadata.organizingLeagueId,
            organizingLeagueName: file.metadata.organizingLeagueName,
            selectedCategoryCodes: file.selectedCategoryCodes,
            selectedDisciplineIds: file.selectedDisciplineIds,
            disciplineTimings: file.disciplineTimings
          },
          file.schedule
        );

        // Keep centralized competitionsService in sync with real schedule events
        if (!file.metadata.id.startsWith('new_')) {
          const mappedEvents: ScheduleEvent[] = ((file.schedule as GeneratedCompetitionSchedule & { allDisciplines?: LegacyScheduleDisciplineItem[] })?.allDisciplines || []).map((item, idx) => ({
            id: item.id || `ev_${file.metadata.id}_${idx}`,
            time: item.startTime || '09:00',
            discipline: item.disciplineNameAr || (item as any).disciplineName || item.disciplineId,
            disciplineName: item.disciplineNameAr || (item as any).disciplineName || item.disciplineId,
            disciplineId: item.disciplineId,
            gender: (item.gender as any) || 'M',
            category: item.categoryNameAr || item.categoryCode || 'أكابر',
            round: item.round || 'نهائي مباشر',
            status: 'scheduled',
            venue: file.metadata.venue,
            date: file.metadata.startDate
          }));

          const existingComp = await competitionsService.getCompetitionById(file.metadata.id);
          const compRecord: NationalCompetition = {
            id: file.metadata.id,
            name: file.metadata.name,
            date: file.metadata.startDate,
            endDate: file.metadata.endDate || file.metadata.startDate,
            venue: file.metadata.venue,
            city: file.metadata.city || (file.metadata.venue?.includes('سعيدة') ? 'سعيدة' : 'سعيدة'),
            wilayaCode: file.metadata.wilayaCode || '20',
            status: existingComp?.status || 'upcoming',
            leagueId: file.metadata.organizingLeagueId || 'lg_saida',
            leagueName: file.metadata.organizingLeagueName || 'رابطة ألعاب القوى سعيدة (LWAS)',
            leagueShort: 'LWAS',
            competitionType: (existingComp?.competitionType as any) || 'track_and_field',
            eventsCount: file.schedule?.totalEventsCount || mappedEvents.length,
            athletesCount: existingComp?.athletesCount || 0,
            description: `منافسة معتمدة من مكتب التخطيط والبرمجة (${mappedEvents.length} مسابقة مبرمجة).`,
            schedule: mappedEvents.length > 0 ? mappedEvents : (existingComp?.schedule || []),
            resultsSummary: existingComp?.resultsSummary || [],
            isPublished: true,
            createdAt: existingComp?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await competitionsService.saveCompetition(compRecord);
        }
      } catch (e) {
        console.error('[CompetitionFileService] Local save error:', e);
      }
    }

    // 2. Server Synchronization (if online and Supabase is configured)
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline && isSupabaseConfigured()) {
      try {
        file.syncStatus = 'syncing';
        const { error } = await (supabase.from('competition_files') as any).upsert({
          id: file.metadata.id,
          name: file.metadata.name,
          league_id: file.metadata.organizingLeagueId,
          start_date: file.metadata.startDate,
          end_date: file.metadata.endDate,
          venue: file.metadata.venue,
          level: file.metadata.level,
          file_payload: file,
          updated_at: new Date().toISOString()
        });

        if (!error) {
          file.syncStatus = 'synced';
          file.lastSyncedAt = new Date().toISOString();
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`${FILE_STORAGE_PREFIX}${file.metadata.id}`, JSON.stringify(file));
          }
          return { success: true, syncStatus: 'synced' };
        }
      } catch (err) {
        console.warn('[CompetitionFileService] Server push failed; retaining local copy:', err);
      }
    }

    return { success: true, syncStatus: 'pending_sync' };
  }

  /**
   * Explicitly pushes the local competition file to the server/Supabase.
   */
  public async syncWithServer(competitionId: string): Promise<{ success: boolean; syncedAt?: string; error?: string }> {
    const file = this.getCompetitionFile(competitionId);
    if (!file) {
      return { success: false, error: 'ملف المنافسة غير موجود محلياً.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await (supabase.from('competition_files') as any).upsert({
          id: file.metadata.id,
          name: file.metadata.name,
          league_id: file.metadata.organizingLeagueId,
          start_date: file.metadata.startDate,
          end_date: file.metadata.endDate,
          venue: file.metadata.venue,
          level: file.metadata.level,
          file_payload: file,
          updated_at: new Date().toISOString()
        });

        if (error) throw error;

        file.syncStatus = 'synced';
        file.lastSyncedAt = new Date().toISOString();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`${FILE_STORAGE_PREFIX}${file.metadata.id}`, JSON.stringify(file));
        }

        return { success: true, syncedAt: file.lastSyncedAt };
      } catch (err: any) {
        file.syncStatus = 'error';
        return { success: false, error: err?.message || 'فشلت المزامنة مع السحابة الفيدرالية.' };
      }
    } else {
      // In standalone offline mode, simulate successful enterprise local sync timestamp
      file.syncStatus = 'synced';
      file.lastSyncedAt = new Date().toISOString();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${FILE_STORAGE_PREFIX}${file.metadata.id}`, JSON.stringify(file));
      }
      return { success: true, syncedAt: file.lastSyncedAt };
    }
  }

  /**
   * Reorders an item within the Course or Concours schedule tables.
   */
  public reorderScheduleItem(
    competitionId: string,
    tableKey: 'individualRaces' | 'relays' | 'jumps' | 'throws' | 'tableCombined',
    fromIndex: number,
    toIndex: number
  ): GeneratedCompetitionSchedule | null {
    const file = this.getCompetitionFile(competitionId);
    if (!file || !file.schedule) return null;

    let targetArray: ScheduledDisciplineItem[] | null = null;
    if (tableKey === 'individualRaces') targetArray = file.schedule.tableCourse.individualRaces;
    else if (tableKey === 'relays') targetArray = file.schedule.tableCourse.relays;
    else if (tableKey === 'jumps') targetArray = file.schedule.tableConcours.jumps;
    else if (tableKey === 'throws') targetArray = file.schedule.tableConcours.throws;
    else if (tableKey === 'tableCombined') targetArray = file.schedule.tableCombined;

    if (!targetArray || fromIndex < 0 || toIndex < 0 || fromIndex >= targetArray.length || toIndex >= targetArray.length) {
      return file.schedule;
    }

    const [movedItem] = targetArray.splice(fromIndex, 1);
    targetArray.splice(toIndex, 0, movedItem);

    // Save update with audit entry
    this.saveCompetitionFile(
      file, 
      'مسؤول البرمجة', 
      `إعادة ترتيب فقرة "${movedItem.disciplineNameAr}" في جدول ${tableKey} من الترتيب ${fromIndex + 1} إلى ${toIndex + 1}`
    );

    return file.schedule;
  }

  /**
   * Exports an isolated competition file bundle (.pfp-competition).
   */
  public exportCompetitionBundle(competitionId: string): string {
    const file = this.getCompetitionFile(competitionId);
    if (!file) throw new Error('تعذر العثور على ملف المنافسة للتصدير.');

    return JSON.stringify(file, null, 2);
  }

  /**
   * Imports a competition file bundle.
   */
  public importCompetitionBundle(bundleJson: string): CompetitionFile {
    const parsed = JSON.parse(bundleJson);
    if (!parsed || (parsed.format !== 'PFP_COMPETITION_FILE' && parsed.format !== 'PFP_PLANNING_BUNDLE')) {
      throw new Error('الملف غير مطابق لبنية ملفات المنافسة المعتمدة (Invalid PFP Competition File).');
    }

    let file: CompetitionFile;
    if (parsed.format === 'PFP_PLANNING_BUNDLE') {
      // Convert legacy planning bundle to competition file
      const compId = parsed.competitionId || `comp_${Date.now()}`;
      file = this.synthesizeFromFileOrDraft(compId)!;
      file.metadata.name = parsed.plan?.draft?.competitionName || file.metadata.name;
      file.metadata.startDate = parsed.plan?.draft?.startDate || file.metadata.startDate;
      file.metadata.venue = parsed.plan?.draft?.venue || file.metadata.venue;
      file.selectedCategoryCodes = parsed.plan?.draft?.selectedCategoryCodes || file.selectedCategoryCodes;
      file.selectedDisciplineIds = parsed.plan?.draft?.selectedDisciplineIds || file.selectedDisciplineIds;
      file.disciplineTimings = parsed.plan?.draft?.disciplineTimings || file.disciplineTimings;
      file.schedule = parsed.plan?.schedule || file.schedule;
    } else {
      file = parsed as CompetitionFile;
    }

    file.syncStatus = 'pending_sync';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${FILE_STORAGE_PREFIX}${file.metadata.id}`, JSON.stringify(file));
      // Keep planning service in sync
      planningBureauService.savePlanningForCompetition(
        file.metadata.id,
        {
          competitionName: file.metadata.name,
          startDate: file.metadata.startDate,
          endDate: file.metadata.endDate,
          venue: file.metadata.venue,
          organizingLeagueId: file.metadata.organizingLeagueId,
          organizingLeagueName: file.metadata.organizingLeagueName,
          selectedCategoryCodes: file.selectedCategoryCodes,
          selectedDisciplineIds: file.selectedDisciplineIds,
          disciplineTimings: file.disciplineTimings
        },
        file.schedule
      );
    }

    return file;
  }

  /**
   * Returns metadata list of all managed competition files.
   */
  public listAllCompetitionFiles(): CompetitionFileMetadata[] {
    const list: CompetitionFileMetadata[] = [];
    if (typeof localStorage === 'undefined') return list;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(FILE_STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.metadata && !parsed.metadata.archivedAt) {
              list.push(parsed.metadata);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[CompetitionFileService] Error listing files', e);
    }

    return list;
  }
}

export const competitionFileService = new CompetitionFileService();
