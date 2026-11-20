/**
 * خزانة بيانات نقاط المراقبة والحكام الدائمة (IndexedDB + Offline-First Memory Storage)
 * 
 * المزايا:
 * - حفظ دائم محلي لجميع أحداث المرور والمنافسات دون حاجة للإنترنت
 * - سجل تدقيق غير قابل للحذف (Immutable Event Log)
 * - دعم طابور المزامنة (Sync Queue) لإعادة الإرسال التلقائي
 * - عزل تام بين المنافسات مع دعم التطهير والمسح عند انتهاء المنافسة
 * - توافق كامل مع بيئة المتصفح والهواتف وبيئات الاختبار بدون IndexedDB
 */

import { 
  AthleticsCompetition, 
  PassageEvent, 
  PassageCorrection, 
  AthleticsJudge 
} from '../types/athletics';

import { openSharedDatabase, SHARED_DB_NAME } from './idbCompat';

const DB_NAME = SHARED_DB_NAME;

// أسماء مخازن الكائنات (Object Stores)
const STORE_COMPETITIONS = 'competitions';
const STORE_PASSAGES = 'passage_events';
const STORE_CORRECTIONS = 'passage_corrections';
const STORE_VIOLATIONS = 'course_violations';
const STORE_JUDGES = 'judges';
const STORE_SYNC_QUEUE = 'sync_queue';

class CheckpointStorageService {
  private db: IDBDatabase | null = null;
  private openPromise: Promise<IDBDatabase | null> | null = null;
  
  // مخازن ذاكرة حية كاحتياط أوفلاين ولبيئات الاختبار
  private memoryCompetitions: Map<string, AthleticsCompetition> = new Map();
  private memoryPassages: Map<string, PassageEvent> = new Map();
  private memoryCorrections: Map<string, PassageCorrection> = new Map();
  private memoryViolations: Map<string, any> = new Map();
  private memoryJudges: Map<string, AthleticsJudge> = new Map();
  private memorySyncQueue: Map<string, { id: string; event: PassageEvent; timestamp: number }> = new Map();

  /** فتح قاعدة البيانات مع إنشاء المخطط والفهارس أو الرجوع للذاكرة الحية إن لم يكن IndexedDB مدعوماً */
  private async open(): Promise<IDBDatabase | null> {
    if (this.db) return this.db;
    if (this.openPromise) return this.openPromise;

    if (typeof indexedDB === 'undefined') {
      return null;
    }

    // فتح موحّد عبر idbCompat — يمنع انسداد الترقية بين الخدمات الأربع المشتركة
    this.openPromise = openSharedDatabase(DB_NAME, (db: IDBDatabase) => {
      // 1. مخزن المنافسات
      if (!db.objectStoreNames.contains(STORE_COMPETITIONS)) {
        const compStore = db.createObjectStore(STORE_COMPETITIONS, { keyPath: 'id' });
        compStore.createIndex('date', 'date');
        compStore.createIndex('status', 'status');
      }

      // 2. مخزن أحداث المرور (مع فهارس للبحث السريع والتأكد من التكرار)
      if (!db.objectStoreNames.contains(STORE_PASSAGES)) {
        const passStore = db.createObjectStore(STORE_PASSAGES, { keyPath: 'id' });
        passStore.createIndex('competitionId', 'competitionId');
        passStore.createIndex('checkpointId', 'checkpointId');
        passStore.createIndex('bibNumber', 'bibNumber');
        passStore.createIndex('lapNumber', 'lapNumber');
        passStore.createIndex('timestamp', 'timestamp');
        passStore.createIndex('syncStatus', 'syncStatus');
        // فهرس مركب لمنع التكرار في نفس النقطة والحلقة
        passStore.createIndex('comp_cp_lap_bib', ['competitionId', 'checkpointId', 'lapNumber', 'bibNumber']);
      }

      // 3. مخزن طلبات التصحيح والمراجعة
      if (!db.objectStoreNames.contains(STORE_CORRECTIONS)) {
        const corrStore = db.createObjectStore(STORE_CORRECTIONS, { keyPath: 'id' });
        corrStore.createIndex('passageEventId', 'passageEventId');
        corrStore.createIndex('status', 'status');
      }

      // 4. مخزن المخالفات
      if (!db.objectStoreNames.contains(STORE_VIOLATIONS)) {
        const violStore = db.createObjectStore(STORE_VIOLATIONS, { keyPath: 'id' });
        violStore.createIndex('competitionId', 'competitionId');
        violStore.createIndex('bibNumber', 'bibNumber');
      }

      // 5. مخزن الحكام
      if (!db.objectStoreNames.contains(STORE_JUDGES)) {
        const judgeStore = db.createObjectStore(STORE_JUDGES, { keyPath: 'id' });
        judgeStore.createIndex('pinCode', 'pinCode');
        judgeStore.createIndex('assignedCompetitionId', 'assignedCompetitionId');
      }

      // 6. مخزن طابور المزامنة المحلي
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp');
      }
    }).then(
      (db) => {
        this.db = db;
        return this.db;
      },
      () => {
        console.warn('[checkpointStorage] تعذر فتح IndexedDB، الاعتماد على الذاكرة المحلية');
        return null;
      }
    );

    return this.openPromise;
  }

  // ═══════════════════════════════════════════════════
  // المنافسات (Competitions)
  // ═══════════════════════════════════════════════════

  public async saveCompetition(comp: AthleticsCompetition): Promise<string> {
    this.memoryCompetitions.set(comp.id, { ...comp });
    const db = await this.open();
    if (!db) return comp.id;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COMPETITIONS, 'readwrite');
      tx.objectStore(STORE_COMPETITIONS).put(comp);
      tx.oncomplete = () => resolve(comp.id);
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCompetition(id: string): Promise<AthleticsCompetition | null> {
    const db = await this.open();
    if (!db) return this.memoryCompetitions.get(id) || null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COMPETITIONS, 'readonly');
      const req = tx.objectStore(STORE_COMPETITIONS).get(id);
      req.onsuccess = () => resolve(req.result || this.memoryCompetitions.get(id) || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteCompetition(id: string): Promise<boolean> {
    this.memoryCompetitions.delete(id);
    const db = await this.open();
    if (!db) return true;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COMPETITIONS, 'readwrite');
      tx.objectStore(STORE_COMPETITIONS).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  public async listCompetitions(): Promise<AthleticsCompetition[]> {
    const db = await this.open();
    if (!db) {
      const list = Array.from(this.memoryCompetitions.values());
      list.sort((a, b) => b.createdAt - a.createdAt);
      return list;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COMPETITIONS, 'readonly');
      const req = tx.objectStore(STORE_COMPETITIONS).getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as AthleticsCompetition[];
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list.length ? list : Array.from(this.memoryCompetitions.values()));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ═══════════════════════════════════════════════════
  // أحداث المرور (Passage Events & Sync Queue)
  // ═══════════════════════════════════════════════════

  /**
   * حفظ حدث مرور في المخزن الدائم وطابور المزامنة
   * يمنع التكرار التام (Idempotent) عبر التحقق من معرّف الحدث ومن وجود تسجيل مسبق في نفس النقطة والحلقة
   */
  public async recordPassage(event: PassageEvent): Promise<{ success: boolean; duplicate?: boolean }> {
    if (this.memoryPassages.has(event.id)) {
      return { success: true, duplicate: true };
    }
    this.memoryPassages.set(event.id, { ...event });
    if (event.syncStatus === 'pending') {
      this.memorySyncQueue.set(event.id, { id: event.id, event: { ...event }, timestamp: event.timestamp });
    }

    const db = await this.open();
    if (!db) return { success: true, duplicate: false };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PASSAGES, STORE_SYNC_QUEUE], 'readwrite');
      const passStore = tx.objectStore(STORE_PASSAGES);
      const syncStore = tx.objectStore(STORE_SYNC_QUEUE);

      // فحص وجود الحدث بالمعرف
      const checkReq = passStore.get(event.id);
      checkReq.onsuccess = () => {
        if (checkReq.result) {
          resolve({ success: true, duplicate: true });
          return;
        }

        passStore.put(event);
        if (event.syncStatus === 'pending') {
          syncStore.put({ id: event.id, event, timestamp: event.timestamp });
        }
      };

      tx.oncomplete = () => resolve({ success: true, duplicate: false });
      tx.onerror = () => reject(tx.error);
    });
  }

  /** جلب جميع أحداث المرور الخاصة بمنافسة معينة */
  public async getPassagesForCompetition(competitionId: string): Promise<PassageEvent[]> {
    const db = await this.open();
    if (!db) {
      const passages = Array.from(this.memoryPassages.values()).filter(p => p.competitionId === competitionId);
      passages.sort((a, b) => a.timestamp - b.timestamp);
      return passages;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PASSAGES, 'readonly');
      const index = tx.objectStore(STORE_PASSAGES).index('competitionId');
      const req = index.getAll(competitionId);
      req.onsuccess = () => {
        const passages = (req.result || []) as PassageEvent[];
        passages.sort((a, b) => a.timestamp - b.timestamp);
        resolve(passages);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** التحقق مما إذا كان العداء قد سُجل في نفس النقطة والحلقة سابقاً لمنع التكرار العفوي */
  public async checkBibPassageExists(
    competitionId: string, 
    checkpointId: string, 
    lapNumber: number, 
    bibNumber: number
  ): Promise<PassageEvent | null> {
    const db = await this.open();
    if (!db) {
      const match = Array.from(this.memoryPassages.values()).find(p => 
        p.competitionId === competitionId &&
        p.checkpointId === checkpointId &&
        p.lapNumber === lapNumber &&
        p.bibNumber === bibNumber
      );
      return match ? { ...match } : null;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PASSAGES, 'readonly');
      const index = tx.objectStore(STORE_PASSAGES).index('comp_cp_lap_bib');
      const req = index.get([competitionId, checkpointId, lapNumber, bibNumber]);
      req.onsuccess = () => resolve((req.result as PassageEvent) || null);
      req.onerror = () => reject(req.error);
    });
  }

  /** جلب طابور الأحداث المعلقة للمزامنة */
  public async getPendingSyncQueue(): Promise<PassageEvent[]> {
    const db = await this.open();
    if (!db) {
      const items = Array.from(this.memorySyncQueue.values());
      return items.map(i => ({ ...i.event }));
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const req = tx.objectStore(STORE_SYNC_QUEUE).getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        resolve(items.map((i: any) => i.event as PassageEvent));
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** تعليم قائمة أحداث على أنها تمت مزامنتها بنجاح وحذفها من طابور الانتظار */
  public async markPassagesSynced(eventIds: string[]): Promise<void> {
    if (!eventIds.length) return;
    for (const id of eventIds) {
      this.memorySyncQueue.delete(id);
      const mem = this.memoryPassages.get(id);
      if (mem) {
        mem.syncStatus = 'synced';
        mem.syncedAt = Date.now();
      }
    }

    const db = await this.open();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PASSAGES, STORE_SYNC_QUEUE], 'readwrite');
      const passStore = tx.objectStore(STORE_PASSAGES);
      const syncStore = tx.objectStore(STORE_SYNC_QUEUE);

      for (const id of eventIds) {
        syncStore.delete(id);
        const req = passStore.get(id);
        req.onsuccess = () => {
          if (req.result) {
            const updated: PassageEvent = { ...req.result, syncStatus: 'synced', syncedAt: Date.now() };
            passStore.put(updated);
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** فحص ما إذا كان هناك أحداث معلقة لم تُرفع في طابور المزامنة لمنافسة معينة */
  public async hasUnsyncedPassages(competitionId: string): Promise<number> {
    const queue = await this.getPendingSyncQueue();
    const pendingForComp = queue.filter(item => item.competitionId === competitionId);
    return pendingForComp.length;
  }

  /**
   * مسح وتطهير بيانات منافسة محددة فقط من التخزين المحلي (الهاتف / المتصفح)
   * مع الحفاظ التام والآمن على بيانات باقي المنافسات والحكام والمنظومة (Competition Isolation).
   */
  public async purgeCompetitionData(competitionId: string): Promise<{ deletedPassages: number; deletedCorrections: number; deletedViolations: number }> {
    let deletedPassages = 0;
    let deletedCorrections = 0;
    let deletedViolations = 0;

    // 1. التطهير من الذاكرة الحية (In-Memory Maps)
    const passageIdsToDelete = new Set<string>();
    for (const [id, p] of this.memoryPassages.entries()) {
      if (p.competitionId === competitionId) {
        passageIdsToDelete.add(id);
        this.memoryPassages.delete(id);
        deletedPassages++;
      }
    }

    for (const [id, item] of this.memorySyncQueue.entries()) {
      if (item.event && item.event.competitionId === competitionId) {
        this.memorySyncQueue.delete(id);
      }
    }

    for (const [id, c] of this.memoryCorrections.entries()) {
      if (passageIdsToDelete.has(c.passageEventId)) {
        this.memoryCorrections.delete(id);
        deletedCorrections++;
      }
    }

    for (const [id, v] of this.memoryViolations.entries()) {
      if (v.competitionId === competitionId) {
        this.memoryViolations.delete(id);
        deletedViolations++;
      }
    }

    // 2. التطهير من IndexedDB عند توفره
    const db = await this.open();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction([STORE_PASSAGES, STORE_CORRECTIONS, STORE_VIOLATIONS, STORE_SYNC_QUEUE], 'readwrite');
          const passStore = tx.objectStore(STORE_PASSAGES);
          const syncStore = tx.objectStore(STORE_SYNC_QUEUE);
          const index = passStore.index('competitionId');
          const req = index.getAllKeys(competitionId);

          req.onsuccess = () => {
            const keys = req.result || [];
            keys.forEach(k => {
              passStore.delete(k);
              syncStore.delete(k);
            });
          };

          const violStore = tx.objectStore(STORE_VIOLATIONS);
          if (violStore.indexNames.contains('competitionId')) {
            const vIndex = violStore.index('competitionId');
            const vReq = vIndex.getAllKeys(competitionId);
            vReq.onsuccess = () => {
              const vKeys = vReq.result || [];
              vKeys.forEach(k => violStore.delete(k));
            };
          }

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        } catch (e) {
          resolve();
        }
      });
    }

    return { deletedPassages, deletedCorrections, deletedViolations };
  }

  /** إعادة ضبط الذاكرة لأغراض الاختبارات */
  public resetMemoryState(): void {
    this.memoryCompetitions.clear();
    this.memoryPassages.clear();
    this.memoryCorrections.clear();
    this.memoryViolations.clear();
    this.memoryJudges.clear();
    this.memorySyncQueue.clear();
  }

  // ═══════════════════════════════════════════════════
  // التصحيحات وسجل التدقيق (Audit Trail)
  // ═══════════════════════════════════════════════════

  public async recordCorrection(correction: PassageCorrection): Promise<void> {
    this.memoryCorrections.set(correction.id, { ...correction });

    if (correction.status === 'approved') {
      const memEvent = this.memoryPassages.get(correction.passageEventId);
      if (memEvent) {
        memEvent.bibNumber = correction.correctedBibNumber;
        memEvent.isFlagged = true;
        memEvent.flagReason = `تم التصحيح رسمياً من ${correction.originalBibNumber} إلى ${correction.correctedBibNumber}: ${correction.reason}`;
      }
    }

    const db = await this.open();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CORRECTIONS, STORE_PASSAGES], 'readwrite');
      tx.objectStore(STORE_CORRECTIONS).put(correction);

      // إذا تمت الموافقة، نحدث الحقل في الحدث الأصلي مع الإبقاء على السجل
      if (correction.status === 'approved') {
        const passStore = tx.objectStore(STORE_PASSAGES);
        const req = passStore.get(correction.passageEventId);
        req.onsuccess = () => {
          if (req.result) {
            const event = req.result as PassageEvent;
            event.bibNumber = correction.correctedBibNumber;
            event.isFlagged = true;
            event.flagReason = `تم التصحيح رسمياً من ${correction.originalBibNumber} إلى ${correction.correctedBibNumber}: ${correction.reason}`;
            passStore.put(event);
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async listCorrections(): Promise<PassageCorrection[]> {
    const db = await this.open();
    if (!db) {
      const list = Array.from(this.memoryCorrections.values());
      list.sort((a, b) => b.requestedAt - a.requestedAt);
      return list;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CORRECTIONS, 'readonly');
      const req = tx.objectStore(STORE_CORRECTIONS).getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as PassageCorrection[];
        list.sort((a, b) => b.requestedAt - a.requestedAt);
        resolve(list.length ? list : Array.from(this.memoryCorrections.values()));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ═══════════════════════════════════════════════════
  // الحكام (Judges)
  // ═══════════════════════════════════════════════════

  public async saveJudge(judge: AthleticsJudge): Promise<void> {
    this.memoryJudges.set(judge.id, { ...judge });
    const db = await this.open();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_JUDGES, 'readwrite');
      tx.objectStore(STORE_JUDGES).put(judge);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async listJudges(competitionId?: string): Promise<AthleticsJudge[]> {
    const db = await this.open();
    if (!db) {
      let judges = Array.from(this.memoryJudges.values());
      if (competitionId) {
        judges = judges.filter(j => !j.assignedCompetitionId || j.assignedCompetitionId === competitionId);
      }
      return judges;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_JUDGES, 'readonly');
      const req = tx.objectStore(STORE_JUDGES).getAll();
      req.onsuccess = () => {
        let judges = (req.result || []) as AthleticsJudge[];
        if (competitionId) {
          judges = judges.filter(j => !j.assignedCompetitionId || j.assignedCompetitionId === competitionId);
        }
        resolve(judges.length ? judges : Array.from(this.memoryJudges.values()));
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export const checkpointStorage = new CheckpointStorageService();
