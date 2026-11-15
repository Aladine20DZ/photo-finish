import { describe, it, expect, beforeEach } from 'vitest';
import { manualTimingService, ManualTimingSession } from '../src/services/manualTimingService';
import { athleteClubStorage } from '../src/services/athleteClubStorage';

describe('Athletics Manual Timing Engine (World Athletics TR16 / Rule 165)', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(async () => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    (globalThis as any).localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
      removeItem: (k: string) => { delete mockStorage[k]; },
      clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
    };
    await athleteClubStorage.clearAll();
  });

  describe('World Athletics Rule 165 Hand-Timing Conversion', () => {
    it('rounds track sprint hundredths UP to next longer tenth of a second', () => {
      // 10.11s should round UP to 10.2s
      expect(manualTimingService.convertToWorldAthleticsHandTime(10110)).toBe('10.2s');

      // 10.19s should round UP to 10.2s
      expect(manualTimingService.convertToWorldAthleticsHandTime(10190)).toBe('10.2s');

      // 10.20s should stay 10.2s
      expect(manualTimingService.convertToWorldAthleticsHandTime(10200)).toBe('10.2s');

      // 10.21s should round UP to 10.3s
      expect(manualTimingService.convertToWorldAthleticsHandTime(10210)).toBe('10.3s');

      // 9.92s should round UP to 10.0s
      expect(manualTimingService.convertToWorldAthleticsHandTime(9920)).toBe('10.0s');
    });

    it('handles minutes correctly in hand timing for 800m and 1500m', () => {
      // 1:42.52 -> 1:42.6
      expect(manualTimingService.convertToWorldAthleticsHandTime(102520)).toBe('1:42.6');

      // 3:26.00 -> 3:26.0
      expect(manualTimingService.convertToWorldAthleticsHandTime(206000)).toBe('3:26.0');
    });

    it('rounds road and cross-country races UP to the next whole second', () => {
      // Road race 29:14.2 -> 29:15
      const ms = (29 * 60 + 14.2) * 1000;
      expect(manualTimingService.convertToWorldAthleticsHandTime(ms, true)).toBe('29:15');
    });
  });

  describe('High-Precision Clock Formatter', () => {
    it('formats millisecond time accurately in 1/1000s and 1/100s', () => {
      const ms = 10142; // 10 seconds 142 ms
      expect(manualTimingService.formatTime(ms, 'thousandths')).toBe('00:10.142');
      expect(manualTimingService.formatTime(ms, 'hundredths')).toBe('00:10.14');
    });

    it('formats gap to leader correctly', () => {
      expect(manualTimingService.formatGap(0)).toBe('+0.00s');
      expect(manualTimingService.formatGap(140)).toBe('+0.14s');
      expect(manualTimingService.formatGap(1250)).toBe('+1.25s');
    });
  });

  describe('Athlete Resolution by Bib', () => {
    it('resolves registered athlete name and club from bib number', async () => {
      await athleteClubStorage.saveAthlete({
        id: 'ath_test_1',
        firstName: 'جمال',
        lastName: 'سجاتي',
        bibNumber: '108',
        clubId: 'club_saida',
        clubName: 'مولودية سعيدة',
        wilayaCode: '20',
        wilayaName: 'سعيدة',
        gender: 'M',
        birthDate: '1999-05-03',
        licenseNumber: 'LIC-20-108',
        isCertified: true,
        category: 'SENIOR',
        specialty: '800m',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const found = await manualTimingService.resolveAthleteByBib('108');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('جمال سجاتي');
      expect(found?.club).toBe('مولودية سعيدة');
    });

    it('returns null for unregistered bib numbers', async () => {
      const found = await manualTimingService.resolveAthleteByBib('9999');
      expect(found).toBeNull();
    });
  });

  describe('Session Persistence & CSV Export', () => {
    it('saves and reloads active timing session from localStorage', () => {
      const session: ManualTimingSession = {
        id: 'sess_1',
        eventName: '100م نهائي رجال',
        heatName: 'تصفية 1',
        category: 'أكابر رجال',
        windSpeed: '+1.2',
        venue: 'ملعب 5 جويلية',
        startedAt: 100000,
        endedAt: null,
        status: 'running',
        splits: [
          {
            id: 'split_1',
            order: 1,
            elapsedMs: 10140,
            displayTime: '00:10.140',
            waHandTime: '10.2s',
            gapToLeaderMs: 0,
            gapDisplay: '+0.00s',
            bib: '101',
            athleteName: 'ياسين حتحات',
            lane: 4,
            status: 'OK',
            capturedAt: 110140
          }
        ]
      };

      manualTimingService.saveActiveSession(session);
      const loaded = manualTimingService.loadActiveSession();

      expect(loaded).not.toBeNull();
      expect(loaded?.eventName).toBe('100م نهائي رجال');
      expect(loaded?.splits.length).toBe(1);
      expect(loaded?.splits[0].athleteName).toBe('ياسين حتحات');
    });

    it('exports official CSV with Arabic headers and BOM', () => {
      const session: ManualTimingSession = {
        id: 'sess_csv',
        eventName: '100م نهائي رجال',
        heatName: 'تصفية 1',
        category: 'أكابر رجال',
        windSpeed: '+1.2',
        venue: 'المضمار الولائي',
        startedAt: 100000,
        endedAt: 112000,
        status: 'finished',
        splits: [
          {
            id: 'split_1',
            order: 1,
            elapsedMs: 10140,
            displayTime: '00:10.140',
            waHandTime: '10.2s',
            gapToLeaderMs: 0,
            gapDisplay: '+0.00s',
            bib: '101',
            athleteName: 'ياسين حتحات',
            lane: 4,
            club: 'مولودية سعيدة',
            status: 'OK',
            capturedAt: 110140
          }
        ]
      };

      const csv = manualTimingService.exportToCsv(session);
      expect(csv).toContain('الترتيب');
      expect(csv).toContain('ياسين حتحات');
      expect(csv).toContain('10.2s');
      expect(csv.startsWith('\uFEFF')).toBe(true);
    });
  });
});
