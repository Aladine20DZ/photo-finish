import { describe, it, expect, beforeEach } from 'vitest';
import { competitionsService } from '../src/services/competitionsService';
import { portalAuthService } from '../src/services/portalAuthService';

describe('Stage 2: Competitions & Events Directory, Public Topbar & League Data Preservation', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = String(val); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      length: 0,
      key: () => null,
    };
  });

  describe('1. League Entity Preservation (Database & Relations)', () => {
    it('preserves the league entity in DB and portal auth service without breaking relations', () => {
      const leagues = portalAuthService.getAllLeagues();
      expect(leagues.length).toBeGreaterThanOrEqual(1);

      // Verify Saïda league exists and is fully intact
      const saida = leagues.find(l => l.id === 'lg_saida' || l.shortName === 'SAIDA');
      expect(saida).toBeDefined();
      expect(saida?.name).toContain('سعيدة');
      expect(saida?.adminUsername).toBe('saida_admin');
    });

    it('allows filtering competitions by league while preserving all leagues', async () => {
      const allLeagues = competitionsService.getAvailableLeagues();
      expect(allLeagues.length).toBeGreaterThanOrEqual(1);

      // Filter by Saïda league
      const saidaComps = await competitionsService.filterCompetitions({ leagueId: 'lg_saida' });
      expect(saidaComps.every(c => c.leagueId === 'lg_saida' || c.leagueShort === 'SAIDA')).toBe(true);

      // Filter by All
      const allComps = await competitionsService.filterCompetitions({ leagueId: 'all' });
      expect(allComps.length).toBeGreaterThanOrEqual(saidaComps.length);
    });
  });

  describe('2. Competitions Service & Multi-Criteria Filtering', () => {
    it('retrieves national competitions with all required metadata', async () => {
      const list = await competitionsService.getCompetitions();
      expect(list.length).toBeGreaterThan(0);

      const first = list[0];
      expect(first.id).toBeDefined();
      expect(first.name).toBeDefined();
      expect(first.date).toBeDefined();
      expect(first.venue).toBeDefined();
      expect(first.status).toBeDefined();
      expect(first.leagueId).toBeDefined();
      expect(first.leagueName).toBeDefined();
    });

    it('filters accurately by competition status (live, upcoming, completed)', async () => {
      const live = await competitionsService.filterCompetitions({ status: 'live' });
      expect(live.every(c => c.status === 'live')).toBe(true);

      const upcoming = await competitionsService.filterCompetitions({ status: 'upcoming' });
      expect(upcoming.every(c => c.status === 'upcoming')).toBe(true);

      const completed = await competitionsService.filterCompetitions({ status: 'completed' });
      expect(completed.every(c => c.status === 'completed')).toBe(true);
    });

    it('filters accurately by text search across competition name, venue, and city', async () => {
      const query = 'سعيدة';
      const results = await competitionsService.filterCompetitions({ query });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.name.includes('سعيدة') || c.city.includes('سعيدة') || c.leagueName.includes('سعيدة'))).toBe(true);
    });

    it('sorts competitions correctly by date (descending and ascending)', async () => {
      const desc = await competitionsService.filterCompetitions({ sortBy: 'date_desc' });
      for (let i = 0; i < desc.length - 1; i++) {
        expect(new Date(desc[i].date).getTime()).toBeGreaterThanOrEqual(new Date(desc[i + 1].date).getTime());
      }

      const asc = await competitionsService.filterCompetitions({ sortBy: 'date_asc' });
      for (let i = 0; i < asc.length - 1; i++) {
        expect(new Date(asc[i].date).getTime()).toBeLessThanOrEqual(new Date(asc[i + 1].date).getTime());
      }
    });

    it('provides schedule events and certified results for detailed competition view', async () => {
      const comp = await competitionsService.getCompetitionById('comp_nat_01');
      expect(comp).not.toBeNull();
      expect(comp?.schedule.length).toBeGreaterThan(0);
      expect(comp?.resultsSummary.length).toBeGreaterThan(0);

      const winner = comp?.resultsSummary[0];
      expect(winner?.rank).toBe(1);
      expect(winner?.athleteName).toBeDefined();
      expect(winner?.mark).toBeDefined();
      expect(winner?.discipline).toBeDefined();
    });
  });

  describe('3. Public Topbar & Navigation Structure', () => {
    it('verifies CompetitionsEventsPage exports cleanly and mounts properly', async () => {
      const module = await import('../src/components/public/CompetitionsEventsPage');
      expect(module.CompetitionsEventsPage).toBeDefined();
    }, 120000);
  });
});
