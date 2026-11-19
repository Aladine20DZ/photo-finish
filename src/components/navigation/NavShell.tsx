/**
 * PHOTO FINISH PRO AI — Global Navigation Shell & Header
 * Elite Athletics Federation Design: World Athletics / Diamond League Aesthetics.
 * Dual-tier layout: Live Event Ribbon + Official Federation Navbar.
 * Fully restored to the authentic dark athletics layout and colors:
 * - Deep midnight slate (#020617) with vibrant athletics emerald (#10B981) and gold (#F59E0B) accents.
 * - Top Ribbon: Live event ticker, venue, official clock, league selector dropdown with registration,
 *   offline/cloud indicator, manual timing button, theme switcher, duty code / portal login, and language switcher.
 * - Bottom Tier: Federation brand logo, official navigation tabs with glowing active pill, and field timing CTA.
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Globe, 
  Shield, 
  Timer, 
  Cloud, 
  Radio,
  Sun,
  Moon,
  Sunset,
  ScanLine,
  Key,
  Calendar,
  ArrowRight,
  FileSpreadsheet,
  Check,
  ChevronDown
} from 'lucide-react';
import { useTranslation } from '../../services/i18nService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { portalAuthService, PortalType, PortalSession } from '../../services/portalAuthService';
import { competitionsService, NationalCompetition } from '../../services/competitionsService';

export type NavTab = 
  | 'public' 
  | 'competitions' 
  | 'competitions-bureau'
  | 'entries'
  | 'sheets'
  | 'judges-office'
  | 'planning'
  | 'league' 
  | 'coach' 
  | 'competition' 
  | 'analytics' 
  | 'admin' 
  | 'results' 
  | 'design-system' 
  | 'login';

interface NavShellProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAuthModal?: (targetPortal?: PortalType) => void;
  onOpenManualTiming?: () => void;
}

export const NavShell: React.FC<NavShellProps> = ({
  currentTab,
  onTabChange,
  onOpenAuthModal,
  onOpenManualTiming
}) => {
  const { lang, setLanguage } = useTranslation();
  const isCloudOnline = isSupabaseConfigured();
  const [leagueSession, setLeagueSession] = useState<PortalSession | null>(() => portalAuthService.getSession('league'));
  const [coachSession, setCoachSession] = useState<PortalSession | null>(() => portalAuthService.getSession('coach'));

  useEffect(() => {
    const unsub = portalAuthService.subscribe(() => {
      setLeagueSession(portalAuthService.getSession('league'));
      setCoachSession(portalAuthService.getSession('coach'));
    });
    return unsub;
  }, []);

  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeCompetition, setActiveCompetition] = useState<NationalCompetition | null>(null);
  const [availableComps, setAvailableComps] = useState<NationalCompetition[]>([]);
  const [showCompSelector, setShowCompSelector] = useState<boolean>(false);

  useEffect(() => {
    competitionsService.getActiveCompetition().then(c => setActiveCompetition(c));
    competitionsService.getCompetitions().then(list => setAvailableComps(list));

    const unsubComp = competitionsService.onCompetitionsChanged(comps => {
      setAvailableComps(comps);
    });
    const unsubActive = competitionsService.onActiveCompetitionChanged(c => {
      setActiveCompetition(c);
    });

    const handleActiveEv = (e: Event) => {
      const ce = e as CustomEvent<NationalCompetition | null>;
      if (ce.detail) setActiveCompetition(ce.detail);
    };
    window.addEventListener('pfp:active-competition-changed', handleActiveEv);

    return () => {
      unsubComp();
      unsubActive();
      window.removeEventListener('pfp:active-competition-changed', handleActiveEv);
    };
  }, []);

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

  // عناصر شريط التنقل الرئيسي للواجهة العامة: الرئيسية، أوراق النتائج الرقمية، النتائج المعتمدة، المنافسات والرزنامة، النوادي والرياضيون، إدارة الرابطة
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'public', label: 'الرئيسية', icon: <Globe className="w-4 h-4" /> },
    { id: 'sheets', label: 'أوراق النتائج الرقمية', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />, badge: 'FAA' },
    { id: 'results', label: 'النتائج المعتمدة', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { id: 'competitions', label: 'المنافسات والرزنامة', icon: <Calendar className="w-4 h-4 text-emerald-400" /> },
    { id: 'entries', label: 'النوادي والرياضيون', icon: <FileSpreadsheet className="w-4 h-4 text-cyan-400" /> },
    { id: 'league', label: 'إدارة الرابطة', icon: <Shield className="w-4 h-4 text-teal-400" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[var(--block,#0A0A0A)] text-white border-b-[3px] border-[var(--accent,#E5321B)] shadow-none transition-all" dir="rtl">
      
      {/* ═══ 1. الشريط الشرفي العلوي الرفيع (Top Utility / Live Ribbon) ═══ */}
      <div className="bg-[#141413] border-b border-[#2E2E2B] text-[11px] font-semibold text-slate-300 py-1 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* اليمين: مؤشر البث المباشر للبطولة والوقت الرسمي */}
          <div className="flex items-center gap-3 truncate">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-black shrink-0 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-rose-500/80 shadow" />
              <span>مباشر 🔴</span>
            </div>
            
            <div className="relative hidden sm:flex items-center gap-2 text-slate-300 truncate">
              <button
                type="button"
                onClick={() => setShowCompSelector(!showCompSelector)}
                className="flex items-center gap-1.5 hover:bg-slate-800/80 px-2 py-0.5 rounded-lg transition-all text-right cursor-pointer"
                title="اضغط لتبديل المنافسة النشطة المعتمدة في النظام"
              >
                <span className="text-amber-300 font-extrabold truncate max-w-[280px]">
                  {activeCompetition?.name || 'البطولة الولائية لألعاب القوى - سعيدة 2026'}
                </span>
                <ChevronDown className="w-3 h-3 text-amber-400 shrink-0" />
              </button>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 truncate text-[10px]">
                {activeCompetition?.venue || 'مضمار 13 أفريل 1958، سعيدة'}
              </span>

              {/* القائمة المنسدلة لتبديل المنافسة النشطة */}
              {showCompSelector && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] font-black text-amber-400 border-b border-slate-800">
                    <span>اختر المنافسة النشطة:</span>
                    <span className="text-slate-400">{availableComps.length} منافسات</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {availableComps.map(comp => {
                      const isActive = comp.id === activeCompetition?.id;
                      return (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => {
                            competitionsService.setActiveCompetitionId(comp.id, comp.leagueId);
                            setActiveCompetition(comp);
                            setShowCompSelector(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-right transition-all cursor-pointer ${
                            isActive
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                              : 'hover:bg-slate-900 text-slate-300'
                          }`}
                        >
                          <div className="truncate">
                            <p className="font-bold text-xs truncate">{comp.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{comp.venue} • {comp.date}</p>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-amber-400 shrink-0 mr-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-emerald-400">
                <Timer className="w-3 h-3 text-emerald-400" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* اليسار: مؤشر السحابة، التوقيت اليدوي، الثيم، الدخول واللغات */}
          <div className="flex items-center gap-2 shrink-0">
            
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

            {/* زر التوقيت اليدوي السريع (Image 4) */}
            {onOpenManualTiming && (
              <button
                onClick={onOpenManualTiming}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-950/80 hover:bg-teal-900 border border-teal-500/50 text-[10px] font-black text-teal-300 hover:text-white transition-all cursor-pointer shadow-sm"
                title="فتح وحدة التوقيت اليدوي للأروقة والمسافات"
              >
                <Timer className="w-3 h-3 text-teal-400" />
                <span className="hidden sm:inline">توقيت يدوي</span>
              </button>
            )}
            
            {/* زر تبديل الثيم: ليلي / شمسي عالي التباين للميدان / نهاري */}
            <button
              onClick={cycleTheme}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-emerald-400 hover:border-emerald-800 transition-all cursor-pointer"
              title="تبديل النمط: ليلي / وضع الشمس عالي التباين للميدان / نهاري"
            >
              {theme === 'sunlight' ? <Sun className="w-3 h-3 text-amber-400" /> : theme === 'light' ? <Sunset className="w-3 h-3 text-orange-400" /> : <Moon className="w-3 h-3 text-slate-300" />}
              <span className="hidden md:inline">{theme === 'sunlight' ? 'ميداني شمسي' : theme === 'light' ? 'نهاري' : 'ليلي'}</span>
            </button>

            {/* زر الدخول المباشر بكود المهمة */}
            <button
              onClick={() => onTabChange('competition')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-black text-emerald-300 hover:bg-emerald-900 transition-all cursor-pointer shadow-sm"
              title="دخول الحكام بكود التكليف الرسمي"
            >
              <ScanLine className="w-3 h-3 text-emerald-400" />
              <span>كود المهمة 🔑</span>
            </button>

            {/* زر تسجيل الدخول وتبديل حساب البوابات */}
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal(currentTab === 'coach' ? 'coach' : currentTab === 'admin' ? 'admin' : currentTab === 'competition' ? 'judge' : 'league')}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-600/60 text-[10px] font-black text-amber-300 transition-all cursor-pointer shadow-sm"
              title="تسجيل الدخول / تبديل حساب البوابة"
            >
              <Key className="w-3 h-3 text-amber-400" />
              <span>
                {leagueSession 
                  ? `🏛️ ${leagueSession.leagueShort || 'الرابطة'}` 
                  : coachSession 
                  ? `🏃 ${coachSession.clubName?.split(' ')[0] || 'المدرب'}` 
                  : 'دخول البوابات 🔐'}
              </span>
            </button>

            {/* محدد اللغات السريع */}
            <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px] font-extrabold">
              <button 
                onClick={() => setLanguage('ar')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${lang === 'ar' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                عربي
              </button>
              <button 
                onClick={() => setLanguage('fr')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${lang === 'fr' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                FR
              </button>
              <button 
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${lang === 'en' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* ═══ 2. الشريط الرئيسي الفاخر (Main Federation Header) (Image 4) ═══ */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-20 gap-3">
          
          {/* شعار المنظومة وهوية الرابطة الاحترافية */}
          <button 
            onClick={() => onTabChange('public')}
            className="flex items-center gap-3 group text-start focus:outline-none shrink-0 cursor-pointer"
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
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-wider text-white">
                  رابطة ألعاب القوى سعيدة
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-md tracking-tight shadow">
                  LWAS
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/90 font-bold truncate max-w-[320px]">
                SAIDA ATHLETICS LEAGUE • المنصة الرقمية الرسمية
              </p>
            </div>
          </button>

          {/* عناصر التنقل الرئيسية (Desktop Navigation Items) */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-900/70 p-1.5 rounded-2xl border border-emerald-900/30 shadow-inner">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
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

          {/* الزر الرئيسي للدعوة الميدانية (Call to Action Button) وحساب الرابطة النشط */}
          <div className="flex items-center gap-2">
            {leagueSession && (
              <button
                type="button"
                onClick={() => onTabChange('league')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/50 text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-sm"
                title="لوحة تحكم حساب الرابطة"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">حساب الرابطة:</span>
                <span className="font-black text-white">{leagueSession.leagueShort || 'الرابطة'}</span>
              </button>
            )}

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
        <div className="xl:hidden flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar border-t border-slate-900">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                    : 'text-slate-400 bg-slate-900/60 border border-slate-800/80 hover:text-white'
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
