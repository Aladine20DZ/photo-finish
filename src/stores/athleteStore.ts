import { create } from 'zustand';
import { Runner } from '../types/race';

export const DEFAULT_RUNNERS: Runner[] = [
  { id: 1, bib: 101, name: 'يوسف العبدلي', country: 'الجزائر 🇩🇿', lane: 1, color: '#EF4444', finishTime: 0, status: 'OK' },
  { id: 2, bib: 102, name: 'سفيان البقالي', country: 'المغرب 🇲🇦', lane: 2, color: '#3B82F6', finishTime: 0, status: 'OK' },
  { id: 3, bib: 103, name: 'توفيق مخلوفي', country: 'الجزائر 🇩🇿', lane: 3, color: '#10B981', finishTime: 0, status: 'OK' },
  { id: 4, bib: 104, name: 'معتز برشم', country: 'قطر 🇶🇦', lane: 4, color: '#F59E0B', finishTime: 0, status: 'OK' },
];

export interface AthleteState {
  runners: Runner[];

  // Actions (Pure & Immutable)
  setRunners: (runners: Runner[] | ((prev: Runner[]) => Runner[])) => void;
  updateRunner: (lane: number, updates: Partial<Runner>) => void;
  setLaneFinish: (lane: number, finishTime: number, rank?: number, snapshotUrl?: string) => void;
  recalculateRanks: () => void;
  resetRunners: (count?: number) => void;
}

export const useAthleteStore = create<AthleteState>((set) => ({
  runners: DEFAULT_RUNNERS,

  setRunners: (val) => set((state) => ({
    runners: typeof val === 'function' ? val(state.runners) : val
  })),

  updateRunner: (lane, updates) => set((state) => {
    const updated = state.runners.map((r) =>
      r.lane === lane ? { ...r, ...updates } : r
    );

    // إذا تم تعديل التوقيت، نعيد احتساب الترتيب تلقائياً
    if (updates.finishTime !== undefined) {
      const finished = updated
        .filter((r) => r.finishTime > 0 && r.status === 'OK')
        .sort((a, b) => a.finishTime - b.finishTime);

      const rankMap = new Map<number, number>();
      finished.forEach((r, idx) => {
        rankMap.set(r.lane, idx + 1);
      });

      return {
        runners: updated.map((r) => ({
          ...r,
          rank: rankMap.get(r.lane) ?? (r.finishTime > 0 ? r.rank : undefined)
        }))
      };
    }

    return { runners: updated };
  }),

  setLaneFinish: (lane, finishTime, rank, snapshotUrl) => set((state) => {
    const updated = state.runners.map((r) => {
      if (r.lane !== lane) return r;
      return {
        ...r,
        finishTime,
        rank: rank || r.rank,
        crossingSnapshot: snapshotUrl || r.crossingSnapshot
      };
    });

    const finished = updated
      .filter((r) => r.finishTime > 0 && r.status === 'OK')
      .sort((a, b) => a.finishTime - b.finishTime);

    const rankMap = new Map<number, number>();
    finished.forEach((r, idx) => {
      rankMap.set(r.lane, idx + 1);
    });

    return {
      runners: updated.map((r) => ({
        ...r,
        rank: rankMap.get(r.lane) ?? r.rank
      }))
    };
  }),

  recalculateRanks: () => set((state) => {
    const finished = state.runners
      .filter((r) => r.finishTime > 0 && r.status === 'OK')
      .sort((a, b) => a.finishTime - b.finishTime);

    const rankMap = new Map<number, number>();
    finished.forEach((r, idx) => {
      rankMap.set(r.lane, idx + 1);
    });

    return {
      runners: state.runners.map((r) => ({
        ...r,
        rank: rankMap.get(r.lane) ?? (r.finishTime > 0 ? r.rank : undefined)
      }))
    };
  }),

  resetRunners: (count) => set((state) => {
    const laneCount = count || state.runners.length || 4;
    return {
      runners: Array.from({ length: laneCount }, (_, i) => {
        const lane = i + 1;
        const existing = state.runners.find((r) => r.lane === lane);
        if (existing) {
          return {
            ...existing,
            finishTime: 0,
            reactionTime: undefined,
            rank: undefined,
            status: 'OK',
            crossingSnapshot: undefined
          };
        }
        return {
          id: lane,
          bib: 100 + lane,
          name: `عداء الرواق ${lane}`,
          country: 'نادي محلي',
          lane,
          color: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'][(lane - 1) % 8],
          finishTime: 0,
          status: 'OK'
        };
      })
    };
  })
}));
