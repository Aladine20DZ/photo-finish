/**
 * PHOTO FINISH PRO AI — Live Certified Results Ticker
 * Continuous marquee ticker showing approved race times, disciplines, wind readings, and athletes.
 */

import React from 'react';
import { Flag, Wind, Timer, Award } from 'lucide-react';

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

const DEFAULT_TICKER_RESULTS: TickerResultItem[] = [
  { id: '1', competitionTitle: 'البطولة الوطنية لألعاب القوى', discipline: '100م نهائي رجال', athlete: 'ياسين حتحات', club: 'مولودية الجزائر', mark: '10.14s', wind: '+1.2 m/s', isRecord: true },
  { id: '2', competitionTitle: 'نهائيات المضمار والميدان', discipline: '400م حواجز', athlete: 'عبد المالك لحولو', club: 'وفاق سطيف', mark: '49.02s' },
  { id: '3', competitionTitle: 'دورة القدم الذهبية', discipline: 'ريفي 6كم كبار', athlete: 'بلال مسعودي', club: 'شباب بلوزداد', mark: '18:42.65' },
  { id: '4', competitionTitle: 'تجمع وهران الدولي', discipline: '800م رجال', athlete: 'جمال سجاتي', club: 'أولمبي الشلف', mark: '1:42.50', isRecord: true },
  { id: '5', competitionTitle: 'بطولة ما بين الرابطات', discipline: '1500م سيدات', athlete: 'فاطمة الزهراء عمار', club: 'شباب قسنطينة', mark: '4:11.89' },
  { id: '6', competitionTitle: 'ملتقى قسنطينة للأشبال', discipline: '200م إناث', athlete: 'نسرين بن سالم', club: 'وداد تلمسان', mark: '24.18s', wind: '+0.8 m/s' },
];

export const LiveResultsTicker: React.FC<{ items?: TickerResultItem[] }> = ({ items = DEFAULT_TICKER_RESULTS }) => {
  const doubled = [...items, ...items];

  return (
    <section className="border-y border-emerald-950 bg-slate-900/90 text-slate-200 overflow-hidden select-none" aria-label="Live certified results ticker">
      <div className="mx-auto max-w-7xl px-4 py-2.5 flex items-center gap-4">
        
        {/* شارة التنبيه المباشر */}
        <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 text-xs font-black shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>النتائج المعتمدة ⏱️</span>
        </div>

        {/* الشريط المتحرك المتصل */}
        <div className="relative flex-1 overflow-hidden" dir="ltr">
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
        </div>

      </div>
    </section>
  );
};
