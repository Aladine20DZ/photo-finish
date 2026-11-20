/**
 * PHOTO FINISH PRO AI — Master Unified Authentication & Registration Hub
 * Unified Identity Gate: Single Active Session Architecture.
 * Combines All Account Logins & New Registrations (Leagues, Coaches/Clubs, Judges, Super Admin)
 * into a single high-contrast window, preventing duplicate/conflicting multi-account sessions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Users, 
  Timer, 
  Settings, 
  Lock, 
  User, 
  Key, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  LogOut,
  Building2,
  Award,
  ArrowRight,
  UserPlus,
  LogIn
} from 'lucide-react';
import { portalAuthService, PortalType, PortalSession } from '../../services/portalAuthService';

export interface PortalAuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  initialPortal?: PortalType;
  onClose: () => void;
  onAuthSuccess?: (session: PortalSession) => void;
}

export const PortalAuthModal: React.FC<PortalAuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  initialPortal = 'league',
  onClose,
  onAuthSuccess
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [activePortal, setActivePortal] = useState<PortalType>(initialPortal === 'public' ? 'league' : initialPortal);
  const [activeSession, setActiveSession] = useState<PortalSession | null>(() => portalAuthService.getActiveSession());

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClubId] = useState<string>('club_mca');
  const [dutyCode, setDutyCode] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [judgeRole, setJudgeRole] = useState<'judge' | 'start' | 'finish' | 'chambre_dappel'>('judge');

  // Register New League Form State
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueShort, setNewLeagueShort] = useState('');
  const [newLeagueWilaya, setNewLeagueWilaya] = useState('سعيدة');
  const [newLeagueAdminName, setNewLeagueAdminName] = useState('');
  const [newLeaguePhone, setNewLeaguePhone] = useState('');
  const [newLeagueEmail] = useState('');
  const [newLeagueUsername, setNewLeagueUsername] = useState('');
  const [newLeaguePassword, setNewLeaguePassword] = useState('');

  // Register New Coach & Club Form State
  const [newCoachName, setNewCoachName] = useState('');
  const [newClubName, setNewClubName] = useState('');
  const [newCoachWilaya, setNewCoachWilaya] = useState('سعيدة');
  const [newCoachPhone] = useState('');
  const [newCoachEmail] = useState('');
  const [newCoachUsername, setNewCoachUsername] = useState('');
  const [newCoachPassword, setNewCoachPassword] = useState('');

// Judge registered via League Duty Codes

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    setActiveSession(portalAuthService.getActiveSession());
    const unsub = portalAuthService.subscribe(() => {
      setActiveSession(portalAuthService.getActiveSession());
    });
    return unsub;
  }, []);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (!prevOpenRef.current && isOpen) {
      if (initialMode) setAuthMode(initialMode);
      if (initialPortal && initialPortal !== 'public') setActivePortal(initialPortal);
      setError(null);
      setSuccessNotice(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialMode, initialPortal]);

  if (!isOpen) return null;

  // ═══ معالجة تسجيل الدخول ═══
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    let res: { success: boolean; session?: PortalSession; error?: string } = { success: false };

    if (activePortal === 'league') {
      if (!username.trim() || !password) {
        setError('يرجى إدخال اسم المستخدم وكلمة المرور للرابطة.');
        setLoading(false);
        return;
      }
      res = await portalAuthService.loginLeague(username.trim(), password);
    } else if (activePortal === 'coach') {
      if (!username.trim() || !password) {
        setError('يرجى إدخال اسم المستخدم وكلمة المرور للمدرب.');
        setLoading(false);
        return;
      }
      res = await portalAuthService.loginCoach(username.trim(), password, selectedClubId);
    } else if (activePortal === 'judge') {
      res = await portalAuthService.loginJudge({
        dutyCode: dutyCode.trim() || undefined,
        judgeName: judgeName.trim() || undefined,
        role: judgeRole
      });
    } else if (activePortal === 'admin') {
      if (!password) {
        setError('يرجى إدخال كلمة مرور الإدارة العامة.');
        setLoading(false);
        return;
      }
      res = await portalAuthService.loginAdmin(password);
    }

    setLoading(false);

    if (!res.success || !res.session) {
      setError(res.error || 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات المدخلة.');
      return;
    }

    if (onAuthSuccess) onAuthSuccess(res.session);
    onClose();
  };

  // ═══ معالجة تسجيل رابطة جديدة ═══
  const handleRegisterLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim() || !newLeagueShort.trim()) {
      setError('يرجى إدخال اسم الرابطة والاسم المختصر.');
      return;
    }
    if (!newLeagueUsername.trim() || newLeaguePassword.length < 4) {
      setError('اسم مستخدم المشرف مطلوب وكلمة المرور لا تقل عن 4 خانات.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await portalAuthService.registerNewLeague({
      name: newLeagueName.trim(),
      shortName: newLeagueShort.trim().toUpperCase(),
      type: 'wilaya',
      region: `${newLeagueWilaya} • المستوى الولائي`,
      wilaya: newLeagueWilaya,
      logoCode: '🏃',
      accreditationNumber: `LAAP-${newLeagueShort.slice(0, 3)}-2026`,
      officialEmail: newLeagueEmail.trim() || `${newLeagueShort.toLowerCase()}@athletic.dz`,
      phone: newLeaguePhone.trim() || '+213 65 00 00 00',
      adminFullName: newLeagueAdminName.trim() || `مشرف الرابطة الولائية ${newLeagueName}`,
      adminUsername: newLeagueUsername.trim().toLowerCase(),
      adminPassword: newLeaguePassword
    });

    setLoading(false);

    if (!res.success || !res.league) {
      setError(res.error || 'حدث خطأ أثناء تسجيل الرابطة.');
      return;
    }

    // Auto-login succeeds with single active session
    const active = portalAuthService.getActiveSession();
    if (active && onAuthSuccess) onAuthSuccess(active);
    onClose();
  };

  // ═══ معالجة تسجيل مدرب ونادٍ جديد ═══
  const handleRegisterCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoachName.trim() || !newClubName.trim()) {
      setError('يرجى إدخال اسم المدرب واسم النادي الرياضي.');
      return;
    }
    if (!newCoachUsername.trim() || newCoachPassword.length < 4) {
      setError('اسم المستخدم لا يقل عن 3 أحرف وكلمة المرور 4 أحرف.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await portalAuthService.registerCoachAndClub({
      coachName: newCoachName.trim(),
      clubName: newClubName.trim(),
      wilaya: newCoachWilaya,
      licenseNumber: '',
      phone: newCoachPhone.trim(),
      email: newCoachEmail.trim(),
      username: newCoachUsername.trim(),
      password: newCoachPassword
    });

    setLoading(false);

    if (!res.success || !res.session) {
      setError(res.error || 'حدث خطأ أثناء تفعيل حساب المدرب والنادي.');
      return;
    }

    if (onAuthSuccess) onAuthSuccess(res.session);
    onClose();
  };

  const handleLogoutCurrentSession = () => {
    portalAuthService.logoutAll();
    setActiveSession(null);
    setError(null);
    setSuccessNotice('تم تسجيل الخروج بنجاح. يمكنك الآن الدخول بحساب جديد.');
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-xl max-h-[92vh] rounded-3xl bg-slate-900 border border-emerald-600/60 shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* ═══ 1. الشريط العلوي المشترك (Header) ═══ */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-emerald-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg shrink-0">
              {authMode === 'login' ? '🔐' : '📝'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  حساب نشط موحد • Single Identity
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {authMode === 'login' ? 'تسجيل الدخول إلى المنظومة' : 'إنشاء وتفعيل حساب جديد'}
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

        {/* ═══ 2. محدد النمط الرئيسي: تسجيل دخول vs فتح حساب جديد ═══ */}
        <div className="grid grid-cols-2 bg-slate-950 p-2 border-b border-slate-800 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-950 ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول 🔑</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-950 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>فتح حساب جديد 📝</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* ═══ 3. شارة الحساب النشط حالياً (لمنع تعدد وتسرب الجلسات) ═══ */}
          {activeSession ? (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    الحساب النشط حالياً:{' '}
                    <span className="text-emerald-300 font-black">{activeSession.fullName}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 truncate font-mono">
                    {activeSession.role === 'league_admin' ? `🏛️ مدير الرابطة (${activeSession.leagueShort || 'سعيدة'})` :
                     activeSession.role === 'club_coach' ? `🏃 مدرب نادي (${activeSession.clubName || 'معتمد'})` :
                     activeSession.role === 'super_admin' ? '👑 المدير العام للمنظومة' : '⏱️ حكم مسابقات'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (onAuthSuccess) onAuthSuccess(activeSession);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition cursor-pointer flex items-center gap-1"
                >
                  <span>متابعة</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleLogoutCurrentSession}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition cursor-pointer"
                  title="تسجيل الخروج والتبديل لحساب آخر"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}

          {/* رسائل التنبيه والخطأ */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ═══ النمط الأول: تسجيل الدخول (LOGIN MODE) ═════════ */}
          {/* ══════════════════════════════════════════════════════ */}
          {authMode === 'login' && (
            <div className="space-y-4">
              
              {/* ألسنة اختيار نوع الحساب */}
              <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 text-xs font-bold">
                {[
                  { id: 'league' as PortalType, label: 'الرابطات', icon: <Shield className="w-3.5 h-3.5" /> },
                  { id: 'coach' as PortalType, label: 'المدربون', icon: <Users className="w-3.5 h-3.5" /> },
                  { id: 'judge' as PortalType, label: 'الحكام', icon: <Timer className="w-3.5 h-3.5" /> },
                  { id: 'admin' as PortalType, label: 'الإدارة', icon: <Settings className="w-3.5 h-3.5" /> },
                ].map((p) => {
                  const active = activePortal === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActivePortal(p.id);
                        setError(null);
                      }}
                      className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white shadow font-black'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {p.icon}
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* 1. دخول الرابطة */}
                {activePortal === 'league' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">اسم المستخدم أو البريد الرسمي</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="lwassaida20@gmail.com"
                          className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-semibold text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور</label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. دخول المدرب */}
                {activePortal === 'coach' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">اسم مستخدم المدرب أو البريد</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="coach_mca أو coach@athletic.dz"
                          className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-semibold text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور</label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. دخول الحكم */}
                {activePortal === 'judge' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">كود المهمة الرسمي (Duty Code) أو رمز الحزام</label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={dutyCode}
                          onChange={(e) => setDutyCode(e.target.value)}
                          placeholder="DUTY-RUN-100 أو رمز التكليف"
                          className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold text-amber-400 uppercase focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">اسم الحكم (اختياري)</label>
                        <input
                          type="text"
                          value={judgeName}
                          onChange={(e) => setJudgeName(e.target.value)}
                          placeholder="الاسم واللقب..."
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">المهمة الميدانية</label>
                        <select
                          value={judgeRole}
                          onChange={(e) => setJudgeRole(e.target.value as any)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white"
                        >
                          <option value="finish">حكم خط النهاية 🏁</option>
                          <option value="start">حكم الانطلاق 🔫</option>
                          <option value="judge">حكم مسابقات وميدان ⏱️</option>
                          <option value="chambre_dappel">غرفة النداء وفحص الصدريات 📋</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. دخول المدير العام */}
                {activePortal === 'admin' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">كلمة مرور الإدارة العامة والاشتراكات (Admin Suite)</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 transition cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? 'جارٍ التحقق وتفعيل الجلسة...' : 'تسجيل الدخول إلى الحساب 🔑'}</span>
                </button>
              </form>

              {/* رابط التحويل للتسجيل الجديد */}
              <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
                <span>ليس لديك حساب بعد؟ </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setError(null);
                  }}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  انقر هنا لفتح حساب جديد 📝
                </button>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ═══ النمط الثاني: فتح حساب جديد (REGISTER MODE) ════ */}
          {/* ══════════════════════════════════════════════════════ */}
          {authMode === 'register' && (
            <div className="space-y-4">
              
              {/* ألسنة اختيار نوع الحساب الجديد (رابطة ونادٍ فقط) */}
              <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 text-xs font-bold">
                {[
                  { id: 'league' as PortalType, label: 'رابطة ولائية', icon: <Building2 className="w-3.5 h-3.5 text-amber-400" /> },
                  { id: 'coach' as PortalType, label: 'نادٍ رياضي ومدرب', icon: <Users className="w-3.5 h-3.5 text-teal-400" /> },
                ].map((p) => {
                  const active = activePortal === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActivePortal(p.id);
                        setError(null);
                      }}
                      className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-purple-600 text-white shadow font-black'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {p.icon}
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* تنبيه فيدرالي: الحكام يتبعون للرابطة وتكليفهم بأكواد مهمة */}
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-200/90 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>تنويه فيدرالي:</strong> الحكام تابعون للرابطة الولائية حصراً، وتمنحهم الرابطة كود تكليف (Duty Code) لكل منافسة للدخول المباشر.
                </span>
              </div>

              {/* 1. تسجيل رابطة جديدة */}
              {activePortal === 'league' && (
                <form onSubmit={handleRegisterLeague} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم الرابطة الكامل *</label>
                      <input
                        type="text"
                        value={newLeagueName}
                        onChange={(e) => setNewLeagueName(e.target.value)}
                        placeholder="الرابطة الولائية لألعاب القوى..."
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">الرمز المختصر (Acronym) *</label>
                      <input
                        type="text"
                        value={newLeagueShort}
                        onChange={(e) => setNewLeagueShort(e.target.value.toUpperCase())}
                        placeholder="مثال: LASAD"
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">الولاية أو المنطقة *</label>
                      <input
                        type="text"
                        value={newLeagueWilaya}
                        onChange={(e) => setNewLeagueWilaya(e.target.value)}
                        placeholder="سعيدة، وهران..."
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم مشرف الرابطة</label>
                      <input
                        type="text"
                        value={newLeagueAdminName}
                        onChange={(e) => setNewLeagueAdminName(e.target.value)}
                        placeholder="الاسم واللقب..."
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم الهاتف الرسمي</label>
                    <input
                      type="text"
                      value={newLeaguePhone}
                      onChange={(e) => setNewLeaguePhone(e.target.value)}
                      placeholder="+213 65 00 00 00"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم مستخدم المشرف *</label>
                      <input
                        type="text"
                        value={newLeagueUsername}
                        onChange={(e) => setNewLeagueUsername(e.target.value)}
                        placeholder="league_admin"
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">كلمة المرور *</label>
                      <input
                        type="password"
                        value={newLeaguePassword}
                        onChange={(e) => setNewLeaguePassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-950/60 transition cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{loading ? 'جارٍ الحفظ والاعتماد...' : 'حفظ واعتماد الرابطة الولائية رسمياً 🏛️'}</span>
                  </button>
                </form>
              )}

              {/* 2. تسجيل مدرب ونادٍ جديد */}
              {activePortal === 'coach' && (
                <form onSubmit={handleRegisterCoach} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم المدرب الكامل *</label>
                      <input
                        type="text"
                        value={newCoachName}
                        onChange={(e) => setNewCoachName(e.target.value)}
                        placeholder="الكابتن..."
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم النادي أو الجمعية *</label>
                      <input
                        type="text"
                        value={newClubName}
                        onChange={(e) => setNewClubName(e.target.value)}
                        placeholder="نادي وفاق..."
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">الولاية أو مقر النادي *</label>
                    <input
                      type="text"
                      value={newCoachWilaya}
                      onChange={(e) => setNewCoachWilaya(e.target.value)}
                      placeholder="سعيدة..."
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم مستخدم المدرب *</label>
                      <input
                        type="text"
                        value={newCoachUsername}
                        onChange={(e) => setNewCoachUsername(e.target.value)}
                        placeholder="coach_username"
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">كلمة المرور *</label>
                      <input
                        type="password"
                        value={newCoachPassword}
                        onChange={(e) => setNewCoachPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-teal-950/60 transition cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>{loading ? 'جارٍ الحفظ والتفعيل...' : 'تفعيل حساب المدرب والنادي فوراً 🏃'}</span>
                  </button>
                </form>
              )}

              {/* رابط العودة لتسجيل الدخول */}
              <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
                <span>لديك حساب بالفعل؟ </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                  }}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  انقر هنا لتسجيل الدخول 🔑
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default PortalAuthModal;
