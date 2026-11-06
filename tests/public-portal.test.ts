import { describe, it, expect } from 'vitest';
import { publicPortalService } from '../src/services/publicPortalService';

describe('Stage 3: Public Portal & Hero Experience', () => {
  it('retrieves published competitions list with valid metadata', async () => {
    const competitions = await publicPortalService.getPublishedCompetitions();
    expect(competitions.length).toBeGreaterThan(0);

    const nationalChampionship = competitions.find(c => c.id === 'comp_algiers_national_2026');
    expect(nationalChampionship).toBeDefined();
    expect(nationalChampionship?.is_published).toBe(true);
    expect(nationalChampionship?.venue).toContain('5 جويلية');
  });

  it('retrieves certified results with official times and wind readings', async () => {
    const results = await publicPortalService.getCertifiedResults('comp_algiers_national_2026');
    expect(results.length).toBeGreaterThanOrEqual(3);

    // Verify 1st place gold medalist
    const winner = results[0];
    expect(winner.rank).toBe(1);
    expect(winner.time_millis).toBe(10120); // 10.12s
    expect(winner.wind_reading).toBe(1.2);
    expect(winner.athlete_name).toBe('يوسف العبدلي');
    expect(winner.bib_number).toBe('101');
  });

  it('performs universal search across competitions, clubs, and bibs', async () => {
    // Search by club code "MCA"
    const mcaSearch = await publicPortalService.universalSearch('MCA');
    expect(mcaSearch.clubs.some(c => c.code === 'MCA')).toBe(true);

    // Search by athlete name
    const athleteSearch = await publicPortalService.universalSearch('سفيان');
    expect(athleteSearch.results.some(r => r.athlete_name?.includes('سفيان'))).toBe(true);

    // Search by bib number
    const bibSearch = await publicPortalService.universalSearch('103');
    expect(bibSearch.results.some(r => r.bib_number === '103')).toBe(true);
  });

  it('fetches registered athletics clubs directory', async () => {
    const clubs = await publicPortalService.getClubsDirectory();
    expect(clubs.length).toBeGreaterThanOrEqual(3);
    expect(clubs.map(c => c.code)).toContain('MCA');
    expect(clubs.map(c => c.code)).toContain('CRB');
  });
});
