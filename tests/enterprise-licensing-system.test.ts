import { describe, it, expect, beforeAll } from 'vitest';
import { getLicensingStore, DEFAULT_INITIAL_PLANS } from '../server/licensingStore.js';
import { handleLicensingRequest } from '../server/licensingApi.js';
import * as security from '../server/security.js';
import { licenseManager } from '../src/services/licenseManager';
import { verifyEd25519LicenseCode, setTrustedPublicKeyBase64 } from '../src/services/securityService';

/**
 * Stage 1 Security: بوابة المدير عبر توكن خادمي حقيقي حصراً.
 * الرمز السحري القديم 'offline-standalone-admin-session' أُزيل من الخوادم
 * وأصبح يُرفض بـ401 — انظر tests/stage1-security-hardening.test.ts
 */
process.env.ADMIN_PORTAL_PASSWORD = 'Stage1TestAdmin#2026!';

async function getAdminToken(): Promise<string> {
  const res = security.verifyAdminLogin('Stage1TestAdmin#2026!', 'test-runner-ip');
  if (!res.success || !res.adminToken) throw new Error('فشل إصدار توكن المدير للاختبار');
  return res.adminToken;
}

describe('Enterprise Licensing & Subscription System (Master Prompt Verification)', () => {
  let store: any;
  let adminToken: string;

  beforeAll(async () => {
    store = getLicensingStore();
    adminToken = await getAdminToken();
    setTrustedPublicKeyBase64(security.getPublicKeyBase64());
  });

  // ══════════════════════════════════════
  // 1. اختبارات الباقات (Plans Management)
  // ══════════════════════════════════════
  describe('1. Plans Management & Seeding', () => {
    it('pre-seeds default enterprise plans if store is empty', () => {
      const plans = store.listPlans();
      expect(plans.length).toBeGreaterThanOrEqual(4);
      const clubPlan = plans.find((p: any) => p.id === 'plan_club_pro_8l');
      expect(clubPlan).toBeDefined();
      expect(clubPlan.laneCount).toBe(8);
      expect(clubPlan.tierCode).toBe('CLB8');

      const entPlan = plans.find((p: any) => p.id === 'plan_enterprise_10l');
      expect(entPlan).toBeDefined();
      expect(entPlan.laneCount).toBe(10);
      expect(entPlan.tierCode).toBe('ENTX');
    });

    it('creates, updates, and deletes plans via API', async () => {
      const newPlanPayload = {
        name: 'باقة الأكاديميات الصيفية 2026',
        description: 'باقة تدريب صيفية لـ 6 مسارات',
        laneCount: 6,
        durationMonths: 3,
        durationLabel: '3 أشهر',
        priceDZD: 12000,
        priceEUR: 80,
        priceUSD: 90,
        tierCode: 'CLB8',
        maxDevices: 4,
        isQuadPool: true,
        features: ['تحكيم 6 مسارات', 'توقيت 1/1000s']
      };

      const res = await handleLicensingRequest({
        pathname: '/api/licensing/plans',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: newPlanPayload,
        authHeader: adminToken
      });

      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.plan.id).toBeDefined();

      const createdId = res.json.plan.id;

      // Update plan
      const updateRes = await handleLicensingRequest({
        pathname: '/api/licensing/plans',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: { id: createdId, name: 'باقة الأكاديميات الصيفية المحدثة', priceDZD: 14000 },
        authHeader: adminToken
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.json.plan.name).toBe('باقة الأكاديميات الصيفية المحدثة');
      expect(updateRes.json.plan.priceDZD).toBe(14000);

      // Clean up
      const delRes = await handleLicensingRequest({
        pathname: `/api/licensing/plans/${createdId}`,
        searchParams: new URLSearchParams(),
        method: 'DELETE',
        authHeader: adminToken
      });
      expect(delRes.status).toBe(200);
      expect(delRes.json.success).toBe(true);
    });
  });

  // ══════════════════════════════════════
  // 2. التوليد الفردي والجماعي (Generation)
  // ══════════════════════════════════════
  describe('2. Single & Bulk Code Generation', () => {
    it('generates a single Ed25519 signed license with plan metadata', async () => {
      const res = await handleLicensingRequest({
        pathname: '/api/licensing/generate',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: {
          tier: 'ENTX',
          expCode: '2812',
          devHash: 'POOL',
          count: 1,
          clientName: 'الاتحاد الوطني لألعاب القوى'
        },
        authHeader: adminToken
      });

      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.count).toBe(1);
      expect(res.json.licenseCode.startsWith('PFP2-ENTX-2812-POOL-')).toBe(true);

      // Verify Ed25519 signature
      const clientVerify = await verifyEd25519LicenseCode(res.json.licenseCode);
      expect(clientVerify.valid).toBe(true);
      expect(clientVerify.tier).toBe('ENTX');
      expect(clientVerify.expCode).toBe('2812');
    });

    it('generates bulk codes (e.g. 10 codes) with unique signatures and anti-collision', async () => {
      const res = await handleLicensingRequest({
        pathname: '/api/licensing/generate',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: {
          tier: 'CLB8',
          expCode: '2712',
          devHash: 'PF84',
          count: 10,
          clientName: 'رابطة سعيدة الولائية'
        },
        authHeader: adminToken
      });

      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.count).toBe(10);
      expect(res.json.licenses.length).toBe(10);

      // Verify each code is unique and valid
      const codeSet = new Set(res.json.licenses.map((l: any) => l.code));
      expect(codeSet.size).toBe(10);

      for (const lic of res.json.licenses) {
        const v = await verifyEd25519LicenseCode(lic.code);
        expect(v.valid).toBe(true);
      }
    });
  });

  // ══════════════════════════════════════
  // 3. التفعيل وضوابط الأجهزة (Activation)
  // ══════════════════════════════════════
  describe('3. Activation & Device Enforcement', () => {
    it('activates a POOL license and enforces max devices quota (4 devices)', async () => {
      // 1. Generate POOL code (max 4 devices)
      const genRes = await handleLicensingRequest({
        pathname: '/api/licensing/generate',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: { tier: 'ENTX', expCode: '2712', devHash: 'POOL', count: 1, clientName: 'سباق الماراثون' },
        authHeader: adminToken
      });
      const code = genRes.json.licenseCode;

      // 2. Activate on 4 distinct devices (should succeed)
      for (let i = 1; i <= 4; i++) {
        const actRes = await handleLicensingRequest({
          pathname: '/api/licensing/activate',
          searchParams: new URLSearchParams(),
          method: 'POST',
          body: {
            code,
            deviceId: `PF-DEV${i}-1122`,
            deviceName: `هاتف التحكيم رقم ${i}`,
            platform: 'Android'
          }
        });
        expect(actRes.status).toBe(200);
        expect(actRes.json.ok).toBe(true);
      }

      // 3. Activate on 5th device (should be rejected with 403 max devices exceeded)
      const fifthRes = await handleLicensingRequest({
        pathname: '/api/licensing/activate',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: {
          code,
          deviceId: 'PF-DEV5-3344',
          deviceName: 'هاتف إضافي غير مسموح',
          platform: 'iOS'
        }
      });
      expect(fifthRes.status).toBe(403);
      expect(fifthRes.json.error).toContain('تم الوصول للحد الأقصى من الأجهزة');
    });

    it('rejects activation when device hash mismatches a single-device locked license', async () => {
      // License locked to devHash: 84A2
      const code = security.generateEd25519License({ tier: 'CLB8', expiryCode: '2712', devHash: '84A2' });

      // Attempt to activate on device PF-9999-1111 (hash: 9999)
      const actRes = await handleLicensingRequest({
        pathname: '/api/licensing/activate',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: {
          code,
          deviceId: 'PF-9999-1111',
          deviceName: 'جهاز غريب',
          platform: 'Windows'
        }
      });
      expect(actRes.status).toBe(403);
      expect(actRes.json.error).toContain('هذا الكود مخصص لجهاز آخر');
    });
  });

  // ══════════════════════════════════════
  // 4. التجديد والنقل (Renew & Transfer)
  // ══════════════════════════════════════
  describe('4. License Renewal & Handover Protocol', () => {
    it('renews an active license extending its validity seamlessly', async () => {
      const code = security.generateEd25519License({ tier: 'ENTX', expiryCode: '2612', devHash: 'POOL' });
      store.saveLicense({
        code,
        tier: 'ENTX',
        tierName: 'رخصة الاتحادات',
        clientName: 'نادي النصر',
        deviceId: 'POOL',
        expiryDate: '2026-12-31',
        isQuadPool: true
      });

      const renewRes = await handleLicensingRequest({
        pathname: '/api/licensing/renew',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: { code, months: 12 },
        authHeader: adminToken
      });

      expect(renewRes.status).toBe(200);
      expect(renewRes.json.ok).toBe(true);

      const updated = store.getLicense(code);
      expect(new Date(updated.expiryDate).getFullYear()).toBeGreaterThanOrEqual(2027);
    });

    it('records transfer voucher and prevents reuse on old device', async () => {
      const code = security.generateEd25519License({ tier: 'CLB8', expiryCode: '2706', devHash: 'AAAA' });
      store.saveLicense({
        code,
        tier: 'CLB8',
        tierName: 'باقة الأندية',
        clientName: 'نادي الوثبة',
        deviceId: 'PF-AAAA-1111',
        expiryDate: '2027-06-30'
      });

      // Transfer to device BBBB
      store.recordTransfer({
        voucherCode: 'TRF1-CLB8-2706-BBBB-X9Y8',
        originalCode: code,
        sourceDeviceId: 'PF-AAAA-1111',
        targetDeviceId: 'PF-BBBB-2222',
        tier: 'CLB8',
        revocationProof: 'REV-AAAA-PROOF'
      });

      // Attempting to activate the original code now fails with revoked
      const actRes = await handleLicensingRequest({
        pathname: '/api/licensing/activate',
        searchParams: new URLSearchParams(),
        method: 'POST',
        body: { code, deviceId: 'PF-AAAA-1111' }
      });
      expect(actRes.status).toBe(403);
      expect(actRes.json.error).toContain('تم إبطال هذا الترخيص');
    });
  });

  // ══════════════════════════════════════
  // 5. العمل دون إنترنت والتوافق الخلفي
  // ══════════════════════════════════════
  describe('5. Offline Verification & Backward Compatibility', () => {
    it('verifies valid licenses completely offline via Web Crypto', async () => {
      const offlineLic = security.generateEd25519License({ tier: 'ENTX', expiryCode: '2806', devHash: 'POOL' });
      const verifyRes = await verifyEd25519LicenseCode(offlineLic);
      expect(verifyRes.valid).toBe(true);
      expect(verifyRes.tier).toBe('ENTX');
      expect(verifyRes.expCode).toBe('2806');
    });

    it('strictly preserves historical signing key material without corruption', () => {
      const pubB64 = security.getPublicKeyBase64();
      expect(pubB64).toBeDefined();
      expect(pubB64.length).toBeGreaterThan(30);
      // Ensure it matches the server's public key
      expect(pubB64).toBe(security.PUB_KEY_RAW.toString('base64'));
    });
  });
});
