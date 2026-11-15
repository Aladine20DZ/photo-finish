/**
 * PHOTO FINISH PRO AI — National Competitions & Events Directory (Stage 2)
 * Comprehensive showcase for national athletics competitions, multi-criteria filtering,
 * interactive glass cards, and in-depth competition schedule & certified results viewer.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Search, 
  Filter, 
  Clock, 
  Shield, 
  ArrowLeft, 
  RefreshCw, 
  Wind, 
  AlertCircle,
  Layers,
  Users
} from 'lucide-react';
import { 
  competitionsService, 
  NationalCompetition 
} from '../../services/competitionsService';
import { portalAuthService, RegisteredLeague } from '../../services/portalAuthService';
import { GlassCard } from '../design-system/GlassCard';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { EmptyState } from '../design-system/EmptyState';

export interface CompetitionsEventsPageProps {
  onBackToHome?: () => void;
  onOpenFieldMode?: () => void;
}

export const CompetitionsEventsPage: React.FC<CompetitionsEventsPageProps> = ({
  onBackToHome,
  onOpenFieldMode
}) => {
  // ═══ Filters & Query State ═══
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc'>('date_desc');

  // ═══ Data, Loading & Error States ═══
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [leagues, setLeagues] = useState<RegisteredLeague[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ═══ Detail View State ═══
  const [selectedCompetition, setSelectedCompetition] = useState<NationalCompetition | null>(null);
  const [detailTab, setDetailTab] = useState<'schedule' | 'results'>('schedule');

  useEffect(() => {
    loadCompetitions();
    setLeagues(portalAuthService.getAllLeagues(false));
  }, []);

  const loadCompetitions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate real-world async load
      const data = await competitionsService.getCompetitions();
      setCompetitions(data);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات التظاهرات والمنافسات الرياضية.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Sorted Competitions
  const filteredCompetitions = useMemo(() => {
    return competitions.filter(item => {
      // League Filter
      if (selectedLeagueId !== 'all') {
        if (item.leagueId !== selectedLeagueId && item.leagueShort !== selectedLeagueId) {
          return false;
        }
      }

      // Status Filter
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }

      // Category / Type Filter
      if (selectedCategory !== 'all' && item.competitionType !== selectedCategory) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const mName = item.name.toLowerCase().includes(q);
        const mVenue = item.venue.toLowerCase().includes(q);
        const mCity = item.city.toLowerCase().includes(q);
        const mLeague = item.leagueName.toLowerCase().includes(q);
        if (!mName && !mVenue && !mCity && !mLeague) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'ar');
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [competitions, selectedLeagueId, selectedStatus, selectedCategory, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setSelectedLeagueId('all');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('date_desc');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative pb-16" dir="rtl">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10">
        
        {/* ═══ Header & Title ═══ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="accent" dot>
                الروزنامة الفيدرالية الرسمية 2026
              </Badge>
              <span className="text-xs text-white/50 font-mono">World Athletics Certified</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]" />
              <span>التظاهرات والمنافسات الرياضية</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl leading-relaxed">
              دليل شامل لجميع بطولات ومنافسات ألعاب القوى الوطنية عبر الرابطات الولائية المعتمدة والاتحاد الوطني، مع البرامج الرسمية والنتائج المعتمدة بالمسح الشريطي.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onBackToHome && (
              <Button variant="secondary" size="sm" onClick={onBackToHome} icon={<ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />}>
                العودة للرئيسية
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={loadCompetitions} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                تحديث الروزنامة
            </Button>
          </div>
        </div>

        {/* ═══ If A Competition Is Selected: Detail View ═══ */}
        {selectedCompetition ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Navigation & Return */}
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setSelectedCompetition(null)}
                icon={<ArrowLeft className="w-4 h-4 rtl:rotate-180" />}
              >
                العودة لكل المنافسات
              </Button>

              <Badge
                variant={
                  selectedCompetition.status === 'live' ? 'danger' :
                  selectedCompetition.status === 'upcoming' ? 'warning' : 'success'
                }
                dot
                size="md"
              >
                {selectedCompetition.status === 'live' ? 'منافسة جارية الآن 🔴' :
                 selectedCompetition.status === 'upcoming' ? 'منافسة قادمة مبرمجة ⏳' : 'منافسة منتهية ومعتمدة 🏁'}
              </Badge>
            </div>

            {/* Competition Hero Card */}
            <GlassCard variant="strong" className="p-6 sm:p-8 rounded-3xl border border-white/20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-black border border-cyan-400/40">
                      {selectedCompetition.competitionType === 'track_and_field' ? 'مضمار وميدان 🏃' :
                       selectedCompetition.competitionType === 'cross_country' ? 'عدو ريفي 🌲' : 'سباق طريق 🛣️'}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>الرابطة المنظِّمة: {selectedCompetition.leagueName}</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {selectedCompetition.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-white/70 max-w-3xl leading-relaxed">
                    {selectedCompetition.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/60 pt-2">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span>{selectedCompetition.date} {selectedCompetition.endDate && `إلى ${selectedCompetition.endDate}`}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>{selectedCompetition.venue} • {selectedCompetition.city}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>{selectedCompetition.athletesCount} عداء مسجل</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  {onOpenFieldMode && selectedCompetition.status !== 'completed' && (
                    <Button variant="primary" size="md" onClick={onOpenFieldMode} icon={<Clock className="w-4 h-4" />}>
                      دخول التحكيم والتوقيت ⏱️
                    </Button>
                  )}
                  <div className="p-3 rounded-2xl glass-card text-center border border-white/10">
                    <div className="text-[11px] text-white/50 font-bold">دقة التوقيت المعتمدة</div>
                    <div className="text-sm font-black text-cyan-300 font-mono mt-0.5">Photo Finish 1/1000s</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Tabs: Program / Schedule vs Certified Results */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setDetailTab('schedule')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  detailTab === 'schedule'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>برنامج المنافسة والمسابقات ({selectedCompetition.schedule.length})</span>
              </button>

              <button
                onClick={() => setDetailTab('results')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  detailTab === 'results'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>النتائج الرسمية المعتمدة ({selectedCompetition.resultsSummary.length})</span>
              </button>
            </div>

            {/* Tab 1: Schedule */}
            {detailTab === 'schedule' && (
              <GlassCard className="p-6 rounded-3xl border border-white/15">
                {selectedCompetition.schedule.length === 0 ? (
                  <EmptyState
                    title="البرنامج قيد الإعداد النهائي"
                    description="تقوم اللجنة الفنية للرابطة بمراجعة وتأكيد جدول المسابقات والتصفيات وسيعلن هنا فور اعتماده."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-white/5 text-white/50 font-bold text-[11px] border-b border-white/10">
                        <tr>
                          <th className="py-3 px-4">التوقيت</th>
                          <th className="py-3 px-4">التخصص والمسابقة</th>
                          <th className="py-3 px-4">الجنس والفئة</th>
                          <th className="py-3 px-4">نوع الدور</th>
                          <th className="py-3 px-4 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedCompetition.schedule.map((ev) => (
                          <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                              {ev.time}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white text-sm">
                              {ev.discipline}
                            </td>
                            <td className="py-3.5 px-4 text-white/80">
                              {ev.gender === 'M' ? 'ذكور ♂️' : ev.gender === 'F' ? 'إناث ♀️' : 'مختلط ⚥'} • {ev.category}
                            </td>
                            <td className="py-3.5 px-4 text-white/70">
                              {ev.round}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge
                                variant={ev.status === 'running' ? 'danger' : ev.status === 'finished' ? 'success' : 'neutral'}
                                size="sm"
                                dot={ev.status === 'running'}
                              >
                                {ev.status === 'running' ? 'جارية الآن' : ev.status === 'finished' ? 'انتهت' : 'مبرمجة'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            )}

            {/* Tab 2: Certified Results */}
            {detailTab === 'results' && (
              <GlassCard className="p-6 rounded-3xl border border-white/15">
                {selectedCompetition.resultsSummary.length === 0 ? (
                  <EmptyState
                    title="لا توجد نتائج معتمدة حتى الآن"
                    description="النتائج تظهر مباشرة وبشكل آلي لحظة مصادقة الحكم العام ورئيس غرفة التحكيم بموجب القانون الدولي TR31."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-white/5 text-white/50 font-bold text-[11px] border-b border-white/10">
                        <tr>
                          <th className="py-3 px-4 text-center">الرتبة</th>
                          <th className="py-3 px-4">رقم الصدرية</th>
                          <th className="py-3 px-4">اسم العداء</th>
                          <th className="py-3 px-4">النادي الرياضي</th>
                          <th className="py-3 px-4">التخصص</th>
                          <th className="py-3 px-4 font-mono">النتيجة الرسمية (FAT)</th>
                          <th className="py-3 px-4 font-mono">سرعة الرياح</th>
                          <th className="py-3 px-4 text-center">الملاحظة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedCompetition.resultsSummary.map((res) => (
                          <tr key={res.rank} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4 text-center font-black text-sm">
                              {res.rank === 1 ? '🥇 1' : res.rank === 2 ? '🥈 2' : res.rank === 3 ? '🥉 3' : res.rank}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-black text-amber-400">
                              #{res.bib}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white text-sm">
                              {res.athleteName}
                            </td>
                            <td className="py-3.5 px-4 text-white/80">
                              {res.clubName}
                            </td>
                            <td className="py-3.5 px-4 text-cyan-300 font-semibold">
                              {res.discipline}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-black text-emerald-300 text-sm">
                              {res.mark}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-white/70">
                              {res.wind ? (
                                <span className="flex items-center gap-1 text-[11px] text-cyan-300">
                                  <Wind className="w-3 h-3 text-cyan-400" />
                                  <span>{res.wind}</span>
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {res.isRecord ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-400/40">
                                  رقم قياسي ⭐
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-400 font-bold">مصادق TR31 ✅</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            )}
          </div>
        ) : (
          /* ═══ Main Directory View ═══ */
          <div className="space-y-6">

            {/* ═══ Filter & Control Bar (Glassmorphism) ═══ */}
            <GlassCard variant="strong" className="p-4 sm:p-6 rounded-3xl border border-white/20 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* 1. Filter by League Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>حسب الرابطة المنظِّمة:</span>
                  </label>
                  <select
                    value={selectedLeagueId}
                    onChange={(e) => setSelectedLeagueId(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-white bg-slate-900/90 border border-white/20 focus:border-cyan-400 focus:outline-none transition cursor-pointer"
                  >
                    <option value="all">كل المنافسات (جميع الرابطات والاتحادات)</option>
                    {leagues.map((lg) => (
                      <option key={lg.id} value={lg.id}>
                        {lg.logoCode} {lg.name} ({lg.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Filter by Status */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>حالة المنافسة:</span>
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-white bg-slate-900/90 border border-white/20 focus:border-cyan-400 focus:outline-none transition cursor-pointer"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="live">🔴 جارية الآن (Live)</option>
                    <option value="upcoming">⏳ قادمة ومبرمجة</option>
                    <option value="completed">🏁 منتهية ومصادقة</option>
                  </select>
                </div>

                {/* 3. Filter by Category */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>نوع الرياضة والتخصص:</span>
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-white bg-slate-900/90 border border-white/20 focus:border-cyan-400 focus:outline-none transition cursor-pointer"
                  >
                    <option value="all">كل التخصصات</option>
                    <option value="track_and_field">🏃 مضمار وميدان (Track & Field)</option>
                    <option value="cross_country">🌲 عدو ريفي (Cross Country)</option>
                    <option value="road_race">🛣️ سباق طريق (Road Race)</option>
                  </select>
                </div>

                {/* 4. Sort By */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-purple-400" />
                    <span>الترتيب والفرز:</span>
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-white bg-slate-900/90 border border-white/20 focus:border-cyan-400 focus:outline-none transition cursor-pointer"
                  >
                    <option value="date_desc">التاريخ (الأحدث أولاً)</option>
                    <option value="date_asc">التاريخ (الأقدم أولاً)</option>
                    <option value="name_asc">اسم المنافسة (أ - ي)</option>
                  </select>
                </div>

              </div>

              {/* Search Bar + Reset */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-white/40 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم المنافسة، الملعب، أو المدينة..."
                    className="glass-input w-full pr-10 pl-4 py-2.5 rounded-xl text-xs font-medium text-white placeholder-white/40 bg-slate-900/80 border border-white/20 focus:border-cyan-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                  <span className="text-xs font-mono font-bold text-white/60">
                    النتائج: <span className="text-cyan-300 font-black">{filteredCompetitions.length}</span> منافسة
                  </span>

                  {(selectedLeagueId !== 'all' || selectedStatus !== 'all' || selectedCategory !== 'all' || searchQuery) && (
                    <button
                      onClick={handleResetFilters}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 transition cursor-pointer"
                    >
                      إعادة ضبط الفلاتر ✕
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* ═══ Content: Handling States (Loading, Error, Empty, Success) ═══ */}

            {/* State 1: Loading */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <GlassCard key={i} className="p-6 rounded-3xl border border-white/10 space-y-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-6 rounded-xl bg-white/10" />
                      <div className="w-16 h-6 rounded-xl bg-white/10" />
                    </div>
                    <div className="w-3/4 h-6 rounded-xl bg-white/10" />
                    <div className="w-1/2 h-4 rounded-xl bg-white/10" />
                    <div className="w-full h-12 rounded-xl bg-white/5" />
                  </GlassCard>
                ))}
              </div>
            )}

            {/* State 2: Error */}
            {!loading && error && (
              <GlassCard className="p-8 rounded-3xl border border-red-500/30 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white">حدث خطأ أثناء تحميل الروزنامة</h3>
                <p className="text-xs text-red-300 max-w-md mx-auto">{error}</p>
                <Button variant="primary" size="sm" onClick={loadCompetitions} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                  إعادة المحاولة
                </Button>
              </GlassCard>
            )}

            {/* State 3: Empty */}
            {!loading && !error && filteredCompetitions.length === 0 && (
              <GlassCard className="p-10 rounded-3xl border border-white/10 text-center">
                <EmptyState
                  title="لا توجد منافسات مطابقة لبحثك"
                  description="جرّب تغيير الرابطة المختارة، أو إعادة ضبط الفلاتر وكلمات البحث للعثور على المنافسات المبرمجة."
                  actionLabel="إعادة ضبط كل الفلاتر"
                  onAction={handleResetFilters}
                />
              </GlassCard>
            )}

            {/* State 4: Success - Grid of Competition Cards */}
            {!loading && !error && filteredCompetitions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompetitions.map((comp) => {
                  const isLive = comp.status === 'live';
                  const isCompleted = comp.status === 'completed';
                  return (
                    <GlassCard
                      key={comp.id}
                      variant="interactive"
                      className="p-6 rounded-3xl border border-white/15 flex flex-col justify-between space-y-5 hover:border-cyan-400/50 transition-all group"
                    >
                      {/* Top Badges */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={isLive ? 'danger' : isCompleted ? 'success' : 'warning'}
                            dot={isLive}
                            size="sm"
                          >
                            {isLive ? 'جارية الآن 🔴' : isCompleted ? 'منتهية ومصادقة 🏁' : 'قادمة مبرمجة ⏳'}
                          </Badge>

                          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-800/50">
                            {comp.competitionType === 'track_and_field' ? 'مضمار' :
                             comp.competitionType === 'cross_country' ? 'عدو ريفي' : 'طريق'}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                          {comp.name}
                        </h3>

                        {/* Organizing League Badge */}
                        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="block text-[10px] text-white/50 font-bold">الرابطة المنظِّمة:</span>
                            <span className="block text-xs font-black text-amber-300 truncate">
                              {comp.leagueName}
                            </span>
                          </div>
                        </div>

                        {/* Venue & Date Meta */}
                        <div className="space-y-1.5 text-xs text-white/70">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="font-mono font-bold">{comp.date} {comp.endDate && `إلى ${comp.endDate}`}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{comp.venue} • {comp.city}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>{comp.athletesCount} عداء • {comp.eventsCount} مسابقات</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-center"
                          onClick={() => {
                            setSelectedCompetition(comp);
                            setDetailTab('schedule');
                          }}
                        >
                          عرض البرنامج والتفاصيل 📋
                        </Button>

                        {comp.resultsSummary.length > 0 && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedCompetition(comp);
                              setDetailTab('results');
                            }}
                            icon={<Trophy className="w-3.5 h-3.5 text-slate-950" />}
                          >
                            النتائج
                          </Button>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
