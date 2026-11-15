import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Globe,
  LogIn,
  Menu,
  X
} from 'lucide-react';
import { Button } from './Button';
import { setThemeMode, getStoredThemeMode, ThemeMode } from './tokens';

export interface PublicLayoutProps {
  currentTab?: string;
  onSelectTab?: (id: string) => void;
  onOpenAuth?: () => void;
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  currentTab = 'home',
  onSelectTab,
  onOpenAuth,
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>(getStoredThemeMode);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [currentLang, setCurrentLang] = useState<'ar' | 'fr' | 'en'>('ar');

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeMode(next);
  };

  const cycleLang = () => {
    const next = currentLang === 'ar' ? 'fr' : currentLang === 'fr' ? 'en' : 'ar';
    setCurrentLang(next);
  };

  const navLinks = [
    { id: 'public', label: 'الرئيسية والنتائج' },
    { id: 'design-system', label: 'نظام تصميم مضمار' },
    { id: 'competition', label: 'وضع المضمار ⏱️' },
    { id: 'coach', label: 'بوابة الأندية والمدربين' },
    { id: 'league', label: 'حساب الرابطة الولائية' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg,#FFFFFF)] text-[var(--ink,#0A0A0A)] flex flex-col" dir="rtl">
      {/* ═══ World Athletics Header: Solid Black Block with 3px Track Red Accent ═══ */}
      <header className="sticky top-0 z-40 bg-[var(--block,#0A0A0A)] text-white border-b-[3px] border-[var(--accent,#E5321B)] shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-[var(--radius-sm,2px)] bg-[var(--accent,#E5321B)] text-white flex items-center justify-center font-black text-lg">
              ⏱️
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5 font-athletic">
                <span>TRACK PRO</span>
                <span className="px-1.5 py-0.2 rounded bg-[var(--accent,#E5321B)] text-white text-[9px] font-black">
                  WA
                </span>
              </div>
              <p className="text-[10px] text-[#A3A39E]">World Athletics Federation System</p>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onSelectTab && onSelectTab(link.id)}
                  className={`
                    px-3 py-1.5 rounded-[var(--radius-sm,2px)] text-xs font-semibold transition-colors cursor-pointer select-none
                    ${
                      active
                        ? 'bg-[#1C1C1A] text-white font-black border-b-2 border-[var(--accent,#E5321B)]'
                        : 'text-[#B3B3AD] hover:text-white hover:bg-[#1C1C1A]'
                    }
                  `}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Actions & CTA */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="w-9 h-9 rounded-[var(--radius-sm,2px)] bg-[#1C1C1A] hover:bg-[#2E2E2B] flex items-center justify-center text-white border border-[#2E2E2B] transition cursor-pointer"
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 text-[var(--accent,#E5321B)]" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={cycleLang}
              className="h-9 px-2.5 rounded-[var(--radius-sm,2px)] bg-[#1C1C1A] hover:bg-[#2E2E2B] flex items-center gap-1 text-xs font-mono font-bold text-white border border-[#2E2E2B] transition cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>{currentLang.toUpperCase()}</span>
            </button>

            {/* Sign in Button */}
            {onOpenAuth && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenAuth}
                icon={<LogIn className="w-3.5 h-3.5" />}
              >
                <span>دخول البوابات</span>
              </Button>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--border)] bg-[var(--surface)] p-3 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  if (onSelectTab) onSelectTab(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`
                  w-full text-right p-2.5 rounded-[var(--radius-sm)] text-xs font-semibold transition flex items-center justify-between
                  ${currentTab === link.id ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-bold' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'}
                `}
              >
                <span>{link.label}</span>
                {currentTab === link.id && <span className="text-[var(--primary)] font-bold">●</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Public Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
