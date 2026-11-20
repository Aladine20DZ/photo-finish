/**
 * PHOTO FINISH PRO AI — Master Smart Judge Workspace
 * The core field workstation automatically specialized per judge assignment.
 * World Athletics Rule 18, 19, 25 & 26 Compliant.
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, 
  ArrowRight, 
  Wifi, 
  WifiOff, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  Printer, 
  FileSpreadsheet, 
  Users, 
  Activity, 
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { 
  JudgeAssignment, 
  judgesAssignmentService,
  JudgeActivityLog 
} from '../../services/judgesAssignmentService';
import { FieldEventCompetition } from '../../types/athletics';
import { smartJudgeWorkspaceService } from '../../services/smartJudgeWorkspaceService';
import { HorizontalJumpsWorkspace } from './HorizontalJumpsWorkspace';
import { VerticalJumpsWorkspace } from './VerticalJumpsWorkspace';
import { ThrowsWorkspace } from './ThrowsWorkspace';
import { TrackCourseJudgeWorkspace } from './TrackCourseJudgeWorkspace';
import { CheckpointJudgeView } from '../checkpoints/CheckpointJudgeView';
import { OfficialFederationHeader, OfficialFederationFooter } from '../athletics/OfficialFederationHeader';

interface SmartJudgeWorkspaceProps {
  assignment: JudgeAssignment;
  onBackToDashboard?: () => void;
  otherAssignments?: JudgeAssignment[];
  onSwitchAssignment?: (assignment: JudgeAssignment) => void;
}

export const SmartJudgeWorkspace: React.FC<SmartJudgeWorkspaceProps> = ({
  assignment,
  onBackToDashboard,
  otherAssignments = [],
  onSwitchAssignment
}) => {
  const [eventComp, setEventComp] = useState<FieldEventCompetition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFieldMode, setIsFieldMode] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<JudgeActivityLog[]>([]);
  const [showSwitchDropdown, setShowSwitchDropdown] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const isOnline = smartJudgeWorkspaceService.isOnline();
  const pendingCount = smartJudgeWorkspaceService.getPendingQueueCount();

  const loadData = async () => {
    setLoading(true);
    try {
      const comp = await smartJudgeWorkspaceService.loadEventForAssignment(assignment);
      setEventComp(comp);
      setAuditLogs(judgesAssignmentService.getJudgeActivityLogs(assignment.disciplineId, assignment.competitionId));
    } catch (err) {
      console.warn('Error loading event for assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = smartJudgeWorkspaceService.subscribe(() => {
      setAuditLogs(judgesAssignmentService.getJudgeActivityLogs(assignment.disciplineId, assignment.competitionId));
    });
    return unsub;
  }, [assignment]);

  const handleCertify = async () => {
    if (!eventComp) return;
    if (!window.confirm(`هل أنت متأكد من اعتماد نتائج (${assignment.disciplineNameAr}) بصفة رسمية ونهائية؟`)) {
      return;
    }

    try {
      const certified = await smartJudgeWorkspaceService.certifyResults({
        eventCompetitionId: eventComp.id,
        chiefJudgeId: assignment.judgeId,
        chiefJudgeName: assignment.judgeName,
        assignment
      });
      if (certified) {
        setEventComp(certified);
        setNotification('تم اعتماد نتائج التخصص بنجاح وإغلاق المحضر رسمياً.');
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الاعتماد.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const category = assignment.disciplineCategory || 'jumps_horizontal';
  const isOfficialLocked = eventComp?.status === 'official';
  const canCertify = assignment.permissions?.canCertify || assignment.task.includes('chief');

  return (
    <div dir="rtl" className={`min-h-screen text-slate-100 ${isFieldMode ? 'bg-black p-2 sm:p-4' : 'bg-slate-950 p-3 sm:p-6'}`}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Control Ribbon */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold"
                title="العودة للوحة التعيينات"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="hidden sm:inline">لوحة التعيينات</span>
              </button>
            )}

            {/* Assignment Switcher if multiple exist */}
            {otherAssignments.length > 1 && onSwitchAssignment && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSwitchDropdown(prev => !prev)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-black flex items-center gap-1.5 transition-all"
                >
                  <span>تبديل التخصص ({otherAssignments.length})</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showSwitchDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                    {otherAssignments.map(asg => (
                      <button
                        key={asg.id}
                        type="button"
                        onClick={() => {
                          onSwitchAssignment(asg);
                          setShowSwitchDropdown(false);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl text-xs transition-all flex flex-col ${
                          asg.id === assignment.id
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-bold">{asg.disciplineNameAr}</span>
                        <span className="text-[10px] text-slate-400">{asg.venue} • {asg.taskTitleAr}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{assignment.disciplineNameAr}</h1>
                <span className="font-mono text-xs text-amber-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md">
                  {assignment.dutyCode}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{assignment.judgeName} ({assignment.taskTitleAr})</span>
                <span>•</span>
                <span>{assignment.venue}</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sync Status Badge */}
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              isOnline && pendingCount === 0
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-400'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">متزامن محلياً وسحابياً</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>دون إنترنت ({pendingCount})</span>
                </>
              )}
            </div>

            {/* Audit Log Button */}
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1"
              title="سجل العمليات والتدقيق الميداني"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">السجل ({auditLogs.length})</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold"
              title="طباعة المحضر الرسمي"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Field Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsFieldMode(prev => !prev)}
              className={`py-1.5 px-3 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all ${
                isFieldMode 
                  ? 'bg-amber-500 text-slate-950 border-amber-400' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {isFieldMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFieldMode ? 'إنهاء وضع الميدان' : 'وضع الميدان'}</span>
            </button>

            {/* Official Certification Button */}
            {canCertify && (
              <button
                type="button"
                onClick={handleCertify}
                disabled={isOfficialLocked}
                className={`py-2 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  isOfficialLocked
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-800/40 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                }`}
              >
                {isOfficialLocked ? (
                  <>
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>معتمد رسمياً ومقفل</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>اعتماد النتائج الرسمية</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notification Alert */}
        {notification && (
          <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Official Header for Print & A4 Review */}
        <div className="hidden print:block">
          <OfficialFederationHeader
            competitionTitle={assignment.disciplineNameAr}
            disciplineName={assignment.disciplineNameAr}
            venue={assignment.venue}
            date={assignment.date}
          />
        </div>

        {/* Discipline-Specific Workstation */}
        {loading || !eventComp ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-sm font-bold">
            جاري تهيئة مساحة العمل الميدانية ومطابقة قائمة الرياضيين...
          </div>
        ) : category === 'jumps_horizontal' ? (
          <HorizontalJumpsWorkspace
            competition={eventComp}
            assignment={assignment}
            readOnly={isOfficialLocked}
            onUpdateCompetition={setEventComp}
          />
        ) : category === 'jumps_vertical' ? (
          <VerticalJumpsWorkspace
            competition={eventComp}
            assignment={assignment}
            readOnly={isOfficialLocked}
            onUpdateCompetition={setEventComp}
          />
        ) : category === 'throws' ? (
          <ThrowsWorkspace
            competition={eventComp}
            assignment={assignment}
            readOnly={isOfficialLocked}
            onUpdateCompetition={setEventComp}
          />
        ) : category === 'running' ? (
          <TrackCourseJudgeWorkspace
            assignment={assignment}
            competitionTitle={assignment.disciplineNameAr}
            readOnly={isOfficialLocked}
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="text-center text-slate-300 font-bold mb-4">
              نقطة مراقبة مسار السباق (Checkpoint Station)
            </div>
          </div>
        )}

        {/* Official Footer for Print */}
        <div className="hidden print:block pt-8">
          <OfficialFederationFooter
            chiefJudgeName={assignment.judgeName}
            chiefJudgeLicense={assignment.judgeGrade}
            isCertified={isOfficialLocked}
            certifiedAt={eventComp?.updatedAt ? new Date(eventComp.updatedAt).toLocaleString('ar-DZ') : undefined}
          />
        </div>

        {/* Audit Log Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 space-y-4 text-slate-100 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span>سجل التدقيق والعمليات الميدانية للحكام</span>
                </h3>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    لا توجد عمليات مسجلة في هذا التخصص حتى الآن.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div 
                      key={log.id}
                      className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-amber-400">{log.judgeName} ({log.judgeRole})</span>
                        <span className="font-mono text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString('ar-DZ')}
                        </span>
                      </div>
                      <div className="text-slate-200">
                        العملية: <span className="font-bold text-emerald-400">{log.actionType}</span>
                        {log.athleteBib && <span className="font-mono text-amber-400 mr-2">صدرية #{log.athleteBib}</span>}
                        {log.attemptNumber && <span className="mr-2">محاولة {log.attemptNumber}</span>}
                      </div>
                      {log.newValue && (
                        <div className="text-slate-400 font-mono text-[11px]">
                          القيمة: {log.newValue} {log.windReading !== undefined && `(رياح: ${log.windReading})`}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
