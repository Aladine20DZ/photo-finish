/**
 * PHOTO FINISH PRO AI — Platform Statistics Service
 * Admin-configurable public statistics for the HomePage/PublicPortal.
 * All numbers are stored in localStorage and managed by the Platform Admin.
 */

export interface PlatformStats {
  totalAthletes: number;
  totalCompetitions: number;
  totalClubs: number;
  totalLeagues: number;
  totalParticipations: number;
  certifiedResults: number;
  nationalRecords: number;
  activeSeason: string;
  lastUpdated: string;
}

const STATS_KEY = 'pfp_platform_stats_v1';

const DEFAULT_STATS: PlatformStats = {
  totalAthletes: 0,
  totalCompetitions: 0,
  totalClubs: 0,
  totalLeagues: 0,
  totalParticipations: 0,
  certifiedResults: 0,
  nationalRecords: 0,
  activeSeason: '2026',
  lastUpdated: new Date().toISOString(),
};

class PlatformStatsService {
  private listeners: (() => void)[] = [];
  private cache: PlatformStats | null = null;

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(); } catch {}
    }
  }

  public getStats(): PlatformStats {
    if (this.cache) return this.cache;
    try {
      const stored = localStorage.getItem(STATS_KEY);
      if (stored) {
        this.cache = { ...DEFAULT_STATS, ...JSON.parse(stored) };
        return this.cache!;
      }
    } catch {}
    this.cache = { ...DEFAULT_STATS };
    return this.cache;
  }

  public setStats(partial: Partial<PlatformStats>): void {
    const current = this.getStats();
    const updated: PlatformStats = {
      ...current,
      ...partial,
      lastUpdated: new Date().toISOString(),
    };
    this.cache = updated;
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(updated));
    } catch {}
    this.notify();
  }

  public resetStats(): void {
    this.cache = { ...DEFAULT_STATS };
    try {
      localStorage.removeItem(STATS_KEY);
    } catch {}
    this.notify();
  }
}

export const platformStatsService = new PlatformStatsService();
