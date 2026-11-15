import React, { useState } from 'react';
import { 
  Timer,
  Flag, 
  Camera, 
  Shuffle, 
  Award, 
  QrCode, 
  Users, 
  ScanLine, 
  Lock, 
  Radio, 
  Smartphone, 
  MapPin, 
  ShieldCheck 
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
  sharedPoolLicense,
}) => {
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

  const activeLicense = licenseManager.activeLicense;
  const isTrialExpired = pricingService.isTrialExpired();
  // شرط الحظر التام: انتهاء الـ 7 أيام مع عدم وجود ترخيص شخصي أو مشاركة نشطة
  const isLocked = isTrialExpired && !activeLicense && !sharedPoolLicense;
  const trialText = pricingService.getRemainingTrialText();

  const generateNewRoom = () => {
    const num = Math.floor(100 + Math.random() * 900);
    onSetRoomCode(`RACE-${num}`);
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
            <span className="font-bold text-slate-300">شبكة التزامن الميداني (Local Relay)</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 font-mono">
          <span className="bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60 font-bold text-amber-400">
            الغرفة: {roomCode}
          </span>
        </div>
      </div>

      {/* ═══ 2. تنبيه الاشتراك والتجربة المجانية ═══ */}
      {isLocked ? (
        <div className="w-full bg-red-950/40 border border-red-500/40 rounded-2xl p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-red-400 font-black text-sm">
            <Lock className="w-4 h-4" />
            انتهت الفترة التجريبية للنظام الميداني
          </div>
          <p className="text-xs text-slate-400">
            يرجى تفعيل ترخيص المنظومة أو الانضمام إلى مسابقة مرخصة من الرابطة للمتابعة.
          </p>
        </div>
      ) : (
        <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-bold">
              {activeLicense ? `ترخيص نشط: ${activeLicense.tier}` : trialText}
            </span>
          </div>
          <span className="text-emerald-400 font-mono font-bold text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/40">
            جاهز للتحكيم
          </span>
        </div>
      )}

      {/* ═══ 3. الأدوار الميدانية الرئيسية (الأجهزة الستة) ═══ */}
      <div className="w-full space-y-2.5">
        <div className="text-xs font-bold text-slate-400 px-1">اختر دور هذا الهاتف في المضمار:</div>

        {/* دور 1: مسدس الانطلاق */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectRole('start')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 hover:from-red-900/70 border border-red-500/30 hover:border-red-500/60 flex items-center justify-between text-right transition-all shadow-lg cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 group-hover:scale-105 transition-transform">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm text-white group-hover:text-red-400 transition-colors">
                1. مسدس الانطلاق الصوتي (Starter Gun)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                إطلاق إشارة البداية، مسدس استدعاء كاذب، وأوامر النداء الرسمية
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-red-400 bg-red-950/60 px-2 py-1 rounded-lg border border-red-800/40">
            انطلاق
          </span>
        </button>

        {/* دور 2: كاميرا خط النهاية والتوقيت */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectRole('finish')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 hover:from-cyan-900/70 border border-cyan-500/30 hover:border-cyan-500/60 flex items-center justify-between text-right transition-all shadow-lg cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm text-white group-hover:text-cyan-400 transition-colors">
                2. كاميرا خط النهاية (Photo Finish)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                مسح شريطي فائق الدقة 1/1000s، كشف العبور التلقائي والتقاط الشرائح
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded-lg border border-cyan-800/40">
            وصول
          </span>
        </button>

        {/* دور 3: هاتف الحكم الميداني */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectRole('judge')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 hover:from-amber-900/70 border border-amber-500/30 hover:border-amber-500/60 flex items-center justify-between text-right transition-all shadow-lg cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                3. هاتف الحكم الميداني (Track Judge)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                تعديل وتدقيق أزمنة الحارات، إدارة التصفيات، وإعلان النتائج
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-800/40">
            حكم
          </span>
        </button>

        {/* دور 4: غرفة النداء والتحقق من الصدريات */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectRole('chambre_dappel')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 hover:from-purple-900/70 border border-purple-500/30 hover:border-purple-500/60 flex items-center justify-between text-right transition-all shadow-lg cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm text-white group-hover:text-purple-400 transition-colors">
                4. غرفة النداء (Call Room)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                فحص الصدريات، تأكيد الحضور، وتوزيع الحارات والتصفيات
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-1 rounded-lg border border-purple-800/40">
            نداء
          </span>
        </button>

        {/* دور 5: إدارة المنافسة وشاشة العرض */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectRole('athletics_manager')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 hover:from-emerald-900/70 border border-emerald-500/30 hover:border-emerald-500/60 flex items-center justify-between text-right transition-all shadow-lg cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors">
                5. شاشة العرض الميدانية (Public Display)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                عرض التوقيت المباشر والمنصة التتويجية للجمهور والمدربين
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-800/40">
            شاشة
          </span>
        </button>

        {/* دور 6: حكم نقاط المراقبة للضاحية والطريق */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectRole('checkpoint_judge')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 hover:from-indigo-900/70 border border-indigo-500/30 hover:border-indigo-500/60 flex items-center justify-between text-right transition-all shadow-lg cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm text-white group-hover:text-indigo-400 transition-colors">
                6. حكم نقطة المراقبة (Checkpoint Judge)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                تسجيل عبور العدائين بالباركود في سباقات الضاحية والطريق أوفلاين
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-1 rounded-lg border border-indigo-800/40">
            مراقبة
          </span>
        </button>

        {/* دور 7: جهاز التوقيت اليدوي الاحترافي */}
        <button
          type="button"
          onClick={() => onSelectRole('manual_timing')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-900 hover:from-teal-900/80 border border-teal-500/40 hover:border-teal-400/70 flex items-center justify-between text-right transition-all shadow-xl cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/40 group-hover:scale-105 transition-transform shadow">
              <Timer className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="font-black text-sm text-white group-hover:text-teal-300 transition-colors flex items-center gap-2">
                <span>7. جهاز التوقيت اليدوي الميداني (Manual Timing Console)</span>
                <span className="px-1.5 py-0.2 text-[9px] font-black bg-amber-400 text-black rounded font-mono">1/1000s</span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                اضغط مسافة Space لتسجيل عبور العدائين، مع إسناد الصدرية والرواق لاحقاً
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-lg border border-teal-700/60 shrink-0">
            توقيت يدوي ⏱️
          </span>
        </button>
      </div>

      {/* ═══ 4. إعدادات الغرفة الميدانية والربط بالـ QR ═══ */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">رمز الغرفة الميدانية المشتركة:</span>
          <span className="text-[11px] text-slate-400">تستخدم لربط هواتف السباق معاً</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            dir="ltr"
            value={roomCode}
            onChange={(e) => onSetRoomCode(e.target.value.toUpperCase())}
            placeholder="RACE-100"
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-center font-mono font-bold text-amber-400 text-sm tracking-wider uppercase outline-none transition-colors"
          />
          <button
            type="button"
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
