import { describe, it, expect } from 'vitest';
import { isMessagePermitted, verifyEd25519LicenseCode, computeMessageHmac } from '../src/services/securityService';
import { licenseManager } from '../src/services/licenseManager';
import { generateEd25519License, verifyEd25519Signature, getPublicKeyBase64 } from '../server/security.js';

describe('Stage A: Security Architecture & Asymmetric Licensing', () => {
  it('enforces Role Permission Matrix correctly', () => {
    // Start phone permissions
    expect(isMessagePermitted('start', 'START_GUN')).toBe(true);
    expect(isMessagePermitted('start', 'RECALL_GUN')).toBe(true);
    expect(isMessagePermitted('start', 'ON_MARKS')).toBe(true);
    expect(isMessagePermitted('start', 'LANE_FINISH')).toBe(false);
    expect(isMessagePermitted('start', 'JUDGE_UPDATE_RUNNER')).toBe(false);

    // Finish phone permissions
    expect(isMessagePermitted('finish', 'LANE_FINISH')).toBe(true);
    expect(isMessagePermitted('finish', 'SLIT_SCAN_IMAGE')).toBe(true);
    expect(isMessagePermitted('finish', 'RACE_COMPLETE')).toBe(true);
    expect(isMessagePermitted('finish', 'START_GUN')).toBe(false);
    expect(isMessagePermitted('finish', 'JUDGE_UPDATE_RUNNER')).toBe(false);

    // Judge phone permissions
    expect(isMessagePermitted('judge', 'JUDGE_UPDATE_RUNNER')).toBe(true);
    expect(isMessagePermitted('judge', 'SETTINGS_SYNC')).toBe(true);
    expect(isMessagePermitted('judge', 'SYNC_RESET_ALL')).toBe(true);

    // Viewer permissions
    expect(isMessagePermitted('viewer', 'START_GUN')).toBe(false);
    expect(isMessagePermitted('viewer', 'LANE_FINISH')).toBe(false);
    expect(isMessagePermitted('viewer', 'REQUEST_STATE_SYNC')).toBe(true);
  });

  it('rejects all legacy hardcoded master codes (Zero Backdoors)', async () => {
    const backdoors = [
      'ALADINE-VIP-2026',
      'AQUACORE-ADMIN-KEY',
      'PRO-ATHLETICS-2026',
      'COACH-CLUB-PRO'
    ];

    for (const code of backdoors) {
      const res = await licenseManager.activateCode(code);
      expect(res.success).toBe(false);
      expect(res.message).toContain('تم إيقاف الأكواد الثابتة نهائياً');
    }
  });

  it('generates and verifies Ed25519 asymmetric licenses without secret salts', async () => {
    const serverPubKey = getPublicKeyBase64();
    expect(serverPubKey).toBeDefined();

    // توليد ترخيص رسمي من الخادم
    const licCode = generateEd25519License({
      tier: 'ENTX',
      expiryCode: '2812',
      devHash: 'POOL'
    });

    expect(licCode.startsWith('PFP2-ENTX-2812-POOL-')).toBe(true);

    // التحقق من صحة الترخيص بواسطة العميل عبر Web Crypto
    const clientVerify = await verifyEd25519LicenseCode(licCode);
    expect(clientVerify.valid).toBe(true);
    expect(clientVerify.tier).toBe('ENTX');
    expect(clientVerify.expCode).toBe('2812');
    expect(clientVerify.devHash).toBe('POOL');

    // كشف التلاعب بالترخيص: تغيير الحرف الأول من التوقيع
    const tamperedCode = licCode.slice(0, -3) + 'XYZ';
    const tamperedVerify = await verifyEd25519LicenseCode(tamperedCode);
    expect(tamperedVerify.valid).toBe(false);
  });

  it('verifies session HMAC message signing', async () => {
    const sessionToken = 'secret-field-session-token-12345';
    const msgType = 'START_GUN';
    const timestamp = 1730000000000;

    const sig1 = await computeMessageHmac(sessionToken, msgType, timestamp);
    const sig2 = await computeMessageHmac(sessionToken, msgType, timestamp);
    expect(sig1).toBeTruthy();
    expect(sig1).toBe(sig2);

    // تغيير نوع الرسالة يغير التوقيع
    const sigDifferent = await computeMessageHmac(sessionToken, 'LANE_FINISH', timestamp);
    expect(sigDifferent).not.toBe(sig1);
  });
});
