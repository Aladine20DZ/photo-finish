import { describe, it, expect } from 'vitest';
import { licenseManager } from '../src/services/licenseManager';
import { verifyCompactLicenseCode, verifyEd25519LicenseCode } from '../src/services/securityService';

describe('License Codes Verification Test', () => {
  it('tests compact code PFP1-ENTX-3112-83DD-738344BE', async () => {
    const code = 'PFP1-ENTX-3112-83DD-738344BE';
    const verified = await verifyCompactLicenseCode(code);
    console.log('PFP1-ENTX-3112-83DD-738344BE verify result:', verified);
    expect(verified.valid).toBe(true);

    const act = await licenseManager.activateCode(code);
    console.log('PFP1-ENTX-3112-83DD-738344BE activation:', act);
    expect(act.success).toBe(true);
  });

  it('tests compact pool code PFP1-ENTX-3112-POOL-9068EFF4', async () => {
    const code = 'PFP1-ENTX-3112-POOL-9068EFF4';
    const verified = await verifyCompactLicenseCode(code);
    console.log('PFP1-ENTX-3112-POOL-9068EFF4 verify result:', verified);
    expect(verified.valid).toBe(true);

    const act = await licenseManager.activateCode(code);
    console.log('PFP1-ENTX-3112-POOL-9068EFF4 activation:', act);
    expect(act.success).toBe(true);
  });

  it('tests user screenshot exact string', async () => {
    const code = 'PFP2-CLB8-3111-GLBL-AJDZQQLK5QABX9XWBCHEG8K-PXFCKJHDSXJDQFMPSYC75YTQQIHOCQZP_NFACJOZKXOVRVXVTZJAB1RTL67NMAA';
    const act = await licenseManager.activateCode(code);
    console.log('User screenshot string activation:', act);
    expect(act.success).toBe(true);
  });
});
