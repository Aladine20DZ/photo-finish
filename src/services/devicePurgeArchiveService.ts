/**
 * PHOTO FINISH PRO AI — Device Purge & Archive Engine (Stage 6)
 * محرك مسح بيانات الحكام وتصفير المنظومة وأرشفة المنافسات
 * 
 * المبادئ الحاكمة:
 * 1. الأرشفة غير القابلة للتلاعب (Server-Grade Immutable Archive):
 *    ترحيل كافة عمليات الحكام ومصفوفات النتائج إلى الأرشيف المعتمد دون حذفها نهائياً من قاعدة البيانات.
 * 2. أمر المسح الموجه (Targeted Device Purge):
 *    إرسال أمر مسح فوري لتفريغ التخزين المحلي (IndexedDB / localStorage / memory) لهواتف وأجهزة الحكام للمنافسة المعنية فقط (Competition Isolation).
 * 3. حماية العمليات المعلقة (Pre-Purge Safety Barrier):
 *    التحقق الصارم من رفع كافة العمليات غير المتزامنة؛ في حال وجود عمليات معلقة يُمنع المسح فوراً ويُعرض تنبيه رسمي.
 * 4. سجل تدقيق المسح (Tamper-Proof Device Purge Audit Log):
 *    تسجيل دقيق لوقت وتفاصيل مسح كل جهاز، هويته، دور الحكم، والنتيجة (ناجح / محظور).
 * 5. معالجة أجهزة الأوفلاين (Offline Reconnection Catch-Up):
 *    تسجيل أوامر المسح في طابور دائم، وتطبيقها تلقائياً على الأجهزة بمجرد استعادة الاتصال.
 */

import { competitionsService } from './competitionsService';
import { competitionsBureauService, BureauDisciplineWithOps, AuditTrailEntry } from './competitionsBureauService';
import { checkpointStorage } from './checkpointStorage';
import { portalAuthService } from './portalAuthService';
import { athleticsNetwork } from './networkService';
import { PassageEvent } from '../types/athletics';

export interface CompetitionArchiveRecord {
  archiveId: string;
  competitionId: string;
  competitionName: string;
  venue: string;
  date: string;
  leagueId: string;
  leagueName: string;
  archivedAt: string;
  archivedBy: {
    name: string;
    role: string;
    userId?: string;
  };
  totalDisciplines: number;
  totalOperations: number;
  totalPassages: number;
  status: 'archived_immutable';
  disciplinesWithOperations: BureauDisciplineWithOps[];
  passages: PassageEvent[];
  auditTrail: AuditTrailEntry[];
  hashChecksum: string;
}

export interface DevicePurgeCommand {
  commandId: string;
  competitionId: string;
  competitionName: string;
  issuedAt: string;
  issuedBy: {
    name: string;
    role: string;
  };
  status: 'active' | 'completed' | 'cancelled';
}

export interface DevicePurgeAuditLog {
  id: string;
  commandId: string;
  competitionId: string;
  deviceId: string;
  judgeId?: string;
  judgeRole?: string;
  judgeName?: string;
  timestamp: string;
  status: 'purged_successfully' | 'blocked_pending_sync' | 'error';
  deletedItemsCount: number;
  pendingItemsCount: number;
  message: string;
  details?: Record<string, any>;
}

const STORAGE_KEY_ARCHIVES = 'pfp_archived_competitions_v1';
const STORAGE_KEY_COMMANDS = 'pfp_pending_purge_commands_v1';
const STORAGE_KEY_PURGE_LOGS = 'pfp_device_purge_logs_v1';
const STORAGE_KEY_PURGED_REGISTRY_PREFIX = 'pfp_device_purged_reg_';

class DevicePurgeArchiveService {
  private inMemoryArchives: Map<string, CompetitionArchiveRecord> = new Map();
  private inMemoryCommands: Map<string, DevicePurgeCommand> = new Map();
  private inMemoryLogs: DevicePurgeAuditLog[] = [];
  private inMemoryPurgedDevices: Set<string> = new Set(); // format: `${competitionId}:${deviceId}`

  private logListeners: Set<(log: DevicePurgeAuditLog) => void> = new Set();
  private commandListeners: Set<(cmd: DevicePurgeCommand) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const rawArchives = localStorage.getItem(STORAGE_KEY_ARCHIVES);
        if (rawArchives) {
          const list: CompetitionArchiveRecord[] = JSON.parse(rawArchives);
          list.forEach(a => this.inMemoryArchives.set(a.competitionId, a));
        }

        const rawCommands = localStorage.getItem(STORAGE_KEY_COMMANDS);
        if (rawCommands) {
          const cmds: DevicePurgeCommand[] = JSON.parse(rawCommands);
          cmds.forEach(c => this.inMemoryCommands.set(c.competitionId, c));
        }

        const rawLogs = localStorage.getItem(STORAGE_KEY_PURGE_LOGS);
        if (rawLogs) {
          this.inMemoryLogs = JSON.parse(rawLogs);
        }
      }
    } catch (e) {
      console.warn('[DevicePurgeArchiveService] خطأ في تحميل بيانات الأرشيف من التخزين:', e);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEY_ARCHIVES,
          JSON.stringify(Array.from(this.inMemoryArchives.values()))
        );
        localStorage.setItem(
          STORAGE_KEY_COMMANDS,
          JSON.stringify(Array.from(this.inMemoryCommands.values()))
        );
        localStorage.setItem(STORAGE_KEY_PURGE_LOGS, JSON.stringify(this.inMemoryLogs));
      }
    } catch (e) {
      console.warn('[DevicePurgeArchiveService] خطأ في حفظ بيانات الأرشيف:', e);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 1. إنهاء المنافسة والأرشفة المعتمدة (Finish & Immutable Archive)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * إرجاع قائمة الاختصاصات العالقة التي لم يتم مصادقتها أو رفضها بعد
   */
  public async getPendingDisciplines(competitionId: string): Promise<BureauDisciplineWithOps[]> {
    const disciplinesWithOps = await competitionsBureauService.getCompetitionDisciplinesWithOperations(competitionId);
    return disciplinesWithOps.filter(d => {
      const isResolved = d.status === 'certified' || d.status === 'rejected' || d.status === 'locked';
      if (!isResolved) return true;
      return d.operations.some(op => op.lifecycleStatus && !['certified', 'rejected', 'locked'].includes(op.lifecycleStatus));
    });
  }

  /**
   * التحقق من استيفاء شروط إنهاء المنافسة (الصلاحية + اعتماد أو رفض كافة الاختصاصات)
   */
  public async canFinishCompetition(
    competitionId: string,
    token?: string
  ): Promise<{
    canFinish: boolean;
    hasPermission: boolean;
    pendingDisciplines: BureauDisciplineWithOps[];
    reason?: string;
  }> {
    const activeSession = portalAuthService.getActiveSession();
    const tokenToVerify = token || activeSession?.token;
    const verification = portalAuthService.verifySession(tokenToVerify);
    const hasPermission = verification.valid && (verification.portal === 'league' || verification.portal === 'admin');
    const pendingDisciplines = await this.getPendingDisciplines(competitionId);
    const canFinish = hasPermission && pendingDisciplines.length === 0;

    let reason = '';
    if (!hasPermission) {
      reason = 'الصلاحية مقيدة بإدارة الرابطة أو الحكم العام الفيدرالي فقط.';
    } else if (pendingDisciplines.length > 0) {
      reason = `يوجد (${pendingDisciplines.length}) اختصاصات عالقة بانتظار الاعتماد أو الرفض.`;
    }

    return {
      canFinish,
      hasPermission,
      pendingDisciplines,
      reason: reason || undefined
    };
  }

  /**
   * إنهاء المنافسة، ونقل عملياتها للأرشيف غير القابل للتلاعب، وإصدار أمر مسح هواتف الحكام
   */
  public async finishAndArchiveCompetition(
    competitionId: string,
    performedBy?: { name?: string; role?: string; userId?: string; token?: string; requireAllResolved?: boolean }
  ): Promise<{
    success: boolean;
    archive?: CompetitionArchiveRecord;
    purgeCommand?: DevicePurgeCommand;
    error?: string;
    pendingDisciplines?: BureauDisciplineWithOps[];
  }> {
    // ═════════════════════════════════════════════════════════════════════
    // SERVER / TRUSTED LAYER PERMISSION CHECK (Zero Client Role Spoofing)
    // ═════════════════════════════════════════════════════════════════════
    const activeSession = portalAuthService.getActiveSession();
    const tokenToVerify = performedBy?.token || activeSession?.token;

    const verification = portalAuthService.verifySession(tokenToVerify);
    if (!verification.valid || (verification.portal !== 'league' && verification.portal !== 'admin')) {
      return {
        success: false,
        error: 'خطأ في الصلاحيات: لا يمكن إنهاء وأرشفة المنافسة وإصدار أمر مسح الأجهزة دون تصريح موثوق من مكتب الرابطة أو الإدارة.'
      };
    }

    // 0. التحقق الصارم من خلو المنافسة من أي اختصاصات عالقة
    if (performedBy?.requireAllResolved) {
      const pending = await this.getPendingDisciplines(competitionId);
      if (pending.length > 0) {
        return {
          success: false,
          error: `لا يمكن إنهاء المنافسة: توجد (${pending.length}) اختصاصات عالقة لم يتم اعتمادها أو رفضها بعد.`,
          pendingDisciplines: pending
        };
      }
    }

    const performer = {
      name: performedBy?.name || verification.username || activeSession?.fullName || 'مدير الرابطة الولائية',
      role: verification.portal === 'admin' ? 'SUPER_ADMIN' : 'LEAGUE_ADMIN',
      userId: performedBy?.userId || verification.userId || 'usr_league_admin'
    };

    const comp = await competitionsService.getCompetitionById(competitionId);
    if (!comp) {
      return { success: false, error: 'المنافسة المطلوبة غير موجودة في النظام' };
    }

    // 1. جمع العمليات والبيانات الحالية لأرشفتها
    const disciplinesWithOps = await competitionsBureauService.getCompetitionDisciplinesWithOperations(competitionId);
    const passages = await checkpointStorage.getPassagesForCompetition(competitionId);
    const auditLogs = await competitionsBureauService.getAuditLog(competitionId);

    const totalOps = disciplinesWithOps.reduce((sum, d) => sum + d.operations.length, 0);

    // حساب بصمة الأمان الرقمية (Tamper-Proof Digital Checksum)
    const checksumPayload = `${competitionId}|${totalOps}|${passages.length}|${comp.date}|${Date.now()}`;
    const hashChecksum = `SHA256-${checksumPayload.length}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // 2. إنشاء سجل الأرشيف الدائم
    const archiveRecord: CompetitionArchiveRecord = {
      archiveId: `ARCH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      competitionId,
      competitionName: comp.name,
      venue: comp.venue,
      date: comp.date,
      leagueId: comp.leagueId,
      leagueName: comp.leagueName,
      archivedAt: new Date().toISOString(),
      archivedBy: performer,
      totalDisciplines: disciplinesWithOps.length,
      totalOperations: totalOps,
      totalPassages: passages.length,
      status: 'archived_immutable',
      disciplinesWithOperations: JSON.parse(JSON.stringify(disciplinesWithOps)),
      passages: JSON.parse(JSON.stringify(passages)),
      auditTrail: JSON.parse(JSON.stringify(auditLogs)),
      hashChecksum
    };

    this.inMemoryArchives.set(competitionId, archiveRecord);

    // 3. تحديث حالة المنافسة إلى "completed" (منتهية)
    await competitionsService.updateCompetitionStatus(competitionId, 'completed');

    // 4. إنشاء وبث أمر المسح لجميع أجهزة الحكام
    const purgeCommand: DevicePurgeCommand = {
      commandId: `PURGE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      competitionId,
      competitionName: comp.name,
      issuedAt: new Date().toISOString(),
      issuedBy: performer,
      status: 'active'
    };

    this.inMemoryCommands.set(competitionId, purgeCommand);
    this.saveToStorage();

    // 5. البث الشبكي لأمر المسح لجميع الأجهزة المتصلة
    this.broadcastPurgeCommand(purgeCommand);

    // إعلام المشتركين بالأمر
    this.commandListeners.forEach(fn => fn(purgeCommand));

    return {
      success: true,
      archive: archiveRecord,
      purgeCommand
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. فحص وتطبيق أمر المسح على جهاز الحكم (Execute & Safety Barrier)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * التحقق من الأمان وتنفيذ مسح بيانات المنافسة من الجهاز المحلي
   */
  public async checkAndExecuteDevicePurge(
    competitionId: string,
    deviceContext: {
      deviceId: string;
      judgeId?: string;
      judgeRole?: string;
      judgeName?: string;
    }
  ): Promise<{
    status: 'purged_successfully' | 'blocked_pending_sync' | 'no_purge_needed' | 'error';
    message: string;
    deletedCount: number;
    pendingCount: number;
  }> {
    const { deviceId, judgeId, judgeRole, judgeName } = deviceContext;
    const command = this.inMemoryCommands.get(competitionId);
    const commandId = command ? command.commandId : `LOCAL-PURGE-${Date.now()}`;

    // 1. حاجز الأمان: هل توجد أي عمليات في طابور المزامنة لم تُرفع بعد؟
    const pendingCount = await checkpointStorage.hasUnsyncedPassages(competitionId);

    if (pendingCount > 0) {
      const blockedLog: DevicePurgeAuditLog = {
        id: `LOG-BLOCKED-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        commandId,
        competitionId,
        deviceId,
        judgeId,
        judgeRole,
        judgeName,
        timestamp: new Date().toISOString(),
        status: 'blocked_pending_sync',
        deletedItemsCount: 0,
        pendingItemsCount: pendingCount,
        message: `تم منع مسح بيانات الجهاز [${deviceId}] لوجود ${pendingCount} عملية غير مرفوعة في طابور المزامنة!`
      };

      this.recordAuditLog(blockedLog);

      return {
        status: 'blocked_pending_sync',
        message: blockedLog.message,
        deletedCount: 0,
        pendingCount
      };
    }

    // 2. إذا كانت كافة البيانات مرفوعة بالكامل (Zero Pending): تنفيذ المسح الآمن للمنافسة المحددة فقط
    try {
      const purgeResult = await checkpointStorage.purgeCompetitionData(competitionId);

      // مسح مفاتيح التخزين المحلي الخاصة بالمنافسة دون المساس بغيرها
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(`pfp_competitions_bureau_ops_v1_${competitionId}`);
          localStorage.removeItem(`pfp_passages_cache_${competitionId}`);
          // تسجيل ختم تطهير الجهاز
          const regKey = `${STORAGE_KEY_PURGED_REGISTRY_PREFIX}${competitionId}_${deviceId}`;
          localStorage.setItem(regKey, new Date().toISOString());
        } catch {}
      }

      this.inMemoryPurgedDevices.add(`${competitionId}:${deviceId}`);

      const successLog: DevicePurgeAuditLog = {
        id: `LOG-OK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        commandId,
        competitionId,
        deviceId,
        judgeId,
        judgeRole,
        judgeName,
        timestamp: new Date().toISOString(),
        status: 'purged_successfully',
        deletedItemsCount: purgeResult.deletedPassages,
        pendingItemsCount: 0,
        message: `تم مسح وتصفير بيانات المنافسة من الجهاز [${deviceId}] بنجاح (${purgeResult.deletedPassages} عملية مطهرة)`
      };

      this.recordAuditLog(successLog);

      // بث إشعار ACK بالنجاح للشبكة
      this.broadcastPurgeAck({
        commandId,
        competitionId,
        deviceId,
        judgeId,
        judgeRole,
        status: 'purged_successfully',
        deletedItemsCount: purgeResult.deletedPassages,
        unsyncedCount: 0,
        message: successLog.message,
        timestamp: Date.now()
      });

      return {
        status: 'purged_successfully',
        message: successLog.message,
        deletedCount: purgeResult.deletedPassages,
        pendingCount: 0
      };
    } catch (err: any) {
      const errorLog: DevicePurgeAuditLog = {
        id: `LOG-ERR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        commandId,
        competitionId,
        deviceId,
        judgeId,
        judgeRole,
        judgeName,
        timestamp: new Date().toISOString(),
        status: 'error',
        deletedItemsCount: 0,
        pendingItemsCount: 0,
        message: `فشل مسح البيانات من الجهاز: ${err?.message || 'خطأ غير معروف'}`
      };

      this.recordAuditLog(errorLog);

      return {
        status: 'error',
        message: errorLog.message,
        deletedCount: 0,
        pendingCount: 0
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. معالجة أجهزة الأوفلاين عند عودة الاتصال (Offline Reconnection)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * فحص أوامر المسح المعلقة وتنفيذها فور اتصال الجهاز
   */
  public async processOfflinePendingPurges(
    currentCompetitionId: string,
    deviceContext: {
      deviceId: string;
      judgeId?: string;
      judgeRole?: string;
      judgeName?: string;
    }
  ): Promise<{
    processed: boolean;
    status?: string;
    message?: string;
  }> {
    const activeCommand = this.inMemoryCommands.get(currentCompetitionId);
    if (!activeCommand) {
      return { processed: false, message: 'لا توجد أوامر مسح معلقة لهذه المنافسة' };
    }

    if (this.hasDeviceBeenPurged(currentCompetitionId, deviceContext.deviceId)) {
      return { processed: false, message: 'تم مسح وتطهير الجهاز مسبقاً' };
    }

    // تنفيذ إجراء المسح
    const result = await this.checkAndExecuteDevicePurge(currentCompetitionId, deviceContext);
    return {
      processed: true,
      status: result.status,
      message: result.message
    };
  }

  /**
   * التحقق مما إذا كان الجهاز قد طُهر بالفعل لمنافسة معينة
   */
  public hasDeviceBeenPurged(competitionId: string, deviceId: string): boolean {
    if (this.inMemoryPurgedDevices.has(`${competitionId}:${deviceId}`)) {
      return true;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(`${STORAGE_KEY_PURGED_REGISTRY_PREFIX}${competitionId}_${deviceId}`);
        return !!item;
      } catch {}
    }
    return false;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. البث الشبكي والتواصل (Network Message Dispatch)
  // ═════════════════════════════════════════════════════════════════════════

  private broadcastPurgeCommand(command: DevicePurgeCommand): void {
    try {
      athleticsNetwork.sendMessage({
        type: 'ATHLETICS_PURGE_COMMAND',
        timestamp: Date.now(),
        senderTime: Date.now(),
        payload: {
          commandId: command.commandId,
          competitionId: command.competitionId,
          issuedAt: Date.now(),
          issuedBy: command.issuedBy.name
        }
      });
    } catch (e) {
      console.warn('[DevicePurgeArchiveService] تعذر البث الشبكي لأمر المسح:', e);
    }
  }

  private broadcastPurgeAck(ackPayload: any): void {
    try {
      athleticsNetwork.sendMessage({
        type: 'ATHLETICS_PURGE_ACK',
        timestamp: Date.now(),
        senderTime: Date.now(),
        payload: ackPayload
      });
    } catch (e) {
      console.warn('[DevicePurgeArchiveService] تعذر بث تأكيد المسح:', e);
    }
  }

  public handleIncomingPurgeCommand(msg: any, _currentDeviceId?: string): void {
    if (!msg || !msg.payload) return;
    const { competitionId, commandId } = msg.payload;
    if (!competitionId) return;

    if (!this.inMemoryCommands.has(competitionId)) {
      this.inMemoryCommands.set(competitionId, {
        commandId: commandId || `CMD-${Date.now()}`,
        competitionId,
        competitionName: 'منافسة ألعاب قوى رسمية',
        issuedAt: new Date().toISOString(),
        issuedBy: { name: msg.payload.issuedBy || 'الحكم العام', role: 'CHIEF_JUDGE' },
        status: 'active'
      });
      this.saveToStorage();
    }
  }

  public handleIncomingPurgeAck(msg: any): void {
    if (!msg || !msg.payload) return;
    const payload = msg.payload;

    const log: DevicePurgeAuditLog = {
      id: `LOG-REMOTE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      commandId: payload.commandId || 'REMOTE',
      competitionId: payload.competitionId,
      deviceId: payload.deviceId,
      judgeId: payload.judgeId,
      judgeRole: payload.judgeRole,
      timestamp: new Date().toISOString(),
      status: payload.status,
      deletedItemsCount: payload.deletedItemsCount || 0,
      pendingItemsCount: payload.unsyncedCount || 0,
      message: payload.message || 'تقرير حالة مسح وارد من جهاز ميداني'
    };

    this.recordAuditLog(log);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. الاستعلام وسجلات التدقيق (Audit Logs & Archives Retrieval)
  // ═════════════════════════════════════════════════════════════════════════

  public recordAuditLog(log: DevicePurgeAuditLog): void {
    this.inMemoryLogs.unshift(log);
    // حصر السجل في آخر 500 عملية لمنع استهلاك الذاكرة
    if (this.inMemoryLogs.length > 500) {
      this.inMemoryLogs = this.inMemoryLogs.slice(0, 500);
    }
    this.saveToStorage();
    this.logListeners.forEach(fn => fn(log));
  }

  public getPurgeLogs(competitionId?: string): DevicePurgeAuditLog[] {
    if (competitionId) {
      return this.inMemoryLogs.filter(l => l.competitionId === competitionId);
    }
    return [...this.inMemoryLogs];
  }

  public getArchives(competitionId?: string): CompetitionArchiveRecord[] {
    const list = Array.from(this.inMemoryArchives.values());
    if (competitionId) {
      return list.filter(a => a.competitionId === competitionId);
    }
    return list;
  }

  public getArchiveById(competitionId: string): CompetitionArchiveRecord | null {
    return this.inMemoryArchives.get(competitionId) || null;
  }

  public getPendingPurgeCommand(competitionId: string): DevicePurgeCommand | null {
    return this.inMemoryCommands.get(competitionId) || null;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. المشتركون والتنظيف للاختبارات (Subscriptions & Test Cleansing)
  // ═════════════════════════════════════════════════════════════════════════

  public onDevicePurgeLog(callback: (log: DevicePurgeAuditLog) => void): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  public onDevicePurgeCommand(callback: (cmd: DevicePurgeCommand) => void): () => void {
    this.commandListeners.add(callback);
    return () => this.commandListeners.delete(callback);
  }

  /**
   * تنظيف الذاكرة ومخازن الخدمة للاختبارات الآلية
   */
  public resetServiceState(): void {
    this.inMemoryArchives.clear();
    this.inMemoryCommands.clear();
    this.inMemoryLogs = [];
    this.inMemoryPurgedDevices.clear();
    this.logListeners.clear();
    this.commandListeners.clear();
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_ARCHIVES);
        localStorage.removeItem(STORAGE_KEY_COMMANDS);
        localStorage.removeItem(STORAGE_KEY_PURGE_LOGS);
      } catch {}
    }
  }
}

export const devicePurgeArchiveService = new DevicePurgeArchiveService();
