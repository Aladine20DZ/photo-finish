import React, { useState } from 'react';
import { Crown, Lock, ArrowRight, LogOut, Eye, EyeOff, KeyRound, Cloud, ShieldCheck } from 'lucide-react';
import { AdminPortal } from '../admin/AdminPortal';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { portalAuthService } from '../services/portalAuthService';

// ═══ بوابة الدخول إلى ADMIN SUITE (لوحة مدير المنظومة) ═══
// الوصول: أضف ?admin إلى رابط التطبيق ثم أدخل كلمة مرور المدير المعتمدة أو سجل الدخول بحساب Supabase.
// المصادقة تتم عبر الخادم مع فحص معدل المحاولات (Rate Limiting) وتوقيع Ed25519.

const SESSION_KEY = 'pf_admin_portal_unlocked_v1';
const DEFAULT_DEV_ADMIN_PASS = 'Admin@PhotoFinish2026!';

export const AdminGate: React.FC = () => {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  const [authMode, setAuthMode] = useState<'key' | 'supabase'>('key');
  const [input, setInput] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = input.trim();
    if (!entered || loading) return;

    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: entered })
      });

      const data = await resp.json().catch(() => ({}));
      const authToken = data.token || data.adminToken;

      if (resp.status === 429) {
        setError(data.error || 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). يرجى الانتظار 15 دقيقة.');
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }

      if (resp.ok && (data.success || data.ok) && authToken) {
        try { 
          sessionStorage.setItem(SESSION_KEY, '1');
          sessionStorage.setItem('pf_admin_token', authToken);
          await portalAuthService.loginAdmin(entered);
        } catch { /* تخزين غير متاح */ }
        setUnlocked(true);
      } else {
        setError(data.error || 'بيانات الدخول غير صحيحة.');
        setShake(true);
        setTimeout(() => setShake(false), 450);
      }
    } catch {
      // وضع العمل المستقل دون خادم في بيئة التطوير والاختبار حصراً
      if (import.meta.env.DEV && entered === DEFAULT_DEV_ADMIN_PASS) {
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
          sessionStorage.setItem('pf_admin_token', 'offline-standalone-admin-session');
          await portalAuthService.loginAdmin(entered);
        } catch { /* تخزين غير متاح */ }
        setUnlocked(true);
        return;
      }
      setError('تعذر التحقق من بيانات الدخول، يرجى المحاولة لاحقاً.');
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false);
    }
  };

  const handleSupabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !input.trim() || loading) return;

    if (!isSupabaseConfigured()) {
      setError('خادم Supabase السحابي غير مهيأ حالياً. يرجى استخدام مفتاح المدير المحلي.');
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: input.trim()
      });

      if (sbError || !data?.user) {
        setError(sbError?.message || 'بيانات الدخول السحابية غير صحيحة.');
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }

      // التحقق من دور المستخدم في جدول profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile && (profile as any).role !== 'super_admin' && (profile as any).role !== 'league_admin') {
        setError('هذا الحساب ليس لديه صلاحيات الإدارة العليا (Admin Suite).');
        await supabase.auth.signOut();
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }

      try {
        sessionStorage.setItem(SESSION_KEY, '1');
        sessionStorage.setItem('pf_admin_token', data.session?.access_token || 'supabase-admin-session');
        await portalAuthService.loginAdmin(input.trim());
      } catch { /* تخزين غير متاح */ }
      setUnlocked(true);
    } catch {
      setError('تعذر الاتصال بخدمة Supabase، يرجى المحاولة لاحقاً.');
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false);
    }
  };

  const exitPortal = () => {
    try { 
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem('pf_admin_token');
      portalAuthService.logout('admin');
    } catch { /* تخزين غير متاح */ }
    window.location.href = '/';
  };

  if (unlocked) {
    return (
      <div className="relative">
        <AdminPortal />
        <button
          onClick={exitPortal}
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold shadow-xl transition-all active:scale-95"
          title="الخروج من لوحة الإدارة والعودة للتطبيق"
        >
          <LogOut className="w-4 h-4" />
          عودة للتطبيق
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className={`w-full max-w-sm bg-slate-900/80 border border-slate-800 rounded-3xl p-7 shadow-2xl ${shake ? 'animate-[pfShake_0.4s_ease]' : ''}`}>
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Crown className="w-8 h-8 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">ADMIN SUITE</h1>
            <p className="text-xs text-slate-400 mt-1">لوحة إدارة التراخيص والاشتراكات — Photo Finish Pro</p>
          </div>
        </div>

        {/* أزرار التبديل بين المصادقة بالمفتاح أو Supabase */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => { setAuthMode('key'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'key' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            مفتاح الخادم
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('supabase'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'supabase' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            Supabase Auth
          </button>
        </div>

        {authMode === 'key' ? (
          <form onSubmit={handleKeySubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); }}
                placeholder="••••••••••••"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-2xl py-3 pr-10 pl-11 text-sm font-bold tracking-wider outline-none transition-colors"
                aria-label="رمز الدخول للمدير"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 transition-colors"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400 font-bold flex items-center gap-1.5" role="alert">
                <Lock className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              {loading ? 'جاري التحقق الآمن...' : 'دخول لوحة الإدارة'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSupabaseSubmit} className="flex flex-col gap-3">
            <div>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@athletic.dz"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-2xl py-2.5 px-3.5 text-xs font-bold outline-none transition-colors"
                aria-label="البريد الإلكتروني"
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); }}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-2xl py-2.5 pr-3.5 pl-10 text-xs font-bold outline-none transition-colors"
                aria-label="كلمة مرور Supabase"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 transition-colors"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400 font-bold flex items-center gap-1.5" role="alert">
                <Lock className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer mt-1"
            >
              {loading ? 'جاري الاتصال السحابي...' : 'دخول بحساب Supabase'}
            </button>
          </form>
        )}

        {/* بطاقة إرشادية لكلمة المرور الرسمية */}
        {authMode === 'key' && (
          <div className="mt-5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold mb-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>كلمة مرور المدير المعتمدة:</span>
            </div>
            <button
              type="button"
              onClick={() => { setInput(DEFAULT_DEV_ADMIN_PASS); setError(''); }}
              className="text-amber-300 hover:text-amber-200 font-mono select-all bg-amber-950/40 hover:bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-800/40 inline-flex items-center gap-1.5 font-bold transition-all cursor-pointer active:scale-95"
              title="انقر لملء كلمة المرور تلقائياً"
            >
              {DEFAULT_DEV_ADMIN_PASS}
            </button>
            <p className="text-[10px] text-slate-500 mt-2">
              يمكن تغييرها عبر متغير <span className="font-mono text-slate-400">ADMIN_PORTAL_PASSWORD</span> في ملف <span className="font-mono text-slate-400">.env</span>
            </p>
          </div>
        )}

        <a
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-bold transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          العودة إلى التطبيق
        </a>
      </div>

      <style>{`@keyframes pfShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }`}</style>
    </div>
  );
};

export default AdminGate;
