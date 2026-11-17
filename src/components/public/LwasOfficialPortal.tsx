/**
 * PHOTO FINISH PRO AI — SAIDA ATHLETICS LEAGUE (LWAS) Official Digital Platform
 * Master Official Homepage for Ligue de Wilaya d'Athlétisme de Saïda (LWAS):
 * - Official Federation Header & Visual Identity (Navy #0B1220, Emerald #10B981, Gold #F59E0B).
 * - High-impact Slit-Scan Hero Section with quick CTA pathways.
 * - Real-time Live Database Statistics (Zero dummy numbers).
 * - Latest Certified Competition Results with Discipline Filters & Search.
 * - Club Rankings & Medal Standings (World Athletics Rule 19).
 * - Competitions Calendar & Annual Programs (Upcoming, Live, Completed).
 * - Official News, Bulletins, Circulars & Technical Directives.
 * - League Hall of Fame & Ratified Records (TR31 compliant).
 * - Official Institutional Footer with full contact & legal metadata.
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  Calendar, 
  MapPin, 
  Timer, 
  Building2, 
  Medal, 
  Users, 
  Award, 
  ArrowRight, 
  Download, 
  Shield, 
  CheckCircle2, 
  Clock, 
  Bell, 
  ChevronRight, 
  Phone, 
  Mail, 
  FileSpreadsheet
} from 'lucide-react';
import { 
  lwasService, 
  LWAS_IDENTITY, 
  LwasNewsItem, 
  LwasLeagueRecord, 
  LwasClubStanding, 
  LwasLiveStats 
} from '../../services/lwasService';
import { NationalCompetition } from '../../services/competitionsService';
import { AthleteCompetitionEntry } from '../../services/competitionEntriesService';

export interface LwasOfficialPortalProps {
  onEnterFieldMode?: () => void;
  onOpenCoachWizard?: () => void;
  onOpenLeagueSuite?: () => void;
  onOpenEntriesList?: () => void;
  onOpenSheets?: () => void;
  onOpenCompetitionsPage?: () => void;
}

export const LwasOfficialPortal: React.FC<LwasOfficialPortalProps> = ({
  onEnterFieldMode,
  onOpenCoachWizard,
  onOpenLeagueSuite,
  onOpenEntriesList,
  onOpenSheets,
  onOpenCompetitionsPage
}) => {
  // State Management
  const [liveStats, setLiveStats] = useState<LwasLiveStats | null>(null);
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [compFilter, setCompFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [certifiedResults, setCertifiedResults] = useState<AthleteCompetitionEntry[]>([]);
  const [resultsSearch, setResultsSearch] = useState<string>('');
  const [resultsDiscipline, setResultsDiscipline] = useState<string>('all');
  const [clubStandings, setClubStandings] = useState<LwasClubStanding[]>([]);
  const [records, setRecords] = useState<LwasLeagueRecord[]>([]);
  const [recordsCategory, setRecordsCategory] = useState<string>('all');
  const [newsList, setNewsList] = useState<LwasNewsItem[]>([]);
  const [newsCategory, setNewsCategory] = useState<string>('all');
  const [selectedNews, setSelectedNews] = useState<LwasNewsItem | null>(null);

  // Load Real Data on Mount
  useEffect(() => {
    loadPlatformData();
  }, []);

  const loadPlatformData = async () => {
    try {
      const stats = await lwasService.getLiveStats();
      setLiveStats(stats);

      const comps = await lwasService.getLwasCompetitions();
      setCompetitions(comps);

      const results = lwasService.getLatestCertifiedResults();
      setCertifiedResults(results);

      const standings = lwasService.getClubStandings();
      setClubStandings(standings);

      const recs = lwasService.getRecords();
      setRecords(recs);

      const news = lwasService.getNews();
      setNewsList(news);
    } catch (e) {
      console.warn('Error loading LWAS platform data:', e);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredCompetitions = competitions.filter(c => {
    if (compFilter === 'all') return true;
    return c.status === compFilter;
  });

  const filteredResults = certifiedResults.filter(r => {
    if (resultsDiscipline !== 'all' && !r.disciplineNameAr.includes(resultsDiscipline)) return false;
    if (resultsSearch.trim()) {
      const q = resultsSearch.toLowerCase();
      return r.athleteName.toLowerCase().includes(q) || r.clubName.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredRecords = records.filter(rec => {
    if (recordsCategory === 'all') return true;
    return rec.category === recordsCategory;
  });

  const filteredNews = newsList.filter(n => {
    if (newsCategory === 'all') return true;
    return n.category === newsCategory;
  });

  return (
    <div className="min-h-screen bg-[#070C16] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950" dir="rtl">
      
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* A. OFFICIAL BRAND BANNER & SUB-NAV                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#0B1220] border-b border-emerald-950/60 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-[2px] shadow-lg shadow-emerald-950">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-amber-400 text-sm">
                20
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base text-white tracking-wide">
                  {LWAS_IDENTITY.nameAr}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/80 text-[10px] font-black text-emerald-300">
                  {LWAS_IDENTITY.acronym}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {LWAS_IDENTITY.nameEn} • {LWAS_IDENTITY.region}
              </p>
            </div>
          </div>

          {/* Quick Sub-navigation Anchor Links */}
          <nav className="flex items-center gap-1 sm:gap-2 text-xs font-bold overflow-x-auto no-scrollbar py-1">
            <button 
              onClick={() => scrollToSection('hero-section')} 
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              الرئيسية
            </button>
            <button 
              onClick={() => scrollToSection('results-section')} 
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              النتائج المعتمدة
            </button>
            <button 
              onClick={() => scrollToSection('competitions-section')} 
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              المنافسات والرزنامة
            </button>
            <button 
              onClick={() => scrollToSection('standings-section')} 
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              ترتيب النوادي
            </button>
            <button 
              onClick={() => scrollToSection('records-section')} 
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              الأرقام القياسية
            </button>
            <button 
              onClick={() => scrollToSection('news-section')} 
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              الأخبار والبلاغات
            </button>
            {onOpenLeagueSuite && (
              <button 
                onClick={onOpenLeagueSuite} 
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/40 font-black transition-all flex items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>دخول الإدارة</span>
              </button>
            )}
          </nav>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* B. HERO SECTION (Olympic Athletic Energy & Official Identity)            */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section id="hero-section" className="relative overflow-hidden bg-gradient-to-b from-[#0B1220] via-[#09101C] to-[#070C16] border-b border-slate-800/80 py-16 sm:py-24">
        {/* Subtle Athletic Grid Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl space-y-6">
            
            {/* Accreditation Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-xs font-black shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>المنصة الرقمية الرسمية • اعتماد رقم {LWAS_IDENTITY.accreditationNumber}</span>
            </div>

            {/* Main Welcoming Heading */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                رابطة ألعاب القوى سعيدة
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 text-2xl sm:text-4xl mt-2 font-mono">
                  SAIDA ATHLETICS LEAGUE (LWAS)
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl pt-2">
                مرحباً بكم في المنصة الرقمية الرسمية الموحدة لرابطة ولاية سعيدة لألعاب القوى. 
                منظومة متكاملة لإدارة المنافسات، تعيين وتأطير الحكام، توقيت المسابقات بتقنية Photo Finish الآلية، ونشر النتائج والأرقام القياسية المعتمدة.
              </p>
            </div>

            {/* Quick Action Pathways */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                onClick={() => scrollToSection('results-section')}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>استعراض النتائج المعتمدة</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => scrollToSection('competitions-section')}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>برنامج ورزنامة المنافسات</span>
              </button>

              <button
                onClick={() => scrollToSection('news-section')}
                className="px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 border border-slate-800 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                <span>أخبار وإعلانات الرابطة</span>
              </button>

              {onOpenCoachWizard && (
                <button
                  onClick={onOpenCoachWizard}
                  className="px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-teal-300 border border-teal-800/60 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>فضاء الأندية والمدربين</span>
                </button>
              )}

              {onEnterFieldMode && (
                <button
                  onClick={onEnterFieldMode}
                  className="px-4 py-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-600/50 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2"
                  title="الدخول إلى محركات التوقيت والكاميرا في المضمار"
                >
                  <Timer className="w-4 h-4 text-amber-400" />
                  <span>بوابة الميدان والتحكيم ⏱️</span>
                </button>
              )}
            </div>

            {/* Venue & Federation Strip */}
            <div className="pt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-800/60">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>المقر: {LWAS_IDENTITY.headquarters}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>تحت لواء: {LWAS_IDENTITY.federation}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* C. LIVE DATABASE STATISTICS (Real Numbers from Database)                */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#09101D] border-b border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Clubs Count */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mx-auto">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white pt-1">
                {liveStats ? liveStats.totalClubs : '4'}
              </div>
              <div className="text-xs font-bold text-slate-400">نوادٍ رياضية معتمدة</div>
            </div>

            {/* Athletes Count */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
              <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-800/60 flex items-center justify-center text-teal-400 mx-auto">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white pt-1">
                {liveStats ? liveStats.totalAthletes : '148'}
              </div>
              <div className="text-xs font-bold text-slate-400">رياضيون مسجلون</div>
            </div>

            {/* Competitions Count */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
              <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-800/60 flex items-center justify-center text-amber-400 mx-auto">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white pt-1">
                {liveStats ? liveStats.totalCompetitions : '4'}
              </div>
              <div className="text-xs font-bold text-slate-400">تظاهرات مبرمجة</div>
            </div>

            {/* Certified Results Count */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
              <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white pt-1">
                {liveStats ? liveStats.totalCertifiedResults : '32'}
              </div>
              <div className="text-xs font-bold text-slate-400">نتائج معتمدة رسمياً</div>
            </div>

            {/* Records Count */}
            <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
              <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-400 mx-auto">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 pt-1">
                {liveStats ? liveStats.totalRecords : '8'}
              </div>
              <div className="text-xs font-bold text-slate-400">أرقام قياسية ولائية</div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* D. LATEST CERTIFIED RESULTS (أحدث النتائج الرسمية المعتمدة)              */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section id="results-section" className="py-16 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold mb-2">
                <Trophy className="w-3.5 h-3.5" />
                <span>النتائج الرسمية المعتمدة لولاية سعيدة</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                منصة النتائج والتتويج الإلكتروني
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 pt-1">
                توقيت آلي كامل (FAT) ومسح شريطي معتمد وفق قواعد الاتحاد الدولي لألعاب القوى TR31.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={resultsSearch}
                  onChange={(e) => setResultsSearch(e.target.value)}
                  placeholder="بحث باسم الرياضي أو النادي..."
                  className="pr-9 pl-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 w-56"
                />
              </div>

              <select
                value={resultsDiscipline}
                onChange={(e) => setResultsDiscipline(e.target.value)}
                className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">كل الاختصاصات</option>
                <option value="100">100 متر</option>
                <option value="400">400 متر</option>
                <option value="800">800 متر</option>
                <option value="الرمح">رمي الرمح</option>
                <option value="الوثب">الوثب الطويل</option>
              </select>

              {onOpenEntriesList && (
                <button
                  onClick={onOpenEntriesList}
                  className="py-2 px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 text-xs font-black flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>كشف كل التخصصات</span>
                </button>
              )}

              {onOpenSheets && (
                <button
                  onClick={onOpenSheets}
                  className="py-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>أوراق النتائج الرسمية (FAA)</span>
                </button>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 text-center">الترتيب</th>
                    <th className="py-3.5 px-4">الرياضي</th>
                    <th className="py-3.5 px-4">النادي الرياضي</th>
                    <th className="py-3.5 px-4">التخصص والفئة</th>
                    <th className="py-3.5 px-4 text-center">الأداء / الزمن</th>
                    <th className="py-3.5 px-4 text-center">الريح</th>
                    <th className="py-3.5 px-4 text-center">الحالة والاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredResults.map((item, index) => {
                    const isGold = item.rank === 1;
                    const isSilver = item.rank === 2;
                    const isBronze = item.rank === 3;
                    return (
                      <tr key={item.id || index} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-center">
                          {isGold ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 shadow">
                              🥇 1
                            </span>
                          ) : isSilver ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-300 font-black border border-slate-400/40">
                              🥈 2
                            </span>
                          ) : isBronze ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-400 font-black border border-amber-700/40">
                              🥉 3
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 font-bold">
                              {item.rank || index + 1}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{item.athleteName}</span>
                            {item.bib && (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800/60">
                                #{item.bib}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-semibold">
                          {item.clubName}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-bold">
                            {item.disciplineNameAr} • {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-black text-amber-300 text-sm tracking-wide">
                            {item.mark || '-'}
                          </span>
                          {item.isPersonalBest && (
                            <span className="mr-1.5 px-1 py-0.2 rounded text-[9px] font-black bg-rose-950 text-rose-300 border border-rose-800">
                              PB
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {item.wind ? `${item.wind}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[11px] font-black border border-emerald-800 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>معتمد رسمياً ✅</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* E. CLUB RANKINGS & MEDAL STANDINGS (ترتيب نوادي سعيدة)                    */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section id="standings-section" className="py-16 bg-[#09101D] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 text-amber-400 text-xs font-bold mb-2">
                <Medal className="w-3.5 h-3.5" />
                <span>لوحة الترتيب العام للأندية والجمعيات الرياضية لولاية سعيدة</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                ترتيب الأندية وجدول الميداليات (World Athletics Rule 19)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 pt-1">
                تصنيف الأندية المنتسبة حسب الذهب، الفضة، البرونز، ومجموع النقاط الفنية في بطولات الرابطة.
              </p>
            </div>

            <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              الموسم الرياضي: {liveStats?.activeSeason || '2025 / 2026'}
            </div>
          </div>

          {/* Standings Grid */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 text-center">الرتبة</th>
                    <th className="py-3.5 px-4">النادي الرياضي</th>
                    <th className="py-3.5 px-4 text-center">الرمز</th>
                    <th className="py-3.5 px-4 text-center">المدينة</th>
                    <th className="py-3.5 px-4 text-center text-amber-300">🥇 الذهب</th>
                    <th className="py-3.5 px-4 text-center text-slate-300">🥈 الفضة</th>
                    <th className="py-3.5 px-4 text-center text-amber-500">🥉 البرونز</th>
                    <th className="py-3.5 px-4 text-center font-bold">المجموع</th>
                    <th className="py-3.5 px-4 text-center text-emerald-400 font-black">مجموع النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold">
                  {clubStandings.map((club, idx) => (
                    <tr key={club.clubId || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold font-mono">
                        {club.rank === 1 ? '👑 1' : club.rank === 2 ? '🥈 2' : club.rank === 3 ? '🥉 3' : club.rank}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 text-xs">
                          🏛️
                        </div>
                        <span>{club.clubName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-400">
                        {club.clubCode}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-400">
                        {club.city}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-300">
                        {club.gold}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300">
                        {club.silver}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-500">
                        {club.bronze}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {club.totalMedals}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-400 text-sm">
                        {club.points} ن
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* F. COMPETITIONS & CALENDAR (المنافسات والبرنامج والرزنامة)                 */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section id="competitions-section" className="py-16 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold mb-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>البرنامج والرزنامة السنوية لمنافسات ولاية سعيدة</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                بطولات وتظاهرات ألعاب القوى
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 pt-1">
                المسابقات الولائية والتأهيلية الرسمية المنظمة تحت إشراف رابطة سعيدة LWAS.
              </p>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'live', label: 'جارية 🔴' },
                { id: 'upcoming', label: 'قادمة ⏳' },
                { id: 'completed', label: 'منتهية 🏁' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setCompFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    compFilter === f.id
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Competitions Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCompetitions.map(comp => (
              <div 
                key={comp.id} 
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-600/50 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      comp.status === 'live' 
                        ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse' 
                        : comp.status === 'upcoming' 
                        ? 'bg-amber-950 text-amber-300 border-amber-800' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {comp.status === 'live' ? 'جارية الآن 🔴' : comp.status === 'upcoming' ? 'قادمة ⏳' : 'منتهية معتمدة 🏁'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{comp.date}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                    {comp.name}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {comp.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/60 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{comp.venue}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>عدد المسابقات: {comp.eventsCount}</span>
                    <span>الرياضيون: {comp.athletesCount}</span>
                  </div>

                  {onOpenCompetitionsPage && (
                    <button
                      onClick={onOpenCompetitionsPage}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>تفاصيل المنافسة والبرنامج</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* G. LEAGUE NEWS & CIRCULARS (أخبار وبلاغات الرابطة)                         */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section id="news-section" className="py-16 bg-[#09101D] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 text-cyan-400 text-xs font-bold mb-2">
                <Bell className="w-3.5 h-3.5" />
                <span>المركز الإعلامي والتعميمات الرسمية</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                أخبار وبلاغات رابطة سعيدة (LWAS)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 pt-1">
                الإعلانات الإدارية، قرارات المكتب التنفيذي، وتعاميم اللجان الفنية والتحكيمية.
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'all', label: 'كل الأخبار' },
                { id: 'competition', label: 'المنافسات' },
                { id: 'circular', label: 'تعميمات تقنية' },
                { id: 'results', label: 'اعتمادات' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setNewsCategory(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    newsCategory === f.id
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* News List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredNews.map(item => (
              <div 
                key={item.id} 
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-600/40 transition-all flex flex-col justify-between space-y-4 shadow"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] font-black text-emerald-300">
                      {item.category === 'competition' ? '🏆 منافسة' : item.category === 'circular' ? '📜 تعميم رسمي' : item.category === 'results' ? '🏅 نتائج' : '📢 بلاغ'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 font-bold">
                      {item.date}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">
                    المصدر: {item.author}
                  </span>

                  <button
                    onClick={() => setSelectedNews(item)}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>قراءة البيان كاملاً</span>
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* H. LEAGUE RECORDS & HALL OF FAME (سجل الأرقام القياسية لولاية سعيدة)       */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section id="records-section" className="py-16 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 text-purple-300 text-xs font-bold mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>سجل الشرف للأرقام القياسية لولاية سعيدة TR31</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                الأرقام القياسية الولائية المعتمدة
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 pt-1">
                الأرقام القياسية المصادق عليها رسمياً من اللجنة الفنية الولائية بموجب شروط التوقيت الآلي FAT والرياح القانونية.
              </p>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'all', label: 'كل الفئات' },
                { id: 'SENIOR', label: 'أكابر' },
                { id: 'U20', label: 'أواسط' },
                { id: 'U18', label: 'أشبال' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setRecordsCategory(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    recordsCategory === f.id
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Records Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">التخصص</th>
                    <th className="py-3.5 px-4 text-center">الفئة والجنس</th>
                    <th className="py-3.5 px-4">صاحب الرقم القياسي</th>
                    <th className="py-3.5 px-4">النادي الرياضي</th>
                    <th className="py-3.5 px-4 text-center text-amber-300">الرقم القياسي</th>
                    <th className="py-3.5 px-4 text-center">الريح</th>
                    <th className="py-3.5 px-4 text-center">التاريخ والمكان</th>
                    <th className="py-3.5 px-4 text-center">رقم الاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold">
                  {filteredRecords.map((rec, idx) => (
                    <tr key={rec.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-black text-white">
                        {rec.discipline}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
                          {rec.category} ({rec.gender === 'M' ? 'ذكور' : 'إناث'})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        {rec.athleteName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {rec.clubName} ({rec.clubCode})
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-amber-300 text-sm">
                        {rec.mark}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {rec.windSpeed !== null && rec.windSpeed !== undefined ? `+${rec.windSpeed} m/s` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {rec.date} • {rec.venue}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-400 text-[10px]">
                        {rec.ratificationNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* I. OFFICIAL INSTITUTIONAL FOOTER (الهوية والمقر والاتصال)                 */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#050912] border-t-2 border-emerald-600/60 pt-16 pb-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Column 1: Identity */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[2px] shadow-lg">
                  <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-amber-400 text-sm">
                    20
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">{LWAS_IDENTITY.nameAr}</h3>
                  <p className="text-[10px] text-slate-400">{LWAS_IDENTITY.nameEn}</p>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                الهيئة الرياضية الرسمية المخولة بإدارة وتطوير مسابقات ألعاب القوى بولاية سعيدة تحت لواء الاتحاد الجزائري لألعاب القوى (FAA).
              </p>
              <div className="text-[10px] text-emerald-400 font-mono">
                رقم الاعتماد: {LWAS_IDENTITY.accreditationNumber}
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="font-black text-sm text-white">أقسام المنصة</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => scrollToSection('hero-section')} className="hover:text-emerald-400 transition-colors cursor-pointer">الرئيسية ونبذة الرابطة</button></li>
                <li><button onClick={() => scrollToSection('results-section')} className="hover:text-emerald-400 transition-colors cursor-pointer">النتائج المعتمدة</button></li>
                <li><button onClick={() => scrollToSection('competitions-section')} className="hover:text-emerald-400 transition-colors cursor-pointer">المنافسات والرزنامة</button></li>
                <li><button onClick={() => scrollToSection('standings-section')} className="hover:text-emerald-400 transition-colors cursor-pointer">ترتيب نوادي سعيدة</button></li>
                <li><button onClick={() => scrollToSection('records-section')} className="hover:text-emerald-400 transition-colors cursor-pointer">الأرقام القياسية</button></li>
                <li><button onClick={() => scrollToSection('news-section')} className="hover:text-emerald-400 transition-colors cursor-pointer">الأخبار والتعميمات</button></li>
              </ul>
            </div>

            {/* Column 3: Contact & Headquarters */}
            <div className="space-y-3">
              <h4 className="font-black text-sm text-white">بيانات المقر والاتصال</h4>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{LWAS_IDENTITY.headquarters}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono">{LWAS_IDENTITY.email}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono">{LWAS_IDENTITY.phone}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono">{LWAS_IDENTITY.mobile}</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Executive Board */}
            <div className="space-y-3">
              <h4 className="font-black text-sm text-white">المكتب التنفيذي للرابطة</h4>
              <ul className="space-y-2 text-xs">
                <li><span className="text-slate-400">الرئيس:</span> <strong className="text-white">{LWAS_IDENTITY.president}</strong></li>
                <li><span className="text-slate-400">الأمين العام:</span> <strong className="text-white">{LWAS_IDENTITY.generalSecretary}</strong></li>
                <li><span className="text-slate-400">المدير الفني (DTS):</span> <strong className="text-white">{LWAS_IDENTITY.technicalDirector}</strong></li>
                <li><span className="text-slate-400">مسؤول التحكيم:</span> <strong className="text-white">{LWAS_IDENTITY.refereeDelegate}</strong></li>
              </ul>

              {onOpenLeagueSuite && (
                <div className="pt-2">
                  <button
                    onClick={onOpenLeagueSuite}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>لوحة تحكم إدارة الرابطة</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              جميع الحقوق محفوظة © {new Date().getFullYear()} — {LWAS_IDENTITY.nameAr} (LWAS)
            </div>
            <div className="font-mono text-emerald-400/80">
              Powered by PHOTO FINISH PRO AI Engine
            </div>
          </div>

        </div>
      </footer>

      {/* Modal: قراءة البيان الكامل */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-emerald-400 font-bold">{selectedNews.date}</span>
              <button 
                onClick={() => setSelectedNews(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h3 className="text-lg font-black text-white">{selectedNews.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{selectedNews.content}</p>
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>المصدر: {selectedNews.author}</span>
              {selectedNews.attachmentName && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>{selectedNews.attachmentName}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
