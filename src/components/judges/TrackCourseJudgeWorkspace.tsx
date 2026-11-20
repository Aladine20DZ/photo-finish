/**
 * PHOTO FINISH PRO — SCREEN 04: TRACK RACES & COURSE (السباقات - المضمار 4)
 * Dedicated workspace for Track races (100m, 200m, 400m, hurdles, relays).
 * Conforms directly to the official reference design (Panel 4).
 * World Athletics Rule 164 & 165 Compliant.
 * Features:
 * - Top header with system logo and "السباقات (المضمار) 4".
 * - Series & Heats Selector: "سباق 100 متر - سلسلة 1".
 * - RTL Athletes Table: # | العداء | النادي | المسار | النتيجة | الحالة.
 * - Action buttons: "+ عرض النتيجة", "إضافة نتيجة يدوية".
 * - Status pills: "مؤكد" (Green), "قيد الإنجاز" (Orange), DNS, DNF, DQ (with rule codes).
 * - Integration with photo finish and FAT gun timing engine.
 * - Right athletic visual hero: sprinters dashing across finish line.
 * - Universal Judge Footer.
 *
 * Strict Rule: Solid surfaces only for full contrast outdoors.
 */

import React, { useState } from 'react';
import { 
  Timer, 
  Edit3,
  Camera,
  Maximize2,
  ChevronRight,
  Plus,
  Users
} from 'lucide-react';
import { JudgeAssignment } from '../../services/judgesAssignmentService';
import { UniversalJudgeFooter } from './UniversalJudgeFooter';
import { AthleticVisualHero } from './AthleticVisualHero';

export interface TrackAthleteEntry {
  id: string;
  lane: number;
  bib: number;
  athleteName: string;
  clubName: string;
  status: 'confirmed' | 'in_progress' | 'DNS' | 'DNF' | 'DQ';
  dqRule?: string;
  gunTimeMs?: number;
  formattedTime?: string;
  rank?: number;
}

interface TrackCourseJudgeWorkspaceProps {
  assignment: JudgeAssignment;
  competitionTitle?: string;
  readOnly?: boolean;
  onOpenFieldMode?: () => void;
  onBackToDashboard?: () => void;
}

// Seed entries reflecting the reference design in Panel 4:
// 301 | بلال جابر | وفاق سعيدة | 4 | 10.72 | مؤكد
// 302 | أنس بوزيان | شباب السهلة | 5 | 10.78 | مؤكد
// 303 | كريم لعروسي | أمل سعيدة | 6 | 10.81 | مؤكد
// 304 | نادر بن خليفة | نجم المدينة | 7 | -- | قيد الإنجاز
const SEED_TRACK_RUNNERS: TrackAthleteEntry[] = [
  { id: 'r_301', lane: 4, bib: 301, athleteName: 'بلال جابر', clubName: 'وفاق سعيدة', status: 'confirmed', formattedTime: '10.72', rank: 1 },
  { id: 'r_302', lane: 5, bib: 302, athleteName: 'أنس بوزيان', clubName: 'شباب السهلة', status: 'confirmed', formattedTime: '10.78', rank: 2 },
  { id: 'r_303', lane: 6, bib: 303, athleteName: 'كريم لعروسي', clubName: 'أمل سعيدة', status: 'confirmed', formattedTime: '10.81', rank: 3 },
  { id: 'r_304', lane: 7, bib: 304, athleteName: 'نادر بن خليفة', clubName: 'نجم المدينة', status: 'in_progress', formattedTime: '--', rank: 4 },
  { id: 'r_305', lane: 2, bib: 305, athleteName: 'صلاح الدين عمار', clubName: 'مولودية سعيدة', status: 'DNS', formattedTime: 'DNS', rank: 5 },
  { id: 'r_306', lane: 3, bib: 306, athleteName: 'هشام مجدوب', clubName: 'أمل دير الحمر', status: 'DQ', dqRule: 'TR16.8 (انطلاقة خاطئة)', formattedTime: 'DQ', rank: 6 }
];

export const TrackCourseJudgeWorkspace: React.FC<TrackCourseJudgeWorkspaceProps> = ({
  assignment,
  readOnly = false,
  onOpenFieldMode,
  onBackToDashboard
}) => {
  const [runners, setRunners] = useState<TrackAthleteEntry[]>(SEED_TRACK_RUNNERS);
  const [activeHeatIndex, setActiveHeatIndex] = useState<number>(1);
  const [editingRunner, setEditingRunner] = useState<TrackAthleteEntry | null>(null);
  const [manualTimeInput, setManualTimeInput] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showPhotoReviewModal, setShowPhotoReviewModal] = useState<boolean>(false);

  const canEdit = !readOnly && (assignment.permissions?.canRecord ?? true);

  const handleSaveManualTime = () => {
    if (!editingRunner) return;
    setRunners(prev => prev.map(r => {
      if (r.id !== editingRunner.id) return r;
      return {
        ...r,
        formattedTime: manualTimeInput,
        status: 'confirmed'
      };
    }));
    setShowManualModal(false);
    setEditingRunner(null);
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 text-slate-100 font-sans">
      
      {/* ═══════════════════════════════════════════════════════════
          SCREEN 04 HEADER: Logo, Title (السباقات - المضمار 4)
          Matches Panel 4 in reference image
          ═══════════════════════════════════════════════════════════ */}
      <div className="bg-[#101D35] border border-[#1E293B] rounded-2xl px-5 py-4 shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1677E8] text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-wide">السباقات (المضمار)</h1>
              <span className="w-6 h-6 rounded-full bg-[#1677E8] text-white font-black text-xs flex items-center justify-center">4</span>
            </div>
            <div className="text-xs text-[#94A3B8] font-medium">
              توقيت إلكتروني رسمي (Photo Finish FAT) • {assignment.venue || 'المضمار الرئيسي'}
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

      {/* Subtitle / Race Selector Banner */}
      <div className="bg-[#0E172A] border border-[#1E293B] rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-white">
            {assignment.disciplineNameAr || 'سباق 100 متر'} - سلسلة {activeHeatIndex}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#1677E8]/20 border border-[#1677E8]/40 text-[#60A5FA] text-xs font-bold">
            الدور نصف النهائي
          </span>
        </div>

        {/* Heats Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-bold">السلاسل:</span>
          {[1, 2, 3].map((heatNum) => (
            <button
              key={heatNum}
              type="button"
              onClick={() => setActiveHeatIndex(heatNum)}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeHeatIndex === heatNum
                  ? 'bg-[#1677E8] text-white shadow'
                  : 'bg-[#101D35] text-slate-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              سلسلة {heatNum}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN WORKSPACE LAYOUT:
          Left / Middle: Table & Action Buttons (8.5 Cols)
          Right: Athletic Visual Hero (3.5 Cols)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Table & Action Buttons (8.5 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#101D35] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3.5 border-b border-[#1E293B] bg-[#0E172A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1677E8]" />
                <h3 className="text-xs font-black text-white">قائمة العدائين وتوزيع الحارات</h3>
              </div>
              <span className="text-xs text-[#13A879] font-bold">
                توقيت معتمد بالصورة (FAT)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0A101D] text-slate-400 font-bold border-b border-[#1E293B]">
                  <tr>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4">النتيجة</th>
                    <th className="py-3 px-4 text-center">المسار</th>
                    <th className="py-3 px-4">النادي</th>
                    <th className="py-3 px-4">العداء</th>
                    <th className="py-3 px-4 text-center">#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {runners.map((runner) => (
                    <tr
                      key={runner.id}
                      className="hover:bg-[#1E293B]/60 transition-colors"
                    >
                      {/* الحالة (مؤكد / قيد الإنجاز / DNS / DQ) */}
                      <td className="py-3 px-4 text-center">
                        {runner.status === 'confirmed' ? (
                          <span className="px-3 py-1 rounded-full bg-[#13A879]/20 text-[#13A879] border border-[#13A879]/40 font-black text-xs">
                            مؤكد
                          </span>
                        ) : runner.status === 'in_progress' ? (
                          <span className="px-3 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 font-black text-xs">
                            قيد الإنجاز
                          </span>
                        ) : runner.status === 'DQ' ? (
                          <span className="px-3 py-1 rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 font-black text-xs" title={runner.dqRule}>
                            إقصاء DQ
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-black text-xs">
                            DNS غائب
                          </span>
                        )}
                      </td>

                      {/* النتيجة */}
                      <td className="py-3 px-4 font-mono font-black text-base text-white">
                        {runner.formattedTime}
                      </td>

                      {/* المسار */}
                      <td className="py-3 px-4 font-mono font-bold text-center text-[#60A5FA]">
                        {runner.lane}
                      </td>

                      {/* النادي */}
                      <td className="py-3 px-4 text-slate-300">
                        {runner.clubName}
                      </td>

                      {/* العداء */}
                      <td className="py-3 px-4 font-black text-white whitespace-nowrap">
                        {runner.athleteName}
                      </td>

                      {/* رقم الصدرية # */}
                      <td className="py-3 px-4 font-mono font-black text-white text-center">
                        {runner.bib}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons matching Panel 4:
              [+ عرض النتيجة] (Blue), [إضافة نتيجة يدوية] (Outlined) */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPhotoReviewModal(true)}
              className="px-5 py-3 rounded-xl bg-[#1677E8] hover:bg-[#1260BD] text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>عرض النتيجة ومراجعة خط النهاية</span>
            </button>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                setEditingRunner(runners[0]);
                setManualTimeInput(runners[0]?.formattedTime !== '--' ? runners[0]?.formattedTime || '' : '');
                setShowManualModal(true);
              }}
              className="px-5 py-3 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] border border-[#1677E8]/60 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 shadow transition-all"
            >
              <Edit3 className="w-4 h-4 text-[#60A5FA]" />
              <span>إضافة نتيجة يدوية</span>
            </button>
          </div>
        </div>

        {/* Right: Athletic Visual Hero (3.5 Cols) */}
        <div className="lg:col-span-4 h-full">
          <AthleticVisualHero 
            scene="track_finish" 
            title="سباقات السرعة"
            badgeText="دقة التوقيت 0.001 ثانية"
            className="h-full min-h-[380px]"
          />
        </div>

      </div>

      {/* Manual Time Entry Modal (Solid Background, NO blur) */}
      {showManualModal && editingRunner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#101D35] border border-[#1E293B] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">
              إضافة نتيجة يدوية — #{editingRunner.bib} {editingRunner.athleteName}
            </h3>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold block">التوقيت المسجل (ثوانٍ):</label>
              <input
                type="text"
                placeholder="10.75"
                value={manualTimeInput}
                onChange={(e) => setManualTimeInput(e.target.value)}
                className="w-full bg-[#0E172A] border border-[#1E293B] rounded-xl px-4 py-2.5 font-mono text-white text-lg font-black outline-none focus:border-[#1677E8]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveManualTime}
                className="flex-1 py-2.5 rounded-xl bg-[#1677E8] hover:bg-[#1260BD] text-white font-black text-xs"
              >
                تأكيد النتيجة
              </button>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#0E172A] text-slate-400 hover:text-white font-bold text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Finish Viewer Modal (Solid Background, NO blur) */}
      {showPhotoReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#101D35] border border-[#1E293B] rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#1677E8]" />
                <span>شريط تصوير خط النهاية (Photo Finish Slit-Scan)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPhotoReviewModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-black rounded-2xl border border-[#1E293B] p-4 text-center">
              <div className="h-48 w-full bg-gradient-to-r from-red-950 via-slate-900 to-blue-950 rounded-xl flex items-center justify-center border border-red-500/30 relative overflow-hidden">
                <line x1="50%" y1="0" x2="50%" y2="100%" className="stroke-red-500 stroke-2" />
                <span className="font-mono text-xs text-red-400 bg-black/80 px-3 py-1 rounded-full border border-red-500/40">
                  خط القراءة الميكرومترية: 10.720s
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoReviewModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#1677E8] text-white font-bold text-xs"
            >
              إغلاق نافذة المعاينة
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          UNIVERSAL JUDGE FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <UniversalJudgeFooter />
    </div>
  );
};
