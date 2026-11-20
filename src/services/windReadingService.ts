/**
 * PHOTO FINISH PRO AI — Wind Reading Service (خدمة قراءات الرياح)
 * ==============================================================================
 * Central registry for wind gauge readings captured by مشغل مقياس الرياح.
 * World Athletics Rule 21 (Wind) compliance: tailwind strictly greater than
 * +2.0 m/s is flagged `exceeds_limit` (غير صالحة للأرقام القياسية وفق قاعدة
 * الاعتماد); readings at/below +2.0 m/s (incl. headwind) are `within_limit`.
 * Persistence: single localStorage key `pfp_wind_readings_v1` guarded by
 * try/catch; falls back to an in-memory array when `window` is unavailable.
 */

/** الحد القانوني لرياح المؤخرة م/ث — القراءات الأكبر منه تماماً تتجاوز الحد */
export const WIND_RECORD_LIMIT_MS = 2.0;

const STORAGE_KEY = 'pfp_wind_readings_v1';

/** حالة القراءة: قانونية (`within_limit`) أو تتجاوز الحد (`exceeds_limit`) */
export type WindReadingValidity = 'within_limit' | 'exceeds_limit';

export interface WindReading {
  id: string;
  competitionId: string;
  disciplineId: string;
  disciplineNameAr: string;
  /** مرجع الشوط أو المحاولة المرتبط بالقراءة (اختياري) */
  raceOrAttemptRef?: string;
  /** رقم صدريية العداء المرتبط إن وُجد */
  athleteBib?: string;
  /** القراءة الخام م/ث (سالبة = رياح معاكسة) */
  readingMs: number;
  recordedAt: string;
  judgeName: string;
  assignmentId?: string;
  validity: 'within_limit' | 'exceeds_limit';
  note?: string;
}

/** مدخل إضافة قراءة جديدة — المعرّف والحالة يُحسبان تلقائياً */
export type WindReadingInput = Omit<WindReading, 'id' | 'recordedAt' | 'validity'> & { recordedAt?: string };

/** إحصاءات قراءات مسابقة واحدة */
export interface WindStatistics {
  total: number;
  exceeds: number;
  maxTailwind: number | null;
  minReading: number | null;
}

let memoryStore: WindReading[] = [];

const hasLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const toTimestamp = (iso: string): number => {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const loadAll = (): WindReading[] => {
  if (!hasLocalStorage()) return memoryStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryStore;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return memoryStore;
    return parsed as WindReading[];
  } catch {
    return memoryStore;
  }
};

const persistAll = (readings: WindReading[]): void => {
  memoryStore = readings;
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
  } catch {
    /* التخزين المحلي غير متاح — الاعتماد على الذاكرة فقط */
  }
};

const readingsForCompetition = (competitionId: string): WindReading[] =>
  loadAll()
    .filter((reading) => reading.competitionId === competitionId)
    .sort((a, b) => toTimestamp(b.recordedAt) - toTimestamp(a.recordedAt));

const createReading = (input: WindReadingInput): WindReading => ({
  id: `WIND-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  competitionId: input.competitionId,
  disciplineId: input.disciplineId,
  disciplineNameAr: input.disciplineNameAr,
  raceOrAttemptRef: input.raceOrAttemptRef,
  athleteBib: input.athleteBib,
  readingMs: input.readingMs,
  recordedAt: input.recordedAt ?? new Date().toISOString(),
  judgeName: input.judgeName,
  assignmentId: input.assignmentId,
  validity: input.readingMs > WIND_RECORD_LIMIT_MS ? 'exceeds_limit' : 'within_limit',
  note: input.note
});

const escapeCsvCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

/** فاصل أسطر CSV بسيط يدعم الخلايا المقتبسة وعلامات التنصيص المكررة */
const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else current += char;
  }
  cells.push(current);
  return cells;
};

const validityLabel = (validity: WindReadingValidity): string =>
  validity === 'exceeds_limit' ? 'تتجاوز الحد' : 'قانونية';

export const windReadingService = {
  /** تسجيل قراءة جديدة: يحسب الحالة، يحفظ في مقدمة السجل، ويعيد القراءة المخزنة */
  addReading(input: WindReadingInput): WindReading {
    const reading = createReading(input);
    persistAll([reading, ...loadAll()]);
    return { ...reading };
  },

  /** قراءات مُرشّحة (نسخ) — الأحدث أولاً */
  getReadings(competitionId?: string, disciplineId?: string): WindReading[] {
    return loadAll()
      .filter((reading) =>
        (competitionId ? reading.competitionId === competitionId : true) &&
        (disciplineId ? reading.disciplineId === disciplineId : true))
      .sort((a, b) => toTimestamp(b.recordedAt) - toTimestamp(a.recordedAt));
  },

  /** حذف قراءة داخل نطاق المسابقة — يعود صحيحاً إن حُذفت فعلاً */
  deleteReading(id: string, competitionId: string): boolean {
    const current = loadAll();
    const remaining = current.filter((reading) =>
      !(reading.id === id && reading.competitionId === competitionId));
    if (remaining.length === current.length) return false;
    persistAll(remaining);
    return true;
  },

  /** حذف كل قراءات تخصص داخل مسابقة — يعيد عدد المحذوفات */
  clearDiscipline(competitionId: string, disciplineId: string): number {
    const current = loadAll();
    const remaining = current.filter((reading) =>
      !(reading.competitionId === competitionId && reading.disciplineId === disciplineId));
    const deletedCount = current.length - remaining.length;
    if (deletedCount > 0) persistAll(remaining);
    return deletedCount;
  },

  /** إحصاءات المسابقة: الإجمالي، المتجاوزة للحد، أقصى رياح مؤخرة، أدنى قراءة */
  getStatistics(competitionId: string): WindStatistics {
    const rows = loadAll().filter((reading) => reading.competitionId === competitionId);
    const tailwinds = rows.filter((reading) => reading.readingMs > 0).map((reading) => reading.readingMs);
    return {
      total: rows.length,
      exceeds: rows.filter((reading) => reading.validity === 'exceeds_limit').length,
      maxTailwind: tailwinds.length > 0 ? Math.max(...tailwinds) : null,
      minReading: rows.length > 0 ? Math.min(...rows.map((reading) => reading.readingMs)) : null
    };
  },

  /** تصدير CSV مع BOM ورأس عربي RTL-friendly */
  toCsv(competitionId: string): string {
    const header = 'التاريخ,التخصص,المرجع,الصدريية,القراءة م/ث,الحالة,الحكم';
    const lines = readingsForCompetition(competitionId).map((reading) =>
      [
        escapeCsvCell(reading.recordedAt),
        escapeCsvCell(reading.disciplineNameAr),
        escapeCsvCell(reading.raceOrAttemptRef ?? ''),
        escapeCsvCell(reading.athleteBib ?? ''),
        escapeCsvCell(reading.readingMs.toFixed(2)),
        escapeCsvCell(validityLabel(reading.validity)),
        escapeCsvCell(reading.judgeName)
      ].join(','));
    return `\uFEFF${[header, ...lines].join('\n')}`;
  },

  /** استيراد CSV بسيط: يتجاوز الرأس، يتسامح مع CRLF، ويتجاهل القراءات غير الرقمية */
  importFromCsv(csv: string, competitionId: string, disciplineId: string, disciplineNameAr: string, judgeName: string): number {
    const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    let imported = 0;
    for (let i = 1; i < lines.length; i += 1) {
      const cells = splitCsvLine(lines[i]);
      const readingMs = Number.parseFloat((cells[4] ?? '').trim());
      if (!Number.isFinite(readingMs)) continue;
      const parsedDate = new Date((cells[0] ?? '').trim());
      windReadingService.addReading({
        competitionId,
        disciplineId,
        disciplineNameAr,
        raceOrAttemptRef: (cells[2] ?? '').trim() || undefined,
        athleteBib: (cells[3] ?? '').trim() || undefined,
        readingMs,
        recordedAt: Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString(),
        judgeName
      });
      imported += 1;
    }
    return imported;
  }
};
