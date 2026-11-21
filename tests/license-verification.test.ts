import { describe, it, expect } from 'vitest';
import { licenseManager } from '../src/services/licenseManager';
import { verifyCompactLicenseCode, verifyEd25519LicenseCode, generateCompactLicenseCode, setTrustedPublicKeyBase64 } from '../src/services/securityService';
import * as security from '../server/security.js';

/**
 * Stage 1 (أمني): صفر تراخيص مدمجة/مزروعة في المنظومة.
 * - الأكواد المزروعة قديماً (صالحة حتى 2031) أصبحت تُرفض — تثبيت انغلاق الباب الخلفي.
 * - التفعيل المحلي يعمل حصراً عبر تحقق تشفيري (PFP1 checksum / PFP2 توقيع Ed25519).
 * - الأكواد المقيدة بجهاز لا تُفعَّل إلا على جهازها.
 *
 * ملاحظة مفاتيح: الاختبارات 4-6 تعتمد المفتاح العام الافتراضي الثابت في securityService،
 * بينما اختبار التوليد الخادمي يحقن مفتاح الخادم مؤقتاً ثم يعيد الافتراضي.
 */

describe('License Codes Verification Test (Post-Backdoor-Removal Reality)', () => {
  it('rejects the old pre-seeded GLBL license code (burned backdoor is closed)', async () => {
    // الكود القديم المزروع في المستودع — كان يُفعَّل عبر قائمة التراخيص المدمجة
    const code = 'PFP2-CLB8-3111-GLBL-AJDZQQLK5QABX9XWBCHEG8K-PXFCKJHDSXJDQFMPSYC75YTQQIHOCQZP_NFACJOZKXOVRVXVTZJAB1RTL67NMAA';
    const act = await licenseManager.activateCode(code);
    expect(act.success).toBe(false);
  });

  it('rejects old pre-seeded POOL license codes from the removed builtin list', async () => {
    const code = 'PFP2-CLB8-2705-POOL-EctvjOnWe7ymdZWt8MzCcTI3DAF2WsFZOrzN1S20vvEnf46HV6VH9ZJ3eT5eND2QOS9H2BZaN-poapNrx-_DQ';
    const act = await licenseManager.activateCode(code);
    expect(act.success).toBe(false);
  });

  it('activates a freshly server-signed license with the injected server key (then restores default)', async () => {
    setTrustedPublicKeyBase64(security.getPublicKeyBase64());
    try {
      const code = security.generateEd25519License({ tier: 'CLB8', expiryCode: '3111', devHash: 'POOL' });
      const verified = await verifyEd25519LicenseCode(code);
      expect(verified.valid).toBe(true);

      const act = await licenseManager.activateCode(code);
      expect(act.success).toBe(true);
      expect(act.license?.tier).toBe('CLB8');
      expect(act.license?.isQuadPool).toBe(true); // POOL = شبكي 1*4
    } finally {
      setTrustedPublicKeyBase64(''); // إعادة المفتاح الافتراضي لاختبارات الأكواد الثابتة
    }
  });

  it('activates a quad-pool PFP1 compact code with 100% offline checksum verification', async () => {
    const code = 'PFP1-ENTX-3112-POOL-9068EFF4';
    const verified = await verifyCompactLicenseCode(code);
    expect(verified.valid).toBe(true);

    const act = await licenseManager.activateCode(code);
    expect(act.success).toBe(true);
    expect(act.license?.isQuadPool).toBe(true);
  });

  it('binds a device-specific PFP1 code to its exact device (right device succeeds)', async () => {
    const devHash = licenseManager.cleanDeviceHash; // رمز هذا الجهاز في بيئة الاختبار
    const code = await generateCompactLicenseCode({ tier: 'ENTX', expiryCode: '3112', devHash });
    const verified = await verifyCompactLicenseCode(code);
    expect(verified.valid).toBe(true);

    const act = await licenseManager.activateCode(code);
    expect(act.success).toBe(true);
    expect(act.license?.tier).toBe('ENTX');
    expect(act.license?.isQuadPool).toBe(false);
  });

  it('rejects a device-specific code on any other device (anti-sharing)', async () => {
    const code = 'PFP1-ENTX-3112-83DD-738344BE'; // مقيد بجهاز PF-83DD-C9A9
    const act = await licenseManager.activateCode(code);
    expect(act.success).toBe(false);
    expect(act.message).toContain('مخصص لجهاز آخر');
  });
});
