/**
 * PHOTO FINISH PRO AI — Dedicated Coach & Club Portal Gate
 * Allows Club Coaches to authenticate before registering athletes or generating certificates.
 */

import React, { useState } from 'react';
import { 
  Users, 
  User, 
  Key, 
  Sparkles, 
  AlertCircle
} from 'lucide-react';
import { portalAuthService, PortalSession } from '../../services/portalAuthService';

interface CoachGateProps {
  onAuthenticated: (session: PortalSession) => void;
  onBackToPublic?: () => void;
}

export const CoachGate: React.FC<CoachGateProps> = ({
  onAuthenticated,
  onBackToPublic
}) => {
  const [username, setUsername] = useState('coach_mca');
  const [password, setPassword] = useState('Coach@2026');
  const [selectedClubId, setSelectedClubId] = useState<string>('club_mca');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await portalAuthService.loginCoach(username, password, selectedClubId);
    setLoading(false);

    if (!res.success || !res.session) {
      setError(res.error || 'بيانات الدخول للمدرب غير صحيحة.');
      return;
    }

    onAuthenticated(res.session);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-slate-950">
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
              <label className="block text-xs font-bold text-slate-300 mb-1.5">النادي الرياضي التابع له:</label>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none"
              >
                <option value="club_mca">مولودية الجزائر (MCA)</option>
                <option value="club_crb">شباب بلوزداد لألعاب القوى (CRB)</option>
                <option value="club_ess">وفاق سطيف (ESS)</option>
                <option value="club_aso">أولمبي الشلف (ASO)</option>
                <option value="club_csc">شباب قسنطينة (CSC)</option>
                <option value="club_usma">اتحاد الجزائر (USMA)</option>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{loading ? 'جارٍ التحقق...' : 'دخول معالج تسجيل الرياضيين ←'}</span>
            </button>

          </form>

          {/* Quick Demo */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setUsername('coach_mca');
                setPassword('Coach@2026');
                setSelectedClubId('club_mca');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              🟢 حساب تجريبي: مدرب مولودية الجزائر (MCA)
            </button>

            {onBackToPublic && (
              <button
                type="button"
                onClick={onBackToPublic}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                العودة للبوابة العامة ←
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
