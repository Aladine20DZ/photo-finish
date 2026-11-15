import React, { useState } from 'react';
import {
  Building2,
  Users,
  Shield,
  Key,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  Radio,
  Award
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { Input } from './Input';
import { Badge } from './Badge';
import { portalAuthService, PortalType, PortalSession } from '../../services/portalAuthService';

export interface GlassLoginPageProps {
  initialPortal?: PortalType;
  onSuccess?: (session: PortalSession) => void;
  onBack?: () => void;
}

export const GlassLoginPage: React.FC<GlassLoginPageProps> = ({
  initialPortal = 'league',
  onSuccess,
  onBack,
}) => {
  const [activePortal, setActivePortal] = useState<PortalType>(initialPortal);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dutyCode, setDutyCode] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let res: { success: boolean; session?: PortalSession; error?: string } = { success: false };

    try {
      if (activePortal === 'league') {
        res = await portalAuthService.loginLeague(username.trim(), password.trim(), 'lg_saida');
      } else if (activePortal === 'coach') {
        res = await portalAuthService.loginCoach(username.trim(), password.trim());
      } else if (activePortal === 'judge') {
        res = await portalAuthService.loginJudge({
          dutyCode: dutyCode.trim().toUpperCase(),
          judgeName: judgeName.trim() || undefined,
        });
      } else if (activePortal === 'admin') {
        res = await portalAuthService.loginAdmin(password.trim());
      }

      setLoading(false);

      if (!res.success || !res.session) {
        setError(res.error || 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات المدخلة.');
        return;
      }

      setSuccessNotice(`مرحباً بك: ${res.session.fullName || res.session.username}`);
      if (onSuccess) {
        setTimeout(() => onSuccess(res.session!), 500);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center p-4 sm:p-6 lg:p-10 relative" dir="rtl">
      <div className="w-full max-w-5xl z-10">
        
        {/* Back Link */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ink-2)] hover:text-[var(--ink)] transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى الواجهة الرئيسية</span>
          </button>
        )}

        {/* ═══ Split 2-Column Track Pro Container ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* ═══ Right Column: Login Form ═══ */}
          <div className="lg:col-span-7">
            <GlassCard variant="strong" radius="xl" className="p-6 sm:p-8 h-full flex flex-col justify-between">
              
              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="accent" dot>
                      منظومة الدخول الموحد 2026
                    </Badge>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--ink)]">
                    تسجيل الدخول إلى بوابات التحكيم والإدارة
                  </h1>
                  <p className="text-xs text-[var(--ink-2)]">
                    نظام موحد ومؤمن بتشفير الجلسات الفيدرالية للرابطات، الأندية، الحكام، والإدارة.
                  </p>
                </div>

                {/* Portal Switcher Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold">
                  {[
                    { id: 'league' as PortalType, label: 'رابطة ولائية', icon: <Building2 className="w-4 h-4 text-[var(--accent)]" /> },
                    { id: 'coach' as PortalType, label: 'نادٍ ومدرب', icon: <Users className="w-4 h-4 text-[var(--info)]" /> },
                    { id: 'judge' as PortalType, label: 'كود الحكم', icon: <Award className="w-4 h-4 text-[var(--primary)]" /> },
                    { id: 'admin' as PortalType, label: 'الإدارة العامة', icon: <Shield className="w-4 h-4 text-purple-600" /> },
                  ].map((p) => {
                    const isActive = activePortal === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActivePortal(p.id);
                          setError(null);
                        }}
                        className={`
                          py-2 px-2 rounded-[var(--radius-sm)] flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[11px]
                          ${isActive ? 'bg-[var(--surface)] text-[var(--primary)] font-bold shadow-[var(--shadow-1)] border border-[var(--border)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/50'}
                        `}
                      >
                        {p.icon}
                        <span className="truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Alerts */}
                {error && (
                  <div className="p-3 rounded-[var(--radius-sm)] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[var(--danger)] text-xs font-bold animate-in fade-in">
                    ⚠️ {error}
                  </div>
                )}
                {successNotice && (
                  <div className="p-3 rounded-[var(--radius-sm)] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[var(--success)] text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                    <span>{successNotice}</span>
                  </div>
                )}

                {/* Form Fields */}
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  
                  {/* 1. League Portal */}
                  {activePortal === 'league' && (
                    <div className="space-y-3.5">
                      <Input
                        label="اسم مستخدم مشرف الرابطة *"
                        icon={<User className="w-4 h-4 text-[var(--accent)]" />}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="saida_admin"
                        required
                      />

                      <Input
                        label="كلمة المرور المشفرة *"
                        type="password"
                        icon={<Lock className="w-4 h-4 text-[var(--accent)]" />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  )}

                  {/* 2. Coach Portal */}
                  {activePortal === 'coach' && (
                    <div className="space-y-3.5">
                      <Input
                        label="اسم مستخدم المدرب أو البريد *"
                        icon={<User className="w-4 h-4 text-[var(--info)]" />}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="coach_mca"
                        required
                      />

                      <Input
                        label="كلمة المرور *"
                        type="password"
                        icon={<Lock className="w-4 h-4 text-[var(--info)]" />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  )}

                  {/* 3. Judge Duty Code Portal */}
                  {activePortal === 'judge' && (
                    <div className="space-y-3.5">
                      <Input
                        label="كود التكليف الميداني الرسمي (Duty Code) *"
                        icon={<Key className="w-4 h-4 text-[var(--primary)]" />}
                        value={dutyCode}
                        onChange={(e) => setDutyCode(e.target.value)}
                        placeholder="START-LWAS-EQN5"
                        className="font-mono uppercase font-bold text-[var(--primary)]"
                        helperText="يمنح هذا الكود من طرف الرابطة الولائية لكل حكم في المنافسة"
                        required
                      />

                      <Input
                        label="اسم الحكم المكلف (اختياري)"
                        icon={<User className="w-4 h-4 text-[var(--ink-3)]" />}
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                        placeholder="الاسم واللقب..."
                      />
                    </div>
                  )}

                  {/* 4. Super Admin Portal */}
                  {activePortal === 'admin' && (
                    <div className="space-y-3.5">
                      <Input
                        label="كلمة مرور الإدارة العامة والاشتراكات *"
                        type="password"
                        icon={<Lock className="w-4 h-4 text-purple-600" />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        helperText="مخصصة لمدير النظام لتوليد التراخيص وإدارة الرابطات"
                        required
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      className="w-full"
                    >
                      تسجيل الدخول إلى البوابة 🚀
                    </Button>
                  </div>
                </form>
              </div>

              {/* Federal Footer */}
              <div className="pt-4 mt-6 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--ink-3)]">
                <span>تشفير فيدرالي Ed25519 & JWT</span>
                <span className="font-mono">v2.0 Enterprise</span>
              </div>
            </GlassCard>
          </div>

          {/* ═══ Left Column: Visual Showcase & Telemetry ═══ */}
          <div className="lg:col-span-5">
            <GlassCard variant="default" radius="xl" className="p-6 sm:p-8 h-full flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--primary)] text-white flex items-center justify-center font-black text-xl shadow-[var(--shadow-1)]">
                  ⚡
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-black text-[var(--ink)]">منظومة التحكيم والتوقيت الذكي</h2>
                  <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                    منصة الجيل الثاني بتقنية المسح الشريطي Slit-Scan والتزامن الرباعي للهواتف P2P بلا إنترنت، معتمدة لمعايير World Athletics الدولية.
                  </p>
                </div>

                {/* Telemetry Visual Card */}
                <div className="p-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--ink)]">دقة التوقيت والمسح (FAT)</span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-[10px] font-mono font-bold tabular-nums">1/1000s</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--ink-3)]">تزامن الشبكة الميدانية:</span>
                    <span className="text-[var(--success)] font-bold flex items-center gap-1 tabular-nums">
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> 1-3ms Local Relay
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--ink-3)]">معيار مطابقة الأرقام:</span>
                    <span className="text-[var(--accent)] font-bold">World Athletics TR31</span>
                  </div>
                </div>

                {/* Live Features List */}
                <div className="space-y-2 pt-2 text-xs text-[var(--ink-2)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
                    <span>توليد وإدارة أكواد التكليف الرسمية للحكام في كل مسابقة.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
                    <span>تخصيص الصدريات الذكي ومنع التكرار الآلي للرياضيين.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
                    <span>تسجيل مرور العدائين بنقاط المراقبة بالباركود أوفلاين.</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quote */}
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-[11px] text-[var(--ink-2)]">
                «الرابطة هي المرجع الوحيد لترخيص وإدخال الحكام عبر أكواد التكليف الرسمية.»
              </div>
            </GlassCard>
          </div>

        </div>

      </div>
    </div>
  );
};
