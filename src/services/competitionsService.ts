/**
 * PHOTO FINISH PRO AI — National Athletics Competitions Service
 * Manages official national athletics competitions, multi-league calendar,
 * event schedules, certified results, and multi-criteria filters.
 *
 * Adheres to:
 * 1. World Athletics Rule 19 & Technical Regulations.
 * 2. Multi-tenant league associations (Saïda, Algiers, Oran, Sétif, Chlef, etc.).
 * 3. Offline-First with local storage persistence and Supabase synchronization.
 */

import { portalAuthService, RegisteredLeague } from './portalAuthService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { recycleBinService } from './recycleBinService';

export type CompetitionStatus = 'upcoming' | 'live' | 'completed';
export type CompetitionCategory = 'track_and_field' | 'cross_country' | 'road_race' | 'combined';

export interface ScheduleEvent {
  id: string;
  time: string;
  discipline: string;
  gender: 'M' | 'F' | 'MIXED';
  category: string; // أكابر / أواسط / أشبال
  round: string;    // تصفيات / نهائي مباشر
  status: 'scheduled' | 'running' | 'finished';
  disciplineId?: string;
  venue?: string;
  date?: string;
}

export interface CertifiedResultItem {
  rank: number;
  athleteName: string;
  bib: number;
  clubName: string;
  mark: string;
  wind?: string;
  discipline: string;
  reactionTime?: string;
  isRecord?: boolean;
  status?: string;
}

export interface CompetitionProgressIndicators {
  planning: 'not_started' | 'in_progress' | 'completed';
  planningLabel: string;
  events: 'not_configured' | 'in_progress' | 'completed';
  eventsLabel: string;
  eventsCount: number;
  registrations: 'closed' | 'open' | 'completed';
  registrationsLabel: string;
  athletesCount: number;
  judges: 'not_assigned' | 'partially_assigned' | 'fully_assigned';
  judgesLabel: string;
  assignedJudgesCount: number;
  refereeing: 'not_started' | 'in_progress' | 'completed';
  refereeingLabel: string;
  results: 'not_available' | 'under_review' | 'certified';
  resultsLabel: string;
  archived: boolean;
  archivedLabel: string;
  overallPercentage: number;
}

export interface NationalCompetition {
  id: string;
  name: string;
  date: string;
  endDate?: string;
  venue: string;
  city: string;
  wilayaCode: string;
  status: CompetitionStatus;
  leagueId: string;
  leagueName: string;
  leagueShort: string;
  competitionType: CompetitionCategory;
  eventsCount: number;
  athletesCount: number;
  description: string;
  schedule: ScheduleEvent[];
  resultsSummary: CertifiedResultItem[];
  isPublished: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_NATIONAL_COMPETITIONS: NationalCompetition[] = [
  {
    id: 'comp_lwas_01',
    name: 'البطولة الولائية الصيفية لألعاب القوى - سعيدة 2026',
    date: '2026-06-20',
    endDate: '2026-06-22',
    venue: 'مضمار 13 أفريل 1958، سعيدة',
    city: 'سعيدة',
    wilayaCode: '20',
    status: 'live',
    leagueId: 'lg_saida',
    leagueName: 'رابطة ألعاب القوى سعيدة (LWAS)',
    leagueShort: 'LWAS',
    competitionType: 'track_and_field',
    eventsCount: 24,
    athletesCount: 185,
    description: 'البطولة الولائية الرسمية الكبرى لتحديد أبطال ولاية سعيدة في مسابقات المضمار والميدان والتأهل للبطولات الوطنية.',
    schedule: [
      { id: 'ev_lwas_01', time: '09:00', discipline: '100م رجال', gender: 'M', category: 'أكابر', round: 'تصفيات نصف النهائي', status: 'finished' },
      { id: 'ev_lwas_02', time: '10:00', discipline: '800م إناث', gender: 'F', category: 'أواسط', round: 'النهائي الكبير', status: 'running' },
      { id: 'ev_lwas_03', time: '11:00', discipline: 'رمي الرمح رجال', gender: 'M', category: 'أكابر', round: 'النهائي المباشر', status: 'scheduled' },
      { id: 'ev_lwas_04', time: '15:30', discipline: '100م نهائي رجال (FAT)', gender: 'M', category: 'أكابر', round: 'النهائي الكبير', status: 'scheduled' },
      { id: 'ev_lwas_05', time: '16:45', discipline: 'الوثب الطويل رجال', gender: 'M', category: 'أواسط', round: 'النهائي المباشر', status: 'scheduled' },
      { id: 'ev_lwas_06', time: '18:00', discipline: '1500م إناث', gender: 'F', category: 'أشبال', round: 'النهائي المباشر', status: 'scheduled' }
    ],
    resultsSummary: [
      { rank: 1, athleteName: 'معتز برشم', bib: 104, clubName: 'نادي أولمبيك سعيدة (OSA)', mark: '10.22s', wind: '+1.2 m/s', discipline: '100م نهائي رجال', reactionTime: '0.142s', isRecord: true },
      { rank: 2, athleteName: 'عبد الله بن عودة', bib: 105, clubName: 'نادي أولمبيك سعيدة (OSA)', mark: '10.45s', wind: '+1.2 m/s', discipline: '100م نهائي رجال', reactionTime: '0.150s' },
      { rank: 3, athleteName: 'حمزة قاسم', bib: 108, clubName: 'أمل شباب سعيدة (MCS)', mark: '10.62s', wind: '+1.2 m/s', discipline: '100م نهائي رجال', reactionTime: '0.158s' }
    ],
    isPublished: true,
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-06-20T10:00:00Z'
  },
  {
    id: 'comp_nat_01',
    name: 'البطولة الوطنية لألعاب القوى للأكابر 2026',
    date: '2026-06-25',
    endDate: '2026-06-27',
    venue: 'مركب 5 جويلية 1962، الجزائر العاصمة',
    city: 'الجزائر العاصمة',
    wilayaCode: '16',
    status: 'live',
    leagueId: 'lg_faa',
    leagueName: 'الاتحاد الجزائري لألعاب القوى (FAA)',
    leagueShort: 'FAA',
    competitionType: 'track_and_field',
    eventsCount: 28,
    athletesCount: 420,
    description: 'المنافسة الوطنية الرسمية الكبرى لتحديد أبطال الجزائر المؤهلين للبطولات الإفريقية والدولية.',
    schedule: [
      { id: 'ev_01', time: '09:00', discipline: '100م رجال', gender: 'M', category: 'أكابر', round: 'تصفيات نصف النهائي', status: 'finished' },
      { id: 'ev_02', time: '10:30', discipline: '400م حواجز رجال', gender: 'M', category: 'أكابر', round: 'النهائي المباشر', status: 'running' },
      { id: 'ev_03', time: '11:15', discipline: '800م إناث', gender: 'F', category: 'أكابر', round: 'النهائي الكبير', status: 'scheduled' },
      { id: 'ev_04', time: '15:00', discipline: '100م نهائي رجال (FAT)', gender: 'M', category: 'أكابر', round: 'النهائي الكبير', status: 'scheduled' },
      { id: 'ev_05', time: '16:30', discipline: 'رمي الرمح رجال', gender: 'M', category: 'أكابر', round: 'النهائي المباشر', status: 'scheduled' },
      { id: 'ev_06', time: '17:45', discipline: 'الوثب الطويل إناث', gender: 'F', category: 'أكابر', round: 'النهائي المباشر', status: 'scheduled' }
    ],
    resultsSummary: [
      { rank: 1, athleteName: 'يوسف العبدلي', bib: 101, clubName: 'مولودية الجزائر (MCA)', mark: '09.96s', wind: '+1.2 m/s', discipline: '100م نهائي رجال', reactionTime: '0.138s', isRecord: true },
      { rank: 2, athleteName: 'سفيان البقالي', bib: 102, clubName: 'وفاق سطيف (ESS)', mark: '10.08s', wind: '+1.2 m/s', discipline: '100م نهائي رجال', reactionTime: '0.142s' },
      { rank: 3, athleteName: 'طارق بوكنزة', bib: 103, clubName: 'أولمبي الشلف (ASO)', mark: '10.14s', wind: '+1.2 m/s', discipline: '100م نهائي رجال', reactionTime: '0.155s' },
      { rank: 4, athleteName: 'معتز برشم', bib: 104, clubName: 'نادي أولمبيك سعيدة (OSA)', mark: '10.22s', wind: '+1.2 m/s', discipline: '100م نهائي رجال', reactionTime: '0.160s' }
    ],
    isPublished: true,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-06-25T11:00:00Z'
  },
  {
    id: 'comp_nat_02',
    name: 'البطولة الولائية للعدو الريفي - سعيدة 2026',
    date: '2026-07-12',
    endDate: '2026-07-12',
    venue: 'مضمار غابة العشية، سعيدة',
    city: 'سعيدة',
    wilayaCode: '20',
    status: 'upcoming',
    leagueId: 'lg_saida',
    leagueName: 'الرابطة الولائية لألعاب القوى - سعيدة',
    leagueShort: 'SAIDA',
    competitionType: 'cross_country',
    eventsCount: 8,
    athletesCount: 260,
    description: 'البطولة التأهيلية للعدو الريفي لولايات الغرب والهضاب العليا بإشراف رابطة سعيدة الولائية.',
    schedule: [
      { id: 'ev_21', time: '08:30', discipline: 'عدو ريفي 4 كم', gender: 'F', category: 'أشبال', round: 'نهائي مباشر', status: 'scheduled' },
      { id: 'ev_22', time: '09:30', discipline: 'عدو ريفي 6 كم', gender: 'M', category: 'أواسط', round: 'نهائي مباشر', status: 'scheduled' },
      { id: 'ev_23', time: '11:00', discipline: 'عدو ريفي 8 كم', gender: 'M', category: 'أكابر رجال', round: 'النهائي الرسمي', status: 'scheduled' }
    ],
    resultsSummary: [],
    isPublished: true,
    createdAt: '2026-02-01T12:00:00Z',
    updatedAt: '2026-02-01T12:00:00Z'
  },
  {
    id: 'comp_nat_03',
    name: 'تجمع وهران الدولي للسرعة والتتابع',
    date: '2026-08-05',
    endDate: '2026-08-06',
    venue: 'المركب الأولمبي ميلود هدفي، وهران',
    city: 'وهران',
    wilayaCode: '31',
    status: 'upcoming',
    leagueId: 'lg_oran',
    leagueName: 'الرابطة الولائية لألعاب القوى - وهران',
    leagueShort: 'ORAN',
    competitionType: 'track_and_field',
    eventsCount: 16,
    athletesCount: 310,
    description: 'تجمع وطني ودولي لسباقات السرعة 100م، 200م، 400م والتتابع 4x100م بدقة مسح شريطي معتمدة.',
    schedule: [
      { id: 'ev_31', time: '17:00', discipline: '200م رجال', gender: 'M', category: 'أكابر', round: 'تصفيات', status: 'scheduled' },
      { id: 'ev_32', time: '18:15', discipline: '200م إناث', gender: 'F', category: 'أكابر', round: 'تصفيات', status: 'scheduled' },
      { id: 'ev_33', time: '20:00', discipline: '4x100م تتابع أندية', gender: 'MIXED', category: 'مفتوح', round: 'النهائي المباشر', status: 'scheduled' }
    ],
    resultsSummary: [],
    isPublished: true,
    createdAt: '2026-02-15T14:00:00Z',
    updatedAt: '2026-02-15T14:00:00Z'
  },
  {
    id: 'comp_nat_04',
    name: 'ملتقى سطيف الوطني لألعاب القوى (المرحلة الأولى)',
    date: '2026-05-18',
    endDate: '2026-05-19',
    venue: 'مركب 8 ماي 1945، سطيف',
    city: 'سطيف',
    wilayaCode: '19',
    status: 'completed',
    leagueId: 'lg_setif',
    leagueName: 'الرابطة الولائية لألعاب القوى - سطيف',
    leagueShort: 'SETIF',
    competitionType: 'track_and_field',
    eventsCount: 22,
    athletesCount: 380,
    description: 'المرحلة الافتتاحية للموسم الرياضي للمسافات المتوسطة والطويلة وسباقات الحواجز.',
    schedule: [
      { id: 'ev_41', time: '09:00', discipline: '1500م رجال', gender: 'M', category: 'أكابر', round: 'نهائي مباشر', status: 'finished' },
      { id: 'ev_42', time: '10:30', discipline: '800م رجال', gender: 'M', category: 'أكابر', round: 'نهائي مباشر', status: 'finished' },
      { id: 'ev_43', time: '11:45', discipline: 'رمي القرص رجال', gender: 'M', category: 'أكابر', round: 'نهائي مباشر', status: 'finished' }
    ],
    resultsSummary: [
      { rank: 1, athleteName: 'جمال سجاتي', bib: 201, clubName: 'وفاق سطيف (ESS)', mark: '1:42.50', discipline: '800م رجال', reactionTime: '-', isRecord: true },
      { rank: 2, athleteName: 'سليمان مولى', bib: 202, clubName: 'مولودية الجزائر (MCA)', mark: '1:43.10', discipline: '800م رجال', reactionTime: '-' },
      { rank: 3, athleteName: 'ياسين حتحات', bib: 203, clubName: 'أولمبي الشلف (ASO)', mark: '1:44.20', discipline: '800م رجال', reactionTime: '-' }
    ],
    isPublished: true,
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-05-19T18:00:00Z'
  },
  {
    id: 'comp_nat_05',
    name: 'البطولة الجهوية للمسافات نصف الطويلة - الشلف',
    date: '2026-09-10',
    endDate: '2026-09-11',
    venue: 'مضمار الشهيد محمد بومزراق، الشلف',
    city: 'الشلف',
    wilayaCode: '02',
    status: 'upcoming',
    leagueId: 'lg_chlef',
    leagueName: 'الرابطة الولائية لألعاب القوى - الشلف',
    leagueShort: 'CHLEF',
    competitionType: 'track_and_field',
    eventsCount: 14,
    athletesCount: 195,
    description: 'بطولة تمهيدية لسباقات 800م، 1500م و3000م موانع لفرق الغرب والوسط.',
    schedule: [
      { id: 'ev_51', time: '08:30', discipline: '3000م موانع رجال', gender: 'M', category: 'أكابر', round: 'نهائي مباشر', status: 'scheduled' },
      { id: 'ev_52', time: '10:00', discipline: '1500م إناث', gender: 'F', category: 'أكابر', round: 'نهائي مباشر', status: 'scheduled' }
    ],
    resultsSummary: [],
    isPublished: true,
    createdAt: '2026-02-20T09:00:00Z',
    updatedAt: '2026-02-20T09:00:00Z'
  }
];

const STORAGE_KEY = 'pfp_national_competitions_v2';
const ACTIVE_COMPETITION_KEY = 'pfp_active_competition_id_v2';
const ACTIVE_COMP_BY_LEAGUE_KEY = 'pfp_active_competition_by_league_v1';

export class CompetitionsService {
  private inMemoryList: NationalCompetition[] = [];
  private activeCompId: string = 'comp_lwas_01';
  private activeCompByLeague: Record<string, string> = {
    lg_saida: 'comp_lwas_01',
    lg_faa: 'comp_faa_01'
  };
  private activeListeners: ((comp: NationalCompetition | null) => void)[] = [];
  private compListeners: ((comps: NationalCompetition[]) => void)[] = [];

  constructor() {
    this.initStorage();
    this.initActiveCompetition();
  }

  private initActiveCompetition(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(ACTIVE_COMPETITION_KEY);
        if (stored) {
          this.activeCompId = stored;
        } else {
          localStorage.setItem(ACTIVE_COMPETITION_KEY, this.activeCompId);
        }
        const storedByLeague = localStorage.getItem(ACTIVE_COMP_BY_LEAGUE_KEY);
        if (storedByLeague) {
          this.activeCompByLeague = { ...this.activeCompByLeague, ...JSON.parse(storedByLeague) };
        }
      } catch {}
    }
  }

  public getActiveCompetitionId(leagueId?: string): string {
    if (leagueId && this.activeCompByLeague[leagueId]) {
      return this.activeCompByLeague[leagueId];
    }
    return this.activeCompId;
  }

  public async getActiveCompetition(leagueId?: string): Promise<NationalCompetition | null> {
    const list = await this.getCompetitions(leagueId);
    const targetCompId = (leagueId && this.activeCompByLeague[leagueId]) || this.activeCompId;
    const found = list.find(c => c.id === targetCompId);
    if (found) return found;
    return list[0] || null;
  }

  public setActiveCompetitionId(id: string, leagueId?: string): boolean {
    const exists = this.inMemoryList.some(c => c.id === id);
    const matchedComp = this.inMemoryList.find(c => c.id === id);
    const targetLeagueId = leagueId || matchedComp?.leagueId || 'lg_saida';

    this.activeCompId = id;
    this.activeCompByLeague[targetLeagueId] = id;

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_COMPETITION_KEY, id);
        localStorage.setItem(ACTIVE_COMP_BY_LEAGUE_KEY, JSON.stringify(this.activeCompByLeague));
      } catch {}
    }

    if (isSupabaseConfigured()) {
      (supabase.from('active_competitions') as any).upsert({
        league_id: targetLeagueId,
        competition_id: id,
        updated_at: new Date().toISOString()
      }).catch(() => {});
    }

    this.notifyActiveChanged(targetLeagueId);
    return exists;
  }

  public async setActiveCompetition(leagueId: string, competitionId: string): Promise<boolean> {
    return this.setActiveCompetitionId(competitionId, leagueId);
  }

  public async getCompetitionById(competitionId: string): Promise<NationalCompetition | null> {
    const list = await this.getCompetitions();
    return list.find(c => c.id === competitionId) || null;
  }

  public async updateCompetition(id: string, data: Partial<NationalCompetition>): Promise<NationalCompetition | null> {
    const comp = await this.getCompetitionById(id);
    if (!comp) return null;
    const updated: NationalCompetition = { ...comp, ...data, updatedAt: new Date().toISOString() };
    return this.saveCompetition(updated);
  }

  public async archiveCompetition(id: string): Promise<boolean> {
    const comp = await this.getCompetitionById(id);
    if (!comp) return false;
    await this.saveCompetition({
      ...comp,
      isArchived: true,
      status: 'completed',
      updatedAt: new Date().toISOString()
    });
    return true;
  }

  public async getCompetitionEvents(competitionId: string): Promise<ScheduleEvent[]> {
    const comp = await this.getCompetitionById(competitionId);
    return comp?.schedule || [];
  }

  public async getJudgeAssignments(competitionId: string): Promise<any[]> {
    try {
      const { judgesAssignmentService } = await import('./judgesAssignmentService');
      return judgesAssignmentService.getAssignments(competitionId);
    } catch {
      return [];
    }
  }

  public async assignJudge(data: any): Promise<any> {
    try {
      const { judgesAssignmentService } = await import('./judgesAssignmentService');
      return judgesAssignmentService.assignJudge(data);
    } catch (e: any) {
      throw new Error(`Failed to assign judge: ${e.message}`);
    }
  }

  public async getCompetitionRegistrations(competitionId: string): Promise<any[]> {
    try {
      const { competitionEntriesService } = await import('./competitionEntriesService');
      return competitionEntriesService.getEntries(competitionId);
    } catch {
      return [];
    }
  }

  public async getCompetitionResults(competitionId: string): Promise<any[]> {
    try {
      const { competitionsBureauService } = await import('./competitionsBureauService');
      return competitionsBureauService.getCompetitionDisciplinesWithOperations(competitionId);
    } catch {
      return [];
    }
  }

  public onActiveCompetitionChanged(listener: (comp: NationalCompetition | null) => void): () => void {
    this.activeListeners.push(listener);
    return () => {
      this.activeListeners = this.activeListeners.filter(l => l !== listener);
    };
  }

  public onCompetitionsChanged(listener: (comps: NationalCompetition[]) => void): () => void {
    this.compListeners.push(listener);
    return () => {
      this.compListeners = this.compListeners.filter(l => l !== listener);
    };
  }

  private async notifyActiveChanged(leagueId?: string): Promise<void> {
    const active = await this.getActiveCompetition(leagueId);
    this.activeListeners.forEach(l => l(active));
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('pfp:active-competition-changed', { detail: active }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('pfp_active_competition_channel');
          bc.postMessage({ type: 'ACTIVE_COMPETITION_CHANGED', active, leagueId });
          bc.close();
        }
      } catch {}
    }
  }

  private notifyCompetitionsChanged(): void {
    const copy = [...this.inMemoryList];
    this.compListeners.forEach(l => l(copy));
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('pfp:competitions-changed', { detail: copy }));
      } catch {}
    }
  }

  private initStorage(): void {
    if (this.inMemoryList.length > 0) {
      return;
    }
    if (typeof localStorage === 'undefined') {
      this.inMemoryList = [...DEFAULT_NATIONAL_COMPETITIONS];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.inMemoryList = JSON.parse(stored);
      } else {
        this.inMemoryList = [...DEFAULT_NATIONAL_COMPETITIONS];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NATIONAL_COMPETITIONS));
      }
    } catch {
      this.inMemoryList = [...DEFAULT_NATIONAL_COMPETITIONS];
    }
  }

  /**
   * Fetch all national competitions, merging local additions and remote Supabase
   * Supports filtering by leagueId for strict multi-tenant isolation.
   */
  public async getCompetitions(leagueId?: string): Promise<NationalCompetition[]> {
    this.initStorage();

    // 1. Ingest competitions created in planning bureau (pfp_comp_file_*)
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('pfp_comp_file_') || k.startsWith('pfp_competition_file_v2_') || k.startsWith('pfp_competition_file_'))) {
            const rawFile = localStorage.getItem(k);
            if (rawFile) {
              const file = JSON.parse(rawFile);
              if (file?.metadata?.id && !file.metadata.id.startsWith('new_')) {
                const existingIdx = this.inMemoryList.findIndex(c => c.id === file.metadata.id);
                const mappedEvents: ScheduleEvent[] = (file.schedule?.allDisciplines || []).map((item: any, idx: number) => ({
                  id: item.id || `ev_${file.metadata.id}_${idx}`,
                  time: item.startTime || '09:00',
                  discipline: item.disciplineNameAr,
                  disciplineId: item.disciplineId,
                  gender: item.gender || 'M',
                  category: item.categoryNameAr || item.categoryCode || 'أكابر',
                  round: item.round || 'نهائي مباشر',
                  status: 'scheduled',
                  venue: file.metadata.venue,
                  date: file.metadata.startDate
                }));

                const compRecord: NationalCompetition = {
                  id: file.metadata.id,
                  name: file.metadata.name,
                  date: file.metadata.startDate,
                  endDate: file.metadata.endDate || file.metadata.startDate,
                  venue: file.metadata.venue,
                  city: file.metadata.venue?.includes('سعيدة') ? 'سعيدة' : 'سعيدة',
                  wilayaCode: '20',
                  status: existingIdx >= 0 ? this.inMemoryList[existingIdx].status : 'upcoming',
                  leagueId: file.metadata.organizingLeagueId || 'lg_saida',
                  leagueName: file.metadata.organizingLeagueName || 'رابطة ألعاب القوى سعيدة (LWAS)',
                  leagueShort: 'LWAS',
                  competitionType: 'track_and_field',
                  eventsCount: file.schedule?.totalEventsCount || mappedEvents.length,
                  athletesCount: existingIdx >= 0 ? this.inMemoryList[existingIdx].athletesCount : 0,
                  description: `منافسة معتمدة من مكتب التخطيط والبرمجة (${mappedEvents.length} مسابقة مبرمجة).`,
                  schedule: mappedEvents.length > 0 ? mappedEvents : (existingIdx >= 0 ? this.inMemoryList[existingIdx].schedule : []),
                  resultsSummary: existingIdx >= 0 ? this.inMemoryList[existingIdx].resultsSummary : [],
                  isPublished: true,
                  createdAt: existingIdx >= 0 ? this.inMemoryList[existingIdx].createdAt : new Date().toISOString(),
                  updatedAt: file.metadata.updatedAt || new Date().toISOString()
                };

                if (existingIdx >= 0) {
                  this.inMemoryList[existingIdx] = { ...this.inMemoryList[existingIdx], ...compRecord };
                } else {
                  this.inMemoryList.unshift(compRecord);
                }
              }
            }
          }
        }
      }
    } catch {}

    // 2. Ingest competitions created by league executives in local storage
    try {
      if (typeof localStorage !== 'undefined') {
        const leagueSaved = localStorage.getItem('pfp_league_competitions_saida');
        if (leagueSaved) {
          const parsed = JSON.parse(leagueSaved);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const exists = this.inMemoryList.some(c => c.id === item.id);
              if (!exists) {
                this.inMemoryList.unshift({
                  id: item.id || `comp_${Date.now()}`,
                  name: item.name || 'منافسة ألعاب قوى',
                  date: item.date || new Date().toISOString().split('T')[0],
                  venue: item.venue || 'المضمار الولائي بسعيدة',
                  city: 'سعيدة',
                  wilayaCode: '20',
                  status: 'upcoming',
                  leagueId: 'lg_saida',
                  leagueName: 'الرابطة الولائية لألعاب القوى - سعيدة',
                  leagueShort: 'SAIDA',
                  competitionType: (item.type as any) || 'track_and_field',
                  eventsCount: 6,
                  athletesCount: 45,
                  description: 'منافسة مبرمجة ومسجلة من طرف حساب الرابطة الولائية.',
                  schedule: [],
                  resultsSummary: [],
                  isPublished: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              }
            }
          }
        }
      }
    } catch {}

    // 3. Ingest remote Supabase if available
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase.from('competitions') as any)
          .select('*')
          .eq('is_published', true)
          .order('start_date', { ascending: false });

        if (!error && data && (data as any[]).length > 0) {
          for (const row of (data as any[])) {
            const exists = this.inMemoryList.some(c => c.id === row.id);
            if (!exists) {
              this.inMemoryList.push({
                id: row.id,
                name: row.name,
                date: row.start_date,
                endDate: row.end_date || undefined,
                venue: row.venue,
                city: row.city || 'الجزائر',
                wilayaCode: '16',
                status: (row.status as any) || 'upcoming',
                leagueId: row.league_id || 'lg_faa',
                leagueName: 'الاتحاد الجزائري لألعاب القوى',
                leagueShort: 'FAA',
                competitionType: (row.competition_type as any) || 'track_and_field',
                eventsCount: 12,
                athletesCount: 150,
                description: 'منافسة رسمية مسجلة في السحابة الفيدرالية.',
                schedule: [],
                resultsSummary: [],
                isPublished: true,
                createdAt: row.created_at,
                updatedAt: row.updated_at
              });
            }
          }
        }
      } catch {}
    }

    // 4. Strict League Multi-Tenancy Filter
    if (leagueId && leagueId !== 'all') {
      return this.inMemoryList.filter(
        c => c.leagueId === leagueId || c.leagueShort === leagueId || c.leagueShort?.toLowerCase() === leagueId.toLowerCase()
      );
    }

    return [...this.inMemoryList];
  }

  /**
   * Strict League Scoped Query: Retrieves only competitions belonging to the active league
   */
  public async getCompetitionsByLeague(leagueId: string): Promise<NationalCompetition[]> {
    return this.getCompetitions(leagueId);
  }

  /**
   * Filter competitions by league, status, search query, and sort
   */
  public async filterCompetitions(options: {
    leagueId?: string;
    status?: string;
    type?: string;
    query?: string;
    sortBy?: 'date_desc' | 'date_asc' | 'name_asc';
  }): Promise<NationalCompetition[]> {
    const list = await this.getCompetitions();

    return list.filter(item => {
      // 1. League Filter
      if (options.leagueId && options.leagueId !== 'all') {
        if (item.leagueId !== options.leagueId && item.leagueShort !== options.leagueId) {
          return false;
        }
      }

      // 2. Status Filter
      if (options.status && options.status !== 'all') {
        if (item.status !== options.status) {
          return false;
        }
      }

      // 3. Discipline Type Filter
      if (options.type && options.type !== 'all') {
        if (item.competitionType !== options.type) {
          return false;
        }
      }

      // 4. Text Search
      if (options.query && options.query.trim()) {
        const q = options.query.trim().toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesVenue = item.venue.toLowerCase().includes(q);
        const matchesCity = item.city.toLowerCase().includes(q);
        const matchesLeague = item.leagueName.toLowerCase().includes(q);
        if (!matchesName && !matchesVenue && !matchesCity && !matchesLeague) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (options.sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (options.sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'ar');
      }
      // Default: date_desc (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }


  /**
   * Save or update a competition
   */
  /**
   * Update competition status (e.g. 'completed', 'live', 'upcoming')
   */
  public async updateCompetitionStatus(id: string, status: CompetitionStatus): Promise<boolean> {
    const comp = await this.getCompetitionById(id);
    if (!comp) return false;
    comp.status = status;
    await this.saveCompetition(comp);
    return true;
  }

  public async saveCompetition(comp: NationalCompetition): Promise<NationalCompetition> {
    this.initStorage();
    const index = this.inMemoryList.findIndex(c => c.id === comp.id);
    const updatedRecord: NationalCompetition = {
      ...comp,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      this.inMemoryList[index] = updatedRecord;
    } else {
      this.inMemoryList.unshift(updatedRecord);
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryList));
        
        // Also keep league storage in sync for Saida LWAS
        if (comp.leagueId === 'lg_saida' || comp.leagueShort === 'LWAS' || comp.leagueShort === 'SAIDA') {
          const saidaComps = this.inMemoryList.filter(c => c.leagueId === 'lg_saida' || c.leagueShort === 'LWAS' || c.leagueShort === 'SAIDA');
          localStorage.setItem('pfp_league_competitions_saida', JSON.stringify(saidaComps));
        }
      } catch {}
    }

    // Broadcast change to all active components and tabs
    this.notifyCompetitionsChanged();
    if (comp.id === this.activeCompId) {
      this.notifyActiveChanged();
    }

    return updatedRecord;
  }

  /**
   * Creates a new official competition with a stable unique identifier
   */
  public async createCompetition(data: Partial<NationalCompetition>): Promise<NationalCompetition> {
    const session = portalAuthService.getActiveSession();
    const activeLeague = portalAuthService.getAllLeagues()[0];
    const leagueId = data.leagueId || session?.leagueId || activeLeague?.id || 'lg_saida';
    const leagueName = data.leagueName || session?.leagueName || activeLeague?.name || 'رابطة ألعاب القوى سعيدة (LWAS)';
    const leagueShort = data.leagueShort || session?.leagueShort || activeLeague?.shortName || 'LWAS';

    const id = data.id || `comp_${leagueShort.toLowerCase()}_${Date.now()}`;
    const newComp: NationalCompetition = {
      id,
      name: data.name || 'منافسة ألعاب قوى جديدة',
      date: data.date || new Date().toISOString().split('T')[0],
      endDate: data.endDate || data.date || new Date().toISOString().split('T')[0],
      venue: data.venue || 'المضمار الولائي 13 أفريل 1958، سعيدة',
      city: data.city || 'سعيدة',
      wilayaCode: data.wilayaCode || '20',
      status: data.status || 'upcoming',
      leagueId,
      leagueName,
      leagueShort,
      competitionType: data.competitionType || 'track_and_field',
      eventsCount: data.eventsCount || (data.schedule?.length || 0),
      athletesCount: data.athletesCount || 0,
      description: data.description || 'منافسة رياضية مبرمجة ومسجلة في السجل المركزي الموحد للرابطة.',
      schedule: data.schedule || [],
      resultsSummary: data.resultsSummary || [],
      isPublished: data.isPublished !== undefined ? data.isPublished : true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveCompetition(newComp);
    this.setActiveCompetitionId(id);
    return newComp;
  }

  /**
   * Safely deletes a competition only if it contains no certified results or active assignments
   */
  /**
   * Safely deletes a competition, archiving or moving it to the Centralized Recycle Bin
   */
  public async deleteCompetition(
    id: string, 
    options?: { reason?: string; deletedBy?: string; force?: boolean; permanent?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    this.initStorage();
    const comp = this.inMemoryList.find(c => c.id === id);
    if (!comp) return { success: false, error: 'المنافسة غير موجودة' };

    // Prevent deletion if competition has certified results without explicit force override
    if (comp.resultsSummary && comp.resultsSummary.length > 0 && !options?.force) {
      return {
        success: false,
        error: 'لا يمكن حذف المنافسة لوجود نتائج رسمية مصادقة مسجلة بها. يمكنك استخدام خيار الأرشفة أو الحذف الاستثنائي مع توثيق السبب.'
      };
    }

    // Check if judges assignments exist
    if (typeof localStorage !== 'undefined' && !options?.force) {
      try {
        const rawAsg = localStorage.getItem('pfp_judge_assignments_v2') || localStorage.getItem('pfp_judges_assignments_v1');
        if (rawAsg) {
          const list: any[] = JSON.parse(rawAsg);
          if (Array.isArray(list) && list.some(a => a.competitionId === id && a.status === 'active')) {
            return {
              success: false,
              error: 'لا يمكن حذف المنافسة لوجود تعيينات حكام نشطة مرتبطة بها. يرجى إلغاء التعيينات أولاً أو أرشفة المنافسة.'
            };
          }
        }
      } catch {}
    }

    // Unless explicitly requested as permanent hard delete, move snapshot to Centralized Recycle Bin
    if (!options?.permanent) {
      try {
        await recycleBinService.moveToRecycleBin({
          leagueId: comp.leagueId || 'lg_saida',
          entityType: 'competition',
          entityId: comp.id,
          entityName: comp.name,
          sourceModule: 'competitions',
          payload: { ...comp },
          deletedBy: options?.deletedBy || portalAuthService.getActiveSession()?.fullName || 'مدير الرابطة',
          reason: options?.reason || 'حذف ونقل إلى سلة المحذوفات'
        });
      } catch (err) {
        console.warn('[CompetitionsService] Error archiving to recycle bin:', err);
      }
    }

    this.inMemoryList = this.inMemoryList.filter(c => c.id !== id);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryList));
        localStorage.removeItem(`pfp_comp_file_${id}`);
        localStorage.removeItem(`pfp_competition_planning_v2_${id}`);
      } catch {}
    }

    // Safe Active Competition switch
    if (this.activeCompId === id) {
      const remainingSameLeague = this.inMemoryList.filter(c => c.leagueId === comp.leagueId && c.id !== id);
      if (remainingSameLeague.length > 0) {
        this.setActiveCompetitionId(remainingSameLeague[0].id);
      } else if (this.inMemoryList.length > 0) {
        this.setActiveCompetitionId(this.inMemoryList[0].id);
      } else {
        this.activeCompId = '';
        if (typeof localStorage !== 'undefined') {
          try { localStorage.removeItem(ACTIVE_COMPETITION_KEY); } catch {}
        }
        this.notifyActiveChanged();
      }
    }

    this.notifyCompetitionsChanged();
    return { success: true };
  }

  /**
   * Restores a competition previously moved to the recycle bin
   */
  public async restoreCompetition(compData: NationalCompetition): Promise<NationalCompetition> {
    this.initStorage();
    const existingIndex = this.inMemoryList.findIndex(c => c.id === compData.id);
    if (existingIndex >= 0) {
      this.inMemoryList[existingIndex] = { ...compData, updatedAt: new Date().toISOString() };
    } else {
      this.inMemoryList.unshift({ ...compData, updatedAt: new Date().toISOString() });
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryList));
      } catch {}
    }

    this.notifyCompetitionsChanged();
    return compData;
  }

  /**
   * Bulk deletes multiple competitions
   */
  public async bulkDeleteCompetitions(
    ids: string[], 
    options?: { reason?: string; deletedBy?: string; force?: boolean }
  ): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
    let deletedCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const res = await this.deleteCompetition(id, options);
      if (res.success) {
        deletedCount++;
      } else if (res.error) {
        errors.push(`${id}: ${res.error}`);
      }
    }

    return {
      success: deletedCount > 0,
      deletedCount,
      errors
    };
  }


  /**
   * Computes dynamic progress indicators for a competition based on real underlying data
   */
  public computeCompetitionProgress(comp: NationalCompetition): CompetitionProgressIndicators {
    // 1. Planning
    const hasEvents = comp.schedule && comp.schedule.length > 0;
    const hasVenueAndDate = Boolean(comp.venue && comp.date);
    let planning: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    let planningLabel = 'لم يبدأ التخطيط';
    let pScore = 0;

    if (hasEvents && hasVenueAndDate) {
      planning = 'completed';
      planningLabel = 'مكتمل ومعتمد';
      pScore = 100;
    } else if (comp.name && (comp.date || comp.venue)) {
      planning = 'in_progress';
      planningLabel = 'قيد الإعداد';
      pScore = 50;
    }

    // 2. Events & Disciplines
    const eventsCount = comp.schedule?.length || comp.eventsCount || 0;
    let events: 'not_configured' | 'in_progress' | 'completed' = 'not_configured';
    let eventsLabel = 'غير مهيأة';
    let eScore = 0;

    if (eventsCount >= 6) {
      events = 'completed';
      eventsLabel = `مكتملة (${eventsCount} مسابقة)`;
      eScore = 100;
    } else if (eventsCount > 0) {
      events = 'in_progress';
      eventsLabel = `قيد البرمجة (${eventsCount} مسابقات)`;
      eScore = 50;
    }

    // 3. Registrations & Athletes
    const athletesCount = comp.athletesCount || 0;
    let registrations: 'closed' | 'open' | 'completed' = 'closed';
    let registrationsLabel = 'غير مفتوحة';
    let rScore = 0;

    if (comp.status === 'completed') {
      registrations = 'completed';
      registrationsLabel = `مغلقة ومصادقة (${athletesCount} عداء)`;
      rScore = 100;
    } else if (comp.status === 'live' || athletesCount > 0) {
      registrations = 'open';
      registrationsLabel = `مفتوحة (${athletesCount} عداء)`;
      rScore = 75;
    }

    // 4. Judges Assignments
    let assignedJudgesCount = 0;
    if (typeof localStorage !== 'undefined') {
      try {
        const rawAsg = localStorage.getItem('pfp_judge_assignments_v2') || localStorage.getItem('pfp_judges_assignments_v1');
        if (rawAsg) {
          const list: any[] = JSON.parse(rawAsg);
          if (Array.isArray(list)) {
            assignedJudgesCount = list.filter(a => a.competitionId === comp.id && a.status === 'active').length;
          }
        }
      } catch {}
    }

    let judges: 'not_assigned' | 'partially_assigned' | 'fully_assigned' = 'not_assigned';
    let judgesLabel = 'لم يتم التعيين';
    let jScore = 0;

    if (assignedJudgesCount >= Math.max(1, eventsCount)) {
      judges = 'fully_assigned';
      judgesLabel = `تعيين مكتمل (${assignedJudgesCount} حكام)`;
      jScore = 100;
    } else if (assignedJudgesCount > 0) {
      judges = 'partially_assigned';
      judgesLabel = `تعيين جزئي (${assignedJudgesCount} حكام)`;
      jScore = 50;
    }

    // 5. Refereeing & Live Field Action
    let refereeing: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    let refereeingLabel = 'لم يبدأ';
    let refScore = 0;

    if (comp.status === 'completed') {
      refereeing = 'completed';
      refereeingLabel = 'مكتمل ومصادق';
      refScore = 100;
    } else if (comp.status === 'live' || comp.schedule?.some(s => s.status === 'running' || s.status === 'finished')) {
      refereeing = 'in_progress';
      refereeingLabel = 'جارٍ بالميدان 🔴';
      refScore = 60;
    }

    // 6. Certified Results
    const resultsCount = comp.resultsSummary?.length || 0;
    let results: 'not_available' | 'under_review' | 'certified' = 'not_available';
    let resultsLabel = 'غير متوفرة';
    let resScore = 0;

    if (resultsCount > 0 && comp.status === 'completed') {
      results = 'certified';
      resultsLabel = `معتمدة (${resultsCount} نتيجة)`;
      resScore = 100;
    } else if (resultsCount > 0 || comp.status === 'live') {
      results = 'under_review';
      resultsLabel = resultsCount > 0 ? `قيد المراجعة (${resultsCount})` : 'قيد التسجيل';
      resScore = 50;
    }

    // 7. Archive Status
    const isArchived = Boolean(comp.isArchived || comp.status === 'completed');
    const archivedLabel = isArchived ? 'مؤرشفة' : 'نشطة وميدانية';

    const overallPercentage = Math.round((pScore + eScore + rScore + jScore + refScore + resScore) / 6);

    return {
      planning,
      planningLabel,
      events,
      eventsLabel,
      eventsCount,
      registrations,
      registrationsLabel,
      athletesCount,
      judges,
      judgesLabel,
      assignedJudgesCount,
      refereeing,
      refereeingLabel,
      results,
      resultsLabel,
      archived: isArchived,
      archivedLabel,
      overallPercentage
    };
  }

  /**
   * Fetch all registered leagues for the dropdown filter
   */
  public getAvailableLeagues(): RegisteredLeague[] {
    return portalAuthService.getAllLeagues();
  }
}

export const competitionsService = new CompetitionsService();
