import { describe, it, expect, beforeEach } from 'vitest';
import { portalAuthService } from '../src/services/portalAuthService';

describe('Multi-Portal Authentication & League Registration Service', () => {
  beforeEach(() => {
    portalAuthService.logoutAll();
  });

  it('provides official leagues list containing Saïda league', () => {
    const leagues = portalAuthService.getAllLeagues();
    expect(leagues.length).toBeGreaterThanOrEqual(1);
    expect(leagues.some(l => l.shortName === 'SAIDA' || l.id === 'lg_saida')).toBe(true);
  });

  it('authenticates league executive with valid credentials', async () => {
    const res = await portalAuthService.loginLeague('saida_admin', 'Saida@2026', 'lg_saida');
    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.role).toBe('league_admin');
    expect(res.session?.leagueShort).toBe('SAIDA');
  });

  it('rejects league login with invalid password', async () => {
    const res = await portalAuthService.loginLeague('saida_admin', 'WrongPass123', 'lg_saida');
    expect(res.success).toBe(false);
    expect(res.error).toContain('كلمة المرور غير صحيحة');
  });

  it('registers a new league account and activates it immediately', async () => {
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

    // Verify it is now in allLeagues
    const all = portalAuthService.getAllLeagues();
    expect(all.some(l => l.shortName === randCode)).toBe(true);

    // Verify executive session is created
    const session = portalAuthService.getSession('league');
    expect(session).toBeDefined();
    expect(session?.leagueShort).toBe(randCode);
  });

  it('authenticates club coach with club binding', async () => {
    const res = await portalAuthService.loginCoach('coach_mca', 'Coach@2026', 'club_mca');
    expect(res.success).toBe(true);
    expect(res.session?.role).toBe('club_coach');
    expect(res.session?.clubId).toBe('club_mca');
  });

  it('authenticates judge with duty code and room code', async () => {
    const res = await portalAuthService.loginJudge({
      dutyCode: 'START-ALG-9K4M',
      judgeName: 'حكم الانطلاق المعتمد'
    });
    expect(res.success).toBe(true);
    expect(res.session?.dutyCode).toBe('START-ALG-9K4M');
  });

  it('authenticates super administrator with master key', async () => {
    const res = await portalAuthService.loginAdmin('Admin@PhotoFinish2026!');
    expect(res.success).toBe(true);
    expect(res.session?.role).toBe('super_admin');
  });

  it('automatically resolves league without needing targetLeagueId selector', async () => {
    // 1. By admin username alone
    const res1 = await portalAuthService.loginLeague('saida_admin', 'Saida@2026');
    expect(res1.success).toBe(true);
    expect(res1.session?.leagueShort).toBe('SAIDA');
    expect(res1.session?.leagueId).toBe('lg_saida');

    // 2. By short code alone
    const res2 = await portalAuthService.loginLeague('saida', 'Saida@2026');
    expect(res2.success).toBe(true);
    expect(res2.session?.leagueShort).toBe('SAIDA');

    // 3. By official email alone
    const res3 = await portalAuthService.loginLeague('saida@athletic.dz', 'Saida@2026');
    expect(res3.success).toBe(true);
    expect(res3.session?.leagueShort).toBe('SAIDA');

    // 4. By new official LWAS email and password
    const res4 = await portalAuthService.loginLeague('lwassaida20@gmail.com', 'Saida2026');
    expect(res4.success).toBe(true);
    expect(res4.session?.leagueShort).toBe('SAIDA');
    expect(res4.session?.email).toBe('lwassaida20@gmail.com');
  });

  it('ensures all other default league accounts are deleted and only Saïda has an active login account', async () => {
    // Only Saida has an active login account
    const activeLeaguesWithAccounts = portalAuthService.getAllLeagues().filter(l => 
      ['lg_saida', 'lg_faa', 'lg_oran', 'lg_algiers', 'lg_constantine', 'lg_setif', 'lg_chlef'].includes(l.id) && l.isActive
    );
    expect(activeLeaguesWithAccounts.length).toBe(1);
    expect(activeLeaguesWithAccounts[0].id).toBe('lg_saida');
    expect(activeLeaguesWithAccounts[0].officialEmail).toBe('lwassaida20@gmail.com');

    // Attempting login with deleted league accounts fails
    const resFaa = await portalAuthService.loginLeague('faa_admin', 'Faa@2026');
    expect(resFaa.success).toBe(false);

    const resOran = await portalAuthService.loginLeague('lao_admin', 'Lao@2026');
    expect(resOran.success).toBe(false);
  });
});

