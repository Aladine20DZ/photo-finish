/**
 * PHOTO FINISH PRO AI — Global Navigation Shell & Header (Upgraded)
 * Elite Athletics Federation Design: World Athletics / Diamond League Aesthetics.
 * Dual-tier layout: Live Event Ribbon + Official Federation Navbar.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Globe, 
  Shield, 
  Users, 
  Timer, 
  Cpu, 
  Settings, 
  Cloud, 
  ChevronDown,
  Radio,
  CheckCircle2,
  Search,
  X,
  ArrowRight,
  Sun,
  Moon,
  Sunset,
  ScanLine
} from 'lucide-react';
import { useTranslation } from '../../services/i18nService';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export type NavTab = 'public' | 'league' | 'coach' | 'competition' | 'analytics' | 'admin';

export interface LeagueOption {
  id: string;
  name: string;
  shortName: string;
  region: string;
  logoCode: string;
}

const OFFICIAL_LEAGUES: LeagueOption[] = [
  { id: 'faa_national', name: 'الاتحاد الجزائري لألعاب القوى', shortName: 'FAA', region: 'الجزائر العاصمة • المستوى الوطني', logoCode: '🇩🇿' },
  { id: 'laa_algiers', name: 'الرابطة الولائية لألعاب القوى - الجزائر', shortName: 'LAA', region: 'الجزائر العاصمة', logoCode: '🏛️' },
  { id: 'lao_oran', name: 'الرابطة الولائية لألعاب القوى - وهران', shortName: 'LAO', region: 'وهران • الغرب الجزائري', logoCode: '🏃' },
  { id: 'lac_constantine', name: 'الرابطة الولائية لألعاب القوى - قسنطينة', shortName: 'LAC', region: 'قسنطينة • الشرق الجزائري', logoCode: '🌉' },
  { id: 'las_setif', name: 'الرابطة الولائية لألعاب القوى - سطيف', shortName: 'LAS', region: 'سطيف • الهضاب العليا', logoCode: '🌲' },
  { id: 'lach_chlef', name: 'الرابطة الولائية لألعاب القوى - الشلف', shortName: 'LACh', region: 'الشلف • حوض الشلف', logoCode: '🌾' },
  { id: 'lrao_south', name: 'الرابطة الجهوية لألعاب القوى - ورقلة والجنوب', shortName: 'LRAO', region: 'ورقلة والجنوب الكبير', logoCode: '☀️' }
];

interface NavShellProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeLeagueName?: string;
  onSelectLeague?: (league: LeagueOption) => void;
}

export const NavShell: React.FC<NavShellProps> = ({
  currentTab,
  onTabChange,
  activeLeagueName = 'الاتحاد الجزائري لألعاب القوى (FAA)',
  onSelectLeague
}) => {
  const { t, lang, setLanguage } = useTranslation();
  const isCloudOnline = isSupabaseConfigured();
  const [leagueDropdownOpen, setLeagueDropdownOpen] = useState(false);
  const [leagueSearch, setLeagueSearch] = useState('');
  const [currentLeague, setCurrentLeague] = useState<LeagueOption>(() => 
    OFFICIAL_LEAGUES.find(l => l.name === activeLeagueName || activeLeagueName.includes(l.shortName)) || OFFICIAL_LEAGUES[0]
  );
  const [currentTime, setCurrentTime] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'sunlight' | 'light'>(() => {
    try {
      return (localStorage.getItem('photo_finish_theme') as any) || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.remove('sunlight', 'light', 'dark');
      if (theme === 'sunlight') root.classList.add('sunlight');
      else if (theme === 'light') root.classList.add('light');
      else root.classList.add('dark');
      localStorage.setItem('photo_finish_theme', theme);
    } catch {}
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'sunlight' : prev === 'sunlight' ? 'light' : 'dark');
  };
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeLeagueName) {
      const match = OFFICIAL_LEAGUES.find(l => l.name === activeLeagueName || activeLeagueName.includes(l.shortName));
      if (match) setCurrentLeague(match);
    }
  }, [activeLeagueName]);

  // تحديث التوقيت الملائم للملعب
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLeagueDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'public', label: t('nav_public'), icon: <Globe className="w-4 h-4" /> },
    { id: 'league', label: t('nav_league'), icon: <Shield className="w-4 h-4" /> },
    { id: 'coach', label: t('nav_coach'), icon: <Users className="w-4 h-4" /> },
    { id: 'competition', label: t('nav_field'), icon: <Timer className="w-4 h-4 text-emerald-400" />, badge: '1/1000s' },
    { id: 'analytics', label: t('nav_ai'), icon: <Cpu className="w-4 h-4 text-cyan-400" />, badge: 'AI' },
    { id: 'admin', label: t('nav_admin'), icon: <Settings className="w-4 h-4" /> }
  ];

  const handleLeagueChoose = (league: LeagueOption) => {
    setCurrentLeague(league);
    setLeagueDropdownOpen(false);
    if (onSelectLeague) {
      onSelectLeague(league);
    }
  };

  const filteredLeagues = OFFICIAL_LEAGUES.filter(l => 
    l.name.toLowerCase().includes(leagueSearch.toLowerCase()) ||
    l.shortName.toLowerCase().includes(leagueSearch.toLowerCase()) ||
    l.region.toLowerCase().includes(leagueSearch.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-50 bg-slate-950/98 backdrop-blur-xl border-b border-emerald-950 shadow-2xl transition-all">
      
      {/* ═══ 1. الشريط الشرفي العلوي الرفيع (Top Utility / Live Ribbon) ═══ */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-slate-950 to-emerald-950/90 border-b border-emerald-900/30 text-[11px] font-semibold text-slate-300 py-1 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* اليمين: مؤشر البث المباشر للبطولة والوقت الرسمي */}
          <div className="flex items-center gap-3 truncate">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-black shrink-0 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-rose-500/80 shadow" />
              <span>مباشر 🔴</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-slate-300 truncate">
              <span className="text-amber-300 font-extrabold truncate">
                البطولة الوطنية لألعاب القوى للأكابر 2026
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 truncate">ملعب 5 جويلية، الجزائر العاصمة</span>
            </div>

            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-emerald-400">
                <Timer className="w-3 h-3 text-emerald-400" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* اليسار: محدد الرابطة، مؤشر السحابة، واللغات */}
          <div className="flex items-center gap-2.5 shrink-0" ref={dropdownRef}>
            
            {/* محدد الرابطة / الاتحاد مع قائمة منسدلة فاخرة */}
            <div className="relative">
              <button 
                onClick={() => setLeagueDropdownOpen(!leagueDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-emerald-800/50 hover:border-emerald-500/80 text-[11px] font-bold text-slate-200 hover:text-emerald-300 transition-all shadow-inner"
                title="تغيير الرابطة الولائية أو الاتحاد الوطني"
              >
                <span>{currentLeague.logoCode}</span>
                <span className="truncate max-w-[150px] sm:max-w-[210px]">{currentLeague.shortName} • {currentLeague.name}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${leagueDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
              </button>

              {/* القائمة المنسدلة للرابطات */}
              {leagueDropdownOpen && (
                <div className="absolute left-0 sm:right-0 mt-1.5 w-80 sm:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-emerald-700/60 shadow-2xl p-3 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      اختر الرابطة أو الاتحاد المنظّم
                    </span>
                    <button 
                      onClick={() => setLeagueDropdownOpen(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={leagueSearch}
                      onChange={(e) => setLeagueSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو الولاية..."
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 no-scrollbar">
                    {filteredLeagues.map((league) => {
                      const isSelected = currentLeague.id === league.id;
                      return (
                        <button
                          key={league.id}
                          onClick={() => handleLeagueChoose(league)}
                          className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between gap-2 ${
                            isSelected 
                              ? 'bg-emerald-950/60 border-emerald-500/80 text-white shadow-md' 
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base">{league.logoCode}</span>
                            <div className="truncate">
                              <div className="text-xs font-bold text-slate-100 truncate">{league.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{league.region}</div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* حالة السحابة والاتصال */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                isCloudOnline 
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60' 
                  : 'bg-amber-950/50 text-amber-300 border-amber-800/60'
              }`}
              title={isCloudOnline ? 'متصل بقاعدة بيانات Supabase السحابية' : 'يعمل بنمط الميدان المستقل P2P دون إنترنت'}
            >
              {isCloudOnline ? (
                <>
                  <Cloud className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">السحابة متصلة</span>
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline">أوفلاين محلي</span>
                </>
              )}
            </div>

            
            {/* زر تبديل الثيم: ليلي / شمسي عالي التباين للميدان / نهاري */}
            <button
              onClick={cycleTheme}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-emerald-400 hover:border-emerald-800 transition-all cursor-pointer"
              title="تبديل النمط: ليلي / وضع الشمس عالي التباين للميدان / نهاري"
            >
              {theme === 'sunlight' ? <Sun className="w-3 h-3 text-amber-400" /> : theme === 'light' ? <Sunset className="w-3 h-3 text-orange-400" /> : <Moon className="w-3 h-3 text-slate-300" />}
              <span className="hidden sm:inline">{theme === 'sunlight' ? 'ميداني شمسي' : theme === 'light' ? 'نهاري' : 'ليلي'}</span>
            </button>

            {/* زر الدخول المباشر بكود المهمة */}
            <button
              onClick={() => onTabChange('competition')}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-black text-emerald-300 hover:bg-emerald-900 transition-all cursor-pointer shadow-sm"
              title="دخول الحكام بكود التكليف الرسمي (مثال: LIG31-7K4M-Q9TX)"
            >
              <ScanLine className="w-3 h-3 text-emerald-400" />
              <span>كود المهمة 🔑</span>
            </button>

            {/* محدد اللغات السريع */}
            <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px] font-extrabold">
              <button 
                onClick={() => setLanguage('ar')}
                className={`px-1.5 py-0.5 rounded ${lang === 'ar' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                عربي
              </button>
              <button 
                onClick={() => setLanguage('fr')}
                className={`px-1.5 py-0.5 rounded ${lang === 'fr' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                FR
              </button>
              <button 
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 rounded ${lang === 'en' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* ═══ 2. الشريط الرئيسي الفاخر (Main Federation Header) ═══ */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-18 gap-3">
          
          {/* شعار المنظومة وهوية الرابطة الاحترافية */}
          <button 
            onClick={() => onTabChange('public')}
            className="flex items-center gap-3 group text-start focus:outline-none shrink-0"
          >
            {/* الشعار الفاخر ثلاثي الأبعاد مع توهج */}
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-[2px] shadow-lg shadow-emerald-950/80 group-hover:shadow-emerald-500/20 transition-all">
                <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)] group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-slate-950"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-wider bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent drop-shadow-sm font-['Chakra_Petch',sans-serif]">
                  PHOTO FINISH PRO
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-md tracking-tight shadow">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/90 font-bold truncate max-w-[280px]">
                المنظومة الوطنية لإدارة وتحكيم وتوقيت ألعاب القوى
              </p>
            </div>
          </button>

          {/* عناصر التنقل الرئيسية (Desktop Navigation Items) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/70 p-1.5 rounded-2xl border border-emerald-900/30 shadow-inner">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    active
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/50'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black tracking-tighter ${
                      active 
                        ? 'bg-slate-950/40 text-amber-300' 
                        : item.badge === 'AI' 
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-amber-400 rounded-full shadow-sm" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* الزر الرئيسي للدعوة الميدانية (Call to Action Button) */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onTabChange('competition')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 hover:text-black font-black text-xs shadow-lg shadow-emerald-950/80 hover:shadow-emerald-500/30 transition-all border border-emerald-400/50 group cursor-pointer"
            >
              <Timer className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span className="tracking-wide">دخول الميدان والتحكيم</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950/80 group-hover:translate-x-[-2px] transition-transform" />
            </button>
          </div>

        </div>

        {/* شريط التنقل للأجهزة المتوسطة والصغيرة (Mobile / Tablet Horizontal Tabs) */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar border-t border-slate-900">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                    : 'text-slate-400 bg-slate-900/60 border border-slate-800/80'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-black bg-black/40 text-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
