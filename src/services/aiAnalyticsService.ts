/**
 * PHOTO FINISH PRO AI — Advanced Analytics & Tactical Intelligence Engine (Stage 8)
 * Scientific Wind Normalization, Heat Qualification (Q/q) Algorithms & Pacing Diagnostics.
 */

export interface WindNormalizationResult {
  rawTime: number;
  windMps: number;
  normalizedTimeZeroWind: number;
  deltaSeconds: number;
  advantageDescription: string;
}

export interface CandidateRunner {
  bib: string | number;
  name: string;
  heatNumber: number;
  timeSeconds: number;
}

export interface QualificationResult {
  bib: string | number;
  name: string;
  heatNumber: number;
  timeSeconds: number;
  qualificationStatus: 'Q' | 'q' | 'DNQ'; // Q = by rank, q = by time, DNQ = Did not qualify
  seedRankOverall: number;
}

export class AiAnalyticsService {
  /**
   * Scientific Wind Normalization according to World Athletics / Mureika Aerodynamic Models
   * Calculates equivalent time at 0.0 m/s wind.
   * Tailwinds (>0) assist runners; equivalent zero-wind time is SLOWER.
   * Headwinds (<0) hinder runners; equivalent zero-wind time is FASTER.
   */
  public normalizeTimeToZeroWind(
    rawTimeSeconds: number, 
    windMps: number, 
    eventDistance: number = 100
  ): WindNormalizationResult {
    if (windMps === 0 || rawTimeSeconds <= 0) {
      return {
        rawTime: rawTimeSeconds,
        windMps: 0,
        normalizedTimeZeroWind: rawTimeSeconds,
        deltaSeconds: 0,
        advantageDescription: 'رياح حيادية (0.0 م/ث)'
      };
    }

    // Aerodynamic coefficient for 100m sprint: approx 0.05 seconds per +1.0 m/s tailwind
    const dragCoeff = eventDistance === 100 ? 0.052 : eventDistance === 200 ? 0.095 : 0.04;
    
    // Wind adjustment delta: Positive wind -> positive adjustment (time was aided, so zero-wind time is slower)
    const adjustment = windMps * dragCoeff;
    const normalizedTime = Math.round((rawTimeSeconds + adjustment) * 1000) / 1000;
    const deltaSeconds = Math.round(Math.abs(normalizedTime - rawTimeSeconds) * 1000) / 1000;

    const advantageDescription = windMps > 0
      ? `رياح مساعدة (+${windMps} م/ث): كسب العداء ما يقارب ${deltaSeconds} ثانية بفضل الرياح.`
      : `رياح معاكسة (${windMps} م/ث): خسر العداء ما يقارب ${deltaSeconds} ثانية بسبب مقاومة الهواء.`;

    return {
      rawTime: rawTimeSeconds,
      windMps,
      normalizedTimeZeroWind: normalizedTime,
      deltaSeconds,
      advantageDescription
    };
  }

  /**
   * Predict / Assign Tournament Heat Qualifiers (World Athletics Rule 18)
   * Big 'Q': Top N in each heat advance automatically.
   * Small 'q': Next M fastest times across all heats advance.
   */
  public computeHeatQualifiers(
    runners: CandidateRunner[],
    autoAdvancePerHeat: number = 2, // Top 2 in each heat get 'Q'
    timeAdvanceOverall: number = 2   // Next 2 fastest times get 'q'
  ): QualificationResult[] {
    // 1. Group runners by heat
    const heatsMap = new Map<number, CandidateRunner[]>();
    for (const r of runners) {
      const list = heatsMap.get(r.heatNumber) || [];
      list.push(r);
      heatsMap.set(r.heatNumber, list);
    }

    const qualifiedBigQ = new Set<string | number>();

    // 2. Determine Big Q for each heat
    for (const [, heatRunners] of heatsMap.entries()) {
      heatRunners.sort((a, b) => a.timeSeconds - b.timeSeconds);
      const topAuto = heatRunners.slice(0, autoAdvancePerHeat);
      topAuto.forEach(r => qualifiedBigQ.add(r.bib));
    }

    // 3. Find candidates for small 'q' among remaining runners
    const remainingRunners = runners
      .filter(r => !qualifiedBigQ.has(r.bib))
      .sort((a, b) => a.timeSeconds - b.timeSeconds);

    const qualifiedSmallQ = new Set<string | number>();
    const topTimeRunners = remainingRunners.slice(0, timeAdvanceOverall);
    topTimeRunners.forEach(r => qualifiedSmallQ.add(r.bib));

    // 4. Sort all runners overall and produce final results
    const allSorted = [...runners].sort((a, b) => a.timeSeconds - b.timeSeconds);

    return allSorted.map((r, idx) => {
      let status: 'Q' | 'q' | 'DNQ' = 'DNQ';
      if (qualifiedBigQ.has(r.bib)) {
        status = 'Q';
      } else if (qualifiedSmallQ.has(r.bib)) {
        status = 'q';
      }

      return {
        bib: r.bib,
        name: r.name,
        heatNumber: r.heatNumber,
        timeSeconds: r.timeSeconds,
        qualificationStatus: status,
        seedRankOverall: idx + 1
      };
    });
  }
}

export const aiAnalyticsService = new AiAnalyticsService();
