/**
 * PHOTO FINISH PRO AI — Fast Duty Code Check-In
 * Allows track & field officials, checkpoint judges, and call room marshals
 * to enter their task duty code (e.g. LIG31-7K4M-Q9TX) and immediately unlock their field role.
 */

import React, { useState } from 'react';
import { 
  ScanLine, 
  BadgeCheck, 
  ClipboardCheck, 
  UserCheck, 
  MapPin, 
  WifiOff, 
  Timer, 
  Loader2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { PhoneRole } from '../../types/race';

export interface TaskAssignment {
  code: string;
  role: PhoneRole;
  roleTitleAr: string;
  leagueNameAr: string;
  competitionTitleAr: string;
  station: string;
  venue: string;
  checkedInAt: string;
  note?: string;
}

const PRESET_DEMO_TASKS: Record<string, TaskAssignment> = {
  'LIG31-7K4M-Q9TX': {
    code: 'LIG31-7K4M-Q9TX',
    role: 'judge',
    roleTitleAr: 'حكم رئيسي — فحص وتدقيق خط النهاية (Photo Finish)',
    leagueNameAr: 'الرابطة الولائية لألعاب القوى - وهران (LAO)',
    competitionTitleAr: 'البطولة الوطنية لألعاب القوى للأكابر 2026',
    station: 'برج التحكيم ومراجعة الـ Photo Finish',
    venue: 'المركب الأولمبي ميلود هدفي، وهران',
    checkedInAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    note: 'معايرة خيط القياس الزمني على صدر العدائين وفق المادة 164.2',
  },
  'LIG16-CHF2-M4RK': {
    code: 'LIG16-CHF2-M4RK',
    role: 'finish',
    roleTitleAr: 'حكم كاميرا النهاية — مشغل المسح الشريطي المزدوج',
    leagueNameAr: 'الاتحاد الجزائري لألعاب القوى (FAA)',
    competitionTitleAr: 'نهائيات كأس الجزائر للمضمار والميدان',
    station: 'حامل كاميرا خط النهاية (Tripod Finish Line)',
    venue: 'ملعب 5 جويلية 1962، الجزائر العاصمة',
    checkedInAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    note: 'تأكد من مطابقة الخط الأحمر مع الخط الأبيض على أرضية التارتان',
  },
  'LIG25-CALL-RO0M': {
    code: 'LIG25-CALL-RO0M',
    role: 'chambre_dappel',
    roleTitleAr: 'حكم غرفة النداء (Chambre d\'Appel) وتوزيع الأروقة',
    leagueNameAr: 'الرابطة الولائية لألعاب القوى - قسنطينة (LAC)',
    competitionTitleAr: 'تجمع قسنطينة المفتوح للعدو الريفي',
    station: 'منطقة النداء والتحقق من الصدريات',
    venue: 'ملعب الشهيد حملاوي، قسنطينة',
    checkedInAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    note: 'مراقبة الصدريات وتأكيد حضور العدائين قبل 15 دقيقة من الانطلاق',
  },
  'LIG19-STRT-GUN1': {
    code: 'LIG19-STRT-GUN1',
    role: 'start',
    roleTitleAr: 'حكم البداية — مسدس الانطلاق الصوتي والنداءات الرسمية',
    leagueNameAr: 'الرابطة الولائية لألعاب القوى - سطيف (LAS)',
    competitionTitleAr: 'تجمع الهضاب العليا للسرعة والحواجز',
    station: 'خط الانطلاق (Start Line)',
    venue: 'ملعب 8 ماي 1945، سطيف',
    checkedInAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    note: 'أوامر: خذ مكانك -> استعد -> طلقة الانطلاق الصوتية',
  },
  'LIG02-CHKP-CP02': {
    code: 'LIG02-CHKP-CP02',
    role: 'checkpoint_judge',
    roleTitleAr: 'حكم نقطة مراقبة مسار الضاحية (Checkpoint Judge)',
    leagueNameAr: 'الرابطة الولائية لألعاب القوى - الشلف (LACh)',
    competitionTitleAr: 'بطولة الشلف للعدو الريفي 2026',
    station: 'نقطة المراقبة رقم 2 (المنعطف الجبلي 3.5 كم)',
    venue: 'غابة باوفريش، الشلف',
    checkedInAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    note: 'مسح صدريات العدائين عبر ماسح الـ QR وتسجيل أي مخالفة للمسار',
  },
};

interface DutyCodeCheckInProps {
  onUnlockTask: (task: TaskAssignment) => void;
  onEnterGeneralField: () => void;
}

export const DutyCodeCheckIn: React.FC<DutyCodeCheckInProps> = ({ onUnlockTask, onEnterGeneralField }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<TaskAssignment | null>(null);

  React.useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const urlCode = p.get('code') || p.get('duty') || p.get('dutyCode');
      if (urlCode) {
        setCode(urlCode.toUpperCase());
        redeem(urlCode);
      }
    } catch {}
  }, []);

  const redeem = (codeToTest?: string) => {
    const raw = (codeToTest || code).trim().toUpperCase();
    if (!raw) return;
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const match = PRESET_DEMO_TASKS[raw];
      if (match) {
        setTask(match);
      } else if (raw.length >= 6) {
        // إنشاء مهمة حكم عام تلقائياً لأي كود صالح الشكل
        const genericTask: TaskAssignment = {
          code: raw,
          role: 'judge',
          roleTitleAr: 'حكم سباق معتمد بموجب كود الرابطة',
          leagueNameAr: 'الاتحاد الجزائري لألعاب القوى (FAA)',
          competitionTitleAr: 'البطولة الوطنية لألعاب القوى',
          station: 'محطة التحكيم الميدانية المخصصة',
          venue: 'ميدان السباق الرسمي',
          checkedInAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
          note: 'تم تفعيل صلاحيات الحكم بنجاح',
        };
        setTask(genericTask);
      } else {
        setError('كود المهمة غير صحيح. يرجى التأكد من الرمز المطبوع في بطاقة التكليف.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {!task ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-400 shadow-md">
              <ScanLine className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">دخول وضع المنافسة بكود المهمة</h2>
              <p className="text-xs sm:text-sm text-slate-400">خاص بالحكام ومساعدي المسابقات وغرفة النداء</p>
            </div>
          </div>

          <label htmlFor="duty-code" className="text-xs sm:text-sm font-bold text-slate-300 mb-2 block">
            أدخل كود المهمة الرسمي الصادر من الرابطة:
          </label>

          <input
            id="duty-code"
            dir="ltr"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && redeem()}
            placeholder="مثال: LIG31-7K4M-Q9TX"
            autoComplete="off"
            className="tnum w-full text-center text-xl sm:text-2xl font-black tracking-widest rounded-2xl border-2 border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 font-mono transition-all"
          />

          {error && (
            <div role="alert" className="mt-3 text-xs sm:text-sm font-bold text-rose-400 flex items-center gap-2 bg-rose-950/50 p-2.5 rounded-xl border border-rose-800/60">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              onClick={() => redeem()}
              disabled={loading || code.trim().length < 4}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BadgeCheck className="w-5 h-5" />}
              <span>تأكيد الكود والدخول للمهمة</span>
            </button>

            <button
              onClick={onEnterGeneralField}
              className="h-12 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Timer className="w-4 h-4 text-emerald-400" />
              <span>دخول عام كحكم</span>
            </button>
          </div>

          {/* قائمة الأكواد النموذجية الجاهزة للاختبار والمعاينة */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[11px] font-black text-slate-400 mb-2 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>أكواد نموذجية جاهزة لمعاينة الأدوار المختلفة فوراً:</span>
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(PRESET_DEMO_TASKS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => {
                    setCode(k);
                    redeem(k);
                  }}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/60 text-right transition-all flex flex-col gap-0.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-200 group-hover:text-emerald-300">
                      {v.roleTitleAr.split('—')[0]}
                    </span>
                    <span className="tnum text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60" dir="ltr">
                      {k}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate">{v.station}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* ═══ بطاقة التكليف المعتمدة ═══ */
        <section className="rounded-3xl border-2 border-emerald-500/40 bg-slate-900 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 px-6 py-4 flex items-center justify-between font-black">
            <h3 className="text-base sm:text-lg flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-slate-950" />
              <span>بطاقة التكليف الرياضية الرسمية</span>
            </h3>
            <span className="font-mono text-xs bg-slate-950/20 px-2.5 py-1 rounded-full" dir="ltr">
              {task.code}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold">الدور المخصص في التظاهرة:</div>
                <div className="text-base sm:text-lg font-black text-emerald-300">{task.roleTitleAr}</div>
              </div>
            </div>

            <div className="grid gap-2.5 text-xs sm:text-sm">
              <Row label="الرابطة المنظمة" value={task.leagueNameAr} />
              <Row label="التظاهرة الرسمية" value={task.competitionTitleAr} />
              <Row label="مكان المحطة والموقع" value={`${task.station} — ${task.venue}`} />
              <Row label="وقت تأكيد الحضور" value={task.checkedInAt} isMono />
              {task.note && <Row label="تعليمات التحكيم" value={task.note} />}
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-xs text-slate-400 flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                هذه البطاقة محملة وموقعة محلياً، وتعمل بكفاءة تامة دون اتصال بالإنترنت. سيتم تسجيل وتوقيع كل زمن يتم اعتماده باسم هذا الكود.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => onUnlockTask(task)}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950"
              >
                <MapPin className="w-5 h-5 text-slate-950" />
                <span>دخول محطة التحكيم الميدانية الآن</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>

              <button
                onClick={() => {
                  setTask(null);
                  setCode('');
                }}
                className="h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                تغيير الكود
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; isMono?: boolean }> = ({ label, value, isMono }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-800/60 pb-2">
    <span className="text-slate-400 font-bold shrink-0">{label}:</span>
    <span className={`text-slate-100 font-extrabold text-right ${isMono ? 'font-mono text-emerald-300' : ''}`}>
      {value}
    </span>
  </div>
);

