/**
 * PHOTO FINISH PRO — SCREEN: WIND GAUGE WORKSPACE (مساحة قياس الرياح)
 * Specialized field workstation for مشغل مقياس الرياح (wind gauge operator).
 * World Athletics Rule 21 Compliant:
 * - Tailwind strictly greater than +2.0 m/s => «تتجاوز الحد» (غير صالحة للأرقام القياسية).
 * - Readings at/below +2.0 m/s (including headwind) => «قراءة قانونية».
 * Features:
 * - Live clock, big judge-friendly reading input with quick presets.
 * - Live legality indicator BEFORE saving.
 * - Statistics strip + scrollable readings log with per-row delete (own readings only).
 * - CSV export (BOM + Arabic header) & CSV import with inline count feedback.
 * Strict Rule: Solid surfaces only for full contrast outdoors. No alert()/confirm().
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Wind,
  ChevronRight,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { JudgeAssignment } from '../../services/judgesAssignmentService';
import {
  windReadingService,
  WIND_RECORD_LIMIT_MS,
  WindReading
} from '../../services/windReadingService';

interface WindGaugeWorkspaceProps {
  assignment: JudgeAssignment;
  readOnly?: boolean;
  onBackToDashboard?: () => void;
}

const WIND_PRESETS: ReadonlyArray<{ label: string; value: string }> = [
  { label: '+0.5', value: '0.5' },
  { label: '+1.0', value: '1.0' },
  { label: '+1.5', value: '1.5' },
  { label: '+2.0', value: '2.0' },
  { label: '-0.5', value: '-0.5' },
  { label: '-1.0', value: '-1.0' }
];

const parseWindInput = (raw: string): number | null => {
  const normalized = raw.trim().replace(',', '.');
  if (normalized.length === 0) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatReading = (value: number): string => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

const formatClockTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('ar-DZ');
};

export const WindGaugeWorkspace: React.FC<WindGaugeWorkspaceProps> = ({
  assignment,
  readOnly = false,
  onBackToDashboard
}) => {
  const competitionId = assignment.competitionId;
  const disciplineId = assignment.disciplineId;
  const canEdit = !readOnly && (assignment.permissions?.canRecord ?? true);

  const [readings, setReadings] = useState<WindReading[]>(() =>
    windReadingService.getReadings(competitionId, disciplineId)
  );
  const [stats, setStats] = useState(windReadingService.getStatistics(competitionId));
  const [windInput, setWindInput] = useState<string>('');
  const [attemptRefInput, setAttemptRefInput] = useState<string>('');
  const [bibInput, setBibInput] = useState<string>('');
  const [flash, setFlash] = useState<{ text: string; tone: 'success' | 'info' } | null>(null);
  const [clock, setClock] = useState<string>(() => new Date().toLocaleTimeString('ar-DZ'));

  const flashTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date().toLocaleTimeString('ar-DZ'));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    },
    []
  );

  const refreshFromService = (): void => {
    setReadings(windReadingService.getReadings(competitionId, disciplineId));
    setStats(windReadingService.getStatistics(competitionId));
  };

  const showFlash = (text: string, tone: 'success' | 'info' = 'success'): void => {
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    setFlash({ text, tone });
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 2800);
  };

  const parsedWind = parseWindInput(windInput);
  const currentValidity: 'within_limit' | 'exceeds_limit' | null =
    parsedWind === null
      ? null
      : parsedWind > WIND_RECORD_LIMIT_MS
        ? 'exceeds_limit'
        : 'within_limit';

  const handleRecord = (): void => {
    if (parsedWind === null || !canEdit) return;
    windReadingService.addReading({
      competitionId,
      disciplineId,
      disciplineNameAr: assignment.disciplineNameAr,
      raceOrAttemptRef: attemptRefInput.trim() || undefined,
      athleteBib: bibInput.trim() || undefined,
      readingMs: parsedWind,
      judgeName: assignment.judgeName,
      assignmentId: assignment.id
    });
    setWindInput('');
    refreshFromService();
    showFlash(`تم تسجيل القراءة ${formatReading(parsedWind)} م/ث بنجاح`);
  };

  const handleDeleteReading = (id: string): void => {
    windReadingService.deleteReading(id, competitionId);
    refreshFromService();
  };

  const handleExportCsv = (): void => {
    if (!canEdit) return;
    const csv = windReadingService.toCsv(competitionId);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `wind-readings-${competitionId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    showFlash('تم تصدير سجل القراءات بصيغة CSV', 'info');
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !canEdit) return;
    const csv = await file.text();
    const importedCount = windReadingService.importFromCsv(
      csv,
      competitionId,
      disciplineId,
      assignment.disciplineNameAr,
      assignment.judgeName
    );
    refreshFromService();
    showFlash(`تم استيراد ${importedCount} قراءة من الملف`, 'info');
  };

  const statCards = [
    { label: 'إجمالي القراءات', value: String(stats.total), accent: 'text-white' },
    {
      label: 'متجاوزة الحد',
      value: String(stats.exceeds),
      accent: stats.exceeds > 0 ? 'text-amber-400' : 'text-white'
    },
    {
      label: 'أقصى رياح مؤخرة',
      value: stats.maxTailwind === null ? '—' : formatReading(stats.maxTailwind),
      accent: 'text-emerald-400'
    },
    {
      label: 'أدنى قراءة',
      value: stats.minReading === null ? '—' : stats.minReading.toFixed(2),
      accent: 'text-sky-400'
    }
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#0B1426] text-slate-200">
      {/* ═══ شريط الرأس: العنوان + التخصص + المكان + الساعة الحية ═══ */}
      <header className="sticky top-0 z-10 bg-[#101D35] border-b border-[#1E293B] px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Wind className="w-6 h-6 text-emerald-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-white truncate">مساحة قياس الرياح</h1>
              <p className="text-xs text-slate-400 truncate">
                {assignment.disciplineNameAr} • المكان: {assignment.venue} • {assignment.judgeName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B1426] border border-[#1E293B] text-emerald-300 font-athletic font-black tabular-nums text-sm"
              aria-label="الساعة الحية"
            >
              {clock}
            </div>
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="judge-touch-button px-4 bg-[#0B1426] border border-[#1E293B] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
                لوحة الحكام
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ═══ لوحة تسجيل القراءة ═══ */}
        <section className="bg-[#101D35] border border-[#1E293B] rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Wind className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              تسجيل قراءة الرياح (م/ث)
            </h2>
            <span className="text-[11px] text-slate-500">الإشارة الموجبة = رياح مؤخرة، السالبة = رياح معاكسة</span>
          </div>

          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={windInput}
            onChange={(event) => setWindInput(event.target.value)}
            placeholder="0.00"
            disabled={readOnly}
            aria-label="قراءة الرياح بالمتر في الثانية"
            className="w-full bg-[#0B1426] border border-[#1E293B] rounded-2xl px-4 py-4 text-4xl font-black text-white font-athletic tabular-nums text-center placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors"
          />

          {/* المؤشر القانوني الحي قبل الحفظ */}
          <div aria-live="polite" className="min-h-6 text-sm font-bold">
            {currentValidity === 'within_limit' && (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                قراءة قانونية ✓
              </span>
            )}
            {currentValidity === 'exceeds_limit' && (
              <span className="text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                تتجاوز الحد القانوني +2.0 م/ث — غير صالحة للأرقام القياسية
              </span>
            )}
            {currentValidity === null && (
              <span className="text-slate-500">أدخل قراءة الرياح لعرض حالتها القانونية قبل التسجيل</span>
            )}
          </div>

          {/* أزرار القيم السريعة */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {WIND_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setWindInput(preset.value)}
                disabled={readOnly}
                className="judge-touch-button bg-[#0B1426] border border-[#1E293B] text-slate-200 hover:border-emerald-500/60 hover:text-emerald-300 disabled:opacity-40 transition-colors tabular-nums"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={attemptRefInput}
              onChange={(event) => setAttemptRefInput(event.target.value)}
              placeholder="مرجع المحاولة / الشوط (اختياري)"
              disabled={readOnly}
              aria-label="مرجع المحاولة أو الشوط"
              className="judge-touch-button w-full px-4 bg-[#0B1426] border border-[#1E293B] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors text-right"
            />
            <input
              type="text"
              inputMode="numeric"
              value={bibInput}
              onChange={(event) => setBibInput(event.target.value)}
              placeholder="رقم الصدريية (اختياري)"
              disabled={readOnly}
              aria-label="رقم الصدريية"
              className="judge-touch-button w-full px-4 bg-[#0B1426] border border-[#1E293B] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors text-right tabular-nums"
            />
          </div>

          <button
            type="button"
            onClick={handleRecord}
            disabled={!canEdit || parsedWind === null}
            className="judge-touch-button min-h-[56px] w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
          >
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            تسجيل القراءة
          </button>

          {flash && (
            <div
              aria-live="polite"
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold ${
                flash.tone === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              }`}
            >
              {flash.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Wind className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              {flash.text}
            </div>
          )}
        </section>

        {/* ═══ شريط الإحصاءات ═══ */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="إحصاءات القراءات">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-[#101D35] border border-[#1E293B] rounded-2xl px-4 py-3 flex flex-col gap-1"
            >
              <span className="text-[11px] text-slate-400">{card.label}</span>
              <span className={`text-2xl font-black font-athletic tabular-nums ${card.accent}`}>
                {card.value}
              </span>
            </div>
          ))}
        </section>

        {/* ═══ سجل القراءات ═══ */}
        <section className="bg-[#101D35] border border-[#1E293B] rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#1E293B] flex-wrap">
            <h2 className="text-base font-black text-white">سجل القراءات ({readings.length})</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canEdit}
                className="judge-touch-button px-4 bg-[#0B1426] border border-[#1E293B] text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 transition-colors"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                استيراد CSV
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!canEdit}
                className="judge-touch-button px-4 bg-[#0B1426] border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40 transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                تصدير CSV
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-[#1E293B]">
            {readings.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                لا توجد قراءات مسجلة لهذا التخصص بعد
              </div>
            ) : (
              readings.map((reading) => {
                const valueColor =
                  reading.validity === 'exceeds_limit'
                    ? 'text-amber-400'
                    : reading.readingMs > 0
                      ? 'text-emerald-400'
                      : 'text-sky-400';
                return (
                  <div key={reading.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-white/[0.02]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-base font-black font-athletic tabular-nums ${valueColor}`}>
                          {formatReading(reading.readingMs)} م/ث
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            reading.validity === 'exceeds_limit'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {reading.validity === 'exceeds_limit' ? 'تتجاوز الحد' : 'قانونية'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate tabular-nums">
                        {formatClockTime(reading.recordedAt)}
                        {reading.raceOrAttemptRef ? ` • المرجع: ${reading.raceOrAttemptRef}` : ''}
                        {reading.athleteBib ? ` • الصدريية: ${reading.athleteBib}` : ''}
                        {` • ${reading.judgeName}`}
                      </div>
                    </div>
                    {!readOnly && reading.judgeName === assignment.judgeName && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReading(reading.id)}
                        aria-label={`حذف قراءة ${formatReading(reading.readingMs)} م/ث`}
                        className="judge-touch-button px-3 bg-transparent border border-[#1E293B] text-rose-400 hover:border-rose-500/60 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* إدخال ملف CSV مخفي للاستيراد */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportCsv}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
};
