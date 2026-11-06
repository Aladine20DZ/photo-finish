import { describe, it, expect } from 'vitest';
import { leagueExecutiveService } from '../src/services/leagueExecutiveService';
import { licenseManager } from '../src/services/licenseManager';

describe('Stage 4: League Executive Suite & Governance', () => {
  it('retrieves accurate league executive metrics', async () => {
    const metrics = await leagueExecutiveService.getLeagueMetrics('lg_algiers');
    expect(metrics).toBeDefined();
    expect(metrics.totalClubs).toBeGreaterThan(0);
    expect(metrics.totalAthletes).toBeGreaterThan(0);
    expect(metrics.totalCompetitions).toBeGreaterThan(0);
    expect(metrics.activeLicenses).toBeGreaterThan(0);
  });

  it('sanctions and licenses official competitions within the league calendar', async () => {
    const res = await leagueExecutiveService.sanctionCompetition('comp_algiers_2026', true, 'usr_league_admin');
    expect(res.success).toBe(true);
    expect(res.message).toContain('تم اعتماد');
  });

  it('generates cryptographic Ed25519 PFP2 licenses and activates them on devices', async () => {
    // Generate a 12-month CLUB license for a pooled 1*4 device mesh
    const issueResult = leagueExecutiveService.issueLeagueLicense({
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
