/**
 * PHOTO FINISH PRO AI — Public Portal & Hero Experience (Stage 3)
 * Live Results, Certified Leaderboards, Competition Calendar & Clubs Directory.
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
  Sparkles 
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

export const PublicPortal: React.FC<PublicPortalProps> = ({ onEnterFieldMode }) => {
  const { t } = useTranslation();
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      
      {/* ═══ 1. Hero Section ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950/60 via-slate-950 to-slate-950 border-b border-emerald-900/30 py-12 px-4 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-600/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-4 shadow-lg shadow-emerald-950">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>البوابة الرسمية المعتمدة للنتائج والتوقيت اللحظي 2026</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
            منظومة ألعاب القوى والنتائج الرسمية
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 font-medium">
            تغطية لحظية معتمدة لسباقات المضمار، الميدان، الضاحية ونصف الماراثون بدقة 1/1000 ثانية مع لقطات كاميرا الـ Photo Finish المعتمدة من الحكام.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منافسة، عداء، نادي، أو رقم الصدر..."
              className="w-full pr-12 pl-4 py-3.5 bg-slate-900/90 border border-emerald-800/40 focus:border-emerald-500 rounded-2xl text-slate-100 placeholder-slate-500 text-sm font-semibold shadow-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {[
              { id: 'all', label: 'جميع المنافسات' },
              { id: 'track_and_field', label: 'المضمار والميدان 🏃' },
              { id: 'cross_country', label: 'العدو الريفي 🌲' },
              { id: 'road_race', label: 'سباقات الطريق 🛣️' },
              { id: 'trail', label: 'التريل الجبلي ⛰️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedType === tab.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/80 ring-1 ring-emerald-400'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 2. Competitions Grid & Active Event ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Competitions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-200 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>رزنامة المنافسات</span>
            </h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              {filteredCompetitions.length} مسابقة
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">جارٍ تحميل المنافسات...</div>
          ) : (
            filteredCompetitions.map(comp => {
              const active = selectedCompetition?.id === comp.id;
              const isLive = comp.status === 'in_progress';
              return (
                <div
                  key={comp.id}
                  onClick={() => handleSelectCompetition(comp)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    active
                      ? 'bg-slate-900/90 border-emerald-500/70 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      isLive 
                        ? 'bg-rose-950 text-rose-300 border border-rose-700/60 animate-pulse'
                        : comp.status === 'upcoming'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isLive ? 'جارية الآن 🔴' : comp.status === 'upcoming' ? 'قادمة 📅' : 'منتهية 🏁'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {comp.start_date}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 mb-1 leading-snug">
                    {comp.name}
                  </h3>

                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span className="truncate">{comp.venue}</span>
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Center & Right Col: Live Podium & Certified Results */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCompetition ? (
            <>
              {/* Competition Details Header */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                      {selectedCompetition.competition_type}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">{selectedCompetition.city || 'الجزائر'}</span>
                  </div>
                  <h2 className="text-lg font-black text-white">
                    {selectedCompetition.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onEnterFieldMode && onEnterFieldMode()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-950 flex items-center gap-1.5 transition-all"
                  >
                    <Timer className="w-4 h-4" />
                    <span>الميدان وغرفة التحكيم</span>
                  </button>
                </div>
              </div>

              {/* Certified Results Table */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="font-extrabold text-sm text-slate-200">
                      النتائج الرسمية المعتمدة (نهائي 100م رجال)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/50">
                    {t('certified_badge')}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">الرتبة</th>
                        <th className="py-3 px-3">الصدر</th>
                        <th className="py-3 px-4">العداء</th>
                        <th className="py-3 px-4">النادي</th>
                        <th className="py-3 px-4">الزمن الرسمي</th>
                        <th className="py-3 px-3">رد الفعل</th>
                        <th className="py-3 px-3">الرياح</th>
                        <th className="py-3 px-4">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {results.map((res) => {
                        const isGold = res.rank === 1;
                        const isSilver = res.rank === 2;
                        const isBronze = res.rank === 3;
                        return (
                          <tr key={res.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-black">
                              {isGold && <span className="inline-flex items-center gap-1 text-amber-300 font-extrabold text-sm">🥇 1</span>}
                              {isSilver && <span className="inline-flex items-center gap-1 text-slate-300 font-extrabold text-sm">🥈 2</span>}
                              {isBronze && <span className="inline-flex items-center gap-1 text-amber-600 font-extrabold text-sm">🥉 3</span>}
                              {!isGold && !isSilver && !isBronze && <span className="text-slate-400">{res.rank}</span>}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-400">{res.bib_number}</td>
                            <td className="py-3 px-4 font-bold text-slate-100">{res.athlete_name}</td>
                            <td className="py-3 px-4 text-slate-300">{res.club_name}</td>
                            <td className="py-3 px-4 font-mono font-black text-amber-300 text-sm">
                              {formatTime(res.time_millis)}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">
                              {res.reaction_time_millis ? `${res.reaction_time_millis}ms` : '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-300 flex items-center gap-1 pt-3.5">
                              <Wind className="w-3 h-3 text-slate-500" />
                              <span>{res.wind_reading !== null ? `+${res.wind_reading}m/s` : '-'}</span>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-400">
                              {res.notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Participating Clubs Directory Preview */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>دليل الأندية الرياضية المعتمدة</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">{clubs.length} أندية</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {clubs.map(club => (
                    <div key={club.id} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center font-black text-xs text-emerald-300">
                        {club.code}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">{club.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{club.city || 'الجزائر'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </>
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm">
              يرجى اختيار منافسة من الرزنامة لعرض النتائج
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
