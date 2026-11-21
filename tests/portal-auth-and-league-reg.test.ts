import { describe, it, expect, beforeEach } from 'vitest';
import { portalAuthService } from '../src/services/portalAuthService';
import { installTestLeagueAuth, loginTestLeague, loginLeagueWith, TEST_LEAGUE_PASSWORD, makeRealServerGateway } from './helpers/leagueAuthHarness';
import { signSessionToken } from '../server/sessionTokens.js';

/**
 * Stage 1: المصادقة الخادمية للبوابات — لا كلمات مرور في الواجهة.
 * كل اختبارات الرابطة تمر عبر المعالج الخادمي الحقيقي (scrypt + جلسات HMAC موقعة).
 */

describe('Multi-Portal Authentication & League Registration Service (Server-Side Auth)', () => {
  beforeEach(async () => {
    portalAuthService.logoutAll();
    await installTestLeagueAuth();
  });

  it('provides official leagues list containing Saïda league', () => {
    const leagues = portalAuthService.getAllLeagues();
    expect(leagues.length).toBeGreaterThanOrEqual(1);
    expect(leagues.some(l => l.shortName === 'SAIDA' || l.id === 'lg_saida')).toBe(true);
  });

  it('stores no league passwords in the client registry (security migration)', () => {
    const raw = JSON.stringify(portalAuthService.getAllLeagues(true));
    expect(raw).not.toContain('adminPassword');
    expect(raw).not.toContain('Saida2026');
  });

  it('authenticates league executive through the real server (scrypt + HMAC session)', async () => {
    const res = await loginTestLeague();
    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.role).toBe('league_admin');
    expect(res.session?.leagueShort).toBe('SAIDA');
    // جلسة موقعة خادمياً بصيغة PFPs1 — لا ملصقات محلية لبوابة الرابطة
    expect(res.session?.token.startsWith('PFPs1.')).toBe(true);
  });

  it('rejects league login with invalid password (server-side compare)', async () => {
    const res = await loginLeagueWith('saida_admin', 'WrongPass123', 'lg_saida');
    expect(res.success).toBe(false);
    expect(res.error).toContain('كلمة المرور غير صحيحة');
  });

  it('rejects logins for leagues that have no server account', async () => {
    const resFaa = await loginLeagueWith('faa_admin', 'AnyPassword1', 'lg_faa');
    expect(resFaa.success).toBe(false);
    expect(resFaa.error).toContain('حساب الرابطة غير موجود');

    const resOran = await loginLeagueWith('lao_admin', 'AnyPassword1', 'lg_oran');
    expect(resOran.success).toBe(false);
  });

  it('registers a new league account on the server and activates it immediately', async () => {
    const randCode = 'ANN' + Math.floor(Math.random() * 899 + 100);
    const res = await portalAuthService.registerNewLeague({
      name: `الرابطة الولائية لألعاب القوى - عنابة (${randCode})`,
      shortName: randCode,
      type: 'wilaya',
      wilaya: 'عنابة',
      accreditationNumber: `DEC-2026-ANN-${randCode}`,
      officialEmail: `annaba_${randCode.toLowerCase()}@athletic.dz`,
      phone: '+213 38 00 00 23',
      adminFullName: 'الأستاذ جمال بن ناصر (رئيس الرابطة)',
      adminUsername: `ann_admin_${randCode.toLowerCase()}`,
      adminPassword: 'Annaba@Password2026!'
    });

    expect(res.success).toBe(true);
    expect(res.league).toBeDefined();
    expect(res.league?.shortName).toBe(randCode);

    // لا كلمة مرور تُخزَّن محلياً بعد التسجيل
    expect(JSON.stringify(res.league)).not.toContain('Annaba@Password2026');

    // Verify it is now in allLeagues
    const all = portalAuthService.getAllLeagues();
    expect(all.some(l => l.shortName === randCode)).toBe(true);

    // Verify executive session is created (server-signed)
    const session = portalAuthService.getSession('league');
    expect(session).toBeDefined();
    expect(session?.leagueShort).toBe(randCode);
    expect(session?.token.startsWith('PFPs1.')).toBe(true);
  });

  it('enforces server-side password policy on registration (min 8 chars, letters+numbers)', async () => {
    const gateway = makeRealServerGateway();
    const weak = await gateway.register({
      leagueId: 'lg_weak_test',
      username: 'weak_admin',
      email: 'weak@test.dz',
      password: 'short1'
    });
    expect(weak.success).toBe(false);
    expect(weak.error).toContain('8 أحرف');
  });

  it('authenticates club coach with club binding (local field label)', async () => {
    const res = await portalAuthService.loginCoach('coach_mca', 'Coach@2026', 'club_mca');
    expect(res.success).toBe(true);
    expect(res.session?.role).toBe('club_coach');
    expect(res.session?.clubId).toBe('club_mca');
  });

  it('authenticates judge with duty code and room code (local field label)', async () => {
    const res = await portalAuthService.loginJudge({
      dutyCode: 'START-ALG-9K4M',
      judgeName: 'حكم الانطلاق المعتمد'
    });
    expect(res.success).toBe(true);
    expect(res.session?.dutyCode).toBe('START-ALG-9K4M');
  });

  it('admin login requires the auth server (no offline/default path)', async () => {
    const res = await portalAuthService.loginAdmin('Admin@PhotoFinish2026!');
    expect(res.success).toBe(false);
    expect(res.error).toContain('خادم');
  });

  it('adopts a server-signed admin session and exposes the token to admin services', async () => {
    const signed = signSessionToken({ portal: 'admin', userId: 'usr_super_admin', role: 'super_admin' });
    expect(signed.ok).toBe(true);
    const res = portalAuthService.adoptAdminServerSession(signed.token!);
    expect(res.success).toBe(true);
    expect(res.session?.role).toBe('super_admin');
    const adminSession = portalAuthService.getSession('admin');
    expect(adminSession?.token).toBe(signed.token);
  });

  it('resolves league accounts by username, short alias, or official email (server-side aliasing)', async () => {
    // 1. By admin username alone
    const res1 = await loginLeagueWith('saida_admin', TEST_LEAGUE_PASSWORD);
    expect(res1.success).toBe(true);
    expect(res1.session?.leagueShort).toBe('SAIDA');
    expect(res1.session?.leagueId).toBe('lg_saida');

    // 2. By short code alias alone
    const res2 = await loginLeagueWith('saida', TEST_LEAGUE_PASSWORD);
    expect(res2.success).toBe(true);
    expect(res2.session?.leagueShort).toBe('SAIDA');

    // 3. By LWAS alias
    const res3 = await loginLeagueWith('lwas', TEST_LEAGUE_PASSWORD);
    expect(res3.success).toBe(true);
    expect(res3.session?.leagueShort).toBe('SAIDA');

    // 4. By official email
    const res4 = await loginLeagueWith('lwassaida20@gmail.com', TEST_LEAGUE_PASSWORD);
    expect(res4.success).toBe(true);
    expect(res4.session?.leagueShort).toBe('SAIDA');
    expect(res4.session?.email).toBe('lwassaida20@gmail.com');
  });

  it('ensures only Saïda has an active login account among the default federations', () => {
    const activeLeaguesWithAccounts = portalAuthService.getAllLeagues().filter(l =>
      ['lg_saida', 'lg_faa', 'lg_oran', 'lg_algiers', 'lg_constantine', 'lg_setif', 'lg_chlef'].includes(l.id) && l.isActive
    );
    expect(activeLeaguesWithAccounts.length).toBe(1);
    expect(activeLeaguesWithAccounts[0].id).toBe('lg_saida');
    expect(activeLeaguesWithAccounts[0].officialEmail).toBe('lwassaida20@gmail.com');
  });
});
