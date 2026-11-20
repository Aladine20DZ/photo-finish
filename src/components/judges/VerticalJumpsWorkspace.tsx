/**
 * PHOTO FINISH PRO AI — Vertical Jumps Field Workspace
 * Dedicated workspace for High Jump (الوثب العالي) and Pole Vault (القفز بالزانة).
 * World Athletics Rule 26 Compliant.
 * Features:
 * - Dynamic height progression (الارتفاعات المجتازة).
 * - Per-height attempts: Clearance (O), Failure (X), Pass (—).
 * - 3 Consecutive failures tracking with automatic elimination.
 * - Live Rule 26 tie-breaker:
 *   1. Highest cleared height.
 *   2. Fewest attempts at highest cleared height.
 *   3. Fewest total failures throughout competition.
 */

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Plus, 
  ArrowUp, 
  Check, 
  X as XIcon, 
  Minus, 
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { 
  FieldEventCompetition, 
  FieldAthleteScore, 
  VerticalHeightTrial 
} from '../../types/athletics';
import { smartJudgeWorkspaceService } from '../../services/smartJudgeWorkspaceService';
import { JudgeAssignment } from '../../services/judgesAssignmentService';

interface VerticalJumpsWorkspaceProps {
  competition: FieldEventCompetition;
  assignment: JudgeAssignment;
  readOnly?: boolean;
  onUpdateCompetition?: (updated: FieldEventCompetition) => void;
}

export const VerticalJumpsWorkspace: React.FC<VerticalJumpsWorkspaceProps> = ({
  competition,
  assignment,
  readOnly = false,
  onUpdateCompetition
}) => {
  // Collect all distinct heights across all athletes
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
    return heights[heights.length - 1] || 1.80;
  });
  const [showAddHeightModal, setShowAddHeightModal] = useState<boolean>(false);
  const [newHeightInput, setNewHeightInput] = useState<string>('');

  const canEdit = !readOnly && (assignment.permissions?.canRecord ?? true);

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

  const handleRecordTrial = async (
    athlete: FieldAthleteScore, 
    heightMeters: number, 
    trialResult: 'O' | 'X' | '—'
  ) => {
    if (!canEdit) return;
    if (competition.status === 'official') {
      alert('المسابقة معتمدة ومقفلة رسمياً.');
      return;
    }

    const { isEliminated } = checkEliminationStatus(athlete);
    if (isEliminated && trialResult !== '—') {
      if (!window.confirm(`العداء (${athlete.athleteName}) استنفد 3 إخفاقات متتالية ومستبعد وفق القانون 26. هل تريد المتابعة رغم ذلك؟`)) {
        return;
      }
    }

    const existingTrial = (athlete.verticalTrials || []).find(t => t.heightMeters === heightMeters);
    const currentTrials = existingTrial ? [...existingTrial.trials] : [];

    // Max 3 trials per height
    if (currentTrials.length >= 3 && currentTrials[currentTrials.length - 1] !== trialResult) {
      currentTrials[currentTrials.length - 1] = trialResult;
    } else if (currentTrials.length < 3) {
      currentTrials.push(trialResult);
    }

    const cleared = currentTrials.includes('O');

    const updatedTrial: VerticalHeightTrial = {
      heightMeters,
      cleared,
      attemptsCount: currentTrials.length,
      trials: currentTrials
    };

    const updatedComp = await smartJudgeWorkspaceService.recordVerticalTrial({
      eventCompetitionId: competition.id,
      assignment,
      athleteId: athlete.athleteId,
      athleteBib: athlete.bibNumber,
      heightTrial: updatedTrial
    });

    if (updatedComp && onUpdateCompetition) {
      onUpdateCompetition(updatedComp);
    }
  };

  const handleClearTrial = async (athlete: FieldAthleteScore, heightMeters: number) => {
    if (!canEdit) return;
    const existingTrial = (athlete.verticalTrials || []).find(t => t.heightMeters === heightMeters);
    if (!existingTrial || existingTrial.trials.length === 0) return;

    const newTrials = existingTrial.trials.slice(0, -1);
    const cleared = newTrials.includes('O');

    const updatedTrial: VerticalHeightTrial = {
      heightMeters,
      cleared,
      attemptsCount: newTrials.length,
      trials: newTrials
    };

    const updatedComp = await smartJudgeWorkspaceService.recordVerticalTrial({
      eventCompetitionId: competition.id,
      assignment,
      athleteId: athlete.athleteId,
      athleteBib: athlete.bibNumber,
      heightTrial: updatedTrial
    });

    if (updatedComp && onUpdateCompetition) {
      onUpdateCompetition(updatedComp);
    }
  };

  const handleAddHeight = () => {
    const val = parseFloat(newHeightInput);
    if (isNaN(val) || val <= 0) {
      alert('يرجى إدخال ارتفاع صحيح (مثال: 1.93).');
      return;
    }
    if (!heights.includes(val)) {
      const next = [...heights, val].sort((a, b) => a - b);
      setHeights(next);
      setCurrentHeight(val);
    }
    setShowAddHeightModal(false);
    setNewHeightInput('');
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* Height Controller & Bar Status */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">الارتفاع الفعلي للعارضة:</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-xl">
              {heights.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setCurrentHeight(h)}
                  className={`px-3 py-1.5 rounded-xl font-mono font-black text-sm transition-all border flex items-center gap-1 shrink-0 ${
                    currentHeight === h
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span>{h.toFixed(2)}م</span>
                  {currentHeight === h && <ArrowUp className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAddHeightModal(true)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>رفع العارضة</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1 font-mono text-emerald-400">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold">O</span>
            <span>اجتياز</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-red-400">
            <span className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center font-bold">X</span>
            <span>إخفاق</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-amber-400">
            <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold">—</span>
            <span>تخطي</span>
          </span>
        </div>
      </div>

      {/* Vertical Jump Results Table (RTL First) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider">
                <th className="py-3 px-3 w-14 text-center">الترتيب</th>
                <th className="py-3 px-3 w-16 text-center">الصدرية</th>
                <th className="py-3 px-4 min-w-[140px]">العداء</th>
                <th className="py-3 px-3 min-w-[110px]">النادي</th>
                {heights.map((h) => (
                  <th 
                    key={h} 
                    className={`py-3 px-2 text-center min-w-[70px] font-mono ${
                      currentHeight === h ? 'bg-amber-500/20 text-amber-300 border-x border-amber-500/40' : ''
                    }`}
                  >
                    {h.toFixed(2)}م
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-28 bg-emerald-500/10 text-emerald-300 border-r border-slate-800">أعلى ارتفاع</th>
                <th className="py-3 px-2 text-center w-20 text-slate-400">الأخطاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {competition.athletes.map((ath, idx) => {
                const isLeader = ath.rank === 1 && ath.bestValidMeasurement > 0;
                const { isEliminated } = checkEliminationStatus(ath);

                // Total failures calculation
                let totalFailures = 0;
                (ath.verticalTrials || []).forEach(t => {
                  totalFailures += t.trials.filter(r => r === 'X').length;
                });

                return (
                  <tr 
                    key={ath.athleteId}
                    className={`transition-colors hover:bg-slate-800/50 ${
                      isEliminated ? 'bg-red-950/10 opacity-70' :
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
                      {isEliminated && (
                        <span className="text-[10px] bg-red-900/40 border border-red-800/60 text-red-400 px-1.5 py-0.5 rounded-full font-normal">
                          مستبعد (3 أخطاء)
                        </span>
                      )}
                    </td>

                    {/* Club */}
                    <td className="py-3 px-3 text-xs text-slate-400 font-medium">
                      {ath.clubName}
                    </td>

                    {/* Heights Columns */}
                    {heights.map((h) => {
                      const trial = (ath.verticalTrials || []).find(t => t.heightMeters === h);
                      const isCurrentActive = currentHeight === h;

                      return (
                        <td 
                          key={h} 
                          className={`py-2 px-1 text-center ${
                            isCurrentActive ? 'bg-amber-500/5 border-x border-amber-500/20' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {/* Visual Trials (e.g. X O) */}
                            <div className="flex items-center justify-center gap-1 min-h-[26px]">
                              {trial && trial.trials.length > 0 ? (
                                trial.trials.map((res, trialIdx) => (
                                  <span
                                    key={trialIdx}
                                    className={`inline-block font-mono font-black text-xs px-1 rounded ${
                                      res === 'O' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60' :
                                      res === 'X' ? 'text-red-400 bg-red-950/60 border border-red-800/60' :
                                      'text-amber-400 bg-amber-950/60 border border-amber-800/60'
                                    }`}
                                  >
                                    {res}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-700 font-mono text-xs">—</span>
                              )}
                            </div>

                            {/* Touch buttons when this height is active and judge can edit */}
                            {canEdit && isCurrentActive && !isEliminated && (
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleRecordTrial(ath, h, 'O')}
                                  title="اجتياز (O)"
                                  className="w-5 h-5 rounded bg-emerald-950 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-300 font-mono text-[10px] flex items-center justify-center"
                                >
                                  O
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordTrial(ath, h, 'X')}
                                  title="إخفاق (X)"
                                  className="w-5 h-5 rounded bg-red-950 hover:bg-red-800 border border-red-700/60 text-red-300 font-mono text-[10px] flex items-center justify-center"
                                >
                                  X
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordTrial(ath, h, '—')}
                                  title="تخطي (—)"
                                  className="w-5 h-5 rounded bg-amber-950 hover:bg-amber-800 border border-amber-700/60 text-amber-300 font-mono text-[10px] flex items-center justify-center"
                                >
                                  —
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Best Cleared Height */}
                    <td className="py-3 px-3 text-center bg-emerald-500/5 border-r border-slate-800 font-mono font-black text-base text-emerald-400">
                      {ath.bestValidMeasurement > 0 ? `${ath.bestValidMeasurement.toFixed(2)} م` : 'NM'}
                    </td>

                    {/* Total Failures */}
                    <td className="py-3 px-2 text-center text-xs font-mono text-slate-400">
                      {totalFailures}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Bar Height */}
      {showAddHeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 space-y-4 text-slate-100">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-amber-400" />
              <span>رفع عارضة الوثب (ارتفاع جديد)</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                الارتفاع بالأمتار (مثال: 1.95 أو 2.05):
              </label>
              <input
                type="number"
                step="0.01"
                value={newHeightInput}
                onChange={(e) => setNewHeightInput(e.target.value)}
                placeholder="1.95"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 font-mono text-lg text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddHeightModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddHeight}
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
              >
                تأكيد الارتفاع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
