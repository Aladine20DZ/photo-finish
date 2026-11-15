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

export class CompetitionsService {
  private inMemoryList: NationalCompetition[] = [];
  private activeCompId: string = 'comp_lwas_01';
  private activeListeners: ((comp: NationalCompetition | null) => void)[] = [];

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
      } catch {}
    }
  }

  public getActiveCompetitionId(): string {
    return this.activeCompId;
  }

  public async getActiveCompetition(): Promise<NationalCompetition | null> {
    const list = await this.getCompetitions();
    const found = list.find(c => c.id === this.activeCompId);
    if (found) return found;
    return list[0] || null;
  }

  public setActiveCompetitionId(id: string): boolean {
    const exists = this.inMemoryList.some(c => c.id === id);
    this.activeCompId = id;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_COMPETITION_KEY, id);
      } catch {}
    }
    this.notifyActiveChanged();
    return exists;
  }

  public onActiveCompetitionChanged(listener: (comp: NationalCompetition | null) => void): () => void {
    this.activeListeners.push(listener);
    return () => {
      this.activeListeners = this.activeListeners.filter(l => l !== listener);
    };
  }

  private async notifyActiveChanged(): Promise<void> {
    const active = await this.getActiveCompetition();
    this.activeListeners.forEach(l => l(active));
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('pfp:active-competition-changed', { detail: active }));
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
   */
  public async getCompetitions(): Promise<NationalCompetition[]> {
    this.initStorage();

    // Ingest competitions created by league executives in local storage
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

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase.from('competitions') as any)
          .select('*')
          .eq('is_published', true)
          .order('start_date', { ascending: false });

        if (!error && data && (data as any[]).length > 0) {
          // Merge remote items
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

    return [...this.inMemoryList];
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
   * Retrieve a single competition by its ID
   */
  public async getCompetitionById(id: string): Promise<NationalCompetition | null> {
    const list = await this.getCompetitions();
    return list.find(c => c.id === id) || null;
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
    if (index >= 0) {
      this.inMemoryList[index] = { ...comp, updatedAt: new Date().toISOString() };
    } else {
      this.inMemoryList.unshift(comp);
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryList));
      } catch {}
    }

    return comp;
  }

  /**
   * Fetch all registered leagues for the dropdown filter
   */
  public getAvailableLeagues(): RegisteredLeague[] {
    return portalAuthService.getAllLeagues();
  }
}

export const competitionsService = new CompetitionsService();
