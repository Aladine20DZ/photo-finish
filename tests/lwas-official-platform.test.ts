import { describe, it, expect, beforeEach } from 'vitest';
import { lwasService, LWAS_IDENTITY } from '../src/services/lwasService';
import { portalAuthService } from '../src/services/portalAuthService';
import { competitionsService } from '../src/services/competitionsService';
import { competitionEntriesService } from '../src/services/competitionEntriesService';

describe('SAIDA ATHLETICS LEAGUE (LWAS) — Official Digital Platform Suite', () => {
  beforeEach(() => {
    // Clean mock storage if needed
  });

  describe('1. LWAS Identity & Architectural Scope (Sections 1, 2, 3)', () => {
    it('provides complete official LWAS identity metadata', () => {
      const identity = lwasService.getIdentity();
      expect(identity.id).toBe('lg_saida');
      expect(identity.nameAr).toBe('رابطة ألعاب القوى سعيدة');
      expect(identity.nameEn).toBe('SAIDA ATHLETICS LEAGUE');
      expect(identity.acronym).toBe('LWAS');
      expect(identity.wilayaCode).toBe('20');
      expect(identity.wilayaName).toBe('سعيدة');
      expect(identity.headquarters).toContain('سعيدة');
      expect(identity.accreditationNumber).toBe('LAAP-SAD-2026-020');
      expect(identity.federation).toContain('FAA');
    });

    it('resolves official operating league as lg_saida without user selection', () => {
      const league = lwasService.getOfficialLeague();
      expect(league).toBeDefined();
      expect(league.id).toBe('lg_saida');
      expect(league.wilaya).toBe('سعيدة');
      expect(league.isActive).toBe(true);
    });

    it('preserves all past registered leagues in database without deletion', () => {
      const allLeagues = portalAuthService.getAllLeagues();
      expect(allLeagues.length).toBeGreaterThanOrEqual(7);
      const codes = allLeagues.map(l => l.shortName);
      expect(codes).toContain('SAIDA');
      expect(codes).toContain('FAA');
      expect(codes).toContain('LAA');
      expect(codes).toContain('LAO');
      expect(codes).toContain('LAC');
      expect(codes).toContain('LAS');
      expect(codes).toContain('LACH');
    });

    it('authenticates using both saida_admin and lwas_admin credentials', async () => {
      const resSaida = await portalAuthService.loginLeague('saida_admin', 'Saida@2026');
      expect(resSaida.success).toBe(true);
      expect(resSaida.session?.leagueId).toBe('lg_saida');

      const resLwas = await portalAuthService.loginLeague('lwas_admin', 'Saida@2026');
      expect(resLwas.success).toBe(true);
      expect(resLwas.session?.leagueId).toBe('lg_saida');
    });
  });

  describe('2. Live Database Statistics (Section 2 C)', () => {
    it('retrieves live statistics from actual database engines without mock numbers', async () => {
      const stats = await lwasService.getLiveStats();
      expect(stats.totalClubs).toBeGreaterThan(0);
      expect(stats.totalAthletes).toBeGreaterThan(0);
      expect(stats.totalCompetitions).toBeGreaterThan(0);
      expect(stats.totalCertifiedResults).toBeGreaterThan(0);
      expect(stats.totalRecords).toBeGreaterThan(0);
      expect(stats.activeSeason).toContain('2026');
    });
  });

  describe('3. LWAS Competitions & Scoping (Sections 5, 8)', () => {
    it('filters competitions strictly to LWAS (Wilaya of Saïda) without other leagues leaking', async () => {
      const comps = await lwasService.getLwasCompetitions();
      expect(comps.length).toBeGreaterThan(0);
      comps.forEach(c => {
        const isSaida = c.leagueId === 'lg_saida' || c.wilayaCode === '20' || c.city === 'سعيدة';
        expect(isSaida).toBe(true);
      });
    });

    it('supports status filtering (live, upcoming, completed)', async () => {
      const all = await lwasService.getLwasCompetitions('all');
      const live = await lwasService.getLwasCompetitions('live');
      expect(all.length).toBeGreaterThanOrEqual(live.length);
    });

    it('sets the default active competition to an LWAS event', async () => {
      const activeId = competitionsService.getActiveCompetitionId();
      expect(activeId).toBe('comp_lwas_01');
      const activeComp = await competitionsService.getActiveCompetition();
      expect(activeComp?.leagueId).toBe('lg_saida');
    });
  });

  describe('4. Certified Results & Club Standings (Sections 6, 7)', () => {
    it('returns only certified results with marks and ranks', () => {
      const results = lwasService.getLatestCertifiedResults();
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.status).toBe('finished');
        expect(r.mark).toBeDefined();
      });
    });

    it('calculates club rankings and medal standings under World Athletics Rule 19', () => {
      const standings = lwasService.getClubStandings();
      expect(standings.length).toBeGreaterThan(0);
      // First ranked club has the most gold medals or highest points
      expect(standings[0].rank).toBe(1);
      expect(standings[0].gold).toBeGreaterThanOrEqual(standings[1].gold);
      standings.forEach(s => {
        expect(s.totalMedals).toBe(s.gold + s.silver + s.bronze);
        expect(s.city).toBe('سعيدة');
      });
    });
  });

  describe('5. League Records & Hall of Fame (Section 2 H)', () => {
    it('retrieves TR31-compliant ratified records for Wilaya of Saïda', () => {
      const records = lwasService.getRecords();
      expect(records.length).toBeGreaterThan(0);
      const sprintRecord = records.find(r => r.discipline.includes('100'));
      expect(sprintRecord).toBeDefined();
      expect(sprintRecord?.athleteName).toBe('معتز برشم');
      expect(sprintRecord?.ratificationNumber).toContain('LWAS');
    });

    it('filters records by category and gender', () => {
      const u20Records = lwasService.getRecords('all', 'U20');
      expect(u20Records.every(r => r.category === 'U20')).toBe(true);
    });
  });

  describe('6. News & Announcements Engine (Section 2 G, Section 11)', () => {
    it('retrieves official news and bulletins', () => {
      const news = lwasService.getNews();
      expect(news.length).toBeGreaterThanOrEqual(4);
    });

    it('allows publishing a new bulletin and removing it safely', () => {
      const initialCount = lwasService.getNews().length;
      const created = lwasService.addNews({
        title: 'بلاغ تجريبي لاجتماع اللجنة الفنية',
        category: 'circular',
        urgency: 'normal',
        target: 'all',
        summary: 'موجز الاجتماع الفني الدوري للرابطة',
        content: 'تفاصيل الاجتماع بمقر الرابطة 13 أفريل سعيدة',
        author: 'الأمانة العامة'
      });

      expect(created.id).toBeDefined();
      expect(lwasService.getNews().length).toBe(initialCount + 1);

      const deleted = lwasService.deleteNews(created.id);
      expect(deleted).toBe(true);
      expect(lwasService.getNews().length).toBe(initialCount);
    });
  });

  describe('7. Official Result Correction with Audit Log (Section 7)', () => {
    it('enforces audit logging when correcting a certified result', () => {
      const res = lwasService.requestResultCorrection({
        resultId: 'ent_lwas_01',
        athleteName: 'معتز برشم',
        competitionName: 'البطولة الولائية الصيفية',
        discipline: '100 متر',
        previousValue: '10.22s',
        newValue: '10.20s',
        reason: 'تصحيح زمن بعد فحص شريط الكاميرا بدقة 2000 إطار/ثانية',
        officerName: 'سفيان بن عيسى (رئيس القضاة)'
      });

      expect(res.success).toBe(true);
      expect(res.auditRecord.id).toBeDefined();
      expect(res.auditRecord.previousValue).toBe('10.22s');
      expect(res.auditRecord.newValue).toBe('10.20s');

      const auditList = lwasService.getAuditCorrections();
      expect(auditList.some(a => a.id === res.auditRecord.id)).toBe(true);
    });
  });
});
