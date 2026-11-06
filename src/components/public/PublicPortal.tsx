/**
 * PHOTO FINISH PRO AI — Public Portal & Hero Experience (Unified Master Edition)
 * Elite Athletics Federation Portal: World Athletics & Diamond League Aesthetics.
 * Live Slit-Scan Canvas Hero, Certified Results Ticker, Real-time Leaderboards,
 * Medal Standings (Rule 19), Visual Capabilities Showcase, and Leagues Directory.
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
  Eye,
  Flag,
  Radio,
  ExternalLink
} from 'lucide-react';
import { 
  publicPortalService, 
  PublicCompetition, 
  PublicResult, 
  PublicClub 
} from '../../services/publicPortalService';
import { useTranslation } from '../../services/i18nService';
import { SlitScanHero } from './SlitScanHero';
import { AthleticsStatsStrip } from './AthleticsStatsStrip';
import { LiveResultsTicker } from './LiveResultsTicker';
import { CapabilitiesShowcase } from './CapabilitiesShowcase';
import { HowItWorksSection, LeaguesDirectorySection, FaqSection, PlatformFooter } from './HowItWorksAndFaq';

export interface PublicPortalProps {
  onEnterFieldMode?: () => void;
  onOpenCoachWizard?: () => void;
  onOpenLeagueSuite?: () => void;
}

type ActiveViewTab = 'results' | 'calendar' | 'clubs' | 'standings';

export const PublicPortal: React.FC<PublicPortalProps> = ({ 
  onEnterFieldMode,
  onOpenCoachWizard,
  onOpenLeagueSuite
}) => {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* ═══ 1. واجهة الكانفاس الحية للمسح الشريطي الأولمبي ═══ */}
      <SlitScanHero
        onEnterFieldMode={() => onEnterFieldMode && onEnterFieldMode()}
        onExploreCompetitions={() => {
          const el = document.getElementById('explore-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenLeague={onOpenLeagueSuite}
        onOpenCoach={onOpenCoachWizard}
      />

      {/* ═══ 2. شريط الأرقام والإحصائيات الحية ═══ */}
      <AthleticsStatsStrip />

      {/* ═══ 3. الشريط المتحرك للنتائج المعتمدة اللحظية ═══ */}
      <LiveResultsTicker />

      {/* ═══ 4. قسم البحث السريع واختيار التخصصات ═══ */}
      <div id="explore-section" className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-emerald-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن بطولة، عداء، نادٍ رياضي، أو ولاية..."
              className="w-full pr-12 pl-4 py-3.5 bg-slate-900/90 border border-emerald-600/40 focus:border-emerald-400 rounded-2xl text-slate-100 placeholder-slate-500 text-sm font-semibold shadow-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          {/* فلاتر التخصصات */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: '🏆 جميع المنافسات' },
              { id: 'track_and_field', label: '🏃 المضمار والسرعة' },
              { id: 'cross_country', label: '🌲 العدو الريفي' },
              { id: 'road_race', label: '🛣️ سباقات الطريق' },
              { id: 'trail', label: '⛰️ التريل الجبلي' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

      {/* ═══ 5. شريط التبويب الرئيسي للأقسام التفاعلية ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-20">
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

      {/* ═══ 6. محتوى الأقسام التفاعلية ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        {loading && (
          <div className="p-4 text-center text-xs font-bold text-emerald-400 animate-pulse flex items-center justify-center gap-2">
            <Timer className="w-4 h-4 animate-spin" />
            <span>جارٍ استرجاع البيانات المعتمدة...</span>
          </div>
        )}
        
        {/* التبويب 1: النتائج المباشرة ومنصة التتويج */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            
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

              {/* منصة التتويج البصرية الثلاثية */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                
                {/* المركز الثاني (فضة) */}
                <div className="p-5 rounded-2xl bg-gradient-to-t from-slate-900 to-slate-800/80 border border-slate-700/80 text-center relative order-2 md:order-1 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-full bg-slate-700/80 border-2 border-slate-400 flex items-center justify-center text-xl mx-auto mb-3 shadow">
                    🥈
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">المركز الثاني</div>
                    <div className="text-base font-black text-white">سليمان بلمخفي</div>
                    <div className="text-xs text-slate-400">وفاق سطيف (ESS) • سطيف</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/60">
                    <span className="text-xl font-black font-mono text-slate-200">10.04s</span>
                    <span className="text-[10px] text-slate-400 mr-2">(+0.08s)</span>
                  </div>
                </div>

                {/* المركز الأول (ذهب) */}
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
                    <span className="text-xs font-bold text-emerald-400 mr-2 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      رقم قياسي جديد 🌟
                    </span>
                  </div>
                </div>

                {/* المركز الثالث (برونز) */}
                <div className="p-5 rounded-2xl bg-gradient-to-t from-slate-900 to-amber-950/20 border border-amber-700/50 text-center relative order-3 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-full bg-amber-950/80 border-2 border-amber-600 flex items-center justify-center text-xl mx-auto mb-3 shadow">
                    🥉
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">المركز الثالث</div>
                    <div className="text-base font-black text-white">نبيل زبيري</div>
                    <div className="text-xs text-slate-400">أولمبي الشلف (ASO) • الشلف</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/60">
                    <span className="text-xl font-black font-mono text-amber-200">10.12s</span>
                    <span className="text-[10px] text-slate-400 mr-2">(+0.16s)</span>
                  </div>
                </div>

              </div>

              {/* جدول النتائج الكامل المعتمد */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 text-center">الترتيب</th>
                      <th className="py-3 px-4">رقم الصدرية</th>
                      <th className="py-3 px-4">اسم العداء</th>
                      <th className="py-3 px-4">النادي الرياضي</th>
                      <th className="py-3 px-4 text-center">الرواق</th>
                      <th className="py-3 px-4 font-mono">الزمن الرسمي</th>
                      <th className="py-3 px-4 font-mono">الفارق</th>
                      <th className="py-3 px-4 text-center">الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {results.length > 0 ? results.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-4 text-center font-bold">
                          {r.rank === 1 ? '🥇 1' : r.rank === 2 ? '🥈 2' : r.rank === 3 ? '🥉 3' : r.rank}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">#{r.bib}</td>
                        <td className="py-3 px-4 font-black text-white">{r.athlete_name}</td>
                        <td className="py-3 px-4 text-slate-300">{r.club_name}</td>
                        <td className="py-3 px-4 text-center font-mono">{r.lane || '-'}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-300 text-sm">{formatTime(r.mark_millis)}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{r.rank === 1 ? '—' : `+${((r.mark_millis! - (results[0]?.mark_millis || 0)) / 1000).toFixed(2)}s`}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/60">
                            معتمد ✓
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 font-bold">
                          لا توجد نتائج مسجلة لهذه المسابقة حتى الآن
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* التبويب 2: رزنامة وبرنامج المنافسات */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>برنامج البطولات والتظاهرات الرياضية 2026</span>
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                {filteredCompetitions.length} بطولة مسجلة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCompetitions.map(comp => (
                <div 
                  key={comp.id}
                  onClick={() => handleSelectCompetition(comp)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                    selectedCompetition?.id === comp.id
                      ? 'bg-slate-900 border-emerald-500/80 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 text-[10px] font-black border border-emerald-800/60 uppercase">
                        {comp.competition_type}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        {comp.start_date}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white hover:text-emerald-300 transition-colors">
                      {comp.name}
                    </h4>

                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{comp.venue} • {comp.city || 'الجزائر'}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400 font-bold">
                      الحالة: <span className="text-emerald-400 font-black">جاهزة للتحكيم</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEnterFieldMode && onEnterFieldMode();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      <span>دخول التحكيم ⏱️</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* التبويب 3: ترتيب الأندية والميداليات */}
        {activeTab === 'standings' && (
          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-emerald-900/50 shadow-xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Medal className="w-5 h-5 text-amber-400" />
                    <span>الترتيب العام للأندية وجدول الميداليات (World Athletics Rule 19)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">احتساب النقاط: ذهبية (5 نقاط)، فضية (3 نقاط)، برونزية (نقطتان)</p>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-950 px-3 py-1.5 rounded-xl border border-amber-800/60">
                  الموسم الرياضي 2026
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 text-center">الرتبة</th>
                      <th className="py-3 px-4">النادي الرياضي</th>
                      <th className="py-3 px-4">المدينة / الولاية</th>
                      <th className="py-3 px-4 text-center font-mono text-amber-400">🥇 ذهب</th>
                      <th className="py-3 px-4 text-center font-mono text-slate-300">🥈 فضة</th>
                      <th className="py-3 px-4 text-center font-mono text-amber-600">🥉 برونز</th>
                      <th className="py-3 px-4 text-center font-mono font-black text-emerald-400">مجموع النقاط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {medalStandings.map((s) => (
                      <tr key={s.rank} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3.5 px-4 text-center font-black text-sm">
                          {s.rank === 1 ? '🥇 1' : s.rank === 2 ? '🥈 2' : s.rank === 3 ? '🥉 3' : s.rank}
                        </td>
                        <td className="py-3.5 px-4 font-black text-white">{s.club}</td>
                        <td className="py-3.5 px-4 text-slate-400">{s.city}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">{s.gold}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300">{s.silver}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600">{s.bronze}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-300 text-sm">
                          {s.totalPoints} نقطة
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* التبويب 4: دليل الأندية والرابطات المعتمدة */}
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

      {/* ═══ 7. استعراض القدرات التقنية بالنماذج البرمجية التفاعلية ═══ */}
      <CapabilitiesShowcase onLaunchFeature={() => onEnterFieldMode && onEnterFieldMode()} />

      {/* ═══ 8. مسار العمل المتكامل (كيف تعمل المنصة) ═══ */}
      <HowItWorksSection />

      {/* ═══ 9. دليل الرابطات والاتحادات الولائية ═══ */}
      <LeaguesDirectorySection onSelectLeague={() => onOpenLeagueSuite && onOpenLeagueSuite()} />

      {/* ═══ 10. الأسئلة الشائعة والقوانين المعتمدة ═══ */}
      <FaqSection />

      {/* ═══ 11. التذييل الرسمي للمنصة ═══ */}
      <PlatformFooter />

    </div>
  );
};
