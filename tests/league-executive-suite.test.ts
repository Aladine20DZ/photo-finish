import { describe, it, expect, beforeAll } from 'vitest';
import { leagueExecutiveService } from '../src/services/leagueExecutiveService';
import { licenseManager } from '../src/services/licenseManager';
import { setTrustedPublicKeyBase64, setTrustedPrivateKeyBase64 } from '../src/services/securityService';
import { getPublicKeyBase64, PRIV_KEY_RAW } from '../server/security.js';

describe('Stage 4: League Executive Suite & Governance', () => {
  beforeAll(() => {
    setTrustedPublicKeyBase64(getPublicKeyBase64());
    if (PRIV_KEY_RAW) {
      setTrustedPrivateKeyBase64(PRIV_KEY_RAW.toString('base64'));
    }
  });

  it('retrieves accurate league executive metrics', async () => {
    const metrics = await leagueExecutiveService.getLeagueMetrics('lg_algiers');
    expect(metrics).toBeDefined();
    expect(metrics.totalClubs).toBeGreaterThanOrEqual(0);
    expect(metrics.totalAthletes).toBeGreaterThanOrEqual(0);
    expect(metrics.totalCompetitions).toBeGreaterThanOrEqual(0);
    expect(metrics.activeLicenses).toBeGreaterThanOrEqual(0);
  });

  it('sanctions and licenses official competitions within the league calendar', async () => {
    const res = await leagueExecutiveService.sanctionCompetition('comp_algiers_2026', true, 'usr_league_admin');
    expect(res.success).toBe(true);
    expect(res.message).toContain('تم اعتماد');
  });

  it('generates cryptographic Ed25519 PFP2 licenses and activates them on devices', async () => {
    // Generate a 12-month CLUB license for a pooled 1*4 device mesh
    const issueResult = await leagueExecutiveService.issueLeagueLicense({
      leagueId: 'lg_algiers',
      tier: 'CLUB',
      expiryMonths: 12,
      devHash: 'POOL'
    });

    expect(issueResult.success).toBe(true);
    expect(issueResult.licenseCode.startsWith('PFP2-CLB8-')).toBe(true);
    expect(issueResult.licenseCode).toContain('-POOL-');

    // Test activating this newly generated license on a device via LicenseManager
    const activation = await licenseManager.activateCode(issueResult.licenseCode);
    expect(activation.success).toBe(true);
    expect(activation.license).toBeDefined();
    expect(activation.license?.tier).toBe('CLB8');
    expect(activation.license?.isQuadPool).toBe(true);
  });
});
