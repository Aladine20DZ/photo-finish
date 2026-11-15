import { describe, it, expect, beforeEach } from 'vitest';
import { publicPortalService } from '../src/services/publicPortalService';
import { athleteClubStorage } from '../src/services/athleteClubStorage';

describe('Stage 3: Public Portal & Hero Experience', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(async () => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    (globalThis as any).localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
      removeItem: (k: string) => { delete mockStorage[k]; },
      clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
    };
    await athleteClubStorage.clearAll();
  });

  it('retrieves published competitions list from Saïda League', async () => {
    // 1. Initial state is empty for clean production
    const emptyComps = await publicPortalService.getPublishedCompetitions();
    expect(emptyComps).toEqual([]);

    // 2. When Saïda League publishes a competition
    const sampleComp = {
      id: 'comp_saida_open_2026',
      league_id: 'lg_saida',
      name: 'بطولة سعيدة المفتوحة لألعاب القوى 2026',
      competition_type: 'track_and_field',
      venue: 'المضمار الولائي لألعاب القوى، سعيدة',
      city: 'سعيدة',
      start_date: '2026-06-20',
      end_date: '2026-06-20',
      status: 'upcoming',
      is_published: true
    };
    (globalThis as any).localStorage.setItem('pfp_league_competitions_saida', JSON.stringify([sampleComp]));

    const competitions = await publicPortalService.getPublishedCompetitions();
    expect(competitions.length).toBe(1);
    expect(competitions[0].id).toBe('comp_saida_open_2026');
    expect(competitions[0].city).toBe('سعيدة');
  });

  it('retrieves certified results', async () => {
    const results = await publicPortalService.getCertifiedResults('comp_saida_open_2026');
    expect(Array.isArray(results)).toBe(true);
  });

  it('performs universal search across competitions and clubs', async () => {
    // Seed club in athleteClubStorage
    await athleteClubStorage.saveClub({
      id: 'club_saida_athletics',
      name: 'مولودية سعيدة لألعاب القوى',
      code: 'MCSA',
      city: 'سعيدة',
      wilayaCode: '20',
      wilayaName: 'سعيدة',
      presidentName: 'أحمد سعيدي',
      phone: '+213 48 50 00 01',
      email: 'mcsa@athletics.dz',
      federationLicenseId: 'LIC-DZ-20-001',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      medalsTally: { gold: 3, silver: 1, bronze: 0 }
    });

    const saidaSearch = await publicPortalService.universalSearch('سعيدة');
    expect(saidaSearch.clubs.some(c => c.code === 'MCSA')).toBe(true);
  });

  it('fetches registered athletics clubs directory', async () => {
    const emptyClubs = await publicPortalService.getClubsDirectory();
    expect(emptyClubs).toEqual([]);

    await athleteClubStorage.saveClub({
      id: 'club_widad_saida',
      name: 'وداد سعيدة للعدو الريفي',
      code: 'WRS',
      city: 'سعيدة',
      wilayaCode: '20',
      wilayaName: 'سعيدة',
      presidentName: 'عمر بن علي',
      phone: '+213 48 50 00 02',
      email: 'wrs@athletics.dz',
      federationLicenseId: 'LIC-DZ-20-002',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      medalsTally: { gold: 1, silver: 2, bronze: 1 }
    });

    const clubs = await publicPortalService.getClubsDirectory();
    expect(clubs.length).toBe(1);
    expect(clubs[0].code).toBe('WRS');
    expect(clubs[0].wilaya).toBe('سعيدة');
  });
});
