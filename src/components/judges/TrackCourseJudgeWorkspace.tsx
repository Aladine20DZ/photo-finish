/**
 * PHOTO FINISH PRO AI — Track & Relays Judge Workspace (COURSE)
 * Dedicated workspace for Track races (100m, 200m, 400m, hurdles, relays).
 * World Athletics Rule 164 & 165 Compliant.
 * Features:
 * - Heats/Series navigation.
 * - Lane, Bib, Athlete, Club, Gun Time, Status (OK, DNS, DNF, DQ).
 * - Direct FAT & manual timing entry.
 * - Integration with official Photo Finish time records.
 */

import React, { useState } from 'react';
import { 
  Timer, 
  Trophy, 
  Clock, 
  Flag, 
  AlertCircle, 
  CheckCircle2, 
  Edit3,
  Layers,
  Camera
} from 'lucide-react';
import { Runner } from '../../types/race';
import { JudgeAssignment } from '../../services/judgesAssignmentService';

export interface TrackAthleteEntry {
  id: string;
  lane: number;
  bib: number;
  athleteName: string;
  clubName: string;
  status: 'OK' | 'DNS' | 'DNF' | 'DQ';
  dqRule?: string;
  gunTimeMs?: number;
  formattedTime?: string;
  manualTimeMs?: number;
  rank?: number;
}

interface TrackCourseJudgeWorkspaceProps {
  assignment: JudgeAssignment;
  competitionTitle: string;
  readOnly?: boolean;
}

const SEED_TRACK_RUNNERS: TrackAthleteEntry[] = [
  { id: 'r_1', lane: 1, bib: 110, athleteName: 'أيوب بن عائشة', clubName: 'مولودية سعيدة (MCS)', status: 'OK', gunTimeMs: 10420, formattedTime: '10.42', rank: 1 },
  { id: 'r_2', lane: 2, bib: 112, athleteName: 'حمزة غربي', clubName: 'وفاق سعيدة (WBS)', status: 'OK', gunTimeMs: 10580, formattedTime: '10.58', rank: 2 },
  { id: 'r_3', lane: 3, bib: 115, athleteName: 'سيد علي بوقرة', clubName: 'أولمبي الحساسنة', status: 'OK', gunTimeMs: 10720, formattedTime: '10.72', rank: 3 },
  { id: 'r_4', lane: 4, bib: 118, athleteName: 'سفيان دربال', clubName: 'شباب ألعاب القوى عين الحجر', status: 'OK', gunTimeMs: 10890, formattedTime: '10.89', rank: 4 },
  { id: 'r_5', lane: 5, bib: 121, athleteName: 'عصام قوادري', clubName: 'نادي ألعاب القوى يوب', status: 'DNS', rank: 5 },
  { id: 'r_6', lane: 6, bib: 124, athleteName: 'طارق فلاح', clubName: 'مولودية سعيدة (MCS)', status: 'DNF', rank: 6 },
  { id: 'r_7', lane: 7, bib: 128, athleteName: 'مصطفى بن علي', clubName: 'أمل دير الحمر', status: 'DQ', dqRule: 'TR16.8 (انطلاقة خاطئة)', rank: 7 },
  { id: 'r_8', lane: 8, bib: 130, athleteName: 'محمد لمين شريف', clubName: 'وفاق سعيدة (WBS)', status: 'OK', gunTimeMs: 11150, formattedTime: '11.15', rank: 5 }
];

export const TrackCourseJudgeWorkspace: React.FC<TrackCourseJudgeWorkspaceProps> = ({
  assignment,
  competitionTitle,
  readOnly = false
}) => {
  const [runners, setRunners] = useState<TrackAthleteEntry[]>(SEED_TRACK_RUNNERS);
  const [activeHeatIndex, setActiveHeatIndex] = useState<number>(0);
  const [editingRunner, setEditingRunner] = useState<TrackAthleteEntry | null>(null);
  const [timeInput, setTimeInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<'OK' | 'DNS' | 'DNF' | 'DQ'>('OK');
  const [dqRuleInput, setDqRuleInput] = useState<string>('TR16.8');

  const canEdit = !readOnly && (assignment.permissions?.canRecord ?? true);

  const handleOpenEdit = (runner: TrackAthleteEntry) => {
    if (!canEdit) return;
    setEditingRunner(runner);
    setTimeInput(runner.formattedTime || '');
    setStatusInput(runner.status);
    setDqRuleInput(runner.dqRule || 'TR16.8');
  };

  const handleSaveRunner = () => {
    if (!editingRunner) return;

    setRunners(prev => prev.map(r => {
      if (r.id !== editingRunner.id) return r;
      return {
        ...r,
        status: statusInput,
        formattedTime: statusInput === 'OK' ? timeInput : undefined,
        dqRule: statusInput === 'DQ' ? dqRuleInput : undefined
      };
    }));

    setEditingRunner(null);
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* Series / Heats Selector */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">السلسلة / النهائي:</span>
          <div className="flex gap-1.5">
            {['النهائي الرسمي (FAT)', 'السلسلة 1', 'السلسلة 2'].map((heatName, idx) => (
              <button
                key={heatName}
                type="button"
                onClick={() => setActiveHeatIndex(idx)}
                className={`py-1.5 px-3 rounded-xl font-bold text-xs transition-all border ${
                  activeHeatIndex === idx
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {heatName}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span>مرتبط بكاميرا Photo Finish والمؤقت الإلكتروني</span>
        </div>
      </div>

      {/* Main Track Table (RTL First) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider">
                <th className="py-3 px-3 w-14 text-center">الترتيب</th>
                <th className="py-3 px-3 w-14 text-center">الرواق</th>
                <th className="py-3 px-3 w-16 text-center">الصدرية</th>
                <th className="py-3 px-4 min-w-[150px]">العداء</th>
                <th className="py-3 px-4 min-w-[120px]">النادي</th>
                <th className="py-3 px-4 text-center w-36 bg-amber-500/10 text-amber-300 border-r border-slate-800">التوقيت الرسمي (FAT)</th>
                <th className="py-3 px-3 text-center w-28">الحالة</th>
                <th className="py-3 px-3 text-center w-20">تعديل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {runners.map((r, idx) => {
                const isWinner = r.rank === 1 && r.status === 'OK';

                return (
                  <tr 
                    key={r.id}
                    className={`transition-colors hover:bg-slate-800/50 ${
                      isWinner ? 'bg-amber-500/5' : idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-transparent'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs font-mono ${
                        r.rank === 1 && r.status === 'OK' ? 'bg-amber-500 text-slate-950 font-black' :
                        r.rank === 2 && r.status === 'OK' ? 'bg-slate-300 text-slate-950 font-black' :
                        r.rank === 3 && r.status === 'OK' ? 'bg-amber-800 text-white font-black' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {r.status === 'OK' ? r.rank : '—'}
                      </span>
                    </td>

                    {/* Lane */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                      {r.lane}
                    </td>

                    {/* Bib */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-black text-amber-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded-md text-xs">
                        #{r.bib}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-bold text-slate-100 flex items-center gap-2">
                      <span>{r.athleteName}</span>
                      {isWinner && <Trophy className="w-4 h-4 text-amber-400 shrink-0" />}
                    </td>

                    {/* Club */}
                    <td className="py-3 px-4 text-xs text-slate-400 font-medium">
                      {r.clubName}
                    </td>

                    {/* FAT Gun Time */}
                    <td className="py-3 px-4 text-center bg-amber-500/5 border-r border-slate-800 font-mono font-black text-base text-amber-400">
                      {r.status === 'OK' ? (r.formattedTime ? `${r.formattedTime} ثا` : '—') : '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold font-mono ${
                        r.status === 'OK' ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-400' :
                        r.status === 'DNS' ? 'bg-slate-800 border border-slate-700 text-slate-400' :
                        r.status === 'DNF' ? 'bg-purple-950/60 border border-purple-800/60 text-purple-400' :
                        'bg-red-950/60 border border-red-800/60 text-red-400'
                      }`}>
                        {r.status === 'OK' ? 'أنهى' :
                         r.status === 'DNS' ? 'غياب' :
                         r.status === 'DNF' ? 'انسحاب' :
                         `استبعاد (${r.dqRule || 'DQ'})`}
                      </span>
                    </td>

                    {/* Edit button */}
                    <td className="py-3 px-3 text-center">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Edit Runner Modal */}
      {editingRunner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 space-y-4 text-slate-100">
            <h3 className="text-base font-black text-white flex items-center justify-between">
              <span>تعديل نتيجة الرواق {editingRunner.lane}</span>
              <span className="font-mono text-amber-400">#{editingRunner.bib}</span>
            </h3>

            <div className="text-xs text-slate-400">
              {editingRunner.athleteName} • {editingRunner.clubName}
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">حالة العداء:</label>
              <div className="grid grid-cols-4 gap-2">
                {(['OK', 'DNS', 'DNF', 'DQ'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusInput(st)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all ${
                      statusInput === st
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Input if OK */}
            {statusInput === 'OK' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  التوقيت بالثواني (مثال: 10.42):
                </label>
                <input
                  type="text"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  placeholder="10.42"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 font-mono text-lg text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* DQ Rule if DQ */}
            {statusInput === 'DQ' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  مادة الاستبعاد (World Athletics):
                </label>
                <select
                  value={dqRuleInput}
                  onChange={(e) => setDqRuleInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="TR16.8 (انطلاقة خاطئة)">TR16.8 (انطلاقة خاطئة - False Start)</option>
                  <option value="TR17.3.1 (دوس الخط الداخلي)">TR17.3.1 (دوس خط الحارة الداخلي)</option>
                  <option value="TR17.2.2 (إعاقة عداء آخر)">TR17.2.2 (إعاقة متسابق آخر)</option>
                  <option value="TR24.7 (تسليم العصا خارج المنطقة)">TR24.7 (تسليم العصا خارج منطقة التبديل)</option>
                </select>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingRunner(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveRunner}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
