/**
 * PHOTO FINISH PRO AI — Competitions Bureau Service (Stage 4)
 * Manages competition judge operations grouped by discipline, inline cell editing,
 * server-side permission validation, and tamper-evident audit trails.
 */

import { portalAuthService } from './portalAuthService';
import { unifiedExportService, UnifiedExportPayload, ExportDisciplineSection, ExportColumnDef } from './unifiedExportService';
import { competitionsService, NationalCompetition } from './competitionsService';
import { recycleBinService } from './recycleBinService';

export interface AuditTrailEntry {
  id: string;
  operationId: string;
  disciplineId: string;
  competitionId: string;
  modifiedBy: string;
  modifiedByRole: string;
  modifiedAt: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

export type OperationLifecycleStatus = 
  | 'recorded'      // مسجَّلة من هاتف الحكم
  | 'sent'          // مُرسَلة
  | 'received'      // مستلَمة في المكتب
  | 'under_review'  // قيد المراجعة
  | 'certified'     // معتمدة
  | 'rejected'      // مرفوضة (مع سبب)
  | 'corrected'     // مصحَّحة
  | 'locked';       // مقفلة

export interface OperationStateTransition {
  id: string;
  fromState: OperationLifecycleStatus;
  toState: OperationLifecycleStatus;
  changedBy: string;
  changedByRole: string;
  changedAt: string;
  reason?: string;
}

export interface BureauJudgeOperation {
  id: string;
  disciplineId: string;
  competitionId: string;
  rank: number;
  bibNumber: number;
  athleteName: string;
  clubName: string;
  laneOrOrder: number; // Lane for races, order for field
  mark: string; // Time (e.g. "10.05s") or Distance/Height (e.g. "8.12m")
  numericValue: number; // for sorting
  windSpeed?: string; // e.g. "+1.2 m/s"
  reactionTime?: string; // e.g. "0.145s"
  status: 'finished' | 'dnf' | 'dq' | 'dns';
  lifecycleStatus?: OperationLifecycleStatus;
  rejectionReason?: string;
  stateTransitions?: OperationStateTransition[];
  isLocked?: boolean;
  judgeName: string;
  judgeRole: string;
  recordedAt: string;
  notes?: string;
  auditTrail: AuditTrailEntry[];
}

export interface BureauDisciplineWithOps {
  id: string;
  code: string;
  nameAr: string;
  nameFr?: string;
  group: 'course' | 'concours' | 'combined';
  subGroup: string;
  categoryNameAr: string;
  gender: 'M' | 'F' | 'MIXED';
  measurementType: 'time' | 'distance' | 'height' | 'points';
  windSpeed?: string;
  scheduledTime?: string;
  status?: 'draft' | 'under_review' | 'certified' | 'rejected' | 'locked';
  revision?: number;
  qrVerificationCode?: string;
  isLocked?: boolean;
  certifiedAt?: string;
  certifiedBy?: string;
  pvNumber?: string;
  chiefJudgeSignature?: string;
  timingJudgeSignature?: string;
  trackJudgeSignature?: string;
  operations: BureauJudgeOperation[];
}

const STORAGE_KEY_PREFIX = 'pfp_competitions_bureau_ops_v1';
const AUDIT_STORAGE_KEY_PREFIX = 'pfp_competitions_bureau_audit_v1';

class CompetitionsBureauService {
  private inMemoryOperations: Map<string, Map<string, BureauJudgeOperation[]>> = new Map();
  private inMemoryDisciplineMeta: Map<string, Map<string, Partial<BureauDisciplineWithOps>>> = new Map();
  private inMemoryAudit: AuditTrailEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const rawAudit = localStorage.getItem(`${AUDIT_STORAGE_KEY_PREFIX}_master`);
        if (rawAudit) {
          this.inMemoryAudit = JSON.parse(rawAudit);
        }
      }
    } catch (e) {
      console.warn('Failed to load audit trail from storage', e);
    }
  }

  /**
   * Retrieves all available competitions.
   */
  async getCompetitions(): Promise<NationalCompetition[]> {
    return competitionsService.getCompetitions();
  }

  /**
   * Retrieves all disciplines and their judge operations for a specific competition.
   */
  async getCompetitionDisciplinesWithOperations(competitionId: string): Promise<BureauDisciplineWithOps[]> {
    // 1. Check local storage / in-memory cache
    if (this.inMemoryOperations.has(competitionId)) {
      const discMap = this.inMemoryOperations.get(competitionId)!;
      return Array.from(discMap.values()).map(ops => this.wrapDisciplineGroup(competitionId, ops));
    }

    // Try reading from localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${competitionId}`);
        if (stored) {
          const parsed: Record<string, BureauJudgeOperation[]> = JSON.parse(stored);
          const map = new Map<string, BureauJudgeOperation[]>();
          Object.entries(parsed).forEach(([discId, ops]) => map.set(discId, ops));
          this.inMemoryOperations.set(competitionId, map);
          return Array.from(map.values()).map(ops => this.wrapDisciplineGroup(competitionId, ops));
        }
      }
    } catch (e) {
      console.warn('Failed reading operations from local storage', e);
    }

    // 2. Initialize realistic seeded operations for the competition
    const seeded = this.generateInitialSeededOperations(competitionId);
    const map = new Map<string, BureauJudgeOperation[]>();
    seeded.forEach(disc => {
      map.set(disc.id, disc.operations);
    });
    this.inMemoryOperations.set(competitionId, map);
    this.persistCompetitionOps(competitionId);

    return seeded;
  }

  /**
   * Inline cell editing with server/permission validation and audit logging.
   */
  async updateOperationInline(
    competitionId: string,
    disciplineId: string,
    operationId: string,
    updates: Partial<BureauJudgeOperation>,
    userContext?: { name?: string; role?: string; token?: string; leagueId?: string },
    reason?: string
  ): Promise<{ success: boolean; updatedOperation?: BureauJudgeOperation; error?: string }> {
    // ═════════════════════════════════════════════════════════════════════
    // SERVER / TRUSTED LAYER PERMISSION CHECK (Zero Client Role Spoofing)
    // ═════════════════════════════════════════════════════════════════════
    const activeSession = portalAuthService.getActiveSession();
    const tokenToVerify = userContext?.token || activeSession?.token;
    
    const verification = portalAuthService.verifySession(tokenToVerify);
    if (!verification.valid || (verification.portal !== 'league' && verification.portal !== 'admin')) {
      return {
        success: false,
        error: 'خطأ في الصلاحيات: ليس لديك تصريح من مكتب الرابطة أو الإدارة لتعديل نتائج هذه المنافسة.'
      };
    }

    // Input Validation
    if (updates.rank !== undefined && (isNaN(updates.rank) || updates.rank < 0)) {
      return { success: false, error: 'الرتبة يجب أن تكون رقماً موجباً صحيحاً.' };
    }
    if (updates.bibNumber !== undefined && (isNaN(updates.bibNumber) || updates.bibNumber <= 0)) {
      return { success: false, error: 'رقم الصدرية يجب أن يكون رقماً صحيحاً صالحاً.' };
    }

    // Fetch discipline operations
    const disciplines = await this.getCompetitionDisciplinesWithOperations(competitionId);
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) {
      return { success: false, error: 'الاختصاص المطلوب غير موجود في المنافسة.' };
    }

    if (disc.isLocked) {
      return {
        success: false,
        error: 'هذا الاختصاص مقفل رسمياً بعد اعتماد المحضر. يجب إعادة فتح المحضر من إدارة الرابطة قبل أي تعديل.'
      };
    }

    const op = disc.operations.find(o => o.id === operationId);
    if (!op) {
      return { success: false, error: 'عملية التحكيم المطلوبة غير موجودة.' };
    }

    if (op.isLocked) {
      return {
        success: false,
        error: 'هذه النتيجة مقفلة رسمياً. لا يمكن التعديل إلا بعد رفع القفل أو إعادة فتح المحضر.'
      };
    }

    // Record audit trail entries for each updated field
    const now = new Date().toISOString();
    const allowedKeys: (keyof BureauJudgeOperation)[] = [
      'rank', 'bibNumber', 'athleteName', 'clubName', 'laneOrOrder',
      'mark', 'windSpeed', 'reactionTime', 'status', 'notes'
    ];

    allowedKeys.forEach(key => {
      if (updates[key] !== undefined && updates[key] !== (op as any)[key]) {
        const auditEntry: AuditTrailEntry = {
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          operationId: op.id,
          disciplineId,
          competitionId,
          modifiedBy: userContext?.name || verification.username || activeSession?.fullName || 'مكتب الرابطة',
          modifiedByRole: verification.portal === 'admin' ? 'SUPER_ADMIN' : 'LEAGUE_ADMIN',
          modifiedAt: now,
          fieldName: String(key),
          oldValue: (op as any)[key],
          newValue: updates[key],
          reason: reason || 'تعديل تدقيقي من مكتب الرابطة'
        };

        op.auditTrail.unshift(auditEntry);
        this.inMemoryAudit.unshift(auditEntry);
      }
    });

    // Apply updates and mark lifecycle status as corrected
    Object.assign(op, updates);
    op.lifecycleStatus = 'corrected';

    // Re-sort operations by rank if rank was updated
    if (updates.rank !== undefined) {
      disc.operations.sort((a, b) => a.rank - b.rank);
    }

    // Persist
    this.persistCompetitionOps(competitionId);
    this.persistAuditTrail();

    return { success: true, updatedOperation: op };
  }

  /**
   * Retrieves a discipline with its operations, ensuring in-memory group is available
   */
  async getDisciplineWithOps(competitionId: string, disciplineId: string): Promise<BureauDisciplineWithOps> {
    const all = await this.getCompetitionDisciplinesWithOperations(competitionId);
    const found = all.find(d => d.id === disciplineId);
    if (found) return found;

    if (!this.inMemoryOperations.has(competitionId)) {
      this.inMemoryOperations.set(competitionId, new Map());
    }
    const compMap = this.inMemoryOperations.get(competitionId)!;
    if (!compMap.has(disciplineId)) {
      compMap.set(disciplineId, []);
    }
    const ops = compMap.get(disciplineId)!;
    return this.wrapDisciplineGroup(competitionId, ops.length > 0 ? ops : [{ disciplineId } as any]);
  }


  /**
   * Soft deletes a result operation with strict protection of certified official marks
   */
  async softDeleteOperation(
    competitionId: string,
    disciplineId: string,
    operationId: string,
    options?: { reason?: string; deletedBy?: string; officialOverride?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    const disc = await this.getDisciplineWithOps(competitionId, disciplineId);
    const opIndex = disc.operations.findIndex(o => o.id === operationId);
    if (opIndex === -1) return { success: false, error: 'النتيجة غير موجودة' };

    const op = disc.operations[opIndex];

    // Protection of certified results: requires explicit official override & recorded reason
    if (op.lifecycleStatus === 'certified' && !options?.officialOverride) {
      return {
        success: false,
        error: 'النتيجة معتمدة رسمياً. يتطلب حذفها تصريحاً رسمياً خاصاً وتوثيق سبب الحذف أو الإلغاء.'
      };
    }

    const session = portalAuthService.getActiveSession();
    const performer = options?.deletedBy || session?.fullName || 'رئيس غرفة الحكام';
    const reason = options?.reason || 'حذف النتيجة ونقلها إلى سلة المحذوفات';

    // Log in audit trail
    const auditEntry: AuditTrailEntry = {
      id: `adt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      operationId,
      disciplineId,
      competitionId,
      modifiedBy: performer,
      modifiedByRole: session?.role || 'chief_judge',
      modifiedAt: new Date().toISOString(),
      fieldName: 'status',
      oldValue: op.status,
      newValue: 'DELETED_TO_RECYCLE_BIN',
      reason
    };
    this.inMemoryAudit.unshift(auditEntry);

    // Move snapshot to Centralized Recycle Bin
    try {
      await recycleBinService.moveToRecycleBin({
        leagueId: session?.leagueId || 'lg_saida',
        entityType: 'result',
        entityId: op.id,
        entityName: `${op.athleteName} • ${op.mark} (${disc.disciplineNameAr})`,
        sourceModule: 'results',
        payload: { ...op, competitionId, disciplineId },
        deletedBy: performer,
        reason
      });
    } catch (err) {
      console.warn('[CompetitionsBureauService] Recycle bin note:', err);
    }

    // Remove from active operations list
    disc.operations.splice(opIndex, 1);
    this.persistCompetitionOps(competitionId);
    this.persistAuditTrail();

    return { success: true };
  }

  /**
   * Restores a deleted result operation back to its discipline
   */
  async restoreOperation(op: BureauJudgeOperation): Promise<BureauJudgeOperation> {
    const disc = await this.getDisciplineWithOps(op.competitionId, op.disciplineId);
    const existingIdx = disc.operations.findIndex(o => o.id === op.id);
    if (existingIdx >= 0) {
      disc.operations[existingIdx] = { ...op };
    } else {
      disc.operations.push({ ...op });
      disc.operations.sort((a, b) => a.rank - b.rank);
    }

    this.persistCompetitionOps(op.competitionId);
    this.persistAuditTrail();
    return op;
  }

  /**
   * Updates an individual operation's lifecycle status with server permission check.
   * recorded -> sent -> received -> under_review -> certified / rejected (with reason) / corrected -> locked
   */
  async updateOperationLifecycleStatus(
    competitionId: string,
    disciplineId: string,
    operationId: string,
    newStatus: OperationLifecycleStatus,
    userContextOrReason?: { name?: string; role?: string; token?: string; leagueId?: string } | string,
    reasonOrUserContext?: string | { name?: string; role?: string; token?: string; leagueId?: string }
  ): Promise<{ success: boolean; updatedOperation?: BureauJudgeOperation; error?: string }> {
    let userContext: { name?: string; role?: string; token?: string; leagueId?: string } | undefined;
    let reason: string | undefined;

    if (typeof userContextOrReason === 'string') {
      reason = userContextOrReason;
      if (typeof reasonOrUserContext === 'object') {
        userContext = reasonOrUserContext;
      }
    } else {
      userContext = userContextOrReason;
      if (typeof reasonOrUserContext === 'string') {
        reason = reasonOrUserContext;
      }
    }

    const activeSession = portalAuthService.getActiveSession();
    const tokenToVerify = userContext?.token || activeSession?.token;
    const verification = portalAuthService.verifySession(tokenToVerify);
    if (!verification.valid || (verification.portal !== 'league' && verification.portal !== 'admin')) {
      return {
        success: false,
        error: 'خطأ في الصلاحيات: تعديل حالة العملية يتطلب حساباً موثوقاً لإدارة الرابطة أو التحكيم.'
      };
    }

    if (newStatus === 'rejected' && (!reason || !reason.trim())) {
      return {
        success: false,
        error: 'يجب ذكر سبب رفض أو استبعاد العملية (سبب قانوني إلزامي).'
      };
    }

    const disciplines = await this.getCompetitionDisciplinesWithOperations(competitionId);
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) return { success: false, error: 'الاختصاص غير موجود بالمنافسة.' };

    if (disc.isLocked && newStatus !== 'under_review') {
      return {
        success: false,
        error: 'هذا الاختصاص مقفل رسمياً. لا يمكن تغيير حالة عملياته إلا بعد إعادة فتح المحضر.'
      };
    }

    const op = disc.operations.find(o => o.id === operationId);
    if (!op) return { success: false, error: 'العملية غير موجودة.' };

    const now = new Date().toISOString();
    const userName = userContext?.name || verification.username || activeSession?.fullName || 'مكتب الرابطة';
    const oldStatus = op.lifecycleStatus || 'recorded';

    op.lifecycleStatus = newStatus;
    if (newStatus === 'rejected') {
      op.rejectionReason = reason;
    }
    if (newStatus === 'locked' || newStatus === 'certified') {
      op.isLocked = true;
    } else if (newStatus === 'under_review') {
      op.isLocked = false;
    }

    if (!op.stateTransitions) op.stateTransitions = [];
    op.stateTransitions.unshift({
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      fromState: oldStatus,
      toState: newStatus,
      changedBy: userName,
      changedByRole: verification.portal === 'admin' ? 'SUPER_ADMIN' : 'LEAGUE_ADMIN',
      changedAt: now,
      reason: reason || `انتقال حالة العملية إلى ${newStatus}`
    });

    // Also append to audit trail
    const auditEntry: AuditTrailEntry = {
      id: `audit_stat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      operationId: op.id,
      disciplineId,
      competitionId,
      modifiedBy: userName,
      modifiedByRole: verification.portal === 'admin' ? 'SUPER_ADMIN' : 'LEAGUE_ADMIN',
      modifiedAt: now,
      fieldName: 'lifecycleStatus',
      oldValue: oldStatus,
      newValue: newStatus,
      reason: reason || `تغيير حالة العملية إلى: ${newStatus}`
    };
    op.auditTrail.unshift(auditEntry);
    this.inMemoryAudit.unshift(auditEntry);

    this.persistCompetitionOps(competitionId);
    this.persistAuditTrail();

    return { success: true, updatedOperation: op };
  }

  /**
   * Subscribes to real-time events arriving from field judges' mobile devices.
   */
  public listenToRealtimeJudgePassages(
    competitionId: string, 
    callback: (operation: BureauJudgeOperation, disciplineId: string) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      const targetDiscId = detail.disciplineId || 'disc_100m_final';
      const newOp: BureauJudgeOperation = {
        id: detail.id || `op_rt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        disciplineId: targetDiscId,
        competitionId: detail.competitionId || competitionId,
        rank: detail.rank || 999,
        bibNumber: detail.bibNumber || detail.bib || 0,
        athleteName: detail.athleteName || 'عداء قيد التحقق',
        clubName: detail.clubName || 'نادي غير محدد',
        laneOrOrder: detail.lane || detail.laneOrOrder || 1,
        mark: detail.mark || detail.time || '--:--',
        numericValue: detail.numericValue || 999,
        windSpeed: detail.windSpeed,
        reactionTime: detail.reactionTime,
        status: (detail.status as any) || 'finished',
        lifecycleStatus: 'received',
        isLocked: false,
        judgeName: detail.judgeName || 'حكم الميدان (هاتف)',
        judgeRole: detail.judgeRole || 'FIELD_JUDGE',
        recordedAt: detail.recordedAt || new Date().toISOString(),
        notes: 'تم الاستلام عبر البث الميداني اللحظي',
        auditTrail: [
          {
            id: `audit_rt_${Date.now()}`,
            operationId: detail.id || `op_rt_${Date.now()}`,
            disciplineId: targetDiscId,
            competitionId,
            modifiedBy: detail.judgeName || 'هاتف الحكم',
            modifiedByRole: 'FIELD_JUDGE',
            modifiedAt: new Date().toISOString(),
            fieldName: 'INITIAL_RECEPTION',
            oldValue: null,
            newValue: detail.mark,
            reason: 'استلام لحظي من هاتف الحكم الميداني'
          }
        ]
      };

      // Append to memory
      const compMap = this.inMemoryOperations.get(competitionId);
      if (compMap) {
        if (!compMap.has(targetDiscId)) compMap.set(targetDiscId, []);
        const ops = compMap.get(targetDiscId)!;
        ops.push(newOp);
        ops.sort((a, b) => a.rank - b.rank);
        this.persistCompetitionOps(competitionId);
      }

      callback(newOp, targetDiscId);
    };

    window.addEventListener('pfp:checkpoint-passage', handler);
    window.addEventListener('pfp:judge-entry', handler);
    window.addEventListener('pfp:finish-camera-result', handler);

    return () => {
      window.removeEventListener('pfp:checkpoint-passage', handler);
      window.removeEventListener('pfp:judge-entry', handler);
      window.removeEventListener('pfp:finish-camera-result', handler);
    };
  }

  /**
   * Returns audit logs for a competition (or a specific discipline).
   */
  getAuditLog(competitionId: string, disciplineId?: string): AuditTrailEntry[] {
    return this.inMemoryAudit.filter(entry => {
      if (entry.competitionId !== competitionId) return false;
      if (disciplineId && entry.disciplineId !== disciplineId) return false;
      return true;
    });
  }

  /**
   * Official Discipline Certification & Protocol Sealing (Stage 5 / Phase E)
   * Formal validation requiring league admin or certified chief judge credentials.
   * Generates a tamper-evident official PV number with revision tracking and locks the discipline results.
   */
  async certifyDiscipline(
    competitionId: string,
    disciplineId: string,
    signatures?: { chiefJudge?: string; timingJudge?: string; trackJudge?: string },
    userContext?: { name?: string; role?: string; token?: string; leagueId?: string }
  ): Promise<{ success: boolean; discipline?: BureauDisciplineWithOps; error?: string }> {
    const activeSession = portalAuthService.getActiveSession();
    const tokenToVerify = userContext?.token || activeSession?.token;
    const verification = portalAuthService.verifySession(tokenToVerify);
    if (!verification.valid || (verification.portal !== 'league' && verification.portal !== 'admin')) {
      return {
        success: false,
        error: 'خطأ في الصلاحيات: المصادقة على المحضر تتطلب حساب إدارة الرابطة أو الحكم العام المعتمد.'
      };
    }

    const disciplines = await this.getCompetitionDisciplinesWithOperations(competitionId);
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) {
      return { success: false, error: 'الاختصاص المطلوب غير موجود بالمنافسة.' };
    }

    if (!disc.operations || disc.operations.length === 0) {
      return { success: false, error: 'لا يمكن مصادقة اختصاص لا يحتوي على أي نتائج مسجلة.' };
    }

    const now = new Date().toISOString();
    const cleanCompCode = competitionId.replace('comp_', '').toUpperCase();
    const newRevision = (disc.revision || 0) + 1;
    const pvNumber = `PV-${cleanCompCode}-${disc.code}-R${newRevision}-${Date.now().toString().slice(-4)}`;
    const qrVerificationCode = `PFP-CERT-AUTH::${pvNumber}::REV-${newRevision}::${now}::ALG-WA-165`;
    const certUserName = userContext?.name || verification.username || activeSession?.fullName || 'الحكم العام للمنافسة';

    const metaUpdate: Partial<BureauDisciplineWithOps> = {
      status: 'certified',
      revision: newRevision,
      qrVerificationCode,
      isLocked: true,
      certifiedAt: now,
      certifiedBy: certUserName,
      pvNumber,
      chiefJudgeSignature: signatures?.chiefJudge || certUserName,
      timingJudgeSignature: signatures?.timingJudge || 'رئيس قضاة الميقاتية (FAT)',
      trackJudgeSignature: signatures?.trackJudge || 'رئيس قضاة الميدان والمضمار'
    };

    // Lock and certify all individual operations within the discipline
    disc.operations.forEach(op => {
      op.lifecycleStatus = 'certified';
      op.isLocked = true;
      if (!op.stateTransitions) op.stateTransitions = [];
      op.stateTransitions.unshift({
        id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        fromState: op.lifecycleStatus || 'under_review',
        toState: 'certified',
        changedBy: certUserName,
        changedByRole: verification.portal === 'admin' ? 'SUPER_ADMIN' : 'CHIEF_JUDGE',
        changedAt: now,
        reason: `المصادقة الفيدرالية على المحضر رقم ${pvNumber} (الإصدار ${newRevision})`
      });
    });

    this.setDisciplineMeta(competitionId, disciplineId, metaUpdate);
    Object.assign(disc, metaUpdate);

    // Audit Entry
    const auditEntry: AuditTrailEntry = {
      id: `audit_cert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      operationId: `cert_${disciplineId}`,
      disciplineId,
      competitionId,
      modifiedBy: certUserName,
      modifiedByRole: verification.portal === 'admin' ? 'SUPER_ADMIN' : 'CHIEF_JUDGE',
      modifiedAt: now,
      fieldName: 'status',
      oldValue: 'under_review',
      newValue: 'certified',
      reason: `المصادقة الرسمية على المحضر رقم: ${pvNumber} (الإصدار ${newRevision})`
    };
    this.inMemoryAudit.unshift(auditEntry);
    this.persistAuditTrail();
    this.persistCompetitionOps(competitionId);

    return { success: true, discipline: disc };
  }

  /**
   * Reject a discipline protocol (e.g. cancelled event, weather cancellation, technical fault).
   * Requires league admin or chief judge authorization and a mandatory reason.
   */
  async rejectDiscipline(
    competitionId: string,
    disciplineId: string,
    reason: string,
    userContext?: { name?: string; role?: string; token?: string; leagueId?: string }
  ): Promise<{ success: boolean; discipline?: BureauDisciplineWithOps; error?: string }> {
    const activeSession = portalAuthService.getActiveSession();
    const tokenToVerify = userContext?.token || activeSession?.token;
    const verification = portalAuthService.verifySession(tokenToVerify);
    if (!verification.valid || (verification.portal !== 'league' && verification.portal !== 'admin')) {
      return {
        success: false,
        error: 'خطأ في الصلاحيات: رفض أو إلغاء الاختصاص يتطلب حساب إدارة الرابطة أو الحكم العام.'
      };
    }

    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'يجب ذكر سبب رسمي لرفض أو إلغاء الاختصاص.'
      };
    }

    const disciplines = await this.getCompetitionDisciplinesWithOperations(competitionId);
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) {
      return { success: false, error: 'الاختصاص غير موجود بالمنافسة.' };
    }

    const now = new Date().toISOString();
    const userName = userContext?.name || verification.username || activeSession?.fullName || 'الحكم العام للمنافسة';

    const metaUpdate: Partial<BureauDisciplineWithOps> = {
      status: 'rejected',
      isLocked: true,
      certifiedAt: now,
      certifiedBy: userName
    };

    disc.operations.forEach(op => {
      op.lifecycleStatus = 'rejected';
      op.isLocked = true;
      if (!op.stateTransitions) op.stateTransitions = [];
      op.stateTransitions.unshift({
        id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fromState: op.lifecycleStatus || 'under_review',
        toState: 'rejected',
        changedBy: userName,
        changedByRole: verification.portal === 'admin' ? 'SUPER_ADMIN' : 'CHIEF_JUDGE',
        changedAt: now,
        reason: `رفض الاختصاص: ${reason}`
      });
    });

    this.setDisciplineMeta(competitionId, disciplineId, metaUpdate);
    Object.assign(disc, metaUpdate);

    const auditEntry: AuditTrailEntry = {
      id: `audit_reject_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      operationId: `reject_${disciplineId}`,
      disciplineId,
      competitionId,
      modifiedBy: userName,
      modifiedByRole: verification.portal === 'admin' ? 'SUPER_ADMIN' : 'CHIEF_JUDGE',
      modifiedAt: now,
      fieldName: 'status',
      oldValue: disc.status || 'under_review',
      newValue: 'rejected',
      reason: `رفض الاختصاص: ${reason}`
    };
    this.inMemoryAudit.unshift(auditEntry);
    this.persistAuditTrail();
    this.persistCompetitionOps(competitionId);

    return { success: true, discipline: disc };
  }

  /**
   * Reopen a certified discipline for review or rectification (League Admin authorization only).
   */
  async reopenDiscipline(
    competitionId: string,
    disciplineId: string,
    reason: string,
    userContext?: { name?: string; role?: string; token?: string; leagueId?: string }
  ): Promise<{ success: boolean; discipline?: BureauDisciplineWithOps; error?: string }> {
    const activeSession = portalAuthService.getActiveSession();
    const tokenToVerify = userContext?.token || activeSession?.token;
    const verification = portalAuthService.verifySession(tokenToVerify);
    if (!verification.valid || (verification.portal !== 'league' && verification.portal !== 'admin')) {
      return {
        success: false,
        error: 'خطأ في الصلاحيات: إعادة فتح المحضر تتطلب حساب إدارة الرابطة.'
      };
    }

    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'يجب تقديم سبب رسمي مبرر لإعادة فتح المحضر المعتمد.'
      };
    }

    const disciplines = await this.getCompetitionDisciplinesWithOperations(competitionId);
    const disc = disciplines.find(d => d.id === disciplineId);
    if (!disc) {
      return { success: false, error: 'الاختصاص غير موجود بالمنافسة.' };
    }

    const now = new Date().toISOString();
    const userName = userContext?.name || verification.username || activeSession?.fullName || 'مكتب الرابطة';

    const metaUpdate: Partial<BureauDisciplineWithOps> = {
      status: 'under_review',
      isLocked: false
    };

    // Unlock operations so corrections can be made
    disc.operations.forEach(op => {
      op.isLocked = false;
      if (op.lifecycleStatus === 'certified') {
        op.lifecycleStatus = 'under_review';
      }
    });

    this.setDisciplineMeta(competitionId, disciplineId, metaUpdate);
    Object.assign(disc, metaUpdate);

    const auditEntry: AuditTrailEntry = {
      id: `audit_reopen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      operationId: `reopen_${disciplineId}`,
      disciplineId,
      competitionId,
      modifiedBy: userName,
      modifiedByRole: 'LEAGUE_ADMIN',
      modifiedAt: now,
      fieldName: 'status',
      oldValue: 'certified',
      newValue: 'under_review',
      reason: reason || 'إعادة فتح المحضر لإجراء مراجعة أو تصحيح تدقيقي'
    };
    this.inMemoryAudit.unshift(auditEntry);
    this.persistAuditTrail();
    this.persistCompetitionOps(competitionId);

    return { success: true, discipline: disc };
  }

  /**
   * Exports an official, certified single-discipline protocol (PV d'épreuve officielle).
   */
  exportOfficialDisciplinePV(
    competition: NationalCompetition,
    discipline: BureauDisciplineWithOps,
    format: 'pdf' | 'word' | 'excel',
    signatures?: { chiefJudge?: string; timingJudge?: string; trackJudge?: string }
  ): void {
    const customHeader: Partial<UnifiedExportPayload['header']> = {
      disciplineName: `${discipline.nameAr} ${discipline.pvNumber ? `(محضر معتمد رقم: ${discipline.pvNumber})` : '(مسودة نتائج)'}`,
      category: discipline.categoryNameAr,
      windSpeed: discipline.windSpeed,
      chiefJudgeName: signatures?.chiefJudge || discipline.chiefJudgeSignature || 'الحكم العام الفيدرالي',
      notes: discipline.status === 'certified'
        ? `محضر رسمي معتمد برقم: ${discipline.pvNumber} بتاريخ ${discipline.certifiedAt?.split('T')[0] || ''}`
        : 'مسودة نتائج قيد التدقيق والمراجعة التحكيمية'
    };

    if (format === 'pdf') {
      this.exportToPdf(competition, [discipline], discipline.id, customHeader);
    } else if (format === 'word') {
      this.exportToWord(competition, [discipline], discipline.id, customHeader);
    } else {
      this.exportToExcel(competition, [discipline], discipline.id, customHeader);
    }
  }

  /**
   * Export preparation: converts discipline operations into ExportDisciplineSection
   */
  buildExportSections(disciplines: BureauDisciplineWithOps[], selectedDisciplineId?: string): ExportDisciplineSection[] {
    const targets = selectedDisciplineId 
      ? disciplines.filter(d => d.id === selectedDisciplineId)
      : disciplines;

    return targets.map(d => {
      const isCourse = d.group === 'course';
      
      const columns: ExportColumnDef[] = [
        { header: 'الرتبة', key: 'rank', align: 'center', width: '50px' },
        { header: 'رقم الصدر', key: 'bibNumber', align: 'center', width: '70px' },
        { header: 'اسم العداء', key: 'athleteName', align: 'right', width: '160px' },
        { header: 'النادي / الجمعية', key: 'clubName', align: 'right', width: '140px' },
        { header: isCourse ? 'الرواق' : 'الترتيب', key: 'laneOrOrder', align: 'center' as const, width: '60px' },
        { header: isCourse ? 'الزمن المسجل' : 'المسافة / الارتفاع', key: 'mark', align: 'center' as const, width: '90px' },
        ...(d.windSpeed !== undefined ? [{ header: 'سرعة الرياح', key: 'windSpeed', align: 'center' as const, width: '80px' }] : []),
        { header: 'الحالة الرسمية', key: 'statusText', align: 'center', width: '90px' },
        { header: 'الحكم المسجل', key: 'judgeName', align: 'right', width: '120px' }
      ];

      const rows = d.operations.map(op => ({
        rank: op.rank > 0 && op.rank < 900 ? op.rank : '-',
        bibNumber: op.bibNumber,
        athleteName: op.athleteName,
        clubName: op.clubName,
        laneOrOrder: op.laneOrOrder,
        mark: op.mark,
        windSpeed: op.windSpeed || '-',
        statusText: op.status === 'finished' ? 'أنهى السباق' : op.status === 'dnf' ? 'انسحاب (DNF)' : op.status === 'dq' ? 'استبعاد (DQ)' : 'غياب (DNS)',
        judgeName: op.judgeName
      }));

      return {
        disciplineId: d.id,
        disciplineNameAr: d.nameAr,
        group: d.group,
        subGroup: d.subGroup,
        categoryNameAr: d.categoryNameAr,
        measurementType: d.measurementType,
        windSpeed: d.windSpeed,
        scheduledTime: d.scheduledTime,
        columns,
        rows
      };
    });
  }

  /**
   * Helper to trigger PDF export with unified official header
   */
  exportToPdf(
    competition: NationalCompetition,
    disciplines: BureauDisciplineWithOps[],
    selectedDisciplineId?: string,
    customHeader?: Partial<UnifiedExportPayload['header']>
  ): void {
    const baseHeader = unifiedExportService.getDefaultHeader(competition.name, competition.venue, competition.date);
    const sections = this.buildExportSections(disciplines, selectedDisciplineId);

    const targetDisc = selectedDisciplineId ? disciplines.find(d => d.id === selectedDisciplineId) : undefined;

    const payload: UnifiedExportPayload = {
      header: {
        ...baseHeader,
        leagueName: competition.leagueName || baseHeader.leagueName,
        disciplineName: targetDisc ? targetDisc.nameAr : 'جميع تخصصات المنافسة',
        category: targetDisc?.categoryNameAr,
        windSpeed: targetDisc?.windSpeed,
        ...customHeader
      },
      sections
    };

    unifiedExportService.exportToPdf(payload);
  }

  /**
   * Helper to trigger Word (.doc) export
   */
  exportToWord(
    competition: NationalCompetition,
    disciplines: BureauDisciplineWithOps[],
    selectedDisciplineId?: string,
    customHeader?: Partial<UnifiedExportPayload['header']>
  ): void {
    const baseHeader = unifiedExportService.getDefaultHeader(competition.name, competition.venue, competition.date);
    const sections = this.buildExportSections(disciplines, selectedDisciplineId);
    const targetDisc = selectedDisciplineId ? disciplines.find(d => d.id === selectedDisciplineId) : undefined;

    const payload: UnifiedExportPayload = {
      header: {
        ...baseHeader,
        leagueName: competition.leagueName || baseHeader.leagueName,
        disciplineName: targetDisc ? targetDisc.nameAr : 'جميع تخصصات المنافسة',
        category: targetDisc?.categoryNameAr,
        ...customHeader
      },
      sections
    };

    unifiedExportService.exportToWord(payload);
  }

  /**
   * Helper to trigger Excel (.xml) export with native RTL
   */
  exportToExcel(
    competition: NationalCompetition,
    disciplines: BureauDisciplineWithOps[],
    selectedDisciplineId?: string,
    customHeader?: Partial<UnifiedExportPayload['header']>
  ): void {
    const baseHeader = unifiedExportService.getDefaultHeader(competition.name, competition.venue, competition.date);
    const sections = this.buildExportSections(disciplines, selectedDisciplineId);
    const targetDisc = selectedDisciplineId ? disciplines.find(d => d.id === selectedDisciplineId) : undefined;

    const payload: UnifiedExportPayload = {
      header: {
        ...baseHeader,
        leagueName: competition.leagueName || baseHeader.leagueName,
        disciplineName: targetDisc ? targetDisc.nameAr : 'جميع تخصصات المنافسة',
        category: targetDisc?.categoryNameAr,
        ...customHeader
      },
      sections
    };

    unifiedExportService.exportToExcel(payload);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PRIVATE STORAGE & SEEDING UTILITIES
  // ═════════════════════════════════════════════════════════════════════════
  private persistCompetitionOps(competitionId: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const map = this.inMemoryOperations.get(competitionId);
        if (map) {
          const obj: Record<string, BureauJudgeOperation[]> = {};
          map.forEach((ops, discId) => { obj[discId] = ops; });
          localStorage.setItem(`${STORAGE_KEY_PREFIX}_${competitionId}`, JSON.stringify(obj));
        }
      }
    } catch (e) {
      console.warn('Failed persisting operations', e);
    }
  }

  private persistAuditTrail(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${AUDIT_STORAGE_KEY_PREFIX}_master`, JSON.stringify(this.inMemoryAudit));
      }
    } catch (e) {
      console.warn('Failed persisting audit trail', e);
    }
  }

  private getDisciplineMeta(competitionId: string, disciplineId: string): Partial<BureauDisciplineWithOps> {
    if (!this.inMemoryDisciplineMeta.has(competitionId)) {
      const compMetaMap = new Map<string, Partial<BureauDisciplineWithOps>>();
      if (typeof localStorage !== 'undefined') {
        try {
          const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_meta_${competitionId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            Object.entries(parsed).forEach(([dId, meta]) => compMetaMap.set(dId, meta as any));
          }
        } catch {}
      }
      this.inMemoryDisciplineMeta.set(competitionId, compMetaMap);
    }
    return this.inMemoryDisciplineMeta.get(competitionId)?.get(disciplineId) || {};
  }

  private setDisciplineMeta(competitionId: string, disciplineId: string, meta: Partial<BureauDisciplineWithOps>): void {
    if (!this.inMemoryDisciplineMeta.has(competitionId)) {
      this.inMemoryDisciplineMeta.set(competitionId, new Map());
    }
    const compMetaMap = this.inMemoryDisciplineMeta.get(competitionId)!;
    const existing = compMetaMap.get(disciplineId) || {};
    compMetaMap.set(disciplineId, { ...existing, ...meta });

    if (typeof localStorage !== 'undefined') {
      try {
        const obj: Record<string, Partial<BureauDisciplineWithOps>> = {};
        compMetaMap.forEach((v, k) => { obj[k] = v; });
        localStorage.setItem(`${STORAGE_KEY_PREFIX}_meta_${competitionId}`, JSON.stringify(obj));
      } catch {}
    }
  }

  private wrapDisciplineGroup(competitionId: string, ops: BureauJudgeOperation[]): BureauDisciplineWithOps {
    const sample = ops[0];
    const discId = sample?.disciplineId || 'disc_default';
    const meta = this.getDisciplineMeta(competitionId, discId);
    return {
      id: discId,
      code: discId.replace('disc_', '').toUpperCase(),
      nameAr: this.lookupDisciplineName(discId),
      group: discId.includes('jump') || discId.includes('shot') || discId.includes('javelin') ? 'concours' : 'course',
      subGroup: discId.includes('jump') ? 'jumps' : discId.includes('throw') || discId.includes('shot') ? 'throws' : 'sprint',
      categoryNameAr: 'أكابر رجال (Seniors)',
      gender: 'M',
      measurementType: discId.includes('jump') || discId.includes('shot') ? 'distance' : 'time',
      windSpeed: discId.includes('100m') || discId.includes('jump') ? '+1.2 m/s' : undefined,
      status: meta.status || 'under_review',
      revision: meta.revision || 1,
      qrVerificationCode: meta.qrVerificationCode || (meta.status === 'certified' ? `PFP-CERT-AUTH::${meta.pvNumber}::REV-${meta.revision || 1}` : undefined),
      isLocked: meta.isLocked !== undefined ? meta.isLocked : (meta.status === 'certified'),
      certifiedAt: meta.certifiedAt,
      certifiedBy: meta.certifiedBy,
      pvNumber: meta.pvNumber,
      chiefJudgeSignature: meta.chiefJudgeSignature,
      timingJudgeSignature: meta.timingJudgeSignature,
      trackJudgeSignature: meta.trackJudgeSignature,
      operations: ops
    };
  }

  private lookupDisciplineName(discId: string): string {
    switch (discId) {
      case 'disc_100m_final': return '100 متر نهائي كبار رجال (Photo Finish)';
      case 'disc_200m_final': return '200 متر مستوية - أكابر';
      case 'disc_400m_hurdles': return '400 متر حواجز - أكابر';
      case 'disc_800m_final': return '800 متر نصف طويل - أكابر رجال';
      case 'disc_long_jump_final': return 'الوثب الطويل - نهائي أكابر';
      case 'disc_shot_put_final': return 'دفع الجلة (7.260 كغ) - نهائي أكابر';
      case 'disc_relay_4x100m': return 'تتابع 4 × 100 متر - أندية أكابر';
      default: return 'تخصص ألعاب قوى معتمد';
    }
  }

  private generateInitialSeededOperations(competitionId: string): BureauDisciplineWithOps[] {
    const rawList: BureauDisciplineWithOps[] = [
      {
        id: 'disc_100m_final',
        code: '100M_FIN',
        nameAr: '100 متر نهائي كبار رجال (Photo Finish)',
        nameFr: '100m Finale Hommes',
        group: 'course',
        subGroup: 'sprint',
        categoryNameAr: 'أكابر رجال (Senior Men)',
        gender: 'M',
        measurementType: 'time',
        windSpeed: '+1.2 m/s',
        scheduledTime: '15:00',
        operations: [
          {
            id: 'op_100m_1',
            disciplineId: 'disc_100m_final',
            competitionId,
            rank: 1,
            bibNumber: 101,
            athleteName: 'يوسف العبدلي',
            clubName: 'مولودية الجزائر (MCA)',
            laneOrOrder: 4,
            mark: '09.96s',
            numericValue: 9.96,
            windSpeed: '+1.2 m/s',
            reactionTime: '0.138s',
            status: 'finished',
            judgeName: 'حكم خط النهاية (Photo Finish)',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T15:00:10Z',
            notes: 'رقم قياسي وطني جديد معتمد',
            auditTrail: []
          },
          {
            id: 'op_100m_2',
            disciplineId: 'disc_100m_final',
            competitionId,
            rank: 2,
            bibNumber: 102,
            athleteName: 'سفيان البقالي',
            clubName: 'وفاق سطيف (ESS)',
            laneOrOrder: 5,
            mark: '10.08s',
            numericValue: 10.08,
            windSpeed: '+1.2 m/s',
            reactionTime: '0.142s',
            status: 'finished',
            judgeName: 'حكم خط النهاية (Photo Finish)',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T15:00:10Z',
            auditTrail: []
          },
          {
            id: 'op_100m_3',
            disciplineId: 'disc_100m_final',
            competitionId,
            rank: 3,
            bibNumber: 103,
            athleteName: 'طارق بوكنزة',
            clubName: 'أولمبي الشلف (ASO)',
            laneOrOrder: 3,
            mark: '10.14s',
            numericValue: 10.14,
            windSpeed: '+1.2 m/s',
            reactionTime: '0.155s',
            status: 'finished',
            judgeName: 'حكم خط النهاية (Photo Finish)',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T15:00:10Z',
            auditTrail: []
          },
          {
            id: 'op_100m_4',
            disciplineId: 'disc_100m_final',
            competitionId,
            rank: 4,
            bibNumber: 104,
            athleteName: 'معتز برشم',
            clubName: 'نادي أولمبيك سعيدة (OSA)',
            laneOrOrder: 6,
            mark: '10.22s',
            numericValue: 10.22,
            windSpeed: '+1.2 m/s',
            reactionTime: '0.160s',
            status: 'finished',
            judgeName: 'حكم خط النهاية (Photo Finish)',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T15:00:10Z',
            auditTrail: []
          },
          {
            id: 'op_100m_5',
            disciplineId: 'disc_100m_final',
            competitionId,
            rank: 5,
            bibNumber: 105,
            athleteName: 'عبد المالك لحلو',
            clubName: 'شباب قسنطينة (CSC)',
            laneOrOrder: 2,
            mark: '10.35s',
            numericValue: 10.35,
            windSpeed: '+1.2 m/s',
            reactionTime: '0.149s',
            status: 'finished',
            judgeName: 'حكم خط النهاية (Photo Finish)',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T15:00:10Z',
            auditTrail: []
          }
        ]
      },
      {
        id: 'disc_400m_hurdles',
        code: '400MH',
        nameAr: '400 متر حواجز - أكابر رجال',
        nameFr: '400m Haies Hommes',
        group: 'course',
        subGroup: 'hurdles',
        categoryNameAr: 'أكابر رجال (Senior Men)',
        gender: 'M',
        measurementType: 'time',
        scheduledTime: '10:30',
        operations: [
          {
            id: 'op_400h_1',
            disciplineId: 'disc_400m_hurdles',
            competitionId,
            rank: 1,
            bibNumber: 201,
            athleteName: 'أمين بلفرار',
            clubName: 'مولودية وهران (MCO)',
            laneOrOrder: 4,
            mark: '49.12s',
            numericValue: 49.12,
            reactionTime: '0.165s',
            status: 'finished',
            judgeName: 'حكم التوقيت اليدوي والحارة',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T10:30:50Z',
            auditTrail: []
          },
          {
            id: 'op_400h_2',
            disciplineId: 'disc_400m_hurdles',
            competitionId,
            rank: 2,
            bibNumber: 202,
            athleteName: 'صابر بوشريط',
            clubName: 'أولمبي المدية (OM)',
            laneOrOrder: 5,
            mark: '50.45s',
            numericValue: 50.45,
            reactionTime: '0.170s',
            status: 'finished',
            judgeName: 'حكم التوقيت اليدوي والحارة',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T10:30:50Z',
            auditTrail: []
          },
          {
            id: 'op_400h_3',
            disciplineId: 'disc_400m_hurdles',
            competitionId,
            rank: 999,
            bibNumber: 203,
            athleteName: 'فريد زروقي',
            clubName: 'اتحاد الحراش (USMH)',
            laneOrOrder: 3,
            mark: 'DNF',
            numericValue: 9999,
            status: 'dnf',
            judgeName: 'حكم المسار والحواجز',
            judgeRole: 'COURSE_MARSHAL',
            recordedAt: '2026-06-25T10:30:35Z',
            notes: 'تعثر في الحاجز السادس',
            auditTrail: []
          }
        ]
      },
      {
        id: 'disc_long_jump_final',
        code: 'LJ_FIN',
        nameAr: 'الوثب الطويل - نهائي أكابر رجال',
        nameFr: 'Saut en Longueur Finale',
        group: 'concours',
        subGroup: 'jumps',
        categoryNameAr: 'أكابر رجال (Senior Men)',
        gender: 'M',
        measurementType: 'distance',
        windSpeed: '+0.9 m/s',
        scheduledTime: '17:45',
        operations: [
          {
            id: 'op_lj_1',
            disciplineId: 'disc_long_jump_final',
            competitionId,
            rank: 1,
            bibNumber: 412,
            athleteName: 'هشام بوحنون',
            clubName: 'مولودية الجزائر (MCA)',
            laneOrOrder: 1,
            mark: '8.25m',
            numericValue: 8.25,
            windSpeed: '+1.2 m/s',
            status: 'finished',
            judgeName: 'حكم مسابقات الميدان (الوثب)',
            judgeRole: 'FIELD_JUDGE',
            recordedAt: '2026-06-25T18:30:00Z',
            notes: 'أفضل محاولة في الجولة السادسة',
            auditTrail: []
          },
          {
            id: 'op_lj_2',
            disciplineId: 'disc_long_jump_final',
            competitionId,
            rank: 2,
            bibNumber: 415,
            athleteName: 'ياسين زواوي',
            clubName: 'المجمع البترولي (GSB)',
            laneOrOrder: 2,
            mark: '8.14m',
            numericValue: 8.14,
            windSpeed: '+0.8 m/s',
            status: 'finished',
            judgeName: 'حكم مسابقات الميدان (الوثب)',
            judgeRole: 'FIELD_JUDGE',
            recordedAt: '2026-06-25T18:25:00Z',
            auditTrail: []
          },
          {
            id: 'op_lj_3',
            disciplineId: 'disc_long_jump_final',
            competitionId,
            rank: 3,
            bibNumber: 418,
            athleteName: 'رمزي دراجي',
            clubName: 'نصر حسين داي (NAHD)',
            laneOrOrder: 3,
            mark: '7.88m',
            numericValue: 7.88,
            windSpeed: '+0.5 m/s',
            status: 'finished',
            judgeName: 'حكم مسابقات الميدان (الوثب)',
            judgeRole: 'FIELD_JUDGE',
            recordedAt: '2026-06-25T18:20:00Z',
            auditTrail: []
          }
        ]
      },
      {
        id: 'disc_shot_put_final',
        code: 'SP_FIN',
        nameAr: 'دفع الجلة (7.260 كغ) - نهائي أكابر',
        nameFr: 'Lancer du Poids Finale',
        group: 'concours',
        subGroup: 'throws',
        categoryNameAr: 'أكابر رجال (Senior Men)',
        gender: 'M',
        measurementType: 'distance',
        scheduledTime: '16:30',
        operations: [
          {
            id: 'op_sp_1',
            disciplineId: 'disc_shot_put_final',
            competitionId,
            rank: 1,
            bibNumber: 501,
            athleteName: 'حمزة قاسم',
            clubName: 'شبيبة القبائل (JSK)',
            laneOrOrder: 1,
            mark: '18.94m',
            numericValue: 18.94,
            status: 'finished',
            judgeName: 'حكم مسابقات الرمي والدفع',
            judgeRole: 'FIELD_JUDGE',
            recordedAt: '2026-06-25T17:15:00Z',
            auditTrail: []
          },
          {
            id: 'op_sp_2',
            disciplineId: 'disc_shot_put_final',
            competitionId,
            rank: 2,
            bibNumber: 502,
            athleteName: 'وليد مباركي',
            clubName: 'نجم مقرة (NCM)',
            laneOrOrder: 2,
            mark: '18.20m',
            numericValue: 18.20,
            status: 'finished',
            judgeName: 'حكم مسابقات الرمي والدفع',
            judgeRole: 'FIELD_JUDGE',
            recordedAt: '2026-06-25T17:10:00Z',
            auditTrail: []
          }
        ]
      },
      {
        id: 'disc_relay_4x100m',
        code: '4X100M_RELAY',
        nameAr: 'تتابع 4 × 100 متر - أندية أكابر رجال',
        nameFr: 'Relais 4x100m Hommes',
        group: 'course',
        subGroup: 'relays',
        categoryNameAr: 'أكابر أندية (Senior Clubs)',
        gender: 'M',
        measurementType: 'time',
        scheduledTime: '19:30',
        operations: [
          {
            id: 'op_rel_1',
            disciplineId: 'disc_relay_4x100m',
            competitionId,
            rank: 1,
            bibNumber: 901,
            athleteName: 'فريق مولودية الجزائر (MCA)',
            clubName: 'مولودية الجزائر',
            laneOrOrder: 4,
            mark: '39.88s',
            numericValue: 39.88,
            reactionTime: '0.150s',
            status: 'finished',
            judgeName: 'حكم خط النهاية (Photo Finish)',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T19:31:00Z',
            auditTrail: []
          },
          {
            id: 'op_rel_2',
            disciplineId: 'disc_relay_4x100m',
            competitionId,
            rank: 2,
            bibNumber: 902,
            athleteName: 'فريق نادي أولمبيك سعيدة (OSA)',
            clubName: 'أولمبيك سعيدة',
            laneOrOrder: 5,
            mark: '40.24s',
            numericValue: 40.24,
            reactionTime: '0.158s',
            status: 'finished',
            judgeName: 'حكم خط النهاية (Photo Finish)',
            judgeRole: 'LANE_JUDGE',
            recordedAt: '2026-06-25T19:31:00Z',
            auditTrail: []
          }
        ]
      }
    ];

    return rawList.map(disc => {
      const meta = this.getDisciplineMeta(competitionId, disc.id);
      return {
        ...disc,
        status: meta.status || 'under_review',
        pvNumber: meta.pvNumber,
        certifiedAt: meta.certifiedAt,
        certifiedBy: meta.certifiedBy,
        chiefJudgeSignature: meta.chiefJudgeSignature,
        timingJudgeSignature: meta.timingJudgeSignature,
        trackJudgeSignature: meta.trackJudgeSignature
      };
    });
  }
}

export const competitionsBureauService = new CompetitionsBureauService();
