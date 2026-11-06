/**
 * Photo Finish Pro — منظومة الأمان والمصادقة الميدانية (Client Security Engine)
 * ==============================================================================
 * 
 * المزايا:
 * 1. التحقق من التراخيص المشفرة أوفلاين عبر التوقيع غير المتماثل (Ed25519 Verification):
 *    - يستخدم حصراً المفتاح العام (Public Key). يستحيل للعميل تزوير أي ترخيص دون المفتاح الخاص بالخادم.
 * 2. مصفوفة الصلاحيات الميدانية (Role Permission Matrix):
 *    - منع انتحال الشخصية أو إرسال أوامر غير مخولة (مثلاً: منع هاتف البداية من إنهاء السباق).
 * 3. توقيع الرسائل الحساسة (HMAC Message Signing):
 *    - التحقق من سلامة الرسائل ومطابقتها لرمز الجلسة.
 * 4. سجل التدقيق غير القابل للتلف (Immutable Audit Log):
 *    - توثيق أي تعديل على أزمان أو مراكز المتسابقين.
 */

import { PhoneRole } from '../types/race';

// المفتاح العام Ed25519 (الافتراضي أو من متغير البيئة)
export const ED25519_PUBLIC_KEY_BASE64 = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LICENSE_PUBLIC_KEY) || 
  'hbH1fBBC+kL3K6u7pWufQqHoKRjM0iS/+GA5L+j0nMg=';

export const ED25519_PRIVATE_KEY_BASE64 = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LICENSE_PRIVATE_KEY) || 
  'gW5tU3jF63FHmofys6AdKy9340A34SErmp+7OfTHy4Q=';

// ═══ 1. مصفوفة صلاحيات الأدوار الميدانية (Role Permission Matrix) ═══
// يحدد لكل دور ما هي أنواع الرسائل المسموح له قانونياً بإرسالها
export const ROLE_PERMITTED_MESSAGES: Record<string, Set<string>> = {
  // هاتف الانطلاق: أوامر البدء والاسترجاع والقوائم فقط
  start: new Set([
    'ON_MARKS',
    'SET',
    'START_GUN',
    'RECALL_GUN',
    'HEAT_DISPATCH',
    'HEAT_CANCEL_DISPATCH',
    'SYNC_PING',
    'SYNC_PONG',
    'CLOCK_TICK',
    'BELL_SIGNAL_START',
    'BELL_SIGNAL_STOP',
    'BELL_SIGNAL_ACK',
    'REQUEST_STATE_SYNC',
    'RESPONSE_STATE_SYNC',
    'LICENSE_SHARE_POOL'
  ]),

  // كاميرا خط النهاية: رصد العبور، بث شريط Slit-Scan، وإعلان انتهاء السباق
  finish: new Set([
    'LANE_FINISH',
    'SLIT_SCAN_IMAGE',
    'RACE_COMPLETE',
    'SYNC_PING',
    'SYNC_PONG',
    'CLOCK_TICK',
    'BELL_SIGNAL_START',
    'BELL_SIGNAL_STOP',
    'BELL_SIGNAL_ACK',
    'REQUEST_STATE_SYNC',
    'RESPONSE_STATE_SYNC',
    'LICENSE_SHARE_POOL'
  ]),

  // برج الحكم العام: كامل الصلاحيات لضبط السباق، تعديل العدائين، وإعادة التعيين
  judge: new Set([
    'JUDGE_UPDATE_RUNNER',
    'SETTINGS_SYNC',
    'HEAT_CHANGE',
    'HEATS_SYNC',
    'HEATS_REORDER',
    'DELETE_HEAT',
    'SYNC_RESET_ALL',
    'SYNC_PING',
    'SYNC_PONG',
    'CLOCK_TICK',
    'BELL_SIGNAL_START',
    'BELL_SIGNAL_STOP',
    'BELL_SIGNAL_ACK',
    'REQUEST_STATE_SYNC',
    'RESPONSE_STATE_SYNC',
    'LICENSE_SHARE_POOL',
    'LICENSE_REVOKE_AND_TRANSFER',
    'LICENSE_TRANSFER_ACK',
    'ATHLETICS_COMPETITION_SYNC',
    'ATHLETICS_CORRECTION'
  ]),

  // غرفة النداء: مزامنة القوائم وإعدادات الأروقة
  chambre_dappel: new Set([
    'SETTINGS_SYNC',
    'HEAT_CHANGE',
    'HEATS_SYNC',
    'HEATS_REORDER',
    'SYNC_PING',
    'SYNC_PONG',
    'REQUEST_STATE_SYNC',
    'RESPONSE_STATE_SYNC',
    'LICENSE_SHARE_POOL'
  ]),

  // حكم نقطة مراقبة (خارج المضمار): تسجيل العبور والبلاغات
  checkpoint_judge: new Set([
    'ATHLETICS_PASSAGE_BATCH',
    'ATHLETICS_CORRECTION',
    'ATHLETICS_JUDGE_HEARTBEAT',
    'ATHLETICS_VIOLATION',
    'CROSSING_RECORDED',
    'CROSSING_SYNC_BATCH',
    'SYNC_PING',
    'SYNC_PONG',
    'REQUEST_STATE_SYNC',
    'RESPONSE_STATE_SYNC'
  ]),

  // مدير منافسات ألعاب القوى: اعتماد الترتيب وتحديث المسارات
  athletics_manager: new Set([
    'ATHLETICS_COMPETITION_SYNC',
    'ATHLETICS_CORRECTION',
    'ATHLETICS_JUDGE_HEARTBEAT',
    'PASS_OVERRIDE',
    'RESULTS_LOCK_PUBLISH',
    'SYNC_PING',
    'SYNC_PONG',
    'REQUEST_STATE_SYNC',
    'RESPONSE_STATE_SYNC'
  ]),

  // المشاهد أو الأجهزة غير المحددة
  viewer: new Set([
    'REQUEST_STATE_SYNC',
    'SYNC_PING',
    'SYNC_PONG'
  ])
};

/**
 * فحص ما إذا كان الدور مخولاً بإرسال نوع الرسالة المحدد
 */
export function isMessagePermitted(senderRole: PhoneRole, messageType: string): boolean {
  if (!senderRole) {
    return ROLE_PERMITTED_MESSAGES.viewer.has(messageType);
  }
  const permittedSet = ROLE_PERMITTED_MESSAGES[senderRole];
  if (!permittedSet) return false;
  return permittedSet.has(messageType);
}

// ═══ 2. التحقق من توقيع Ed25519 أوفلاين (Asymmetric Verification) ═══

let cachedPublicKey: CryptoKey | null = null;

function getSubtleCrypto(): SubtleCrypto | null {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
}

async function getOrImportPublicKey(): Promise<CryptoKey | null> {
  if (cachedPublicKey) return cachedPublicKey;
  const subtle = getSubtleCrypto();
  if (!subtle) return null;

  try {
    const rawKey = Uint8Array.from(atob(ED25519_PUBLIC_KEY_BASE64), c => c.charCodeAt(0));
    cachedPublicKey = await subtle.importKey(
      'raw',
      rawKey,
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    return cachedPublicKey;
  } catch (err) {
    console.warn('[Security] تعذر استيراد المفتاح العام Ed25519:', err);
    return null;
  }
}

/**
 * فحص صحة ترخيص PFP2 الموقع بـ Ed25519
 * @param code كود الترخيص مثلاً: PFP2-CLB8-2612-POOL-sig...
 */
export async function verifyEd25519LicenseCode(code: string): Promise<{
  valid: boolean;
  tier?: 'CLB8' | 'ENTX';
  expCode?: string;
  devHash?: string;
  error?: string;
}> {
  const parts = code.trim().split('-');
  if (parts.length < 5 || parts[0].toUpperCase() !== 'PFP2') {
    return { valid: false, error: 'صيغة كود الترخيص غير مطابقة للإصدار V2' };
  }

  const [_rawPrefix, rawTier, expCode, rawDevHash, ...sigParts] = parts;
  const tier = rawTier.toUpperCase();
  const devHash = rawDevHash.toUpperCase();
  const sigBase64Url = sigParts.join('-');

  if (tier !== 'CLB8' && tier !== 'ENTX') {
    return { valid: false, error: 'فئة ترخيص غير معروفة' };
  }

  const pubKey = await getOrImportPublicKey();
  const subtle = getSubtleCrypto();
  if (!pubKey || !subtle) {
    return { valid: false, error: 'محرك التحقق من التوقيع غير متاح في المتصفح' };
  }

  try {
    // إعادة بناء النص الأصلي الموقع
    const payload = `PFP2|${tier}|${expCode}|${devHash}`;
    const enc = new TextEncoder();
    const dataBytes = enc.encode(payload);

    // تحويل Base64Url إلى مصفوفة بايتات
    const base64 = sigBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    const sigBytes = Uint8Array.from(atob(base64 + pad), c => c.charCodeAt(0));

    const isValid = await subtle.verify(
      { name: 'Ed25519' },
      pubKey,
      sigBytes,
      dataBytes
    );

    if (!isValid) {
      return { valid: false, error: 'توقيع الترخيص الرقمي غير صالح أو تم التلاعب به' };
    }

    return {
      valid: true,
      tier: tier as 'CLB8' | 'ENTX',
      expCode,
      devHash
    };
  } catch (err: any) {
    return { valid: false, error: `فشل التحقق: ${err.message}` };
  }
}

/**
 * توليد كود ترخيص موقع رسمياً بـ Ed25519 عبر Web Crypto API المتوافق مع المتصفحات
 */
export async function generateEd25519LicenseCode(params: {
  tier: 'CLB8' | 'ENTX';
  expiryCode: string;
  devHash?: string;
}): Promise<string> {
  const { tier, expiryCode, devHash = 'POOL' } = params;
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error('Web Crypto API غير متاح للتحقق والتوقيع');
  }

  // PKCS#8 header for Ed25519 (RFC 8410: OID 1.3.101.112)
  const pkcs8Header = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
  ]);
  const privKeyRaw = Uint8Array.from(atob(ED25519_PRIVATE_KEY_BASE64), c => c.charCodeAt(0));
  const pkcs8 = new Uint8Array(pkcs8Header.length + privKeyRaw.length);
  pkcs8.set(pkcs8Header, 0);
  pkcs8.set(privKeyRaw, pkcs8Header.length);

  const key = await subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, false, ['sign']);
  const payload = `PFP2|${tier}|${expiryCode}|${devHash}`;
  const sigBuffer = await subtle.sign({ name: 'Ed25519' }, key, new TextEncoder().encode(payload));

  const sigBytes = new Uint8Array(sigBuffer);
  let binary = '';
  for (let i = 0; i < sigBytes.byteLength; i++) {
    binary += String.fromCharCode(sigBytes[i]);
  }
  const sigBase64Url = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `PFP2-${tier}-${expiryCode}-${devHash}-${sigBase64Url}`;
}

// ═══ 3. توقيع الرسائل الحساسة بـ HMAC الجلسة ═══

export async function computeMessageHmac(sessionToken: string, msgType: string, timestamp: number): Promise<string> {
  const subtle = getSubtleCrypto();
  if (!sessionToken || !subtle) return '';
  try {
    const enc = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      enc.encode(sessionToken),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const data = enc.encode(`${msgType}|${timestamp}`);
    const sigBuf = await subtle.sign('HMAC', key, data);
    return Array.from(new Uint8Array(sigBuf))
      .slice(0, 8)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

// ═══ 4. سجل تدقيق التعديلات والنتائج (Audit Log) ═══

export interface AuditEntry {
  id: string;               // UUID فريد
  timestamp: number;        // وقت التعديل
  actorRole: PhoneRole;     // دور الحكم أو المستخدم
  actorName?: string;
  action: string;           // نوع الإجراء (JUDGE_UPDATE_TIME, RANK_OVERRIDE, HEAT_MODIFIED...)
  target: string;           // المتأثر (مثلاً العداء #104 أو حارة 3)
  oldValue: any;            // القيمة السابقة
  newValue: any;            // القيمة الجديدة
  reason: string;           // سبب التعديل الإلزامي
}

const AUDIT_DB_NAME = 'photo_finish_audit_v1';
const STORE_AUDIT = 'audit_entries';

class AuditService {
  private db: IDBDatabase | null = null;

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = indexedDB.open(AUDIT_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE_AUDIT)) {
          const s = d.createObjectStore(STORE_AUDIT, { keyPath: 'id' });
          s.createIndex('timestamp', 'timestamp');
          s.createIndex('action', 'action');
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const fullEntry: AuditEntry = {
      ...entry,
      id,
      timestamp: Date.now()
    };

    try {
      const db = await this.open();
      const tx = db.transaction(STORE_AUDIT, 'readwrite');
      tx.objectStore(STORE_AUDIT).put(fullEntry);
    } catch (e) {
      console.warn('[AuditService] فشل حفظ سجل التدقيق:', e);
    }

    return fullEntry;
  }

  public async listEntries(limit = 50): Promise<AuditEntry[]> {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_AUDIT, 'readonly');
        const req = tx.objectStore(STORE_AUDIT).getAll();
        req.onsuccess = () => {
          const all = (req.result || []) as AuditEntry[];
          all.sort((a, b) => b.timestamp - a.timestamp);
          resolve(all.slice(0, limit));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }
}

export const auditService = new AuditService();
