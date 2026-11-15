/**
 * PHOTO FINISH PRO AI — Dedicated Coach & Club Portal Gate
 * Allows Club Coaches to authenticate or open the unified registration hub.
 * Integrated with Single Active Session Architecture to prevent multi-account collisions.
 */

import React, { useState } from 'react';
import { 
  Users, 
  User, 
  Key, 
  Sparkles, 
  AlertCircle,
  PlusCircle,
  LogIn,
  UserCheck
} from 'lucide-react';
import { portalAuthService, PortalSession, PortalType } from '../../services/portalAuthService';
import { useAthleteStore } from '../../stores/athleteStore';

interface CoachGateProps {
  onAuthenticated: (session: PortalSession) => void;
  onBackToPublic?: () => void;
  onOpenAuthModal?: (targetPortal: PortalType, mode?: 'login' | 'register') => void;
}

export const CoachGate: React.FC<CoachGateProps> = ({
  onAuthenticated,
  onBackToPublic,
  onOpenAuthModal
}) => {
  const clubs = useAthleteStore((state) => state.clubs);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<string>(() => clubs[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSession = portalAuthService.getActiveSession();

  const selectedClub = clubs.find(c => c.id === selectedClubId) || {
    id: selectedClubId,
    name: selectedClubId === 'club_mca' ? 'مولودية الجزائر (MCA)' : 'النادي الرياضي المعتمد'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await portalAuthService.loginCoach(
      username, 
      password, 
      selectedClubId,
      selectedClub?.name
    );
    setLoading(false);

    if (!res.success || !res.session) {
      setError(res.error || 'بيانات الدخول للمدرب غير صحيحة.');
      return;
    }

    onAuthenticated(res.session);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-slate-950" dir="rtl">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-black">
            <Users className="w-3.5 h-3.5" />
            <span>بوابة المدربين والأندية المعتمدة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            تسجيل دخول مدرب النادي
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            قم بتسجيل الدخول لتسجيل عدائي النادي في البطولات القادمة، إدارة التراخيص الطبية، واستخراج وصولات المشاركة.
          </p>
        </div>

        {/* جلسة نشطة بالفعل إن وجدت لمنع تضارب الحسابات */}
        {activeSession && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-black text-amber-200">
                  جلسة نشطة حالياً: {activeSession.fullName || activeSession.clubName || activeSession.username} ({activeSession.portal === 'coach' ? 'مدرب' : activeSession.portal === 'league' ? 'رابطة' : activeSession.portal === 'judge' ? 'حكم' : 'مدير'})
                </div>
                <div className="text-[10px] text-slate-400">
                  تفادياً لازدواجية الدخول، يمكنك المتابعة أو تسجيل الخروج.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeSession.portal === 'coach' ? (
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

        {/* Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-emerald-900/60 shadow-2xl space-y-6">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  النادي الرياضي التابع له:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAuthModal) onOpenAuthModal('coach', 'register');
                  }}
                  className="text-xs font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>تسجيل مدرب ونادٍ جديد +</span>
                </button>
              </div>

              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {clubs.length > 0 ? (
                  clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''} — {c.wilaya}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="club_mca">مولودية الجزائر (MCA)</option>
                    <option value="club_crb">شباب بلوزداد لألعاب القوى (CRB)</option>
                    <option value="club_saida_01">نادي ألعاب القوى سعيدة (MCS)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم مستخدم المدرب أو البريد الإلكتروني</label>
              <div className="relative">
                <User className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
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
                <span>{loading ? 'جارٍ التحقق...' : 'دخول معالج تسجيل الرياضيين ←'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal('coach', 'login');
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="فتح نافذة الدخول والتسجيل الموحدة الشاملة"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>النافذة الموحدة 🔲</span>
              </button>
            </div>

          </form>

          {/* Return to Public Portal */}
          {onBackToPublic && (
            <div className="pt-2 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={onBackToPublic}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                العودة للبوابة العامة ←
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
