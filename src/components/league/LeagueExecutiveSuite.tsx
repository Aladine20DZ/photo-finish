/**
 * PHOTO FINISH PRO AI — League Executive Suite Component (Stage 4)
 * Multi-Tenant Governance, Sanctioning, Cryptographic Licensing & Audit Logs.
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Building2, 
  Users, 
  Trophy, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCheck, 
  Sparkles, 
  Copy, 
  Check, 
  History 
} from 'lucide-react';
import { 
  leagueExecutiveService, 
  LeagueMetrics 
} from '../../services/leagueExecutiveService';
import { LicenseTier } from '../../types/supabase';

interface LeagueExecutiveSuiteProps {
  leagueId?: string;
  leagueName?: string;
  onOpenFieldMode?: () => void;
}

export const LeagueExecutiveSuite: React.FC<LeagueExecutiveSuiteProps> = ({
  leagueId = 'lg_algiers',
  leagueName = 'الاتحاد الجزائري لألعاب القوى (FAA)',
  onOpenFieldMode
}) => {
  const [subTab, setSubTab] = useState<'overview' | 'sanctioning' | 'licensing' | 'audit'>('overview');
  const [metrics, setMetrics] = useState<LeagueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // License Generator State
  const [tier, setTier] = useState<LicenseTier>('CLUB');
  const [expiryMonths, setExpiryMonths] = useState<number>(12);
  const [devHash, setDevHash] = useState<string>('POOL');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Competitions Sanctioning State
  const [pendingComps, setPendingComps] = useState([
    { id: 'comp_algiers_2026', name: 'البطولة الولائية للعدو الريفي - الجزائر', date: '2026-04-12', venue: 'غابة بوشاوي', status: 'pending' },
    { id: 'comp_tipaza_10k', name: 'سباق تيبازة الدولي 10 كلم', date: '2026-05-01', venue: 'الميناء القديم، تيبازة', status: 'pending' }
  ]);

  useEffect(() => {
    loadMetrics();
  }, [leagueId]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await leagueExecutiveService.getLeagueMetrics(leagueId);
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSanction = async (id: string, approve: boolean) => {
    await leagueExecutiveService.sanctionCompetition(id, approve);
    setPendingComps(prev => prev.map(c => c.id === id ? { ...c, status: approve ? 'sanctioned' : 'rejected' } : c));
  };

  const handleGenerateLicense = () => {
    const res = leagueExecutiveService.issueLeagueLicense({
      leagueId,
      tier,
      expiryMonths,
      devHash
    });
    setGeneratedCode(res.licenseCode);
    setCopied(false);
  };

  const handleCopyCode = () => {
    if (generatedCode && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-900/50 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 flex items-center justify-center shadow-lg shadow-emerald-950 ring-2 ring-emerald-400/40">
              <Shield className="w-7 h-7 text-amber-300 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
                  لوحة الإدارة التنفيذية
                </span>
                <span className="text-xs text-slate-400">Rulebook: World Athletics 2026</span>
              </div>
              <h1 className="text-2xl font-black text-white">{leagueName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenFieldMode && onOpenFieldMode()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>دخول وضع التحكيم والميدان</span>
            </button>
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'الأندية المنتسبة', value: metrics?.totalClubs ?? 18, icon: <Building2 className="w-4 h-4 text-emerald-400" /> },
            { label: 'العداؤون المسجلون', value: metrics?.totalAthletes ?? 420, icon: <Users className="w-4 h-4 text-teal-400" /> },
            { label: 'المنافسات المعتمدة', value: metrics?.totalCompetitions ?? 12, icon: <Trophy className="w-4 h-4 text-amber-400" /> },
            { label: 'التراخيص الفعالة', value: metrics?.activeLicenses ?? 24, icon: <Key className="w-4 h-4 text-cyan-400" /> },
            { label: 'النتائج المصادقة', value: metrics?.certifiedResults ?? 156, icon: <FileCheck className="w-4 h-4 text-emerald-400" /> }
          ].map((m, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">{m.label}</span>
                {m.icon}
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {loading ? '...' : m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: <Trophy className="w-4 h-4" /> },
            { id: 'sanctioning', label: 'اعتماد المنافسات والروزنامة', icon: <CheckCircle2 className="w-4 h-4" /> },
            { id: 'licensing', label: 'إصدار التراخيص المشفرة (Ed25519)', icon: <Key className="w-4 h-4" /> },
            { id: 'audit', label: 'سجل الرقابة والتدقيق (Audit Logs)', icon: <History className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                subTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* SubTab 1: Overview */}
        {subTab === 'overview' && (
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span>حالة المنظومة والامتثال للوائح الدولية</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              تمت تهيئة الرابطة للعمل بنظام العزل المتعدد (Multi-Tenancy) بحيث تكون بيانات الأندية والعدائين والمسابقات معزولة بالكامل ومحمية بنظام أمان الصفوف (Row Level Security).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 font-bold mb-1">دقة التوقيت بالمسح الشريطي</div>
                <div className="text-lg font-mono font-black text-emerald-400">1/1000 ثانية (FAT)</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 font-bold mb-1">التشفير الميداني للأجهزة</div>
                <div className="text-lg font-mono font-black text-cyan-400">Ed25519 Asymmetric</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 font-bold mb-1">الربط الشبكي الرباعي</div>
                <div className="text-lg font-mono font-black text-amber-400">Quad-Sync 1*4 Mesh</div>
              </div>
            </div>
          </div>
        )}

        {/* SubTab 2: Sanctioning */}
        {subTab === 'sanctioning' && (
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>طلبات اعتماد المنافسات الرسمية</span>
            </h2>

            <div className="space-y-3">
              {pendingComps.map(comp => (
                <div key={comp.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {comp.date}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400">{comp.venue}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{comp.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {comp.status === 'sanctioned' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>معتمدة رسمياً</span>
                      </span>
                    ) : comp.status === 'rejected' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-700/60 text-xs font-bold flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>مرفوضة</span>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSanction(comp.id, true)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>اعتماد وترخيص</span>
                        </button>
                        <button
                          onClick={() => handleSanction(comp.id, false)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SubTab 3: Licensing (Ed25519) */}
        {subTab === 'licensing' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <span>إصدار تراخيص المنظومة المشفرة (Ed25519 Cryptographic Generator)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                توليد أكواد ترخيص رسمية بصيغة PFP2 موقعة تشفيرياً بالمفتاح السري للخادم، صالحة للاستخدام الميداني دون إنترنت.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع الرخصة (Tier)</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as LicenseTier)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ENTX">رخصة الاتحادات والرابطات (ENTX - كاملة)</option>
                  <option value="CLUB">باقة الأندية المعتمدة (CLUB)</option>
                  <option value="BASIC">الباقة الأساسية الميدانية (BASIC)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">مدة الصلاحية</label>
                <select
                  value={expiryMonths}
                  onChange={(e) => setExpiryMonths(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>شهر واحد (30 يوماً)</option>
                  <option value={3}>3 أشهر</option>
                  <option value={6}>6 أشهر</option>
                  <option value={12}>سنة كاملة (12 شهراً)</option>
                  <option value={24}>سنتان (24 شهراً)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">تقييد الجهاز (Device Binding)</label>
                <input
                  type="text"
                  value={devHash}
                  onChange={(e) => setDevHash(e.target.value)}
                  placeholder="POOL أو كود جهاز معين"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">استخدم POOL للسماح بالمشاركة لـ 4 هواتف</span>
              </div>
            </div>

            <button
              onClick={handleGenerateLicense}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>توليد كود الترخيص المشفر الآن</span>
            </button>

            {generatedCode && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-800/60 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] text-emerald-400 font-bold mb-1">كود الترخيص المعتمد الرسمي:</div>
                  <div className="text-sm font-mono font-black text-amber-300 tracking-wider truncate">
                    {generatedCode}
                  </div>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* SubTab 4: Audit Logs */}
        {subTab === 'audit' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <span>سجل الرقابة والتدقيق الأمني المانع للتلاعب (Immutable Audit Trail)</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">التوقيت</th>
                    <th className="py-2.5 px-3">الإجراء</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3">المعرف</th>
                    <th className="py-2.5 px-3">عنوان IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400">2026-03-06 05:12:00</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">COMPETITION_SANCTIONED</td>
                    <td className="py-2.5 px-3 text-slate-300">competition</td>
                    <td className="py-2.5 px-3 text-slate-400">comp_algiers_2026</td>
                    <td className="py-2.5 px-3 text-slate-500">127.0.0.1</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400">2026-03-06 05:08:14</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">LICENSE_ISSUED</td>
                    <td className="py-2.5 px-3 text-slate-300">license</td>
                    <td className="py-2.5 px-3 text-slate-400">PFP2-CLUB-2703-POOL</td>
                    <td className="py-2.5 px-3 text-slate-500">127.0.0.1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
