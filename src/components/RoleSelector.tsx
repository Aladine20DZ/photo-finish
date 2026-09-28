import React, { useState } from 'react';
import { Flag, Camera, Sparkles, Shuffle, Award, Copy, Check, Link2, QrCode, Users, ScanLine } from 'lucide-react';
import { PhoneRole } from '../types/race';
import { PhoneQrModal } from './PhoneQrModal';
import { QrScannerModal } from './QrScannerModal';

interface RoleSelectorProps {
  roomCode: string;
  onSetRoomCode: (code: string) => void;
  onSelectRole: (role: PhoneRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  roomCode,
  onSetRoomCode,
  onSelectRole,
}) => {
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

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
    if (data.role) {
      onSelectRole(data.role);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="max-w-lg w-full space-y-3 sm:space-y-4">
        {/* رأس الترحيب */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام المزامنة الرباعية الفورية (Photo Finish Quad-Sync 4G)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            اختر دور هذا الهاتف في المنافسة
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            ربط فوري بين 4 هواتف: البداية 🚦، كاميرا النهاية 📸، التحكيم ⚖️، وغرفة النداء 📋
          </p>
        </div>

        {/* كود الغرفة والربط عبر السحابة و4G */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              رمز غرفة الربط المشتركة (Room Code):
            </label>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              سحابة 4G نشطة ⚡
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
              <span className="hidden sm:inline">مسح باركود</span>
            </button>
            <button
              onClick={generateNewRoom}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="توليد كود عشوائي"
            >
              <Shuffle className="w-5 h-5" />
            </button>
          </div>

          {/* روابط سريعة لنسخها وإرسالها للهواتف الأخرى */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Link2 className="w-3 h-3 text-cyan-400" />
              <span>مشاركة روابط الأدوار الأربعة مع الهواتف:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => copyRoleLink('start')}
                className="py-1.5 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                title="نسخ رابط هاتف البداية"
              >
                {copiedRole === 'start' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRole === 'start' ? 'تم النسخ!' : '1. البداية 🚦'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyRoleLink('finish')}
                className="py-1.5 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                title="نسخ رابط هاتف النهاية"
              >
                {copiedRole === 'finish' ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRole === 'finish' ? 'تم النسخ!' : '2. النهاية 📸'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyRoleLink('judge')}
                className="py-1.5 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                title="نسخ رابط هاتف التحكيم"
              >
                {copiedRole === 'judge' ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRole === 'judge' ? 'تم النسخ!' : '3. التحكيم ⚖️'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyRoleLink('chambre_dappel')}
                className="py-1.5 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                title="نسخ رابط هاتف غرفة النداء"
              >
                {copiedRole === 'chambre_dappel' ? <Check className="w-3 h-3 text-indigo-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRole === 'chambre_dappel' ? 'تم النسخ!' : '4. النداء 📋'}</span>
              </button>
            </div>

            {/* أزرار باركود QR للهواتف بدون تنصيب: عرض ومسح */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/40 text-cyan-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>عرض باركود QR للهواتف 📲</span>
              </button>

              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-500/40 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <ScanLine className="w-4 h-4 text-emerald-400" />
                <span>مسح باركود هاتف آخر بالكاميرا 📷</span>
              </button>
            </div>
          </div>
        </div>

        {/* بطاقات اختيار الأدوار الأربعة */}
        <div className="grid grid-cols-1 gap-3">
          {/* 1. هاتف البداية */}
          <button
            onClick={() => onSelectRole('start')}
            className="group relative overflow-hidden text-right p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-900/60 hover:border-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Flag className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white group-hover:text-emerald-300 transition-colors">
                    1. هاتف البداية (خط الانطلاق)
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                    START 🚦
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تحديد القائمة المعنية بالسباق، زر إطلاق <strong>Au Départ 🏁</strong>، الأوامر الصوتية، وإطلاق المسدس الموحد.
                </p>
              </div>
            </div>
          </button>

          {/* 2. هاتف النهاية */}
          <button
            onClick={() => onSelectRole('finish')}
            className="group relative overflow-hidden text-right p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-cyan-950/30 to-slate-900 border border-cyan-900/60 hover:border-cyan-500 transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
                <Camera className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white group-hover:text-cyan-300 transition-colors">
                    2. هاتف النهاية (كاميرا Photo Finish)
                  </h3>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-bold">
                    CAMERA 📸
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تصوير شريط المسح المستمر (Slit-Scan)، الحساسات البصرية للأروقة، وتوليد صور وصول العدائين بدقة 1/1000 ثانية.
                </p>
              </div>
            </div>
          </button>

          {/* 3. هاتف التحكيم */}
          <button
            onClick={() => onSelectRole('judge')}
            className="group relative overflow-hidden text-right p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-900 border border-amber-900/60 hover:border-amber-500 transition-all shadow-lg hover:shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white group-hover:text-amber-300 transition-colors">
                    3. هاتف التحكيم وإحصاء النتائج
                  </h3>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                    CHIEF JUDGE ⚖️
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  مراجعة النتائج بكل التفاصيل، تدقيق صور خط النهاية، طباعة استمارة التحكيم الرسمية (IAAF) وتصدير النتائج PNG/CSV.
                </p>
              </div>
            </div>
          </button>

          {/* 4. هاتف غرفة النداء (Chambre d'Appel) - الهاتف الرابع الجديد المطلوب */}
          <button
            onClick={() => onSelectRole('chambre_dappel')}
            className="group relative overflow-hidden text-right p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/60 hover:border-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white group-hover:text-indigo-300 transition-colors">
                    4. هاتف غرفة النداء (Chambre d'Appel)
                  </h3>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold">
                    CALL ROOM 📋
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تسجيل قوائم العدائين (الاسم واللقب، تاريخ الميلاد، الصدرية، النادي، الولاية)، قرعة الأروقة العشوائية، وبث القوائم فورياً.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* نافذة مسح الباركود للهواتف */}
      {showQrModal && (
        <PhoneQrModal
          roomCode={roomCode}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* نافذة مسح باركود الهاتف المقابل بالكاميرا */}
      {showScannerModal && (
        <QrScannerModal
          onSuccess={handleScanSuccess}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
};
