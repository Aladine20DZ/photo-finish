import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Shield,
  Settings,
  Bell,
  Sun,
  Moon,
  Globe,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  Activity,
  Award,
  Layers,
  Key,
  HelpCircle,
  FolderKanban,
  Flag,
  Command,
  Calendar,
  LogOut
} from 'lucide-react';
import { Drawer } from './Drawer';
import { Modal } from './Modal';
import { setThemeMode, getStoredThemeMode, ThemeMode } from './tokens';

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: 'accent' | 'success' | 'warning' | 'danger';
}

export interface AdminDashboardLayoutProps {
  currentTab?: string;
  onSelectTab?: (id: string) => void;
  userFullName?: string;
  userRoleLabel?: string;
  userAvatar?: string;
  activeCompetitionName?: string;
  navGroups?: NavGroup[];
  headerActions?: React.ReactNode;
  onLogout?: () => void;
  children: React.ReactNode;
}

const DEFAULT_NAV_GROUPS: NavGroup[] = [
  {
    title: 'لوحة التحكم • DASHBOARD',
    items: [
      { id: 'overview', label: 'نظرة عامة والجاهزية', icon: Activity, badge: 'Live', badgeVariant: 'accent' },
      { id: 'analytics', label: 'التقارير والإحصائيات', icon: Trophy },
      { id: 'design-system', label: 'نظام تصميم مضمار', icon: Layers, badge: 'Track Pro', badgeVariant: 'accent' },
    ],
  },
  {
    title: 'الأعضاء والفرق • PEOPLE',
    items: [
      { id: 'judges', label: 'الحكام والتكليفات', icon: Award, badge: 12 },
      { id: 'clubs', label: 'الأندية والجمعيات', icon: Shield },
      { id: 'athletes', label: 'سجل العدائين الموحد', icon: Users },
      { id: 'coaches', label: 'بوابة المدربين', icon: FolderKanban },
    ],
  },
  {
    title: 'المسابقات والميدان • BUSINESS',
    items: [
      { id: 'competitions', label: 'إدارة البطولات', icon: Flag },
      { id: 'competitions-bureau', label: 'مكتب المنافسات والنتائج', icon: Trophy, badge: 'V2', badgeVariant: 'accent' },
      { id: 'planning', label: 'مكتب التخطيط والبرمجة', icon: Calendar, badge: 'جديد', badgeVariant: 'accent' },
      { id: 'timing', label: 'غرفة التحكيم والتوقيت', icon: Trophy, badge: 'FAT' },
      { id: 'bibs', label: 'الصدريات الذكية', icon: Layers },
    ],
  },
  {
    title: 'المنظومة والنظام • SYSTEM',
    items: [
      { id: 'licensing', label: 'التراخيص المشفرة Ed25519', icon: Key },
      { id: 'settings', label: 'إعدادات المنظومة', icon: Settings },
      { id: 'support', label: 'الدعم والمساعدة الفيدرالية', icon: HelpCircle },
    ],
  },
];

export const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
  currentTab = 'overview',
  onSelectTab,
  userFullName = 'مشرف الرابطة الولائية',
  userRoleLabel = 'رابطة سعيدة لألعاب القوى',
  userAvatar = '🏃',
  activeCompetitionName = 'بطولة كأس الرابطة الولائية 2026',
  navGroups,
  headerActions,
  onLogout,
  children,
}) => {
  const groupsToRender = navGroups || DEFAULT_NAV_GROUPS;
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>(getStoredThemeMode);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentLang, setCurrentLang] = useState<'ar' | 'fr' | 'en'>('ar');

  // Handle Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeMode(next);
  };

  const cycleLang = () => {
    const next = currentLang === 'ar' ? 'fr' : currentLang === 'fr' ? 'en' : 'ar';
    setCurrentLang(next);
  };

  const handleItemClick = (id: string) => {
    if (onSelectTab) onSelectTab(id);
    setMobileDrawerOpen(false);
  };

  // Sidebar contents (248px expanded, 72px collapsed) - World Athletics Solid Black Block
  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between select-none bg-[var(--block,#0A0A0A)] text-white" dir="rtl">
      {/* Top: Logo & Title */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#2E2E2B]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-[var(--radius-sm,2px)] bg-[var(--accent,#E5321B)] flex items-center justify-center text-white font-black text-lg shrink-0">
              ⏱️
            </div>
            {(!collapsed || isMobile) && (
              <div className="truncate">
                <h1 className="text-xs font-black text-white tracking-wide flex items-center gap-1.5 font-athletic">
                  <span>TRACK PRO</span>
                  <span className="px-1.5 py-0.2 rounded-[var(--radius-sm,2px)] bg-[var(--accent,#E5321B)] text-white text-[9px] font-black">
                    WA
                  </span>
                </h1>
                <p className="text-[10px] text-[#7C7C77] truncate">World Athletics System</p>
              </div>
            )}
          </div>

          {!isMobile && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-[var(--radius-sm,2px)] hover:bg-[#1C1C1A] text-[#7C7C77] hover:text-white transition cursor-pointer"
              title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Groups & Items */}
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] no-scrollbar pr-0.5">
          {groupsToRender.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {(!collapsed || isMobile) && (
                <p className="text-[10px] font-black uppercase tracking-wider text-[#7C7C77] px-2.5">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      title={collapsed && !isMobile ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm,2px)] text-xs font-semibold transition-colors text-right cursor-pointer
                        ${
                          isActive
                            ? 'border-r-4 border-r-[var(--accent,#E5321B)] bg-[#1C1C1A] text-white font-black'
                            : 'text-[#B3B3AD] hover:text-white hover:bg-[#1C1C1A]'
                        }
                        ${collapsed && !isMobile ? 'justify-center px-1.5' : ''}
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--accent,#E5321B)]' : 'text-[#7C7C77]'}`} />
                      {(!collapsed || isMobile) && (
                        <div className="flex items-center justify-between flex-1 truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={`
                                text-[10px] px-1.5 py-0.2 rounded font-athletic font-bold shrink-0 mr-1.5 tabular-nums
                                ${
                                  item.badgeVariant === 'accent'
                                    ? 'bg-[var(--accent,#E5321B)] text-white'
                                    : 'bg-[#2E2E2B] text-white'
                                }
                              `}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: License Status */}
      {(!collapsed || isMobile) && (
        <div className="pt-3 border-t border-[#2E2E2B]">
          <div className="p-3 rounded-[var(--radius-sm,2px)] bg-[#141413] border border-[#2E2E2B] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">رخصة المنظومة</span>
              <span className="text-[10px] text-[var(--accent,#E5321B)] font-athletic font-bold tabular-nums">12 / 20 مقعد</span>
            </div>
            <div className="w-full h-1.5 rounded bg-[#2E2E2B] overflow-hidden">
              <div className="h-full bg-[var(--accent,#E5321B)] rounded w-[60%]" />
            </div>
            <p className="text-[10px] text-[#7C7C77]">تفعيل متزامن مع برج الحكام</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg,#FFFFFF)] text-[var(--ink,#0A0A0A)] flex" dir="rtl">
      {/* ═══ 1. Fixed Right Sidebar (248px or 72px collapsed) ═══ */}
      <aside
        className={`
          hidden lg:block shrink-0 transition-all duration-150 z-30 border-l border-[#2E2E2B] bg-[var(--block,#0A0A0A)]
          ${collapsed ? 'w-[72px]' : 'w-[248px]'}
        `}
      >
        <div className="h-screen sticky top-0 p-3.5 flex flex-col bg-[var(--block,#0A0A0A)]">
          {renderNavContent(false)}
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        side="right"
        width="w-72"
      >
        {renderNavContent(true)}
      </Drawer>

      {/* ═══ 2. Main Area (Minimal Topbar + Comfortable Container) ═══ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden bg-[var(--bg,#FFFFFF)]">
        
        {/* Minimal White Topbar */}
        <header className="h-16 px-4 sm:px-6 bg-[var(--surface,#FFFFFF)] border-b border-[var(--border,#DADAD6)] flex items-center justify-between gap-3 shrink-0 z-20">
          
          {/* Right: Mobile toggle + Active Competition Switcher + Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Active Competition Switcher */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-xs">
              <Flag className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="font-bold text-[var(--ink)] truncate max-w-[200px]" title={activeCompetitionName}>
                {activeCompetitionName}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--primary-soft)] text-[var(--primary)] font-bold">
                نشطة
              </span>
            </div>

            {/* Quick Search Bar with (Ctrl + K) */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--border)] border border-[var(--border)] text-xs text-[var(--ink-3)] hover:text-[var(--ink)] transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[var(--ink-3)] group-hover:text-[var(--primary)] transition-colors" />
                <span className="hidden md:inline">بحث شامل (عداء، منافسة، حكم)...</span>
                <span className="md:hidden">بحث...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px] font-mono text-[var(--ink-3)]">
                <Command className="w-3 h-3" /> K
              </kbd>
            </button>
          </div>

          {/* Left: Actions & User */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {headerActions && (
              <div className="flex items-center gap-2">
                {headerActions}
              </div>
            )}

            {/* Notifications Button */}
            <button
              type="button"
              className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--border)] flex items-center justify-center text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--border)] transition relative cursor-pointer"
              title="التنبيهات الفيدرالية"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] absolute top-2 right-2" />
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--border)] flex items-center justify-center text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--border)] transition cursor-pointer"
              title={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 text-[var(--accent)]" /> : <Sun className="w-4 h-4 text-[var(--warning)]" />}
            </button>

            {/* Language Toggle Button */}
            <button
              type="button"
              onClick={cycleLang}
              className="h-9 px-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--border)] flex items-center gap-1.5 text-xs font-bold text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--border)] transition cursor-pointer"
              title="تغيير اللغة (Language)"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="font-mono uppercase">{currentLang}</span>
            </button>

            {/* User Profile Card */}
            <div className="flex items-center gap-2 pr-2 border-r border-[var(--border)]">
              <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-base font-bold shrink-0">
                {userAvatar}
              </div>
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-[var(--ink)] truncate max-w-[130px]">{userFullName}</div>
                <div className="text-[10px] text-[var(--ink-3)] truncate max-w-[130px]">{userRoleLabel}</div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-[var(--radius-sm)] hover:bg-rose-50 text-[var(--ink-3)] hover:text-[var(--danger)] transition cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ═══ Content Container (Comfortable Max-Width) ═══ */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Search Modal (Ctrl+K) */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="البحث الشامل في المنظومة الفيدرالية"
        subtitle="ابحث بالاسم، رقم الصدرية، أو المنافسة الرياضية"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--ink-3)] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="اكتب للبحث الفوري..."
              className="w-full pr-10 pl-3.5 py-2.5 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="text-[11px] font-bold text-[var(--ink-3)]">اقتراحات سريعة:</p>
            {[
              { title: 'بطولة كأس الرابطة الولائية بسعيدة 2026', type: 'بطولة معتمدة', icon: Flag },
              { title: 'الحكم كمال بوعلام — مسدس الانطلاق', type: 'حكم معتمد', icon: Award },
              { title: 'نادي أولمبيك سعيدة (OSA)', type: 'نادٍ رياضي', icon: Shield },
              { title: 'العداء يوسف العبدلي (100م - 09.96s)', type: 'رقم قياسي TR31', icon: Trophy },
            ]
              .filter((item) => !searchQuery || item.title.includes(searchQuery))
              .map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSearchModalOpen(false)}
                    className="w-full flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-right transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center">
                        <ItemIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--ink)]">{item.title}</div>
                        <div className="text-[10px] text-[var(--ink-3)]">{item.type}</div>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--primary)] font-bold">فتح ↵</span>
                  </button>
                );
              })}
          </div>
        </div>
      </Modal>
    </div>
  );
};
