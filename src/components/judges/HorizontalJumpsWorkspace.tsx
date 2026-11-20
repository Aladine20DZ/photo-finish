/**
 * PHOTO FINISH PRO — SCREEN 02: LONG JUMP & TRIPLE JUMP (الوثب الطويل والثلاثي 2)
 * Specialized field workstation for Horizontal Jumps & Field Events.
 * Conforms directly to the official reference design (Panel 2).
 * World Athletics Rule 25 Compliant.
 * Features:
 * - Top header with system logo and "الوثب الطويل والثلاثي 2".
 * - Subheader: "المسابقة: البطولة الولائية | المكان: الحفرة 1".
 * - RTL Athletes Table: الترتيب | أفضل أداء | المحاولات | النادي | العداء.
 * - Dedicated Attempt Entry Panel: "المحاولة الحالية" (6.45 m, صحيحة, حفظ, DNS, X فاشلة).
 * - Bottom athlete navigator: "< العداء السابق", "1 / 24", "العداء التالي >".
 * - Right athletic visual hero: jumper over sand pit.
 * - Live Rule 25 Countback tie-breaker.
 * - Wind speed (m/s) recording.
 * - Universal Judge Footer.
 *
 * Strict Rule: Solid surfaces only for full contrast outdoors.
 */

import React, { useState } from 'react';
import { 
  Wind, 
  User, 
  CheckCircle2, 
  ChevronLeft,
  ChevronRight,
  Save,
  X as XIcon,
  UserX,
  Maximize2,
  Award
} from 'lucide-react';
import { 
  FieldEventCompetition, 
  FieldAttempt,
  FieldAttemptResult 
} from '../../types/athletics';
import { smartJudgeWorkspaceService } from '../../services/smartJudgeWorkspaceService';
import { JudgeAssignment } from '../../services/judgesAssignmentService';
import { UniversalJudgeFooter } from './UniversalJudgeFooter';
import { AthleticVisualHero } from './AthleticVisualHero';

interface HorizontalJumpsWorkspaceProps {
  competition: FieldEventCompetition;
  assignment: JudgeAssignment;
  readOnly?: boolean;
  onUpdateCompetition?: (updated: FieldEventCompetition) => void;
  onOpenFieldMode?: () => void;
  onBackToDashboard?: () => void;
}

export const HorizontalJumpsWorkspace: React.FC<HorizontalJumpsWorkspaceProps> = ({
  competition,
  assignment,
  readOnly = false,
  onUpdateCompetition,
  onOpenFieldMode,
  onBackToDashboard
}) => {
  const [selectedAthleteIndex, setSelectedAthleteIndex] = useState<number>(0);
  const [activeAttemptNumber, setActiveAttemptNumber] = useState<number>(1);
  const [currentMeasurementInput, setCurrentMeasurementInput] = useState<string>('6.45');
  const [currentResultType, setCurrentResultType] = useState<FieldAttemptResult>('valid');
  const [currentWindInput, setCurrentWindInput] = useState<string>('1.4');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const canEdit = !readOnly && (assignment.permissions?.canRecord ?? true);
  const athletes = competition.athletes || [];
  const currentAthlete = athletes[selectedAthleteIndex] || athletes[0];

  // Dynamic maximum attempts based on competition setup (defaults to 6)
  const maxAttempts = competition.totalAttemptsAllowed || 6;

  const handleSelectAthlete = (index: number) => {
    if (index < 0 || index >= athletes.length) return;
    setSelectedAthleteIndex(index);
    const ath = athletes[index];
    const att = ath?.attempts?.find(a => a.attemptNumber === activeAttemptNumber);
    if (att) {
      setCurrentMeasurementInput(att.measurementMeters ? att.measurementMeters.toFixed(2) : '');
      setCurrentResultType(att.resultType);
      setCurrentWindInput(att.wind !== undefined ? att.wind.toString() : '1.4');
    }
  };

  const handleSaveCurrentAttempt = async (forcedResultType?: FieldAttemptResult) => {
    if (!canEdit || !currentAthlete) return;
    if (competition.status === 'official') {
      alert('المسابقة معتمدة ومقفلة رسمياً من طرف رئيس الحكام.');
      return;
    }

    const typeToSave = forcedResultType || currentResultType;
    const numericMeasurement = typeToSave === 'valid' ? parseFloat(currentMeasurementInput) || 0 : 0;
    const numericWind = parseFloat(currentWindInput) || 0;

    const attempt: FieldAttempt = {
      attemptNumber: activeAttemptNumber,
      resultType: typeToSave,
      measurementMeters: numericMeasurement,
      wind: numericWind,
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

    setSaveSuccessMessage('تم الحفظ بنجاح');
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  const handleNextAthlete = () => {
    if (selectedAthleteIndex < athletes.length - 1) {
      handleSelectAthlete(selectedAthleteIndex + 1);
    }
  };

  const handlePrevAthlete = () => {
    if (selectedAthleteIndex > 0) {
      handleSelectAthlete(selectedAthleteIndex - 1);
    }
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 text-slate-100 font-sans">
      
      {/* ═══════════════════════════════════════════════════════════
          SCREEN 02 HEADER: Logo, Title (الوثب الطويل والثلاثي 2), Breadcrumb
          Matches Panel 2 in reference image
          ═══════════════════════════════════════════════════════════ */}
      <div className="bg-[#101D35] border border-[#1E293B] rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1677E8] text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-wide">الوثب الطويل والثلاثي</h1>
              <span className="w-6 h-6 rounded-full bg-[#1677E8] text-white font-black text-xs flex items-center justify-center">2</span>
            </div>
            <div className="text-xs text-[#94A3B8] font-medium">
              مسابقة الوثب الميداني • {assignment.venue || 'المكان: الحفرة 1'}
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-3">
          {onOpenFieldMode && (
            <button
              type="button"
              onClick={onOpenFieldMode}
              className="px-3.5 py-2 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-black text-[#13A879] hover:text-[#13A879] flex items-center gap-1.5 transition-all shadow"
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

      {/* Breadcrumb Info Bar */}
      <div className="bg-[#0E172A] border border-[#1E293B] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-[#60A5FA]">المسابقة:</span>
          <span>{competition.name || 'البطولة الولائية لألعاب القوى'}</span>
          <span className="text-slate-600">|</span>
          <span className="text-[#60A5FA]">المكان:</span>
          <span>{assignment.venue || 'الحفرة 1'}</span>
          <span className="text-slate-600">|</span>
          <span className="text-[#60A5FA]">الحكم:</span>
          <span>{assignment.judgeName}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#13A879]/15 text-[#13A879] border border-[#13A879]/30 text-[11px]">
            {competition.status === 'official' ? 'معتمدة رسمياً' : 'مباشر قيد التحكيم'}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN WORKSPACE GRID:
          Left: Athletes Table (5.5 cols)
          Center: Attempt Entry Panel (3.5 cols)
          Right: Athletic Visual Hero (3 cols)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* RTL Athletes Table (5.5 Cols) */}
        <div className="lg:col-span-5 bg-[#101D35] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3.5 border-b border-[#1E293B] bg-[#0E172A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#1677E8]" />
              <h3 className="text-xs font-black text-white">قائمة المتنافسين والنتائج</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">المحاولة الحالية:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].slice(0, maxAttempts).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setActiveAttemptNumber(num)}
                    className={`w-6 h-6 rounded-md font-mono text-xs font-bold transition-all ${
                      activeAttemptNumber === num
                        ? 'bg-[#1677E8] text-white shadow'
                        : 'bg-[#101D35] text-slate-400 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0A101D] text-slate-400 font-bold border-b border-[#1E293B]">
                <tr>
                  <th className="py-2.5 px-3">الترتيب</th>
                  <th className="py-2.5 px-3">أفضل أداء</th>
                  <th className="py-2.5 px-3">المحاولات</th>
                  <th className="py-2.5 px-3">النادي</th>
                  <th className="py-2.5 px-3">العداء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {athletes.map((ath, idx) => {
                  const isSelected = idx === selectedAthleteIndex;
                  const currentAttemptObj = ath.attempts?.find(a => a.attemptNumber === activeAttemptNumber);
                  
                  return (
                    <tr
                      key={ath.athleteId}
                      onClick={() => handleSelectAthlete(idx)}
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

                      {/* أفضل أداء */}
                      <td className="py-3 px-3 font-mono font-black text-[#13A879]">
                        {ath.bestValidMeasurement ? `${ath.bestValidMeasurement.toFixed(2)} m` : '—'}
                      </td>

                      {/* المحاولات */}
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {currentAttemptObj ? (
                          currentAttemptObj.resultType === 'foul' ? (
                            <span className="text-[#EF4444] font-black">X</span>
                          ) : currentAttemptObj.resultType === 'pass' ? (
                            <span className="text-slate-500">—</span>
                          ) : currentAttemptObj.resultType === 'dns' ? (
                            <span className="text-slate-500">DNS</span>
                          ) : (
                            <span className="text-white font-bold">{currentAttemptObj.measurementMeters?.toFixed(2)}</span>
                          )
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* النادي */}
                      <td className="py-3 px-3 text-slate-300 truncate max-w-[120px]">
                        {ath.clubName}
                      </td>

                      {/* العداء */}
                      <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#60A5FA] font-mono font-normal">#{ath.bibNumber}</span>
                          <span>{ath.athleteName}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Center: Attempt Entry Panel (المحاولة الحالية - 4 Cols) */}
        <div className="lg:col-span-4 bg-[#101D35] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div>
              <span className="text-xs text-slate-400 font-bold">المحاولة الحالية</span>
              <h3 className="text-base font-black text-white">
                {currentAthlete ? currentAthlete.athleteName : 'اختر عداء'}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#1677E8]/15 border border-[#1677E8]/40 text-[#60A5FA] text-xs font-mono font-bold">
              المحاولة {activeAttemptNumber} / {maxAttempts}
            </span>
          </div>

          {/* Large Distance Display matching reference image (6.45 m with صحيحة pill) */}
          <div className="bg-[#0E172A] border border-[#1E293B] rounded-2xl p-5 text-center space-y-2 shadow-inner">
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                value={currentMeasurementInput}
                onChange={(e) => setCurrentMeasurementInput(e.target.value)}
                disabled={!canEdit}
                className="w-36 text-center text-4xl sm:text-5xl font-black font-mono text-[#13A879] bg-transparent outline-none focus:ring-2 focus:ring-[#13A879] rounded-xl"
              />
              <span className="text-2xl font-black text-slate-400 font-mono">m</span>
            </div>

            {/* Status Pill e.g. صحيحة */}
            <div className="flex items-center justify-center">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                currentResultType === 'valid' ? 'bg-[#13A879]/20 text-[#13A879] border border-[#13A879]/40' :
                currentResultType === 'foul' ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40' :
                'bg-slate-700 text-slate-300'
              }`}>
                {currentResultType === 'valid' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>صحيحة</span>
                  </>
                ) : currentResultType === 'foul' ? (
                  <>
                    <XIcon className="w-3.5 h-3.5" />
                    <span>محاولة فاشلة</span>
                  </>
                ) : (
                  <span>غائب (DNS)</span>
                )}
              </span>
            </div>

            {/* Wind input */}
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">
              <Wind className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>الرياح:</span>
              <input
                type="text"
                value={currentWindInput}
                onChange={(e) => setCurrentWindInput(e.target.value)}
                className="w-16 bg-[#101D35] border border-[#1E293B] rounded-md px-2 py-0.5 text-center font-mono text-white text-xs"
              />
              <span>m/s</span>
            </div>
          </div>

          {/* 3 Main Action Buttons matching reference image (حفظ, DNS غائب, X فاشلة) */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* حفظ Button (Green) */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => handleSaveCurrentAttempt('valid')}
              className="py-3 px-3 rounded-xl bg-[#13A879] hover:bg-[#0E8962] disabled:opacity-50 text-white font-black text-xs flex flex-col items-center justify-center gap-1 shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              <span>حفظ</span>
            </button>

            {/* DNS غائب Button */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                setCurrentResultType('dns');
                handleSaveCurrentAttempt('dns');
              }}
              className="py-3 px-3 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] border border-[#1E293B] disabled:opacity-50 text-slate-200 font-black text-xs flex flex-col items-center justify-center gap-1 shadow transition-all"
            >
              <UserX className="w-4 h-4 text-slate-400" />
              <span>DNS غائب</span>
            </button>

            {/* X فاشلة Button (Red/Dark) */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                setCurrentResultType('foul');
                handleSaveCurrentAttempt('foul');
              }}
              className="py-3 px-3 rounded-xl bg-[#1E1B2E] hover:bg-[#EF4444]/30 border border-[#EF4444]/40 disabled:opacity-50 text-[#EF4444] font-black text-xs flex flex-col items-center justify-center gap-1 shadow transition-all"
            >
              <XIcon className="w-4 h-4" />
              <span>X فاشلة</span>
            </button>
          </div>

          {/* Save notification */}
          {saveSuccessMessage && (
            <div className="p-2.5 rounded-xl bg-[#13A879]/20 border border-[#13A879]/40 text-[#13A879] text-center text-xs font-black animate-fade-in">
              {saveSuccessMessage}
            </div>
          )}

          {/* Bottom Athlete Navigator Bar: < العداء السابق | 1 / 24 | العداء التالي > */}
          <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevAthlete}
              disabled={selectedAthleteIndex === 0}
              className="px-3 py-2 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] disabled:opacity-40 text-xs font-bold text-slate-300 flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span>العداء السابق</span>
            </button>

            <span className="font-mono text-xs font-black text-slate-400 bg-[#0E172A] px-3 py-1 rounded-lg border border-[#1E293B]">
              {selectedAthleteIndex + 1} / {athletes.length}
            </span>

            <button
              type="button"
              onClick={handleNextAthlete}
              disabled={selectedAthleteIndex >= athletes.length - 1}
              className="px-3 py-2 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] disabled:opacity-40 text-xs font-bold text-slate-300 flex items-center gap-1"
            >
              <span>العداء التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Athletic Visual Hero (2.5 Cols) */}
        <div className="lg:col-span-3 h-full">
          <AthleticVisualHero 
            scene="long_jump" 
            title="الوثب الطويل"
            badgeText="القاعدة 25 للاتحاد الدولي"
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
