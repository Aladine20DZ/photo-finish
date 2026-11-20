/**
 * PHOTO FINISH PRO AI — Horizontal Jumps Field Workspace
 * Dedicated workspace for Long Jump (الوثب الطويل) and Triple Jump (الوثب الثلاثي).
 * World Athletics Rule 25 Compliant.
 * Features:
 * - 6 Attempts recording with live Rule 25 Countback tie-breaker.
 * - Wind gauge (m/s) recording per attempt.
 * - Foul (X), Pass (-), DNS, DNF states.
 * - RTL table with high-contrast stadium tokens.
 */

import React, { useState } from 'react';
import { 
  Trophy, 
  Wind, 
  User, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  FieldEventCompetition, 
  FieldAthleteScore, 
  FieldAttempt,
  FieldAttemptResult 
} from '../../types/athletics';
import { FieldScorePad } from './FieldScorePad';
import { smartJudgeWorkspaceService } from '../../services/smartJudgeWorkspaceService';
import { JudgeAssignment } from '../../services/judgesAssignmentService';

interface HorizontalJumpsWorkspaceProps {
  competition: FieldEventCompetition;
  assignment: JudgeAssignment;
  readOnly?: boolean;
  onUpdateCompetition?: (updated: FieldEventCompetition) => void;
}

export const HorizontalJumpsWorkspace: React.FC<HorizontalJumpsWorkspaceProps> = ({
  competition,
  assignment,
  readOnly = false,
  onUpdateCompetition
}) => {
  const [activeAttemptNumber, setActiveAttemptNumber] = useState<number>(1);
  const [editingAthlete, setEditingAthlete] = useState<FieldAthleteScore | null>(null);
  const [editingAttemptNumber, setEditingAttemptNumber] = useState<number>(1);
  const [isScorePadOpen, setIsScorePadOpen] = useState<boolean>(false);

  const canEdit = !readOnly && (assignment.permissions?.canRecord ?? true);

  const handleOpenPad = (athlete: FieldAthleteScore, attemptNum: number) => {
    if (!canEdit) return;
    if (competition.status === 'official') {
      alert('المسابقة معتمدة ومقفلة رسمياً. لا يمكن تعديل النتائج إلا بإعادة فتح المحضر من طرف الحكم العام.');
      return;
    }
    setEditingAthlete(athlete);
    setEditingAttemptNumber(attemptNum);
    setIsScorePadOpen(true);
  };

  const handleSaveAttempt = async (data: {
    resultType: FieldAttemptResult;
    measurement: number;
    wind?: number;
  }) => {
    if (!editingAthlete) return;

    const attempt: FieldAttempt = {
      attemptNumber: editingAttemptNumber,
      resultType: data.resultType,
      measurementMeters: data.measurement,
      wind: data.wind,
      timestamp: Date.now(),
      judgeId: assignment.judgeId
    };

    const updated = await smartJudgeWorkspaceService.recordDistanceAttempt({
      eventCompetitionId: competition.id,
      assignment,
      athleteId: editingAthlete.athleteId,
      athleteBib: editingAthlete.bibNumber,
      attempt
    });

    if (updated && onUpdateCompetition) {
      onUpdateCompetition(updated);
    }

    setIsScorePadOpen(false);
    setEditingAthlete(null);
  };

  const handleNextAthlete = () => {
    if (!editingAthlete) return;
    const currentIndex = competition.athletes.findIndex(a => a.athleteId === editingAthlete.athleteId);
    if (currentIndex >= 0 && currentIndex < competition.athletes.length - 1) {
      setEditingAthlete(competition.athletes[currentIndex + 1]);
    } else {
      setIsScorePadOpen(false);
      setEditingAthlete(null);
    }
  };

  // Find existing attempt if editing
  const existingAttempt = editingAthlete?.attempts.find(a => a.attemptNumber === editingAttemptNumber);

  return (
    <div dir="rtl" className="space-y-4">
      {/* Attempt Selector Pills (1 to 6) */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">المحاولة الحالية في الميدان:</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setActiveAttemptNumber(num)}
                className={`w-9 h-9 rounded-xl font-mono font-black text-sm transition-all border ${
                  activeAttemptNumber === num
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>نظام المحاولات الست وفق المادة 25 للاتحاد الدولي (World Athletics)</span>
        </div>
      </div>

      {/* Main Scoring Table (RTL First) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider">
                <th className="py-3 px-3 w-14 text-center">الترتيب</th>
                <th className="py-3 px-3 w-16 text-center">الصدرية</th>
                <th className="py-3 px-4 min-w-[140px]">اللقب والاسم</th>
                <th className="py-3 px-3 min-w-[110px]">النادي</th>
                <th className="py-3 px-2 text-center w-20">م 1</th>
                <th className="py-3 px-2 text-center w-20">م 2</th>
                <th className="py-3 px-2 text-center w-20">م 3</th>
                <th className="py-3 px-2 text-center w-20">م 4</th>
                <th className="py-3 px-2 text-center w-20">م 5</th>
                <th className="py-3 px-2 text-center w-20">م 6</th>
                <th className="py-3 px-3 text-center w-28 bg-amber-500/10 text-amber-300 border-r border-slate-800">أفضل إنجاز</th>
                <th className="py-3 px-2 text-center w-16">الرياح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {competition.athletes.map((ath, idx) => {
                const isLeader = ath.rank === 1 && ath.bestValidMeasurement > 0;
                const bestAttempt = ath.attempts.find(a => a.measurementMeters === ath.bestValidMeasurement && a.resultType === 'valid');

                return (
                  <tr 
                    key={ath.athleteId}
                    className={`transition-colors hover:bg-slate-800/50 ${
                      isLeader ? 'bg-amber-500/5' : idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-transparent'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs font-mono ${
                        ath.rank === 1 && ath.bestValidMeasurement > 0 ? 'bg-amber-500 text-slate-950 font-black' :
                        ath.rank === 2 && ath.bestValidMeasurement > 0 ? 'bg-slate-300 text-slate-950 font-black' :
                        ath.rank === 3 && ath.bestValidMeasurement > 0 ? 'bg-amber-800 text-white font-black' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {ath.bestValidMeasurement > 0 ? ath.rank : '—'}
                      </span>
                    </td>

                    {/* Bib */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-black text-amber-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded-md text-xs">
                        #{ath.bibNumber}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-bold text-slate-100 flex items-center gap-2">
                      <span>{ath.athleteName}</span>
                      {isLeader && <Trophy className="w-4 h-4 text-amber-400 shrink-0" />}
                    </td>

                    {/* Club */}
                    <td className="py-3 px-3 text-xs text-slate-400 font-medium">
                      {ath.clubName}
                    </td>

                    {/* Attempts 1 to 6 */}
                    {[1, 2, 3, 4, 5, 6].map((attemptNum) => {
                      const att = ath.attempts.find(a => a.attemptNumber === attemptNum);
                      const isBest = att && att.resultType === 'valid' && att.measurementMeters === ath.bestValidMeasurement && ath.bestValidMeasurement > 0;
                      const isCurrentRound = activeAttemptNumber === attemptNum;

                      return (
                        <td 
                          key={attemptNum}
                          onClick={() => handleOpenPad(ath, attemptNum)}
                          className={`py-2 px-1 text-center cursor-pointer transition-all ${
                            isCurrentRound ? 'bg-slate-800/40' : ''
                          }`}
                        >
                          <div className={`py-1.5 px-1 rounded-lg border font-mono text-xs font-black transition-all ${
                            !att ? 'border-dashed border-slate-700/60 text-slate-600 hover:border-amber-500/50 hover:text-slate-300' :
                            att.resultType === 'foul' ? 'bg-red-950/40 border-red-900/60 text-red-400' :
                            att.resultType === 'pass' ? 'bg-amber-950/30 border-amber-900/50 text-amber-400' :
                            att.resultType === 'dns' ? 'bg-slate-800 border-slate-700 text-slate-500' :
                            isBest ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-extrabold shadow-sm' :
                            'bg-slate-800/80 border-slate-700 text-slate-200'
                          }`}>
                            {!att ? '—' :
                             att.resultType === 'foul' ? 'X' :
                             att.resultType === 'pass' ? '—' :
                             att.resultType === 'dns' ? 'DNS' :
                             att.resultType === 'dnf' ? 'DNF' :
                             `${att.measurementMeters.toFixed(2)}`}
                            
                            {att?.resultType === 'valid' && att.wind !== undefined && (
                              <div className="text-[9px] text-slate-400 font-normal">
                                {att.wind > 0 ? `+${att.wind}` : att.wind}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Best Measurement */}
                    <td className="py-3 px-3 text-center bg-amber-500/5 border-r border-slate-800 font-mono font-black text-base text-amber-400">
                      {ath.bestValidMeasurement > 0 ? `${ath.bestValidMeasurement.toFixed(2)} م` : 'NM'}
                    </td>

                    {/* Wind for best measurement */}
                    <td className="py-3 px-2 text-center text-xs font-mono text-slate-400">
                      {bestAttempt?.wind !== undefined ? (
                        <span className={bestAttempt.wind > 2.0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                          {bestAttempt.wind > 0 ? `+${bestAttempt.wind}` : bestAttempt.wind}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Touch ScorePad Modal */}
      {editingAthlete && (
        <FieldScorePad
          isOpen={isScorePadOpen}
          athleteName={editingAthlete.athleteName}
          bibNumber={editingAthlete.bibNumber}
          clubName={editingAthlete.clubName}
          attemptNumber={editingAttemptNumber}
          totalAttempts={6}
          existingValue={existingAttempt?.measurementMeters || existingAttempt?.resultType}
          existingResultType={existingAttempt?.resultType || 'valid'}
          existingWind={existingAttempt?.wind ?? 0.0}
          showWindInput={true}
          unitLabel="متر"
          onSave={handleSaveAttempt}
          onClose={() => {
            setIsScorePadOpen(false);
            setEditingAthlete(null);
          }}
          onNextAthlete={handleNextAthlete}
        />
      )}
    </div>
  );
};
