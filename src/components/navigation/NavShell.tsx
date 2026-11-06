/**
 * PHOTO FINISH PRO AI — Global Navigation Shell & Header (Stage 2)
 * Athletics Design Tokens: Emerald, Gold, Track Slate, RTL Native.
 */

import React from 'react';
import { 
  Trophy, 
  Globe, 
  Shield, 
  Users, 
  Timer, 
  Cpu, 
  Settings, 
  Cloud, 
  CloudOff, 
  Languages, 
  ChevronDown 
} from 'lucide-react';
import { useTranslation, SupportedLanguage } from '../../services/i18nService';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export type NavTab = 'public' | 'league' | 'coach' | 'competition' | 'analytics' | 'admin';

interface NavShellProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeLeagueName?: string;
  onSelectLeague?: () => void;
}

export const NavShell: React.FC<NavShellProps> = ({
  currentTab,
  onTabChange,
  activeLeagueName = 'الاتحاد الجزائري لألعاب القوى (FAA)',
  onSelectLeague
}) => {
  const { t, lang, setLanguage } = useTranslation();
  const isCloudOnline = isSupabaseConfigured();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'public', label: t('nav_public'), icon: <Globe className="w-4 h-4" /> },
    { id: 'league', label: t('nav_league'), icon: <Shield className="w-4 h-4" /> },
    { id: 'coach', label: t('nav_coach'), icon: <Users className="w-4 h-4" /> },
    { id: 'competition', label: t('nav_field'), icon: <Timer className="w-4 h-4 text-emerald-400" />, badge: '1/1000s' },
    { id: 'analytics', label: t('nav_ai'), icon: <Cpu className="w-4 h-4 text-cyan-400" />, badge: 'AI' },
    { id: 'admin', label: t('nav_admin'), icon: <Settings className="w-4 h-4" /> }
  ];

  const cycleLanguage = () => {
    const next: Record<SupportedLanguage, SupportedLanguage> = {
      ar: 'fr',
      fr: 'en',
      en: 'ar'
    };
    setLanguage(next[lang]);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-emerald-900/40 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onTabChange('public')}
              className="flex items-center gap-2.5 group text-start focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/30 group-hover:ring-emerald-400/60 transition-all">
                <Trophy className="w-5 h-5 text-amber-300 drop-shadow" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                    PHOTO FINISH PRO
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-slate-950 rounded-md tracking-tighter">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[220px]">
                  {t('app_tagline')}
                </p>
              </div>
            </button>

            {/* League Switcher Pill */}
            <button 
              onClick={onSelectLeague}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-emerald-700/60 text-xs font-semibold text-slate-300 hover:text-emerald-300 transition-all shadow-inner"
              title="تغيير الرابطة / الاتحاد النشط"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[180px]">{activeLeagueName}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`px-1 py-0.2 rounded text-[9px] font-extrabold ${
                      active ? 'bg-black/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Area: Status, Language & Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Cloud Sync Status */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                isCloudOnline 
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50' 
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
              }`}
              title={isCloudOnline ? t('status_online') : t('status_offline')}
            >
              {isCloudOnline ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Supabase</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">{t('status_offline')}</span>
                </>
              )}
            </div>

            {/* Language Selector */}
            <button
              onClick={cycleLanguage}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all"
              title="تغيير اللغة (AR / FR / EN)"
            >
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <span className="uppercase">{lang}</span>
            </button>
          </div>

        </div>

        {/* Mobile Horizontal Tabs Scroll */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 no-scrollbar border-t border-slate-900">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 bg-slate-900/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
