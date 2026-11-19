/**
 * Photo Finish Pro — مخزن إدارة الباقات والتراخيص المركزي (Central Licensing Store)
 * ==============================================================================
 * يدعم التخزين على SQLite مدمج (node:sqlite) في بيئة Windows / Node،
 * مع تحويل سلس إلى الذاكرة المؤقتة (Memory Fallback) في بيئات Serverless مثل Vercel.
 *
 * الكيانات:
 * 1. Plans: إدارة الباقات والميزات والأسعار (DZD / EUR / USD)
 * 2. Licenses: سجل التراخيص الصادرة وحالاتها وتواريخها
 * 3. LicenseActivations: تتبع الأجهزة المفعلة لكل ترخيص
 * 4. LicenseRenewals: سجل تمديد وتجديد التراخيص
 * 5. LicenseTransfers: سجل التحويل والتنازل بين الأجهزة
 * 6. LicenseAuditLogs: سجل التدقيق الأمني لجميع العمليات الحساسة
 */

let DatabaseSync = null;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch (e) {
  DatabaseSync = null;
}

const LICENSING_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS licensing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  lane_count INTEGER NOT NULL DEFAULT 8,
  duration_months INTEGER NOT NULL DEFAULT 12,
  duration_label TEXT,
  price_dzd REAL DEFAULT 0,
  price_eur REAL DEFAULT 0,
  price_usd REAL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '[]',
  badge TEXT,
  tier_code TEXT NOT NULL DEFAULT 'CLB8',
  max_devices INTEGER NOT NULL DEFAULT 4,
  is_quad_pool INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_recommended INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS licensing_records (
  code TEXT PRIMARY KEY,
  plan_id TEXT,
  tier TEXT NOT NULL DEFAULT 'CLB8',
  tier_name TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  device_id TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  max_devices INTEGER NOT NULL DEFAULT 4,
  is_quad_pool INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  activated_at INTEGER,
  revoked_at INTEGER,
  transferred_to TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS licensing_activations (
  id TEXT PRIMARY KEY,
  license_code TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  platform TEXT,
  ip_address TEXT,
  activated_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(license_code, device_id)
);

CREATE TABLE IF NOT EXISTS licensing_renewals (
  id TEXT PRIMARY KEY,
  license_code TEXT NOT NULL,
  old_expiry_date TEXT NOT NULL,
  new_expiry_date TEXT NOT NULL,
  extended_months INTEGER NOT NULL,
  renewed_by TEXT,
  renewed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS licensing_transfers (
  voucher_code TEXT PRIMARY KEY,
  original_code TEXT NOT NULL,
  source_device_id TEXT NOT NULL,
  target_device_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  transferred_at INTEGER NOT NULL,
  revocation_proof TEXT,
  status TEXT NOT NULL DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS licensing_audit_logs (
  id TEXT PRIMARY KEY,
  license_code TEXT,
  action TEXT NOT NULL,
  actor TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);
`;

export const DEFAULT_INITIAL_PLANS = [
  {
    id: 'plan_club_pro_8l',
    name: 'باقة الأندية المعتمدة (Pro Club 8L)',
    description: 'باقة مصممة لأندية ألعاب القوى والبطولات الولائية حتى 8 مسارات أولمبية متكاملة',
    laneCount: 8,
    durationMonths: 12,
    durationLabel: 'سنة كاملة (موسم رياضي)',
    priceDZD: 35000,
    priceEUR: 220,
    priceUSD: 240,
    features: [
      'تحكيم حتى 8 مسارات (أروقة) أولمبية',
      'تفعيل شبكي 1*4 لكافة هواتف التحكيم والمضمار',
      'تصدير استمارات النتائج الرسمية IAAF',
      'إمكانية تحويل التفعيل لهاتف آخر بأمان'
    ],
    badge: 'الأكثر طلباً ⭐',
    tierCode: 'CLB8',
    maxDevices: 4,
    isQuadPool: true,
    isActive: true,
    isRecommended: true
  },
  {
    id: 'plan_enterprise_10l',
    name: 'رخصة الاتحادات والبطولات الكبرى (Enterprise 10L)',
    description: 'شاملة وغير محدودة للاتحادات الوطنية، الرابطات الولائية، والبطولات الدولية الكبرى (حتى 10 أروقة)',
    laneCount: 10,
    durationMonths: 12,
    durationLabel: 'سنة كاملة (موسم دولي)',
    priceDZD: 75000,
    priceEUR: 480,
    priceUSD: 520,
    features: [
      'تحكيم حتى 10 مسارات (أروقة) أولمبية كاملة',
      'تفعيل شبكي 1*4 متقدم لكافة محطات ومساعدي الحكام',
      'شريط مسح بانورامي عالي الدقة Slit-Scan وتصدير النتائج',
      'تقارير تحكيم مطابقة 100% لمعايير الاتحاد الدولي World Athletics',
      'دعم فني وتدريب طواقم التحكيم'
    ],
    badge: 'شامل وغير محدود 👑',
    tierCode: 'ENTX',
    maxDevices: 4,
    isQuadPool: true,
    isActive: true,
    isRecommended: false
  },
  {
    id: 'plan_schools_youth',
    name: 'باقة المدارس والناشئين (School & Youth)',
    description: 'مخصصة للمنافسات المدرسية والجامعية وأكاديميات الفئات الصغرى',
    laneCount: 6,
    durationMonths: 12,
    durationLabel: 'سنة كاملة (موسم دراسي)',
    priceDZD: 15000,
    priceEUR: 95,
    priceUSD: 105,
    features: [
      'تحكيم حتى 6 مسارات (أروقة) كاملة',
      'تفعيل شبكي 1*4 لأربعة هواتف',
      'حساسات بصرية دقيقة 1/1000 ثانية للمسافات القصيرة',
      'تصدير قوائم النتائج والشهادات'
    ],
    badge: 'باقة خاصة 🌟',
    tierCode: 'CLB8',
    maxDevices: 4,
    isQuadPool: true,
    isActive: true,
    isRecommended: false
  },
  {
    id: 'plan_state_league_lwas',
    name: 'باقة الرابطات الولائية (State League LWAS)',
    description: 'مصممة لتغطية بطولات الرابطات الولائية وأندية النخبة طوال الموسم الرياضي',
    laneCount: 8,
    durationMonths: 12,
    durationLabel: 'سنة كاملة (موسم رياضي)',
    priceDZD: 36000,
    priceEUR: 230,
    priceUSD: 250,
    features: [
      'تحكيم حتى 8 مسارات كاملة مع كاميرا Photo Finish',
      'شبكة 1*4 متزامنة لغرفة النداء، الانطلاق، والحكام',
      'تصدير معتمد لرابطة ألعاب القوى والاتحاد'
    ],
    badge: 'رابطات ولائية 🏆',
    tierCode: 'CLB8',
    maxDevices: 4,
    isQuadPool: true,
    isActive: true,
    isRecommended: false
  }
];

export const DEFAULT_AUTHORIZED_LICENSES = [
  {
    code: 'PFP2-CLB8-3111-GLBL-AjdZqqlk5QABX9XwbCheG8K-pxfcKJHdsXJDqfMPSyC75YtQqihOCqZP_nfacJoZkx0RVxvTzjab1RTL67NMAA',
    planId: 'plan_club_pro_8l',
    tier: 'CLB8',
    tierName: 'باقة الأندية المعتمدة (Pro Club 8L)',
    clientName: 'نادي رياضي معتمد',
    deviceId: 'GLOBAL',
    expiryDate: '2031-11-30',
    maxDevices: 4,
    isQuadPool: true,
    status: 'active'
  },
  {
    code: 'PFP2-CLB8-2705-POOL-EctvjOnWe7ymdZWt8MzCcTI3DAF2WsFZOrzN1S20vvEnf46HV6VH9ZJ3eT5eND2QOS9H2BzAN-poaPnr3x-_DQ',
    compactCode: 'PFP1-CLB8-2705-POOL-3DE27F62',
    planId: 'plan_state_league_lwas',
    tier: 'CLB8',
    tierName: 'باقة الرابطات الولائية (State League LWAS)',
    clientName: 'رابطة ألعاب القوى سعيدة (LWAS)',
    deviceId: 'POOL',
    expiryDate: '2027-05-31',
    maxDevices: 4,
    isQuadPool: true,
    status: 'active'
  },
  {
    code: 'PFP2-CLB8-2705-POOL-EctvjOnWe7ymdZWt8MzCcTI3DAF2WsFZOrzN1S20vvEnf46HV6VH9ZJ3eT5eND2QOS9H2BZaN-poapNrx-_DQ',
    compactCode: 'PFP1-CLB8-2705-POOL-3DE27F62',
    planId: 'plan_state_league_lwas',
    tier: 'CLB8',
    tierName: 'باقة الرابطات الولائية (State League LWAS)',
    clientName: 'رابطة ألعاب القوى سعيدة (LWAS)',
    deviceId: 'POOL',
    expiryDate: '2027-05-31',
    maxDevices: 4,
    isQuadPool: true,
    status: 'active'
  },
  {
    code: 'PFP2-CLB8-2711-POOL-nMseDQvO47dPIgMP68fcgMtXb4kVmsVvf6N0HlX80UEBxn71xqPwoHK7hFgZH3u-Cv77Q4eu02x0Uxog1cw7CQ',
    planId: 'plan_club_pro_8l',
    tier: 'CLB8',
    tierName: 'باقة الأندية المعتمدة (Pro Club 8L)',
    clientName: 'نادي الوفاق لألعاب القوى',
    deviceId: 'POOL',
    expiryDate: '2027-11-30',
    maxDevices: 4,
    isQuadPool: true,
    status: 'active'
  },
  {
    code: 'PFP2-CLB8-2712-POOL-beIp0Wj9wrQgH3r4ok3YsE5X0N6dAyMVGCBNSFaF__5VTz2BSJobJem2JVyQry3Y9t8ANUZDUBTNajA-lBR4CQ',
    planId: 'plan_club_pro_8l',
    tier: 'CLB8',
    tierName: 'باقة الأندية المعتمدة (Pro Club 8L)',
    clientName: 'رابطة ألعاب القوى',
    deviceId: 'POOL',
    expiryDate: '2027-12-31',
    maxDevices: 4,
    isQuadPool: true,
    status: 'active'
  }
];

export class LicensingStore {
  constructor({ dbPath = ':memory:' } = {}) {
    this.usingSqlite = !!DatabaseSync;
    this.memoryPlans = new Map();
    this.memoryLicenses = new Map();
    this.memoryActivations = new Map();
    this.memoryRenewals = new Map();
    this.memoryTransfers = new Map();
    this.memoryAuditLogs = [];

    if (this.usingSqlite) {
      try {
        this.db = new DatabaseSync(dbPath);
        this.db.exec(LICENSING_SCHEMA_SQL);
      } catch (e) {
        console.warn('[LicensingStore] تعذر فتح SQLite، التحويل إلى الذاكرة:', e?.message || e);
        this.usingSqlite = false;
      }
    }

    this._seedDefaultPlans();
    this._seedDefaultLicenses();
  }

  _seedDefaultPlans() {
    const existing = this.listPlans();
    if (existing.length === 0) {
      const now = Date.now();
      for (const p of DEFAULT_INITIAL_PLANS) {
        this.savePlan({
          ...p,
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }

  _seedDefaultLicenses() {
    const existing = this.listLicenses();
    for (const lic of DEFAULT_AUTHORIZED_LICENSES) {
      if (!existing.some(e => e.code === lic.code)) {
        this.saveLicense(lic);
      }
    }
  }

  // ══════════════════════════════════════
  // 1. إدارة الباقات (Plans Management)
  // ══════════════════════════════════════

  listPlans({ activeOnly = false } = {}) {
    if (this.usingSqlite) {
      const sql = activeOnly
        ? `SELECT * FROM licensing_plans WHERE is_active = 1 ORDER BY is_recommended DESC, lane_count ASC`
        : `SELECT * FROM licensing_plans ORDER BY is_recommended DESC, lane_count ASC`;
      const rows = this.db.prepare(sql).all();
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        laneCount: r.lane_count,
        durationMonths: r.duration_months,
        durationLabel: r.duration_label,
        priceDZD: r.price_dzd,
        priceEUR: r.price_eur,
        priceUSD: r.price_usd,
        features: JSON.parse(r.features || '[]'),
        badge: r.badge,
        tierCode: r.tier_code,
        maxDevices: r.max_devices,
        isQuadPool: Boolean(r.is_quad_pool),
        isActive: Boolean(r.is_active),
        isRecommended: Boolean(r.is_recommended),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    }

    let list = Array.from(this.memoryPlans.values());
    if (activeOnly) list = list.filter(p => p.isActive);
    return list.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
  }

  getPlan(planId) {
    if (!planId) return null;
    if (this.usingSqlite) {
      const r = this.db.prepare(`SELECT * FROM licensing_plans WHERE id = ?`).get(planId);
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        laneCount: r.lane_count,
        durationMonths: r.duration_months,
        durationLabel: r.duration_label,
        priceDZD: r.price_dzd,
        priceEUR: r.price_eur,
        priceUSD: r.price_usd,
        features: JSON.parse(r.features || '[]'),
        badge: r.badge,
        tierCode: r.tier_code,
        maxDevices: r.max_devices,
        isQuadPool: Boolean(r.is_quad_pool),
        isActive: Boolean(r.is_active),
        isRecommended: Boolean(r.is_recommended),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    }
    return this.memoryPlans.get(planId) || null;
  }

  savePlan(plan) {
    const id = plan.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const doc = {
      id,
      name: plan.name || 'باقة جديدة',
      description: plan.description || '',
      laneCount: Number(plan.laneCount) || 8,
      durationMonths: Number(plan.durationMonths) || 12,
      durationLabel: plan.durationLabel || `${plan.durationMonths || 12} شهر`,
      priceDZD: Number(plan.priceDZD) || 0,
      priceEUR: Number(plan.priceEUR) || 0,
      priceUSD: Number(plan.priceUSD) || 0,
      features: Array.isArray(plan.features) ? plan.features : [],
      badge: plan.badge || '',
      tierCode: plan.tierCode === 'ENTX' ? 'ENTX' : 'CLB8',
      maxDevices: Number(plan.maxDevices) || (plan.isQuadPool ? 4 : 1),
      isQuadPool: plan.isQuadPool !== undefined ? Boolean(plan.isQuadPool) : true,
      isActive: plan.isActive !== undefined ? Boolean(plan.isActive) : true,
      isRecommended: Boolean(plan.isRecommended),
      createdAt: plan.createdAt || now,
      updatedAt: now
    };

    if (this.usingSqlite) {
      const stmt = this.db.prepare(`
        INSERT INTO licensing_plans (
          id, name, description, lane_count, duration_months, duration_label,
          price_dzd, price_eur, price_usd, features, badge, tier_code,
          max_devices, is_quad_pool, is_active, is_recommended, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          description=excluded.description,
          lane_count=excluded.lane_count,
          duration_months=excluded.duration_months,
          duration_label=excluded.duration_label,
          price_dzd=excluded.price_dzd,
          price_eur=excluded.price_eur,
          price_usd=excluded.price_usd,
          features=excluded.features,
          badge=excluded.badge,
          tier_code=excluded.tier_code,
          max_devices=excluded.max_devices,
          is_quad_pool=excluded.is_quad_pool,
          is_active=excluded.is_active,
          is_recommended=excluded.is_recommended,
          updated_at=excluded.updated_at
      `);
      stmt.run(
        doc.id, doc.name, doc.description, doc.laneCount, doc.durationMonths, doc.durationLabel,
        doc.priceDZD, doc.priceEUR, doc.priceUSD, JSON.stringify(doc.features), doc.badge, doc.tierCode,
        doc.maxDevices, doc.isQuadPool ? 1 : 0, doc.isActive ? 1 : 0, doc.isRecommended ? 1 : 0,
        doc.createdAt, doc.updatedAt
      );
    } else {
      this.memoryPlans.set(doc.id, doc);
    }
    return doc;
  }

  deletePlan(planId) {
    if (!planId) return false;
    if (this.usingSqlite) {
      const info = this.db.prepare(`DELETE FROM licensing_plans WHERE id = ?`).run(planId);
      return info.changes > 0;
    }
    return this.memoryPlans.delete(planId);
  }

  // ══════════════════════════════════════
  // 2. إدارة التراخيص (Licenses Management)
  // ══════════════════════════════════════

  saveLicense(lic) {
    const now = Date.now();
    const doc = {
      code: String(lic.code || '').trim(),
      planId: lic.planId || null,
      tier: lic.tier === 'ENTX' ? 'ENTX' : 'CLB8',
      tierName: lic.tierName || (lic.tier === 'ENTX' ? 'رخصة الاتحادات الرسمية (Enterprise)' : 'باقة الأندية المعتمدة (Pro Club)'),
      clientName: lic.clientName || 'عميل معتمد',
      clientEmail: lic.clientEmail || null,
      clientPhone: lic.clientPhone || null,
      deviceId: String(lic.deviceId || 'POOL').toUpperCase(),
      expiryDate: lic.expiryDate,
      maxDevices: Number(lic.maxDevices) || (lic.isQuadPool ? 4 : 1),
      isQuadPool: Boolean(lic.isQuadPool),
      status: lic.status || 'active',
      createdAt: lic.createdAt || now,
      activatedAt: lic.activatedAt || null,
      revokedAt: lic.revokedAt || null,
      transferredTo: lic.transferredTo || null,
      notes: lic.notes || ''
    };

    if (this.usingSqlite) {
      const stmt = this.db.prepare(`
        INSERT INTO licensing_records (
          code, plan_id, tier, tier_name, client_name, client_email, client_phone,
          device_id, expiry_date, max_devices, is_quad_pool, status,
          created_at, activated_at, revoked_at, transferred_to, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          plan_id=excluded.plan_id,
          tier_name=excluded.tier_name,
          client_name=excluded.client_name,
          client_email=excluded.client_email,
          client_phone=excluded.client_phone,
          expiry_date=excluded.expiry_date,
          status=excluded.status,
          activated_at=COALESCE(excluded.activated_at, licensing_records.activated_at),
          revoked_at=excluded.revoked_at,
          transferred_to=excluded.transferred_to,
          notes=excluded.notes
      `);
      stmt.run(
        doc.code, doc.planId, doc.tier, doc.tierName, doc.clientName, doc.clientEmail, doc.clientPhone,
        doc.deviceId, doc.expiryDate, doc.maxDevices, doc.isQuadPool ? 1 : 0, doc.status,
        doc.createdAt, doc.activatedAt, doc.revokedAt, doc.transferredTo, doc.notes
      );
    } else {
      this.memoryLicenses.set(doc.code, doc);
    }
    return doc;
  }

  getLicense(code) {
    if (!code) return null;
    const clean = String(code).trim();
    if (this.usingSqlite) {
      const r = this.db.prepare(`SELECT * FROM licensing_records WHERE code = ?`).get(clean);
      if (!r) return null;
      return {
        code: r.code,
        planId: r.plan_id,
        tier: r.tier,
        tierName: r.tier_name,
        clientName: r.client_name,
        clientEmail: r.client_email,
        clientPhone: r.client_phone,
        deviceId: r.device_id,
        expiryDate: r.expiry_date,
        maxDevices: r.max_devices,
        isQuadPool: Boolean(r.is_quad_pool),
        status: r.status,
        createdAt: r.created_at,
        activatedAt: r.activated_at,
        revokedAt: r.revoked_at,
        transferredTo: r.transferred_to,
        notes: r.notes
      };
    }
    return this.memoryLicenses.get(clean) || null;
  }

  listLicenses({ status = '', tier = '', search = '', limit = 100 } = {}) {
    if (this.usingSqlite) {
      let sql = `SELECT * FROM licensing_records WHERE 1=1`;
      const params = [];
      if (status) {
        sql += ` AND status = ?`;
        params.push(status);
      }
      if (tier) {
        sql += ` AND tier = ?`;
        params.push(tier);
      }
      if (search) {
        sql += ` AND (code LIKE ? OR client_name LIKE ? OR device_id LIKE ?)`;
        const q = `%${search}%`;
        params.push(q, q, q);
      }
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(Math.min(limit, 500));

      const rows = this.db.prepare(sql).all(...params);
      return rows.map(r => ({
        code: r.code,
        planId: r.plan_id,
        tier: r.tier,
        tierName: r.tier_name,
        clientName: r.client_name,
        clientEmail: r.client_email,
        clientPhone: r.client_phone,
        deviceId: r.device_id,
        expiryDate: r.expiry_date,
        maxDevices: r.max_devices,
        isQuadPool: Boolean(r.is_quad_pool),
        status: r.status,
        createdAt: r.created_at,
        activatedAt: r.activated_at,
        revokedAt: r.revoked_at,
        transferredTo: r.transferred_to,
        notes: r.notes
      }));
    }

    let list = Array.from(this.memoryLicenses.values());
    if (status) list = list.filter(l => l.status === status);
    if (tier) list = list.filter(l => l.tier === tier);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => l.code.toLowerCase().includes(q) || l.clientName.toLowerCase().includes(q) || l.deviceId.toLowerCase().includes(q));
    }
    return list.slice(0, limit);
  }

  // ══════════════════════════════════════
  // 3. تتبع وتفعيل الأجهزة (Activations)
  // ══════════════════════════════════════

  recordActivation({ licenseCode, deviceId, deviceName = '', platform = '', ipAddress = '' }) {
    const id = `act_${licenseCode}_${deviceId}`;
    const now = Date.now();
    const doc = {
      id,
      licenseCode,
      deviceId,
      deviceName,
      platform,
      ipAddress,
      activatedAt: now,
      lastSeenAt: now,
      isActive: true
    };

    if (this.usingSqlite) {
      const stmt = this.db.prepare(`
        INSERT INTO licensing_activations (
          id, license_code, device_id, device_name, platform, ip_address, activated_at, last_seen_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(license_code, device_id) DO UPDATE SET
          device_name=COALESCE(excluded.device_name, licensing_activations.device_name),
          platform=COALESCE(excluded.platform, licensing_activations.platform),
          ip_address=excluded.ip_address,
          last_seen_at=excluded.last_seen_at,
          is_active=1
      `);
      stmt.run(id, licenseCode, deviceId, deviceName, platform, ipAddress, now, now);

      // تحديث حالة الترخيص إلى مفعل
      this.db.prepare(`UPDATE licensing_records SET activated_at = COALESCE(activated_at, ?) WHERE code = ?`).run(now, licenseCode);
    } else {
      this.memoryActivations.set(id, doc);
      const lic = this.memoryLicenses.get(licenseCode);
      if (lic && !lic.activatedAt) lic.activatedAt = now;
    }

    return doc;
  }

  getLicenseActivations(licenseCode) {
    if (!licenseCode) return [];
    if (this.usingSqlite) {
      const rows = this.db.prepare(`SELECT * FROM licensing_activations WHERE license_code = ? AND is_active = 1`).all(licenseCode);
      return rows.map(r => ({
        id: r.id,
        licenseCode: r.license_code,
        deviceId: r.device_id,
        deviceName: r.device_name,
        platform: r.platform,
        ipAddress: r.ip_address,
        activatedAt: r.activated_at,
        lastSeenAt: r.last_seen_at,
        isActive: Boolean(r.is_active)
      }));
    }
    return Array.from(this.memoryActivations.values()).filter(a => a.licenseCode === licenseCode && a.isActive);
  }

  removeActivation(licenseCode, deviceId) {
    if (this.usingSqlite) {
      this.db.prepare(`UPDATE licensing_activations SET is_active = 0 WHERE license_code = ? AND device_id = ?`).run(licenseCode, deviceId);
      return true;
    }
    const id = `act_${licenseCode}_${deviceId}`;
    const act = this.memoryActivations.get(id);
    if (act) act.isActive = false;
    return true;
  }

  // ══════════════════════════════════════
  // 4. التجديد والتمديد (Renewals)
  // ══════════════════════════════════════

  renewLicense({ licenseCode, extendedMonths, newExpiryDate, renewedBy = 'admin' }) {
    const lic = this.getLicense(licenseCode);
    if (!lic) throw new Error('الترخيص غير موجود في السجل');

    const id = `ren_${Date.now()}`;
    const now = Date.now();
    const oldExpiry = lic.expiryDate;

    if (this.usingSqlite) {
      this.db.prepare(`UPDATE licensing_records SET expiry_date = ?, status = 'active' WHERE code = ?`).run(newExpiryDate, licenseCode);
      this.db.prepare(`
        INSERT INTO licensing_renewals (id, license_code, old_expiry_date, new_expiry_date, extended_months, renewed_by, renewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, licenseCode, oldExpiry, newExpiryDate, extendedMonths, renewedBy, now);
    } else {
      lic.expiryDate = newExpiryDate;
      lic.status = 'active';
      this.memoryRenewals.set(id, { id, licenseCode, oldExpiryDate: oldExpiry, newExpiryDate, extendedMonths, renewedBy, renewedAt: now });
    }

    this.logAudit({
      licenseCode,
      action: 'RENEW',
      actor: renewedBy,
      details: JSON.stringify({ oldExpiry, newExpiryDate, extendedMonths })
    });

    return { success: true, oldExpiry, newExpiryDate };
  }

  // ══════════════════════════════════════
  // 5. التحويل والتنازل (Transfers)
  // ══════════════════════════════════════

  recordTransfer({ voucherCode, originalCode, sourceDeviceId, targetDeviceId, tier, revocationProof }) {
    const now = Date.now();
    if (this.usingSqlite) {
      this.db.prepare(`
        INSERT INTO licensing_transfers (voucher_code, original_code, source_device_id, target_device_id, tier, transferred_at, revocation_proof, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
      `).run(voucherCode, originalCode, sourceDeviceId, targetDeviceId, tier, now, revocationProof || '');

      this.db.prepare(`
        UPDATE licensing_records SET status = 'revoked', revoked_at = ?, transferred_to = ? WHERE code = ?
      `).run(now, targetDeviceId, originalCode);
    } else {
      this.memoryTransfers.set(voucherCode, { voucherCode, originalCode, sourceDeviceId, targetDeviceId, tier, transferredAt: now, revocationProof, status: 'completed' });
      const lic = this.memoryLicenses.get(originalCode);
      if (lic) {
        lic.status = 'revoked';
        lic.revokedAt = now;
        lic.transferredTo = targetDeviceId;
      }
    }

    this.logAudit({
      licenseCode: originalCode,
      action: 'TRANSFER',
      actor: sourceDeviceId,
      details: JSON.stringify({ voucherCode, targetDeviceId, revocationProof })
    });

    return true;
  }

  // ══════════════════════════════════════
  // 6. سجل التدقيق والإحصائيات المركزية
  // ══════════════════════════════════════

  logAudit({ licenseCode = '', action, actor = 'system', details = '' }) {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();
    if (this.usingSqlite) {
      this.db.prepare(`
        INSERT INTO licensing_audit_logs (id, license_code, action, actor, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, licenseCode, action, actor, details, now);
    } else {
      this.memoryAuditLogs.unshift({ id, licenseCode, action, actor, details, createdAt: now });
      if (this.memoryAuditLogs.length > 1000) this.memoryAuditLogs.pop();
    }
  }

  getAuditLogs({ limit = 100 } = {}) {
    if (this.usingSqlite) {
      const rows = this.db.prepare(`SELECT * FROM licensing_audit_logs ORDER BY created_at DESC LIMIT ?`).all(Math.min(limit, 500));
      return rows.map(r => ({
        id: r.id,
        licenseCode: r.license_code,
        action: r.action,
        actor: r.actor,
        details: r.details,
        createdAt: r.created_at
      }));
    }
    return this.memoryAuditLogs.slice(0, limit);
  }

  getStats() {
    let total = 0;
    let active = 0;
    let expired = 0;
    let revoked = 0;
    let totalDevices = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    if (this.usingSqlite) {
      const all = this.db.prepare(`SELECT status, expiry_date FROM licensing_records`).all();
      total = all.length;
      for (const r of all) {
        if (r.status === 'revoked') revoked++;
        else if (r.expiry_date < todayStr) expired++;
        else active++;
      }
      const actRow = this.db.prepare(`SELECT COUNT(DISTINCT device_id) as cnt FROM licensing_activations WHERE is_active = 1`).get();
      totalDevices = actRow?.cnt || 0;
    } else {
      total = this.memoryLicenses.size;
      for (const l of this.memoryLicenses.values()) {
        if (l.status === 'revoked') revoked++;
        else if (l.expiryDate < todayStr) expired++;
        else active++;
      }
      const devSet = new Set();
      for (const a of this.memoryActivations.values()) {
        if (a.isActive) devSet.add(a.deviceId);
      }
      totalDevices = devSet.size;
    }

    return {
      total,
      active,
      expired,
      revoked,
      totalDevices
    };
  }
}

let sharedLicensingStore = null;

export function getLicensingStore() {
  if (!sharedLicensingStore) {
    const dataDir = process.env.PFP_DATA_DIR || './data';
    const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : `${dataDir}/pfp-licensing.sqlite`;
    sharedLicensingStore = new LicensingStore({ dbPath });
    const engine = sharedLicensingStore.usingSqlite ? 'node:sqlite' : 'memory-fallback';
    console.log(`[LicensingStore] ✅ مخزن التراخيص المركزي جاهز (${engine})`);
  }
  return sharedLicensingStore;
}
