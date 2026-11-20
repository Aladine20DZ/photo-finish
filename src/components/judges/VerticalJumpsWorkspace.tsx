/**
 * PHOTO FINISH PRO — SCREEN 03: HIGH JUMP & POLE VAULT (الوثب العالي والقفز بالزانة 3)
 * Dedicated workspace for Vertical Jumps according to World Athletics Rule 26.
 * Conforms directly to the official reference design (Panel 3).
 * Features:
 * - Top header with system logo and "الوثب العالي والقفز بالزانة 3".
 * - Left Current Height Controller:
 *   - "الارتفاع الحالي", Up Arrow, "1.95 m", Down Arrow.
 *   - "عدد الإخفاقات" with red badge indicator.
 *   - 4 Large Tactile Buttons: "نجاح O", "إخفاق X", "تخطي —", "خروج".
 * - RTL Athletes Table: # | العداء | المحاولات | الحالة | الترتيب.
 * - Right athletic visual hero: jumper clearing crossbar.
 * - Dynamic height progression, 3 consecutive failures elimination, Rule 26 tie-breaker.
 * - Universal Judge Footer.
 *
 * Strict Rule: Solid surfaces only for full contrast outdoors.
 */

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Check, 
  X as XIcon, 
  Minus, 
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  RotateCcw,
  Maximize2,
  ChevronRight,
  Award,
  Users
} from 'lucide-react';
import { 
  FieldEventCompetition, 
  FieldAthleteScore, 
  VerticalHeightTrial 
} from '../../types/athletics';
import { smartJudgeWorkspaceService } from '../../services/smartJudgeWorkspaceService';
import { JudgeAssignment } from '../../services/judgesAssignmentService';
import { UniversalJudgeFooter } from './UniversalJudgeFooter';
import { AthleticVisualHero } from './AthleticVisualHero';

interface VerticalJumpsWorkspaceProps {
  competition: FieldEventCompetition;
  assignment: JudgeAssignment;
  readOnly?: boolean;
  onUpdateCompetition?: (updated: FieldEventCompetition) => void;
  onOpenFieldMode?: () => void;
  onBackToDashboard?: () => void;
}

export const VerticalJumpsWorkspace: React.FC<VerticalJumpsWorkspaceProps> = ({
  competition,
  assignment,
  readOnly = false,
  onUpdateCompetition,
  onOpenFieldMode,
  onBackToDashboard
}) => {
  // Collect all distinct heights across all athletes or default sequence
  const initialHeights = useMemo(() => {
    const set = new Set<number>();
    competition.athletes.forEach(ath => {
      ath.verticalTrials?.forEach(t => set.add(t.heightMeters));
    });
    if (set.size === 0) {
      [1.75, 1.80, 1.85, 1.90, 1.95, 2.00].forEach(h => set.add(h));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [competition]);

  const [heights, setHeights] = useState<number[]>(initialHeights);
  const [currentHeight, setCurrentHeight] = useState<number>(() => {
    return heights.includes(1.95) ? 1.95 : (heights[heights.length - 1] || 1.90);
  });
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(() => {
    return competition.athletes[0]?.athleteId || 'ath_01';
  });
  const [showAddHeightModal, setShowAddHeightModal] = useState<boolean>(false);
  const [newHeightInput, setNewHeightInput] = useState<string>('');

  const canEdit = !readOnly && (assignment.permissions?.canRecord ?? true);
  const athletes = competition.athletes || [];
  const selectedAthlete = athletes.find(a => a.athleteId === selectedAthleteId) || athletes[0];

  // Helper to calculate consecutive failures for an athlete
  const checkEliminationStatus = (athlete: FieldAthleteScore): { isEliminated: boolean; consecutiveFailures: number } => {
    const trials = athlete.verticalTrials || [];
    let consecutiveFailures = 0;

    for (const h of heights) {
      const trial = trials.find(t => t.heightMeters === h);
      if (!trial) continue;

      for (const res of trial.trials) {
        if (res === 'X') {
          consecutiveFailures++;
          if (consecutiveFailures >= 3) {
            return { isEliminated: true, consecutiveFailures };
          }
        } else if (res === 'O') {
          consecutiveFailures = 0;
        }
      }
    }

    return { isEliminated: consecutiveFailures >= 3, consecutiveFailures };
  };

  // Failures counter for the currently selected athlete
  const selectedAthleteFailures = useMemo(() => {
    if (!selectedAthlete) return 0;
    return checkEliminationStatus(selectedAthlete).consecutiveFailures;
  }, [selectedAthlete, heights]);

  const handleRecordTrial = async (
    athlete: FieldAthleteScore, 
    trialResult: 'O' | 'X' | '—'
  ) => {
    if (!canEdit) return;
    if (competition.status === 'official') {
      alert('المسابقة معتمدة ومقفلة رسمياً من طرف رئيس الحكام.');
      return;
    }

    const { isEliminated } = checkEliminationStatus(athlete);
    if (isEliminated) {
      alert(`المتنافس (${athlete.athleteName}) أقصي رسمياً بسبب 3 إخفاقات متتالية.`);
      return;
    }

    const updated = await smartJudgeWorkspaceService.recordVerticalTrial({
      eventCompetitionId: competition.id,
      assignment,
      athleteId: athlete.athleteId,
      athleteBib: athlete.bibNumber,
      heightMeters: currentHeight,
      trialResult
    });

    if (updated && onUpdateCompetition) {
      onUpdateCompetition(updated);
    }
  };

  const handleIncreaseHeight = () => {
    const currentIndex = heights.indexOf(currentHeight);
    if (currentIndex >= 0 && currentIndex < heights.length - 1) {
      setCurrentHeight(heights[currentIndex + 1]);
    } else {
      const nextH = Math.round((currentHeight + 0.05) * 100) / 100;
      setHeights(prev => [...prev, nextH].sort((a, b) => a - b));
      setCurrentHeight(nextH);
    }
  };

  const handleDecreaseHeight = () => {
    const currentIndex = heights.indexOf(currentHeight);
    if (currentIndex > 0) {
      setCurrentHeight(heights[currentIndex - 1]);
    }
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 text-slate-100 font-sans">
      
      {/* ═══════════════════════════════════════════════════════════
          SCREEN 03 HEADER: Logo, Title (الوثب العالي والقفز بالزانة 3), Breadcrumb
          Matches Panel 3 in reference image
          ═══════════════════════════════════════════════════════════ */}
      <div className="bg-[#101D35] border border-[#1E293B] rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1677E8] text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-wide">الوثب العالي والقفز بالزانة</h1>
              <span className="w-6 h-6 rounded-full bg-[#1677E8] text-white font-black text-xs flex items-center justify-center">3</span>
            </div>
            <div className="text-xs text-[#94A3B8] font-medium">
              مسابقة الوثب العمودي • {assignment.venue || 'ملعب 2'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenFieldMode && (
            <button
              type="button"
              onClick={onOpenFieldMode}
              className="px-3.5 py-2 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-black text-[#13A879] flex items-center gap-1.5 transition-all shadow"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>وضع الميدان الشامل (5)</span>
            </button>
          )}

          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
              <span>لوحة التحكم (1)</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN WORKSPACE LAYOUT:
          Left: Current Height & Attempt Controls (3.8 Cols)
          Center: Athletes Table (5.2 Cols)
          Right: Athletic Visual Hero (3 Cols)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Current Height & 4 Large Action Buttons (3.8 Cols) */}
        <div className="lg:col-span-4 bg-[#101D35] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-5">
          <div className="text-center pb-2 border-b border-[#1E293B]">
            <h3 className="text-xs font-bold text-slate-400">لوحة التحكم في العارضة والارتفاع</h3>
          </div>

          {/* Current Height Widget matching reference image (Panel 3 left side) */}
          <div className="bg-[#0E172A] border border-[#1E293B] rounded-2xl p-5 text-center space-y-3 shadow-inner">
            <span className="text-xs font-black text-slate-300">الارتفاع الحالي</span>

            {/* Up Arrow */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleIncreaseHeight}
                disabled={!canEdit}
                className="w-10 h-10 rounded-xl bg-[#1677E8]/20 hover:bg-[#1677E8] text-[#60A5FA] hover:text-white flex items-center justify-center transition-all shadow"
                title="زيادة الارتفاع (+5cm)"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>

            {/* Huge bold height display e.g. 1.95 m */}
            <div className="text-5xl font-black font-mono text-white tracking-wider">
              {currentHeight.toFixed(2)} <span className="text-2xl text-slate-400">m</span>
            </div>

            {/* Down Arrow */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleDecreaseHeight}
                disabled={!canEdit || currentHeight <= heights[0]}
                className="w-10 h-10 rounded-xl bg-[#1677E8]/20 hover:bg-[#1677E8] text-[#60A5FA] hover:text-white disabled:opacity-40 flex items-center justify-center transition-all shadow"
                title="تقليل الارتفاع (-5cm)"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>

            {/* عدد الإخفاقات with Red Badge */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#1E293B] text-xs font-bold text-slate-300">
              <span>عدد الإخفاقات المتتالية:</span>
              <span className={`w-6 h-6 rounded-full text-white font-black font-mono text-xs flex items-center justify-center ${
                selectedAthleteFailures >= 3 ? 'bg-[#EF4444] animate-pulse' :
                selectedAthleteFailures > 0 ? 'bg-[#EF4444]' : 'bg-slate-700'
              }`}>
                {selectedAthleteFailures}
              </span>
            </div>
          </div>

          {/* 4 Large Tactile Buttons matching reference image:
              نجاح O (Blue), إخفاق X (Red), تخطي — (Amber), خروج (Slate) */}
          <div className="grid grid-cols-2 gap-3">
            {/* نجاح O */}
            <button
              type="button"
              disabled={!canEdit || !selectedAthlete}
              onClick={() => selectedAthlete && handleRecordTrial(selectedAthlete, 'O')}
              className="py-4 px-3 rounded-2xl bg-[#1677E8] hover:bg-[#1260BD] disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Check className="w-5 h-5" />
              <span>نجاح O</span>
            </button>

            {/* إخفاق X */}
            <button
              type="button"
              disabled={!canEdit || !selectedAthlete}
              onClick={() => selectedAthlete && handleRecordTrial(selectedAthlete, 'X')}
              className="py-4 px-3 rounded-2xl bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <XIcon className="w-5 h-5" />
              <span>إخفاق X</span>
            </button>

            {/* تخطي — */}
            <button
              type="button"
              disabled={!canEdit || !selectedAthlete}
              onClick={() => selectedAthlete && handleRecordTrial(selectedAthlete, '—')}
              className="py-4 px-3 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Minus className="w-5 h-5 stroke-[3]" />
              <span>تخطي —</span>
            </button>

            {/* خروج */}
            <button
              type="button"
              onClick={() => onBackToDashboard && onBackToDashboard()}
              className="py-4 px-3 rounded-2xl bg-[#0E172A] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>

          {/* Active Height Selector Pills */}
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5">تدرج الارتفاعات (m):</span>
            <div className="flex flex-wrap gap-1.5">
              {heights.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setCurrentHeight(h)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    currentHeight === h
                      ? 'bg-[#1677E8] text-white shadow'
                      : 'bg-[#0E172A] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  {h.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Athletes Table (5.2 Cols) */}
        <div className="lg:col-span-5 bg-[#101D35] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3.5 border-b border-[#1E293B] bg-[#0E172A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1677E8]" />
              <h3 className="text-xs font-black text-white">قائمة المتسابقين والترتيب المباشر</h3>
            </div>
            <span className="text-[11px] font-mono text-[#60A5FA]">
              {athletes.filter(a => !checkEliminationStatus(a).isEliminated).length} في المنافسة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0A101D] text-slate-400 font-bold border-b border-[#1E293B]">
                <tr>
                  <th className="py-2.5 px-3 text-center">الترتيب</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3">المحاولات</th>
                  <th className="py-2.5 px-3">العداء</th>
                  <th className="py-2.5 px-3 text-center">#</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {athletes.map((ath, idx) => {
                  const isSelected = ath.athleteId === selectedAthleteId;
                  const { isEliminated } = checkEliminationStatus(ath);
                  const trialAtCurrentHeight = ath.verticalTrials?.find(t => t.heightMeters === currentHeight);
                  const lastResult = trialAtCurrentHeight?.trials[trialAtCurrentHeight.trials.length - 1];

                  return (
                    <tr
                      key={ath.athleteId}
                      onClick={() => setSelectedAthleteId(ath.athleteId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[#1677E8]/20 border-r-4 border-r-[#1677E8]' 
                          : 'hover:bg-[#1E293B]/60'
                      }`}
                    >
                      {/* الترتيب */}
                      <td className="py-3 px-3 font-mono font-black text-center">
                        <span className={`inline-block w-6 h-6 rounded-full text-center leading-6 text-xs ${
                          ath.rank === 1 ? 'bg-[#F59E0B] text-black font-black' :
                          ath.rank === 2 ? 'bg-slate-300 text-black font-black' :
                          ath.rank === 3 ? 'bg-amber-700 text-white font-black' :
                          'text-slate-400'
                        }`}>
                          {ath.rank || idx + 1}
                        </span>
                      </td>

                      {/* الحالة (O / X / —) */}
                      <td className="py-3 px-3 text-center">
                        {isEliminated ? (
                          <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] text-[10px] font-black border border-[#EF4444]/40">
                            أقصي
                          </span>
                        ) : lastResult === 'O' ? (
                          <span className="w-6 h-6 rounded-full bg-[#1677E8]/20 text-[#60A5FA] font-black inline-flex items-center justify-center border border-[#1677E8]/40">
                            O
                          </span>
                        ) : lastResult === 'X' ? (
                          <span className="w-6 h-6 rounded-full bg-[#EF4444]/20 text-[#EF4444] font-black inline-flex items-center justify-center border border-[#EF4444]/40">
                            X
                          </span>
                        ) : lastResult === '—' ? (
                          <span className="text-slate-500 font-bold">—</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* المحاولات (الارتفاع الحالي) */}
                      <td className="py-3 px-3 font-mono text-white font-bold">
                        {currentHeight.toFixed(2)}
                      </td>

                      {/* العداء والنادي */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white whitespace-nowrap">{ath.athleteName}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{ath.clubName}</div>
                      </td>

                      {/* رقم الصدرية # */}
                      <td className="py-3 px-3 font-mono text-[#60A5FA] font-bold text-center">
                        {ath.bibNumber}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Athletic Visual Hero (3 Cols) */}
        <div className="lg:col-span-3 h-full">
          <AthleticVisualHero 
            scene="high_jump" 
            title="الوثب العالي"
            badgeText="القاعدة 26 للاتحاد الدولي"
            className="h-full min-h-[360px]"
          />
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          UNIVERSAL JUDGE FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <UniversalJudgeFooter />
    </div>
  );
};
