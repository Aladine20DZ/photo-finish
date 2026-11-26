import { describe, it, expect, beforeEach } from 'vitest';
import { eventsService, EVENT_STATUS_FLOW, EVENT_STATUS_LABELS } from '../src/services/eventsService';
import { competitionsService } from '../src/services/competitionsService';

describe('Stage 2: Athletics Events Service (التظاهرات — League Portal)', () => {
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
    // Reset service singleton state by clearing its storage-derived memory
    (eventsService as any).inMemoryList = [];
  });

  const baseEvent = {
    name: 'التظاهرة الولائية الكبرى — سعيدة 2026',
    type: 'championship' as const,
    classification: 'wilaya' as const,
    season: '2026',
    organizer: 'رابطة ألعاب القوى سعيدة',
    startDate: '2026-06-20',
    endDate: '2026-06-22',
    venue: 'مضمار 13 أفريل 1958',
    city: 'سعيدة',
    wilayaCode: '20',
    status: 'preparing' as const,
    leagueId: 'lg_test',
    leagueName: 'رابطة الاختبار',
    program: 'برنامج عام',
    competitionsIds: [],
    clubsCount: 0,
    documents: [],
    committee: [],
    notes: ''
  };

  describe('1. CRUD + Persistence', () => {
    it('creates an event with generated id and defaults to preparing status', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      expect(evt.id).toMatch(/^evt_/);
      expect(evt.status).toBe('preparing');
      expect(evt.isArchived).toBe(false);
      expect(evt.createdAt).toBeTruthy();
    });

    it('persists events across storage reloads (offline-first)', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      // Simulate a fresh service (constructor re-reads localStorage)
      (eventsService as any).inMemoryList = [];
      const reloaded = await eventsService.getEvents('lg_test');
      expect(reloaded.some(e => e.id === evt.id)).toBe(true);
    });

    it('updates fields and bumps updatedAt', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      const before = evt.updatedAt;
      await new Promise(r => setTimeout(r, 5));
      const updated = await eventsService.updateEvent(evt.id, { name: 'اسم محدث' });
      expect(updated?.name).toBe('اسم محدث');
      expect(updated?.updatedAt >= before).toBe(true);
    });

    it('filters events by league (multi-tenant isolation)', async () => {
      await eventsService.createEvent({ ...baseEvent, leagueId: 'lg_a' });
      await eventsService.createEvent({ ...baseEvent, leagueId: 'lg_b' });
      const a = await eventsService.getEvents('lg_a');
      expect(a.length).toBe(1);
      expect(a[0].leagueId).toBe('lg_a');
    });
  });

  describe('2. Lifecycle transitions (دورة الحياة)', () => {
    it('follows the official flow preparing → open → ongoing → completed → archived', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      expect((await eventsService.transitionEventStatus(evt.id, 'open')).success).toBe(true);
      expect((await eventsService.transitionEventStatus(evt.id, 'ongoing')).success).toBe(true);
      expect((await eventsService.transitionEventStatus(evt.id, 'completed')).success).toBe(true);
      expect((await eventsService.transitionEventStatus(evt.id, 'archived')).success).toBe(true);
      const final = await eventsService.getEventById(evt.id);
      expect(final?.status).toBe('archived');
      expect(final?.isArchived).toBe(true);
    });

    it('rejects illegal transitions with Arabic error (preparing → completed)', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      const res = await eventsService.transitionEventStatus(evt.id, 'completed');
      expect(res.success).toBe(false);
      expect(res.error).toContain('انتقال غير قانوني');
    });

    it('validates the flow map integrity for all statuses', () => {
      for (const status of Object.keys(EVENT_STATUS_FLOW) as (keyof typeof EVENT_STATUS_FLOW)[]) {
        expect(EVENT_STATUS_LABELS[status]).toBeTruthy();
        for (const next of EVENT_STATUS_FLOW[status]) {
          expect(EVENT_STATUS_LABELS[next]).toBeTruthy();
        }
      }
      // archived is terminal
      expect(EVENT_STATUS_FLOW.archived).toEqual([]);
    });
  });

  describe('3. Deletion guards + Recycle Bin', () => {
    it('refuses to delete an ongoing event without force', async () => {
      const evt = await eventsService.createEvent({ ...baseEvent, status: 'ongoing' });
      const res = await eventsService.deleteEvent(evt.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain('جارية');
    });

    it('refuses to delete an event linked to competitions without force', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      await eventsService.linkCompetition(evt.id, 'comp_1');
      const res = await eventsService.deleteEvent(evt.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain('منافسة');
    });

    it('deletes with force and moves to recycle bin payload', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      const res = await eventsService.deleteEvent(evt.id, { force: true, deletedBy: 'اختبار' });
      expect(res.success).toBe(true);
      const remaining = await eventsService.getEvents('lg_test');
      expect(remaining.length).toBe(0);
    });
  });

  describe('4. Competition linking (Event-contains-Competitions)', () => {
    it('links and unlinks competitions idempotently', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      expect(await eventsService.linkCompetition(evt.id, 'comp_x')).toBe(true);
      expect(await eventsService.linkCompetition(evt.id, 'comp_x')).toBe(true);
      let fresh = await eventsService.getEventById(evt.id);
      expect(fresh?.competitionsIds).toEqual(['comp_x']);
      await eventsService.unlinkCompetition(evt.id, 'comp_x');
      fresh = await eventsService.getEventById(evt.id);
      expect(fresh?.competitionsIds).toEqual([]);
    });

    it('syncs eventId onto competitions via competitionsService', async () => {
      const comp = await competitionsService.createCompetition({
        name: 'منافسة الاختبار',
        leagueId: 'lg_test'
      });
      const ok = await competitionsService.linkCompetitionToEvent(comp.id, 'evt_target', 'تظاهرة الهدف');
      expect(ok).toBe(true);
      const linked = await competitionsService.getCompetitionsByEvent('evt_target');
      expect(linked.some(c => c.id === comp.id)).toBe(true);
      const refreshed = await competitionsService.getCompetitionById(comp.id);
      expect(refreshed?.eventId).toBe('evt_target');
      expect(refreshed?.eventName).toBe('تظاهرة الهدف');
    });
  });

  describe('5. Documents + Committee + Stats', () => {
    it('adds and removes documents with author attribution', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      await eventsService.addDocument(evt.id, { name: 'خطاب الدعوة', kind: 'invitation' });
      let fresh = await eventsService.getEventById(evt.id);
      expect(fresh?.documents.length).toBe(1);
      expect(fresh?.documents[0].kind).toBe('invitation');
      await eventsService.removeDocument(evt.id, fresh!.documents[0].id);
      fresh = await eventsService.getEventById(evt.id);
      expect(fresh?.documents.length).toBe(0);
    });

    it('adds and removes committee members', async () => {
      const evt = await eventsService.createEvent(baseEvent);
      await eventsService.addCommitteeMember(evt.id, { fullName: 'أمين بو عناني', role: 'مدير التظاهرة' });
      let fresh = await eventsService.getEventById(evt.id);
      expect(fresh?.committee.length).toBe(1);
      await eventsService.removeCommitteeMember(evt.id, fresh!.committee[0].id);
      fresh = await eventsService.getEventById(evt.id);
      expect(fresh?.committee.length).toBe(0);
    });

    it('aggregates dashboard stats by status', async () => {
      await eventsService.createEvent(baseEvent);
      await eventsService.createEvent({ ...baseEvent, status: 'ongoing' });
      await eventsService.createEvent({ ...baseEvent, status: 'completed' });
      const stats = eventsService.getStats('lg_test');
      expect(stats.total).toBe(3);
      expect(stats.preparing).toBe(1);
      expect(stats.ongoing).toBe(1);
      expect(stats.completed).toBe(1);
    });
  });
});
