/**
 * PHOTO FINISH PRO AI — Competition Entries & Results Service
 * Manages official rosters before competition (empty marks, club, bib, category)
 * and certified results after events (track FAT times, field attempts O/X/XO, PB, SB, DNS, DNF, DQ, NM).
 * Strictly binds to master athlete profile without duplicating runner data.
 */

import { NationalCompetition } from './competitionsService';
import * as XLSX from 'xlsx';

export type EntryResultStatus = 'entered' | 'finished' | 'dns' | 'dnf' | 'dq' | 'nm';

export interface AthleteCompetitionEntry {
  id: string;
  competitionId: string;
  disciplineId: string;
  disciplineNameAr: string;
  athleteId: string;
  bib: number;
  athleteName: string;
  birthDate: string;
  category: string; // أكابر / أواسط / أشبال / أصاغر / open
  gender: 'M' | 'F';
  clubId: string;
  clubName: string;
  clubCode?: string;
  
  // Pre-competition: mark is undefined/empty
  // Post-competition:
  mark?: string; // e.g. "10.05s" or "8.15m"
  numericValue?: number;
  rank?: number;
  status: EntryResultStatus;
  isPersonalBest?: boolean;
  isSeasonBest?: boolean;
  lane?: number;
  attempts?: string[]; // for field events: e.g. ["7.95m", "X", "8.12m", "O", "XO"]
  bestAttempt?: string;
  wind?: string;
  recordedByJudgeName?: string;
  recordedAt?: string;
  notes?: string;
}

const DEFAULT_ENTRIES: AthleteCompetitionEntry[] = [
  // ═══ منافسات رابطة ألعاب القوى سعيدة (LWAS Track & Field 2026) ═══
  {
    id: 'ent_lwas_01',
    competitionId: 'comp_lwas_01',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_lwas_01',
    bib: 104,
    athleteName: 'معتز برشم',
    birthDate: '2000-03-12',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_osa',
    clubName: 'نادي أولمبيك سعيدة (OSA)',
    clubCode: 'OSA',
    mark: '10.22s',
    numericValue: 10.22,
    rank: 1,
    status: 'finished',
    isPersonalBest: true,
    lane: 4,
    wind: '+1.2 m/s',
    recordedByJudgeName: 'سفيان بن عيسى (رئيس القضاة)',
    recordedAt: '2026-06-20T15:35:00Z',
    notes: 'رقم قياسي ولائي جديد معتمد لولاية سعيدة TR31'
  },
  {
    id: 'ent_lwas_02',
    competitionId: 'comp_lwas_01',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_lwas_02',
    bib: 105,
    athleteName: 'عبد الله بن عودة',
    birthDate: '2002-07-19',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_osa',
    clubName: 'نادي أولمبيك سعيدة (OSA)',
    clubCode: 'OSA',
    mark: '10.45s',
    numericValue: 10.45,
    rank: 2,
    status: 'finished',
    isSeasonBest: true,
    lane: 3,
    wind: '+1.2 m/s',
    recordedByJudgeName: 'سفيان بن عيسى (رئيس القضاة)',
    recordedAt: '2026-06-20T15:35:00Z'
  },
  {
    id: 'ent_lwas_03',
    competitionId: 'comp_lwas_01',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_lwas_03',
    bib: 108,
    athleteName: 'حمزة قاسم',
    birthDate: '2004-11-05',
    category: 'أواسط',
    gender: 'M',
    clubId: 'club_mcs',
    clubName: 'أمل شباب سعيدة (MCS)',
    clubCode: 'MCS',
    mark: '10.62s',
    numericValue: 10.62,
    rank: 3,
    status: 'finished',
    lane: 5,
    wind: '+1.2 m/s',
    recordedByJudgeName: 'سفيان بن عيسى (رئيس القضاة)',
    recordedAt: '2026-06-20T15:35:00Z'
  },
  {
    id: 'ent_lwas_04',
    competitionId: 'comp_lwas_01',
    disciplineId: 'disc_800m',
    disciplineNameAr: '800 متر',
    athleteId: 'ath_lwas_04',
    bib: 201,
    athleteName: 'نور الهدى قاضي',
    birthDate: '2005-02-14',
    category: 'أواسط',
    gender: 'F',
    clubId: 'club_osa',
    clubName: 'نادي أولمبيك سعيدة (OSA)',
    clubCode: 'OSA',
    mark: '2:04.15',
    numericValue: 124.15,
    rank: 1,
    status: 'finished',
    isPersonalBest: true,
    lane: 2,
    recordedByJudgeName: 'سفيان بن عيسى (رئيس القضاة)',
    recordedAt: '2026-06-20T10:15:00Z',
    notes: 'رقم قياسي ولائي أواسط إناث'
  },
  {
    id: 'ent_lwas_05',
    competitionId: 'comp_lwas_01',
    disciplineId: 'disc_javelin',
    disciplineNameAr: 'رمي الرمح',
    athleteId: 'ath_lwas_05',
    bib: 301,
    athleteName: 'ياسين زروق',
    birthDate: '2001-09-22',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_mcs',
    clubName: 'أمل شباب سعيدة (MCS)',
    clubCode: 'MCS',
    mark: '68.40m',
    numericValue: 68.40,
    rank: 1,
    status: 'finished',
    isPersonalBest: true,
    attempts: ['64.20m', '66.10m', 'X', '68.40m', '67.05m', 'X'],
    bestAttempt: '68.40m',
    recordedByJudgeName: 'قاضي الميدان (سعيدة)',
    recordedAt: '2026-06-20T11:45:00Z'
  },
  {
    id: 'ent_lwas_06',
    competitionId: 'comp_lwas_01',
    disciplineId: 'disc_long_jump',
    disciplineNameAr: 'الوثب الطويل',
    athleteId: 'ath_lwas_06',
    bib: 308,
    athleteName: 'حمزة قاسم',
    birthDate: '2004-11-05',
    category: 'أواسط',
    gender: 'M',
    clubId: 'club_mcs',
    clubName: 'أمل شباب سعيدة (MCS)',
    clubCode: 'MCS',
    mark: '7.45m',
    numericValue: 7.45,
    rank: 1,
    status: 'finished',
    wind: '+1.1 m/s',
    attempts: ['7.10m', '7.28m', 'X', '7.45m', 'X', '7.30m'],
    bestAttempt: '7.45m',
    recordedByJudgeName: 'قاضي الوثب (سعيدة)',
    recordedAt: '2026-06-20T17:10:00Z'
  },
  {
    id: 'ent_lwas_07',
    competitionId: 'comp_lwas_01',
    disciplineId: 'disc_400m',
    disciplineNameAr: '400 متر',
    athleteId: 'ath_lwas_07',
    bib: 405,
    athleteName: 'إكرام بوعلام',
    birthDate: '2005-06-18',
    category: 'أواسط',
    gender: 'F',
    clubId: 'club_wsa',
    clubName: 'وفاق سعيدة لألعاب القوى (WSA)',
    clubCode: 'WSA',
    mark: '56.80s',
    numericValue: 56.80,
    rank: 1,
    status: 'finished',
    lane: 4,
    recordedByJudgeName: 'سفيان بن عيسى (رئيس القضاة)',
    recordedAt: '2026-06-20T16:20:00Z'
  },
  // 100م نهائي رجال (National Competition 1)
  {
    id: 'ent_01',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_01',
    bib: 101,
    athleteName: 'يوسف العبدلي',
    birthDate: '2001-04-15',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_mca',
    clubName: 'مولودية الجزائر (MCA)',
    clubCode: 'MCA',
    mark: '09.96s',
    numericValue: 9.96,
    rank: 1,
    status: 'finished',
    isPersonalBest: true,
    lane: 4,
    wind: '+1.2 m/s',
    recordedByJudgeName: 'أحمد بن خليفة (Chief Judge)',
    recordedAt: '2026-06-25T15:30:00Z',
    notes: 'رقم قياسي وطني جديد معتمد'
  },
  {
    id: 'ent_02',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_02',
    bib: 102,
    athleteName: 'سفيان البقالي',
    birthDate: '2002-08-20',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_ess',
    clubName: 'وفاق سطيف (ESS)',
    clubCode: 'ESS',
    mark: '10.08s',
    numericValue: 10.08,
    rank: 2,
    status: 'finished',
    isSeasonBest: true,
    lane: 5,
    wind: '+1.2 m/s',
    recordedByJudgeName: 'أحمد بن خليفة (Chief Judge)',
    recordedAt: '2026-06-25T15:30:00Z'
  },
  {
    id: 'ent_03',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_03',
    bib: 103,
    athleteName: 'طارق بوكنزة',
    birthDate: '2000-11-10',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_aso',
    clubName: 'أولمبي الشلف (ASO)',
    clubCode: 'ASO',
    mark: '10.14s',
    numericValue: 10.14,
    rank: 3,
    status: 'finished',
    lane: 3,
    wind: '+1.2 m/s',
    recordedByJudgeName: 'أحمد بن خليفة (Chief Judge)',
    recordedAt: '2026-06-25T15:30:00Z'
  },
  {
    id: 'ent_04',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_04',
    bib: 104,
    athleteName: 'معتز برشم',
    birthDate: '2003-02-18',
    category: 'أواسط',
    gender: 'M',
    clubId: 'club_osa',
    clubName: 'نادي أولمبيك سعيدة (OSA)',
    clubCode: 'OSA',
    mark: '10.22s',
    numericValue: 10.22,
    rank: 4,
    status: 'finished',
    lane: 6,
    wind: '+1.2 m/s',
    recordedByJudgeName: 'أحمد بن خليفة (Chief Judge)',
    recordedAt: '2026-06-25T15:30:00Z'
  },
  {
    id: 'ent_05',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_05',
    bib: 105,
    athleteName: 'عبد القادر شريف',
    birthDate: '1999-07-25',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_usma',
    clubName: 'اتحاد الجزائر (USMA)',
    clubCode: 'USMA',
    mark: '',
    status: 'dns',
    lane: 2,
    notes: 'غائب عن خط الانطلاق (DNS)'
  },

  // 1500م رجال
  {
    id: 'ent_06',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_1500m',
    disciplineNameAr: '1500 متر',
    athleteId: 'ath_06',
    bib: 201,
    athleteName: 'سليم الغماري',
    birthDate: '2000-05-12',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_mca',
    clubName: 'مولودية الجزائر (MCA)',
    clubCode: 'MCA',
    mark: '3:34.12',
    numericValue: 214.12,
    rank: 1,
    status: 'finished',
    isPersonalBest: true,
    lane: 1,
    recordedByJudgeName: 'محمد الهواري بن عمارة',
    recordedAt: '2026-06-25T17:00:00Z'
  },
  {
    id: 'ent_07',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_1500m',
    disciplineNameAr: '1500 متر',
    athleteId: 'ath_07',
    bib: 202,
    athleteName: 'حمزة دريوش',
    birthDate: '2002-09-04',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_ess',
    clubName: 'وفاق سطيف (ESS)',
    clubCode: 'ESS',
    mark: '3:36.50',
    numericValue: 216.5,
    rank: 2,
    status: 'finished',
    lane: 2,
    recordedByJudgeName: 'محمد الهواري بن عمارة',
    recordedAt: '2026-06-25T17:00:00Z'
  },

  // الوثب الطويل (مسابقات الميدان)
  {
    id: 'ent_08',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_long_jump',
    disciplineNameAr: 'الوثب الطويل',
    athleteId: 'ath_08',
    bib: 301,
    athleteName: 'عصام نيمة',
    birthDate: '1998-10-12',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_mca',
    clubName: 'مولودية الجزائر (MCA)',
    clubCode: 'MCA',
    mark: '8.15m',
    numericValue: 8.15,
    rank: 1,
    status: 'finished',
    attempts: ['7.92m', 'X', '8.05m', '8.15m', 'X', '8.10m'],
    bestAttempt: '8.15m',
    isPersonalBest: true,
    recordedByJudgeName: 'كريم زروقي (Chief Jumps)',
    recordedAt: '2026-06-25T18:00:00Z'
  },
  {
    id: 'ent_09',
    competitionId: 'comp_nat_01',
    disciplineId: 'disc_long_jump',
    disciplineNameAr: 'الوثب الطويل',
    athleteId: 'ath_09',
    bib: 302,
    athleteName: 'ياسين حتحات',
    birthDate: '2001-03-22',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_aso',
    clubName: 'أولمبي الشلف (ASO)',
    clubCode: 'ASO',
    mark: '7.88m',
    numericValue: 7.88,
    rank: 2,
    status: 'finished',
    attempts: ['7.60m', '7.88m', 'X', '7.75m', 'X', 'X'],
    bestAttempt: '7.88m',
    recordedByJudgeName: 'كريم زروقي (Chief Jumps)',
    recordedAt: '2026-06-25T18:00:00Z'
  },

  // منافسة قادمة لم تجرِ بعد (Pre-competition Preliminary entries - Results EMPTY!)
  {
    id: 'ent_10',
    competitionId: 'comp_nat_02',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_10',
    bib: 401,
    athleteName: 'بلال حسني',
    birthDate: '2004-06-14',
    category: 'أواسط',
    gender: 'M',
    clubId: 'club_osa',
    clubName: 'نادي أولمبيك سعيدة (OSA)',
    clubCode: 'OSA',
    status: 'entered',
    mark: '', // EMPTY FOR PRE-COMPETITION!
    lane: 1
  },
  {
    id: 'ent_11',
    competitionId: 'comp_nat_02',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_11',
    bib: 402,
    athleteName: 'أمين دحماني',
    birthDate: '2005-01-20',
    category: 'أواسط',
    gender: 'M',
    clubId: 'club_mca',
    clubName: 'مولودية الجزائر (MCA)',
    clubCode: 'MCA',
    status: 'entered',
    mark: '', // EMPTY FOR PRE-COMPETITION!
    lane: 2
  },
  {
    id: 'ent_12',
    competitionId: 'comp_nat_02',
    disciplineId: 'disc_100m',
    disciplineNameAr: '100 متر',
    athleteId: 'ath_12',
    bib: 403,
    athleteName: 'زكرياء بلقاسم',
    birthDate: '2003-11-05',
    category: 'أكابر',
    gender: 'M',
    clubId: 'club_ess',
    clubName: 'وفاق سطيف (ESS)',
    clubCode: 'ESS',
    status: 'entered',
    mark: '', // EMPTY FOR PRE-COMPETITION!
    lane: 3
  }
];

const STORAGE_KEY = 'pfp_competition_entries_v2';

export class CompetitionEntriesService {
  private inMemoryEntries: AthleteCompetitionEntry[] = [];

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    if (this.inMemoryEntries.length > 0) return;
    if (typeof localStorage === 'undefined') {
      this.inMemoryEntries = [...DEFAULT_ENTRIES];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.inMemoryEntries = JSON.parse(stored);
      } else {
        this.inMemoryEntries = [...DEFAULT_ENTRIES];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ENTRIES));
      }
    } catch {
      this.inMemoryEntries = [...DEFAULT_ENTRIES];
    }
  }

  private persist(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryEntries));
      } catch {}
    }
  }

  public getAllEntries(): AthleteCompetitionEntry[] {
    this.initStorage();
    return [...this.inMemoryEntries];
  }

  public async getEntries(competitionId?: string, disciplineId?: string): Promise<AthleteCompetitionEntry[]> {
    this.initStorage();
    if (!competitionId || competitionId === 'all') {
      return [...this.inMemoryEntries];
    }
    let list = this.inMemoryEntries.filter(e => e.competitionId === competitionId);
    if (disciplineId && disciplineId !== 'all') {
      list = list.filter(e => e.disciplineId === disciplineId);
    }
    return list;
  }

  public async addEntry(entryData: Omit<AthleteCompetitionEntry, 'id'>): Promise<AthleteCompetitionEntry> {
    const id = `ent_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newEntry: AthleteCompetitionEntry = {
      ...entryData,
      id
    };
    this.inMemoryEntries.push(newEntry);
    this.persist();
    return newEntry;
  }

  public async updateEntry(id: string, updates: Partial<AthleteCompetitionEntry>): Promise<AthleteCompetitionEntry> {
    const idx = this.inMemoryEntries.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('سجل مشاركة العداء غير موجود.');
    this.inMemoryEntries[idx] = {
      ...this.inMemoryEntries[idx],
      ...updates
    };
    this.persist();
    return this.inMemoryEntries[idx];
  }

  public async removeEntry(id: string): Promise<boolean> {
    const initial = this.inMemoryEntries.length;
    this.inMemoryEntries = this.inMemoryEntries.filter(e => e.id !== id);
    if (this.inMemoryEntries.length !== initial) {
      this.persist();
      return true;
    }
    return false;
  }

  /**
   * Import athletes from Excel file rows
   */
  public async importFromExcelRows(
    competitionId: string, 
    disciplineId: string, 
    disciplineNameAr: string,
    rows: { bib?: number; name: string; birthDate?: string; category?: string; club?: string }[]
  ): Promise<number> {
    let count = 0;
    for (const r of rows) {
      if (!r.name) continue;
      await this.addEntry({
        competitionId,
        disciplineId,
        disciplineNameAr,
        athleteId: `ath_${Date.now().toString(36)}_${count}`,
        bib: r.bib || (100 + count),
        athleteName: r.name,
        birthDate: r.birthDate || '2002-01-01',
        category: r.category || 'أكابر',
        gender: 'M',
        clubId: 'club_custom',
        clubName: r.club || 'نادي مستقل',
        status: 'entered',
        mark: ''
      });
      count++;
    }
    return count;
  }

  /**
   * Export all disciplines of a competition in a single unified spreadsheet
   */
  public async exportAllDisciplinesToExcel(competition: NationalCompetition): Promise<void> {
    const entries = await this.getEntries(competition.id);
    const wb = XLSX.utils.book_new();

    // Group entries by discipline
    const byDiscipline: Record<string, AthleteCompetitionEntry[]> = {};
    for (const e of entries) {
      if (!byDiscipline[e.disciplineNameAr]) byDiscipline[e.disciplineNameAr] = [];
      byDiscipline[e.disciplineNameAr].push(e);
    }

    // Sheet 1: Summary of all disciplines
    const summaryRows = [
      ['الاتحاد الجزائري لألعاب القوى (FAA) • المنظومة الوطنية PHOTO FINISH PRO AI'],
      [`المنافسة الرسمية: ${competition.name}`],
      [`التاريخ والمكان: ${competition.date} • ${competition.venue}`],
      [`الجهة المنظمة: ${competition.leagueName}`],
      [''],
      ['#', 'التخصص الرياضي', 'الرقم', 'اسم ولقب العداء', 'تاريخ الميلاد', 'الصنف', 'النادي الرياضي', 'المسار', 'النتيجة', 'الترتيب', 'الحالة', 'ملاحظات']
    ];

    let rowIdx = 1;
    for (const [discName, discEntries] of Object.entries(byDiscipline)) {
      for (const e of discEntries) {
        summaryRows.push([
          String(rowIdx++),
          discName,
          String(e.bib),
          e.athleteName,
          e.birthDate,
          e.category,
          e.clubName,
          e.lane ? String(e.lane) : '-',
          e.mark || 'فارغة',
          e.rank ? String(e.rank) : '-',
          e.status === 'finished' ? 'مكتمل' : e.status === 'dns' ? 'DNS' : e.status === 'dnf' ? 'DNF' : e.status === 'dq' ? 'DQ' : 'قيد المشاركة',
          e.notes || ''
        ]);
      }
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'كافة التخصصات');

    // Add individual sheet for each discipline
    for (const [discName, discEntries] of Object.entries(byDiscipline)) {
      const cleanSheetName = discName.replace(/[\\/?*[\]]/g, '').slice(0, 25);
      const sheetRows = [
        [`تخصص: ${discName} — ${competition.name}`],
        [`التاريخ: ${competition.date} | المكان: ${competition.venue}`],
        [''],
        ['رقم الصدرية', 'اسم ولقب العداء', 'تاريخ الميلاد', 'الصنف', 'النادي الرياضي', 'النتيجة', 'الترتيب', 'الحالة']
      ];

      for (const e of discEntries) {
        sheetRows.push([
          String(e.bib),
          e.athleteName,
          e.birthDate,
          e.category,
          e.clubName,
          e.mark || 'فارغة',
          e.rank ? String(e.rank) : '-',
          e.status
        ]);
      }

      const wsDisc = XLSX.utils.aoa_to_sheet(sheetRows);
      XLSX.utils.book_append_sheet(wb, wsDisc, cleanSheetName);
    }

    // Trigger download in browser
    if (typeof window !== 'undefined') {
      const fileName = `PHOTO_FINISH_PRO_${competition.id}_ALL_DISCIPLINES_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);
    }
  }
}

export const competitionEntriesService = new CompetitionEntriesService();
