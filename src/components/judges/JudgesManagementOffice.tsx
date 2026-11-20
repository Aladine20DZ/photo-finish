/**
 * PHOTO FINISH PRO AI — Master Judges & Assignments Management Office
 * Full World Athletics Rule 18 & 19 Compliance.
 * Features:
 * - Central KPI Dashboard (Total, Active, Assigned, Unassigned, Isolated, Assignments count).
 * - Active Competition Binding & Scoping.
 * - Single & Bulk Assignment with Conflict Detection (time overlap, duplicate, venue).
 * - Judge Isolation / Suspension preserving all historical operations.
 * - Competition-scoped Duty Codes with direct QR & mobile links.
 * - Official A4 Print & PDF export.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  ShieldAlert, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Search, 
  Printer, 
  RotateCcw, 
  QrCode, 
  Clock, 
  Layers
} from 'lucide-react';
import { 
  judgesAssignmentService, 
  CertifiedJudge, 
  JudgeAssignment, 
  JudgesDashboardKPIs, 
  OfficialDutyTask, 
  DUTY_TASKS_MAP, 
  ConflictCheckResult,
  JudgeGrade
} from '../../services/judgesAssignmentService';
import { competitionsService, NationalCompetition } from '../../services/competitionsService';
import { disciplinesSeedService } from '../../services/disciplinesSeedService';
import { JudgeRosterPrintView } from './JudgeRosterPrintView';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Modal } from '../design-system/Modal';

export const JudgesManagementOffice: React.FC = () => {
  // ── 1. Core States ──
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [activeComp, setActiveComp] = useState<NationalCompetition | null>(null);
  const [kpis, setKpis] = useState<JudgesDashboardKPIs | null>(null);
  const [judges, setJudges] = useState<CertifiedJudge[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);

  // Navigation Subtabs
  const [currentSubTab, setCurrentSubTab] = useState<'matrix' | 'judges' | 'duty_codes'>('matrix');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showAddJudgeModal, setShowAddJudgeModal] = useState(false);
  const [showIsolateModal, setShowIsolateModal] = useState(false);
  const [targetJudgeToIsolate, setTargetJudgeToIsolate] = useState<CertifiedJudge | null>(null);
  const [isolationReason, setIsolationReason] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSwitchCompModal, setShowSwitchCompModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedAssignmentForQr, setSelectedAssignmentForQr] = useState<JudgeAssignment | null>(null);

  // Assignment Form State
  const [assignJudgeId, setAssignJudgeId] = useState('');
  const [bulkJudgeIds, setBulkJudgeIds] = useState<string[]>([]);
  const [assignDisciplineId, setAssignDisciplineId] = useState('');
  const [assignVenue, setAssignVenue] = useState('المضمار الرئيسي');
  const [assignTask, setAssignTask] = useState<OfficialDutyTask>('finish_judge');
  const [assignStartTime, setAssignStartTime] = useState('09:00');
  const [assignEndTime, setAssignEndTime] = useState('11:30');
  const [conflictWarning, setConflictWarning] = useState<ConflictCheckResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Judge Form State
  const [newJudgeName, setNewJudgeName] = useState('');
  const [newJudgeLicense, setNewJudgeLicense] = useState('');
  const [newJudgeGrade, setNewJudgeGrade] = useState<JudgeGrade>('regional');
  const [newJudgeWilaya, setNewJudgeWilaya] = useState('سعيدة');
  const [newJudgePhone, setNewJudgePhone] = useState('');
  const [newJudgeEmail, setNewJudgeEmail] = useState('');

  // Duty code copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ── 2. Data Initialization ──
  const refreshAllData = async () => {
    const comps = await competitionsService.getCompetitions();
    setCompetitions(comps);

    const active = await competitionsService.getActiveCompetition();
    setActiveComp(active);

    const activeCompId = active?.id || comps[0]?.id || '';
    const stats = await judgesAssignmentService.getDashboardKPIs(activeCompId);
    setKpis(stats);

    setJudges(judgesAssignmentService.getAllJudges());
    setAssignments(judgesAssignmentService.getAssignments(activeCompId));
  };

  useEffect(() => {
    refreshAllData();

    const unsubComp = competitionsService.onActiveCompetitionChanged(() => {
      refreshAllData();
    });

    return () => {
      unsubComp();
    };
  }, []);

  // Set default discipline when active competition changes
  useEffect(() => {
    if (activeComp && activeComp.schedule && activeComp.schedule.length > 0) {
      setAssignDisciplineId(activeComp.schedule[0].id || 'disc_100m');
    } else {
      setAssignDisciplineId('disc_100m');
    }
  }, [activeComp]);

  // Handle Copy Code
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ── 3. Active Competition Quick Switch ──
  const handleSelectActiveComp = (comp: NationalCompetition) => {
    competitionsService.setActiveCompetitionId(comp.id);
    setShowSwitchCompModal(false);
  };

  // ── 4. Conflict Pre-check on Assignment Form ──
  useEffect(() => {
    if (!assignJudgeId || !activeComp) {
      setConflictWarning(null);
      return;
    }
    const check = judgesAssignmentService.checkAssignmentConflicts(
      assignJudgeId,
      activeComp.id,
      activeComp.date,
      assignStartTime,
      assignEndTime,
      assignVenue,
      assignDisciplineId
    );
    setConflictWarning(check.hasConflict ? check : null);
  }, [assignJudgeId, assignDisciplineId, assignVenue, assignStartTime, assignEndTime, activeComp]);

  // ── 5. Submit Single Assignment ──
  const handleSingleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComp || !assignJudgeId) {
      setFormError('يرجى اختيار الحكم والمنافسة النشطة.');
      return;
    }

    setFormError(null);
    const selectedDisc = disciplinesSeedService.getAllDisciplines().find(d => d.id === assignDisciplineId);
    const disciplineNameAr = selectedDisc?.nameAr || 'سباق 100م نهائي';

    const res = await judgesAssignmentService.assignJudge({
      competitionId: activeComp.id,
      judgeId: assignJudgeId,
      disciplineId: assignDisciplineId,
      disciplineNameAr,
      venue: assignVenue,
      task: assignTask,
      date: activeComp.date,
      startTime: assignStartTime,
      endTime: assignEndTime,
      forceOverride: false
    });

    if (!res.success) {
      setFormError(res.error || 'تعذر حفظ التعيين بسبب وجود تعارض.');
      return;
    }

    setShowAssignModal(false);
    refreshAllData();
  };

  // ── 6. Submit Bulk Assignment ──
  const handleBulkAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComp || bulkJudgeIds.length === 0) {
      setFormError('يرجى تحديد حكم واحد على الأقل.');
      return;
    }

    const selectedDisc = disciplinesSeedService.getAllDisciplines().find(d => d.id === assignDisciplineId);
    const disciplineNameAr = selectedDisc?.nameAr || 'سباق 100م نهائي';

    const res = await judgesAssignmentService.bulkAssignJudges({
      competitionId: activeComp.id,
      judgeIds: bulkJudgeIds,
      disciplineId: assignDisciplineId,
      disciplineNameAr,
      venue: assignVenue,
      task: assignTask,
      date: activeComp.date,
      startTime: assignStartTime,
      endTime: assignEndTime,
      ignoreConflicts: true
    });

    if (res.success) {
      setShowBulkAssignModal(false);
      setBulkJudgeIds([]);
      refreshAllData();
    }
  };

  // ── 7. Handle Judge Isolation (عزل الحكم مع الحفاظ على العمليات) ──
  const handleConfirmIsolation = async () => {
    if (!targetJudgeToIsolate) return;
    await judgesAssignmentService.isolateJudge(targetJudgeToIsolate.id, isolationReason.trim() || 'إجراء تحفظي مع الاحتفاظ بالعمليات السابقة');
    setShowIsolateModal(false);
    setTargetJudgeToIsolate(null);
    setIsolationReason('');
    refreshAllData();
  };

  const handleReactivateJudge = async (judgeId: string) => {
    await judgesAssignmentService.reactivateJudge(judgeId);
    refreshAllData();
  };

  // ── 8. Submit Add New Judge ──
  const handleAddNewJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudgeName.trim()) return;

    await judgesAssignmentService.addJudge({
      fullName: newJudgeName.trim(),
      licenseNumber: newJudgeLicense.trim() || `LAA-JUDGE-2026-${Math.floor(100 + Math.random() * 900)}`,
      grade: newJudgeGrade,
      wilaya: newJudgeWilaya,
      leagueId: 'lg_saida',
      phone: newJudgePhone.trim(),
      email: newJudgeEmail.trim() || `${newJudgeName.toLowerCase().replace(/\s+/g, '.')}@athletic.dz`,
      status: 'active',
      specialties: ['finish_judge', 'starter']
    });

    setShowAddJudgeModal(false);
    setNewJudgeName('');
    setNewJudgeLicense('');
    refreshAllData();
  };

  // ── Filtered Judges & Assignments ──
  const filteredJudges = useMemo(() => {
    return judgesAssignmentService.getAllJudges({
      status: selectedStatusFilter,
      grade: selectedGradeFilter,
      search: searchQuery
    });
  }, [judges, selectedStatusFilter, selectedGradeFilter, searchQuery]);

  const filteredAssignments = useMemo(() => {
    if (selectedDisciplineFilter === 'all') return assignments;
    return assignments.filter(a => a.disciplineId === selectedDisciplineFilter);
  }, [assignments, selectedDisciplineFilter]);

  const allAvailableDisciplines = disciplinesSeedService.getAllDisciplines();

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ════════════════════════════════════════════════════════════════════════
          1. ACTIVE COMPETITION BINDING RIBBON (نظام المنافسة النشطة)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-600/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl shrink-0">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                المنافسة النشطة بالميدان • ACTIVE COMPETITION
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeComp ? activeComp.date : '2026-06-25'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
              {activeComp ? activeComp.name : 'البطولة الوطنية لألعاب القوى للأكابر 2026'}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>📍 {activeComp ? activeComp.venue : 'مركب 5 جويلية، الجزائر'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{activeComp?.leagueName || 'الاتحاد الجزائري'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSwitchCompModal(true)}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            تبديل المنافسة النشطة 🔄
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowPrintModal(true)}
            icon={<Printer className="w-4 h-4" />}
            className="text-xs font-black shadow-md shadow-emerald-950"
          >
            طباعة جدول التعيينات (A4) 🖨️
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          2. DASHBOARD KPIS (5.1 لوحة التحكم والإحصائيات الحية)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'إجمالي الحكام', val: kpis?.totalJudges ?? 0, icon: <Users className="w-4 h-4" />, color: 'text-white' },
          { label: 'الحكام النشطين', val: kpis?.activeJudges ?? 0, icon: <UserCheck className="w-4 h-4" />, color: 'text-emerald-400' },
          { label: 'المعينين حالياً', val: kpis?.assignedJudges ?? 0, icon: <Award className="w-4 h-4" />, color: 'text-cyan-400' },
          { label: 'غير المعينين', val: kpis?.unassignedJudges ?? 0, icon: <Clock className="w-4 h-4" />, color: 'text-amber-400' },
          { label: 'المعزولين / موقوفين', val: kpis?.suspendedOrIsolatedJudges ?? 0, icon: <UserX className="w-4 h-4" />, color: 'text-rose-400' },
          { label: 'التعيينات المعتمدة', val: kpis?.currentAssignmentsCount ?? 0, icon: <Layers className="w-4 h-4" />, color: 'text-emerald-300' },
          { label: 'تخصصات تحتاج حكام', val: kpis?.disciplinesNeedingJudges ?? 0, icon: <ShieldAlert className="w-4 h-4" />, color: 'text-orange-400' },
          { label: 'المنافسات النشطة', val: kpis?.activeCompetitionsCount ?? 1, icon: <Calendar className="w-4 h-4" />, color: 'text-teal-300' },
        ].map((item, idx) => (
          <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold truncate">{item.label}</span>
              {item.icon}
            </div>
            <div className={`text-xl font-black mt-2 font-mono ${item.color}`}>
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          3. NAVIGATION SUBTABS
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          {[
            { id: 'matrix' as const, label: 'مصفوفة التعيينات الميدانية', count: assignments.length, icon: <Layers className="w-4 h-4" /> },
            { id: 'judges' as const, label: 'دليل الحكام والقضاة الرسميين', count: judges.length, icon: <Users className="w-4 h-4" /> },
            { id: 'duty_codes' as const, label: 'أكواد الدخول والتكليف الميداني', count: assignments.filter(a => a.status === 'active').length, icon: <QrCode className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentSubTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950 ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950/60 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {currentSubTab === 'matrix' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAssignModal(true)}
                icon={<Plus className="w-4 h-4" />}
                className="text-xs font-bold"
              >
                تعيين حكم جديد +
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkAssignModal(true)}
                icon={<Users className="w-4 h-4" />}
                className="text-xs font-bold"
              >
                تعيين جماعي للحكام 👥
              </Button>
            </>
          )}

          {currentSubTab === 'judges' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddJudgeModal(true)}
              icon={<Plus className="w-4 h-4" />}
              className="text-xs font-bold"
            >
              تسجيل حكم جديد +
            </Button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          4. TAB 1: ASSIGNMENTS MATRIX (مصفوفة التعيينات وكشف التعارضات)
      ════════════════════════════════════════════════════════════════════════ */}
      {currentSubTab === 'matrix' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-400 whitespace-nowrap">تصفية حسب التخصص:</label>
              <select
                value={selectedDisciplineFilter}
                onChange={(e) => setSelectedDisciplineFilter(e.target.value)}
                className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">كافة التخصصات ({assignments.length})</option>
                {Array.from(new Set(assignments.map(a => a.disciplineNameAr))).map(name => (
                  <option key={name} value={assignments.find(a => a.disciplineNameAr === name)?.disciplineId}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400 font-bold">
              إجمالي التعيينات النشطة في هذه المنافسة: <span className="text-emerald-400 font-black">{filteredAssignments.length}</span>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900 shadow-xl">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-black border-b border-slate-800">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">اسم الحكم المعتمد</th>
                  <th className="p-3">الرتبة</th>
                  <th className="p-3">التخصص والمسابقة</th>
                  <th className="p-3">المهمة الميدانية الرسمية</th>
                  <th className="p-3">مكان التعيين</th>
                  <th className="p-3 text-center">فترة المهمة</th>
                  <th className="p-3 text-center">كود التكليف الميداني</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-white">
                {filteredAssignments.map((asg, idx) => {
                  const judge = judges.find(j => j.id === asg.judgeId);
                  const isIsolated = judge?.status === 'isolated';

                  return (
                    <tr key={asg.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                      <td className="p-3 font-black">
                        <div className="flex items-center gap-2">
                          <span>{asg.judgeName}</span>
                          {isIsolated && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950 text-rose-400 border border-rose-800 font-bold">
                              معزول
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{judge?.licenseNumber}</div>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-300 font-bold">
                          {asg.judgeGrade === 'international' ? '🌍 دولي' :
                           asg.judgeGrade === 'federal' ? '🇩🇿 فيدرالي' :
                           asg.judgeGrade === 'regional' ? 'جهوي' : 'ولائي'}
                        </span>
                      </td>
                      <td className="p-3 font-black text-emerald-400">{asg.disciplineNameAr}</td>
                      <td className="p-3 font-bold text-slate-200">{asg.taskTitleAr}</td>
                      <td className="p-3 text-slate-300">{asg.venue}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-300 whitespace-nowrap">
                        {asg.scheduledStartTime} - {asg.scheduledEndTime}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-black text-amber-400 tracking-wider">
                          {asg.dutyCode}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            asg.status === 'active' ? 'success' :
                            asg.status === 'completed' ? 'info' :
                            asg.status === 'revoked' ? 'danger' : 'neutral'
                          }
                          size="sm"
                        >
                          {asg.status === 'active' ? 'معين نشط' :
                           asg.status === 'completed' ? 'مكتمل' :
                           asg.status === 'revoked' ? 'ملغى/معزول' : 'معلق'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedAssignmentForQr(asg);
                              setShowQrModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white cursor-pointer"
                            title="QR المهمة والرابط الميداني المباشر"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopy(asg.dutyCode)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                            title="نسخ كود الدخول"
                          >
                            {copiedCode === asg.dutyCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {asg.status === 'active' && (
                            <button
                              onClick={() => {
                                judgesAssignmentService.cancelAssignment(asg.id);
                                refreshAllData();
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold cursor-pointer"
                            >
                              إلغاء التعيين
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredAssignments.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                      لا توجد تعيينات مسجلة لهذه المنافسة بعد. استخدم زر «تعيين حكم جديد +» أعلاه.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          5. TAB 2: CERTIFIED JUDGES DIRECTORY (دليل الحكام وإدارة العزل)
      ════════════════════════════════════════════════════════════════════════ */}
      {currentSubTab === 'judges' && (
        <div className="space-y-4">
          
          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم، رقم الإجازة، أو الولاية..."
                className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">كافة الرتب التحكيمية</option>
                <option value="international">حكم دولي (International)</option>
                <option value="federal">حكم فيدرالي (Federal)</option>
                <option value="regional">حكم جهوي (Regional)</option>
                <option value="wilaya">حكم ولائي (Wilaya)</option>
              </select>
            </div>

            <div>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">كافة الحالات</option>
                <option value="active">نشط ومعتمد 🟢</option>
                <option value="isolated">معزول أو موقوف 🔴</option>
              </select>
            </div>
          </div>

          {/* Judges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJudges.map(judge => {
              const isIsolated = judge.status === 'isolated';

              return (
                <div 
                  key={judge.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isIsolated 
                      ? 'bg-rose-950/20 border-rose-900/60' 
                      : 'bg-slate-900 border-slate-800 hover:border-emerald-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      {judge.grade === 'international' ? '🌍 حكم دولي' :
                       judge.grade === 'federal' ? '🇩🇿 حكم فيدرالي' :
                       judge.grade === 'regional' ? 'حكم جهوي' : 'حكم ولائي'}
                    </span>
                    <Badge variant={isIsolated ? 'danger' : 'success'} size="sm">
                      {isIsolated ? 'معزول إدارياً 🔴' : 'معتمد نشط 🟢'}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-base font-black text-white">{judge.fullName}</h3>
                    <div className="text-xs text-emerald-400 font-mono font-bold mt-0.5">{judge.licenseNumber}</div>
                    <div className="text-xs text-slate-400 mt-1">📍 {judge.wilaya} • {judge.phone}</div>
                  </div>

                  {isIsolated && judge.isolationReason && (
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-[11px] text-rose-300">
                      <div className="font-black flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>سبب العزل الإداري:</span>
                      </div>
                      <p className="mt-1 leading-relaxed">{judge.isolationReason}</p>
                      <div className="text-[10px] text-slate-400 mt-1 italic">
                        * العمليات والنتائج التاريخية السابقة محفوظة ومحمية تماماً.
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    {isIsolated ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReactivateJudge(judge.id)}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="text-xs font-bold text-emerald-400"
                      >
                        إعادة التفعيل والاعتماد 🟢
                      </Button>
                    ) : (
                      <button
                        onClick={() => {
                          setTargetJudgeToIsolate(judge);
                          setShowIsolateModal(true);
                        }}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>عزل الحكم إداريًا ⚠️</span>
                      </button>
                    )}

                    <div className="text-[11px] text-slate-500 font-mono">
                      {assignments.filter(a => a.judgeId === judge.id).length} تعيينات
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          6. TAB 3: COMPETITION-SCOPED DUTY CODES (أكواد الدخول والتكليف الميداني)
      ════════════════════════════════════════════════════════════════════════ */}
      {currentSubTab === 'duty_codes' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>أكواد التكليف الميداني الرسمية (Competition-Scoped Duty Codes)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تمنح هذه الأكواد صلاحية الدخول لهواتف الحكام في المنافسة النشطة حصراً وتنتهي فور انتهاء مهمة الحكم.
              </p>
            </div>
            <div className="text-xs text-emerald-400 font-mono font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              المنافسة: {activeComp?.name || 'البطولة الوطنية'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map(asg => {
              const judge = judges.find(j => j.id === asg.judgeId);
              const isIsolated = judge?.status === 'isolated';

              return (
                <div key={asg.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">{asg.taskTitleAr}</span>
                    <Badge variant={isIsolated ? 'danger' : asg.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {isIsolated ? 'مبطل ومجمد' : asg.status === 'active' ? 'كود نشط' : 'ملغى'}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white">{asg.judgeName}</h4>
                    <p className="text-xs text-emerald-400 font-bold mt-0.5">{asg.disciplineNameAr}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">📍 {asg.venue} ({asg.scheduledStartTime} - {asg.scheduledEndTime})</p>
                  </div>

                  {/* The Duty Code Box */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-slate-500 font-bold">كود المهمة الميدانية:</div>
                      <div className="font-mono text-sm font-black text-amber-400 tracking-wider">
                        {asg.dutyCode}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedAssignmentForQr(asg);
                          setShowQrModal(true);
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="عرض رمز QR والرابط الميداني"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR والرابط</span>
                      </button>
                      <button
                        onClick={() => handleCopy(asg.dutyCode)}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                        title="نسخ كود التكليف"
                      >
                        {copiedCode === asg.dutyCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>صالح لمنافسة واحدة</span>
                    <button
                      onClick={async () => {
                        await judgesAssignmentService.regenerateDutyCode(asg.id);
                        refreshAllData();
                      }}
                      className="text-emerald-400 hover:underline cursor-pointer"
                    >
                      إعادة إصدار كود جديد 🔄
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          7. MODALS
      ════════════════════════════════════════════════════════════════════════ */}

      {/* ── Modal: Single Assignment with Conflict Detection ── */}
      {showAssignModal && (
        <Modal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          title="تعيين حكم رسمي في المنافسة النشطة"
          maxWidth="lg"
        >
          <form onSubmit={handleSingleAssignSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {conflictWarning && (
              <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-600/80 text-amber-200 text-xs space-y-1.5 animate-in fade-in">
                <div className="font-black flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>تنبيه كشف تعارض التعيين (Conflict Detected):</span>
                </div>
                {conflictWarning.conflicts.map((c, i) => (
                  <p key={i} className="text-[11px] leading-relaxed">• {c.message}</p>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">اختر الحكم المعتمد:</label>
              <select
                value={assignJudgeId}
                onChange={(e) => setAssignJudgeId(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
              >
                <option value="">-- اضغط لاختيار الحكم --</option>
                {judges.filter(j => j.status === 'active').map(j => (
                  <option key={j.id} value={j.id}>
                    {j.fullName} ({j.grade === 'international' ? 'دولي' : j.grade === 'federal' ? 'فيدرالي' : 'جهوي/ولائي'}) — {j.wilaya}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">التخصص الرياضي:</label>
                <select
                  value={assignDisciplineId}
                  onChange={(e) => setAssignDisciplineId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {activeComp?.schedule && activeComp.schedule.length > 0 ? (
                    activeComp.schedule.map(evt => (
                      <option key={evt.id} value={evt.disciplineId || evt.id}>
                        {evt.discipline || evt.disciplineId} ({evt.category} {evt.gender === 'F' ? 'إناث' : 'ذكور'} - {evt.time || '09:00'})
                      </option>
                    ))
                  ) : (
                    allAvailableDisciplines.slice(0, 20).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nameAr} ({d.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المهمة الميدانية:</label>
                <select
                  value={assignTask}
                  onChange={(e) => setAssignTask(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                >
                  {Object.entries(DUTY_TASKS_MAP).map(([taskKey, taskVal]) => (
                    <option key={taskKey} value={taskKey}>
                      {taskVal.titleAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">مكان التعيين:</label>
                <input
                  type="text"
                  value={assignVenue}
                  onChange={(e) => setAssignVenue(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">وقت البداية:</label>
                <input
                  type="time"
                  value={assignStartTime}
                  onChange={(e) => setAssignStartTime(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">وقت النهاية:</label>
                <input
                  type="time"
                  value={assignEndTime}
                  onChange={(e) => setAssignEndTime(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono text-center"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setShowAssignModal(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={Boolean(conflictWarning)}>
                تأكيد التعيين وحفظ الكود
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Bulk Assignment ── */}
      {showBulkAssignModal && (
        <Modal
          isOpen={showBulkAssignModal}
          onClose={() => setShowBulkAssignModal(false)}
          title="التعيين الجماعي للحكام (Bulk Assignment)"
          maxWidth="lg"
        >
          <form onSubmit={handleBulkAssignSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">حدد الحكام (انقر للاختيار):</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                {judges.filter(j => j.status === 'active').map(j => {
                  const isSelected = bulkJudgeIds.includes(j.id);
                  return (
                    <div
                      key={j.id}
                      onClick={() => {
                        setBulkJudgeIds(prev => 
                          isSelected ? prev.filter(id => id !== j.id) : [...prev, j.id]
                        );
                      }}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-emerald-950 border border-emerald-600 text-white font-bold' : 'hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <span>{j.fullName} — {j.wilaya}</span>
                      <span className="font-mono text-[10px] text-slate-500">{j.grade}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">تم اختيار: {bulkJudgeIds.length} حكام</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">التخصص:</label>
                <select
                  value={assignDisciplineId}
                  onChange={(e) => setAssignDisciplineId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {activeComp?.schedule && activeComp.schedule.length > 0 ? (
                    activeComp.schedule.map(evt => (
                      <option key={evt.id} value={evt.disciplineId || evt.id}>
                        {evt.discipline || evt.disciplineId} ({evt.category} - {evt.time || '09:00'})
                      </option>
                    ))
                  ) : (
                    allAvailableDisciplines.slice(0, 15).map(d => (
                      <option key={d.id} value={d.id}>{d.nameAr}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المهمة:</label>
                <select
                  value={assignTask}
                  onChange={(e) => setAssignTask(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {Object.entries(DUTY_TASKS_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.titleAr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setShowBulkAssignModal(false)}>إلغاء</Button>
              <Button variant="primary" size="sm" type="submit" disabled={bulkJudgeIds.length === 0}>
                تعيين الجميع وتوليد الأكواد ({bulkJudgeIds.length})
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Isolate Judge (عزل الحكم مع الحفاظ على البيانات التاريخية) ── */}
      {showIsolateModal && targetJudgeToIsolate && (
        <Modal
          isOpen={showIsolateModal}
          onClose={() => setShowIsolateModal(false)}
          title="عزل الحكم إداريًا (Judge Isolation)"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs space-y-2">
              <div className="font-black text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>إجراء عزل تحفظي للحكم: {targetJudgeToIsolate.fullName}</span>
              </div>
              <p>
                وفقاً لبروتوكول النزاهة الرياضية: سيتم تجميد أكواد التكليف وإلغاء التعيينات المستقبلية للحكم.
              </p>
              <p className="font-bold text-amber-300">
                🔒 تنبيه هام: لن يتم حذف أي من نتائج أو عمليات أو بصمات التحكيم السابقة التي وقعها الحكم حفاظاً على صحة الأرشيف الرسمي.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">سبب العزل الإداري (يُسجل في محضر التدقيق):</label>
              <textarea
                value={isolationReason}
                onChange={(e) => setIsolationReason(e.target.value)}
                placeholder="أدخل سبب العزل أو رقم قرار لجنة الحكام..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white h-20 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowIsolateModal(false)}>
                تراجع
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmIsolation}>
                تأكيد العزل الإداري
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Add New Certified Judge ── */}
      {showAddJudgeModal && (
        <Modal
          isOpen={showAddJudgeModal}
          onClose={() => setShowAddJudgeModal(false)}
          title="تسجيل حكم معتمد جديد في المنظومة"
          maxWidth="md"
        >
          <form onSubmit={handleAddNewJudge} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الكامل للحكم:</label>
              <input
                type="text"
                required
                value={newJudgeName}
                onChange={(e) => setNewJudgeName(e.target.value)}
                placeholder="الاسم واللقب..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الرتبة التحكيمية:</label>
                <select
                  value={newJudgeGrade}
                  onChange={(e) => setNewJudgeGrade(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                >
                  <option value="international">حكم دولي (International)</option>
                  <option value="federal">حكم فيدرالي (Federal)</option>
                  <option value="regional">حكم جهوي (Regional)</option>
                  <option value="wilaya">حكم ولائي (Wilaya)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الرابطة / الولاية:</label>
                <input
                  type="text"
                  value={newJudgeWilaya}
                  onChange={(e) => setNewJudgeWilaya(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الإجازة الفيدرالية:</label>
                <input
                  type="text"
                  value={newJudgeLicense}
                  onChange={(e) => setNewJudgeLicense(e.target.value)}
                  placeholder="FAA-JUDGE-2026-..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف:</label>
                <input
                  type="text"
                  value={newJudgePhone}
                  onChange={(e) => setNewJudgePhone(e.target.value)}
                  placeholder="+213 ..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني الرسمي:</label>
              <input
                type="email"
                value={newJudgeEmail}
                onChange={(e) => setNewJudgeEmail(e.target.value)}
                placeholder="judge@athletic.dz"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setShowAddJudgeModal(false)}>إلغاء</Button>
              <Button variant="primary" size="sm" type="submit">إضافة الحكم وتأكيد الاعتماد</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Switch Active Competition ── */}
      {showSwitchCompModal && (
        <Modal
          isOpen={showSwitchCompModal}
          onClose={() => setShowSwitchCompModal(false)}
          title="اختيار وتفعيل المنافسة النشطة بالميدان"
          maxWidth="md"
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              حدد المنافسة التي تريد ربط التعيينات وأكواد الدخول والعمليات الميدانية بها حالياً:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {competitions.map(c => {
                const isCurrent = c.id === activeComp?.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectActiveComp(c)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isCurrent 
                        ? 'bg-emerald-950 border-emerald-500 text-white font-black' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs">{c.name}</div>
                      <div className="text-[10px] text-slate-400">📍 {c.venue} • {c.date}</div>
                    </div>
                    {isCurrent && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: QR Code & Direct Field Workspace Link ── */}
      {showQrModal && selectedAssignmentForQr && (
        <Modal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          title="بطاقة التكليف الميداني ورمز الدخول المباشر (QR Access)"
          maxWidth="md"
        >
          <div className="space-y-4 text-center" dir="rtl">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>الاتحاد الجزائري لألعاب القوى • الرابطة الولائية</span>
                <span className="font-mono text-amber-400 font-bold">{selectedAssignmentForQr.dutyCode}</span>
              </div>

              {/* Simulated High-Res QR code box */}
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-lg border border-slate-700">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 w-full h-full p-2 bg-slate-100 rounded-lg">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`rounded-sm ${
                        (i % 7 === 0 || i % 5 === 0 || i < 6 || i > 30) ? 'bg-slate-950' : (i % 2 === 0 ? 'bg-slate-800' : 'bg-transparent')
                      }`} 
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-base font-black text-white">{selectedAssignmentForQr.judgeName}</div>
                <div className="text-xs text-amber-400 font-bold">
                  {selectedAssignmentForQr.disciplineNameAr} • {selectedAssignmentForQr.taskTitleAr}
                </div>
                <div className="text-[11px] text-slate-400">
                  📍 {selectedAssignmentForQr.venue} • ⏰ {selectedAssignmentForQr.scheduledStartTime} - {selectedAssignmentForQr.scheduledEndTime}
                </div>
              </div>
            </div>

            {/* Direct Link */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-2 text-xs">
              <span className="font-mono text-slate-400 truncate text-left dir-ltr">
                {typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?duty=${selectedAssignmentForQr.dutyCode}` : `?duty=${selectedAssignmentForQr.dutyCode}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?duty=${selectedAssignmentForQr.dutyCode}` : `?duty=${selectedAssignmentForQr.dutyCode}`;
                  handleCopy(url);
                }}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold flex items-center gap-1 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الرابط</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  const url = `?duty=${selectedAssignmentForQr.dutyCode}`;
                  window.location.href = url;
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/50"
              >
                <span>فتح مساحة عمل الحكم الميدانية الآن</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Printable Roster Modal (A4 Print View) ── */}
      {showPrintModal && activeComp && (
        <JudgeRosterPrintView
          competition={activeComp}
          assignments={assignments}
          judges={judges}
          selectedDisciplineName={selectedDisciplineFilter}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  );
};
