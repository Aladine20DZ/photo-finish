/**
 * PHOTO FINISH PRO AI — Public Portal & Hero Experience (Upgraded)
 * Elite Athletics Federation Portal: World Athletics & Diamond League Aesthetics.
 * Live Results, Certified Leaderboards, Competition Calendar, Medal Standings & Slit-Scan Showcase.
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  Calendar, 
  MapPin, 
  Wind, 
  Timer, 
  Building2, 
  Sparkles,
  Medal,
  ChevronRight,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { 
  publicPortalService, 
  PublicCompetition, 
  PublicResult, 
  PublicClub 
} from '../../services/publicPortalService';
import { useTranslation } from '../../services/i18nService';

interface PublicPortalProps {
  onEnterFieldMode?: () => void;
}

type ActiveViewTab = 'results' | 'calendar' | 'clubs' | 'standings';

export const PublicPortal: React.FC<PublicPortalProps> = ({ onEnterFieldMode }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('results');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [competitions, setCompetitions] = useState<PublicCompetition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<PublicCompetition | null>(null);
  const [results, setResults] = useState<PublicResult[]>([]);
  const [clubs, setClubs] = useState<PublicClub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const comps = await publicPortalService.getPublishedCompetitions();
      const clubList = await publicPortalService.getClubsDirectory();
      setCompetitions(comps);
      setClubs(clubList);

      if (comps.length > 0) {
        setSelectedCompetition(comps[0]);
        const res = await publicPortalService.getCertifiedResults(comps[0].id);
        setResults(res);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompetition = async (comp: PublicCompetition) => {
    setSelectedCompetition(comp);
    const res = await publicPortalService.getCertifiedResults(comp.id);
    setResults(res);
  };

  const filteredCompetitions = competitions.filter(c => {
    if (selectedType !== 'all' && c.competition_type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.venue.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q));
    }
    return true;
  });

  const formatTime = (millis: number | null): string => {
    if (millis === null || millis === undefined) return '-';
    const totalSec = millis / 1000;
    return totalSec.toFixed(2) + 's';
  };

  // بيانات جدول الميداليات وترتيب الفرق بموجب World Athletics Rule 19
  const medalStandings = [
    { rank: 1, club: 'مولودية الجزائر (MCA)', city: 'الجزائر العاصمة', gold: 5, silver: 3, bronze: 2, totalPoints: 36 },
    { rank: 2, club: 'وفاق سطيف لألعاب القوى (ESS)', city: 'سطيف', gold: 4, silver: 2, bronze: 3, totalPoints: 29 },
    { rank: 3, club: 'أولمبي الشلف للضاحية (ASO)', city: 'الشلف', gold: 3, silver: 4, bronze: 1, totalPoints: 28 },
    { rank: 4, club: 'شباب قسنطينة (CSC)', city: 'قسنطينة', gold: 2, silver: 3, bronze: 4, totalPoints: 23 },
    { rank: 5, club: 'وداد تلمسان (WAT)', city: 'تلمسان', gold: 1, silver: 2, bronze: 2, totalPoints: 13 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* ═══ 1. Hero Experience (واجهة الاتحادات الرياضية الكبرى) ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950/70 via-slate-950 to-slate-950 border-b border-emerald-900/30 pt-10 pb-16 px-4 sm:px-6">
        
        {/* خلفية خطوط مضمار ألعاب القوى التارتان المنحنية (Watermark Stadium Lanes) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-100 600 C 200 600, 400 300, 600 300 C 800 300, 1000 600, 1300 600" stroke="#10b981" strokeWidth="2" strokeDasharray="8 8" />
            <path d="M-100 550 C 200 550, 400 250, 600 250 C 800 250, 1000 550, 1300 550" stroke="#10b981" strokeWidth="2" />
            <path d="M-100 500 C 200 500, 400 200, 600 200 C 800 200, 1000 500, 1300 500" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M-100 450 C 200 450, 400 150, 600 150 C 800 150, 1000 450, 1300 450" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="600" cy="150" r="120" stroke="#10b981" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>

        {/* تأثيرات الإضاءة الرياضية الاحترافية (Stadium Spotlights) */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          
          {/* الشارة الرسمية العليا */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-900/60 to-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-black shadow-xl shadow-emerald-950">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>المنصة الرقمية المعتمدة للبطولات والتوقيت اللحظي 2026</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* البانر الشرفي للبطولة الأبرز الآن (Championship Spotlight Card) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-emerald-950/40 border border-emerald-500/30 shadow-2xl backdrop-blur-xl mb-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-3 h-full bg-gradient-to-b from-amber-400 to-emerald-500" />
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-rose-950/90 border border-rose-500/60 text-rose-300 text-xs font-black flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    البطولة الرئيسية الجارية الآن 🔴
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-300 text-xs font-extrabold border border-emerald-800/60">
                    نهائيات المضمار والميدان
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight font-['Cairo',sans-serif]">
                  البطولة الوطنية لألعاب القوى للأكابر 2026
                </h1>

                <p className="text-slate-300 text-xs sm:text-sm font-medium flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    ملعب 5 جويلية 1962، المركب الأولمبي، الجزائر العاصمة
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    15 - 17 جوان 2026
                  </span>
                </p>
              </div>

              {/* أزرار الإجراء السريع */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => onEnterFieldMode && onEnterFieldMode()}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <Timer className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                  <span>دخول غرفة التحكيم والميدان</span>
                </button>
                <button
                  onClick={() => setActiveTab('results')}
                  className="px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>استعراض لقطات Photo Finish</span>
                </button>
              </div>

            </div>

            {/* بطاقات الإحصائيات الرياضية السريعة (Athletics Stat Strips) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                <div className="text-[10px] font-bold text-slate-400 mb-0.5">دقة المسح الشريطي</div>
                <div className="text-lg sm:text-xl font-black text-emerald-300 font-mono">1/1000s</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                <div className="text-[10px] font-bold text-slate-400 mb-0.5">العداؤون المسجلون</div>
                <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">420+ بطلاً</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                <div className="text-[10px] font-bold text-slate-400 mb-0.5">الأندية والرابطات</div>
                <div className="text-lg sm:text-xl font-black text-cyan-300 font-mono">18 نادياً</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                <div className="text-[10px] font-bold text-slate-400 mb-0.5">اللوائح الدولية</div>
                <div className="text-lg sm:text-xl font-black text-slate-200">World Athletics</div>
              </div>
            </div>

          </div>

          {/* محرك البحث الرياضي الذكي والتصفية */}
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 text-emerald-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن بطولة، عداء، نادي رياضي، أو رقم الصدر..."
                className="w-full pr-12 pl-4 py-3.5 bg-slate-900/90 border border-emerald-600/40 focus:border-emerald-400 rounded-2xl text-slate-100 placeholder-slate-500 text-sm font-semibold shadow-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            {/* أزرار الفئات الرياضية */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { id: 'all', label: '🏆 جميع المنافسات' },
                { id: 'track_and_field', label: '🏃 المضمار والسرعة' },
                { id: 'cross_country', label: '🌲 العدو الريفي' },
                { id: 'road_race', label: '🛣️ سباقات الطريق 10K/21K' },
                { id: 'trail', label: '⛰️ التريل الجبلي' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedType === tab.id
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-950 ring-1 ring-emerald-400'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ═══ 2. شريط التبويب الرئيسي للأقسام (Segmented Section Switcher) ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-20">
        <div className="p-1.5 rounded-2xl bg-slate-900/95 border border-emerald-900/50 shadow-2xl backdrop-blur-xl flex items-center justify-between overflow-x-auto no-scrollbar gap-1">
          {[
            { id: 'results' as ActiveViewTab, label: 'النتائج المباشرة ومنصة التتويج', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
            { id: 'calendar' as ActiveViewTab, label: 'رزنامة وبرنامج المنافسات', icon: <Calendar className="w-4 h-4 text-emerald-400" /> },
            { id: 'standings' as ActiveViewTab, label: 'ترتيب الأندية والميداليات (Rule 19)', icon: <Medal className="w-4 h-4 text-amber-300" /> },
            { id: 'clubs' as ActiveViewTab, label: 'دليل الأندية والرابطات المعتمدة', icon: <Building2 className="w-4 h-4 text-cyan-400" /> },
          ].map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-950/80 ring-1 ring-emerald-400/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 3. محتوى الأقسام التفاعلية (Interactive Views) ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        {loading && (
          <div className="p-4 text-center text-xs font-bold text-emerald-400 animate-pulse flex items-center justify-center gap-2">
            <Timer className="w-4 h-4 animate-spin" />
            <span>جارٍ تحميل النتائج والروزنامة المعتمدة...</span>
          </div>
        )}
        
        {/* ═══ التبويب 1: النتائج المباشرة ومنصة التتويج ═══ */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            
            {/* بطاقة المنصة العليا لنهائي السباق */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-emerald-900/50 shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 text-[11px] font-black border border-emerald-800">
                      TRACK 100M FINAL
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {selectedCompetition ? selectedCompetition.name : 'البطولة الوطنية لألعاب القوى'} • نهائي 100م رجال
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    منصة التتويج والنتائج الرسمية المعتمدة
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
                    <Wind className="w-4 h-4 text-emerald-400" />
                    <span>الريح: +1.2 m/s (قانونية ✅)</span>
                  </div>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-700/60 shadow">
                    {t('certified_badge')}
                  </span>
                </div>
              </div>

              {/* منصة التتويج البصرية الثلاثية (Visual Podium 1st, 2nd, 3rd) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                
                {/* المركز الثاني (فضة) */}
                <div className="p-5 rounded-2xl bg-gradient-to-t from-slate-900 to-slate-800/80 border border-slate-700/80 text-center relative order-2 md:order-1 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-full bg-slate-700/80 border-2 border-slate-400 flex items-center justify-center text-xl mx-auto mb-3 shadow">
                    🥈
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">المركز الثاني</div>
                    <div className="text-base font-black text-white">سفيان البقالي</div>
                    <div className="text-xs text-slate-400">المغرب 🇲🇦 • نادي الفتح</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/60">
                    <span className="text-xl font-black font-mono text-slate-200">10.04s</span>
                    <span className="text-[10px] text-slate-400 mr-2">(+0.08s)</span>
                  </div>
                </div>

                {/* المركز الأول (ذهب) - بارز وأعلى */}
                <div className="p-6 rounded-2xl bg-gradient-to-t from-emerald-950/80 via-slate-900 to-amber-950/40 border-2 border-amber-400/80 text-center relative order-1 md:order-2 shadow-2xl flex flex-col justify-between transform md:-translate-y-2">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                    Champion • بطل السباق
                  </div>
                  <div className="w-14 h-14 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg shadow-amber-400/20">
                    🥇
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300">المركز الأول والميدالية الذهبية</div>
                    <div className="text-lg font-black text-white">يوسف العبدلي</div>
                    <div className="text-xs text-emerald-400 font-bold">الجزائر 🇩🇿 • مولودية الجزائر (MCA)</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-500/30">
                    <span className="text-2xl font-black font-mono text-amber-300">09.96s</span>
                    <span className="text-[11px] font-bold text-emerald-400 mr-2 bg-emerald-950/80 px-2 py-0.5 rounded">PB رقم قياسي</span>
                  </div>
                </div>

                {/* المركز الثالث (برونز) */}
                <div className="p-5 rounded-2xl bg-gradient-to-t from-slate-900 to-amber-950/30 border border-amber-800/60 text-center relative order-3 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-full bg-amber-900/60 border-2 border-amber-600 flex items-center justify-center text-xl mx-auto mb-3 shadow">
                    🥉
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">المركز الثالث</div>
                    <div className="text-base font-black text-white">توفيق مخلوفي</div>
                    <div className="text-xs text-slate-400">الجزائر 🇩🇿 • وفاق سطيف (ESS)</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/60">
                    <span className="text-xl font-black font-mono text-amber-500">10.12s</span>
                    <span className="text-[10px] text-slate-400 mr-2">(+0.16s)</span>
                  </div>
                </div>

              </div>

              {/* جدول النتائج التفصيلي الكامل */}
              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4">الرتبة</th>
                        <th className="py-3.5 px-3">الصدر</th>
                        <th className="py-3.5 px-4">العداء</th>
                        <th className="py-3.5 px-4">النادي والوفد</th>
                        <th className="py-3.5 px-4">الزمن الرسمي</th>
                        <th className="py-3.5 px-3">رد الفعل</th>
                        <th className="py-3.5 px-3">الرياح</th>
                        <th className="py-3.5 px-4">ملاحظات التحكيم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {results.map((res) => {
                        const isGold = res.rank === 1;
                        const isSilver = res.rank === 2;
                        const isBronze = res.rank === 3;
                        return (
                          <tr key={res.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-black">
                              {isGold && <span className="inline-flex items-center gap-1 text-amber-300 font-black text-sm">🥇 1</span>}
                              {isSilver && <span className="inline-flex items-center gap-1 text-slate-300 font-black text-sm">🥈 2</span>}
                              {isBronze && <span className="inline-flex items-center gap-1 text-amber-500 font-black text-sm">🥉 3</span>}
                              {!isGold && !isSilver && !isBronze && <span className="text-slate-400 font-bold">{res.rank}</span>}
                            </td>
                            <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">{res.bib_number}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-100">{res.athlete_name}</td>
                            <td className="py-3.5 px-4 text-slate-300">{res.club_name}</td>
                            <td className="py-3.5 px-4 font-mono font-black text-amber-300 text-sm">
                              {formatTime(res.time_millis)}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-slate-400">
                              {res.reaction_time_millis ? `${res.reaction_time_millis}ms` : '-'}
                            </td>
                            <td className="py-3.5 px-3 text-slate-300 flex items-center gap-1 pt-4">
                              <Wind className="w-3 h-3 text-emerald-500" />
                              <span>{res.wind_reading !== null ? `+${res.wind_reading}m/s` : '+1.2m/s'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-slate-400">
                              {res.notes || 'مصدق رسمياً'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ═══ التبويب 2: رزنامة وبرنامج المنافسات ═══ */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>الروزنامة الرسمية للبطولات المعتمدة 2026</span>
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                {filteredCompetitions.length} مسابقة مبرمجة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCompetitions.map(comp => {
                const isLive = comp.status === 'in_progress';
                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      handleSelectCompetition(comp);
                      setActiveTab('results');
                    }}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/70 hover:bg-slate-900 transition-all cursor-pointer shadow-lg group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                        isLive 
                          ? 'bg-rose-950 text-rose-300 border border-rose-700/60 animate-pulse'
                          : comp.status === 'upcoming'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isLive ? 'جارية الآن 🔴' : comp.status === 'upcoming' ? 'قادمة 📅' : 'منتهية 🏁'}
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {comp.start_date}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                      {comp.name}
                    </h4>

                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{comp.venue} • {comp.city || 'الجزائر'}</span>
                    </p>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>عرض النتائج والجدول</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-[-3px] transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ التبويب 3: جدول الميداليات وترتيب الفرق Rule 19 ═══ */}
        {activeTab === 'standings' && (
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-emerald-900/50 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-400" />
                  <span>جدول ترتيب الفرق وحصيلة الميداليات (World Athletics Rule 19)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  نظام الترتيب الرسمي المعتمد: 5 نقاط للميدالية الذهبية، 3 للفضية، 1 للبرونزية مع كسر التعادل
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-950 text-amber-300 border border-amber-700/60 text-xs font-black">
                درع البطولة العام 🏆
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">الترتيب</th>
                    <th className="py-3 px-4">النادي الرياضي</th>
                    <th className="py-3 px-4">الولاية / المدينة</th>
                    <th className="py-3 px-3 text-center">🥇 ذهب</th>
                    <th className="py-3 px-3 text-center">🥈 فضة</th>
                    <th className="py-3 px-3 text-center">🥉 برونز</th>
                    <th className="py-3 px-4 text-center font-mono font-black text-amber-300">مجموع النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {medalStandings.map((st) => (
                    <tr key={st.rank} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-black">
                        {st.rank === 1 && <span className="text-amber-300 font-black text-sm">🥇 الأول</span>}
                        {st.rank === 2 && <span className="text-slate-300 font-black text-sm">🥈 الثاني</span>}
                        {st.rank === 3 && <span className="text-amber-600 font-black text-sm">🥉 الثالث</span>}
                        {st.rank > 3 && <span className="text-slate-400 font-bold">{st.rank}</span>}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white text-sm">{st.club}</td>
                      <td className="py-3.5 px-4 text-slate-400">{st.city}</td>
                      <td className="py-3.5 px-3 text-center font-black text-amber-300 text-sm font-mono">{st.gold}</td>
                      <td className="py-3.5 px-3 text-center font-black text-slate-300 text-sm font-mono">{st.silver}</td>
                      <td className="py-3.5 px-3 text-center font-black text-amber-600 text-sm font-mono">{st.bronze}</td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-400 text-base font-mono bg-emerald-950/20">
                        {st.totalPoints} نقطة
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ التبويب 4: دليل الأندية والرابطات ═══ */}
        {activeTab === 'clubs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <span>دليل الأندية والرابطات الرياضية المعتمدة</span>
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                {clubs.length} أندية مسجلة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {clubs.map(club => (
                <div key={club.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center gap-3.5 shadow">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-700/60 flex items-center justify-center font-black text-sm text-emerald-300 shadow shrink-0">
                    {club.code}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{club.name}</h4>
                    <p className="text-xs text-slate-400 truncate">{club.city || 'الجزائر'} • نادي رياضي معتمد</p>
                    <span className="inline-block mt-1 text-[10px] text-emerald-400 font-bold">
                      رخصة سارية 2026 ✅
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

