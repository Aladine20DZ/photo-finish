/**
 * PHOTO FINISH PRO AI — Dedicated League Portal Gate
 * Allows League & Federation Executives to authenticate or register a brand-new League account.
 */

import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  Key, 
  Sparkles, 
  PlusCircle, 
  AlertCircle, 
  Trophy
} from 'lucide-react';
import { portalAuthService, PortalSession } from '../../services/portalAuthService';
import { LeagueRegistrationModal } from './LeagueRegistrationModal';

interface LeagueGateProps {
  onAuthenticated: (session: PortalSession) => void;
  onOpenFieldMode?: () => void;
}

export const LeagueGate: React.FC<LeagueGateProps> = ({
  onAuthenticated,
  onOpenFieldMode
}) => {
  const [username, setUsername] = useState('laa_admin');
  const [password, setPassword] = useState('League@2026');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('laa_algiers');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);

  const leagues = portalAuthService.getAllLeagues();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await portalAuthService.loginLeague(username, password, selectedLeagueId);
    setLoading(false);

    if (!res.success || !res.session) {
      setError(res.error || 'بيانات الدخول للرابطة غير صحيحة.');
      return;
    }

    onAuthenticated(res.session);
  };

  const handleQuickFill = (user: string, pass: string, lgId: string) => {
    setUsername(user);
    setPassword(pass);
    setSelectedLeagueId(lgId);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-slate-950">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Card Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-black">
            <Shield className="w-3.5 h-3.5" />
            <span>بوابة الاتحادات والرابطات الولائية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            تسجيل دخول مسؤول الرابطة
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            قم بتسجيل الدخول بحساب الرابطة المعتمد للوصول إلى إدارة البطولات، الصدريات، التراخيص، واعتماد الأرقام القياسية.
          </p>
        </div>

        {/* Main Card */}
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
                <label className="text-xs font-bold text-slate-300">الرابطة أو الاتحاد المنظّم:</label>
                <button
                  type="button"
                  onClick={() => setShowRegModal(true)}
                  className="text-xs font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
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
                    {l.logoCode} {l.shortName} • {l.name} ({l.wilaya})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم أو البريد الرسمي</label>
              <div className="relative">
                <User className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
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
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{loading ? 'جارٍ التحقق...' : 'دخول لوحة الإدارة التنفيذية للرابطة ←'}</span>
            </button>

          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 block mb-2">حسابات تجريبية معتمدة للاختبار السريع:</span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('laa_admin', 'League@2026', 'laa_algiers')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 text-xs font-semibold transition-colors"
              >
                🏛️ رابطة الجزائر (LAA)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('faa_admin', 'League@2026', 'faa_national')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 text-xs font-semibold transition-colors"
              >
                🇩🇿 الاتحاد الوطني (FAA)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('lao_admin', 'League@2026', 'lao_oran')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 text-xs font-semibold transition-colors"
              >
                🏃 رابطة وهران (LAO)
              </button>
            </div>

            {onOpenFieldMode && (
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={onOpenFieldMode}
                  className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>دخول وضع التحكيم الميداني مباشرة بدون تسجيل</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal تسجيل رابطة جديدة */}
      <LeagueRegistrationModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
        onSuccess={() => {
          setShowRegModal(false);
          const sess = portalAuthService.getSession('league');
          if (sess) onAuthenticated(sess);
        }}
      />
    </div>
  );
};
