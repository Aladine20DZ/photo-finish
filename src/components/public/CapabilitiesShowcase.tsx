/**
 * PHOTO FINISH PRO AI — Visual Capabilities Showcase
 * High-fidelity code-drawn interactive mockups demonstrating system capabilities.
 */

import React from 'react';
import { 
  Timer, 
  Layers, 
  Radar, 
  Trophy, 
  WifiOff, 
  FileText, 
  Scan, 
  Sparkles
} from 'lucide-react';

export const CapabilitiesShowcase: React.FC<{ onLaunchFeature?: (featureId: string) => void }> = ({ onLaunchFeature }) => {

  const capabilities = [
    {
      id: 'slit_scan',
      icon: Timer,
      title: 'Photo Finish حقيقي بالمسح الشريطي',
      badge: 'دقة 1/1000 ثانية',
      description: 'تحويل كاميرا الهاتف إلى كاميرا مسح عمودي (Slit-Scan) تسحب شرائح 1-2 بكسل بدقة 60 إطاراً في الثانية مع خيط قياس زمني تفاعلي لتحديد عبور الجذع بدقة مليمترية.',
      mock: <SlitScanMockup />,
    },
    {
      id: 'quad_phone',
      icon: Layers,
      title: 'منظومة الهواتف الأربعة المتزامنة',
      badge: 'كمون 1-3ms',
      description: 'مزامنة دقيقة بين هاتف مسدس البداية الصوتي، هاتف كاميرا خط النهاية، هاتف الحكم العام، وهاتف غرفة النداء دون الحاجة لكابلات أو أجهزة خارجية باهظة.',
      mock: <QuadPhoneMockup />,
    },
    {
      id: 'checkpoints',
      icon: Radar,
      title: 'نقاط المراقبة الذكية وكشف الغش',
      badge: 'رموز QR مشفرة',
      description: 'تسجيل عبور العدائين أوفلاين في مسابقات اختراق الضاحية ونصف الماراثون، مع كشف فوري للقص والتجاوزات واحتساب الترتيب الفئوي تلقائياً.',
      mock: <CheckpointMockup />,
    },
    {
      id: 'field_events',
      icon: Trophy,
      title: 'مسابقات الميدان: القفز والرمي',
      badge: 'قاعدة كسر التعادل 181',
      description: 'لوحة رقمية متخصصة لمحاولات الوثب العالي، القفز بالزانة، والرمي مع حساب تلقائي لأفضل محاولة وتطبيق قواعد كسر التعادل الأولمبية (Countback).',
      mock: <FieldEventsMockup />,
    },
    {
      id: 'offline_crdt',
      icon: WifiOff,
      title: 'جاهزية كاملة للعمل دون إنترنت',
      badge: 'مزامنة CRDT ذكية',
      description: 'يعمل النظام في الملاعب النائية ومسارات الضاحية الصعبة دون شبكة، مع حزمة منافسة محلية ومزامنة تلقائية خالية من النزاعات عند توفر الاتصال.',
      mock: <OfflineSyncMockup />,
    },
    {
      id: 'official_reports',
      icon: FileText,
      title: 'التقارير الرسمية والاعتماد الرياضي',
      badge: 'لوائح الاتحاد الدولي',
      description: 'تصدير محاضر التحكيم الرسمية وصور الـ Photo Finish المعتمدة وشهادات التتويج بدقة طباعة عالية متضمنة سرعة الرياح وتوقيع الحكام.',
      mock: <CertifiedReportMockup />,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 scroll-mt-16">
      
      {/* رأس القسم */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-black mb-3 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>قدرات تقنية بمستوى الأولمبياد وبطولات العالم</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
          منظومة رقمية شاملة لكل متطلبات ألعاب القوى
        </h2>
        <p className="text-sm sm:text-base text-slate-300 mt-3 font-medium">
          تم تصميم النظام ليعالج كافة التحديات الميدانية التي تواجه الحكام والمدربين والاتحادات في الميدان.
        </p>
      </div>

      {/* شبكة البطاقات التفاعلية */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {capabilities.map((c) => (
          <article
            key={c.id}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-300 overflow-hidden flex flex-col group shadow-xl hover:shadow-emerald-950/40"
          >
            {/* الشاشة التجريبية المصغرة */}
            <div className="h-40 bg-slate-950 relative overflow-hidden border-b border-slate-800/80">
              {c.mock}
              <div className="absolute top-3 end-3 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-slate-200 backdrop-blur-md">
                {c.badge}
              </div>
            </div>

            {/* تفاصيل البطاقة */}
            <div className="p-6 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    {c.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {c.description}
                </p>
              </div>

              {onLaunchFeature && (
                <button
                  onClick={() => onLaunchFeature(c.id)}
                  className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors self-start"
                >
                  <span>استكشف الوحدة الميدانية</span>
                  <span className="rtl:rotate-180">→</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

    </section>
  );
};

/* ═══ 1. محاكاة شريط المسح الضوئي (Slit-Scan Ribbon Mockup) ═══ */
function SlitScanMockup() {
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="flex items-end gap-1 h-24 relative overflow-hidden border-b border-emerald-500/40">
        {/* خط القياس الزمني الأحمر */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-rose-500 z-20 shadow-[0_0_8px_#ef4444]">
          <div className="absolute -top-1 -left-2 text-[9px] font-mono font-bold text-rose-400 bg-slate-950 px-1 rounded border border-rose-500">
            10.142s
          </div>
        </div>

        {/* شرائح المسح */}
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${25 + Math.abs(Math.sin(i * 0.45)) * 68}%`,
              backgroundColor: i % 8 === 4 ? '#10b981' : i % 5 === 2 ? '#f59e0b' : '#334155',
              opacity: i % 8 === 4 ? 0.95 : 0.6,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1">
        <span>00:10.00</span>
        <span className="text-rose-400 font-bold">TORSO FINISH</span>
        <span>00:10.50</span>
      </div>
    </div>
  );
}

/* ═══ 2. محاكاة مصفوفة الهواتف الأربعة (Quad-Phone Mockup) ═══ */
function QuadPhoneMockup() {
  const phones = [
    { name: 'START 🚦', role: 'مسدس البداية', color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300' },
    { name: 'FINISH 📸', role: 'كاميرا النهاية', color: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300' },
    { name: 'JUDGE ⚖️', role: 'الحكم العام', color: 'border-amber-500/60 bg-amber-950/40 text-amber-300' },
    { name: 'CALL 📋', role: 'غرفة النداء', color: 'border-purple-500/60 bg-purple-950/40 text-purple-300' },
  ];

  return (
    <div className="absolute inset-0 p-3 grid grid-cols-2 gap-2 place-content-center bg-slate-950">
      {phones.map((p, i) => (
        <div key={i} className={`p-2 rounded-xl border ${p.color} text-center flex flex-col justify-center items-center`}>
          <div className="text-[11px] font-black">{p.name}</div>
          <div className="text-[9px] opacity-75">{p.role}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══ 3. محاكاة نقاط المراقبة (Checkpoint Mockup) ═══ */
function CheckpointMockup() {
  return (
    <div className="absolute inset-0 p-4 flex flex-col justify-center gap-2 bg-slate-950">
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>نقطة المراقبة CP-02 (4.5 كم)</span>
        <span className="text-emerald-400 font-bold">● متصل أوفلاين</span>
      </div>
      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-xs font-bold text-white">الصدرية #104 — أمين بلحاج</div>
            <div className="text-[10px] text-slate-400">توقيت المرور: 14:22.40 (سليم ✓)</div>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-amber-400">المركز 1</div>
      </div>
    </div>
  );
}

/* ═══ 4. محاكاة مسابقات الميدان (Field Events Mockup) ═══ */
function FieldEventsMockup() {
  return (
    <div className="absolute inset-0 p-3 flex flex-col justify-center gap-1.5 bg-slate-950">
      <div className="text-[10px] font-bold text-slate-300 flex justify-between">
        <span>الوثب العالي رجال (نهائي)</span>
        <span className="text-amber-400 font-mono">الارتفاع: 2.24m</span>
      </div>
      <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
        <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400">2.15m: O</div>
        <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400">2.18m: O</div>
        <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-amber-300">2.21m: XO</div>
        <div className="p-1.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-bold">2.24m: O ✓</div>
      </div>
      <div className="text-[9px] text-emerald-400 text-center font-bold">
        الميدالية الذهبية معتمدة (أقل عدد محاولات فاشلة)
      </div>
    </div>
  );
}

/* ═══ 5. محاكاة المزامنة غير المتصلة (Offline Sync Mockup) ═══ */
function OfflineSyncMockup() {
  return (
    <div className="absolute inset-0 p-4 flex flex-col justify-center items-center gap-2 bg-slate-950 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
        <WifiOff className="w-3.5 h-3.5" />
        <span>وضع الميدان المستقل (Offline Mode)</span>
      </div>
      <div className="text-[11px] text-slate-400 max-w-xs">
        تم حفظ 142 تسجيلاً محلياً في ذاكرة IndexedDB الآمنة — سيتم بثها تلقائياً عند الاتصال بالشبكة
      </div>
    </div>
  );
}

/* ═══ 6. محاكاة التقرير الرياضي الرسمي (Certified Report Mockup) ═══ */
function CertifiedReportMockup() {
  return (
    <div className="absolute inset-0 p-3 flex flex-col justify-center bg-slate-950">
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-1">
          <span className="font-bold text-white">محضر النتيجة الرسمي • World Athletics</span>
          <span className="text-emerald-400 font-bold">موقع رقمياً ✓</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-300 pt-0.5">
          <span>الرياح: +1.2 m/s</span>
          <span>درجة الحرارة: 24°C</span>
          <span className="text-amber-400 font-mono">10.14s</span>
        </div>
      </div>
    </div>
  );
}

