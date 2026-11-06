/**
 * PHOTO FINISH PRO AI — Unified Multi-Portal Authentication Gate
 * Provides dedicated username & password authentication for:
 *   - League & Federation Executives (with New League Registration)
 *   - Club Coaches
 *   - Field Judges & Referees (Duty Code or Room Credentials)
 *   - Super Administrators
 */

import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  Timer, 
  Settings, 
  Lock, 
  User, 
  Key, 
  Sparkles, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  PlusCircle, 
  LogOut
} from 'lucide-react';
import { portalAuthService, PortalType, PortalSession } from '../../services/portalAuthService';
import { LeagueRegistrationModal } from '../league/LeagueRegistrationModal';

interface PortalAuthModalProps {
  isOpen: boolean;
  initialPortal?: PortalType;
  onClose: () => void;
  onAuthSuccess: (session: PortalSession) => void;
}

export const PortalAuthModal: React.FC<PortalAuthModalProps> = ({
  isOpen,
  initialPortal = 'league',
  onClose,
  onAuthSuccess
}) => {
  const [activePortal, setActivePortal] = useState<PortalType>(initialPortal === 'public' ? 'league' : initialPortal);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('laa_algiers');
  const [selectedClubId, setSelectedClubId] = useState<string>('club_mca');
  const [dutyCode, setDutyCode] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [judgeRole, setJudgeRole] = useState<'judge' | 'start' | 'finish' | 'chambre_dappel'>('judge');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeagueRegister, setShowLeagueRegister] = useState(false);

  if (!isOpen) return null;

  const currentSession = portalAuthService.getSession(activePortal);
  const leagues = portalAuthService.getAllLeagues();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let res: { success: boolean; session?: PortalSession; error?: string } = { success: false };

    if (activePortal === 'league') {
      res = await portalAuthService.loginLeague(username || 'laa_admin', password || 'League@2026', selectedLeagueId);
    } else if (activePortal === 'coach') {
      res = await portalAuthService.loginCoach(username || 'coach_mca', password || 'Coach@2026', selectedClubId);
    } else if (activePortal === 'judge') {
      res = await portalAuthService.loginJudge({
        dutyCode: dutyCode.trim() || undefined,
        judgeName: judgeName.trim() || undefined,
        role: judgeRole
      });
    } else if (activePortal === 'admin') {
      res = await portalAuthService.loginAdmin(password || 'Admin@PhotoFinish2026!');
    }

    setLoading(false);

    if (!res.success || !res.session) {
      setError(res.error || 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات.');
      return;
    }

    onAuthSuccess(res.session);
    onClose();
  };

  const handleQuickDemo = (user: string, pass: string, leagueOrClub?: string) => {
    setUsername(user);
    setPassword(pass);
    if (activePortal === 'league' && leagueOrClub) setSelectedLeagueId(leagueOrClub);
    if (activePortal === 'coach' && leagueOrClub) setSelectedClubId(leagueOrClub);
  };

  const handleLogout = () => {
    portalAuthService.logout(activePortal);
    setError(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-emerald-700/60 shadow-2xl overflow-hidden flex flex-col">
          
          {/* Top Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-emerald-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg">
                🔐
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
                  Role-Based Authentication (RBAC)
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  تسجيل الدخول لبوابات المنظومة
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-4 bg-slate-950 p-1.5 border-b border-slate-800 gap-1 text-xs font-bold">
            {[
              { id: 'league' as PortalType, label: 'الرابطات', icon: <Shield className="w-3.5 h-3.5" /> },
              { id: 'coach' as PortalType, label: 'المدربون', icon: <Users className="w-3.5 h-3.5" /> },
              { id: 'judge' as PortalType, label: 'الحكام', icon: <Timer className="w-3.5 h-3.5" /> },
              { id: 'admin' as PortalType, label: 'الإدارة', icon: <Settings className="w-3.5 h-3.5" /> },
            ].map(p => {
              const active = activePortal === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePortal(p.id);
                    setError(null);
                  }}
                  className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950 font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Session Notification */}
          {currentSession && (
            <div className="p-4 mx-6 mt-6 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    أنت مسجل حالياً: <span className="text-emerald-300 font-black">{currentSession.fullName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {currentSession.leagueName || currentSession.clubName || currentSession.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    onAuthSuccess(currentSession);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition-all cursor-pointer"
                >
                  متابعة الدخول ←
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            
            {/* ═══ 1. LEAGUE LOGIN TAB ═══ */}
            {activePortal === 'league' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">اختر الرابطة أو الاتحاد:</span>
                  <button
                    type="button"
                    onClick={() => setShowLeagueRegister(true)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>تسجيل حساب رابطة جديدة +</span>
                  </button>
                </div>

                <select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.logoCode} {l.shortName} • {l.name}
                    </option>
                  ))}
                </select>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم أو البريد الرسمي للرابطة</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="laa_admin أو laa@athletic.dz"
                      className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-semibold text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Demo Quick Fills */}
                <div className="pt-1">
                  <div className="text-[11px] text-slate-400 font-bold mb-1.5">أو جرب بنقرة واحدة كحساب معتمد:</div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('laa_admin', 'League@2026', 'laa_algiers')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-600 transition-colors"
                    >
                      🏛️ رابطة الجزائر (LAA)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('faa_admin', 'League@2026', 'faa_national')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-600 transition-colors"
                    >
                      🇩🇿 الاتحاد الوطني (FAA)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('lao_admin', 'League@2026', 'lao_oran')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-600 transition-colors"
                    >
                      🏃 رابطة وهران (LAO)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ 2. COACH LOGIN TAB ═══ */}
            {activePortal === 'coach' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">النادي الرياضي التابع له</label>
                  <select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="club_mca">مولودية الجزائر (MCA)</option>
                    <option value="club_crb">شباب بلوزداد (CRB)</option>
                    <option value="club_ess">وفاق سطيف (ESS)</option>
                    <option value="club_aso">أولمبي الشلف (ASO)</option>
                    <option value="club_csc">شباب قسنطينة (CSC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم مستخدم المدرب أو البريد</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="coach_mca أو coach@mca.dz"
                      className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-semibold text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <div className="text-[11px] text-slate-400 font-bold mb-1.5">حساب تجريبي سريع:</div>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('coach_mca', 'Coach@2026', 'club_mca')}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-600 text-xs transition-colors"
                  >
                    🟢 مدرب مولودية الجزائر (MCA)
                  </button>
                </div>
              </div>
            )}

            {/* ═══ 3. JUDGE LOGIN TAB ═══ */}
            {activePortal === 'judge' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">كود التكليف الميداني الرسمي (Duty Code)</label>
                  <input
                    type="text"
                    value={dutyCode}
                    onChange={(e) => setDutyCode(e.target.value.toUpperCase())}
                    placeholder="مثال: START-9K4M أو FINISH-7X2A أو LIG31-7K4M-Q9TX"
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono font-black text-amber-300 uppercase tracking-wider focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">إذا كان لديك كود تكليف من الرابطة، أدخله هنا لفتح دورك مباشرة.</span>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-500">أو اختر دورك الميداني</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الحكم</label>
                    <input
                      type="text"
                      value={judgeName}
                      onChange={(e) => setJudgeName(e.target.value)}
                      placeholder="اسمك الكامل"
                      className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">دور الهاتف</label>
                    <select
                      value={judgeRole}
                      onChange={(e) => setJudgeRole(e.target.value as any)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none"
                    >
                      <option value="judge">الحكم العام (Chief Judge)</option>
                      <option value="finish">كاميرا خط النهاية (Photo Finish)</option>
                      <option value="start">مسدس الانطلاق (Starter Gun)</option>
                      <option value="chambre_dappel">غرفة النداء (Call Room)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ 4. ADMIN LOGIN TAB ═══ */}
            {activePortal === 'admin' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-300">
                  <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>بوابة الإدارة العامة للمنصة، تراخيص التفعيل الشاملة، والتحكم بالنظام.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة مرور المشرف العام (Master Key)</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة مرور الإدارة"
                      className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setPassword('Admin@PhotoFinish2026!')}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 text-[11px] transition-colors"
                  >
                    استخدام كلمة مرور المشرف الافتراضية
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{loading ? 'جارٍ التحقق...' : 'تسجيل الدخول وفتح البوابة ←'}</span>
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Modal تسجيل حساب رابطة جديدة */}
      <LeagueRegistrationModal
        isOpen={showLeagueRegister}
        onClose={() => setShowLeagueRegister(false)}
        onSuccess={(newLeague) => {
          setShowLeagueRegister(false);
          setSelectedLeagueId(newLeague.id);
          setUsername(newLeague.adminUsername);
          setPassword(newLeague.adminPassword);
          const sess = portalAuthService.getSession('league');
          if (sess) {
            onAuthSuccess(sess);
            onClose();
          }
        }}
      />
    </>
  );
};
