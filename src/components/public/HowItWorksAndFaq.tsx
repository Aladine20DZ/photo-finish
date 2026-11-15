/**
 * PHOTO FINISH PRO AI — How It Works, Leagues Directory, FAQ & Footer
 * Integrated athletics federation guidance, workflow explanation, and rules compliance.
 */

import React, { useState, useEffect } from 'react';
import { portalAuthService, RegisteredLeague } from '../../services/portalAuthService';
import { athleteClubStorage } from '../../services/athleteClubStorage';
import { 
  GanttChartSquare, 
  ClipboardList, 
  Radar, 
  ChevronDown, 
  HelpCircle
} from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: 1,
      icon: GanttChartSquare,
      title: 'الرابطة تنشئ وتعتمد التظاهرة',
      description: 'يحدد المدير التنفيذي التخصصات والأصناف العمرية (أشبال، أواسط، أكابر) ويصدر أكواد التكليف الرسمية للحكام مع نشر التظاهرة في الدليل العام.',
    },
    {
      num: 2,
      icon: ClipboardList,
      title: 'مدربو الأندية يسجلون العدائين',
      description: 'يقوم المدرب باختيار التخصصات المناسبة وتوليد وصولات المشاركة مع احتساب الصنف العمري آلياً من تاريخ الميلاد ومنع التكرار.',
    },
    {
      num: 3,
      icon: Radar,
      title: 'الحكام يديرون السباق ويوثقون النتائج',
      description: 'مزامنة 4 هواتف (مسدس الانطلاق، كاميرا خط النهاية، الحكم العام، وغرفة النداء) لإصدار النتائج الرسمية المعتمدة بالمللي ثانية.',
    },
  ];

  return (
    <section className="border-t border-slate-800 bg-slate-900/40 py-20">
      <div className="mx-auto max-w-7xl px-4">
        
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/60">
            مسار العمل المتكامل
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-3">
            كيف تدير المنصة تظاهرات ألعاب القوى؟
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.num} className="relative rounded-3xl border border-slate-800 bg-slate-950/80 p-8 flex flex-col gap-4 shadow-xl">
              <span className="absolute top-5 end-6 text-5xl font-black text-slate-800/60 font-mono select-none">
                0{s.num}
              </span>
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <s.icon className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-white">{s.title}</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                {s.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export const LeaguesDirectorySection: React.FC<{ onSelectLeague?: (leagueId: string) => void }> = ({ onSelectLeague }) => {
  const [leagues, setLeagues] = useState<RegisteredLeague[]>(() => portalAuthService.getAllLeagues());
  const [clubsCount, setClubsCount] = useState<number>(0);

  useEffect(() => {
    setLeagues(portalAuthService.getAllLeagues());
    athleteClubStorage.getAllClubs().then(clubs => {
      setClubsCount(clubs.length);
    }).catch(() => {});
  }, []);

  return (
    <section className="py-20 border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800/60">
              الدليل الرسمي المعتمد
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
              دليل الرابطات والاتحادات الرياضية
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              اختر الرابطة لعرض تظاهراتها وأنديتها وميزاتها الميدانية
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {leagues.map((l) => (
            <div
              key={l.id}
              onClick={() => onSelectLeague && onSelectLeague(l.id)}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between gap-4 group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-black text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {l.shortName || l.id.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/40">
                    {l.type === 'national' ? '🇩🇿 وطني' : l.type === 'regional' ? 'جهوي' : 'ولائي'}
                  </span>
                </div>
                <h4 className="font-black text-base text-white group-hover:text-emerald-300 transition-colors">
                  {l.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <span>📍 {l.wilaya}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-500">{l.accreditationNumber || 'LAAP-2026'}</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-slate-300 font-bold">
                  🏛️ {clubsCount > 0 ? `${clubsCount} نادٍ معتمد` : 'رابطة معتمدة'}
                </span>
                <span className="text-emerald-400 font-bold group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
                  <span>استعراض</span>
                  <span className="rtl:rotate-180">→</span>
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export const FaqSection: React.FC = () => {
  const faqs = [
    {
      q: 'هل يعمل نظام التوقيت والـ Photo Finish دون اتصال بالإنترنت في الملعب؟',
      a: 'نعم، تماماً! النظام مصمم ليعمل في ظروف الملاعب والمسارات النائية دون إنترنت. حيث يتم الربط بين الهواتف إما عبر نقطة اتصال Wi-Fi محلية (Local Hotspot) بزمن كمون فائق (1-3 مللي ثانية)، أو بالبث الداخلي على نفس الجهاز. كما تُحفظ كافة النتائج والتسجيلات محلياً في ذاكرة المتصفح الآمنة.',
    },
    {
      q: 'كيف تضمن دقة الـ Photo Finish بالهواتف وفق معايير الاتحاد الدولي (World Athletics)؟',
      a: 'يستخدم النظام محرك مسح شريطي (Slit-Scan Engine) حقيقي يقتطع شريحة عمودية بعرض 1 إلى 2 بكسل من موضع خط النهاية مع كل إطار فيديو (60fps) لتشكيل شريط زمني كرونوغرافي متصل. يحدد الحكم موقع صدر العداء (Torso) باستخدام خيط القياس الزمني الرقمي (Hairline Caliper) بدقة 1/1000 من الثانية وفقاً للقاعدة الرسمية 164.2.',
    },
    {
      q: 'كيف يتم الربط بين الهواتف الأربعة؟',
      a: 'يكفي فتح الرابط المحلي أو مسح رمز الـ QR لكل دور: هاتف البداية (مسدس صوتي)، هاتف النهاية (كاميرا المسح)، هاتف الحكم العام (فحص الـ Photo Finish)، وهاتف غرفة النداء. يتم الاتصال والمزامنة تلقائياً وبشكل فوري بمجرد اختيار نفس كود الغرفة (Room Code).',
    },
    {
      q: 'ماذا يحدث إذا انطلقت طلقة خاطئة (False Start)؟',
      a: 'يتضمن هاتف البداية زر "طلقة استرجاع مزدوجة" (Recall Gunshot) تصدر طلقة تحذيرية مزدوجة مع إشارة صوتية واهتزاز وإشعار فوري يظهر على جميع شاشات الحكام لإيقاف السباق وإعادة العدائين إلى خط البداية.',
    },
    {
      q: 'هل يمكن تصدير محاضر النتائج والشهادات الرسمية؟',
      a: 'نعم، يتيح النظام تصدير محاضر النتائج الرسمية بصيغة CSV أو صور عالية الدقة (PNG) متضمنة صورة الـ Photo Finish المكبرة مع توقيت كل عداء، سرعة الرياح المقاسة، واسم المسابقة وتوقيع لجنة الحكام.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 border-t border-slate-800 bg-slate-900/50">
      <div className="mx-auto max-w-4xl px-4">
        
        <div className="text-center mb-12">
          <span className="text-xs font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/60">
            الأسئلة الشائعة
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
            كل ما تحتاج لمعرفته عن تشغيل المنصة
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full p-5 text-right flex items-center justify-between gap-4 font-black text-sm sm:text-base text-slate-100 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{f.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-900 font-medium">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export const PlatformFooter: React.FC = () => {
  return (
    <footer className="border-t border-emerald-950 bg-slate-950 py-12 text-slate-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center font-mono">
            ⏱️
          </div>
          <div>
            <div className="font-black text-sm text-white font-['Cairo',sans-serif]">
              Photo Finish Pro AI — 2026
            </div>
            <div className="text-[11px] text-slate-500">
              المنظومة الاحترافية للتوقيت الإلكتروني والتحكيم بالمسح الشريطي المزدوج
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 font-semibold">
          <span>لوائح World Athletics 164.2</span>
          <span>•</span>
          <span>توقيت NTP Monotonic</span>
          <span>•</span>
          <span>دعم العمل الكامل دون إنترنت</span>
          <span>•</span>
          <span className="text-emerald-400 font-bold">الإصدار الموحد v2.4 Pro</span>
        </div>

      </div>
    </footer>
  );
};

