/**
 * PHOTO FINISH PRO AI — Athletics Disciplines Showcase
 * Elite visual presentation showcasing the platform's core athletics specializations:
 * 1. Photo Finish & Slit-Scan (1/1000s)
 * 2. Track Sprints & Hurdles (المضمار والسرعة)
 * 3. Field Events: Jumps & Throws (الميدان: القفز والرمي)
 * 4. Cross Country & Road Racing (العدو الريفي والطريق)
 * 5. League Governance & Digital Athlete Passport (الرابطات والجواز الرقمي)
 *
 * Features smooth auto-sliding, high-definition sports imagery, interactive category pills,
 * and direct action triggers.
 */

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, ArrowRight, Play, Pause } from 'lucide-react';

export interface DisciplineSlide {
  id: string;
  category: 'sprints' | 'hurdles' | 'throws' | 'jumps' | 'cross_country' | 'photo_finish';
  title: string;
  tagline: string;
  description: string;
  badge: string;
  imageUrl: string;
  fallbackGradient: string;
  metrics: { label: string; value: string }[];
  ctaLabel: string;
  ruleCode: string;
}

const DISCIPLINE_SLIDES: DisciplineSlide[] = [
  {
    id: 'photo_finish',
    category: 'photo_finish',
    title: 'توقيت خط النهاية بالمسح الشريطي 1/1000s',
    tagline: 'World Athletics Rule 165 — الدقة الأولمبية في تحديد البطل',
    description: 'كاميرا Photo Finish رقمية بالهواتف تلتقط 1000 شريحة في الثانية مع التزامن الزمني النانوي (NTP) لكسر التعادل بدقة الجزء من الألف من الثانية.',
    badge: 'Photo Finish Camera 📸',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1600&q=80',
    fallbackGradient: 'from-emerald-950 via-slate-900 to-black',
    metrics: [
      { label: 'تردد الالتقاط', value: '1000 FPS' },
      { label: 'دقة التوقيت', value: '0.001 ثانية' },
      { label: 'كشف العبور', value: 'تلقائي بالذكاء الاصطناعي' }
    ],
    ctaLabel: 'تجربة كاميرا خط النهاية',
    ruleCode: 'TR19 / Rule 165'
  },
  {
    id: 'track_sprints',
    category: 'sprints',
    title: 'سباقات المضمار والسرعة والحواجز',
    tagline: '100م، 200م، 400م، 110م حواجز، والتتابعات الرسمية',
    description: 'إدارة متكاملة لحارات المضمار التارتان، مسدس الانطلاق الصوتي اللاسلكي، رصد الانطلاق الخاطئ (False Start)، وقياس سرعة الرياح المعتمد قانونياً.',
    badge: 'Track & Hurdles 🏃',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1600&q=80',
    fallbackGradient: 'from-cyan-950 via-slate-900 to-black',
    metrics: [
      { label: 'زمن رد الفعل', value: '< 100ms إنذار' },
      { label: 'مقياس الرياح', value: 'حد أقصى +2.0 m/s' },
      { label: 'توزيع الحارات', value: 'آلي بنظام التصفيات' }
    ],
    ctaLabel: 'لوحة حكام المضمار',
    ruleCode: 'TR16 / TR20'
  },
  {
    id: 'field_events',
    category: 'throws',
    title: 'مسابقات الميدان: الرمي والقفز',
    tagline: 'الجلة، الرمح، القرص، القفز العالي، والقفز الطويل',
    description: 'سجل تحكيمي رقمي متكامل لمسابقات الميدان مع احتساب أفضل محاولة، كسر التعادل الفوري (Countback)، ومخطط بياني لتدرج ارتفاعات العارضة.',
    badge: 'Jumps & Throws 🎯',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1600&q=80',
    fallbackGradient: 'from-amber-950 via-slate-900 to-black',
    metrics: [
      { label: 'المحاولات الرسمية', value: '6 محاولات معتمدة' },
      { label: 'كسر التعادل', value: 'تلقائي Rule 181' },
      { label: 'قياس المسافة', value: 'بالليزر والأمتار' }
    ],
    ctaLabel: 'سجل تحكيم الميدان',
    ruleCode: 'Rule 180 / 181'
  },
  {
    id: 'cross_country',
    category: 'cross_country',
    title: 'العدو الريفي وسباقات الطريق والماراثون',
    tagline: 'تتبع الحلقات، نقاط المراقبة بالـ QR، وخريطة الـ GPS الحية',
    description: 'تصميم مسارات الضاحية بخريطة حية (Leaflet & Satellite)، رصد فارق الارتفاع (Elevation Gain)، وتسجيل أوفلاين فوري بنقاط المراقبة مع كشف الشذوذ.',
    badge: 'Cross-Country & Trail 🌲',
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1600&q=80',
    fallbackGradient: 'from-teal-950 via-slate-900 to-black',
    metrics: [
      { label: 'نقاط المراقبة', value: 'تزامن أوفلاين P2P' },
      { label: 'فارق الارتفاع', value: 'حساب تلقائي D+ / D-' },
      { label: 'كشف التجاوز', value: 'خوارزمية الشذوذ الزمني' }
    ],
    ctaLabel: 'مصمم المسارات والخرائط',
    ruleCode: 'WA Cross Country'
  },
  {
    id: 'digital_passport',
    category: 'sprints',
    title: 'الجواز الرياضي الرقمي وإدارة الرابطات',
    tagline: 'ملف موحد لكل عداء • منع تكرار التسجيل • أتمتة الصدريات',
    description: 'مرجع وطني شامل يربط العداء بناديه الأصلي ورابطته الولائية، يحفظ تاريخ أرقامه القياسية ومشاركاته، ويتيح إصدار الصدريات والباركود بضغطة زر.',
    badge: 'Athletes Passport 🆔',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1600&q=80',
    fallbackGradient: 'from-purple-950 via-slate-900 to-black',
    metrics: [
      { label: 'كود العداء الموحد', value: 'ALG-SAIDA-2026' },
      { label: 'الصدريات الذكية', value: 'تخصيص مؤمن بالباركود' },
      { label: 'التراخيص المشفرة', value: 'Ed25519 أوفلاين' }
    ],
    ctaLabel: 'دخول بوابة الرابطة',
    ruleCode: 'National Athletics'
  }
];

interface AthleticsDisciplinesShowcaseProps {
  onSelectAction?: (disciplineId: string) => void;
}

export const AthleticsDisciplinesShowcase: React.FC<AthleticsDisciplinesShowcaseProps> = ({ onSelectAction }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slide = DISCIPLINE_SLIDES[currentIdx];

  // دوران تلقائي للسلايد كل 6 ثوانٍ
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % DISCIPLINE_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleNext = () => {
    setCurrentIdx((currentIdx + 1) % DISCIPLINE_SLIDES.length);
  };

  const handlePrev = () => {
    setCurrentIdx((currentIdx - 1 + DISCIPLINE_SLIDES.length) % DISCIPLINE_SLIDES.length);
  };

  return (
    <section 
      className="relative max-w-6xl mx-auto px-4 sm:px-6 my-10 overflow-hidden" 
      aria-label="Athletics Disciplines Showcase"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ═══ البطاقة الرئيسية ذات الخلفية المصورة الفاخرة ═══ */}
      <div className="relative rounded-3xl overflow-hidden border border-emerald-900/60 shadow-2xl bg-slate-950 transition-all duration-700 min-h-[460px] sm:min-h-[420px] flex flex-col justify-between dark-athletic-card">
        
        {/* الصورة الخلفية مع طبقات التدرج الداكن لتوفير أقصى وضوح للنصوص */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
          style={{ backgroundImage: `url(${slide.imageUrl})` }}
        />
        
        {/* طبقة التدرج العميق لضمان قراءة فائقة */}
        <div className={`absolute inset-0 bg-gradient-to-r ${slide.fallbackGradient} opacity-92`} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent opacity-95" />

        {/* ═══ الرأس: شارة التخصص + أزرار التبديل ═══ */}
        <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-black shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {slide.badge}
            </span>
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-amber-400 text-xs font-mono font-bold">
              {slide.ruleCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title={isPaused ? 'استئناف العرض التلقائي' : 'إيقاف مؤقت'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              aria-label="السابق"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              aria-label="التالي"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />
            </button>
          </div>
        </div>

        {/* ═══ جسم البطاقة: العناوين والمقاييس والإجراء ═══ */}
        <div className="relative z-10 px-6 sm:px-8 py-4 space-y-4 max-w-3xl">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight font-['Cairo',sans-serif]">
            {slide.title}
          </h2>
          <p className="text-amber-300 font-bold text-xs sm:text-sm">
            {slide.tagline}
          </p>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium">
            {slide.description}
          </p>

          {/* مقاييس التخصص الحية */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {slide.metrics.map((m, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow">
                <div className="text-[10px] text-slate-400 font-semibold">{m.label}</div>
                <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ أسفل البطاقة: مؤشرات السلايد وأزرار الانتقال المباشر ═══ */}
        <div className="relative z-10 p-6 sm:p-8 pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/60">
          
          {/* مؤشرات التبويب للسلايدات الخمسة */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {DISCIPLINE_SLIDES.map((s, idx) => {
              const active = idx === currentIdx;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    active ? 'w-10 bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'w-2.5 bg-slate-800 hover:bg-slate-700'
                  }`}
                  title={s.title}
                  aria-label={`انتقل إلى ${s.title}`}
                />
              );
            })}
          </div>

          {/* زر التفاعل المباشر */}
          <button
            onClick={() => onSelectAction && onSelectAction(slide.id)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-950 transition-all cursor-pointer"
          >
            <span>{slide.ctaLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

      </div>
    </section>
  );
};
