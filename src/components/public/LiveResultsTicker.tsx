/**
 * PHOTO FINISH PRO AI — Live Certified Results Ticker
 * Continuous marquee ticker showing approved race times, disciplines, wind readings, and athletes.
 * Starts 100% clean with zero mock athletes for newly launched platforms.
 */

import React, { useState, useEffect } from 'react';
import { Flag, Wind, ShieldCheck } from 'lucide-react';

export interface TickerResultItem {
  id: string;
  competitionTitle: string;
  discipline: string;
  athlete: string;
  club: string;
  mark: string;
  wind?: string;
  isRecord?: boolean;
}

export const LiveResultsTicker: React.FC<{ items?: TickerResultItem[] }> = ({ items }) => {
  const [liveResults, setLiveResults] = useState<TickerResultItem[]>(() => {
    if (items && items.length > 0) return items;
    try {
      const stored = localStorage.getItem('pfp_certified_ticker_results');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  useEffect(() => {
    if (items) {
      setLiveResults(items);
      return;
    }
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('pfp_certified_ticker_results');
        if (stored) setLiveResults(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [items]);

  const hasResults = liveResults.length > 0;
  const doubled = hasResults ? [...liveResults, ...liveResults] : [];

  return (
    <section className="border-y border-emerald-950 bg-slate-900/90 text-slate-200 overflow-hidden select-none" aria-label="Live certified results ticker">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-4">
        
        {/* شارة التنبيه المباشر */}
        <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 text-xs font-black shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>النتائج المعتمدة ⏱️</span>
        </div>

        {/* الشريط المتحرك */}
        <div className="relative flex-1 overflow-hidden" dir="ltr">
          {hasResults ? (
            <div className="animate-ticker flex gap-8 whitespace-nowrap w-max py-0.5">
              {doubled.map((r, i) => (
                <span key={`${r.id}-${i}`} className="text-xs sm:text-sm flex items-center gap-2.5 px-3 py-1 rounded-lg bg-slate-950/50 border border-slate-800">
                  <Flag className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-extrabold text-slate-100">{r.competitionTitle}</span>
                  <span className="text-slate-400">· {r.discipline}</span>
                  <span className="text-emerald-300 font-black">{r.athlete}</span>
                  <span className="text-slate-400 text-xs">({r.club})</span>
                  <span className="font-mono font-black text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                    {r.mark}
                  </span>
                  {r.wind && (
                    <span className="flex items-center gap-1 text-[11px] text-cyan-300 font-mono">
                      <Wind className="w-3 h-3 text-cyan-400" />
                      {r.wind}
                    </span>
                  )}
                  {r.isRecord && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">
                      رقم قياسي ⭐
                    </span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-bold py-0.5" dir="rtl">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                الاتحاد الجزائري لألعاب القوى (FAA) • موسم 2026 • في انتظار اعتماد أولى النتائج الرسمية للمنافسات والبطولات الميدانية المعتمدة.
              </span>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
