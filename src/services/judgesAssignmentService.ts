/**
 * PHOTO FINISH PRO AI — Master Judges & Assignments Service
 * Compliant with World Athletics Rule 18 & 19 (Technical Officials).
 * Provides centralized KPI monitoring, active competition scoping, conflict detection,
 * judge isolation with historical mark preservation, and competition-scoped duty codes.
 */

import { competitionsService } from './competitionsService';
import { portalAuthService } from './portalAuthService';
import { recycleBinService } from './recycleBinService';

export type JudgeGrade = 'international' | 'federal' | 'regional' | 'wilaya' | 'candidate';
export type JudgeStatus = 'active' | 'suspended' | 'isolated';

export type OfficialDutyTask = 
  | 'chief_judge'               // الحكم العام
  | 'deputy_chief_judge'        // مساعد الحكم العام
  | 'starter'                   // قاضي خط البداية
  | 'recall_starter'            // قاضي الاستدعاء
  | 'chief_finish_judge'        // رئيس قضاة خط النهاية
  | 'finish_judge'              // قاضي خط النهاية
  | 'photo_finish_operator'     // مشغل كاميرا Photo Finish
  | 'wind_gauge_operator'       // مشغل مقياس الرياح
  | 'chief_field_jumps'         // رئيس حكام الوثب
  | 'field_judge_jumps'         // حكم مسابقات الوثب
  | 'chief_field_throws'        // رئيس حكام الرمي
  | 'field_judge_throws'        // حكم مسابقات الرمي
  | 'call_room_chief'           // مسؤول غرفة النداء
  | 'timekeeper'                // مسجل التوقيت
  | 'secretary';                // كاتب المحضر والنتائج

export interface CertifiedJudge {
  id: string;
  fullName: string;
  licenseNumber: string;
  grade: JudgeGrade;
  wilaya: string;
  leagueId: string;
  phone: string;
  email: string;
  nationalId?: string;
  status: JudgeStatus;
  isolatedAt?: string;
  isolationReason?: string;
  specialties: string[];
  createdAt: string;
}

export interface JudgeAssignment {
  id: string;
  competitionId: string;
  leagueId?: string;
  eventId?: string;
  judgeId: string;
  judgeName: string;
  judgeGrade: JudgeGrade;
  disciplineId: string;
  disciplineNameAr: string;
  venue: string;
  task: OfficialDutyTask;
  taskTitleAr: string;
  assignmentRole?: string;
  assignmentStatus?: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  date: string;
  dutyCode: string;
  status: 'assigned' | 'active' | 'completed' | 'cancelled' | 'revoked';
  assignedBy: string;
  assignedAt: string;
}

export interface CompetitionScopedDutyCode {
  dutyCode: string;
  judgeId: string;
  judgeName: string;
  competitionId: string;
  assignmentId: string;
  disciplineId: string;
  venue: string;
  role: string;
  validFrom: string;
  validTo: string;
  status: 'valid' | 'revoked' | 'expired';
  revocationReason?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: {
    type: 'time_overlap' | 'duplicate_assignment' | 'venue_conflict';
    judgeId: string;
    judgeName: string;
    message: string;
    existingAssignment: JudgeAssignment;
  }[];
  warnings: string[];
}

export interface JudgesDashboardKPIs {
  totalJudges: number;
  activeJudges: number;
  assignedJudges: number;
  unassignedJudges: number;
  suspendedOrIsolatedJudges: number;
  currentAssignmentsCount: number;
  disciplinesNeedingJudges: number;
  activeCompetitionsCount: number;
}

export const DUTY_TASKS_MAP: Record<OfficialDutyTask, { titleAr: string; category: 'track' | 'field' | 'management' | 'call_room' }> = {
  chief_judge: { titleAr: 'الحكم العام الفيدرالي (Chief Judge)', category: 'management' },
  deputy_chief_judge: { titleAr: 'مساعد الحكم العام (Deputy Chief Judge)', category: 'management' },
  starter: { titleAr: 'قاضي الانطلاق (Official Starter)', category: 'track' },
  recall_starter: { titleAr: 'قاضي الاستدعاء وإعادة الانطلاق (Recall Starter)', category: 'track' },
  chief_finish_judge: { titleAr: 'رئيس قضاة خط النهاية (Chief Finish Judge)', category: 'track' },
  finish_judge: { titleAr: 'قاضي خط النهاية (Finish Judge)', category: 'track' },
  photo_finish_operator: { titleAr: 'مشغل كاميرا Photo Finish المعتمد', category: 'track' },
  wind_gauge_operator: { titleAr: 'مشغل مقياس سرعة الرياح (Wind Gauge)', category: 'track' },
  chief_field_jumps: { titleAr: 'رئيس حكام مسابقات الوثب (Chief Jumps Judge)', category: 'field' },
  field_judge_jumps: { titleAr: 'قاضي مسابقات الوثب (Jumps Judge)', category: 'field' },
  chief_field_throws: { titleAr: 'رئيس حكام مسابقات الرمي (Chief Throws Judge)', category: 'field' },
  field_judge_throws: { titleAr: 'قاضي مسابقات الرمي (Throws Judge)', category: 'field' },
  call_room_chief: { titleAr: 'مسؤول غرفة النداء والصدريات (Call Room Chief)', category: 'call_room' },
  timekeeper: { titleAr: 'مسجل التوقيت اليدوي والحاسوبي', category: 'track' },
  secretary: { titleAr: 'أمين محضر التحكيم والنتائج الرسمية', category: 'management' }
};

const DEFAULT_JUDGES: CertifiedJudge[] = [
  {
    id: 'jdg_01',
    fullName: 'أحمد بن خليفة',
    licenseNumber: 'FAA-JUDGE-2026-001',
    grade: 'international',
    wilaya: 'الجزائر العاصمة',
    leagueId: 'lg_faa',
    phone: '+213 550 12 34 56',
    email: 'ahmed.khalifa@athletic.dz',
    status: 'active',
    specialties: ['chief_judge', 'photo_finish', 'starter'],
    createdAt: '2026-01-15T09:00:00Z'
  },
  {
    id: 'jdg_02',
    fullName: 'محمد الهواري بن عمارة',
    licenseNumber: 'LAA-JUDGE-2026-014',
    grade: 'federal',
    wilaya: 'وهران',
    leagueId: 'lg_oran',
    phone: '+213 661 22 33 44',
    email: 'm.houari@athletic.dz',
    status: 'active',
    specialties: ['starter', 'finish_judge'],
    createdAt: '2026-01-20T10:00:00Z'
  },
  {
    id: 'jdg_03',
    fullName: 'فؤاد بلحسن',
    licenseNumber: 'LSA-JUDGE-2026-088',
    grade: 'federal',
    wilaya: 'سعيدة',
    leagueId: 'lg_saida',
    phone: '+213 770 99 88 77',
    email: 'fouad.belhasen@athletic.dz',
    status: 'active',
    specialties: ['photo_finish_operator', 'wind_gauge_operator'],
    createdAt: '2026-02-01T11:00:00Z'
  },
  {
    id: 'jdg_04',
    fullName: 'كريم زروقي',
    licenseNumber: 'LST-JUDGE-2026-032',
    grade: 'regional',
    wilaya: 'سطيف',
    leagueId: 'lg_setif',
    phone: '+213 555 44 33 22',
    email: 'k.zerrouki@athletic.dz',
    status: 'active',
    specialties: ['field_judge_jumps', 'field_judge_throws'],
    createdAt: '2026-02-10T12:00:00Z'
  },
  {
    id: 'jdg_05',
    fullName: 'سمير قادري',
    licenseNumber: 'LCH-JUDGE-2026-019',
    grade: 'regional',
    wilaya: 'الشلف',
    leagueId: 'lg_chlef',
    phone: '+213 662 11 22 33',
    email: 'samir.kadri@athletic.dz',
    status: 'active',
    specialties: ['call_room_chief', 'finish_judge'],
    createdAt: '2026-02-15T14:00:00Z'
  },
  {
    id: 'jdg_06',
    fullName: 'نور الدين بومدين',
    licenseNumber: 'LSA-JUDGE-2026-092',
    grade: 'wilaya',
    wilaya: 'سعيدة',
    leagueId: 'lg_saida',
    phone: '+213 771 55 66 77',
    email: 'n.boumedienne@athletic.dz',
    status: 'active',
    specialties: ['timekeeper', 'finish_judge'],
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'jdg_07',
    fullName: 'رشيد حماني',
    licenseNumber: 'FAA-JUDGE-2025-009',
    grade: 'federal',
    wilaya: 'الجزائر العاصمة',
    leagueId: 'lg_faa',
    phone: '+213 551 88 99 00',
    email: 'r.hamani@athletic.dz',
    status: 'isolated',
    isolatedAt: '2026-04-12T16:00:00Z',
    isolationReason: 'إجراء وقائي إداري لحين استكمال التحقيق في احتجاج السباق، مع الاحتفاظ بكافة العمليات السابقة.',
    specialties: ['starter'],
    createdAt: '2025-11-01T08:00:00Z'
  }
];

const DEFAULT_ASSIGNMENTS: JudgeAssignment[] = [
  {
    id: 'asg_01',
    competitionId: 'comp_nat_01',
    judgeId: 'jdg_01',
    judgeName: 'أحمد بن خليفة',
    judgeGrade: 'international',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100م نهائي رجال (FAT)',
    venue: 'المضمار الرئيسي • خط النهاية',
    task: 'chief_judge',
    taskTitleAr: 'الحكم العام الفيدرالي (Chief Judge)',
    scheduledStartTime: '15:00',
    scheduledEndTime: '16:00',
    date: '2026-06-25',
    dutyCode: 'DUTY-ALG-CHIEF-100M',
    status: 'active',
    assignedBy: 'الإدارة المركزية للاتحاد الجزائري',
    assignedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'asg_02',
    competitionId: 'comp_nat_01',
    judgeId: 'jdg_02',
    judgeName: 'محمد الهواري بن عمارة',
    judgeGrade: 'federal',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100م نهائي رجال (FAT)',
    venue: 'المضمار الرئيسي • خط الانطلاق',
    task: 'starter',
    taskTitleAr: 'قاضي الانطلاق (Official Starter)',
    scheduledStartTime: '15:00',
    scheduledEndTime: '15:45',
    date: '2026-06-25',
    dutyCode: 'DUTY-ALG-START-100M',
    status: 'active',
    assignedBy: 'الإدارة المركزية للاتحاد الجزائري',
    assignedAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'asg_03',
    competitionId: 'comp_nat_01',
    judgeId: 'jdg_03',
    judgeName: 'فؤاد بلحسن',
    judgeGrade: 'federal',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100م نهائي رجال (FAT)',
    venue: 'برج التوقيت الإلكتروني • Photo Finish',
    task: 'photo_finish_operator',
    taskTitleAr: 'مشغل كاميرا Photo Finish المعتمد',
    scheduledStartTime: '14:30',
    scheduledEndTime: '16:30',
    date: '2026-06-25',
    dutyCode: 'DUTY-ALG-FINISH-PFP',
    status: 'active',
    assignedBy: 'الإدارة المركزية للاتحاد الجزائري',
    assignedAt: '2026-06-01T10:00:00Z'
  }
];

const STORAGE_JUDGES_KEY = 'pfp_certified_judges_v2';
const STORAGE_ASSIGNMENTS_KEY = 'pfp_judge_assignments_v2';

export class JudgesAssignmentService {
  private inMemoryJudges: CertifiedJudge[] = [];
  private inMemoryAssignments: JudgeAssignment[] = [];

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    if (typeof localStorage === 'undefined') {
      this.inMemoryJudges = [...DEFAULT_JUDGES];
      this.inMemoryAssignments = [...DEFAULT_ASSIGNMENTS];
      return;
    }

    try {
      const storedJudges = localStorage.getItem(STORAGE_JUDGES_KEY);
      if (storedJudges) {
        this.inMemoryJudges = JSON.parse(storedJudges);
      } else {
        this.inMemoryJudges = [...DEFAULT_JUDGES];
        localStorage.setItem(STORAGE_JUDGES_KEY, JSON.stringify(DEFAULT_JUDGES));
      }

      const storedAssignments = localStorage.getItem(STORAGE_ASSIGNMENTS_KEY);
      if (storedAssignments) {
        this.inMemoryAssignments = JSON.parse(storedAssignments);
      } else {
        this.inMemoryAssignments = [...DEFAULT_ASSIGNMENTS];
        localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
      }
    } catch {
      this.inMemoryJudges = [...DEFAULT_JUDGES];
      this.inMemoryAssignments = [...DEFAULT_ASSIGNMENTS];
    }
  }

  private persist(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_JUDGES_KEY, JSON.stringify(this.inMemoryJudges));
        localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(this.inMemoryAssignments));
      } catch {}
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. DASHBOARD & KPIS (5.1)
  // ════════════════════════════════════════════════════════════════════════════

  public async getDashboardKPIs(targetCompetitionId?: string): Promise<JudgesDashboardKPIs> {
    const activeCompId = targetCompetitionId || competitionsService.getActiveCompetitionId();
    const competitions = await competitionsService.getCompetitions();

    const total = this.inMemoryJudges.length;
    const active = this.inMemoryJudges.filter(j => j.status === 'active').length;
    const isolated = this.inMemoryJudges.filter(j => j.status === 'isolated' || j.status === 'suspended').length;

    const currentCompAssignments = this.inMemoryAssignments.filter(
      a => a.competitionId === activeCompId && a.status !== 'cancelled' && a.status !== 'revoked'
    );

    const assignedJudgeIds = new Set(currentCompAssignments.map(a => a.judgeId));
    const assignedJudges = this.inMemoryJudges.filter(j => assignedJudgeIds.has(j.id) && j.status === 'active').length;
    const unassignedJudges = active - assignedJudges;

    // Disciplines needing judges (target: at least 3 official judges for sprint/run, or 2 for field)
    const disciplinesAssigned = new Set(currentCompAssignments.map(a => a.disciplineId));
    const targetComp = competitions.find(c => c.id === activeCompId);
    const totalDisciplinesCount = targetComp?.eventsCount || 6;
    const disciplinesNeedingJudges = Math.max(0, totalDisciplinesCount - disciplinesAssigned.size);

    return {
      totalJudges: total,
      activeJudges: active,
      assignedJudges,
      unassignedJudges: Math.max(0, unassignedJudges),
      suspendedOrIsolatedJudges: isolated,
      currentAssignmentsCount: currentCompAssignments.length,
      disciplinesNeedingJudges,
      activeCompetitionsCount: competitions.filter(c => c.status === 'live' || c.status === 'upcoming').length
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. JUDGES DIRECTORY & LIFECYCLE (5.6)
  // ════════════════════════════════════════════════════════════════════════════

  public getAllJudges(options?: { wilaya?: string; grade?: string; status?: string; search?: string }): CertifiedJudge[] {
    let list = [...this.inMemoryJudges];

    if (options?.status && options.status !== 'all') {
      list = list.filter(j => j.status === options.status);
    }
    if (options?.grade && options.grade !== 'all') {
      list = list.filter(j => j.grade === options.grade);
    }
    if (options?.wilaya && options.wilaya !== 'all') {
      list = list.filter(j => j.wilaya.includes(options.wilaya!));
    }
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      list = list.filter(j => 
        j.fullName.toLowerCase().includes(q) ||
        j.licenseNumber.toLowerCase().includes(q) ||
        j.wilaya.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getJudgeById(id: string): CertifiedJudge | undefined {
    return this.inMemoryJudges.find(j => j.id === id);
  }

  public async addJudge(data: Omit<CertifiedJudge, 'id' | 'createdAt'>): Promise<CertifiedJudge> {
    const id = `jdg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newJudge: CertifiedJudge = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    this.inMemoryJudges.unshift(newJudge);
    this.persist();
    return newJudge;
  }

  public async updateJudge(id: string, updates: Partial<CertifiedJudge>): Promise<CertifiedJudge> {
    const index = this.inMemoryJudges.findIndex(j => j.id === id);
    if (index === -1) throw new Error('الحكم غير موجود بالنظام');
    
    this.inMemoryJudges[index] = {
      ...this.inMemoryJudges[index],
      ...updates
    };
    this.persist();
    return this.inMemoryJudges[index];
  }

  /**
   * Isolate or suspend a judge.
   * STRICT INTEGRITY RULE: Preserves all historical marks, past results and signed PVs!
   * Automatically cancels future assignments and revokes duty access codes.
   */
  public async isolateJudge(judgeId: string, reason: string): Promise<boolean> {
    const judge = this.getJudgeById(judgeId);
    if (!judge) return false;

    judge.status = 'isolated';
    judge.isolatedAt = new Date().toISOString();
    judge.isolationReason = reason;

    // Invalidate/cancel upcoming active assignments
    this.inMemoryAssignments = this.inMemoryAssignments.map(a => {
      if (a.judgeId === judgeId && a.status === 'active') {
        return { ...a, status: 'revoked' };
      }
      return a;
    });

    this.persist();
    return true;
  }

  public async reactivateJudge(judgeId: string): Promise<boolean> {
    const judge = this.getJudgeById(judgeId);
    if (!judge) return false;

    judge.status = 'active';
    judge.isolationReason = undefined;
    judge.isolatedAt = undefined;
    this.persist();
    return true;
  }

  /**
   * Soft deletes a judge profile and moves a snapshot to the Centralized Recycle Bin
   */
  public async deleteJudge(
    judgeId: string, 
    options?: { reason?: string; deletedBy?: string; permanent?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    const judge = this.getJudgeById(judgeId);
    if (!judge) return { success: false, error: 'الحكم غير موجود بالسجل' };

    // Automatically cancel upcoming active assignments
    this.inMemoryAssignments = this.inMemoryAssignments.map(a => {
      if (a.judgeId === judgeId && a.status === 'active') {
        return { ...a, status: 'cancelled' };
      }
      return a;
    });

    if (!options?.permanent) {
      try {
        await recycleBinService.moveToRecycleBin({
          leagueId: judge.leagueId || 'lg_saida',
          entityType: 'judge',
          entityId: judge.id,
          entityName: judge.fullName,
          sourceModule: 'judges',
          payload: { ...judge },
          deletedBy: options?.deletedBy || portalAuthService.getActiveSession()?.fullName || 'مسؤول الحكام',
          reason: options?.reason || 'حذف ونقل لسلة المحذوفات'
        });
      } catch (err) {
        console.warn('[JudgesAssignmentService] Error archiving judge:', err);
      }
    }

    this.inMemoryJudges = this.inMemoryJudges.filter(j => j.id !== judgeId);
    this.persist();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pfp:judges-changed'));
    }

    return { success: true };
  }

  /**
   * Restores a deleted judge from the recycle bin
   */
  public async restoreJudge(judgeData: CertifiedJudge): Promise<CertifiedJudge> {
    const existingIndex = this.inMemoryJudges.findIndex(j => j.id === judgeData.id);
    if (existingIndex >= 0) {
      this.inMemoryJudges[existingIndex] = { ...judgeData };
    } else {
      this.inMemoryJudges.unshift({ ...judgeData });
    }
    this.persist();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pfp:judges-changed'));
    }

    return judgeData;
  }

  /**
   * Bulk deletes multiple judges
   */
  public async bulkDeleteJudges(
    judgeIds: string[], 
    options?: { reason?: string; deletedBy?: string }
  ): Promise<{ success: boolean; count: number }> {
    let count = 0;
    for (const id of judgeIds) {
      const res = await this.deleteJudge(id, options);
      if (res.success) count++;
    }
    return { success: count > 0, count };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. ASSIGNMENT MATRIX & CONFLICT DETECTION (5.4 & 5.5)
  // ════════════════════════════════════════════════════════════════════════════

  public getAssignments(competitionId?: string): JudgeAssignment[] {
    const compId = competitionId || competitionsService.getActiveCompetitionId();
    return this.inMemoryAssignments.filter(a => a.competitionId === compId);
  }

  /**
   * Detect assignment conflicts:
   * 1. Time overlap for same judge
   * 2. Duplicate assignment in same discipline
   * 3. Same judge assigned to 2 different venues at overlapping times
   */
  public checkAssignmentConflicts(
    judgeId: string,
    competitionId: string,
    date: string,
    startTime: string,
    endTime: string,
    venue: string,
    disciplineId: string,
    excludeAssignmentId?: string
  ): ConflictCheckResult {
    const result: ConflictCheckResult = {
      hasConflict: false,
      conflicts: [],
      warnings: []
    };

    const judge = this.getJudgeById(judgeId);
    if (!judge) {
      result.warnings.push('معرف الحكم غير موجود');
      return result;
    }

    if (judge.status === 'isolated' || judge.status === 'suspended') {
      result.hasConflict = true;
      result.conflicts.push({
        type: 'time_overlap',
        judgeId,
        judgeName: judge.fullName,
        message: `لا يمكن تعيين الحكم ${judge.fullName} لأنه موقوف أو معزول إداريًا (${judge.isolationReason || 'إجراء تحفظي'}).`,
        existingAssignment: {} as any
      });
      return result;
    }

    // Helper: convert HH:MM to minutes from midnight
    const toMinutes = (timeStr: string) => {
      const parts = timeStr.split(':').map(Number);
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    // Look for existing assignments on the same date for this judge
    const activeAssignments = this.inMemoryAssignments.filter(a => 
      a.judgeId === judgeId &&
      a.date === date &&
      a.status !== 'cancelled' &&
      a.status !== 'revoked' &&
      a.id !== excludeAssignmentId
    );

    for (const existing of activeAssignments) {
      const exStart = toMinutes(existing.scheduledStartTime);
      const exEnd = toMinutes(existing.scheduledEndTime);

      // 1. Duplicate check
      if (existing.disciplineId === disciplineId && existing.competitionId === competitionId) {
        result.hasConflict = true;
        result.conflicts.push({
          type: 'duplicate_assignment',
          judgeId,
          judgeName: judge.fullName,
          message: `الحكم معين بالفعل في تخصص (${existing.disciplineNameAr}) في نفس المنافسة.`,
          existingAssignment: existing
        });
      }

      // 2. Time overlap check
      const overlaps = Math.max(newStart, exStart) < Math.min(newEnd, exEnd);
      if (overlaps) {
        result.hasConflict = true;

        if (existing.venue !== venue) {
          result.conflicts.push({
            type: 'venue_conflict',
            judgeId,
            judgeName: judge.fullName,
            message: `تعارض أماكن التعيين: الحكم معين في (${existing.venue}) من ${existing.scheduledStartTime} إلى ${existing.scheduledEndTime} ولا يمكنه التواجد في (${venue}) في نفس الوقت.`,
            existingAssignment: existing
          });
        } else {
          result.conflicts.push({
            type: 'time_overlap',
            judgeId,
            judgeName: judge.fullName,
            message: `تداخل أوقات: الحكم لديه مهمة سابقة (${existing.taskTitleAr}) من ${existing.scheduledStartTime} إلى ${existing.scheduledEndTime}.`,
            existingAssignment: existing
          });
        }
      }
    }

    return result;
  }

  public async assignJudge(params: {
    competitionId: string;
    leagueId?: string;
    eventId?: string;
    assignmentRole?: string;
    assignmentStatus?: string;
    judgeId: string;
    disciplineId: string;
    disciplineNameAr: string;
    venue: string;
    task: OfficialDutyTask;
    date: string;
    startTime: string;
    endTime: string;
    forceOverride?: boolean;
  }): Promise<{ success: boolean; assignment?: JudgeAssignment; conflict?: ConflictCheckResult; error?: string }> {
    const conflict = this.checkAssignmentConflicts(
      params.judgeId,
      params.competitionId,
      params.date,
      params.startTime,
      params.endTime,
      params.venue,
      params.disciplineId
    );

    if (conflict.hasConflict && !params.forceOverride) {
      return { success: false, conflict, error: 'يوجد تعارض في مواعيد أو أماكن التعيين للحكم.' };
    }

    const judge = this.getJudgeById(params.judgeId);
    if (!judge) return { success: false, error: 'الحكم غير موجود' };

    const dutyCode = `DUTY-${params.competitionId.slice(-4).toUpperCase()}-${judge.id.slice(-4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const assignment: JudgeAssignment = {
      id: `asg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      competitionId: params.competitionId,
      leagueId: params.leagueId || 'lg_saida',
      eventId: params.eventId || params.disciplineId,
      judgeId: params.judgeId,
      judgeName: judge.fullName,
      judgeGrade: judge.grade,
      disciplineId: params.disciplineId,
      disciplineNameAr: params.disciplineNameAr,
      venue: params.venue,
      task: params.task,
      taskTitleAr: DUTY_TASKS_MAP[params.task]?.titleAr || 'حكم معتمد',
      assignmentRole: params.assignmentRole || DUTY_TASKS_MAP[params.task]?.titleAr || 'حكم معتمد',
      assignmentStatus: params.assignmentStatus || 'assigned',
      scheduledStartTime: params.startTime,
      scheduledEndTime: params.endTime,
      date: params.date,
      dutyCode,
      status: 'active',
      assignedBy: portalAuthService.getActiveSession()?.fullName || 'مسؤول المنافسة',
      assignedAt: new Date().toISOString()
    };

    this.inMemoryAssignments.push(assignment);
    this.persist();

    return { success: true, assignment };
  }

  /**
   * Bulk assign multiple judges to one or more disciplines.
   */
  public async bulkAssignJudges(params: {
    competitionId: string;
    judgeIds: string[];
    disciplineId: string;
    disciplineNameAr: string;
    venue: string;
    task: OfficialDutyTask;
    date: string;
    startTime: string;
    endTime: string;
    ignoreConflicts?: boolean;
  }): Promise<{ success: boolean; createdCount: number; conflicts: ConflictCheckResult[] }> {
    let createdCount = 0;
    const conflicts: ConflictCheckResult[] = [];

    for (const judgeId of params.judgeIds) {
      const res = await this.assignJudge({
        competitionId: params.competitionId,
        judgeId,
        disciplineId: params.disciplineId,
        disciplineNameAr: params.disciplineNameAr,
        venue: params.venue,
        task: params.task,
        date: params.date,
        startTime: params.startTime,
        endTime: params.endTime,
        forceOverride: params.ignoreConflicts
      });

      if (res.success) {
        createdCount++;
      } else if (res.conflict) {
        conflicts.push(res.conflict);
      }
    }

    return {
      success: createdCount > 0,
      createdCount,
      conflicts
    };
  }

  public async cancelAssignment(assignmentId: string): Promise<boolean> {
    const asg = this.inMemoryAssignments.find(a => a.id === assignmentId);
    if (!asg) return false;
    asg.status = 'cancelled';
    this.persist();
    return true;
  }

  /**
   * Soft deletes an assignment and archives it to the Centralized Recycle Bin
   */
  public async deleteAssignment(
    assignmentId: string, 
    options?: { reason?: string; deletedBy?: string; permanent?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    const asg = this.inMemoryAssignments.find(a => a.id === assignmentId);
    if (!asg) return { success: false, error: 'التعيين غير موجود' };

    if (!options?.permanent) {
      try {
        await recycleBinService.moveToRecycleBin({
          leagueId: asg.leagueId || 'lg_saida',
          entityType: 'assignment',
          entityId: asg.id,
          entityName: `${asg.judgeName} • ${asg.taskTitleAr} (${asg.disciplineNameAr})`,
          sourceModule: 'assignments',
          payload: { ...asg },
          deletedBy: options?.deletedBy || portalAuthService.getActiveSession()?.fullName || 'مسؤول الحكام',
          reason: options?.reason || 'حذف التعيين ونقله لسلة المحذوفات'
        });
      } catch (err) {
        console.warn('[JudgesAssignmentService] Error moving assignment to recycle bin:', err);
      }
    }

    this.inMemoryAssignments = this.inMemoryAssignments.filter(a => a.id !== assignmentId);
    this.persist();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pfp:assignments-changed'));
    }

    return { success: true };
  }

  /**
   * Restores an assignment previously moved to the recycle bin
   */
  public async restoreAssignment(asgData: JudgeAssignment): Promise<JudgeAssignment> {
    const existingIndex = this.inMemoryAssignments.findIndex(a => a.id === asgData.id);
    if (existingIndex >= 0) {
      this.inMemoryAssignments[existingIndex] = { ...asgData, status: 'active' };
    } else {
      this.inMemoryAssignments.unshift({ ...asgData, status: 'active' });
    }
    this.persist();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pfp:assignments-changed'));
    }

    return asgData;
  }

  /**
   * Bulk deletes multiple assignments
   */
  public async bulkDeleteAssignments(
    assignmentIds: string[], 
    options?: { reason?: string; deletedBy?: string }
  ): Promise<{ success: boolean; count: number }> {
    let count = 0;
    for (const id of assignmentIds) {
      const res = await this.deleteAssignment(id, options);
      if (res.success) count++;
    }
    return { success: count > 0, count };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. COMPETITION-SCOPED DUTY CODES & VERIFICATION (Section 6)
  // ════════════════════════════════════════════════════════════════════════════

  public verifyDutyCode(code: string, currentCompId?: string): { valid: boolean; duty?: CompetitionScopedDutyCode; error?: string } {
    const cleanCode = code.trim().toUpperCase();
    const asg = this.inMemoryAssignments.find(a => a.dutyCode.toUpperCase() === cleanCode);

    if (!asg) {
      return { valid: false, error: 'كود التكليف الميداني غير مسجل بالنظام.' };
    }

    const judge = this.getJudgeById(asg.judgeId);
    if (judge?.status === 'isolated' || judge?.status === 'suspended') {
      return { valid: false, error: 'تم تجميد صلاحية الكود لأن الحكم موقوف أو معزول إداريًا.' };
    }

    if (asg.status === 'cancelled' || asg.status === 'revoked') {
      return { valid: false, error: 'تم إبطال كود التكليف هذا رسميًا بسبب تعديل أو إلغاء التعيين.' };
    }

    // Check competition scope
    const targetCompId = currentCompId || competitionsService.getActiveCompetitionId();
    if (asg.competitionId !== targetCompId) {
      return { 
        valid: false, 
        error: `هذا الكود مخصص لمنافسة أخرى (${asg.competitionId}) ولا يسمح بالدخول إلى المنافسة النشطة الحالية.` 
      };
    }

    return {
      valid: true,
      duty: {
        dutyCode: asg.dutyCode,
        judgeId: asg.judgeId,
        judgeName: asg.judgeName,
        competitionId: asg.competitionId,
        assignmentId: asg.id,
        disciplineId: asg.disciplineId,
        venue: asg.venue,
        role: asg.task,
        validFrom: `${asg.date}T${asg.scheduledStartTime}:00`,
        validTo: `${asg.date}T${asg.scheduledEndTime}:00`,
        status: 'valid'
      }
    };
  }

  public async regenerateDutyCode(assignmentId: string): Promise<string> {
    const asg = this.inMemoryAssignments.find(a => a.id === assignmentId);
    if (!asg) throw new Error('التعيين غير موجود');

    const newCode = `DUTY-${asg.competitionId.slice(-4).toUpperCase()}-${asg.judgeId.slice(-4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    asg.dutyCode = newCode;
    asg.status = 'active';
    this.persist();
    return newCode;
  }
}

export const judgesAssignmentService = new JudgesAssignmentService();
