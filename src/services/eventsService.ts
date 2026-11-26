/**
 * PHOTO FINISH PRO AI — Athletics Events Service (Stage 2 — League Portal)
 * Manages "التظاهرات" (Athletics Events) as first-class entities that group
 * competitions under a single umbrella: championships, meetings, camps.
 *
 * Event lifecycle (دورة الحياة الرسمية):
 *   preparing → open → ongoing → completed → archived
 *
 * Adheres to:
 * 1. The platform's Second Design Decision: المنافسة هي محور البيانات،
 *    والتظاهرة هي الحاضنة الرسمية للمنافسات (Event contains Competitions).
 * 2. Offline-First persistence (localStorage) with Supabase synchronization
 *    following the same architecture as competitionsService.
 * 3. Centralized Recycle Bin integration with deletion guards.
 * 4. Strict multi-tenant league isolation (leagueId scoping).
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { recycleBinService } from './recycleBinService';
import { portalAuthService } from './portalAuthService';

export type EventStatus = 'preparing' | 'open' | 'ongoing' | 'completed' | 'archived';

export type EventType =
  | 'championship'   // بطولة
  | 'meeting'        // لقاء / استقبال
  | 'open_day'       // يوم مفتوح
  | 'camp'           // معسكر تدريبي
  | 'training'       // تكوين / ورشة
  | 'other';         // أخرى

export type EventClassification =
  | 'international'  // دولي
  | 'national'       // وطني
  | 'regional'       // جهوي
  | 'wilaya'         // ولائي
  | 'friendly';      // ودّي

export interface EventDocument {
  id: string;
  name: string;
  kind: 'invitation' | 'program' | 'entry_list' | 'results' | 'report' | 'other';
  createdAt: string;
  createdBy: string;
}

export interface EventCommitteeMember {
  id: string;
  fullName: string;
  role: string;      // مدير التظاهرة / رئيس اللجنة المنظمة / ...
  phone?: string;
}

export interface AthleticsEvent {
  id: string;
  name: string;
  type: EventType;
  classification: EventClassification;
  season: string;              // e.g. "2026" or "2025-2026"
  organizer: string;           // الجهة المنظمة
  startDate: string;           // ISO date (YYYY-MM-DD)
  endDate: string;             // ISO date (YYYY-MM-DD)
  venue: string;
  city: string;
  wilayaCode: string;
  status: EventStatus;
  leagueId: string;
  leagueName: string;
  program: string;             // البرنامج العام (وصف حر)
  competitionsIds: string[];   // المنافسات التابعة للتظاهرة
  clubsCount: number;
  documents: EventDocument[];
  committee: EventCommitteeMember[];
  notes: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  preparing: 'تحضير',
  open: 'مفتوحة',
  ongoing: 'جارية',
  completed: 'منتهية',
  archived: 'مؤرشفة'
};

export const EVENT_STATUS_FLOW: Record<EventStatus, EventStatus[]> = {
  preparing: ['open', 'ongoing', 'archived'],
  open: ['ongoing', 'completed', 'archived'],
  ongoing: ['completed', 'archived'],
  completed: ['archived'],
  archived: []
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  championship: 'بطولة',
  meeting: 'لقاء / استقبال',
  open_day: 'يوم مفتوح',
  camp: 'معسكر تدريبي',
  training: 'تكوين / ورشة',
  other: 'أخرى'
};

export const EVENT_CLASSIFICATION_LABELS: Record<EventClassification, string> = {
  international: 'دولي',
  national: 'وطني',
  regional: 'جهوي',
  wilaya: 'ولائي',
  friendly: 'ودّي'
};

const STORAGE_KEY = 'pfp_athletics_events_v1';

function seedEvents(): AthleticsEvent[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'evt_lwas_2026_summer',
      name: 'التظاهرة الولائية الكبرى — سعيدة صيف 2026',
      type: 'championship',
      classification: 'wilaya',
      season: '2026',
      organizer: 'رابطة ألعاب القوى سعيدة (LWAS)',
      startDate: '2026-06-20',
      endDate: '2026-06-22',
      venue: 'مضمار 13 أفريل 1958، سعيدة',
      city: 'سعيدة',
      wilayaCode: '20',
      status: 'ongoing',
      leagueId: 'lg_saida',
      leagueName: 'رابطة ألعاب القوى سعيدة (LWAS)',
      program: 'اليوم الأول: تصفيات المضمار. اليوم الثاني: النهائيات والميدان. اليوم الثالث: التتابع والتتويج.',
      competitionsIds: ['comp_lwas_01'],
      clubsCount: 12,
      documents: [
        { id: 'doc_lwas_inv', name: 'خطاب دعوة الأندية', kind: 'invitation', createdAt: now, createdBy: 'مدير الرابطة' },
        { id: 'doc_lwas_prog', name: 'البرنامج الرسمي للتظاهرة', kind: 'program', createdAt: now, createdBy: 'مدير الرابطة' }
      ],
      committee: [
        { id: 'cm_lwas_1', fullName: 'أمين بو عناني', role: 'مدير التظاهرة' },
        { id: 'cm_lwas_2', fullName: 'رئيس اللجنة التقنية', role: 'رئيس لجنة المضمار' }
      ],
      notes: 'تتأهل النتائج الأولى للبطولة الجهوية.',
      isArchived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'evt_lwas_2026_cross',
      name: 'التظاهرة الجهوية للعدو الريفي — سعيدة 2026',
      type: 'meeting',
      classification: 'regional',
      season: '2026',
      organizer: 'الرابطة الولائية بالتنسيق مع الرابطة الجهوية',
      startDate: '2026-11-08',
      endDate: '2026-11-08',
      venue: 'غابة سي الطاهر الحاج، سعيدة',
      city: 'سعيدة',
      wilayaCode: '20',
      status: 'preparing',
      leagueId: 'lg_saida',
      leagueName: 'رابطة ألعاب القوى سعيدة (LWAS)',
      program: 'مسابقات العدو الريفي لجميع الفئات (أشبال، أواسط، أكابر) ذكوراً وإناثاً.',
      competitionsIds: [],
      clubsCount: 0,
      documents: [],
      committee: [],
      notes: '',
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }
  ];
}

export class EventsService {
  private inMemoryList: AthleticsEvent[] = [];
  private listeners: ((events: AthleticsEvent[]) => void)[] = [];

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    if (this.inMemoryList.length > 0) return;
    if (typeof localStorage === 'undefined') {
      this.inMemoryList = seedEvents();
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.inMemoryList = parsed;
        } else {
          this.inMemoryList = seedEvents();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryList));
        }
      } else {
        this.inMemoryList = seedEvents();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryList));
      }
    } catch {
      this.inMemoryList = seedEvents();
    }
    this.syncRemote();
  }

  /** Fire-and-forget Supabase sync (offline-first: local is source of truth) */
  private syncRemote(): void {
    if (!isSupabaseConfigured()) return;
    try {
      (supabase
        .from('athletics_events') as any)
        .upsert(
          this.inMemoryList.map(e => ({
            id: e.id,
            league_id: e.leagueId,
            name: e.name,
            type: e.type,
            classification: e.classification,
            season: e.season,
            organizer: e.organizer,
            start_date: e.startDate,
            end_date: e.endDate,
            venue: e.venue,
            city: e.city,
            wilaya_code: e.wilayaCode,
            status: e.status,
            program: e.program,
            competitions_ids: e.competitionsIds,
            payload: e,
            updated_at: e.updatedAt
          })),
          { onConflict: 'id' }
        )
        .then(() => {}, () => {});
    } catch {}
  }

  private persist(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryList));
      } catch {}
    }
    this.syncRemote();
    this.notify();
  }

  private notify(): void {
    const copy = [...this.inMemoryList];
    this.listeners.forEach(l => l(copy));
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('pfp:events-changed', { detail: copy }));
      } catch {}
    }
  }

  public onEventsChanged(listener: (events: AthleticsEvent[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public async getEvents(leagueId?: string): Promise<AthleticsEvent[]> {
    this.initStorage();
    if (!leagueId) return [...this.inMemoryList];
    return this.inMemoryList.filter(e => e.leagueId === leagueId);
  }

  public getEventsSync(leagueId?: string): AthleticsEvent[] {
    this.initStorage();
    if (!leagueId) return [...this.inMemoryList];
    return this.inMemoryList.filter(e => e.leagueId === leagueId);
  }

  public async getEventById(id: string): Promise<AthleticsEvent | null> {
    this.initStorage();
    return this.inMemoryList.find(e => e.id === id) || null;
  }

  public generateEventId(): string {
    return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  public async createEvent(
    data: Omit<AthleticsEvent, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'> & { id?: string }
  ): Promise<AthleticsEvent> {
    this.initStorage();
    const now = new Date().toISOString();
    const newEvent: AthleticsEvent = {
      ...data,
      id: data.id || this.generateEventId(),
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };
    this.inMemoryList.unshift(newEvent);
    this.persist();
    return newEvent;
  }

  public async updateEvent(id: string, data: Partial<AthleticsEvent>): Promise<AthleticsEvent | null> {
    this.initStorage();
    const idx = this.inMemoryList.findIndex(e => e.id === id);
    if (idx < 0) return null;
    const updated: AthleticsEvent = {
      ...this.inMemoryList[idx],
      ...data,
      id: this.inMemoryList[idx].id,
      updatedAt: new Date().toISOString()
    };
    this.inMemoryList[idx] = updated;
    this.persist();
    return updated;
  }

  /**
   * Official lifecycle transition with flow validation.
   * Returns an Arabic error message when the transition is illegal.
   */
  public async transitionEventStatus(
    id: string,
    next: EventStatus
  ): Promise<{ success: boolean; error?: string }> {
    this.initStorage();
    const evt = this.inMemoryList.find(e => e.id === id);
    if (!evt) return { success: false, error: 'التظاهرة غير موجودة' };
    if (evt.status === next) return { success: true };
    const allowed = EVENT_STATUS_FLOW[evt.status] || [];
    if (!allowed.includes(next)) {
      return {
        success: false,
        error: `انتقال غير قانوني: لا يمكن الانتقال من حالة "${EVENT_STATUS_LABELS[evt.status]}" إلى "${EVENT_STATUS_LABELS[next]}".`
      };
    }
    await this.updateEvent(id, { status: next, isArchived: next === 'archived' ? true : evt.isArchived });
    return { success: true };
  }

  /**
   * Deletes an event after guarding: cannot delete while status is ongoing,
   * or while linked competitions still reference the event (unless force).
   */
  public async deleteEvent(
    id: string,
    options?: { reason?: string; deletedBy?: string; force?: boolean; permanent?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    this.initStorage();
    const evt = this.inMemoryList.find(e => e.id === id);
    if (!evt) return { success: false, error: 'التظاهرة غير موجودة' };

    if (evt.status === 'ongoing' && !options?.force) {
      return {
        success: false,
        error: 'لا يمكن حذف تظاهرة جارية. انتظر انتهاءها أو استخدم الحذف الاستثنائي مع توثيق السبب.'
      };
    }

    if (evt.competitionsIds.length > 0 && !options?.force) {
      return {
        success: false,
        error: `لا يمكن حذف التظاهرة لارتباطها بـ ${evt.competitionsIds.length} منافسة. افصل المنافسات أولاً أو استخدم الحذف الاستثنائي.`
      };
    }

    if (!options?.permanent) {
      try {
        await recycleBinService.moveToRecycleBin({
          leagueId: evt.leagueId || 'lg_saida',
          entityType: 'event',
          entityId: evt.id,
          entityName: evt.name,
          sourceModule: 'events',
          payload: { ...evt },
          deletedBy: options?.deletedBy || portalAuthService.getActiveSession()?.fullName || 'مدير الرابطة',
          reason: options?.reason || 'حذف ونقل إلى سلة المحذوفات'
        });
      } catch (err) {
        console.warn('[EventsService] recycle bin error:', err);
      }
    }

    this.inMemoryList = this.inMemoryList.filter(e => e.id !== id);
    this.persist();
    return { success: true };
  }

  public async restoreEvent(evtData: AthleticsEvent): Promise<AthleticsEvent> {
    this.initStorage();
    const idx = this.inMemoryList.findIndex(e => e.id === evtData.id);
    if (idx >= 0) {
      this.inMemoryList[idx] = { ...evtData, updatedAt: new Date().toISOString() };
    } else {
      this.inMemoryList.unshift({ ...evtData, updatedAt: new Date().toISOString() });
    }
    this.persist();
    return evtData;
  }

  /** Links a competition to the event (idempotent). */
  public async linkCompetition(eventId: string, competitionId: string): Promise<boolean> {
    this.initStorage();
    const evt = this.inMemoryList.find(e => e.id === eventId);
    if (!evt) return false;
    if (!evt.competitionsIds.includes(competitionId)) {
      await this.updateEvent(eventId, {
        competitionsIds: [...evt.competitionsIds, competitionId]
      });
    }
    return true;
  }

  /** Unlinks a competition from the event. */
  public async unlinkCompetition(eventId: string, competitionId: string): Promise<boolean> {
    this.initStorage();
    const evt = this.inMemoryList.find(e => e.id === eventId);
    if (!evt) return false;
    await this.updateEvent(eventId, {
      competitionsIds: evt.competitionsIds.filter(c => c !== competitionId)
    });
    return true;
  }

  public async addDocument(
    eventId: string,
    doc: { name: string; kind: EventDocument['kind'] }
  ): Promise<boolean> {
    this.initStorage();
    const evt = this.inMemoryList.find(e => e.id === eventId);
    if (!evt) return false;
    const newDoc: EventDocument = {
      id: `doc_${Date.now().toString(36)}`,
      name: doc.name,
      kind: doc.kind,
      createdAt: new Date().toISOString(),
      createdBy: portalAuthService.getActiveSession()?.fullName || 'مدير الرابطة'
    };
    await this.updateEvent(eventId, { documents: [...evt.documents, newDoc] });
    return true;
  }

  public async removeDocument(eventId: string, docId: string): Promise<boolean> {
    this.initStorage();
    const evt = this.inMemoryList.find(e => e.id === eventId);
    if (!evt) return false;
    await this.updateEvent(eventId, { documents: evt.documents.filter(d => d.id !== docId) });
    return true;
  }

  public async addCommitteeMember(
    eventId: string,
    member: { fullName: string; role: string; phone?: string }
  ): Promise<boolean> {
    this.initStorage();
    const evt = this.inMemoryList.find(e => e.id === eventId);
    if (!evt) return false;
    const newMember: EventCommitteeMember = {
      id: `cm_${Date.now().toString(36)}`,
      ...member
    };
    await this.updateEvent(eventId, { committee: [...evt.committee, newMember] });
    return true;
  }

  public async removeCommitteeMember(eventId: string, memberId: string): Promise<boolean> {
    this.initStorage();
    const evt = this.inMemoryList.find(e => e.id === eventId);
    if (!evt) return false;
    await this.updateEvent(eventId, { committee: evt.committee.filter(m => m.id !== memberId) });
    return true;
  }

  /** Dashboard-facing aggregate stats for a league. */
  public getStats(leagueId?: string): {
    total: number;
    preparing: number;
    open: number;
    ongoing: number;
    completed: number;
    archived: number;
    documentsCount: number;
  } {
    const events = this.getEventsSync(leagueId);
    return {
      total: events.length,
      preparing: events.filter(e => e.status === 'preparing').length,
      open: events.filter(e => e.status === 'open').length,
      ongoing: events.filter(e => e.status === 'ongoing').length,
      completed: events.filter(e => e.status === 'completed').length,
      archived: events.filter(e => e.isArchived || e.status === 'archived').length,
      documentsCount: events.reduce((sum, e) => sum + e.documents.length, 0)
    };
  }

  /** Rebuilds competitionsIds for an event from a source list of competitions. */
  public syncCompetitionLinks(eventId: string, competitionIds: string[]): void {
    const evt = this.inMemoryList.find(e => e.id === eventId);
    if (!evt) return;
    evt.competitionsIds = [...competitionIds];
    evt.updatedAt = new Date().toISOString();
    this.persist();
  }
}

export const eventsService = new EventsService();
