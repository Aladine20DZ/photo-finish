/**
 * PHOTO FINISH PRO AI — Athletics Manual Timing Console (جهاز التوقيت اليدوي الاحترافي)
 * High-Contrast Dark Chrono Deck with spacebar trigger, giant tactile touch button,
 * rapid multi-runner split ledger, instant bib lookup, and World Athletics TR16 compliance.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Flag, 
  Volume2, 
  VolumeX, 
  Download, 
  Printer, 
  Trash2, 
  Users, 
  CheckCircle2, 
  Info, 
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { 
  manualTimingService, 
  ManualTimingSplit, 
  ManualTimingSession 
} from '../../services/manualTimingService';
import { athleticsAudio } from '../../services/audioService';

interface ManualTimingConsoleProps {
  onClose?: () => void;
  competitionName?: string;
  defaultEventName?: string;
  defaultHeatName?: string;
  onCommitToResults?: (splits: ManualTimingSplit[]) => void;
}

export const ManualTimingConsole: React.FC<ManualTimingConsoleProps> = ({
  onClose,
  competitionName = 'البطولة الولائية لألعاب القوى 2026',
  defaultEventName = '100م نهائي رجال',
  defaultHeatName = 'تصفية 1',
  onCommitToResults,
}) => {
  // ═══ حالة الساعة والتوقيت الميداني ═══
  const [session, setSession] = useState<ManualTimingSession>(() => {
    const saved = manualTimingService.loadActiveSession();
    if (saved) return saved;
    return {
      id: `mt_sess_${Date.now()}`,
      eventName: defaultEventName,
      heatName: defaultHeatName,
      category: 'أكابر رجال',
      windSpeed: '+1.2',
      venue: 'المضمار الولائي لألعاب القوى',
      startedAt: null,
      endedAt: null,
      splits: [],
      status: 'idle'
    };
  });

  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [precision, setPrecision] = useState<'thousandths' | 'hundredths'>('thousandths');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showWaInfo, setShowWaInfo] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // مراجع لحساب التوقيت الخالي من الانحراف الزمني (Drift-Free)
  const startTimeRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const splitsTableEndRef = useRef<HTMLDivElement>(null);

  // إشعار سريع للمستخدم
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // ═══ حلقة التوقيت عبر requestAnimationFrame ═══
  const updateTimer = useCallback(() => {
    if (session.status === 'running' && startTimeRef.current !== null) {
      const now = performance.now();
      const current = accumulatedMsRef.current + (now - startTimeRef.current);
      setElapsedMs(current);
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
  }, [session.status]);

  useEffect(() => {
    if (session.status === 'running') {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [session.status, updateTimer]);

  // حفظ الجلسة محلياً عند كل تعديل
  useEffect(() => {
    manualTimingService.saveActiveSession(session);
  }, [session]);

  // تشغيل أصوات الميدان
  const playSound = (type: 'gun' | 'click' | 'bell' | 'reset') => {
    if (!soundEnabled) return;
    try {
      if (type === 'gun') {
        athleticsAudio.playStarterSound();
      } else if (type === 'click') {
        athleticsAudio.playSensorCutBeep(1);
      } else if (type === 'bell') {
        athleticsAudio.playWhistle();
      }
    } catch {}
  };

  // ═══ 1. بدء السباق (Start) ═══
  const handleStart = () => {
    if (session.status === 'running') return;

    startTimeRef.current = performance.now();
    const isFirstStart = session.startedAt === null;

    setSession(prev => ({
      ...prev,
      startedAt: isFirstStart ? Date.now() : prev.startedAt,
      status: 'running'
    }));

    if (isFirstStart) {
      playSound('gun');
      showToast('انطلق السباق! 🔫 اضغط مسافة لتسجيل كل عداء');
    }
  };

  // ═══ 2. إيقاف مؤقت (Pause) ═══
  const handlePause = () => {
    if (session.status !== 'running') return;
    if (startTimeRef.current !== null) {
      accumulatedMsRef.current += performance.now() - startTimeRef.current;
    }
    startTimeRef.current = null;
    setSession(prev => ({ ...prev, status: 'paused' }));
  };

  // ═══ 3. تسجيل عبور عداء (Split Trigger) — مسافة Space أو زر الوصول ═══
  const handleTriggerSplit = useCallback(() => {
    if (session.status !== 'running') {
      if (session.status === 'idle') {
        handleStart();
      }
      return;
    }

    const now = performance.now();
    const currentSplitTime = accumulatedMsRef.current + (startTimeRef.current ? now - startTimeRef.current : 0);

    // اهتزاز تكتيكي للموبايل
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([35]); } catch {}
    }

    playSound('click');

    setSession(prev => {
      const order = prev.splits.length + 1;
      const leaderTime = prev.splits.length > 0 ? prev.splits[0].elapsedMs : currentSplitTime;
      const gapMs = order === 1 ? 0 : currentSplitTime - leaderTime;

      const isRoad = prev.eventName.includes('ماراثون') || prev.eventName.includes('طريق') || prev.eventName.includes('ريفي');

      const newSplit: ManualTimingSplit = {
        id: `split_${Date.now()}_${order}`,
        order,
        elapsedMs: currentSplitTime,
        displayTime: manualTimingService.formatTime(currentSplitTime, precision),
        waHandTime: manualTimingService.convertToWorldAthleticsHandTime(currentSplitTime, isRoad),
        gapToLeaderMs: gapMs,
        gapDisplay: manualTimingService.formatGap(gapMs),
        bib: '',
        athleteName: '',
        lane: order <= 8 ? order : undefined,
        status: 'OK',
        capturedAt: Date.now()
      };

      return {
        ...prev,
        splits: [...prev.splits, newSplit]
      };
    });

    // تمرير تلقائي لأسفل الجدول لرؤية آخر عداء
    setTimeout(() => {
      if (splitsTableEndRef.current) {
        splitsTableEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  }, [session.status, precision]);

  // ═══ مستمع لوحة المفاتيح: مسافة Space لتسجيل العبور ═══
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // تجاهل إذا كان التركيز داخل حقل إدخال نصوص
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTriggerSplit();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (session.status === 'running') {
          handlePause();
        } else {
          handleStart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerSplit, session.status]);

  // ═══ 4. إعادة التعيين (Reset) ═══
  const handleReset = () => {
    if (session.splits.length > 0) {
      if (!window.confirm('هل تريد مسح توقيتات السباق الحالية وإعادة تعيين الساعة للصفر؟')) {
        return;
      }
    }

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    startTimeRef.current = null;
    accumulatedMsRef.current = 0;
    setElapsedMs(0);

    setSession(prev => ({
      ...prev,
      startedAt: null,
      endedAt: null,
      splits: [],
      status: 'idle'
    }));

    manualTimingService.clearActiveSession();
    showToast('تمت إعادة تعيين جهاز التوقيت إلى 00:00.00');
  };

  // ═══ 5. إنهاء واعتماد السباق (Finish) ═══
  const handleFinishRace = () => {
    handlePause();
    setSession(prev => ({
      ...prev,
      endedAt: Date.now(),
      status: 'finished'
    }));
    manualTimingService.archiveSession({
      ...session,
      endedAt: Date.now(),
      status: 'finished'
    });
    playSound('bell');
    showToast('اكتمل السباق وتم أرشفة النتائج بنجاح! 🏁');

    if (onCommitToResults && session.splits.length > 0) {
      onCommitToResults(session.splits);
    }
  };

  // ═══ تعديل بيانات الصدرية والبحث التلقائي ═══
  const handleBibChange = async (splitId: string, bib: string) => {
    setSession(prev => ({
      ...prev,
      splits: prev.splits.map(s => s.id === splitId ? { ...s, bib } : s)
    }));

    if (bib.trim().length >= 1) {
      const athlete = await manualTimingService.resolveAthleteByBib(bib);
      if (athlete) {
        setSession(prev => ({
          ...prev,
          splits: prev.splits.map(s => s.id === splitId ? {
            ...s,
            athleteName: athlete.name || s.athleteName,
            club: athlete.club || s.club
          } : s)
        }));
      }
    }
  };

  const handleUpdateSplitField = (splitId: string, field: keyof ManualTimingSplit, val: any) => {
    setSession(prev => ({
      ...prev,
      splits: prev.splits.map(s => s.id === splitId ? { ...s, [field]: val } : s)
    }));
  };

  // حذف عداء مسجل بالخطأ
  const handleDeleteSplit = (splitId: string) => {
    setSession(prev => {
      const filtered = prev.splits.filter(s => s.id !== splitId);
      // إعادة ترقيم الترتيب والفارق
      const reindexed = filtered.map((s, idx) => {
        const order = idx + 1;
        const leaderTime = filtered[0].elapsedMs;
        const gapMs = order === 1 ? 0 : s.elapsedMs - leaderTime;
        return {
          ...s,
          order,
          gapToLeaderMs: gapMs,
          gapDisplay: manualTimingService.formatGap(gapMs)
        };
      });
      return { ...prev, splits: reindexed };
    });
  };

  // تبديل ترتيب عداءين
  const handleMoveSplit = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= session.splits.length) return;

    setSession(prev => {
      const copy = [...prev.splits];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;

      const reindexed = copy.map((s, idx) => ({ ...s, order: idx + 1 }));
      return { ...prev, splits: reindexed };
    });
  };

  // تصدير CSV
  const handleExportCsv = () => {
    const csvContent = manualTimingService.exportToCsv(session);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ManualTiming_${session.eventName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('تم تصدير كشف التوقيت اليدوي CSV بنجاح');
  };

  const formattedClock = manualTimingService.formatTime(elapsedMs, precision);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none" dir="rtl">
      
      {/* ═══ 1. الشريط العلوي للجهاز (Header & Session Info) ═══ */}
      <header className="bg-slate-900 border-b border-emerald-950 px-4 py-2.5 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="العودة"
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  MANUAL TIMING
                </span>
                <h1 className="text-sm sm:text-base font-black text-white truncate">
                  {session.eventName} • {session.heatName}
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                {competitionName} | الرياح: {session.windSpeed} m/s | الفئة: {session.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* زر الصوت */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                soundEnabled ? 'bg-slate-800 text-emerald-400 border-emerald-900' : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={soundEnabled ? 'صوت المسدس والنقرات مفعل' : 'كتم الصوت'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* زر تبديل الدقة */}
            <button
              onClick={() => setPrecision(prev => prev === 'thousandths' ? 'hundredths' : 'thousandths')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono font-bold text-amber-300 transition"
              title="تغيير الدقة بين 1/1000s و 1/100s"
            >
              {precision === 'thousandths' ? '1/1000s' : '1/100s'}
            </button>

            {/* إعدادات المسابقة */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="تعديل اسم السباق والرياح"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* معلومات لوائح World Athletics */}
            <button
              onClick={() => setShowWaInfo(!showWaInfo)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
              title="دليل لوائح التوقيت اليدوي World Athletics TR16"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* نافذة التعديل السريع لبيانات السباق والرياح */}
      {showConfig && (
        <div className="bg-slate-900/98 border-b border-emerald-900/40 p-4 animate-in slide-in-from-top-2">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1">اسم السباق</label>
              <input
                type="text"
                value={session.eventName}
                onChange={(e) => setSession(prev => ({ ...prev, eventName: e.target.value }))}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">المجموعة / التصفية</label>
              <input
                type="text"
                value={session.heatName}
                onChange={(e) => setSession(prev => ({ ...prev, heatName: e.target.value }))}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">سرعة الرياح (m/s)</label>
              <input
                type="text"
                value={session.windSpeed}
                onChange={(e) => setSession(prev => ({ ...prev, windSpeed: e.target.value }))}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">الفئة العمرية</label>
              <input
                type="text"
                value={session.category}
                onChange={(e) => setSession(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* بطاقة إرشاد لوائح التوقيت اليدوي TR16 */}
      {showWaInfo && (
        <div className="bg-cyan-950/40 border-b border-cyan-800/40 p-4 text-xs text-cyan-200">
          <div className="max-w-4xl mx-auto space-y-1.5 leading-relaxed">
            <div className="font-black text-sm text-cyan-300 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              <span>لوائح التوقيت اليدوي الرسمي (World Athletics Technical Rule 16 / Rule 165):</span>
            </div>
            <p>
              • لسباقات المضمار التي تقاس يدوياً: إذا لم ينتهِ الزمن بصفر في خانة المئة، يُقرّب الزمن تصاعدياً إلى العُشر الأطول التالي (مثال: 10.11s تصبح 10.2s، و 10.20s تبقى 10.2s).
            </p>
            <p>
              • سباقات الطريق والضاحية (Road & Cross-Country): تُقرّب الأزمنة اليدوية تصاعدياً إلى الثانية الكاملة التالية.
            </p>
          </div>
        </div>
      )}

      {/* ═══ 2. لوحة الساعة الرقمية الداكنة العملاقة (Dark Chrono Deck) ═══ */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:py-6 flex flex-col gap-5">
        
        <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-emerald-950 p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden track-lines">
          
          {/* شارة حالة السباق اللحظية */}
          <div className="mb-3">
            {session.status === 'idle' && (
              <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold">
                جاهز للانطلاق ⏱️
              </span>
            )}
            {session.status === 'running' && (
              <span className="px-3.5 py-1 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                السباق جارٍ الآن • LIVE CHRONO
              </span>
            )}
            {session.status === 'paused' && (
              <span className="px-3 py-1 rounded-full bg-amber-950 border border-amber-500 text-amber-300 text-xs font-bold">
                متوقف مؤقتاً ⏸️
              </span>
            )}
            {session.status === 'finished' && (
              <span className="px-3 py-1 rounded-full bg-purple-950 border border-purple-500 text-purple-300 text-xs font-black">
                اكتمل السباق 🏁
              </span>
            )}
          </div>

          {/* الساعة الرقمية العملاقة الثابتة (Fixed Monospace Font) */}
          <div 
            className="tnum select-none text-5xl sm:text-7xl lg:text-8xl font-black text-white font-mono tracking-wider drop-shadow-[0_4px_24px_rgba(16,185,129,0.3)] my-2"
            dir="ltr"
          >
            {formattedClock}
          </div>

          {/* التوقيت اليدوي الرسمي المقرب بموجب WA TR16 */}
          {elapsedMs > 0 && (
            <div className="text-xs sm:text-sm font-mono font-bold text-amber-400 mt-1 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800">
              الزمن اليدوي المعتمد (TR16):{' '}
              <span className="text-white font-black text-sm sm:text-base">
                {manualTimingService.convertToWorldAthleticsHandTime(elapsedMs)}
              </span>
            </div>
          )}

          {/* أزرار التحكم الأساسية بالساعة (Start / Pause / Reset) */}
          <div className="flex items-center gap-3 mt-6">
            {session.status !== 'running' ? (
              <button
                type="button"
                onClick={handleStart}
                className="px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm sm:text-base flex items-center gap-2 shadow-xl shadow-emerald-950/80 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>{session.status === 'paused' ? 'استئناف السباق' : 'إعطاء إشارة الانطلاق 🔫'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="px-6 sm:px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm sm:text-base flex items-center gap-2 shadow-xl shadow-amber-950 active:scale-95 transition-all cursor-pointer"
              >
                <Pause className="w-5 h-5 fill-slate-950" />
                <span>إيقاف مؤقت ⏸️</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all cursor-pointer"
              title="إعادة ضبط الساعة للصفر"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {session.splits.length > 0 && session.status !== 'finished' && (
              <button
                type="button"
                onClick={handleFinishRace}
                className="px-5 py-3 rounded-2xl bg-purple-700 hover:bg-purple-600 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Flag className="w-4 h-4" />
                <span>إنهاء السباق 🏁</span>
              </button>
            )}
          </div>

        </div>

        {/* ═══ 3. زر الوصول اللمسي العملاق (Giant Touch Finish Trigger) ═══ */}
        <div className="w-full">
          <button
            type="button"
            onClick={handleTriggerSplit}
            disabled={session.status === 'idle' && elapsedMs === 0}
            className={`w-full py-6 sm:py-8 px-6 rounded-3xl font-black text-base sm:text-xl md:text-2xl flex flex-col items-center justify-center gap-2 shadow-2xl transition-all transform active:scale-[0.98] cursor-pointer border-2 ${
              session.status === 'running'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/80 shadow-emerald-950/80'
                : 'bg-slate-900 text-slate-400 border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Flag className="w-6 h-6 sm:w-8 sm:h-8 animate-bounce" />
              <span>تسجيل عبور / خط النهاية 🏁 [مسافة Space]</span>
            </div>
            <span className="text-xs sm:text-sm font-semibold opacity-85">
              انقر أو اضغط مسافة فور ملامسة صدر العداء خط النهاية • يتم حفظ الزمن فورياً
            </span>
          </button>
        </div>

        {/* ═══ 4. جدول التوقيتات الفورية وإسناد الصدريات (Rapid Splits Ledger) ═══ */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm sm:text-base font-black text-white">
                جدول أزمنة الوصول المسجلة ({session.splits.length} عداء)
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                disabled={session.splits.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                disabled={session.splits.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة المحضر</span>
              </button>
            </div>
          </div>

          {session.splits.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <div className="text-4xl">⏱️</div>
              <p className="font-bold text-sm text-slate-400">لم يتم تسجيل أي عبور بعد</p>
              <p className="text-xs text-slate-500">
                ابدأ السباق ثم اضغط على زر العبور أو زر مسافة (Space) لتسجيل كل عداء لحظياً.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-3">رقم الصدرية</th>
                    <th className="py-3 px-3">اسم العداء</th>
                    <th className="py-3 px-3 text-center w-16">الرواق</th>
                    <th className="py-3 px-3">النادي</th>
                    <th className="py-3 px-3 text-center font-mono">التوقيت الدقيق</th>
                    <th className="py-3 px-3 text-center font-mono text-amber-400">توقيت WA TR16</th>
                    <th className="py-3 px-3 text-center font-mono">الفارق</th>
                    <th className="py-3 px-3 text-center w-20">الحالة</th>
                    <th className="py-3 px-3 text-center w-20">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {session.splits.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-850/60 transition-colors">
                      
                      {/* الترتيب */}
                      <td className="py-2.5 px-3 text-center font-black">
                        {s.order === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center justify-center font-bold">1 🥇</span>
                        ) : s.order === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 inline-flex items-center justify-center font-bold">2 🥈</span>
                        ) : s.order === 3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 inline-flex items-center justify-center font-bold">3 🥉</span>
                        ) : (
                          <span className="text-slate-400">{s.order}</span>
                        )}
                      </td>

                      {/* رقم الصدرية (Bib) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={s.bib}
                          onChange={(e) => handleBibChange(s.id, e.target.value)}
                          placeholder="صدرية..."
                          className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg text-center font-mono font-bold text-amber-400 text-xs outline-none"
                        />
                      </td>

                      {/* اسم العداء */}
                      <td className="py-2.5 px-3 font-bold text-white">
                        <input
                          type="text"
                          value={s.athleteName}
                          onChange={(e) => handleUpdateSplitField(s.id, 'athleteName', e.target.value)}
                          placeholder="اسم العداء..."
                          className="w-full min-w-[130px] px-2 py-1 bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-lg text-white font-bold text-xs outline-none"
                        />
                      </td>

                      {/* الرواق (Lane 1-8) */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={s.lane || ''}
                          onChange={(e) => handleUpdateSplitField(s.id, 'lane', Number(e.target.value) || undefined)}
                          className="px-1.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-xs text-slate-300"
                        >
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </td>

                      {/* النادي الرياضي */}
                      <td className="py-2.5 px-3 text-slate-300">
                        <input
                          type="text"
                          value={s.club || ''}
                          onChange={(e) => handleUpdateSplitField(s.id, 'club', e.target.value)}
                          placeholder="النادي..."
                          className="w-full min-w-[110px] px-2 py-1 bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-lg text-slate-300 text-xs outline-none"
                        />
                      </td>

                      {/* التوقيت الدقيق 1/1000s */}
                      <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-400 text-xs sm:text-sm">
                        {s.displayTime}
                      </td>

                      {/* التوقيت اليدوي المقرب بموجب WA TR16 */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400 text-xs sm:text-sm">
                        {s.waHandTime}
                      </td>

                      {/* الفارق عن المتصدر */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {s.gapDisplay}
                      </td>

                      {/* الحالة */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={s.status}
                          onChange={(e) => handleUpdateSplitField(s.id, 'status', e.target.value)}
                          className="px-1.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-bold text-slate-300"
                        >
                          <option value="OK">OK</option>
                          <option value="DNF">DNF</option>
                          <option value="DQ">DQ</option>
                          <option value="DNS">DNS</option>
                        </select>
                      </td>

                      {/* إجراءات (تبديل الترتيب وحذف) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSplit(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-400"
                            title="تقديم الترتيب"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSplit(idx, 'down')}
                            disabled={idx === session.splits.length - 1}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-400"
                            title="تأخير الترتيب"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSplit(s.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                            title="حذف هذا العبور"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={splitsTableEndRef} />
            </div>
          )}

        </div>

      </main>

      {/* تنبيه Toast في أسفل الشاشة */}
      {successToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

    </div>
  );
};

export default ManualTimingConsole;
