import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Archive,
  ShieldAlert,
  Check,
  Clock
} from 'lucide-react';
import { RecycleEntityType } from '../../services/recycleBinService';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { reason: string; permanent: boolean }) => Promise<void> | void;
  entityName: string;
  entityType: RecycleEntityType;
  sourceModule?: string;
  warningDetails?: string;
  isOfficialProtected?: boolean; // Certified results, official records
  allowPermanent?: boolean;
}

const ENTITY_TYPE_LABELS: Record<RecycleEntityType, { label: string; color: string }> = {
  competition: { label: 'منافسة رياضية', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  event: { label: 'مسابقة / تخصص', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  judge: { label: 'حكم معتمد', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  assignment: { label: 'تعيين / تكليف ميداني', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  athlete: { label: 'عداء / مشارك', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  club: { label: 'نادي / جمعية رياضية', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  registration: { label: 'تسجيل مشاركة', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10' },
  race: { label: 'سلسلة / سباق', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  result: { label: 'نتيجة رسمية', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  report: { label: 'محضر / تقرير رسمي', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  device: { label: 'محطة / جهاز ميداني', color: 'text-slate-400 border-slate-500/30 bg-slate-500/10' }
};

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  entityType,
  sourceModule,
  warningDetails,
  isOfficialProtected = false,
  allowPermanent = true
}) => {
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const typeMeta = ENTITY_TYPE_LABELS[entityType] || { label: entityType, color: 'text-slate-300' };

  const handleExecute = async () => {
    if (isOfficialProtected && !reason.trim()) {
      setErrorMsg('يرجى توثيق سبب الحذف أو الإلغاء للبيانات الرسمية المحمية قبل المتابعة.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onConfirm({
        reason: reason.trim() || 'حذف ونقل إلى سلة المحذوفات',
        permanent: isPermanent
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تنفيذ عملية الحذف.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden border-t-4 border-t-rose-500">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>تأكيد الحذف والإزالة</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeMeta.color}`}>
                  {typeMeta.label}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {sourceModule ? `الوحدة المصدرية: ${sourceModule}` : 'حساب الرابطة الولائية'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Target Element Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="truncate">
              <div className="text-[10px] font-bold text-slate-500">العنصر المراد حذفه:</div>
              <div className="text-sm font-black text-white truncate mt-0.5 font-mono">{entityName}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          {/* Warning notice if relationships exist */}
          {warningDetails && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="leading-relaxed font-semibold">
                {warningDetails}
              </div>
            </div>
          )}

          {isOfficialProtected && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed font-semibold">
                <strong>حماية السجلات الرسمية:</strong> هذا السجل يحمل نتائج مصادقة أو قيماً تاريخية معتمدة. سيتم توثيق اسمك وتاريخ العملية وسبب الحذف في سجل التدقيق غير القابل للتلف (Audit Trail).
              </div>
            </div>
          )}

          {/* Delete Mode Selector: Soft Delete vs Permanent */}
          {allowPermanent && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsPermanent(false)}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                  !isPermanent 
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                    <Archive className="w-3.5 h-3.5" />
                    <span>سلة المحذوفات (Soft Delete)</span>
                  </div>
                  {!isPermanent && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  نقل آمن مع إمكانية الاستعادة في أي وقت بنقرة زر واحدة.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsPermanent(true)}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                  isPermanent 
                    ? 'bg-rose-500/20 border-rose-500/50 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف نهائي (Purge)</span>
                  </div>
                  {isPermanent && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  إزالة قطعية من قاعدة البيانات دون إمكانية استرجاع.
                </p>
              </button>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-slate-300">
              سبب الحذف أو الإلغاء {isOfficialProtected ? '<span className="text-rose-400">* (إلزامي للنتائج المعتمدة)</span>' : '(اختياري)'}:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: خطأ في إدخال الفئة، إلغاء التعيين، تكرار السجل..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-sans"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            إلغاء التراجع
          </button>
          
          <button
            type="button"
            onClick={handleExecute}
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-xl text-xs font-black text-white flex items-center gap-2 transition cursor-pointer shadow-lg active:scale-95 ${
              isPermanent 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30' 
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>جاري التنفيذ...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{isPermanent ? 'تأكيد الحذف النهائي القطعي' : 'نقل إلى سلة المحذوفات'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
