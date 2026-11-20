/**
 * PHOTO FINISH PRO — Master Smart Judge Workspace
 * The core field workstation automatically specialized per judge assignment.
 * World Athletics Rule 18, 19, 25 & 26 Compliant.
 * Coordinates Screens 02, 03, 04, and 05 (Field Mode).
 *
 * Strict Rule: Solid surfaces only for full contrast outdoors.
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
import { FieldModeWorkspace } from './FieldModeWorkspace';
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

  // If Field Mode (Screen 05) is toggled, render Screen 05
  if (isFieldMode && eventComp) {
    return (
      <FieldModeWorkspace
        assignment={assignment}
        competition={eventComp}
        onCloseFieldMode={() => setIsFieldMode(false)}
        onUpdateCompetition={setEventComp}
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen text-slate-100 bg-[#0A101D] p-3 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Top Control Ribbon */}
        <div className="bg-[#101D35] border border-[#1E293B] rounded-2xl p-4 shadow-xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="p-2.5 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#1E293B] transition-all flex items-center gap-1.5 text-xs font-bold"
                title="العودة للوحة التحكم الرئيسية"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="hidden sm:inline">لوحة التحكم (1)</span>
              </button>
            )}

            {/* Assignment Switcher if multiple exist */}
            {otherAssignments.length > 1 && onSwitchAssignment && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSwitchDropdown(prev => !prev)}
                  className="py-2 px-3 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] text-[#60A5FA] border border-[#1E293B] text-xs font-black flex items-center gap-1.5 transition-all"
                >
                  <span>تبديل التخصص ({otherAssignments.length})</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showSwitchDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-[#101D35] border border-[#1E293B] rounded-2xl shadow-2xl p-2 z-50 space-y-1">
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
                            ? 'bg-[#1677E8]/20 text-[#60A5FA] border border-[#1677E8]/40'
                            : 'hover:bg-[#0E172A] text-slate-300'
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
                <span className="font-mono text-xs text-[#60A5FA] bg-[#0E172A] border border-[#1E293B] px-2 py-0.5 rounded-md">
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
                ? 'bg-[#13A879]/15 border-[#13A879]/50 text-[#13A879]'
                : 'bg-[#F59E0B]/15 border-[#F59E0B]/50 text-[#F59E0B]'
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
              className="p-2 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] text-slate-300 border border-[#1E293B] text-xs font-bold flex items-center gap-1"
              title="سجل العمليات والتدقيق الميداني"
            >
              <Activity className="w-4 h-4 text-[#F59E0B]" />
              <span className="hidden sm:inline">السجل ({auditLogs.length})</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] text-slate-300 border border-[#1E293B] text-xs font-bold"
              title="طباعة المحضر الرسمي"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Field Mode Toggle (Screen 05) */}
            <button
              type="button"
              onClick={() => setIsFieldMode(true)}
              className="py-1.5 px-3 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] border border-[#13A879]/50 text-[#13A879] text-xs font-black flex items-center gap-1.5 transition-all shadow"
            >
              <Maximize2 className="w-4 h-4" />
              <span>وضع الميدان الشامل (5)</span>
            </button>

            {/* Official Certification Button */}
            {canCertify && (
              <button
                type="button"
                onClick={handleCertify}
                disabled={isOfficialLocked}
                className={`py-2 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  isOfficialLocked
                    ? 'bg-[#0E172A] text-[#13A879] border border-[#13A879]/40 cursor-default'
                    : 'bg-[#13A879] hover:bg-[#0E8962] text-white shadow-lg'
                }`}
              >
                {isOfficialLocked ? (
                  <>
                    <Lock className="w-4 h-4 text-[#13A879]" />
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
          <div className="bg-[#13A879]/20 border border-[#13A879]/40 text-[#13A879] p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#13A879] shrink-0" />
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
          <div className="bg-[#101D35] border border-[#1E293B] rounded-3xl p-12 text-center text-slate-400 text-sm font-bold">
            جاري تهيئة مساحة العمل الميدانية ومطابقة قائمة الرياضيين...
          </div>
        ) : category === 'jumps_horizontal' ? (
          <HorizontalJumpsWorkspace
            competition={eventComp}
            assignment={assignment}
            readOnly={isOfficialLocked}
            onUpdateCompetition={setEventComp}
            onOpenFieldMode={() => setIsFieldMode(true)}
            onBackToDashboard={onBackToDashboard}
          />
        ) : category === 'jumps_vertical' ? (
          <VerticalJumpsWorkspace
            competition={eventComp}
            assignment={assignment}
            readOnly={isOfficialLocked}
            onUpdateCompetition={setEventComp}
            onOpenFieldMode={() => setIsFieldMode(true)}
            onBackToDashboard={onBackToDashboard}
          />
        ) : category === 'throws' ? (
          <ThrowsWorkspace
            competition={eventComp}
            assignment={assignment}
            readOnly={isOfficialLocked}
            onUpdateCompetition={setEventComp}
            onOpenFieldMode={() => setIsFieldMode(true)}
            onBackToDashboard={onBackToDashboard}
          />
        ) : category === 'running' ? (
          <TrackCourseJudgeWorkspace
            assignment={assignment}
            competitionTitle={assignment.disciplineNameAr}
            readOnly={isOfficialLocked}
            onOpenFieldMode={() => setIsFieldMode(true)}
            onBackToDashboard={onBackToDashboard}
          />
        ) : (
          <div className="bg-[#101D35] border border-[#1E293B] rounded-3xl p-6">
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

        {/* Audit Log Modal (Solid Background, NO blur) */}
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80">
            <div className="bg-[#101D35] border border-[#1E293B] w-full max-w-lg rounded-2xl p-5 space-y-4 text-slate-100 max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#F59E0B]" />
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
                      className="bg-[#0E172A] border border-[#1E293B] p-3 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-[#F59E0B]">{log.judgeName} ({log.judgeRole})</span>
                        <span className="font-mono text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString('ar-DZ')}
                        </span>
                      </div>
                      <div className="text-slate-200">
                        العملية: <span className="font-bold text-[#13A879]">{log.actionType}</span>
                        {log.athleteBib && <span className="font-mono text-[#60A5FA] mr-2">صدرية #{log.athleteBib}</span>}
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

              <div className="pt-2 border-t border-[#1E293B] flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="py-2 px-4 rounded-xl bg-[#0E172A] hover:bg-[#1E293B] text-slate-300 text-xs font-bold"
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
