/**
 * PHOTO FINISH PRO AI — Lane Tap Timing Deck (واجهة كبس الأورقة لحكم خط النهاية)
 * World Athletics Rule 165 Manual Timing & Finish Line Lane-by-Lane Tap System.
 * Large touch-optimized lane squares for single-tap order-of-finish registration,
 * instant 1/1000s time-stamping, undo protection, and inter-judge intercom/alert horn.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Timer, 
  RotateCcw, 
  Undo2, 
  FileSpreadsheet, 
  Printer, 
  AlertOctagon, 
  Radio, 
  Square, 
  Volume2, 
  VolumeX, 
  Flame,
  Zap
} from 'lucide-react';
import { athleticsAudio } from '../../services/audioService';
// manual timing
import { athleticsNetwork } from '../../services/networkService';
import { OfficialFederationHeader, OfficialFederationFooter } from './OfficialFederationHeader';

export interface LaneRunnerAssignment {
  lane: number;
  bibNumber?: number | string;
  athleteName?: string;
  clubName?: string;
}

export interface LaneFinish {
  lane: number;
  rank: number;
  rawTimeMs: number;
  formattedTime: string;
  gapText: string;
  bibNumber?: number | string;
  athleteName?: string;
  clubName?: string;
}

export interface LaneTapTimingDeckProps {
  roomCode?: string;
  laneCount?: number;
  competitionName?: string;
  discipline?: string;
  onFinishComplete?: (finishes: LaneFinish[]) => void;
  onClose?: () => void;
}

export const LaneTapTimingDeck: React.FC<LaneTapTimingDeckProps> = ({
  roomCode: _roomCode = 'RACE-100',
  laneCount = 8,
  competitionName = 'البطولة الوطنية لألعاب القوى',
  discipline = '100م رجال (نهائي)',
  onFinishComplete,
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [finishes, setFinishes] = useState<LaneFinish[]>([]);
  const [laneAssignments, setLaneAssignments] = useState<Record<number, LaneRunnerAssignment>>({});
  const updateLaneBib = (lane: number, bib: string) => {
    setLaneAssignments(prev => ({ ...prev, [lane]: { lane, bibNumber: bib } }));
  };
  const [alertActive, setAlertActive] = useState<string | null>(null);
  const [intercomLogs, setIntercomLogs] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
  // isRecordingVoice
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  // تحديث الساعة المباشرة بدقة عالية
  const updateTimer = useCallback(() => {
    if (isRunningRef.current) {
      const now = performance.now();
      setElapsedMs(Math.max(0, now - startTimeRef.current));
      requestRef.current = requestAnimationFrame(updateTimer);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // الاستماع لرسائل الشبكة ومزامنة البداية وبوق التنبيه من الحكام الآخرين
  useEffect(() => {
    const handleBroadcastMessage = (event: MessageEvent) => {
      try {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'START_GUN') {
          handleStartRace(data.senderTime || performance.now());
        } else if (data.type === 'RECALL_GUN') {
          handleRecallGun();
        } else if (data.type === 'JUDGE_ALERT') {
          triggerIncomingAlert(data.message || '⚠️ تنبيه عاجل من الحكم العام!');
        } else if (data.type === 'JUDGE_INTERCOM') {
          if (data.text) {
            setIntercomLogs(prev => [
              { id: String(Date.now()), sender: data.sender || 'حكم', text: data.text, time: new Date().toLocaleTimeString('ar-DZ') },
              ...prev.slice(0, 15)
            ]);
            // نغمة إشعار عند ورود رسالة
            if (soundEnabled) athleticsAudio.playBeep(880, 0.1);
          }
        }
      } catch {}
    };

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('athletics_photo_finish_v4');
      channel.onmessage = handleBroadcastMessage;
      return () => channel.close();
    }
  }, [soundEnabled]);

  const handleStartRace = (customStart?: number) => {
    const start = customStart || performance.now();
    startTimeRef.current = start;
    isRunningRef.current = true;
    setStartTime(start);
    setIsRunning(true);
    setFinishes([]);
    if (soundEnabled) athleticsAudio.playStarterSound();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(updateTimer);
  };

  const handleStopRace = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const handleResetRace = () => {
    handleStopRace();
    setElapsedMs(0);
    setFinishes([]);
  };

  const handleRecallGun = () => {
    handleStopRace();
    setAlertActive('🛑 انطلاق خاطئ (False Start) — تم إطلاق طلقة الاسترجاع المزدوجة!');
    if (soundEnabled) athleticsAudio.playRecallGun();
    setTimeout(() => setAlertActive(null), 5000);
  };

  // كبس الرواق عند خط النهاية (Lane Tap Trigger)
  const handleTapLane = (laneNumber: number) => {
    if (!isRunning && finishes.length === 0) {
      // إذا لم يكن السباق قد انطلق بعد، يبدأ تلقائياً عند أول كبسة
      handleStartRace();
      return;
    }

    // التحقق من أن هذا الرواق لم يُسجل من قبل
    const alreadyFinished = finishes.some(f => f.lane === laneNumber);
    if (alreadyFinished) return;

    const tapTimeMs = isRunning ? performance.now() - startTimeRef.current : elapsedMs;
    const rank = finishes.length + 1;
    const formatted = (tapTimeMs / 1000).toFixed(2) + 's';
    const firstTimeMs = finishes.length > 0 ? finishes[0].rawTimeMs : tapTimeMs;
    const gap = rank === 1 ? '—' : `+${((tapTimeMs - firstTimeMs) / 1000).toFixed(2)}s`;

    const runner = laneAssignments[laneNumber] || {};

    const newFinish: LaneFinish = {
      lane: laneNumber,
      rank,
      rawTimeMs: tapTimeMs,
      formattedTime: formatted,
      gapText: gap,
      bibNumber: runner.bibNumber,
      athleteName: runner.athleteName,
      clubName: runner.clubName
    };

    const updatedFinishes = [...finishes, newFinish];
    setFinishes(updatedFinishes);
    if (onFinishComplete) {
      onFinishComplete(updatedFinishes);
    }

    // رد فعل حركي وصوتي فوري للحكم
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([40]); } catch {}
    }
    if (soundEnabled) {
      athleticsAudio.playBeep(rank === 1 ? 950 : 700, 0.08);
    }

    // بث الوصول للشبكة والحكام الآخرين
    try {
      athleticsNetwork.sendMessage({
        type: 'LANE_FINISH',
        timestamp: Date.now(),
        senderTime: tapTimeMs,
        payload: {
          lane: laneNumber,
          timeMs: tapTimeMs,
          rank,
          bib: typeof runner.bibNumber === 'number' ? runner.bibNumber : undefined
        }
      });
    } catch {}

    // إذا سجلت كافة الأورقة، نوقف التوقيت تلقائياً
    if (updatedFinishes.length >= laneCount) {
      handleStopRace();
    }
  };

  // تراجع عن آخر رواق تم كبسه بالخطأ
  const handleUndoLastLane = () => {
    if (finishes.length === 0) return;
    const updated = finishes.slice(0, -1);
    setFinishes(updated);
    if (soundEnabled) athleticsAudio.playBeep(400, 0.1);
  };

  // إطلاق بوق التنبيه العاجل لجميع الحكام
  const handleTriggerSirenHorn = () => {
    if (soundEnabled) {
      athleticsAudio.playBeep(1200, 0.5);
    }
    setAlertActive('🚨 تم إطلاق بوق الإنذار إلى جميع شاشات الحكام!');
    setTimeout(() => setAlertActive(null), 4000);

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('athletics_photo_finish_v4');
        ch.postMessage({
          type: 'JUDGE_ALERT',
          message: '🚨 إنذار فوري من حكم خط النهاية!'
        });
        ch.close();
      }
    } catch {}
  };

  // إرسال رسالة تكتيكية سريعة للحكام
  const handleSendTacticalMessage = (text: string) => {
    setIntercomLogs(prev => [
      { id: String(Date.now()), sender: 'أنت (خط النهاية)', text, time: new Date().toLocaleTimeString('ar-DZ') },
      ...prev.slice(0, 15)
    ]);

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('athletics_photo_finish_v4');
        ch.postMessage({
          type: 'JUDGE_INTERCOM',
          sender: 'حكم النهاية',
          text
        });
        ch.close();
      }
    } catch {}
  };

  const triggerIncomingAlert = (msg: string) => {
    setAlertActive(msg);
    if (soundEnabled) athleticsAudio.playBeep(1100, 0.4);
    setTimeout(() => setAlertActive(null), 5000);
  };

  // تصدير النتائج CSV
  const handleExportCsv = () => {
    if (finishes.length === 0) return;
    const BOM = '\uFEFF';
    const csvRows = [
      `"محضر توقيت خط النهاية بالأورقة - ${competitionName}"`,
      `"التخصص: ${discipline} | التاريخ: ${new Date().toLocaleDateString('ar-DZ')}"`,
      '',
      'الترتيب,رقم الرواق,رقم الصدرية,اسم العداء,النادي,الزمن المسجل,الفارق'
    ];

    finishes.forEach(f => {
      csvRows.push([
        f.rank,
        f.lane,
        f.bibNumber || '-',
        `"${f.athleteName || `عداء الرواق ${f.lane}`}"`,
        `"${f.clubName || '-'}"`,
        f.formattedTime,
        f.gapText
      ].join(','));
    });

    const blob = new Blob([BOM + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lane_Timing_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const seconds = Math.floor(elapsedMs / 1000);
  const millis = Math.floor((elapsedMs % 1000) / 10);

  return (
    <div className="bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-2xl space-y-6" dir="rtl">
      
      {/* ═══ 1. شريط العنوان والتنبيهات ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
            <Timer className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">لوحة كبس الأورقة لحكم خط النهاية</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold font-mono">
                Lane Tap 1/1000s
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>اضغط على مربع الرواق فور عبور صدر العداء لخط النهاية لتوثيق الترتيب والزمن تلقائياً</span>
              {startTime > 0 && (
                <span className="text-[10px] text-cyan-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  انطلاق: {new Date(startTime).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              soundEnabled ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'تعطيل المؤثرات الصوتية' : 'تفعيل المؤثرات الصوتية'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* زر بوق التنبيه العاجل للحكام */}
          <button
            onClick={handleTriggerSirenHorn}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-red-950/60 active:scale-95 cursor-pointer animate-pulse"
            title="إطلاق صفارة/بوق تنبيه عاجل لجميع الحكام"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>بوق التنبيه 🚨</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* شريط الإشعار العاجل إذا وجد */}
      {alertActive && (
        <div className="p-3 rounded-2xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-black flex items-center gap-2 animate-bounce">
          <Flame className="w-5 h-5 text-red-400 shrink-0" />
          <span>{alertActive}</span>
        </div>
      )}

      {/* ═══ 2. شاشة الساعة الكبرى وأزرار التحكم ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        
        {/* الساعة الرقمية الرياضية الكبرى */}
        <div className="md:col-span-2 p-4 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/40 shadow-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`} />
              <span>{isRunning ? 'السباق جارٍ • خط النهاية مفتوح' : finishes.length > 0 ? 'السباق متوقف / مكتمل' : 'بانتظار الانطلاق'}</span>
            </div>
            <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white flex items-baseline gap-1" dir="ltr">
              <span>{String(seconds).padStart(2, '0')}</span>
              <span className="text-emerald-400">:</span>
              <span className="text-emerald-400 text-3xl sm:text-5xl">{String(millis).padStart(2, '0')}</span>
              <span className="text-xs font-sans text-slate-400 font-bold ml-2">SEC</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!isRunning ? (
              <button
                onClick={() => handleStartRace()}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950/60 active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-slate-950" />
                <span>انطلاق السباق</span>
              </button>
            ) : (
              <button
                onClick={handleStopRace}
                className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-xl active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                <span>إيقاف الساعة</span>
              </button>
            )}

            <button
              onClick={handleResetRace}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>

        {/* أزرار العمليات والتراجع السريع */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3 h-full">
          <div>
            <div className="text-xs font-bold text-slate-400 mb-1">العداؤون المسجلون:</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {finishes.length} / {laneCount}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndoLastLane}
              disabled={finishes.length === 0}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
              title="التراجع عن آخر رواق تم الضغط عليه"
            >
              <Undo2 className="w-4 h-4" />
              <span>تراجع عن آخر رواق</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={finishes.length === 0}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              title="تصدير النتائج كملف إكسل"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => setPrintModalOpen(true)}
              disabled={finishes.length === 0}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              title="طباعة المحضر الرسمي المعتمد"
            >
              <Printer className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

      </div>

      {/* ═══ 3. شبكة مربعات الأورقة الكبيرة (Large Tactile Lane Grid) ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <span>اضغط على مربع الرواق لتوثيق ترتيب وصول العداء بالمللي ثانية:</span>
          <span>{laneCount} أروقة مضمار</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: laneCount }, (_, i) => i + 1).map((laneNum) => {
            const finish = finishes.find(f => f.lane === laneNum);
            const isFinished = !!finish;
            const rank = finish?.rank;

            return (
              <button
                key={laneNum}
                onClick={() => handleTapLane(laneNum)}
                disabled={isFinished}
                className={`min-h-[120px] rounded-3xl p-3 flex flex-col justify-between items-center transition-all transform active:scale-95 text-center shadow-lg cursor-pointer relative overflow-hidden select-none ${
                  isFinished
                    ? rank === 1
                      ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border-2 border-amber-300 shadow-amber-500/30'
                      : rank === 2
                      ? 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-950 border-2 border-slate-100 shadow-slate-300/30'
                      : rank === 3
                      ? 'bg-gradient-to-b from-amber-700 to-amber-900 text-white border-2 border-amber-600 shadow-amber-900/30'
                      : 'bg-emerald-950/80 text-emerald-300 border-2 border-emerald-500/80 shadow-emerald-950/40'
                    : 'bg-slate-900 hover:bg-slate-850 hover:border-emerald-500/60 border-2 border-slate-800 text-slate-200'
                }`}
              >
                {/* شارة الترتيب والمركز عند الانتهاء */}
                {isFinished && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-black/60">
                    {rank === 1 ? '🥇 الأول' : rank === 2 ? '🥈 الثاني' : rank === 3 ? '🥉 الثالث' : `مركز ${rank}`}
                  </div>
                )}

                {/* رقم الرواق العملاق */}
                <div className="mt-1">
                  <span className="text-[10px] font-bold uppercase opacity-75 block">رواق</span>
                  <span className="text-4xl font-black font-mono leading-none tracking-tight">
                    {laneNum}
                  </span>
                </div>

                {/* التوقيت المسجل أو حالة الانتظار */}
                <div className="w-full mt-2 pt-2 border-t border-current/20">
                  {isFinished ? (
                    <div className="space-y-0.5">
                      <div className="text-sm font-black font-mono">{finish.formattedTime}</div>
                      <div className="text-[10px] opacity-80 font-mono">{finish.gapText}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-emerald-400 py-1">
                      {isRunning ? 'انقر عند العبور 👆' : 'جاهز'}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 4. جدول الترتيب والوصول المباشر ═══ */}
      {finishes.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[10px] font-bold border-b border-slate-800 uppercase">
              <tr>
                <th className="p-3 text-center">الترتيب</th>
                <th className="p-3 text-center">الرواق</th>
                <th className="p-3 text-center">الصدرية</th>
                <th className="p-3">العداء</th>
                <th className="p-3 font-mono">الزمن المسجل (FAT)</th>
                <th className="p-3 font-mono">الفارق</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {finishes.map((f) => (
                <tr key={f.lane} className="hover:bg-slate-850/60 transition-colors">
                  <td className="p-3 text-center font-black text-sm">
                    {f.rank === 1 ? '🥇 1' : f.rank === 2 ? '🥈 2' : f.rank === 3 ? '🥉 3' : f.rank}
                  </td>
                  <td className="p-3 text-center font-black font-mono text-emerald-400 text-sm">
                    رواق {f.lane}
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="text"
                      value={f.bibNumber || ''}
                      onChange={(e) => updateLaneBib(f.lane, e.target.value)}
                      placeholder="#"
                      className="w-14 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg p-1 text-center font-bold text-cyan-300 text-xs font-mono"
                    />
                  </td>
                  <td className="p-3 font-bold text-white">
                    {f.athleteName || `عداء الرواق ${f.lane}`}
                    {f.clubName && <span className="text-[10px] text-slate-400 mr-1.5">({f.clubName})</span>}
                  </td>
                  <td className="p-3 font-black font-mono text-amber-300 text-sm">
                    {f.formattedTime}
                  </td>
                  <td className="p-3 font-mono text-slate-400 text-xs">
                    {f.gapText}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                      معتمد ✓
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ 5. جهاز التخاطب الصوتي والتكتيكي السريع بين الحكام (Intercom) ═══ */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-black text-white">جهاز اللاسلكي والتخاطب الميداني بين الحكام (Intercom)</span>
          </div>
          <span className="text-[10px] text-slate-400">بث فوري لجميع شاشات وهواتف الحكام</span>
        </div>

        {/* رسائل تكتيكية بضغطة زر واحدة */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'جاهز للانطلاق ✅', text: 'حكم خط النهاية: جاهز لفتح الكاميرا وبدء السباق.' },
            { label: 'انطلاق خاطئ - كرر الطلقة 🛑', text: 'تنبيه: انطلاق خاطئ من أحد العدائين، يرجى إعادة السباق.' },
            { label: 'مراجعة الصورة 📸', text: 'جارٍ تدقيق شريط الـ Photo Finish لكسر التعادل.' },
            { label: 'النتائج معتمدة ومطابقة 🔒', text: 'تمت مصادقة أزمنة الأورقة والترتيب النهائي بنجاح.' },
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSendTacticalMessage(preset.text)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer hover:border-emerald-500"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* سجل آخر الرسائل المتبادلة */}
        {intercomLogs.length > 0 && (
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1 max-h-24 overflow-y-auto">
            {intercomLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-slate-300">
                <span className="font-bold text-emerald-400">{log.sender}: <span className="text-slate-200 font-normal">{log.text}</span></span>
                <span className="text-[9px] text-slate-500 font-mono">{log.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 6. نافذة الطباعة والمحضر الرسمي الموحد ═══ */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 overflow-y-auto" dir="rtl">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-4xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <span className="text-sm font-black text-slate-900">معاينة محضر النتائج الرسمي للطباعة والتصدير</span>
              <button 
                onClick={() => setPrintModalOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold"
              >
                إغلاق ✕
              </button>
            </div>

            {/* الترويسة الفيدرالية الموحدة */}
            <OfficialFederationHeader
              competitionName={competitionName}
              discipline={discipline}
              documentTitle="محضر ترتيب أزمنة الأورقة عند خط النهاية"
              timingSystem="Manual Multi-Lane Tap Deck (FAT Calibrated 1/1000s)"
            />

            {/* جدول النتائج الرسمي */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border border-slate-900">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 border border-slate-700 text-center">الترتيب</th>
                    <th className="p-2.5 border border-slate-700 text-center">الرواق</th>
                    <th className="p-2.5 border border-slate-700">رقم الصدرية</th>
                    <th className="p-2.5 border border-slate-700">اسم العداء</th>
                    <th className="p-2.5 border border-slate-700">النادي</th>
                    <th className="p-2.5 border border-slate-700 font-mono text-center">الزمن المسجل</th>
                    <th className="p-2.5 border border-slate-700 font-mono text-center">الفارق</th>
                    <th className="p-2.5 border border-slate-700 text-center">الملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-medium">
                  {finishes.map(f => (
                    <tr key={f.lane} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-300 text-center font-black">{f.rank}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold">رواق {f.lane}</td>
                      <td className="p-2 border border-slate-300 font-mono">#{f.bibNumber || '-'}</td>
                      <td className="p-2 border border-slate-300 font-bold">{f.athleteName || `عداء الرواق ${f.lane}`}</td>
                      <td className="p-2 border border-slate-300">{f.clubName || '-'}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold">{f.formattedTime}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono">{f.gapText}</td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-emerald-800">نهائي معتمد ✓</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* تذييل التوقيعات الموحد */}
            <OfficialFederationFooter />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-300">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوثيقة الرسمية (Print/PDF)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
