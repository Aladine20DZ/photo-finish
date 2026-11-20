/**
 * PHOTO FINISH PRO AI — Standalone Workspace Service — PHASE 3.1 «العمل المستقل»
 * عزل بالتصميم: leagueId يبقى undefined، ونطاق التخزين المستقل `pfp_standalone_workspaces_v1`
 * لا يلمس `pfp_league_*` / `pfp_judges_*`؛ تصدير/استيراد صريح = مصدر الحقيقة الوحيد؛
 * حارس localStorage مع بديل في الذاكرة (اختبارات Node/SSR/الوضع الخاص).
 */

import type { DisciplineCategoryType, JudgeAssignment, OfficialDutyTask } from './judgesAssignmentService';

export interface StandaloneAthlete {
  id: string;            // بادئة `STA-...`
  bib: string;           // رقم الصدرية
  fullName: string;
  clubName?: string;
  categoryAge?: 'SENIOR' | 'U20' | 'U18' | 'U16';
  gender?: 'M' | 'F';
}

export interface StandaloneDiscipline {
  id: string; // بادئة `SDS-...`
  nameAr: string;
  category: DisciplineCategoryType;
  taskTypes: OfficialDutyTask[];
}

export interface StandaloneWorkspace {
  id: string;                      // بادئة `STW-...`
  nameAr: string;                  // اسم مساحة العمل
  competitionTitleAr: string;
  venue: string;
  date: string;                    // ISO date string yyyy-mm-dd
  disciplines: StandaloneDiscipline[];
  athletes: StandaloneAthlete[];
  createdAt: string;               // ISO datetime
  updatedAt: string;
  /** عزل صريح — لا يُرسل هذا النمط لأي حساب رابطة تلقائياً */
  isStandalone: true;
  /** يبقى undefined دائماً في هذا النمط (يمنع خلط بيانات المستأجرين) */
  leagueId: undefined;
  notes?: string;
}

const STORAGE_KEY = 'pfp_standalone_workspaces_v1';
const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** حارس التخزين: Node/SSR أو الوضع الخاص → null مع بديل في الذاكرة */
function tryGetStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage ?? null; } catch { return null; }
}
let inMemoryWorkspaces: StandaloneWorkspace[] | null = null;
function isWorkspaceShape(value: unknown): value is StandaloneWorkspace {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as Partial<StandaloneWorkspace>;
  return typeof rec.id === 'string' && rec.id.startsWith('STW-') && typeof rec.nameAr === 'string'
    && typeof rec.competitionTitleAr === 'string' && rec.isStandalone === true
    && Array.isArray(rec.athletes) && Array.isArray(rec.disciplines);
}

function loadWorkspaces(): StandaloneWorkspace[] {
  const storage = tryGetStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      const parsed: unknown = raw === null ? null : JSON.parse(raw);
      if (Array.isArray(parsed)) inMemoryWorkspaces = parsed.filter(isWorkspaceShape);
    } catch { /* بيانات تالفة → نعتمد النسخة في الذاكرة */ }
  }
  return inMemoryWorkspaces ? [...inMemoryWorkspaces] : [];
}

function persistWorkspaces(list: StandaloneWorkspace[]): void {
  inMemoryWorkspaces = [...list];
  const storage = tryGetStorage();
  if (storage) { try { storage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* حصة ممتلئة → الذاكرة فقط */ } }
}

const randomToken = (): string =>
  Array.from({ length: 4 }, () => ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)]).join('');

const mintId = (prefix: string): string => `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomToken()}`;

function slugifyJudge(raw: string): string {
  const slug = raw.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'judge';
}

const TASK_TITLES_AR: Record<OfficialDutyTask, string> = {
  chief_judge: 'الحكم العام', deputy_chief_judge: 'مساعد الحكم العام',
  starter: 'قاضي خط البداية', recall_starter: 'قاضي الاستدعاء',
  chief_finish_judge: 'رئيس قضاة خط النهاية', finish_judge: 'قاضي خط النهاية',
  photo_finish_operator: 'مشغل كاميرا الفوتو فينيش', wind_gauge_operator: 'مشغل مقياس الرياح',
  chief_field_jumps: 'رئيس حكام الوثب', field_judge_jumps: 'حكم مسابقات الوثب',
  chief_field_throws: 'رئيس حكام الرمي', field_judge_throws: 'حكم مسابقات الرمي',
  call_room_chief: 'مسؤول غرفة النداء', timekeeper: 'مسجل التوقيت', secretary: 'كاتب المحضر والنتائج',
};

const cloneWorkspace = (ws: StandaloneWorkspace): StandaloneWorkspace => ({
  ...ws, athletes: ws.athletes.map((a) => ({ ...a })), disciplines: ws.disciplines.map((d) => ({ ...d, taskTypes: [...d.taskTypes] })),
});

const isAgeCategory = (v: unknown): v is 'SENIOR' | 'U20' | 'U18' | 'U16' => v === 'SENIOR' || v === 'U20' || v === 'U18' || v === 'U16';
const isGender = (v: unknown): v is 'M' | 'F' => v === 'M' || v === 'F';

const DISCIPLINE_CATEGORIES: readonly DisciplineCategoryType[] = ['jumps_horizontal', 'jumps_vertical', 'throws', 'running', 'checkpoint'];

function normalizeAthletes(value: unknown[]): StandaloneAthlete[] {
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const rec = item as Partial<StandaloneAthlete>;
    if (typeof rec.id !== 'string' || typeof rec.bib !== 'string' || typeof rec.fullName !== 'string') return [];
    return [{
      id: rec.id, bib: rec.bib, fullName: rec.fullName, clubName: typeof rec.clubName === 'string' ? rec.clubName : undefined,
      categoryAge: isAgeCategory(rec.categoryAge) ? rec.categoryAge : undefined, gender: isGender(rec.gender) ? rec.gender : undefined,
    }];
  });
}

function normalizeDisciplines(value: unknown[]): StandaloneDiscipline[] {
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const rec = item as Partial<StandaloneDiscipline>;
    if (typeof rec.id !== 'string' || typeof rec.nameAr !== 'string') return [];
    const category = DISCIPLINE_CATEGORIES.find((c) => c === rec.category);
    const taskTypes = Array.isArray(rec.taskTypes)
      ? rec.taskTypes.filter((t): t is OfficialDutyTask => typeof t === 'string' && Object.prototype.hasOwnProperty.call(TASK_TITLES_AR, t))
      : [];
    return [{ id: rec.id, nameAr: rec.nameAr, category: category ?? 'running', taskTypes }];
  });
}

export class StandaloneWorkspaceService {
  createWorkspace(input: { nameAr: string; competitionTitleAr: string; venue: string; date: string; notes?: string }): StandaloneWorkspace {
    const now = new Date().toISOString();
    const workspace: StandaloneWorkspace = {
      id: mintId('STW'), nameAr: input.nameAr, competitionTitleAr: input.competitionTitleAr,
      venue: input.venue, date: input.date, disciplines: [], athletes: [],
      createdAt: now, updatedAt: now, isStandalone: true, leagueId: undefined, notes: input.notes,
    };
    const all = loadWorkspaces();
    all.push(workspace);
    persistWorkspaces(all);
    return cloneWorkspace(workspace);
  }

  listWorkspaces(): StandaloneWorkspace[] {
    return loadWorkspaces()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map(cloneWorkspace);
  }

  getWorkspace(id: string): StandaloneWorkspace | null {
    const found = loadWorkspaces().find((w) => w.id === id);
    return found ? cloneWorkspace(found) : null;
  }

  updateWorkspace(id: string, patch: Partial<Pick<StandaloneWorkspace, 'nameAr' | 'competitionTitleAr' | 'venue' | 'date' | 'notes'>>): StandaloneWorkspace | null {
    const all = loadWorkspaces();
    const current = all.find((w) => w.id === id);
    if (!current) return null;
    if (patch.nameAr !== undefined) current.nameAr = patch.nameAr;
    if (patch.competitionTitleAr !== undefined) current.competitionTitleAr = patch.competitionTitleAr;
    if (patch.venue !== undefined) current.venue = patch.venue;
    if (patch.date !== undefined) current.date = patch.date;
    if (patch.notes !== undefined) current.notes = patch.notes;
    current.updatedAt = new Date().toISOString();
    persistWorkspaces(all);
    return cloneWorkspace(current);
  }

  /** حذف نهائي صريح (لا حذف ناعم) — العمل المستقل محلي على الجهاز بالتعريف */
  deleteWorkspace(id: string): boolean {
    const all = loadWorkspaces();
    const next = all.filter((w) => w.id !== id);
    if (next.length === all.length) return false;
    persistWorkspaces(next);
    return true;
  }

  /** يضيف رياضياً مع منع تكرار رقم الصدرية داخل نفس المساحة */
  addAthlete(workspaceId: string, input: Omit<StandaloneAthlete, 'id'>): StandaloneAthlete | null {
    const all = loadWorkspaces();
    const ws = all.find((w) => w.id === workspaceId);
    if (!ws) return null;
    const bib = input.bib.trim();
    if (bib.length === 0 || ws.athletes.some((a) => a.bib === bib)) return null;
    const athlete: StandaloneAthlete = {
      id: mintId('STA'), bib, fullName: input.fullName,
      clubName: input.clubName, categoryAge: input.categoryAge, gender: input.gender,
    };
    ws.athletes.push(athlete);
    ws.updatedAt = new Date().toISOString();
    persistWorkspaces(all);
    return { ...athlete };
  }

  removeAthlete(workspaceId: string, athleteId: string): boolean {
    const all = loadWorkspaces();
    const ws = all.find((w) => w.id === workspaceId);
    if (!ws) return false;
    const next = ws.athletes.filter((a) => a.id !== athleteId);
    if (next.length === ws.athletes.length) return false;
    ws.athletes = next;
    ws.updatedAt = new Date().toISOString();
    persistWorkspaces(all);
    return true;
  }

  /** يضيف سلباً مع منع تكرار الاسم العربي داخل نفس المساحة */
  addDiscipline(
    workspaceId: string, nameAr: string, category: DisciplineCategoryType, taskTypes: OfficialDutyTask[],
  ): StandaloneDiscipline | null {
    const all = loadWorkspaces();
    const ws = all.find((w) => w.id === workspaceId);
    if (!ws) return null;
    const trimmed = nameAr.trim();
    if (trimmed.length === 0 || ws.disciplines.some((d) => d.nameAr === trimmed)) return null;
    const discipline: StandaloneDiscipline = { id: mintId('SDS'), nameAr: trimmed, category, taskTypes: [...taskTypes] };
    ws.disciplines.push(discipline);
    ws.updatedAt = new Date().toISOString();
    persistWorkspaces(all);
    return { ...discipline, taskTypes: [...discipline.taskTypes] };
  }

  removeDiscipline(workspaceId: string, disciplineId: string): boolean {
    const all = loadWorkspaces();
    const ws = all.find((w) => w.id === workspaceId);
    if (!ws) return false;
    const next = ws.disciplines.filter((d) => d.id !== disciplineId);
    if (next.length === ws.disciplines.length) return false;
    ws.disciplines = next;
    ws.updatedAt = new Date().toISOString();
    persistWorkspaces(all);
    return true;
  }

  /** يبني تعييناً بشكل JudgeAssignment بمعرّفات مستقلة تماماً عن الرابطة */
  buildLocalAssignment(
    workspace: StandaloneWorkspace, disciplineId: string, judgeName: string, task: OfficialDutyTask,
  ): JudgeAssignment | null {
    const discipline = workspace.disciplines.find((d) => d.id === disciplineId);
    if (!discipline) return null;
    return {
      id: mintId('ASG-STW'), competitionId: workspace.id,
      leagueId: undefined, // عزل صريح: لا مستأجر رابطة هنا
      judgeId: `JUD-LOCAL-${slugifyJudge(judgeName)}`, judgeName,
      judgeGrade: 'candidate', // حكم محلي بلا رخصة اتحادية في النمط المستقل
      disciplineId: discipline.id, disciplineNameAr: discipline.nameAr, disciplineCategory: discipline.category,
      venue: workspace.venue, task,
      taskTitleAr: TASK_TITLES_AR[task] ?? task,
      assignmentRole: 'standalone',
      permissions: { canRecord: true, canEdit: true, canCertify: false, canDelete: true, canApprove: false },
      assignmentStatus: 'active',
      scheduledStartTime: `${workspace.date}T00:00:00.000Z`, scheduledEndTime: `${workspace.date}T23:59:59.999Z`,
      date: workspace.date, dutyCode: `LOCAL-${workspace.id}`,
      status: 'active', assignedBy: 'local', assignedAt: new Date().toISOString(),
    };
  }

  /** ملف التصدير = مصدر الحقيقة الوحيد للنسخ الاحتياطي (JSON منسّق بـ2 مسافة) */
  exportWorkspace(id: string): string | null {
    const ws = this.getWorkspace(id);
    return ws ? JSON.stringify(ws, null, 2) : null;
  }

  importWorkspace(json: string, opts?: { onConflictRename?: boolean }): { ok: boolean; workspace?: StandaloneWorkspace; error?: string } {
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch {
      return { ok: false, error: 'ملف الاستيراد ليس JSON صالحاً' };
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'بنية ملف الاستيراد غير صالحة' };
    }
    const rec = parsed as Partial<StandaloneWorkspace>;
    if (typeof rec.id !== 'string' || !rec.id.startsWith('STW-') || rec.isStandalone !== true ||
      typeof rec.nameAr !== 'string' || rec.nameAr.trim().length === 0 ||
      typeof rec.competitionTitleAr !== 'string' || rec.competitionTitleAr.trim().length === 0 ||
      !Array.isArray(rec.athletes) || !Array.isArray(rec.disciplines)) {
      return { ok: false, error: 'الملف لا يطابق بنية مساحة عمل مستقلة (STW)' };
    }
    const nowIso = new Date().toISOString();
    const imported: StandaloneWorkspace = {
      id: rec.id, nameAr: rec.nameAr, competitionTitleAr: rec.competitionTitleAr,
      venue: typeof rec.venue === 'string' ? rec.venue : '', date: typeof rec.date === 'string' ? rec.date : nowIso.slice(0, 10),
      disciplines: normalizeDisciplines(rec.disciplines), athletes: normalizeAthletes(rec.athletes),
      createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : nowIso, updatedAt: nowIso,
      isStandalone: true, leagueId: undefined, // عزل بالتصميم: الاستيراد لا يحمل أي معرّف رابطة
      notes: typeof rec.notes === 'string' ? rec.notes : undefined,
    };
    const all = loadWorkspaces();
    if (all.some((w) => w.id === imported.id)) {
      if (opts?.onConflictRename === true) {
        imported.id = `STW-IMP-${Date.now().toString(36).toUpperCase()}-${randomToken()}`;
        imported.leagueId = undefined; // تصفية صريحة لأي معرّف رابطة عند إعادة التسمية
      } else {
        return { ok: false, error: `تعارض المعرّف: توجد مساحة عمل محلية بنفس المعرّف (${imported.id})` };
      }
    }
    all.push(imported);
    persistWorkspaces(all);
    return { ok: true, workspace: cloneWorkspace(imported) };
  }

  /** يقرأ نطاق التخزين المستقل فقط — لا يلمس pfp_league_* / pfp_judges_* */
  getIsolationAudit(): { namespaces: string[]; standaloneCount: number; anyLeagueLeak: boolean } {
    const all = loadWorkspaces();
    return { namespaces: [STORAGE_KEY], standaloneCount: all.length, anyLeagueLeak: all.some((w) => w.leagueId !== undefined) };
  }
}

export const standaloneWorkspaceService = new StandaloneWorkspaceService();
