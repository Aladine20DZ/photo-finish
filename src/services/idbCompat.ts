/**
 * PHOTO FINISH PRO — طبقة فتح قواعد البيانات المشتركة (IDB Compat Layer)
 * ═══════════════════════════════════════════════════════════════════════════
 * إصلاح لغم معماري قديم: أربع خدمات (checkpointStorage، athleteClubStorage،
 * coachWorkflowService، fieldEventService) كانت تفتح نفس قاعدة البيانات
 * `athletics_competition_db_v1` بإصدارات متضاربة (1..4) — وIndexedDB يحجب
 * أي طلب ترقية ما دامت اتصالات أدنى مفتوحة، فيعلّق الخدمات بصمت (promise بلا
 * حل ولا رفض) على المتصفحات الجديدة أو بعد تنظيف التخزين.
 *
 * التصميم (probe-then-bump مع عدّاد الخطوات):
 *   1) فتح استطلاع بلا إصدار — لا يطلب ترقية أبداً فلا يُحاجَب أبداً.
 *   2) إن سُجّلت خطوات جديدة بعد فتح الاتصال (عدّاد < المطلوب) يُغلق الاتصال
 *      ويُعاد الفتح بنسخة أعلى بكل الخطوات تراكمياً (كلها contains-guarded
 *      فآمنة عند أي إصدار، وتحافظ على البيانات القديمة دون أي حذف).
 *   3) VersionError (نسخة أحدث من تبويب/نداء متوازٍ): استطلاع جديد وإعادة
 *      bump — يتحوّل إلى no-op إنشائي لأن الخطوات محمية بـ contains.
 *   4) اتصال واحد مشترك (singleton) لكل اسم قاعدة + onversionchange يغلق
 *      فوراً ليمنع انسداد الترقيات المستقبلية.
 */

/** اسم قاعدة البيانات المشتركة (كما في الخدمات الأربع قبل التوحيد) */
export const SHARED_DB_NAME = 'athletics_competition_db_v1';

type UpgradeStep = (db: IDBDatabase) => void;

interface DbState {
  db: IDBDatabase | null;
  /** عدد الخطوات المطبقة فعلياً على الاتصال الحالي */
  appliedCount: number;
  /** إصدار القاعدة عند آخر تطبيق للخطوات */
  appliedAtVersion: number | null;
  steps: UpgradeStep[];
}

const states = new Map<string, DbState>();

/** الاتصالات التي أُغلقت (versionchange/onclose) — لا تصلح لأي عملية جديدة */
const deadConnections = new WeakSet<IDBDatabase>();

function markDead(db: IDBDatabase, dbName: string): void {
  deadConnections.add(db);
  const s = states.get(dbName);
  if (s && s.db === db) s.db = null;
}

function wireLifecycle(db: IDBDatabase, dbName: string): void {
  db.onversionchange = () => {
    try { db.close(); } catch { /* مغلق مسبقاً */ }
    markDead(db, dbName);
  };
  // onclose يلتقط الإغلاق غير الطبيعي (حذف القاعدة، انهيار التبويب الشريك...)
  db.onclose = () => markDead(db, dbName);
}

function openNoVersion(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** مهلة انتظار رد التبويبات الأخرى قبل التصريح بالفشل (was: تعليق صامت للأبد) */
const BLOCKED_TIMEOUT_MS = 4000;

function openWithSteps(
  dbName: string,
  st: DbState,
  version: number,
  attach: (db: IDBDatabase) => void
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);
    let settled = false;
    let blockedTimer: number | null = null;
    const fail = (err: unknown): void => {
      if (settled) return;
      settled = true;
      if (blockedTimer !== null) window.clearTimeout(blockedTimer);
      reject(err);
    };
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      for (const fn of st.steps) {
        try {
          fn(db);
        } catch (err) {
          console.warn('[idbCompat] فشلت خطوة ترقية متجر — استمرار مع البقية:', err);
        }
      }
    };
    // انسداد من تبويب/اتصال خارجي: ننتظر مهلة ثم نفشل بخطأ واضح
    req.onblocked = () => {
      if (settled) return;
      console.warn('[idbCompat] ترقية محجوبة من اتصال خارجي — انتظار تحرر القاعدة...');
      if (blockedTimer === null) {
        blockedTimer = window.setTimeout(() => {
          fail(new DOMException(
            `تعذر ترقية قاعدة البيانات (${dbName}) — اتصال خارجي محتجز للإصدار القديم. أغلق تبويبات التطبيق الأخرى ثم أعد المحاولة.`,
            'BlockedError'
          ));
        }, BLOCKED_TIMEOUT_MS);
      }
    };
    req.onsuccess = () => {
      if (settled) { try { req.result.close(); } catch { /* لا شيء */ } return; }
      settled = true;
      if (blockedTimer !== null) window.clearTimeout(blockedTimer);
      const db = req.result;
      wireLifecycle(db, dbName);
      st.db = db;
      st.appliedCount = st.steps.length;
      st.appliedAtVersion = version;
      attach(db);
      resolve(db);
    };
    req.onerror = () => fail(req.error);
  });
}

function attachShared(dbName: string, st: DbState, db: IDBDatabase): IDBDatabase {
  wireLifecycle(db, dbName);
  st.db = db;
  return db;
}

/**
 * فتح قاعدة البيانات المشتركة مع ضمان تطبيق خطوات الترقية المسجلة.
 * النداءات المتكررة تحصل على نفس الاتصال، والخطوات المتأخرة ترفع الإصدار تلقائياً.
 */
export function openSharedDatabase(dbName: string, upgradeStep: UpgradeStep): Promise<IDBDatabase> {
  let st = states.get(dbName);
  if (!st) {
    st = { db: null, appliedCount: 0, appliedAtVersion: null, steps: [] };
    states.set(dbName, st);
  }
  st.steps.push(upgradeStep);

  const ensure = (async () => {
    // المسار السريع: اتصال صالح وكل الخطوات المسجلة مطبقة عنده
    if (st.db && st.appliedCount === st.steps.length) return st.db;

    // أغلق أي اتصال قديم قبل طلب ترقية — يمنع انسداد ذاتي
    if (st.db) {
      try { st.db.close(); } catch { /* مغلق مسبقاً */ }
      st.db = null;
    }

    // استطلاع بلا إصدار — مضمون عدم الحجب في كل الحالات
    const probe = await openNoVersion(dbName);
    const actual = probe.version;
    probe.close();

    // الخطوات مطبقة سابقاً على إصدار >= مسجّل → فتح عادي بلا ترقية
    if (st.appliedCount === st.steps.length && st.appliedAtVersion !== null && st.appliedAtVersion <= actual) {
      const db = await openNoVersion(dbName);
      return attachShared(dbName, st, db);
    }

    // ترقية واحدة بكل الخطوات المسجلة تراكمياً
    try {
      return await openWithSteps(dbName, st, actual + 1, () => {});
    } catch (err) {
      // نسخة أحدث فُتحت من نداء/تبويب متوازٍ — استطلاع جديد وإعادة bump
      // (الخطوات contains-guarded فالتطبيق المكرر no-op آمن)
      if (err instanceof DOMException && err.name === 'VersionError') {
        const p2 = await openNoVersion(dbName);
        const v2 = p2.version;
        p2.close();
        return await openWithSteps(dbName, st, v2 + 1, () => {});
      }
      throw err;
    }
  })();

  return ensure;
}

/**
 * هل اتصال قاعدة البيانات ميت (مغلق)؟ — تستهلكه الخدمات التي تخزّن وعدَ
 * الاتصال مؤقتاً لإعادة الفتح تلقائياً بدل تكرار الأخطاء على اتصال ميت.
 */
export async function isConnectionDead(dbPromise: Promise<IDBDatabase>): Promise<boolean> {
  try {
    const db = await dbPromise;
    return deadConnections.has(db);
  } catch {
    return true; // وعد مرفوض سابقاً = الاتصال لم ينجح أصلاً
  }
}
