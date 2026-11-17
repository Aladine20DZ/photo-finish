import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { licenseManager } from '../src/services/licenseManager';
import { generateEd25519LicenseCode, verifyEd25519Signature, verifyEd25519LicenseCode, setTrustedPublicKeyBase64 } from '../src/services/securityService';
import { handleLicensingRequest } from '../server/licensingApi.js';
import { getLicensingStore } from '../server/licensingStore.js';
import * as security from '../server/security.js';

// Simple polyfill for localStorage in Node test runner
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => { storageMap.set(k, String(v)); },
  removeItem: (k: string) => { storageMap.delete(k); },
  clear: () => { storageMap.clear(); }
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageMock;
}

describe('Enterprise Licensing Case Resilience & OCR Correction Suite', () => {
  beforeAll(() => {
    setTrustedPublicKeyBase64(security.getPublicKeyBase64());
  });

  beforeEach(() => {
    storageMap.clear();
  });

  it('generates an official Ed25519 license code with mixed-case Base64 signature', async () => {
    const code = security.generateEd25519License({ tier: 'CLB8', expiryCode: '3111', devHash: 'GLBL' });
    expect(code).toMatch(/^PFP2-CLB8-3111-GLBL-[A-Za-z0-9_-]{86}$/);

    // Verify that the signature contains lowercase and uppercase letters
    const sig = code.split('-').slice(4).join('-');
    const hasLower = /[a-z]/.test(sig);
    const hasUpper = /[A-Z]/.test(sig);
    expect(hasLower).toBe(true);
    expect(hasUpper).toBe(true);

    const verified = await verifyEd25519LicenseCode(code);
    expect(verified.valid).toBe(true);
    expect(verified.tier).toBe('CLB8');
    expect(verified.expCode).toBe('3111');
    expect(verified.devHash).toBe('GLBL');
  });

  it('proves that uppercasing the Ed25519 signature breaks raw cryptographic verification', async () => {
    const code = security.generateEd25519License({ tier: 'CLB8', expiryCode: '3111', devHash: 'GLBL' });
    const uppercased = code.toUpperCase();

    // Raw crypto verification must fail on corrupted signature
    const parts = uppercased.split('-');
    const payload = `PFP2|${parts[1]}|${parts[2]}|${parts[3]}`;
    const sig = parts.slice(4).join('-');
    const isValid = await verifyEd25519Signature(payload, sig);
    expect(isValid).toBe(false);
  });

  it('resolves canonical code when user pastes uppercased code matching master ledger', async () => {
    const canonicalCode = security.generateEd25519License({ tier: 'CLB8', expiryCode: '3111', devHash: 'GLBL' });
    
    // Simulate AdminPortal saving this record into master ledger
    localStorage.setItem('pf_admin_portal_master_ledger_v2', JSON.stringify([
      {
        id: 'lic-1',
        code: canonicalCode,
        tier: 'CLB8',
        tierName: 'باقة الأندية المعتمدة',
        clientName: 'نادي الوفاق',
        deviceId: 'GLOBAL',
        expiryDate: '2031-11-30',
        createdAt: '2026-11-14',
        isQuadPool: false,
        isRevoked: false
      }
    ]));

    // User pastes the uppercased code
    const userPasted = canonicalCode.toUpperCase();
    const resolved = licenseManager.resolveCanonicalCode(userPasted);
    expect(resolved).toBe(canonicalCode);

    // Local offline activation must succeed seamlessly
    const res = await licenseManager.activateCode(userPasted);
    expect(res.success).toBe(true);
    expect(res.license).toBeDefined();
    expect(res.license?.code).toBe(canonicalCode);
  });

  it('resolves canonical code when user has OCR typos (O instead of 0)', async () => {
    const canonicalCode = 'PFP2-CLB8-3111-GLBL-AjdZqqlk5QABX9XwbCheG8K-pxfcKJHdsXJDqfMPSyC75YtQqihOCqZP_nfacJoZkx0RVxvTzjab1RTL67NMAA';
    
    // Simulate AdminPortal saving this record
    localStorage.setItem('pf_admin_portal_master_ledger_v2', JSON.stringify([
      {
        id: 'lic-user-1',
        code: canonicalCode,
        tier: 'CLB8',
        tierName: 'باقة الأندية المعتمدة',
        clientName: 'نادي رياضي',
        deviceId: 'GLOBAL',
        expiryDate: '2031-11-30',
        createdAt: '2026-11-14',
        isQuadPool: false,
        isRevoked: false
      }
    ]));

    // The user input from the screenshot where '0' was typed as 'O':
    const userInputWithOcrTypo = 'PFP2-CLB8-3111-GLBL-AJDZQQLK5QABX9XWBCHEG8K-PXFCKJHDSXJDQFMPSYC75YTQQIHOCQZP_NFACJOZKXORVXVTCJAB1RTL67NMAA';
    const resolved = licenseManager.resolveCanonicalCode(userInputWithOcrTypo);
    expect(resolved).toBe(canonicalCode);

    const res = await licenseManager.activateCode(userInputWithOcrTypo);
    expect(res.success).toBe(true);
    expect(res.license?.code).toBe(canonicalCode);
  });

  it('backend endpoint /api/licensing/activate auto-resolves uppercase or OCR-corrupted codes from SQLite store', async () => {
    const store = getLicensingStore();
    const code = security.generateEd25519License({ tier: 'ENTX', expiryCode: '2805', devHash: 'POOL' });
    
    store.saveLicense({
      code,
      tier: 'ENTX',
      tierName: 'رخصة الاتحادات الرسمية (Enterprise)',
      clientName: 'رابطة ألعاب القوى',
      deviceId: 'POOL',
      expiryDate: '2028-05-31',
      maxDevices: 4,
      isQuadPool: true,
      status: 'active',
      createdAt: Date.now()
    });

    // Device attempts activation with UPPERCASED code
    const res = await handleLicensingRequest({
      pathname: '/api/licensing/activate',
      searchParams: new URLSearchParams(),
      method: 'POST',
      body: {
        code: code.toUpperCase(),
        deviceId: 'PF-83DD-C9A9',
        deviceName: 'Mobile Phone',
        platform: 'Android/Chrome'
      }
    });

    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.success).toBe(true);
    expect(res.json.license.code).toBe(code);
  });

  it('activates the exact license code from Image 3 (PFP2-CLB8-2705-POOL-...) seamlessly', async () => {
    const codeImg3 = 'PFP2-CLB8-2705-POOL-EctvjOnWe7ymdZWt8MzCcTI3DAF2WsFZOrzN1S20vvEnf46HV6VH9ZJ3eT5eND2QOS9H2BZaN-poapNrx-_DQ';
    const res = await licenseManager.activateCode(codeImg3);
    expect(res.success).toBe(true);
    expect(res.license).toBeDefined();
    expect(res.license?.tier).toBe('CLB8');
    expect(res.license?.isQuadPool).toBe(true);
  });

  it('activates the exact user input from Image 4 with shifted typo (extra X) seamlessly', async () => {
    const codeImg4WithTypo = 'PFP2-CLB8-3111-GLBL-AJDZQQLK5QABX9XWBCHEG8K-PXFCKJHDSXJDQFMPSYC75YTQQIHOCQZP_NFACJOZKXXORVXVZTJAB1RTL67NMAA';
    const res = await licenseManager.activateCode(codeImg4WithTypo);
    expect(res.success).toBe(true);
    expect(res.license).toBeDefined();
    expect(res.license?.tier).toBe('CLB8');
  });

  it('generates and activates a Compact Product Key (PFP1-...) with 100% offline verification', async () => {
    const compactCode = await licenseManager.generateCompactLicenseKey('ENTX', new Date('2028-12-31'), { isQuadPool: true });
    expect(compactCode).toMatch(/^PFP1-ENTX-2812-POOL-[0-9A-F]{8}$/);

    const res = await licenseManager.activateCode(compactCode);
    expect(res.success).toBe(true);
    expect(res.license?.tier).toBe('ENTX');
    expect(res.license?.isQuadPool).toBe(true);
  });
});
