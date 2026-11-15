/**
 * PHOTO FINISH PRO AI — Athletics Manual Timing Service
 * High-precision split recording, World Athletics Rule 165 hand-timing conversion,
 * athlete bib resolution, and local offline persistence.
 */

import { athleteClubStorage } from './athleteClubStorage';

export interface ManualTimingSplit {
  id: string;
  order: number;              // 1, 2, 3...
  elapsedMs: number;          // Milliseconds from race start
  displayTime: string;        // e.g. "00:10.142" or "10.14s"
  waHandTime: string;         // World Athletics Rule 165 converted hand time (e.g. "10.2s")
  gapToLeaderMs: number;      // 0 for #1, delta in ms for others
  gapDisplay: string;         // "+0.00s", "+0.14s"
  bib: string;                // Dossard / Bib number (editable)
  athleteName: string;        // Athlete full name (auto-filled or editable)
  lane?: number;              // Lane (1-8)
  club?: string;              // Sports club
  status: 'OK' | 'DNF' | 'DQ' | 'DNS';
  notes?: string;
  capturedAt: number;         // Epoch timestamp
}

export interface ManualTimingSession {
  id: string;
  eventName: string;          // e.g. "100م نهائي رجال"
  heatName: string;           // e.g. "تصفية 1"
  category: string;           // e.g. "أكابر رجال"
  windSpeed: string;          // e.g. "+1.2 m/s"
  venue: string;              // e.g. "المضمار الولائي"
  startedAt: number | null;
  endedAt: number | null;
  splits: ManualTimingSplit[];
  status: 'idle' | 'running' | 'paused' | 'finished';
}

const STORAGE_SESSION_KEY = 'pfp_manual_timing_active_session_v1';
const STORAGE_HISTORY_KEY = 'pfp_manual_timing_history_v1';

class ManualTimingService {
  /**
   * World Athletics Technical Rule 165 (TR16.5 / Rule 165):
   * For hand timing on the track:
   * 1. If time is not ending in exact zero hundredths, round UP to the next longer 1/10th of a second.
   *    Example: 10.11s -> 10.2s, 10.19s -> 10.2s, 10.20s -> 10.2s, 10.21s -> 10.3s.
   * 2. For races partly or entirely outside the stadium (road races, cross-country):
   *    Times are converted to whole seconds by reading to the next longer whole second.
   */
  public convertToWorldAthleticsHandTime(elapsedMs: number, isRoadOrCross: boolean = false): string {
    if (elapsedMs <= 0) return '0.0s';
    const totalSeconds = elapsedMs / 1000;

    if (isRoadOrCross) {
      // Round UP to the next whole second
      const wholeSec = Math.ceil(totalSeconds);
      const m = Math.floor(wholeSec / 60);
      const s = wholeSec % 60;
      return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
    }

    // Track sprints / middle distance: Round UP to next 1/10th second
    const hundredths = Math.floor((elapsedMs % 1000) / 10);
    const wholeSec = Math.floor(elapsedMs / 1000);
    const tenths = Math.ceil(hundredths / 10);

    let finalTenths = tenths;
    let finalSec = wholeSec;

    if (finalTenths >= 10) {
      finalTenths = 0;
      finalSec += 1;
    }

    const m = Math.floor(finalSec / 60);
    const s = finalSec % 60;

    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}.${finalTenths}`;
    }
    return `${s}.${finalTenths}s`;
  }

  /**
   * Format elapsed milliseconds into high-precision display string
   */
  public formatTime(elapsedMs: number, precision: 'thousandths' | 'hundredths' = 'thousandths'): string {
    if (elapsedMs < 0) elapsedMs = 0;
    const totalMs = Math.floor(elapsedMs);
    const ms = totalMs % 1000;
    const totalSeconds = Math.floor(totalMs / 1000);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const h = Math.floor(totalSeconds / 3600);

    const sStr = s.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');

    if (precision === 'hundredths') {
      const hnd = Math.floor(ms / 10).toString().padStart(2, '0');
      if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${mStr}:${sStr}.${hnd}`;
      }
      return `${mStr}:${sStr}.${hnd}`;
    }

    const msStr = ms.toString().padStart(3, '0');
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${mStr}:${sStr}.${msStr}`;
    }
    return `${mStr}:${sStr}.${msStr}`;
  }

  /**
   * Format gap between splits (e.g. "+0.14s")
   */
  public formatGap(gapMs: number): string {
    if (gapMs <= 0) return '+0.00s';
    const sec = (gapMs / 1000).toFixed(2);
    return `+${sec}s`;
  }

  /**
   * Resolve athlete name and club by bib number from local athlete repository
   */
  public async resolveAthleteByBib(bib: string): Promise<{ name?: string; club?: string } | null> {
    const cleanBib = bib.trim();
    if (!cleanBib) return null;

    try {
      const athletes = await athleteClubStorage.listAthletes();
      const match = athletes.find(a => String(a.bibNumber) === cleanBib || a.id === cleanBib);
      if (match) {
        return {
          name: `${match.firstName} ${match.lastName}`.trim(),
          club: match.clubName
        };
      }
    } catch {}

    return null;
  }

  /**
   * Save active timing session to local storage
   */
  public saveActiveSession(session: ManualTimingSession): void {
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } catch {}
  }

  /**
   * Load active timing session from local storage
   */
  public loadActiveSession(): ManualTimingSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  /**
   * Clear active timing session
   */
  public clearActiveSession(): void {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {}
  }

  /**
   * Archive finished session to history
   */
  public archiveSession(session: ManualTimingSession): void {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      const history: ManualTimingSession[] = raw ? JSON.parse(raw) : [];
      history.unshift({ ...session, endedAt: Date.now() });
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    } catch {}
  }

  /**
   * Export splits to CSV string
   */
  public exportToCsv(session: ManualTimingSession): string {
    const headers = [
      'الترتيب',
      'رقم الصدرية',
      'اسم العداء',
      'الرواق',
      'النادي',
      'التوقيت الدقيق (1/1000s)',
      'التوقيت اليدوي الرسمي (WA TR16)',
      'الفارق عن المتصدر',
      'الحالة',
      'ملاحظات'
    ];

    const rows = session.splits.map(s => [
      s.order,
      `"${s.bib || ''}"`,
      `"${s.athleteName || ''}"`,
      s.lane || '',
      `"${s.club || ''}"`,
      `"${s.displayTime}"`,
      `"${s.waHandTime}"`,
      `"${s.gapDisplay}"`,
      s.status,
      `"${s.notes || ''}"`
    ]);

    const meta = [
      `# سباق: ${session.eventName} - ${session.heatName}`,
      `# الفئة: ${session.category} | الرياح: ${session.windSpeed} | المكان: ${session.venue}`,
      `# التاريخ: ${new Date(session.startedAt || Date.now()).toLocaleDateString('ar-DZ')}`,
      ''
    ];

    return '\uFEFF' + meta.join('\n') + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const manualTimingService = new ManualTimingService();
