/**
 * PHOTO FINISH PRO — Wind Reading Service Tests (اختبارات خدمة قياس الرياح)
 * Vitest node env — the service falls back to an in-memory array when
 * `window`/localStorage is unavailable, so these tests run pure.
 * NOTE: the service is a singleton with module-level state, so every test
 * uses a UNIQUE competitionId to stay independent of execution accumulation.
 */

import { describe, it, expect } from 'vitest';
import {
  windReadingService,
  WIND_RECORD_LIMIT_MS,
  WindReading
} from '../src/services/windReadingService';

const baseInput = {
  competitionId: 'wind-comp-boundary',
  disciplineId: 'disc-100m',
  disciplineNameAr: '100 متر',
  judgeName: 'الحكم كريم بلحاج'
};

describe('WindReadingService (STAGE1-WIND)', () => {
  it('defines the legal wind record limit at exactly +2.0 m/s', () => {
    expect(WIND_RECORD_LIMIT_MS).toBe(2.0);
  });

  it('computes validity correctly at the +2.0 boundary (2.0 within / 2.1 exceeds / -1.5 within)', () => {
    const withinAtLimit = windReadingService.addReading({ ...baseInput, readingMs: 2.0 });
    const exceeds = windReadingService.addReading({ ...baseInput, readingMs: 2.1 });
    const headwind = windReadingService.addReading({ ...baseInput, readingMs: -1.5 });

    expect(withinAtLimit.validity).toBe('within_limit');
    expect(exceeds.validity).toBe('exceeds_limit');
    expect(headwind.validity).toBe('within_limit');

    // Stored readings carry a generated id + ISO timestamp and are returned as copies.
    expect(withinAtLimit.id).toMatch(/^WIND-/);
    expect(new Date(withinAtLimit.recordedAt).toString()).not.toBe('Invalid Date');
    expect(withinAtLimit.readingMs).toBe(2.0);

    // Cleanup (unique scope keeps other tests untouched)
    expect(windReadingService.clearDiscipline(baseInput.competitionId, baseInput.disciplineId)).toBe(3);
  });

  it('filters getReadings by competition and discipline, newest first', () => {
    const compId = 'wind-comp-filter';
    const add = (disciplineId: string, recordedAt: string, readingMs: number): WindReading =>
      windReadingService.addReading({
        competitionId: compId,
        disciplineId,
        disciplineNameAr: 'الوثب الطويل',
        raceOrAttemptRef: 'attempt-1',
        judgeName: 'الحكم سفيان',
        recordedAt,
        readingMs
      });

    const older = add('disc-long', '2026-03-01T09:00:00.000Z', 1.2);
    const newer = add('disc-long', '2026-03-01T10:00:00.000Z', 2.4);
    const newest = add('disc-triple', '2026-03-01T10:30:00.000Z', 0.8);

    const allForComp = windReadingService.getReadings(compId);
    expect(allForComp).toHaveLength(3);
    expect(allForComp[0].id).toBe(newest.id);
    expect(allForComp[1].id).toBe(newer.id);
    expect(allForComp[2].id).toBe(older.id);

    const longOnly = windReadingService.getReadings(compId, 'disc-long');
    expect(longOnly).toHaveLength(2);
    expect(longOnly[0].id).toBe(newer.id);
    expect(longOnly.every((r) => r.disciplineId === 'disc-long')).toBe(true);

    expect(windReadingService.getReadings('wind-comp-unknown')).toHaveLength(0);
    expect(windReadingService.getReadings(compId, 'disc-unknown')).toHaveLength(0);

    windReadingService.clearDiscipline(compId, 'disc-long');
    windReadingService.clearDiscipline(compId, 'disc-triple');
  });

  it('returns false when deleting an unknown id and true for a stored one', () => {
    const compId = 'wind-comp-delete';
    const stored = windReadingService.addReading({
      competitionId: compId,
      disciplineId: 'disc-200m',
      disciplineNameAr: '200 متر',
      judgeName: 'الحكم وليد',
      readingMs: 1.9
    });

    expect(windReadingService.deleteReading('WIND-UNKNOWN-ID', compId)).toBe(false);
    // Existing id but foreign competition scope must NOT delete.
    expect(windReadingService.deleteReading(stored.id, 'wind-comp-other')).toBe(false);
    expect(windReadingService.deleteReading(stored.id, compId)).toBe(true);
    expect(windReadingService.getReadings(compId)).toHaveLength(0);
  });

  it('clearDiscipline removes exactly one discipline scope and returns the count', () => {
    const compId = 'wind-comp-clear';
    const addFor = (disciplineId: string): void => {
      windReadingService.addReading({
        competitionId: compId,
        disciplineId,
        disciplineNameAr: 'دفع الجلة',
        judgeName: 'الحكم رشيد',
        readingMs: 1.0
      });
    };
    addFor('disc-shot');
    addFor('disc-shot');
    addFor('disc-shot');
    addFor('disc-discus');

    expect(windReadingService.clearDiscipline(compId, 'disc-shot')).toBe(3);
    const remaining = windReadingService.getReadings(compId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].disciplineId).toBe('disc-discus');
    expect(windReadingService.clearDiscipline(compId, 'disc-shot')).toBe(0);

    windReadingService.clearDiscipline(compId, 'disc-discus');
  });

  it('computes statistics: total, exceeds count, max tailwind and min reading', () => {
    const compId = 'wind-comp-stats';
    const add = (readingMs: number): void => {
      windReadingService.addReading({
        competitionId: compId,
        disciplineId: 'disc-100m',
        disciplineNameAr: '100 متر',
        judgeName: 'الحكم نبيل',
        readingMs
      });
    };
    add(2.1); // exceeds
    add(1.8);
    add(-1.2);
    add(2.6); // exceeds

    const stats = windReadingService.getStatistics(compId);
    expect(stats.total).toBe(4);
    expect(stats.exceeds).toBe(2);
    expect(stats.maxTailwind).toBeCloseTo(2.6, 10);
    expect(stats.minReading).toBeCloseTo(-1.2, 10);

    // Empty competition scope => null extremes, zero counters.
    const empty = windReadingService.getStatistics('wind-comp-stats-empty');
    expect(empty).toEqual({ total: 0, exceeds: 0, maxTailwind: null, minReading: null });

    windReadingService.clearDiscipline(compId, 'disc-100m');
  });

  it('exports CSV with BOM, Arabic header and a formatted data row', () => {
    const compId = 'wind-comp-csv';
    windReadingService.addReading({
      competitionId: compId,
      disciplineId: 'disc-100m',
      disciplineNameAr: '100 متر',
      raceOrAttemptRef: 'heat-2',
      athleteBib: '27',
      judgeName: 'الحكم إلياس',
      readingMs: 2.1,
      recordedAt: '2026-05-10T15:30:00.000Z'
    });

    const csv = windReadingService.toCsv(compId);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('التاريخ,التخصص,المرجع,الصدريية,القراءة م/ث,الحالة,الحكم');
    expect(csv).toContain('"heat-2"');
    expect(csv).toContain('"27"');
    expect(csv).toContain('"2.10"'); // readingMs.toFixed(2)
    expect(csv).toContain('"تتجاوز الحد"');
    expect(csv).toContain('"الحكم إلياس"');

    windReadingService.clearDiscipline(compId, 'disc-100m');
  });

  it('imports CSV rows round-trip style and skips invalid numeric readings', () => {
    const exportCompId = 'wind-comp-export';
    for (const readingMs of [1.4, -0.7, 2.3]) {
      windReadingService.addReading({
        competitionId: exportCompId,
        disciplineId: 'disc-100m',
        disciplineNameAr: '100 متر',
        judgeName: 'الحكم إلياس',
        readingMs
      });
    }

    const csv = windReadingService.toCsv(exportCompId);
    const importCompId = 'wind-comp-import';
    const importedCount = windReadingService.importFromCsv(
      `${csv}\r\n`,
      importCompId,
      'disc-100m',
      '100 متر',
      'الحكم إلياس'
    );
    expect(importedCount).toBe(3);

    const imported = windReadingService.getReadings(importCompId);
    expect(imported).toHaveLength(3);
    // Validity is recomputed on import (2.3 exceeds, the rest within).
    expect(imported.filter((r) => r.validity === 'exceeds_limit')).toHaveLength(1);
    expect(imported.every((r) => r.judgeName === 'الحكم إلياس')).toBe(true);

    windReadingService.clearDiscipline(exportCompId, 'disc-100m');
    windReadingService.clearDiscipline(importCompId, 'disc-100m');
  });

  it('skips the header, tolerates CRLF and ignores non-numeric reading cells on import', () => {
    const compId = 'wind-comp-import-raw';
    const rawCsv = [
      'التاريخ,التخصص,المرجع,الصدريية,القراءة م/ث,الحالة,الحكم',
      '2026-05-10T15:30:00.000Z,100 متر,heat-1,12,1.4,قانونية,الحكم أمين',
      '2026-05-10T15:35:00.000Z,100 متر,heat-1,13,abc,قانونية,الحكم أمين',
      '',
      '2026-05-10T15:40:00.000Z,100 متر,heat-1,14,-0.9,قانونية,الحكم أمين'
    ].join('\r\n');

    const importedCount = windReadingService.importFromCsv(
      rawCsv,
      compId,
      'disc-100m',
      '100 متر',
      'الحكم أمين'
    );
    expect(importedCount).toBe(2);

    const imported = windReadingService.getReadings(compId);
    expect(imported).toHaveLength(2);
    expect(imported.map((r) => r.readingMs).sort((a, b) => a - b)).toEqual([-0.9, 1.4]);
    expect(imported.find((r) => r.readingMs === 1.4)?.athleteBib).toBe('12');
    expect(imported.find((r) => r.readingMs === -0.9)?.athleteBib).toBe('14');
    expect(imported.find((r) => r.readingMs === 1.4)?.raceOrAttemptRef).toBe('heat-1');

    windReadingService.clearDiscipline(compId, 'disc-100m');
  });
});
