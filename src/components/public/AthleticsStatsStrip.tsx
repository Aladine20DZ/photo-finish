/**
 * PHOTO FINISH PRO AI — Athletics Statistics Strip (Stage 2)
 * Cleaned public stats strip focusing strictly on pure athletics metrics:
 * Registered Clubs, Licensed Athletes, Sanctioned Competitions, and Certified Participations.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Building2, Users, Trophy, Award } from 'lucide-react';
import { platformStatsService } from '../../services/platformStatsService';

export const AthleticsStatsStrip: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [rawStats, setRawStats] = useState(() => platformStatsService.getStats());

  useEffect(() => {
    const unsub = platformStatsService.subscribe(() => {
      setRawStats(platformStatsService.getStats());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const items = [
    { icon: Building2, value: rawStats.totalClubs,          label: 'نادٍ رياضي مسجل',           suffix: ' 🛡️' },
    { icon: Users,    value: rawStats.totalAthletes,       label: 'عداء مسجل رسمياً',          suffix: ' 🏃' },
    { icon: Trophy,   value: rawStats.totalCompetitions,   label: 'تظاهرة مبرمجة',             suffix: ' 🏆' },
    { icon: Award,    value: rawStats.totalParticipations, label: 'مشاركة مؤكدة بالنتائج',    suffix: ' ⏱️' },
  ];

  return (
    <div ref={ref} className="border-y border-white/10 bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((it, i) => (
          <CounterItem
            key={i}
            icon={it.icon}
            value={it.value}
            label={it.label}
            suffix={it.suffix}
            start={shown}
            delay={i * 80}
          />
        ))}
      </div>
    </div>
  );
};

const CounterItem: React.FC<{
  icon: React.ElementType;
  value: number;
  label: string;
  suffix?: string;
  start: boolean;
  delay: number;
}> = ({ icon: Icon, value, label, suffix, start, delay }) => {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const dur = 1200;
    let t0 = 0;
    const step = (now: number) => {
      if (!t0) t0 = now + delay;
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, value, delay]);

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-1 shadow-inner">
        <Icon className="w-5 h-5" />
      </div>
      <div className="tnum text-2xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight flex items-baseline gap-1">
        <span>{n.toLocaleString('ar-DZ')}</span>
        <span className="text-xs text-cyan-400 font-bold">{suffix}</span>
      </div>
      <span className="text-xs text-slate-400 font-semibold">{label}</span>
    </div>
  );
};
