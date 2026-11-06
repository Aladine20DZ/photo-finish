/**
 * PHOTO FINISH PRO AI — Slit-Scan Hero Experience
 * Real-time 2D Canvas Slit-Scan simulation with dynamic track runners,
 * animated scanning line, and high-frequency millisecond chronometer.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Radio, ArrowDown, Timer, ShieldCheck, Trophy, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { useTranslation } from '../../services/i18nService';

interface SlitScanHeroProps {
  onEnterFieldMode: () => void;
  onExploreCompetitions?: () => void;
  onOpenLeague?: () => void;
  onOpenCoach?: () => void;
}

export const SlitScanHero: React.FC<SlitScanHeroProps> = ({
  onEnterFieldMode,
  onExploreCompetitions,
  onOpenLeague,
  onOpenCoach,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ms, setMs] = useState(0);

  // ═══ محاكاة المسح الشريطي الواقعي على الكانفاس ═══
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let W = 0, H = 0;
    const dpr = Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 2);

    const scene = document.createElement('canvas');
    const sctx = scene.getContext('2d');
    if (!sctx) return;

    const resize = () => {
      const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: 480 };
      W = Math.floor(rect.width) || 800;
      H = Math.floor(rect.height) || 480;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      scene.width = W;
      scene.height = H;
    };
    resize();
    window.addEventListener('resize', resize);

    // مشهد العدّائين على المضمار
    const drawScene = (time: number) => {
      const g = sctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#060a12');
      g.addColorStop(0.55, '#0b1626');
      g.addColorStop(1, '#1a120c');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, W, H);

      // حارات المضمار التارتان
      const laneY = H * 0.76;
      for (let i = 0; i < 6; i++) {
        sctx.strokeStyle = `rgba(255, 255, 255, ${0.12 - i * 0.015})`;
        sctx.lineWidth = 2;
        sctx.beginPath();
        sctx.moveTo(0, laneY + i * (H * 0.045));
        sctx.lineTo(W, laneY + i * (H * 0.045));
        sctx.stroke();
      }

      // خط النهاية العمودي النابض
      sctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      sctx.lineWidth = 3;
      sctx.setLineDash([6, 4]);
      sctx.beginPath();
      sctx.moveTo(W * 0.5, 0);
      sctx.lineTo(W * 0.5, H);
      sctx.stroke();
      sctx.setLineDash([]);

      // رسم عدّائين بأطراف متحركة
      const runner = (x: number, scale: number, phase: number, tint: string, bib: string) => {
        const y = laneY - 10 * scale;
        sctx.save();
        sctx.translate(((x % (W + 240)) - 120), y);
        sctx.scale(scale, scale);

        // الجذع (Torso)
        sctx.fillStyle = tint;
        sctx.beginPath();
        sctx.ellipse(0, -34, 10, 18, 0.18, 0, Math.PI * 2);
        sctx.fill();

        // رقم الصدرية (Bib)
        sctx.fillStyle = '#ffffff';
        sctx.font = 'bold 8px sans-serif';
        sctx.textAlign = 'center';
        sctx.fillText(bib, 0, -32);

        // الرأس
        sctx.fillStyle = tint;
        sctx.beginPath();
        sctx.arc(4, -58, 8, 0, Math.PI * 2);
        sctx.fill();

        // الأرجل
        const leg = Math.sin(phase) * 18;
        sctx.strokeStyle = tint;
        sctx.lineWidth = 5;
        sctx.lineCap = 'round';
        sctx.beginPath();
        sctx.moveTo(0, -20);
        sctx.lineTo(leg, 6);
        sctx.moveTo(0, -20);
        sctx.lineTo(-leg, 6);
        sctx.stroke();

        // الذراعان
        sctx.lineWidth = 4;
        sctx.beginPath();
        sctx.moveTo(0, -42);
        sctx.lineTo(-leg * 0.7, -30);
        sctx.moveTo(0, -42);
        sctx.lineTo(leg * 0.7, -52);
        sctx.stroke();

        sctx.restore();
      };

      runner(time * 0.18, H / 180, time * 0.013, '#10b981', '101');
      runner(time * 0.14 + W * 0.45, H / 200, time * 0.011 + 1.6, '#f59e0b', '204');
      runner(time * 0.11 + W * 0.75, H / 215, time * 0.009 + 3.1, '#06b6d4', '308');
    };

    const STRIP = 3;
    let column = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = now - last;
      last = now;

      drawScene(now);

      // تقدم المسح الشريطي
      column = (column + Math.max(1, Math.round(dt / 7))) % W;
      for (let i = 0; i < STRIP; i++) {
        const sx = (column * STRIP + i) % W;
        ctx.drawImage(scene, sx, 0, 1, H, sx, 0, 1, H);
      }

      // أثر التمرير الزمني البصري
      ctx.fillStyle = 'rgba(2, 6, 23, 0.012)';
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      drawScene(3500);
      ctx.drawImage(scene, 0, 0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // ═══ عداد زمني حي فائق الدقة بالمللي ثانية ═══
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setMs(performance.now() % 100000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const secs = (ms / 1000).toFixed(2).padStart(5, '0');
  const mss = Math.floor(ms % 100).toString().padStart(2, '0');

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white border-b border-emerald-950" aria-label="Hero">
      {/* خلفية الكانفاس الحية للمسح الشريطي */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-65 pointer-events-none" aria-hidden />

      {/* تدرج لوني عميق لمنح وضوح فائق للنصوص */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40 pointer-events-none" />

      {/* خط الليزر الضوئي المتحرك (Slit-Scan Laser Line) */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-b from-emerald-500/80 to-transparent animate-scanline pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-16 sm:pt-24 sm:pb-24 flex flex-col items-center text-center gap-6 z-10">
        
        {/* الشارة العليا النابضة */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 backdrop-blur-md px-4 py-1.5 text-xs font-black text-emerald-300 shadow-xl shadow-emerald-950/60">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>منظومة التوقيت الرقمي الأولمبي بالمسح الشريطي (Slit-Scan 60fps)</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-amber-400 font-mono">1/1000s</span>
        </div>

        {/* العنوان الرئيسي المبهر */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.18] tracking-tight max-w-4xl font-['Cairo',sans-serif]">
          كل خط نهاية{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 via-teal-300 to-amber-300">
            يستحق حكماً رقمياً فائق الدقة
          </span>
        </h1>

        {/* النص التوضيحي */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-3xl leading-relaxed font-medium">
          منصة موحدة ذكية تجمع إدارة الرابطات الرياضية، تسجيل المدربين للأندية، التحكيم بكاميرا الـ Photo Finish بالهواتف، ونقاط المراقبة بالـ QR مع حساب النتائج الرسمية لحظياً بموجب لوائح الاتحاد الدولي (World Athletics).
        </p>

        {/* العداد الزمني المباشر عالي التباين */}
        <div 
          className="tnum select-none text-4xl sm:text-6xl font-black text-slate-100 bg-slate-900/90 border-2 border-emerald-500/40 rounded-3xl px-8 py-4 backdrop-blur-xl shadow-2xl shadow-emerald-950 flex items-baseline gap-2 font-mono"
          dir="ltr" 
          aria-label="live clock"
        >
          <Timer className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 self-center animate-spin" style={{ animationDuration: '8s' }} />
          <span>00:{secs}</span>
          <span className="text-emerald-400 text-3xl sm:text-5xl">.{mss}</span>
          <span className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-widest ms-2 self-center bg-slate-800 px-2 py-1 rounded-md">
            LIVE NTP
          </span>
        </div>

        {/* أزرار الإجراء السريع المنسقة */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2 w-full max-w-xl">
          <button
            onClick={onEnterFieldMode}
            className="flex-1 min-w-[220px] h-13 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-950/80 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Timer className="w-5 h-5 text-slate-950" />
            <span>دخول نظام التوقيت الميداني (4 هواتف)</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>

          {onExploreCompetitions && (
            <button
              onClick={onExploreCompetitions}
              className="h-13 px-6 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>استعراض التظاهرات والنتائج</span>
            </button>
          )}

          {onOpenLeague && (
            <button
              onClick={onOpenLeague}
              className="h-11 px-5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-emerald-900/60 text-emerald-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>جناح الرابطات والتراخيص</span>
            </button>
          )}

          {onOpenCoach && (
            <button
              onClick={onOpenCoach}
              className="h-11 px-5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-amber-900/60 text-amber-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>معالج تسجيل المدربين</span>
            </button>
          )}
        </div>

        {/* مؤشر التمرير لأسفل */}
        {onExploreCompetitions && (
          <button
            onClick={onExploreCompetitions}
            className="mt-4 text-slate-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-xs font-bold"
            aria-label="Scroll to competitions"
          >
            <span>استعراض النتائج المعتمدة والأندية</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </button>
        )}

      </div>
    </section>
  );
};
