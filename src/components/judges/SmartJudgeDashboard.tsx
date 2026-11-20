/**
 * PHOTO FINISH PRO AI — Smart Judge Field Dashboard
 * Central command hub for athletics judges.
 * Displays assigned disciplines, venues, daily schedule, and quick workspace access.
 * World Athletics Rule 18 & 19 Compliant.
 */

import React, { useState } from 'react';
import { 
  Award, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ShieldCheck, 
  Layers,
  ChevronLeft,
  Sparkles,
  Trophy,
  Activity
} from 'lucide-react';
import { 
  CertifiedJudge, 
  JudgeAssignment, 
  judgesAssignmentService 
} from '../../services/judgesAssignmentService';
import { NationalCompetition } from '../../services/competitionsService';
import { smartJudgeWorkspaceService } from '../../services/smartJudgeWorkspaceService';

interface SmartJudgeDashboardProps {
  judge: CertifiedJudge;
  assignments: JudgeAssignment[];
  activeCompetition: NationalCompetition | null;
  onSelectAssignment: (assignment: JudgeAssignment) => void;
  onLogout?: () => void;
}

export const SmartJudgeDashboard: React.FC<SmartJudgeDashboardProps> = ({
  judge,
  assignments,
  activeCompetition,
  onSelectAssignment,
  onLogout
}) => {
  const isOnline = smartJudgeWorkspaceService.isOnline();
  const pendingCount = smartJudgeWorkspaceService.getPendingQueueCount();
  const lastSynced = smartJudgeWorkspaceService.getLastSyncedTime();

  return (
    <div dir="rtl" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Judge Profile & Live Field Presence Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-2xl shadow-inner shrink-0">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-white">{judge.fullName}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  {judge.grade === 'international' ? 'حكم دولي معتمد' :
                   judge.grade === 'federal' ? 'حكم فيدرالي رسمي' :
                   judge.grade === 'regional' ? 'حكم جهوي' : 'حكم ولائي'}
                </span>
                <span className="font-mono text-xs text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                  {judge.licenseNumber}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{judge.wilaya} • {activeCompetition?.name || 'البطولة الولائية لألعاب القوى'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>الموسم الرياضي 2026</span>
                </span>
              </div>
            </div>
          </div>

          {/* Sync & Connectivity Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              isOnline && pendingCount === 0
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-400'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span>متصل بالشبكة (متزامن)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span>وضع الميدان بدون إنترنت ({pendingCount} معلق)</span>
                </>
              )}
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all"
              >
                تبديل الحساب
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <div className="text-xs text-slate-400 font-bold">التخصصات المكلف بها</div>
            <div className="text-2xl font-black font-mono text-white mt-1">{assignments.length}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <div className="text-xs text-slate-400 font-bold">حالة التعيينات</div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1">
              {assignments.filter(a => a.status === 'active').length} نشطة
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <div className="text-xs text-slate-400 font-bold">تزامن البيانات الميدانية</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">100%</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <div className="text-xs text-slate-400 font-bold">آخر وقت تدقيق</div>
            <div className="text-base font-bold font-mono text-slate-300 mt-1">{lastSynced}</div>
          </div>
        </div>
      </div>

      {/* Assigned Disciplines & Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">قوائم وتعيينات العمل الميداني المكلف بها</h2>
          </div>
          <span className="text-xs text-slate-400">
            اختر التخصص للدخول مباشرة إلى مساحة تسجيل النتائج
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-black text-white">لا توجد تعيينات نشطة مسجلة لهذا الحكم حالياً</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              يرجى التواصل مع مسؤول الحكام أو إدارة الرابطة لإسناد التخصص والمهمة المناسبة ضمن هذه المنافسة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((asg) => {
              const isField = asg.disciplineCategory?.startsWith('jumps') || asg.disciplineCategory === 'throws';
              const isRunning = asg.disciplineCategory === 'running';
              const isCheckpoint = asg.disciplineCategory === 'checkpoint';

              return (
                <div
                  key={asg.id}
                  onClick={() => onSelectAssignment(asg)}
                  className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Category Pill & Duty Code */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        asg.disciplineCategory === 'jumps_horizontal' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        asg.disciplineCategory === 'jumps_vertical' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                        asg.disciplineCategory === 'throws' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        asg.disciplineCategory === 'checkpoint' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}>
                        {asg.disciplineCategory === 'jumps_horizontal' ? 'الوثب الأفقي' :
                         asg.disciplineCategory === 'jumps_vertical' ? 'الوثب العمودي' :
                         asg.disciplineCategory === 'throws' ? 'مسابقات الرمي' :
                         asg.disciplineCategory === 'checkpoint' ? 'نقطة مراقبة' : 'سباقات المضمار'}
                      </span>

                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {asg.dutyCode}
                      </span>
                    </div>

                    {/* Discipline Name */}
                    <div>
                      <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                        {asg.disciplineNameAr}
                      </h3>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {asg.taskTitleAr}
                      </div>
                    </div>

                    {/* Meta info: Venue & Time */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{asg.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-mono">{asg.scheduledStartTime} - {asg.scheduledEndTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Open Button */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-black text-amber-400 group-hover:text-amber-300">
                    <span>فتح محطة العمل الميدانية</span>
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
