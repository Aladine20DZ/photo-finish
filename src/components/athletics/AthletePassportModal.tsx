import React from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  Printer, 
  QrCode, 
  Activity, 
  Trophy 
} from 'lucide-react';
import { Athlete, AgeCategory } from '../../types/athletics';
import { CategoryEngine } from '../../services/categoryEngine';

interface AthletePassportModalProps {
  athlete: Athlete | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (athlete: Athlete) => void;
}

export const AthletePassportModal: React.FC<AthletePassportModalProps> = ({
  athlete,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!isOpen || !athlete) return null;

  const categoryInfo = athlete.birthDate 
    ? CategoryEngine.calculateCategory(athlete.birthDate)
    : { category: 'OPEN' as AgeCategory, age: 0, categoryNameAr: 'مفتوح' };

  const isMedicalValid = athlete.medicalClearance && (
    !athlete.medicalClearanceExpiry || new Date(athlete.medicalClearanceExpiry) >= new Date()
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* الترويسة العلوية */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center text-slate-950 font-black shadow">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>بطاقة الهوية الرياضية الموحدة</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  مرجع دائم
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">سجل العدائين الوطني — الاتحاد والرابطات الرياضية 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* جسم البطاقة الرقمية (Passport Visual Card) */}
        <div className="p-6 space-y-6">
          <div className="relative rounded-3xl p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/30 shadow-2xl overflow-hidden print:border-black print:text-black">
            
            {/* زخرفة خلفية وشعار */}
            <div className="absolute top-0 left-0 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* شريط الرأس للبطاقة */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                  ATHLETICS DIGITAL PASSPORT • البطاقة الوطنية
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {athlete.arabicName || `${athlete.firstName} ${athlete.lastName}`}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {athlete.firstName} {athlete.lastName}
                </span>
              </div>

              {/* رقم الصدرية والترخيص */}
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold">رقم الصدرية</div>
                <div className="text-2xl font-black font-mono text-amber-400">
                  #{athlete.bibNumber || '---'}
                </div>
              </div>
            </div>

            {/* شبكة المعلومات الأساسية */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5">رقم الترخيص الوطني</span>
                <span className="font-mono font-black text-cyan-300 select-all">{athlete.licenseNumber}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5">النادي المنتمي إليه</span>
                <span className="font-bold text-white flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{athlete.clubName || 'النادي المعتمد'}</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5">الفئة العمرية (2026)</span>
                <span className="font-black text-amber-400">
                  {categoryInfo.categoryNameAr} ({categoryInfo.category})
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5">تاريخ الميلاد</span>
                <span className="font-mono text-slate-200">{athlete.birthDate || 'غير مسجل'}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5">الجنس والاختصاص</span>
                <span className="font-bold text-slate-200">
                  {athlete.gender === 'M' ? 'ذكر ♂' : 'أنثى ♀'} • {athlete.primaryDiscipline || 'السرعة'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5">الحالة الطبية والتأمين</span>
                <span className={`font-bold flex items-center gap-1 ${isMedicalValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isMedicalValid ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>شهادة صالحة ✓</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>تتطلب تجديد ⚠️</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* الأرقام الشخصية القياسية المسجلة رسمياً (PB) */}
            {athlete.personalBests && athlete.personalBests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>الأرقام الشخصية المعتمدة (Personal Bests):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {athlete.personalBests.map((pb, i) => (
                    <div key={i} className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] flex items-center justify-between">
                      <span className="text-slate-400">{pb.eventName || pb.eventCode}:</span>
                      <span className="font-mono font-black text-amber-300">{pb.recordValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* باركود التحقق الأمني السريع بغرفة النداء */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white text-slate-950">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-white font-bold text-[11px]">رمز التحقق الميداني الفوري</div>
                  <div className="text-[10px] text-slate-400 font-mono">PFP-ATH:{athlete.licenseNumber}</div>
                </div>
              </div>
              <div className="text-left text-[10px] text-slate-500 font-mono">
                صادر عن الاتحاد والرابطة المعتمدة<br />الموسم الرياضي 2026
              </div>
            </div>

          </div>

          {/* أزرار الإجراءات للبطاقة */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>طباعة بطاقة العداء 🖨️</span>
            </button>

            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit(athlete);
                    onClose();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black transition-all cursor-pointer shadow"
                >
                  تعديل بيانات العداء ✏️
                </button>
              )}
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AthletePassportModal;
