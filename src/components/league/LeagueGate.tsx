/**
 * PHOTO FINISH PRO AI — Dedicated League Portal Gate
 * Allows League & Federation Executives to authenticate or open the unified registration hub.
 * Integrated with Single Active Session Architecture to prevent multi-account collisions.
 */

import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  Key, 
  Sparkles, 
  PlusCircle, 
  AlertCircle, 
  Trophy,
  LogIn,
  UserCheck
} from 'lucide-react';
import { portalAuthService, PortalSession, PortalType } from '../../services/portalAuthService';

interface LeagueGateProps {
  onAuthenticated: (session: PortalSession) => void;
  onOpenFieldMode?: () => void;
  onOpenAuthModal?: (targetPortal: PortalType, mode?: 'login' | 'register') => void;
}

export const LeagueGate: React.FC<LeagueGateProps> = ({
  onAuthenticated,
  onOpenFieldMode,
  onOpenAuthModal
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSession = portalAuthService.getActiveSession();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور للرابطة.');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await portalAuthService.loginLeague(username, password);
    setLoading(false);

    if (!res.success || !res.session) {
      setError(res.error || 'بيانات الدخول للرابطة غير صحيحة.');
      return;
    }

    onAuthenticated(res.session);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-slate-950" dir="rtl">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Card Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-black">
            <Shield className="w-3.5 h-3.5" />
            <span>بوابة رابطة ألعاب القوى سعيدة • LWAS Official Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            تسجيل دخول إدارة رابطة سعيدة
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            قم بتسجيل الدخول بحساب مسؤول الرابطة المعتمد للوصول إلى إدارة البطولات، الصدريات، الحكام، واعتماد النتائج الرسمية لولاية سعيدة.
          </p>
        </div>

        {/* جلسة نشطة بالفعل إن وجدت لمنع الازدواجية */}
        {activeSession && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-black text-amber-200">
                  جلسة نشطة حالياً: {activeSession.fullName || activeSession.leagueName || activeSession.username} ({activeSession.portal === 'league' ? 'رابطة' : activeSession.portal === 'coach' ? 'مدرب' : activeSession.portal === 'judge' ? 'حكم' : 'مدير'})
                </div>
                <div className="text-[10px] text-slate-400">
                  لتفادي تضارب الحسابات في آن واحد، انقر للمتابعة أو تسجيل خروج.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeSession.portal === 'league' ? (
                <button
                  type="button"
                  onClick={() => onAuthenticated(activeSession)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow"
                >
                  المتابعة ←
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    portalAuthService.logoutAll();
                    window.location.reload();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  تبديل الحساب
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-emerald-900/60 shadow-2xl space-y-6">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-400">تسجيل الدخول المباشر بحساب الرابطة المعتمد:</span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal('league', 'register');
                }}
                className="text-xs font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>تسجيل حساب رابطة جديدة +</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم مستخدم المشرف (Admin Username)</label>
              <div className="relative">
                <User className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="lwassaida20@gmail.com"
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{loading ? 'جارٍ التحقق...' : 'دخول إدارة الرابطة ←'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal('league', 'login');
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="فتح نافذة الدخول والتسجيل الموحدة الشاملة"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>النافذة الموحدة 🔲</span>
              </button>
            </div>

          </form>

          {/* Field Mode Direct Access */}
          {onOpenFieldMode && (
            <div className="pt-3 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={onOpenFieldMode}
                className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>دخول وضع التحكيم الميداني والمضمار مباشرة</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
