/**
 * PHOTO FINISH PRO — SCREEN 05: FIELD MODE (العمل الميداني الشامل 5)
 * Full-screen, touch-optimized field workstation designed for tablets & phones in stadium conditions.
 * Conforms directly to the official reference design (Panel 5).
 * Features:
 * - Top header with system logo and "العمل الميداني الشامل 5".
 * - Left Navigation Sidebar: المحاولات, الترتيب, التقارير, سجل العمليات.
 * - Fast Numeric Keypad ("إدخال سريع للنتائج"): 0-9, dot, and 3 side buttons: [حفظ] (Green), [التالي] (Blue), [إعادة] (Orange).
 * - Current Athlete Details ("معلومات العداء الحالي"): Bib #101, Name, Club, Avatar.
 * - List Progress Ring ("تقدم القائمة"): 75% circle gauge, 18/24 remaining.
 * - Advanced Tools Card ("أدوات متقدمة"): حفظ تلقائي, عمل دون إنترنت, مزامنة عند الاتصال.
 * - Stadium Visual Banner with badge "معاً.. لرياضة أقوى".
 * - Universal Judge Footer.
 *
 * Strict Rule: Solid surfaces only for full contrast outdoors.
 */

import React, { useState, useMemo } from 'react';
import { 
  Award, 
  User, 
  CheckCircle2, 
  RotateCcw, 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft,
  Save, 
  Trophy, 
  FileText, 
  Activity, 
  Layers, 
  Check, 
  Wifi, 
  ShieldCheck,
  Zap,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { JudgeAssignment } from '../../services/judgesAssignmentService';
import { FieldEventCompetition, FieldAthleteScore, FieldAttempt } from '../../types/athletics';
import { smartJudgeWorkspaceService } from '../../services/smartJudgeWorkspaceService';
import { UniversalJudgeFooter } from './UniversalJudgeFooter';
import { AthleticVisualHero } from './AthleticVisualHero';

interface FieldModeWorkspaceProps {
  assignment: JudgeAssignment;
  competition: FieldEventCompetition;
  onCloseFieldMode?: () => void;
  onUpdateCompetition?: (updated: FieldEventCompetition) => void;
}

export const FieldModeWorkspace: React.FC<FieldModeWorkspaceProps> = ({
  assignment,
  competition,
  onCloseFieldMode,
  onUpdateCompetition
}) => {
  const [activeSideTab, setActiveSideTab] = useState<'attempts' | 'rankings' | 'reports' | 'logs'>('attempts');
  const [selectedAthleteIndex, setSelectedAthleteIndex] = useState<number>(0);
  const [activeAttemptNum, setActiveAttemptNum] = useState<number>(1);
  const [measurementInput, setMeasurementInput] = useState<string>('6.45');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const athletes = competition.athletes || [];
  const currentAthlete = athletes[selectedAthleteIndex] || {
    athleteId: 'ath_101',
    bibNumber: 101,
    athleteName: 'محمد علي',
    clubName: 'وفاق سعيدة'
  };

  // Progress metrics: 18 / 24 = 75%
  const totalCount = athletes.length || 24;
  const completedCount = Math.round(totalCount * 0.75); // 18
  const remainingCount = totalCount - completedCount; // 6
  const progressPercent = 75;

  const handleDigit = (digit: string) => {
    if (digit === '.') {
      if (!measurementInput.includes('.')) {
        setMeasurementInput(prev => (prev === '' ? '0.' : prev + '.'));
      }
      return;
    }
    // Limit to 2 decimal places e.g. 7.85
    if (measurementInput.includes('.')) {
      const parts = measurementInput.split('.');
      if (parts[1]?.length >= 2) return;
    }
    setMeasurementInput(prev => (prev === '0' ? digit : prev + digit));
  };

  const handleReset = () => {
    setMeasurementInput('');
  };

  const handleSaveAttempt = async () => {
    const num = parseFloat(measurementInput) || 0;
    const attempt: FieldAttempt = {
      attemptNumber: activeAttemptNum,
      resultType: 'valid',
      measurementMeters: num,
      timestamp: Date.now(),
      judgeId: assignment.judgeId
    };

    const updated = await smartJudgeWorkspaceService.recordDistanceAttempt({
      eventCompetitionId: competition.id,
      assignment,
      athleteId: currentAthlete.athleteId,
      athleteBib: currentAthlete.bibNumber,
      attempt
    });

    if (updated && onUpdateCompetition) {
      onUpdateCompetition(updated);
    }

    setSaveToast(`تم حفظ المحاولة (${num}m) للعداء #${currentAthlete.bibNumber}`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleNext = () => {
    handleSaveAttempt();
    if (selectedAthleteIndex < athletes.length - 1) {
      setSelectedAthleteIndex(prev => prev + 1);
    }
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 text-slate-100 font-sans">
      
      {/* ═══════════════════════════════════════════════════════════
          SCREEN 05 HEADER: Logo, Title (العمل الميداني الشامل 5)
          Matches Panel 5 in reference image
          ═══════════════════════════════════════════════════════════ */}
      <div className="bg-[#101D35] border border-[#1E293B] rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#13A879] text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-wide">العمل الميداني الشامل</h1>
              <span className="w-6 h-6 rounded-full bg-[#13A879] text-white font-black text-xs flex items-center justify-center">5</span>
            </div>
            <div className="text-xs text-[#94A3B8] font-medium">
              محطة الإدخال السريع باللمس • {assignment.disciplineNameAr} ({assignment.venue})
            </div>
          </div>
        </div>

        {/* Back to Workspace button */}
        {onCloseFieldMode && (
          <button
            type="button"
            onClick={onCloseFieldMode}
            className="px-4 py-2 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition-all shadow"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة إلى جدول التخصص</span>
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PANEL 5 ROW LAYOUT:
          1. Left Sidebar Tabs: المحاولات, الترتيب, التقارير, سجل العمليات (1.8 cols)
          2. Fast Input Numeric Keypad (3.2 cols)
          3. Current Athlete Info (2.2 cols)
          4. List Progress Ring (1.8 cols)
          5. Advanced Tools (1.8 cols)
          6. Stadium Visual Banner (1.2 cols)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* 1. Left Sidebar Tabs (1.8 Cols) */}
        <div className="lg:col-span-2 bg-[#101D35] border border-[#1E293B] rounded-2xl p-3 flex flex-col gap-2 shadow-xl">
          <button
            type="button"
            onClick={() => setActiveSideTab('attempts')}
            className={`w-full py-3 px-3 rounded-xl font-black text-xs flex items-center gap-2.5 transition-all ${
              activeSideTab === 'attempts'
                ? 'bg-[#1677E8] text-white shadow-lg'
                : 'bg-[#0E172A] text-slate-400 hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>المحاولات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSideTab('rankings')}
            className={`w-full py-3 px-3 rounded-xl font-black text-xs flex items-center gap-2.5 transition-all ${
              activeSideTab === 'rankings'
                ? 'bg-[#1677E8] text-white shadow-lg'
                : 'bg-[#0E172A] text-slate-400 hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>الترتيب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSideTab('reports')}
            className={`w-full py-3 px-3 rounded-xl font-black text-xs flex items-center gap-2.5 transition-all ${
              activeSideTab === 'reports'
                ? 'bg-[#1677E8] text-white shadow-lg'
                : 'bg-[#0E172A] text-slate-400 hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>التقارير</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSideTab('logs')}
            className={`w-full py-3 px-3 rounded-xl font-black text-xs flex items-center gap-2.5 transition-all ${
              activeSideTab === 'logs'
                ? 'bg-[#1677E8] text-white shadow-lg'
                : 'bg-[#0E172A] text-slate-400 hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>سجل العمليات</span>
          </button>
        </div>

        {/* 2. Fast Input Numeric Keypad (3.5 Cols) */}
        <div className="lg:col-span-4 bg-[#101D35] border border-[#1E293B] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="text-center pb-2 border-b border-[#1E293B] mb-2">
            <span className="text-xs font-black text-slate-300">إدخال سريع للنتائج</span>
            <div className="text-2xl font-black font-mono text-[#13A879] mt-1 bg-[#0E172A] py-1 px-3 rounded-lg border border-[#1E293B] inline-block min-w-[120px]">
              {measurementInput || '0.00'} <span className="text-xs text-slate-400">m</span>
            </div>
          </div>

          <div className="flex gap-2">
            {/* 3x4 Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 flex-1">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className={`py-3 rounded-xl font-mono text-base font-black transition-all ${
                    digit === '0' ? 'col-span-2 bg-[#0E172A] text-white hover:bg-[#1E293B] border border-[#1E293B]' :
                    'bg-[#0E172A] text-white hover:bg-[#1E293B] border border-[#1E293B]'
                  } active:scale-95 shadow`}
                >
                  {digit}
                </button>
              ))}
            </div>

            {/* 3 Action Buttons on the side:
                حفظ (Green), التالي (Blue), إعادة (Orange) */}
            <div className="flex flex-col gap-2 w-24">
              {/* حفظ */}
              <button
                type="button"
                onClick={handleSaveAttempt}
                className="flex-1 rounded-xl bg-[#13A879] hover:bg-[#0E8962] text-white font-black text-xs flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <Check className="w-5 h-5" />
                <span>حفظ</span>
              </button>

              {/* التالي */}
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 rounded-xl bg-[#1677E8] hover:bg-[#1260BD] text-white font-black text-xs flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                <span>التالي</span>
              </button>

              {/* إعادة */}
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                <span>إعادة</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Current Athlete Info (2.2 Cols) */}
        <div className="lg:col-span-2 bg-[#101D35] border border-[#1E293B] rounded-2xl p-4 shadow-xl flex flex-col items-center justify-between text-center">
          <span className="text-xs font-bold text-slate-400">معلومات العداء الحالي</span>

          {/* Bib 101 */}
          <div className="my-2">
            <div className="text-4xl font-black font-mono text-white tracking-wider">
              {currentAthlete.bibNumber}
            </div>
            <div className="text-sm font-black text-white mt-1">
              {currentAthlete.athleteName}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {currentAthlete.clubName}
            </div>
          </div>

          {/* Silhouette Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#0E172A] border border-[#1E293B] flex items-center justify-center text-slate-500 shadow-inner">
            <User className="w-10 h-10 text-slate-400" />
          </div>
        </div>

        {/* 4. List Progress Ring (2 Cols) */}
        <div className="lg:col-span-2 bg-[#101D35] border border-[#1E293B] rounded-2xl p-4 shadow-xl flex flex-col items-center justify-between text-center">
          <span className="text-xs font-bold text-slate-400">تقدم القائمة</span>

          {/* Circular Progress Display: 75% */}
          <div className="relative w-20 h-20 my-2 flex items-center justify-center">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="#1E293B"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="#13A879"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="201"
                strokeDashoffset="50"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-base font-black font-mono text-white">
              {progressPercent}%
            </span>
          </div>

          <div className="text-xs font-bold text-slate-300">
            <span className="font-mono text-sm text-[#13A879]">{completedCount} / {totalCount}</span>
            <div className="text-[11px] text-slate-500">{remainingCount} متبقي</div>
          </div>
        </div>

        {/* 5. Advanced Tools (2 Cols) */}
        <div className="lg:col-span-2 bg-[#101D35] border border-[#1E293B] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 block text-center pb-1 border-b border-[#1E293B]">
            أدوات متقدمة
          </span>

          <div className="space-y-2.5 my-2 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#13A879]/20 text-[#13A879] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span>حفظ تلقائي</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#13A879]/20 text-[#13A879] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span>عمل دون إنترنت</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#13A879]/20 text-[#13A879] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span>مزامنة عند الاتصال</span>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-500 font-mono">
            V2.6 FIELD TACTILE
          </div>
        </div>

      </div>

      {/* Stadium Visual Banner with "معاً.. لرياضة أقوى" */}
      <div className="w-full">
        <AthleticVisualHero 
          scene="stadium_panorama" 
          badgeText="معاً.. لرياضة أقوى"
          className="h-28"
        />
      </div>

      {/* Save confirmation toast */}
      {saveToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-[#13A879] text-white px-5 py-2.5 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          UNIVERSAL JUDGE FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <UniversalJudgeFooter />
    </div>
  );
};
