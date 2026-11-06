import { describe, it, expect, beforeEach } from 'vitest';
import { portalAuthService } from '../src/services/portalAuthService';

describe('Multi-Portal Authentication & League Registration Service', () => {
  beforeEach(() => {
    portalAuthService.logoutAll();
  });

  it('provides default official leagues list (FAA, LAA, LAO, LAC, LAS, etc.)', () => {
    const leagues = portalAuthService.getAllLeagues();
    expect(leagues.length).toBeGreaterThanOrEqual(7);
    expect(leagues.some(l => l.shortName === 'FAA')).toBe(true);
    expect(leagues.some(l => l.shortName === 'LAA')).toBe(true);
  });

  it('authenticates league executive with valid credentials', async () => {
    const res = await portalAuthService.loginLeague('laa_admin', 'League@2026', 'laa_algiers');
    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.role).toBe('league_admin');
    expect(res.session?.leagueShort).toBe('LAA');
  });

  it('rejects league login with invalid password', async () => {
    const res = await portalAuthService.loginLeague('laa_admin', 'WrongPass123', 'laa_algiers');
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
});
