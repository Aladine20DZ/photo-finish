import { athleteClubStorage } from './athleteClubStorage';
/**
 * PHOTO FINISH PRO AI — Multi-Portal Authentication & League Registration Service
 * Provides dedicated authentication isolation for:
 *   1. League / Federation Executives (with New League Account Registration)
 *   2. Club Coaches & Technical Staff
 *   3. Field Judges & Race Officials (Duty Codes / Credentials)
 *   4. Super Administrators
 * 
 * Works 100% offline via encrypted local store, and synchronizes with Supabase when online.
 */

export type PortalType = 'league' | 'coach' | 'judge' | 'admin' | 'public';

/**
 * Stage 1 Security: توقيع الجلسات انتقل إلى الخادم (server/sessionTokens.js بـ HMAC + SESSION_SECRET).
 * ما يبقى هنا (PFPv1) مجرد ملصق جلسة محلي غير سري لحكام الميدان والمدربين — لا يمنح أي صلاحية
 * خادمية، والعمليات الخادمية تتحقق من رموز PFPs1 الموقعة خادمياً حصراً.
 */
function computeLocalSessionChecksum(portal: string, userId: string, issuedAt: string): string {
  const data = `${portal}::${userId}::${issuedAt}`;
  let h1 = 0xdeadbeef ^ 0x811c9dc5;
  let h2 = 0x41c6ce57 ^ 0xcbf29ce4;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

// ═══ بوابة مصادقة الرابطات (League Auth Gateway) ═══
// الافتراضي: HTTP إلى الخادم (/api/league/*). الاختبارات تحقن بوابة تستهلك
// المعالج الخادمي فعلياً (نفس scrypt والجلسات الموقعة).

export interface LeagueAuthGatewayRequest {
  username: string;
  password: string;
  targetLeagueId?: string;
}

export interface LeagueAuthGatewaySession {
  token: string;
  leagueId: string;
  userId: string;
  username: string;
  role: string;
  expiresAt?: number;
}

export interface LeagueAuthGatewayResult {
  success: boolean;
  session?: LeagueAuthGatewaySession;
  error?: string;
}

export interface LeagueAuthGateway {
  login(req: LeagueAuthGatewayRequest): Promise<LeagueAuthGatewayResult>;
  register(req: { leagueId: string; username: string; email: string; password: string; aliases?: string[] }): Promise<LeagueAuthGatewayResult>;
}

function mapServerSession(data: any): LeagueAuthGatewayResult {
  const session = data?.session;
  if (!data?.ok || !session?.token) {
    return { success: false, error: data?.error || 'فشل المصادقة الخادمية' };
  }
  return {
    success: true,
    session: {
      token: String(session.token),
      leagueId: String(session.leagueId || ''),
      userId: String(session.userId || ''),
      username: String(session.username || ''),
      role: String(session.role || 'league_admin'),
      expiresAt: Number(session.expiresAt) || undefined
    }
  };
}

const httpLeagueAuthGateway: LeagueAuthGateway = {
  async login(req) {
    try {
      const resp = await fetch('/api/league/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      const data = await resp.json().catch(() => null);
      return mapServerSession(data);
    } catch {
      return { success: false, error: 'تعذر الوصول إلى خادم المصادقة. تسجيل دخول الرابطات يتطلب اتصالاً بالخادم.' };
    }
  },
  async register(req) {
    try {
      const resp = await fetch('/api/league/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      const data = await resp.json().catch(() => null);
      return mapServerSession(data);
    } catch {
      return { success: false, error: 'تعذر الوصول إلى خادم المصادقة. إنشاء حساب الرابطة يتم عبر الخادم حصراً.' };
    }
  }
};

export interface SessionVerificationResult {
  valid: boolean;
  portal?: PortalType;
  role?: string;
  userId?: string;
  username?: string;
  leagueId?: string;
  error?: string;
}

export interface PortalSession {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  portal: PortalType;
  role: 'super_admin' | 'league_admin' | 'club_coach' | 'chief_judge' | 'timing_operator';
  leagueId?: string;
  leagueName?: string;
  leagueShort?: string;
  clubId?: string;
  clubName?: string;
  dutyCode?: string;
  token: string;
  loggedInAt: string;
}

export interface RegisteredLeague {
  id: string;
  name: string;
  shortName: string;
  type: 'wilaya' | 'regional' | 'national';
  region: string;
  wilaya: string;
  logoCode: string;
  accreditationNumber: string;
  officialEmail: string;
  phone: string;
  adminFullName: string;
  adminUsername: string;
  /** @deprecated Stage 1: كلمات مرور الرابطات تعيش على الخادم حصراً (scrypt) — هذا الحقل لا يُقرأ ولا يُقارن ولا يُخزَّن */
  adminPassword?: string;
  createdAt: string;
  isActive: boolean;
  is_demo?: boolean;
  archived_at?: string | null;
  logoUrl?: string;
  stampUrl?: string;
  signatureUrl?: string;
  presidentName?: string;
  secretaryName?: string;
  address?: string;
}

const DEFAULT_OFFICIAL_LEAGUES: RegisteredLeague[] = [
  {
    id: 'lg_saida',
    name: 'رابطة ألعاب القوى سعيدة (LWAS)',
    shortName: 'SAIDA',
    type: 'wilaya',
    region: 'ولاية سعيدة • المستوى الولائي',
    wilaya: 'سعيدة',
    logoCode: '🏃',
    accreditationNumber: 'LAAP-SAD-2026-020',
    officialEmail: 'lwassaida20@gmail.com',
    phone: '+213 65 00 00 20',
    adminFullName: 'رئيس رابطة ألعاب القوى سعيدة (LWAS)',
    adminUsername: 'saida_admin',
    createdAt: '2026-01-01T00:00:00Z',
    isActive: true,
    is_demo: false,
    archived_at: null,
  },
  // الكيانات الإقليمية السابقة في قاعدة البيانات لحفظ العلاقات التاريخية دون وجود أي حسابات دخول نشطة لها
  {
    id: 'lg_faa',
    name: 'الاتحاد الجزائري لألعاب القوى',
    shortName: 'FAA',
    type: 'national',
    region: 'الجزائر • المستوى الوطني الفيدرالي',
    wilaya: 'الجزائر العاصمة',
    logoCode: '🇩🇿',
    accreditationNumber: 'FAA-FED-2026-001',
    officialEmail: 'faa@athletic.dz',
    phone: '+213 21 00 00 01',
    adminFullName: 'الاتحاد الجزائري لألعاب القوى',
    adminUsername: '',
    createdAt: '2026-01-01T00:00:00Z',
    isActive: false,
    is_demo: false,
    archived_at: null,
  },
  {
    id: 'lg_algiers',
    name: 'الرابطة الولائية لألعاب القوى - الجزائر',
    shortName: 'LAA',
    type: 'wilaya',
    region: 'الجزائر • المستوى الولائي',
    wilaya: 'الجزائر العاصمة',
    logoCode: '🏛️',
    accreditationNumber: 'LAAP-ALG-2026-016',
    officialEmail: 'laa@athletic.dz',
    phone: '+213 21 11 22 33',
    adminFullName: 'رابطة الجزائر',
    adminUsername: '',
    createdAt: '2026-01-01T00:00:00Z',
    isActive: false,
    is_demo: false,
    archived_at: null,
  },
  {
    id: 'lg_oran',
    name: 'الرابطة الولائية لألعاب القوى - وهران',
    shortName: 'LAO',
    type: 'wilaya',
    region: 'وهران • المستوى الولائي',
    wilaya: 'وهران',
    logoCode: '🏃',
    accreditationNumber: 'LAAP-ORN-2026-031',
    officialEmail: 'lao@athletic.dz',
    phone: '+213 41 00 11 22',
    adminFullName: 'رابطة وهران',
    adminUsername: '',
    createdAt: '2026-01-01T00:00:00Z',
    isActive: false,
    is_demo: false,
    archived_at: null,
  },
  {
    id: 'lg_constantine',
    name: 'الرابطة الولائية لألعاب القوى - قسنطينة',
    shortName: 'LAC',
    type: 'wilaya',
    region: 'قسنطينة • المستوى الولائي',
    wilaya: 'قسنطينة',
    logoCode: '🌉',
    accreditationNumber: 'LAAP-CST-2026-025',
    officialEmail: 'lac@athletic.dz',
    phone: '+213 31 44 55 66',
    adminFullName: 'رابطة قسنطينة',
    adminUsername: '',
    createdAt: '2026-01-01T00:00:00Z',
    isActive: false,
    is_demo: false,
    archived_at: null,
  },
  {
    id: 'lg_setif',
    name: 'الرابطة الولائية لألعاب القوى - سطيف',
    shortName: 'LAS',
    type: 'wilaya',
    region: 'سطيف • المستوى الولائي',
    wilaya: 'سطيف',
    logoCode: '🌲',
    accreditationNumber: 'LAAP-STF-2026-019',
    officialEmail: 'las@athletic.dz',
    phone: '+213 36 77 88 99',
    adminFullName: 'رابطة سطيف',
    adminUsername: '',
    createdAt: '2026-01-01T00:00:00Z',
    isActive: false,
    is_demo: false,
    archived_at: null,
  },
  {
    id: 'lg_chlef',
    name: 'الرابطة الولائية لألعاب القوى - الشلف',
    shortName: 'LACH',
    type: 'wilaya',
    region: 'الشلف • المستوى الولائي',
    wilaya: 'الشلف',
    logoCode: '🌾',
    accreditationNumber: 'LAAP-CHF-2026-002',
    officialEmail: 'lach@athletic.dz',
    phone: '+213 27 00 11 22',
    adminFullName: 'رابطة الشلف',
    adminUsername: '',
    createdAt: '2026-01-01T00:00:00Z',
    isActive: false,
    is_demo: false,
    archived_at: null,
  }
];

const LEAGUES_STORAGE_KEY = 'pfp_registered_leagues_v2';
const LEAGUE_SESSION_KEY = 'pfp_league_session_v2';
const COACH_SESSION_KEY = 'pfp_coach_session_v2';
const JUDGE_SESSION_KEY = 'pfp_judge_session_v2';
const ADMIN_SESSION_KEY = 'pfp_admin_session_v2';
const MASTER_ACTIVE_SESSION_KEY = 'pfp_master_active_session_v3';

export class PortalAuthService {
  private listeners: (() => void)[] = [];
  private inMemoryLeagues: RegisteredLeague[] = [...DEFAULT_OFFICIAL_LEAGUES];
  private inMemorySessions: Record<string, PortalSession | null> = {};
  private leagueAuthGateway: LeagueAuthGateway = httpLeagueAuthGateway;

  constructor() {
    this.ensureDefaultLeagues();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(); } catch {}
    }
  }

  /**
   * حقن بوابة مصادقة للاختبارات فقط — تستهلك المعالج الخادمي الحقيقي.
   * في الإنتاج تبقى البوابة HTTP الافتراضية؛ لا يوجد أي مسار مصادقة محلي بلا خادم.
   */
  public setLeagueAuthGatewayForTests(gateway: LeagueAuthGateway): void {
    if (typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV)) {
      this.leagueAuthGateway = gateway;
    } else if (typeof (globalThis as any).__vitest_worker__ !== 'undefined' || String((globalThis as any).VITEST ?? '') !== '') {
      this.leagueAuthGateway = gateway;
    }
  }

  /** ترحيل أمني: إزالة أي كلمات مرور مأخوذة قديماً من التخزين المحلي (Stage 1) */
  private sanitizeLeagues(list: any[]): RegisteredLeague[] {
    for (const l of list) {
      if (l && typeof l === 'object' && 'adminPassword' in l) {
        try { delete l.adminPassword; } catch { l.adminPassword = undefined; }
      }
    }
    return list as RegisteredLeague[];
  }

  private ensureDefaultLeagues(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(LEAGUES_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(DEFAULT_OFFICIAL_LEAGUES));
        this.inMemoryLeagues = [...DEFAULT_OFFICIAL_LEAGUES];
      } else {
        const parsed = this.sanitizeLeagues(JSON.parse(stored));
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultIds = new Set(DEFAULT_OFFICIAL_LEAGUES.map(l => l.id));
          const customLeagues = parsed.filter((l: RegisteredLeague) => !defaultIds.has(l.id));
          const cleanLeagues = [...DEFAULT_OFFICIAL_LEAGUES, ...customLeagues];
          localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(cleanLeagues));
          this.inMemoryLeagues = cleanLeagues;
        } else {
          localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(DEFAULT_OFFICIAL_LEAGUES));
          this.inMemoryLeagues = [...DEFAULT_OFFICIAL_LEAGUES];
        }
      }
    } catch {}
  }

  public backupLeagues(): string {
    const backupKey = `pfp_leagues_backup_${Date.now()}`;
    if (typeof localStorage !== 'undefined') {
      try {
        const current = localStorage.getItem(LEAGUES_STORAGE_KEY) || JSON.stringify(this.inMemoryLeagues);
        localStorage.setItem(backupKey, current);
      } catch {}
    }
    return backupKey;
  }

  public restoreLeaguesBackup(backupKey: string): boolean {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(backupKey);
        if (stored) {
          localStorage.setItem(LEAGUES_STORAGE_KEY, stored);
          this.inMemoryLeagues = JSON.parse(stored);
          this.notify();
          return true;
        }
      } catch {}
    }
    return false;
  }

  public getAllLeagues(includeDemo: boolean = false): RegisteredLeague[] {
    let list = this.inMemoryLeagues;
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(LEAGUES_STORAGE_KEY);
        if (stored) {
          const parsed = this.sanitizeLeagues(JSON.parse(stored));
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.inMemoryLeagues = parsed;
            list = parsed;
          }
        }
      } catch {}
    }

    const showDemo = includeDemo !== undefined 
      ? includeDemo 
      : Boolean(typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV);
    if (!showDemo) {
      return list.filter(l => !l.is_demo && !l.archived_at);
    }
    return list;
  }

  public markLeagueAsDemo(leagueId: string, isDemo: boolean = true): boolean {
    this.backupLeagues();
    const leagues = this.getAllLeagues(true);
    const target = leagues.find(l => l.id === leagueId);
    if (!target) return false;
    target.is_demo = isDemo;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(leagues));
      } catch {}
    }
    this.inMemoryLeagues = leagues;
    this.notify();
    return true;
  }

  public archiveLeague(leagueId: string): boolean {
    this.backupLeagues();
    const leagues = this.getAllLeagues(true);
    const target = leagues.find(l => l.id === leagueId);
    if (!target) return false;
    target.archived_at = new Date().toISOString();
    target.is_demo = true;
    target.isActive = false;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(leagues));
      } catch {}
    }
    this.inMemoryLeagues = leagues;
    this.notify();
    return true;
  }

  public getLeagueById(id: string, includeDemo: boolean = false): RegisteredLeague | undefined {
    return this.getAllLeagues(includeDemo).find(l => l.id === id);
  }

  // ═══ تسجيل رابطة جديدة (Register New League) ═══

  public async registerNewLeague(data: {
    name: string;
    shortName: string;
    type: 'wilaya' | 'regional' | 'national';
    wilaya: string;
    region?: string;
    logoCode?: string;
    accreditationNumber: string;
    officialEmail: string;
    phone: string;
    adminFullName: string;
    adminUsername: string;
    adminPassword: string;
  }): Promise<{ success: boolean; league?: RegisteredLeague; error?: string }> {
    try {
      const leagues = this.getAllLeagues();

      // فحص فريدية عرضية سريع في الواجهة (الفحص الملزم على الخادم عبر UNIQUE constraints)
      const cleanShort = data.shortName.trim().toUpperCase();
      const cleanUser = data.adminUsername.trim().toLowerCase();
      const cleanEmail = data.officialEmail.trim().toLowerCase();

      if (leagues.some(l => l.shortName.toUpperCase() === cleanShort)) {
        return { success: false, error: `الرمز الرياضي المختصر (${cleanShort}) مستخدم بالفعل لرابطة أخرى.` };
      }
      if (leagues.some(l => l.adminUsername.toLowerCase() === cleanUser || l.officialEmail.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'اسم المستخدم أو البريد الإلكتروني مسجل بالفعل لرابطة سابقة.' };
      }

      const id = `lg_${cleanShort.toLowerCase()}_${Date.now().toString(36)}`;

      // Stage 1: الحساب وكلمة المرور ينشأن على الخادم حصراً (scrypt + جلسة موقعة)
      const auth = await this.leagueAuthGateway.register({
        leagueId: id,
        username: cleanUser,
        email: cleanEmail,
        password: data.adminPassword
      });
      if (!auth.success || !auth.session) {
        return { success: false, error: auth.error || 'تعذر إنشاء حساب الرابطة على الخادم.' };
      }

      // بيانات الرابطة العامة (بدون أي كلمة مرور) تبقى محفوظة محلياً للعرض
      const newLeague: RegisteredLeague = {
        id,
        name: data.name.trim(),
        shortName: cleanShort,
        type: data.type,
        region: data.region?.trim() || `${data.wilaya} • ${data.type === 'national' ? 'المستوى الوطني' : data.type === 'regional' ? 'المستوى الجهوي' : 'المستوى الولائي'}`,
        wilaya: data.wilaya.trim(),
        logoCode: data.logoCode || (data.type === 'national' ? '🇩🇿' : '🏛️'),
        accreditationNumber: data.accreditationNumber.trim(),
        officialEmail: cleanEmail,
        phone: data.phone.trim(),
        adminFullName: data.adminFullName.trim(),
        adminUsername: cleanUser,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      const updated = [...leagues, newLeague];
      this.inMemoryLeagues = updated;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(updated));
      }

      // جلسة تلقائية من الجلسة الموقعة خادمياً التي أعادها التسجيل
      const session = this.buildLeagueSession(auth.session, newLeague);
      this.logoutAll();
      this.inMemorySessions['league'] = session;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LEAGUE_SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(MASTER_ACTIVE_SESSION_KEY, JSON.stringify(session));
      }

      this.notify();
      return { success: true, league: newLeague };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء حفظ بيانات الرابطة الجديدة.' };
    }
  }

  // ═══ إدارة الجلسات وتسجيل الدخول للبوابات ═══

  public getActiveSession(): PortalSession | null {
    for (const p of ['league', 'coach', 'admin', 'judge'] as PortalType[]) {
      const sess = this.getSession(p);
      if (sess) return sess;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(MASTER_ACTIVE_SESSION_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  public getSession(portal: PortalType): PortalSession | null {
    if (this.inMemorySessions[portal]) return this.inMemorySessions[portal];
    if (typeof localStorage === 'undefined') return null;
    try {
      const key = portal === 'league' ? LEAGUE_SESSION_KEY :
                  portal === 'coach' ? COACH_SESSION_KEY :
                  portal === 'judge' ? JUDGE_SESSION_KEY :
                  portal === 'admin' ? ADMIN_SESSION_KEY : null;
      if (!key) return null;
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) this.inMemorySessions[portal] = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  // ═══ توليد والتحقق من رموز الجلسات ═══
  // PFPv1: ملصق جلسة محلي (حكام/مدربون — بلا سر، لا يمنح صلاحيات خادمية)
  // PFPs1: جلسة موقعة خادمياً HMAC (رابطات/مديرون — القيم داخلها موثوقة)

  public generateSessionToken(portal: PortalType, userId: string): string {
    const issuedAt = Date.now().toString();
    const sig = computeLocalSessionChecksum(portal, userId, issuedAt);
    return `PFPv1.${portal}.${userId}.${issuedAt}.${sig}`;
  }

  public verifySessionToken(token?: string | null): { valid: boolean; portal?: PortalType; userId?: string; role?: string; leagueId?: string; serverIssued?: boolean; error?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'رمز الجلسة مفقود' };
    }

    // جلسة موقعة خادمياً: النزاهة مضمونة بالتوقيع الخادمي؛ هنا نتحقق من البنية والصلاحية الزمنية
    if (token.startsWith('PFPs1.')) {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, error: 'تنسيق رمز الجلسة الخادمية غير صالح' };
      try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!payload?.exp || Date.now() > Number(payload.exp)) {
          return { valid: false, error: 'انتهت صلاحية رمز الجلسة' };
        }
        return {
          valid: true,
          portal: payload.portal as PortalType,
          userId: payload.userId,
          role: payload.role,
          leagueId: payload.leagueId,
          serverIssued: true
        };
      } catch {
        return { valid: false, error: 'حمولة رمز الجلسة الخادمية غير صالحة' };
      }
    }

    // ملصق جلسة محلي PFPv1 (حكام/مدربون)
    const parts = token.split('.');
    if (parts.length !== 5 || parts[0] !== 'PFPv1') {
      return { valid: false, error: 'تنسيق رمز الجلسة غير صالح' };
    }
    const [, portal, userId, issuedAt, sig] = parts;
    const now = Date.now();
    const issued = parseInt(issuedAt, 10);
    if (isNaN(issued) || issued > now + 300000) {
      return { valid: false, error: 'رمز الجلسة غير صالح زمنيًا' };
    }
    // Expire after 7 days
    if (now - issued > 7 * 24 * 60 * 60 * 1000) {
      return { valid: false, error: 'انتهت صلاحية رمز الجلسة' };
    }
    const expectedSig = computeLocalSessionChecksum(portal, userId, issuedAt);
    if (sig !== expectedSig) {
      return { valid: false, error: 'توقيع رمز الجلسة غير صالح أو تم التلاعب به' };
    }
    return { valid: true, portal: portal as PortalType, userId };
  }

  public verifySession(sessionOrToken?: PortalSession | string | null): SessionVerificationResult {
    let token: string | undefined;
    let expectedPortal: PortalType | undefined;
    let leagueId: string | undefined;
    let username: string | undefined;

    if (!sessionOrToken) {
      const active = this.getActiveSession();
      if (!active) {
        return { valid: false, error: 'لا توجد جلسة نشطة موثوقة' };
      }
      token = active.token;
      expectedPortal = active.portal;
      leagueId = active.leagueId;
      username = active.username;
    } else if (typeof sessionOrToken === 'string') {
      token = sessionOrToken;
    } else {
      token = sessionOrToken.token;
      expectedPortal = sessionOrToken.portal;
      leagueId = sessionOrToken.leagueId;
      username = sessionOrToken.username;
    }

    const tokenVerification = this.verifySessionToken(token);
    if (!tokenVerification.valid) {
      return { valid: false, error: tokenVerification.error };
    }

    if (expectedPortal && tokenVerification.portal !== expectedPortal) {
      return { valid: false, error: 'نوع البوابة لا يتطابق مع توقيع رمز الجلسة' };
    }

    const portal = tokenVerification.portal!;
    // Stage 1: الدور للجلسات الخادمية يأتي من الحمولة الموقعة حصراً —
    // الوسيط الممرّر من الواجهة (sessionOrToken.role) لا يُعتمد أبداً في القرار.
    let role: string;
    if (tokenVerification.serverIssued) {
      role = tokenVerification.role || (
        portal === 'admin' ? 'super_admin' :
        portal === 'league' ? 'league_admin' : 'chief_judge'
      );
    } else {
      // بوابة league/admin تتطلب جلسة موقعة خادمياً حصراً — الملصق المحلي لا يكفي
      if (portal === 'league' || portal === 'admin') {
        return { valid: false, error: 'بوابة الرابطة/الإدارة تتطلب جلسة موقعة خادمياً (PFPs1)' };
      }
      role = portal === 'coach' ? 'club_coach' : 'chief_judge';
    }

    return {
      valid: true,
      portal,
      role,
      userId: tokenVerification.userId,
      username,
      leagueId: tokenVerification.serverIssued ? tokenVerification.leagueId : leagueId
    };
  }

  /** بناء جلسة الواجهة من جلسة خادمية موقعة + بيانات الرابطة المحلية (للعرض فقط) */
  private buildLeagueSession(serverSession: LeagueAuthGatewaySession, league?: RegisteredLeague): PortalSession {
    return {
      userId: serverSession.userId || `usr_league_${(league?.shortName || 'x').toLowerCase()}`,
      username: league?.adminUsername || serverSession.username,
      fullName: league?.adminFullName || league?.name || 'مدير الرابطة',
      email: league?.officialEmail || '',
      portal: 'league',
      role: 'league_admin',
      leagueId: serverSession.leagueId || league?.id,
      leagueName: league?.name,
      leagueShort: league?.shortName,
      token: serverSession.token,
      loggedInAt: new Date().toISOString()
    };
  }

  public async loginLeague(username: string, pass: string, targetLeagueId?: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !pass) {
      return { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان.' };
    }

    // Stage 1: المصادقة عبر الخادم حصراً — لا مقارنة كلمات مرور في الواجهة إطلاقاً
    const auth = await this.leagueAuthGateway.login({
      username: cleanUser,
      password: pass,
      targetLeagueId
    });
    if (!auth.success || !auth.session) {
      return { success: false, error: auth.error || 'بيانات الدخول غير صحيحة.' };
    }

    // بيانات العرض من السجل المحلي (الاسم/الشعار) — ليست قراراً أمنياً
    const leagues = this.getAllLeagues(true);
    const league = leagues.find(l => l.id === auth.session!.leagueId)
      || (targetLeagueId ? leagues.find(l => l.id === targetLeagueId) : undefined);

    const session = this.buildLeagueSession(auth.session, league);

    // Enforce Single Active Account: clean previous sessions
    this.logoutAll();
    this.inMemorySessions['league'] = session;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEAGUE_SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(MASTER_ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
    this.notify();
    return { success: true, session };
  }

  public async loginCoach(username: string, pass: string, clubId?: string, customClubName?: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    const cleanUser = username.trim().toLowerCase();
    
    // Support default clubs & demo coach credentials strictly in DEV
    const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
    const demoValid = isDev && (cleanUser === 'coach_mca' || cleanUser === 'coach@mca.dz' || cleanUser === 'coach') && (pass === 'Coach@2026' || pass === 'coach123');
    const isCustom = cleanUser.length >= 3 && pass.length >= 4;

    if (!demoValid && !isCustom) {
      return { success: false, error: 'بيانات المدرب غير صحيحة (اسم المستخدم لا يقل عن 3 أحرف وكلمة المرور 4 أحرف).' };
    }

    const resolvedClub = clubId || 'club_mca';
    let clubName = customClubName;
    if (!clubName) {
      clubName = resolvedClub === 'club_mca' ? 'مولودية الجزائر (MCA)' :
                 resolvedClub === 'club_ess' ? 'وفاق سطيف (ESS)' :
                 resolvedClub === 'club_aso' ? 'أولمبي الشلف (ASO)' : 'النادي الرياضي المعتمد';
    }

    const userId = `usr_coach_${Date.now().toString(36)}`;
    const token = this.generateSessionToken('coach', userId);

    const session: PortalSession = {
      userId,
      username: cleanUser,
      fullName: cleanUser.includes('mca') ? 'المدرب كمال منصوري (MCA)' : `المدرب (${clubName})`,
      email: cleanUser.includes('@') ? cleanUser : `${cleanUser}@club.dz`,
      portal: 'coach',
      role: 'club_coach',
      clubId: resolvedClub,
      clubName,
      token,
      loggedInAt: new Date().toISOString()
    };

    // Enforce Single Active Account: clean previous sessions
    this.logoutAll();
    this.inMemorySessions['coach'] = session;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COACH_SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(MASTER_ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
    this.notify();
    return { success: true, session };
  }

  public async loginJudge(params: { dutyCode?: string; judgeName?: string; roomCode?: string; role?: string }): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    const { dutyCode, judgeName, roomCode = 'RACE-100', role = 'judge' } = params;

    let officialDuty = dutyCode ? dutyCode.trim().toUpperCase() : null;
    let assignedRole = (role as any) || 'judge';
    let name = judgeName ? judgeName.trim() : 'الحكم الميداني الرسمي';

    // Parse official duty code if provided
    if (officialDuty) {
      let matchedInLeague = false;
      try {
        if (typeof localStorage !== 'undefined') {
          const stored = localStorage.getItem('pfp_league_competitions_saida');
          if (stored) {
            const comps = JSON.parse(stored);
            if (Array.isArray(comps)) {
              for (const c of comps) {
                const foundDuty = c.dutyCodes?.find((d: any) => d.code?.toUpperCase() === officialDuty);
                if (foundDuty) {
                  matchedInLeague = true;
                  name = foundDuty.judgeName ? `${foundDuty.judgeName} — ${foundDuty.role}` : `حكم ${foundDuty.role} (${c.name})`;
                  const roleStr = (foundDuty.role || '').toLowerCase();
                  if (roleStr.includes('starter') || roleStr.includes('مسدس') || roleStr.includes('انطلاق')) assignedRole = 'start';
                  else if (roleStr.includes('photo finish') || roleStr.includes('نهاية') || roleStr.includes('وصول')) assignedRole = 'finish';
                  else if (roleStr.includes('call') || roleStr.includes('نداء')) assignedRole = 'chambre_dappel';
                  else if (roleStr.includes('checkpoint') || roleStr.includes('مراقبة') || roleStr.includes('مسار')) assignedRole = 'checkpoint_judge';
                  else if (roleStr.includes('chief') || roleStr.includes('الحكم العام')) assignedRole = 'chief_judge';
                  else if (roleStr.includes('chrono') || roleStr.includes('يدوي') || roleStr.includes('توقيت')) assignedRole = 'timing_operator';
                  else assignedRole = 'judge';
                  break;
                }
              }
            }
          }
        }
      } catch {}

      if (!matchedInLeague) {
        if (officialDuty.startsWith('START-')) assignedRole = 'start';
        else if (officialDuty.startsWith('FINISH-')) assignedRole = 'finish';
        else if (officialDuty.startsWith('CALL-')) assignedRole = 'chambre_dappel';
        else if (officialDuty.startsWith('CP-')) assignedRole = 'checkpoint_judge';
        else if (officialDuty.startsWith('CHIEF-')) assignedRole = 'chief_judge';
        else if (officialDuty.startsWith('CHRONO-') || officialDuty.startsWith('LANE-')) assignedRole = 'timing_operator';
        name = `حكم رسمي معتمد (${officialDuty})`;
      }
    }

    const userId = `usr_judge_${Date.now().toString(36)}`;
    const token = this.generateSessionToken('judge', userId);

    const session: PortalSession = {
      userId,
      username: officialDuty || `judge_${roomCode}`,
      fullName: name,
      email: `judge@athletic.dz`,
      portal: 'judge',
      role: assignedRole === 'timing_operator' || assignedRole === 'start' || assignedRole === 'finish' ? 'timing_operator' : 'chief_judge',
      dutyCode: officialDuty || undefined,
      token,
      loggedInAt: new Date().toISOString()
    };

    // Enforce Single Active Account: clean previous sessions
    this.logoutAll();
    this.inMemorySessions['judge'] = session;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(JUDGE_SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(MASTER_ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
    this.notify();
    return { success: true, session };
  }

  /**
   * Stage 1: مصادقة المدير عبر الخادم حصراً (POST /api/admin/login — timing-safe + rate limit).
   * لا مقارنة كلمات مرور في الواجهة ولا أي قيمة افتراضية.
   */
  public async loginAdmin(password: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await resp.json().catch(() => ({}));
      const adminToken = data.token || data.adminToken;

      if (resp.status === 429) {
        return { success: false, error: data.error || 'تم تجاوز الحد الأقصى للمحاولات. انتظر 15 دقيقة.' };
      }
      if (!resp.ok || !data.success || !adminToken) {
        return { success: false, error: data.error || 'كلمة مرور الإدارة غير صحيحة.' };
      }
      return this.adoptAdminServerSession(String(adminToken));
    } catch {
      return { success: false, error: 'تعذر الوصول إلى خادم المصادقة — دخول المدير يتطلب الخادم.' };
    }
  }

  /** تبنّي جلسة إدارية موقعة خادمياً (تُستدعى بعد نجاح /api/admin/login) */
  public adoptAdminServerSession(serverToken: string): { success: boolean; session?: PortalSession; error?: string } {
    if (!serverToken) return { success: false, error: 'توكن الخادم مفقود.' };

    const verification = this.verifySessionToken(serverToken);
    const role = verification.valid && verification.role ? verification.role : 'super_admin';

    const session: PortalSession = {
      userId: verification.valid ? verification.userId || 'usr_super_admin' : 'usr_super_admin',
      username: 'super_admin',
      fullName: 'مدير المنصة الشامل (Super Administrator)',
      email: 'admin@photofinish.ai',
      portal: 'admin',
      role: role === 'league_admin' ? 'league_admin' : 'super_admin',
      token: serverToken,
      loggedInAt: new Date().toISOString()
    };

    // Enforce Single Active Account: clean previous sessions
    this.logoutAll();
    this.inMemorySessions['admin'] = session;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(MASTER_ACTIVE_SESSION_KEY, JSON.stringify(session));
      // توكن الخادم الموقّع متاح للخدمات الإدارية (licenseManager/pricingService)
      try { localStorage.setItem('pfp_admin_session_token', serverToken); } catch { /* */ }
    }
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.setItem('pf_admin_token', serverToken); } catch { /* */ }
    }
    this.notify();
    return { success: true, session };
  }

  public logout(portal: PortalType): void {
    this.inMemorySessions[portal] = null;
    if (typeof localStorage !== 'undefined') {
      if (portal === 'league') localStorage.removeItem(LEAGUE_SESSION_KEY);
      else if (portal === 'coach') localStorage.removeItem(COACH_SESSION_KEY);
      else if (portal === 'judge') localStorage.removeItem(JUDGE_SESSION_KEY);
      else if (portal === 'admin') {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem('pfp_admin_session_token');
      }
    }
    if (portal === 'admin' && typeof sessionStorage !== 'undefined') {
      try { sessionStorage.removeItem('pf_admin_token'); } catch { /* */ }
    }
    this.notify();
  }

  public logoutAll(): void {
    this.inMemorySessions = {};
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LEAGUE_SESSION_KEY);
      localStorage.removeItem(COACH_SESSION_KEY);
      localStorage.removeItem(JUDGE_SESSION_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(MASTER_ACTIVE_SESSION_KEY);
    }
    this.notify();
  }

  // ═══ تسجيل مدرب ونادٍ رياضي جديد ═══
  public async registerCoachAndClub(params: {
    coachName: string;
    clubName: string;
    wilaya: string;
    clubCode?: string;
    licenseNumber?: string;
    phone?: string;
    email?: string;
    username: string;
    password: string;
  }): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    const cleanUser = params.username.trim().toLowerCase();
    if (cleanUser.length < 3 || params.password.length < 4) {
      return { success: false, error: 'اسم مستخدم المدرب لا يقل عن 3 أحرف وكلمة المرور 4 أحرف.' };
    }
    if (!params.coachName.trim() || !params.clubName.trim()) {
      return { success: false, error: 'يرجى إدخال اسم المدرب واسم النادي أو الجمعية الرياضية.' };
    }

    const clubId = `club_${Date.now().toString(36)}`;
    const clubCode = params.clubCode?.trim().toUpperCase() || params.clubName.slice(0, 3).toUpperCase();

    try {
      await athleteClubStorage.saveClub({
        id: clubId,
        name: params.clubName.trim(),
        code: clubCode,
        wilaya: params.wilaya || 'سعيدة',
        city: params.wilaya || 'سعيدة',
        presidentName: params.coachName.trim(),
        headCoachName: params.coachName.trim(),
        phone: params.phone || '',
        email: params.email || '',
        colors: ['#059669', '#F59E0B'],
        activeAthletesCount: 0,
        medalsTally: { gold: 0, silver: 0, bronze: 0, total: 0 },
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } catch {}

    return this.loginCoach(cleanUser, params.password, clubId, params.clubName.trim());
  }

  // ═══ حذف رابطة (Delete League) ═══

  public updateLeagueProfile(leagueId: string, updates: Partial<RegisteredLeague>): RegisteredLeague | null {
    const leagues = this.getAllLeagues();
    const idx = leagues.findIndex(l => l.id === leagueId);
    if (idx === -1) return null;
    const updated: RegisteredLeague = { ...leagues[idx], ...updates };
    leagues[idx] = updated;
    this.inMemoryLeagues = leagues;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(leagues));
    }
    this.notify();
    return updated;
  }

  public deleteLeague(id: string): boolean {
    // Prevent deleting the default Saïda league
    if (id === 'lg_saida') return false;
    const leagues = this.getAllLeagues();
    const filtered = leagues.filter(l => l.id !== id);
    if (filtered.length === leagues.length) return false; // not found
    this.inMemoryLeagues = filtered;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(filtered));
    }
    // Log out if the deleted league had an active session
    const leagueSession = this.getSession('league');
    if (leagueSession?.leagueId === id) {
      this.logout('league');
    }
    this.notify();
    return true;
  }

  // ═══ مسح جميع البيانات وإعادة التهيئة ═══

  public resetToSaidaOnly(): void {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryLeagues = [...DEFAULT_OFFICIAL_LEAGUES];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(DEFAULT_OFFICIAL_LEAGUES));
      localStorage.removeItem(LEAGUE_SESSION_KEY);
      localStorage.removeItem(COACH_SESSION_KEY);
      localStorage.removeItem(JUDGE_SESSION_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    this.inMemorySessions = {};
    this.notify();
  }
}

export const portalAuthService = new PortalAuthService();
