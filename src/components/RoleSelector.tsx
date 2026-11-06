import React, { useState } from 'react';
import { 
  Flag, 
  Camera, 
  Sparkles, 
  Shuffle, 
  Award, 
  Copy, 
  Check, 
  Link2, 
  QrCode, 
  Users, 
  ScanLine, 
  Crown, 
  ArrowLeftRight, 
  CreditCard, 
  Clock, 
  CheckCircle2,
  Lock,
  Wifi,
  Radio,
  ShieldCheck,
  ChevronLeft,
  Smartphone,
  Zap,
  Activity
} from 'lucide-react';
import { PhoneRole, LicensePoolInfo } from '../types/race';
import { PhoneQrModal } from './PhoneQrModal';
import { QrScannerModal } from './QrScannerModal';
import { pricingService } from '../services/pricingService';
import { licenseManager } from '../services/licenseManager';

interface RoleSelectorProps {
  roomCode: string;
  onSetRoomCode: (code: string) => void;
  onSelectRole: (role: PhoneRole) => void;
  onOpenSubscriptionModal?: () => void;
  onOpenTransferModal?: () => void;
  sharedPoolLicense?: LicensePoolInfo | null;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  roomCode,
  onSetRoomCode,
  onSelectRole,
  onOpenSubscriptionModal,
  onOpenTransferModal,
  sharedPoolLicense,
}) => {
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const activeLicense = licenseManager.activeLicense;
  const isTrialExpired = pricingService.isTrialExpired();
  // شرط الحظر التام: انتهاء الـ 7 أيام مع عدم وجود ترخيص شخصي أو مشاركة 1*4 نشطة
  const isLocked = isTrialExpired && !activeLicense && !sharedPoolLicense;
  const trialText = pricingService.getRemainingTrialText();

  const generateNewRoom = () => {
    const num = Math.floor(100 + Math.random() * 900);
    onSetRoomCode(`RACE-${num}`);
  };

  const copyRoleLink = (targetRole: 'start' | 'finish' | 'judge' | 'chambre_dappel') => {
    const url = `${origin}/?role=${targetRole}&room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedRole(targetRole);
    setTimeout(() => setCopiedRole(null), 2500);
  };

  const handleScanSuccess = (data: { roomCode: string; role?: PhoneRole }) => {
    if (data.roomCode) {
      onSetRoomCode(data.roomCode);
    }
    setShowScannerModal(false);
    if (data.role && !isLocked) {
      onSelectRole(data.role);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-start p-3 sm:p-5 max-w-lg mx-auto w-full space-y-4" dir="rtl">
      
      {/* ═══ 1. الشريط العلوي للهاتف: حالة الشبكة ومؤشر الـ P2P ═══ */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-2 flex items-center justify-between shadow-md text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-300">مضمار السباق:</span>
          </div>
          <span className="bg-slate-950 text-amber-300 font-mono font-black px-2 py-0.5 rounded-lg border border-slate-800 text-[11px]">
            {roomCode}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-cyan-400 font-mono font-bold bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-800/40">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span>P2P 4G Mesh</span>
          </span>
          <span className="text-slate-400">1/1000s</span>
        </div>
      </div>

      {/* ═══ 2. بطاقة حالة الاشتراك والـ 1*4 الشبكي (Hero Status) ═══ */}
      <div className={`w-full rounded-3xl p-4 border-2 shadow-xl transition-all relative overflow-hidden ${
        activeLicense
          ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-500/10'
          : sharedPoolLicense
          ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 border-cyan-500/50 shadow-cyan-500/10'
          : isLocked
          ? 'bg-gradient-to-br from-red-950/80 via-slate-900 to-slate-950 border-red-500/50 shadow-red-500/10'
          : 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/50 shadow-amber-500/10'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shrink-0 ${
              activeLicense
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950'
                : sharedPoolLicense
                ? 'bg-gradient-to-tr from-cyan-500 to-blue-400 text-slate-950'
                : isLocked
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950'
            }`}>
              {isLocked ? <Lock className="w-6 h-6 text-red-400" /> : <Crown className="w-6 h-6" />}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm text-white">
                  {activeLicense 
                    ? 'اشتراك معتمد (هاتف مضيف) 👑' 
                    : sharedPoolLicense 
                    ? 'متقاسم ترخيص 1*4 شبكي 🏆' 
                    : isLocked 
                    ? 'انتهت الفترة التجريبية 🔒' 
                    : 'فترة تجريبية مجانية ⏱️'}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full border ${
                  activeLicense || sharedPoolLicense
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : isLocked
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {activeLicense || sharedPoolLicense ? '8 مسارات مفتوحة' : isLocked ? 'مقفل' : '7 أيام كاملة'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                {activeLicense
                  ? `${activeLicense.tierName} • صالح لغاية ${activeLicense.expiryDate}`
                  : sharedPoolLicense
                  ? `ورث الترخيص من (${sharedPoolLicense.hostRole}) في نفس الغرفة مجاناً!`
                  : isLocked
                  ? 'انتهت 7 أيام التجربة • يلزم تفعيل كود أو الاتصال بهاتف مشترك 1*4'
                  : `تجربة مجانية بكامل ميزات 1*4 • ${trialText}`}
              </p>
            </div>
          </div>

          {onOpenSubscriptionModal && (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isLocked ? 'تفعيل' : 'الباقات'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ 3. حاجز قفل التجربة (Paywall Locked State) ═══ */}
      {isLocked ? (
        <div className="w-full bg-slate-900/90 border-2 border-red-500/40 rounded-3xl p-5 sm:p-6 text-center space-y-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-white">
              تم قفل محطات التحكيم والسباق 🔒
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              انتهت فترة التجربة المجانية الكاملة (7 أيام). وفقاً لنظام المنظومة، يتطلب تشغيل محطات السباق إما:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 max-w-sm mx-auto pt-1">
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4 fill-slate-950" />
              <span>1. تفعيل اشتراك معتمد أو إدخال كود رسمي 👑</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 font-bold text-xs border border-cyan-500/40 shadow transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <ScanLine className="w-4 h-4 text-cyan-400" />
              <span>2. الاتصال بشبكة هاتف مشترك في المضمار (1*4) 📷</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 pt-1">
            💡 إذا كان لدى ناديك هاتف مفعل في المضمار، يكفي الاتصال برمز غرفته ليتقاسم معك الصلاحيات مجاناً!
          </p>
        </div>
      ) : (
        /* ═══ 4. بطاقات محطات الهاتف الأربعة الرسمية ═══ */
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>اختر محطة هذا الهاتف في سباق اليوم:</span>
            </h3>
            <span className="text-[10px] text-slate-400">4 محطات متزامنة</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* 1. هاتف البداية (Starter) */}
            <button
              type="button"
              onClick={() => onSelectRole('start')}
              className="group relative overflow-hidden text-right p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-950 border border-emerald-500/40 hover:border-emerald-400 transition-all shadow-lg active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <Flag className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        محطة 1
                      </span>
                      <h4 className="font-black text-sm sm:text-base text-white group-hover:text-emerald-300 transition-colors">
                        هاتف خط البداية (Starter) 🚦
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      إطلاق مسدس السباق الصوتي، أوامر الانطلاق الرسمية (À vos marques / Prêts)، وبث إشارة الصفر لكافة الهواتف.
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-emerald-400 font-mono">
                      <span>✓ حساس صوتي 96dB</span>
                      <span>•</span>
                      <span>✓ إشارة P2P موحدة</span>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-emerald-300 group-hover:border-emerald-400 transition-colors shrink-0 mt-2">
                  <ChevronLeft className="w-5 h-5" />
                </div>
              </div>
            </button>

            {/* 2. كاميرا خط النهاية (Finish Camera) */}
            <button
              type="button"
              onClick={() => onSelectRole('finish')}
              className="group relative overflow-hidden text-right p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-950/40 to-slate-950 border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-lg active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                        محطة 2
                      </span>
                      <h4 className="font-black text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors">
                        كاميرا خط النهاية (Photo Finish) 📸
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      تصوير عالي السرعة (1000 FPS)، خط ليزر بصري رأسي لقطع خيط الصدر، ومسح شريطي متواصل Slit-Scan.
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-cyan-400 font-mono">
                      <span>✓ ليزر بصري 1/1000s</span>
                      <span>•</span>
                      <span>✓ التقاط تلقائي للجذع</span>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-400 transition-colors shrink-0 mt-2">
                  <ChevronLeft className="w-5 h-5" />
                </div>
              </div>
            </button>

            {/* 3. رئيس الحكام والنتائج (Chief Judge) */}
            <button
              type="button"
              onClick={() => onSelectRole('judge')}
              className="group relative overflow-hidden text-right p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-950 border border-amber-500/40 hover:border-amber-400 transition-all shadow-lg active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        محطة 3
                      </span>
                      <h4 className="font-black text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors">
                        برج الحكام والنتائج الرسمية (Chief Judge) ⚖️
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      شاشة التوقيت الرقمي الموحد، اعتماد ترتيب الأروقة والعدائين، وتصدير وطباعة استمارات التحكيم الدولية IAAF.
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-amber-400 font-mono">
                      <span>✓ عداد متزامن حي</span>
                      <span>•</span>
                      <span>✓ تصدير PDF/IAAF</span>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-amber-300 group-hover:border-amber-400 transition-colors shrink-0 mt-2">
                  <ChevronLeft className="w-5 h-5" />
                </div>
              </div>
            </button>

            {/* 4. غرفة النداء (Call Room) */}
            <button
              type="button"
              onClick={() => onSelectRole('chambre_dappel')}
              className="group relative overflow-hidden text-right p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-950 border border-purple-500/40 hover:border-purple-400 transition-all shadow-lg active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/50 text-purple-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                        محطة 4
                      </span>
                      <h4 className="font-black text-sm sm:text-base text-white group-hover:text-purple-300 transition-colors">
                        غرفة النداء وتوزيع الأروقة (Call Room) 📋
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      فحص ومطابقة الصدريات، تسجيل الأندية والولايات (58 ولاية)، وتوزيع العدائين على المسارات 1 إلى 8 أو 10.
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-purple-400 font-mono">
                      <span>✓ 58 ولاية جزائرية</span>
                      <span>•</span>
                      <span>✓ مزامنة فورية للقوائم</span>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-purple-300 group-hover:border-purple-400 transition-colors shrink-0 mt-2">
                  <ChevronLeft className="w-5 h-5" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ═══ 5. مركز الربط ومسح الباركود السريع في المضمار ═══ */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>ربط وتغيير غرفة المضمار (Room Code):</span>
          </label>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            تزامن &lt; 0.5ms
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => onSetRoomCode(e.target.value.toUpperCase())}
            placeholder="مثال: RACE-2026"
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white font-mono font-bold text-center tracking-widest text-lg rounded-xl py-2 px-3 outline-none uppercase"
          />
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            title="مسح باركود الهاتف المقابل بالكاميرا"
          >
            <Camera className="w-4 h-4" />
            <span>مسح</span>
          </button>
          <button
            onClick={generateNewRoom}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="توليد كود عشوائي"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* أزرار سريعة لمشاركة الباركود وروابط الأدوار */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>عرض باركود QR 📲</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
          >
            <ScanLine className="w-4 h-4 text-emerald-400" />
            <span>مسح كاميرا الهاتف 📷</span>
          </button>
        </div>
      </div>

      {/* ═══ 6. شريط الإجراءات والخدمات السريعة في الأسفل ═══ */}
      <div className="w-full grid grid-cols-2 gap-2 text-xs pt-1">
        {onOpenSubscriptionModal && (
          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className="py-3 px-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-amber-300 font-bold flex items-center justify-center gap-2 transition-all shadow cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>الاشتراكات والأسعار 👑</span>
          </button>
        )}

        {onOpenTransferModal && (
          <button
            type="button"
            onClick={onOpenTransferModal}
            className="py-3 px-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 text-purple-300 font-bold flex items-center justify-center gap-2 transition-all shadow cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-purple-400" />
            <span>نقل الترخيص الآمن 🔄</span>
          </button>
        )}
      </div>

      {/* نافذة عرض باركود الغرفة */}
      {showQrModal && (
        <PhoneQrModal
          roomCode={roomCode}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* نافذة مسح باركود الكاميرا */}
      {showScannerModal && (
        <QrScannerModal
          onSuccess={handleScanSuccess}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
};

export default RoleSelector;
