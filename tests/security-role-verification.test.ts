/**
 * PHOTO FINISH PRO AI — Server/Data Layer Authorization & Role Spoofing Verification
 * 
 * Verifies that:
 * 1. Role spoofing is strictly rejected: passing { role: 'LEAGUE_ADMIN' } or { role: 'SUPER_ADMIN' }
 *    from client context without a valid signed session token is DENIED.
 * 2. Tampered or forged tokens are rejected (HMAC/signature mismatch).
 * 3. Expired session tokens are rejected.
 * 4. Genuine cryptographically signed sessions are authenticated and accepted.
 * 5. Device Purge and Competition Archiving reject unverified callers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { portalAuthService } from '../src/services/portalAuthService';
import { competitionsBureauService } from '../src/services/competitionsBureauService';
import { devicePurgeArchiveService } from '../src/services/devicePurgeArchiveService';
import { competitionsService } from '../src/services/competitionsService';

describe('Server & Data Layer Authorization Guard (Anti-Role-Spoofing)', () => {
  const compId = 'comp_nat_01';
  const discId = 'disc_100m_final';
  const opId = 'op_100m_1';

  beforeEach(() => {
    portalAuthService.logoutAll();
  });

  it('strictly rejects updateOperationInline when caller passes spoofed role without a token', async () => {
    // Attacker sends { role: 'LEAGUE_ADMIN' } or { role: 'SUPER_ADMIN' } with no token
    const res = await competitionsBureauService.updateOperationInline(
      compId,
      discId,
      opId,
      { mark: '09.70s' },
      { name: 'FakeAdmin', role: 'LEAGUE_ADMIN' }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('خطأ في الصلاحيات');
  });

  it('strictly rejects updateOperationInline when caller passes a tampered/forged token', async () => {
    // Attacker crafts a fake token
    const fakeToken = 'PFPv1.league.usr_hacker.1700000000000.deadbeefcafebabe';

    const res = await competitionsBureauService.updateOperationInline(
      compId,
      discId,
      opId,
      { mark: '09.70s' },
      { name: 'FakeAdmin', role: 'LEAGUE_ADMIN', token: fakeToken }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('خطأ في الصلاحيات');
  });

  it('strictly rejects updateOperationInline when session token has expired', async () => {
    // Generate token with timestamp from 30 days ago
    const pastTimestamp = (Date.now() - 30 * 24 * 60 * 60 * 1000).toString();
    const token = `PFPv1.league.usr_old.${pastTimestamp}.somesig`;

    const res = await competitionsBureauService.updateOperationInline(
      compId,
      discId,
      opId,
      { mark: '09.70s' },
      { name: 'OldAdmin', role: 'LEAGUE_ADMIN', token }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('خطأ في الصلاحيات');
  });

  it('accepts updateOperationInline when authenticated with a genuine signed session token', async () => {
    // Authentic login generates signed token
    const loginRes = await portalAuthService.loginLeague('saida_admin', 'Saida@2026', 'lg_saida');
    expect(loginRes.success).toBe(true);
    expect(loginRes.session?.token).toMatch(/^PFPv1\.league\./);

    const res = await competitionsBureauService.updateOperationInline(
      compId,
      discId,
      opId,
      { mark: '09.82s', rank: 1 },
      { name: loginRes.session!.username, role: 'LEAGUE_ADMIN', token: loginRes.session!.token }
    );

    expect(res.success).toBe(true);
    expect(res.updatedOperation?.mark).toBe('09.82s');
  });

  it('strictly rejects finishAndArchiveCompetition when caller is unauthenticated or role is spoofed', async () => {
    // Clear any active sessions
    portalAuthService.logoutAll();

    const res = await devicePurgeArchiveService.finishAndArchiveCompetition('comp_stage6_target', {
      name: 'UnverifiedActor',
      role: 'LEAGUE_ADMIN'
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('خطأ في الصلاحيات');
  });

  it('accepts finishAndArchiveCompetition when called with valid signed session token', async () => {
    // Setup target competition first
    await competitionsService.saveCompetition({
      id: 'comp_auth_test',
      name: 'منافسة اختبار التوثيق',
      date: '2026-11-20',
      venue: 'ملعب السعيد عمارة',
      city: 'سعيدة',
      wilayaCode: '20',
      status: 'live',
      leagueId: 'lg_saida',
      leagueName: 'الرابطة الولائية لألعاب القوى - سعيدة',
      leagueShort: 'SAIDA',
      competitionType: 'track_and_field',
      eventsCount: 5,
      athletesCount: 50,
      description: 'اختبار التوثيق',
      schedule: [],
      resultsSummary: [],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const loginRes = await portalAuthService.loginLeague('saida_admin', 'Saida@2026', 'lg_saida');
    expect(loginRes.success).toBe(true);

    const res = await devicePurgeArchiveService.finishAndArchiveCompetition('comp_auth_test', {
      name: loginRes.session!.fullName,
      role: 'LEAGUE_ADMIN',
      token: loginRes.session!.token
    });

    expect(res.success).toBe(true);
    expect(res.archive).toBeDefined();
    expect(res.archive?.status).toBe('archived_immutable');
  });

  it('verifies token signing math detects single-byte modifications', () => {
    const validToken = portalAuthService.generateSessionToken('league', 'usr_test_123');
    const validVerify = portalAuthService.verifySessionToken(validToken);
    expect(validVerify.valid).toBe(true);
    expect(validVerify.portal).toBe('league');

    // Tamper with the token
    const tampered = validToken.slice(0, -2) + 'aa';
    const tamperedVerify = portalAuthService.verifySessionToken(tampered);
    expect(tamperedVerify.valid).toBe(false);
    expect(tamperedVerify.error).toContain('توقيع');
  });
});
