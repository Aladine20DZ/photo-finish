/**
 * PHOTO FINISH PRO AI — Competitions Bureau Workspace (Phase E - Track Pro Design System)
 * High-contrast, WCAG AA compliant bureau interface for live competition operations,
 * official discipline PV certification, tamper-evident audit logging, and multi-format export.
 *
 * Architecture:
 * - Dual-Split Layout: Side Panel (Right: Competition Selector & Disciplines Directory)
 *                     + Main Panel (Left: High-density Discipline Results & Operations Tables).
 * - Full Discipline Certification Lifecycle: Draft -> Under Review -> Certified (with official PV number & 3 signatures).
 * - Multi-Format Official Export: PDF, Word (.docx), Excel (.xlsx) with Federation & League headers.
 * - Archiving & Device Purge Integration: Finish competition, archive records safely, broadcast device wipe.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  CheckCircle2,
  Smartphone,
  RefreshCw,
  Filter,
  Search,
  Printer,
  FileSpreadsheet,
  FileText,
  Edit2,
  Check,
  X,
  History,
  Layers,
  Clock,
  Wind,
  ShieldAlert,
  ChevronDown,
  ChevronLeft,
  AlertCircle,
  FileCheck,
  Eye,
  Unlock,
  Award,
  CheckCircle,
  Lock,
  QrCode,
  Radio,
  CheckCheck,
  Ban,
  RotateCcw
} from 'lucide-react';
import { 
  competitionsBureauService, 
  BureauDisciplineWithOps, 
  BureauJudgeOperation, 
  AuditTrailEntry,
  OperationLifecycleStatus
} from '../../services/competitionsBureauService';
import { NationalCompetition } from '../../services/competitionsService';
import { devicePurgeArchiveService, DevicePurgeAuditLog } from '../../services/devicePurgeArchiveService';
import { portalAuthService } from '../../services/portalAuthService';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';
import { Badge } from '../design-system/Badge';
import { StatusPill } from '../design-system/StatusPill';
import { Modal } from '../design-system/Modal';
import { SplitLayout } from '../design-system/SplitLayout';
import { OfficialFederationHeader, OfficialFederationFooter } from '../athletics/OfficialFederationHeader';

export interface CompetitionsBureauWorkspaceProps {
  initialCompetitionId?: string;
  onClose?: () => void;
}

export const CompetitionsBureauWorkspace: React.FC<CompetitionsBureauWorkspaceProps> = ({
  initialCompetitionId,
  onClose
}) => {
  // ── States ────────────────────────────────────────────────────────────────
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>(initialCompetitionId || '');
  const [disciplines, setDisciplines] = useState<BureauDisciplineWithOps[]>([]);
  const [activeDisciplineFilter, setActiveDisciplineFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Sync initialCompetitionId if updated externally
  useEffect(() => {
    if (initialCompetitionId && initialCompetitionId !== selectedCompId) {
      handleCompetitionChange(initialCompetitionId);
    }
  }, [initialCompetitionId]);

  // Inline Editing State
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<BureauJudgeOperation>>({});
  const [editReason, setEditReason] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Certification Modal States
  const [certifyingDiscipline, setCertifyingDiscipline] = useState<BureauDisciplineWithOps | null>(null);
  const [certSignatures, setCertSignatures] = useState({
    chiefJudge: 'الحكم العام الفيدرالي',
    timingJudge: 'رئيس قضاة الميقاتية (FAT)',
    trackJudge: 'رئيس قضاة الميدان والمضمار'
  });
  const [isCertifying, setIsCertifying] = useState<boolean>(false);

  // Reopen Modal States
  const [reopeningDiscipline, setReopeningDiscipline] = useState<BureauDisciplineWithOps | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [isReopening, setIsReopening] = useState<boolean>(false);

  // Official PV Preview Modal State
  const [previewingDiscipline, setPreviewingDiscipline] = useState<BureauDisciplineWithOps | null>(null);

  // Device Purge & Archive States
  const [isFinishModalOpen, setIsFinishModalOpen] = useState<boolean>(false);
  const [isPurgeLogsModalOpen, setIsPurgeLogsModalOpen] = useState<boolean>(false);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [purgeLogs, setPurgeLogs] = useState<DevicePurgeAuditLog[]>([]);

  // Audit Trail Modal State
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditTargetOp, setAuditTargetOp] = useState<BureauJudgeOperation | null>(null);
  const [auditLogsList, setAuditLogsList] = useState<AuditTrailEntry[]>([]);

  // Export Header Customization Modal
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word' | 'excel'>('pdf');
  const [exportDisciplineTarget, setExportDisciplineTarget] = useState<string | 'all'>('all');
  const [customHeader, setCustomHeader] = useState<{
    leagueName: string;
    competitionName: string;
    venue: string;
    date: string;
    chiefJudgeName: string;
  }>({
    leagueName: '',
    competitionName: '',
    venue: '',
    date: '',
    chiefJudgeName: 'الحكم العام الفيدرالي'
  });

  // Realtime Judge Passages Feed States (Phase E)
  const [realtimePassageCount, setRealtimePassageCount] = useState<number>(0);
  const [lastRealtimePassage, setLastRealtimePassage] = useState<{
    athleteName: string;
    mark: string;
    disciplineName: string;
    timestamp: string;
  } | null>(null);

  // Operation Rejection Modal States (Phase E)
  const [rejectModalData, setRejectModalData] = useState<{
    discId: string;
    opId: string;
    athleteName: string;
    bibNumber: number;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Current User Session
  const activeSession = portalAuthService.getActiveSession();
  const currentLeague = portalAuthService.getAllLeagues()[0];

  // ── Initial Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const comps = await competitionsBureauService.getCompetitions();
        setCompetitions(comps);
        const targetId = initialCompetitionId || comps[0]?.id || '';
        setSelectedCompId(targetId);

        if (targetId) {
          const discs = await competitionsBureauService.getCompetitionDisciplinesWithOperations(targetId);
          setDisciplines(discs);
          const targetComp = comps.find(c => c.id === targetId);
          if (targetComp) {
            setCustomHeader({
              leagueName: targetComp.leagueName || currentLeague?.name || 'الرابطة الولائية لألعاب القوى',
              competitionName: targetComp.name,
              venue: targetComp.venue,
              date: targetComp.date,
              chiefJudgeName: 'الحكم العام الفيدرالي'
            });
          }
        }
      } catch (e) {
        console.error('Failed loading competitions bureau data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [initialCompetitionId]);

  // Subscribe to live device purge audit logs
  useEffect(() => {
    setPurgeLogs(devicePurgeArchiveService.getPurgeLogs(selectedCompId));
    const unsub = devicePurgeArchiveService.onDevicePurgeLog((newLog) => {
      if (!selectedCompId || newLog.competitionId === selectedCompId) {
        setPurgeLogs((prev: DevicePurgeAuditLog[]) => [newLog, ...prev]);
      }
    });
    return unsub;
  }, [selectedCompId]);

  // Subscribe to real-time mobile judge passages feed (Phase E)
  useEffect(() => {
    if (!selectedCompId) return;
    const unsub = competitionsBureauService.listenToRealtimeJudgePassages(selectedCompId, (passage) => {
      setRealtimePassageCount(prev => prev + 1);
      setLastRealtimePassage({
        athleteName: passage.athleteName || `صدرية #${passage.bibNumber}`,
        mark: passage.mark || '-',
        disciplineName: passage.disciplineId || 'تخصص ميداني',
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      // Silently refresh the disciplines list to display new live operations
      competitionsBureauService.getCompetitionDisciplinesWithOperations(selectedCompId).then(discs => {
        setDisciplines(discs);
      });
    });
    return unsub;
  }, [selectedCompId]);

  // ── Pending Disciplines & Final Completion Security Checks (Phase G) ──
  const pendingDisciplines = useMemo(() => {
    return disciplines.filter(d => {
      const isDisciplineFinal = d.status === 'certified' || d.status === 'rejected' || d.status === 'locked';
      if (!isDisciplineFinal) return true;
      return d.operations.some(op => 
        op.lifecycleStatus && !['certified', 'rejected', 'locked'].includes(op.lifecycleStatus)
      );
    });
  }, [disciplines]);

  const hasFinishPermission = useMemo(() => {
    const session = portalAuthService.getActiveSession();
    return session?.portal === 'league' || session?.portal === 'admin';
  }, []);

  const canFinishCompetition = hasFinishPermission && pendingDisciplines.length === 0;

  // Handle Competition Finish & Archive
  const handleFinishAndArchive = async () => {
    if (!selectedCompId || !canFinishCompetition) return;
    setIsArchiving(true);
    setSaveError(null);
    try {
      const activeSession = portalAuthService.getActiveSession();
      const res = await devicePurgeArchiveService.finishAndArchiveCompetition(selectedCompId, {
        name: activeSession?.username || 'مكتب الرابطة الولائية',
        role: activeSession?.portal === 'league' ? 'LEAGUE_ADMIN' : 'CHIEF_JUDGE',
        userId: activeSession?.username,
        token: activeSession?.token,
        requireAllResolved: true
      });

      if (res.success) {
        setSaveSuccess('تم إنهاء المنافسة، وأرشفة العمليات، وبث أمر مسح وتطهير هواتف الحكام بنجاح!');
        const updatedComps = await competitionsBureauService.getCompetitions();
        setCompetitions(updatedComps);
        setIsFinishModalOpen(false);
      } else {
        setSaveError(res.error || 'فشلت عملية إنهاء وأرشفة المنافسة');
      }
    } catch (e: any) {
      setSaveError(e?.message || 'حدث خطأ غير متوقع أثناء الأرشفة');
    } finally {
      setIsArchiving(false);
    }
  };

  // Handle Competition Change
  const handleCompetitionChange = async (newCompId: string) => {
    setSelectedCompId(newCompId);
    setLoading(true);
    try {
      const discs = await competitionsBureauService.getCompetitionDisciplinesWithOperations(newCompId);
      setDisciplines(discs);
      const targetComp = competitions.find(c => c.id === newCompId);
      if (targetComp) {
        setCustomHeader({
          leagueName: targetComp.leagueName || currentLeague?.name || 'الرابطة الولائية لألعاب القوى',
          competitionName: targetComp.name,
          venue: targetComp.venue,
          date: targetComp.date,
          chiefJudgeName: 'الحكم العام الفيدرالي'
        });
      }
      setActiveDisciplineFilter('all');
    } finally {
      setLoading(false);
    }
  };

  // Selected Competition Object
  const selectedCompetition = useMemo(() => {
    return competitions.find(c => c.id === selectedCompId) || competitions[0];
  }, [competitions, selectedCompId]);

  // Filtered Disciplines
  const displayedDisciplines = useMemo(() => {
    let list = disciplines;
    if (activeDisciplineFilter !== 'all') {
      list = list.filter(d => d.id === activeDisciplineFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        d.nameAr.toLowerCase().includes(q) ||
        d.operations.some(o => 
          o.athleteName.toLowerCase().includes(q) || 
          o.clubName.toLowerCase().includes(q) ||
          String(o.bibNumber).includes(q)
        )
      );
    }
    return list;
  }, [disciplines, activeDisciplineFilter, searchQuery]);

  // Total operations count & certified count
  const totalOperationsCount = useMemo(() => {
    return disciplines.reduce((sum, d) => sum + d.operations.length, 0);
  }, [disciplines]);

  const certifiedDisciplinesCount = useMemo(() => {
    return disciplines.filter(d => d.status === 'certified').length;
  }, [disciplines]);

  // ── Inline Edit Handlers ──────────────────────────────────────────────────
  const startEditing = (op: BureauJudgeOperation) => {
    setEditingOpId(op.id);
    setEditFormData({
      rank: op.rank,
      bibNumber: op.bibNumber,
      athleteName: op.athleteName,
      clubName: op.clubName,
      laneOrOrder: op.laneOrOrder,
      mark: op.mark,
      windSpeed: op.windSpeed,
      reactionTime: op.reactionTime,
      status: op.status,
      notes: op.notes
    });
    setEditReason('');
    setSaveError(null);
  };

  const cancelEditing = () => {
    setEditingOpId(null);
    setEditFormData({});
    setEditReason('');
    setSaveError(null);
  };

  const handleSaveInline = async (discId: string, opId: string) => {
    setSaveError(null);

    const userContext = {
      name: activeSession?.username || 'مكتب الرابطة الولائية',
      role: activeSession?.portal === 'league' ? 'LEAGUE_ADMIN' : 'CHIEF_JUDGE',
      leagueId: activeSession?.leagueId,
      token: activeSession?.token
    };

    const res = await competitionsBureauService.updateOperationInline(
      selectedCompId,
      discId,
      opId,
      editFormData,
      userContext,
      editReason || 'تعديل تدقيقي واعتماد رسمي من مكتب الرابطة'
    );

    if (!res.success) {
      setSaveError(res.error || 'فشلت عملية التعديل');
      return;
    }

    // Refresh state
    const updatedDiscs = await competitionsBureauService.getCompetitionDisciplinesWithOperations(selectedCompId);
    setDisciplines(updatedDiscs);
    setEditingOpId(null);
    setEditFormData({});
    setEditReason('');
    setSaveSuccess('تم تحديث النتيجة وحفظ سجل التدقيق بنجاح!');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  // ── Operation Lifecycle Handlers (Phase E: Recorded -> Review -> Certified / Rejected -> Locked) ──
  const handleQuickLifecycleChange = async (
    discId: string,
    opId: string,
    newStatus: OperationLifecycleStatus,
    reason?: string
  ) => {
    if (!selectedCompId) return;
    setSaveError(null);
    try {
      const res = await competitionsBureauService.updateOperationLifecycleStatus(
        selectedCompId,
        discId,
        opId,
        newStatus,
        {
          name: activeSession?.username || 'مكتب الرابطة الولائية',
          role: activeSession?.portal === 'league' ? 'LEAGUE_ADMIN' : 'CHIEF_JUDGE',
          token: activeSession?.token
        },
        reason
      );
      if (res.success) {
        const updatedDiscs = await competitionsBureauService.getCompetitionDisciplinesWithOperations(selectedCompId);
        setDisciplines(updatedDiscs);
        setSaveSuccess(
          newStatus === 'certified' ? 'تم اعتماد نتيجة المحاولة/السباق رسمياً ✅' :
          newStatus === 'locked' ? 'تم قفل النتيجة نهائياً 🔒' :
          newStatus === 'under_review' ? 'تمت إعادة النتيجة إلى قيد المراجعة 🔍' :
          'تم تحديث مسار العملية بنجاح'
        );
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        setSaveError(res.error || 'تعذر تغيير مسار العملية');
      }
    } catch (e: any) {
      setSaveError(e?.message || 'حدث خطأ أثناء تحديث مسار العملية');
    }
  };

  const handleOpenRejectModal = (discId: string, op: BureauJudgeOperation) => {
    setRejectModalData({
      discId,
      opId: op.id,
      athleteName: op.athleteName,
      bibNumber: op.bibNumber
    });
    setRejectReason('');
    setSaveError(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectModalData || !selectedCompId) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      setSaveError('سبب الرفض إلزامي بموجب لوائح ألعاب القوى (3 أحرف على الأقل، مثلاً: خروج عن الحارة TR 17.3.1)');
      return;
    }
    setIsRejecting(true);
    setSaveError(null);
    try {
      const res = await competitionsBureauService.updateOperationLifecycleStatus(
        selectedCompId,
        rejectModalData.discId,
        rejectModalData.opId,
        'rejected',
        {
          name: activeSession?.username || 'مكتب الرابطة الولائية',
          role: activeSession?.portal === 'league' ? 'LEAGUE_ADMIN' : 'CHIEF_JUDGE',
          token: activeSession?.token
        },
        rejectReason.trim()
      );
      if (res.success) {
        setSaveSuccess(`تم رفض وتوثيق قرار استبعاد نتيجة (${rejectModalData.athleteName}) بنجاح.`);
        const updatedDiscs = await competitionsBureauService.getCompetitionDisciplinesWithOperations(selectedCompId);
        setDisciplines(updatedDiscs);
        setRejectModalData(null);
        setRejectReason('');
      } else {
        setSaveError(res.error || 'تعذر رفض العملية');
      }
    } catch (e: any) {
      setSaveError(e?.message || 'حدث خطأ أثناء رفض العملية');
    } finally {
      setIsRejecting(false);
      setTimeout(() => setSaveSuccess(null), 3500);
    }
  };

  // ── Certification Handlers (Stage 5 / Phase E) ────────────────────────────
  const handleOpenCertifyModal = (disc: BureauDisciplineWithOps) => {
    setCertifyingDiscipline(disc);
    setCertSignatures({
      chiefJudge: customHeader.chiefJudgeName || 'الحكم العام الفيدرالي',
      timingJudge: 'رئيس قضاة الميقاتية (FAT)',
      trackJudge: 'رئيس قضاة الميدان والمضمار'
    });
    setSaveError(null);
  };

  const handleConfirmCertify = async () => {
    if (!certifyingDiscipline || !selectedCompId) return;
    setIsCertifying(true);
    setSaveError(null);
    try {
      const res = await competitionsBureauService.certifyDiscipline(
        selectedCompId,
        certifyingDiscipline.id,
        certSignatures,
        {
          name: activeSession?.username || 'الحكم العام للمنافسة',
          role: activeSession?.portal === 'league' ? 'LEAGUE_ADMIN' : 'CHIEF_JUDGE',
          token: activeSession?.token
        }
      );

      if (res.success && res.discipline) {
        setSaveSuccess(`تمت المصادقة الرسمية على محضر (${res.discipline.nameAr}) وتوليد الرقم: ${res.discipline.pvNumber}`);
        const updatedDiscs = await competitionsBureauService.getCompetitionDisciplinesWithOperations(selectedCompId);
        setDisciplines(updatedDiscs);
        setCertifyingDiscipline(null);
      } else {
        setSaveError(res.error || 'تعذرت المصادقة على المحضر.');
      }
    } catch (e: any) {
      setSaveError(e?.message || 'حدث خطأ أثناء المصادقة.');
    } finally {
      setIsCertifying(false);
      setTimeout(() => setSaveSuccess(null), 4000);
    }
  };

  const handleOpenReopenModal = (disc: BureauDisciplineWithOps) => {
    setReopeningDiscipline(disc);
    setReopenReason('');
    setSaveError(null);
  };

  const handleConfirmReopen = async () => {
    if (!reopeningDiscipline || !selectedCompId) return;
    setIsReopening(true);
    setSaveError(null);
    try {
      const res = await competitionsBureauService.reopenDiscipline(
        selectedCompId,
        reopeningDiscipline.id,
        reopenReason || 'إعادة فتح المحضر للمراجعة والتدقيق',
        {
          name: activeSession?.username || 'مكتب الرابطة',
          role: 'LEAGUE_ADMIN',
          token: activeSession?.token
        }
      );

      if (res.success) {
        setSaveSuccess(`تم إعادة فتح محضر (${reopeningDiscipline.nameAr}) للتدقيق التحكيمي.`);
        const updatedDiscs = await competitionsBureauService.getCompetitionDisciplinesWithOperations(selectedCompId);
        setDisciplines(updatedDiscs);
        setReopeningDiscipline(null);
      } else {
        setSaveError(res.error || 'تعذر إعادة فتح المحضر.');
      }
    } catch (e: any) {
      setSaveError(e?.message || 'حدث خطأ أثناء إعادة الفتح.');
    } finally {
      setIsReopening(false);
      setTimeout(() => setSaveSuccess(null), 4000);
    }
  };

  // Direct Certified PV Export
  const handleExportCertifiedPV = (disc: BureauDisciplineWithOps, format: 'pdf' | 'word' | 'excel') => {
    if (!selectedCompetition) return;
    competitionsBureauService.exportOfficialDisciplinePV(selectedCompetition, disc, format, {
      chiefJudge: disc.chiefJudgeSignature || customHeader.chiefJudgeName,
      timingJudge: disc.timingJudgeSignature,
      trackJudge: disc.trackJudgeSignature
    });
    setSaveSuccess(`تم بدء تصدير محضر (${disc.nameAr}) بصيغة ${format.toUpperCase()} بنجاح.`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // ── Audit Trail Modal ─────────────────────────────────────────────────────
  const openAuditModal = (op: BureauJudgeOperation) => {
    setAuditTargetOp(op);
    setAuditLogsList(op.auditTrail || []);
    setAuditModalOpen(true);
  };

  // ── Batch Export Trigger ──────────────────────────────────────────────────
  const handleOpenExportModal = (target: string | 'all', format: 'pdf' | 'word' | 'excel') => {
    setExportDisciplineTarget(target);
    setExportFormat(format);
    setExportModalOpen(true);
  };

  const executeExport = () => {
    if (!selectedCompetition) return;
    const targetDiscId = exportDisciplineTarget === 'all' ? undefined : exportDisciplineTarget;

    if (exportFormat === 'pdf') {
      competitionsBureauService.exportToPdf(selectedCompetition, disciplines, targetDiscId, customHeader);
    } else if (exportFormat === 'word') {
      competitionsBureauService.exportToWord(selectedCompetition, disciplines, targetDiscId, customHeader);
    } else if (exportFormat === 'excel') {
      competitionsBureauService.exportToExcel(selectedCompetition, disciplines, targetDiscId, customHeader);
    }
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-6 text-[var(--ink,#0F1B2D)] dark:text-white" dir="rtl">
      {/* ── TOP ACTION BAR ─────────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--success,#15803D)] animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase text-[var(--primary,#0B3A6F)] dark:text-blue-400">
                ATHLETICS COMPETITIONS EXECUTIVE BUREAU
              </span>
              <Badge variant="accent" size="sm">مضمار • Track Pro</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--ink,#0F1B2D)] dark:text-white mt-1">
              مكتب المنافسات وإدارة عمليات التحكيم والمحاضر الرسمية
            </h1>
            <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
              متابعة وتسجيل ومراجعة قياسات وأزمنة الحكام، المصادقة الرسمية على المحاضر (PV)، وتصدير النتائج المعتمدة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Export Buttons */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenExportModal('all', 'pdf')}
              icon={<Printer className="w-4 h-4 text-rose-500" />}
              className="text-xs font-bold"
            >
              <span>تصدير الكل (PDF)</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenExportModal('all', 'word')}
              icon={<FileText className="w-4 h-4 text-blue-600" />}
              className="text-xs font-bold"
            >
              <span>تصدير الكل (Word)</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenExportModal('all', 'excel')}
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              className="text-xs font-bold"
            >
              <span>تصدير الكل (Excel)</span>
            </Button>

            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Realtime Mobile Judge Connection Banner (Phase E) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] text-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <span className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-600" />
              البث الميداني اللحظي لهواتف الحكام: متصل 🟢
            </span>
            {realtimePassageCount > 0 && (
              <Badge variant="success" size="sm">
                +{realtimePassageCount} تسجيلات ميدانية حية
              </Badge>
            )}
          </div>
          {lastRealtimePassage ? (
            <div className="text-[11px] text-[var(--ink-2,#51607A)] flex items-center gap-2">
              <span className="font-bold">آخر عبور مسجل:</span>
              <span className="text-[var(--ink,#0F1B2D)] dark:text-white font-black">{lastRealtimePassage.athleteName}</span>
              <span className="font-mono text-[var(--primary,#0B3A6F)] dark:text-blue-400 font-bold">({lastRealtimePassage.mark})</span>
              <span className="text-[10px] text-slate-400 font-mono">[{lastRealtimePassage.timestamp}]</span>
            </div>
          ) : (
            <div className="text-[11px] text-[var(--ink-3,#8593A8)]">
              في انتظار تسجيلات نقاط المراقبة والميقاتية من هواتف الحكام في الميدان...
            </div>
          )}
        </div>

        {/* Feedback Alert Messages */}
        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {saveError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* ── MAIN DUAL-SPLIT LAYOUT (Design System V2) ─────────────────────────── */}
      <SplitLayout
        primaryTitle="سجلات نتائج واختصاصات المنافسة"
        secondaryTitle="دليل التخصصات وتفاصيل المنافسة"
        primarySpan={8}
        secondarySpan={4}
        secondaryContent={
          <div className="space-y-4">
            
            {/* Competition Selector Card */}
            <div className="p-5 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-3">
                <span className="text-xs font-black text-[var(--primary,#0B3A6F)] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[var(--accent,#E8590C)]" />
                  المنافسة النشطة
                </span>
                <Badge variant="neutral" size="sm">{competitions.length} منافسات</Badge>
              </div>

              <div className="relative">
                <select
                  value={selectedCompId}
                  onChange={(e) => handleCompetitionChange(e.target.value)}
                  className="w-full bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[var(--ink,#0F1B2D)] dark:text-white focus:outline-none focus:border-[var(--primary,#0B3A6F)] cursor-pointer appearance-none"
                >
                  {competitions.map(c => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-[var(--ink,#0F1B2D)] dark:text-white">
                      {c.name} ({c.date})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--ink-3,#8593A8)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {selectedCompetition && (
                <div className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900/60 rounded-xl p-3 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ink-2,#51607A)]">الحالة:</span>
                    <Badge variant={selectedCompetition.status === 'completed' ? 'neutral' : 'success'} size="sm" dot={selectedCompetition.status !== 'completed'}>
                      {selectedCompetition.status === 'completed' ? '🏁 منتهية ومؤرشفة' : '🟢 جارية / مباشرة'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ink-2,#51607A)]">الرابطة:</span>
                    <span className="font-bold text-[var(--primary,#0B3A6F)] dark:text-blue-400 truncate max-w-[160px]">
                      {selectedCompetition.leagueName || currentLeague?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ink-2,#51607A)]">المكان:</span>
                    <span className="font-medium text-[var(--ink,#0F1B2D)] dark:text-slate-300">📍 {selectedCompetition.venue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ink-2,#51607A)]">التاريخ:</span>
                    <span className="font-mono text-[var(--ink,#0F1B2D)] dark:text-slate-300">{selectedCompetition.date}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                    <span className="text-[var(--ink-2,#51607A)]">المحاضر المعتمدة:</span>
                    <Badge variant="success" size="sm">
                      {certifiedDisciplinesCount} من {disciplines.length} معتمد
                    </Badge>
                  </div>
                </div>
              )}

              {selectedCompetition && (
                <div className="space-y-2 pt-2 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                  {selectedCompetition.status !== 'completed' ? (
                    <div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setIsFinishModalOpen(true)}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        className="w-full justify-center font-bold text-xs"
                      >
                        إنهاء المنافسة وأرشفة العمليات
                      </Button>
                      {pendingDisciplines.length > 0 && (
                        <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold text-center flex items-center justify-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>يوجد {pendingDisciplines.length} اختصاصات عالقة</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300">المنافسة منتهية ومؤرشفة رسميًا</span>
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsPurgeLogsModalOpen(true)}
                    icon={<Smartphone className="w-4 h-4 text-[var(--primary,#0B3A6F)]" />}
                    className="w-full justify-center text-xs font-bold"
                  >
                    سجل إخلاء أجهزة الحكام ({purgeLogs.length})
                  </Button>
                </div>
              )}
            </div>

            {/* Disciplines Directory & Quick Filter */}
            <div className="p-5 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-3">
                <span className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[var(--primary,#0B3A6F)]" />
                  دليل اختصاصات المنافسة
                </span>
                <button
                  onClick={() => setActiveDisciplineFilter('all')}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    activeDisciplineFilter === 'all'
                      ? 'bg-[var(--primary,#0B3A6F)] text-white shadow-sm'
                      : 'text-[var(--ink-2,#51607A)] hover:text-[var(--primary,#0B3A6F)]'
                  }`}
                >
                  الكل ({disciplines.length})
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--ink-3,#8593A8)] absolute right-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="ابحث برقم الصدر، العداء أو التخصص..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 py-2 text-xs"
                />
              </div>

              {/* List of Disciplines */}
              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pl-1 no-scrollbar">
                {disciplines.length === 0 ? (
                  <div className="text-center py-8 text-[var(--ink-3,#8593A8)] text-xs">
                    لا توجد تخصصات مسجلة لهذه المنافسة
                  </div>
                ) : (
                  disciplines.map(d => {
                    const isSelected = activeDisciplineFilter === d.id;
                    const isCourse = d.group === 'course';
                    const isCertified = d.status === 'certified';

                    return (
                      <button
                        key={d.id}
                        onClick={() => setActiveDisciplineFilter(d.id)}
                        className={`w-full text-right p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--primary-soft,#E8F0FA)] dark:bg-blue-950/40 border-[var(--primary,#0B3A6F)] text-[var(--primary,#0B3A6F)] dark:text-blue-300 font-bold shadow-sm'
                            : 'bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900/60 border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] text-[var(--ink,#0F1B2D)] dark:text-slate-300 hover:border-[var(--primary,#0B3A6F)]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isCourse ? 'bg-blue-600' : 'bg-amber-600'}`} />
                            <span>{d.nameAr}</span>
                          </div>
                          <div className="text-[10px] text-[var(--ink-2,#51607A)] flex items-center gap-2">
                            <span>{d.categoryNameAr}</span>
                            {d.scheduledTime && (
                              <span className="flex items-center gap-0.5 text-[var(--ink,#0F1B2D)] dark:text-slate-300 font-mono">
                                <Clock className="w-3 h-3 text-[var(--accent,#E8590C)]" /> {d.scheduledTime}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCertified ? (
                            <Badge variant="success" size="sm">معتمد</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              {d.operations.length}
                            </Badge>
                          )}
                          <ChevronLeft className={`w-3.5 h-3.5 text-[var(--ink-3,#8593A8)] transition ${isSelected ? 'translate-x-0.5 text-[var(--primary,#0B3A6F)]' : ''}`} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        }
        primaryContent={
          <div className="space-y-6">

            {loading ? (
              <div className="p-12 text-center rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                <div className="w-8 h-8 border-2 border-[var(--primary,#0B3A6F)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-[var(--ink-2,#51607A)]">جاري تحميل بيانات وعمليات تحكيم المنافسة...</p>
              </div>
            ) : displayedDisciplines.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                <Filter className="w-12 h-12 text-[var(--ink-3,#8593A8)] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[var(--ink,#0F1B2D)] dark:text-white">لا توجد نتائج مطابقة لخيارات الفلترة</h3>
                <p className="text-xs text-[var(--ink-2,#51607A)] mt-1">جرب إزالة معايير البحث أو اختيار تخصص آخر من القائمة.</p>
                <Button variant="secondary" size="sm" onClick={() => { setActiveDisciplineFilter('all'); setSearchQuery(''); }} className="mt-4">
                  إعادة ضبط الفلاتر
                </Button>
              </div>
            ) : (
              displayedDisciplines.map((disc) => {
                const isCourse = disc.group === 'course';
                const isCertified = disc.status === 'certified';

                return (
                  <div
                    key={disc.id}
                    className="p-5 sm:p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-4 shadow-sm"
                  >
                    {/* Discipline Header & Official PV Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isCourse 
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {isCourse ? 'سباقات المضمار • Course' : 'مسابقات الميدان • Concours'}
                          </span>

                          {/* Certification Status Badge */}
                          {isCertified ? (
                            <Badge variant="success" size="sm" dot>
                              محضر معتمد رسميًا: {disc.pvNumber} (Rev {disc.revision || 1}.0) {disc.isLocked ? '🔒' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm" dot>
                              مسودة قيد التدقيق التحكيمي (Rev {disc.revision || 1}.0)
                            </Badge>
                          )}

                          {disc.windSpeed && (
                            <span className="flex items-center gap-1 text-[11px] font-mono text-[var(--ink-2,#51607A)] bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 px-2 py-0.5 rounded-md border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                              <Wind className="w-3 h-3 text-[var(--accent,#E8590C)]" />
                              {disc.windSpeed}
                            </span>
                          )}

                          {disc.scheduledTime && (
                            <span className="flex items-center gap-1 text-[11px] font-mono text-[var(--ink-2,#51607A)] bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 px-2 py-0.5 rounded-md border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                              <Clock className="w-3 h-3 text-[var(--primary,#0B3A6F)]" />
                              {disc.scheduledTime}
                            </span>
                          )}
                        </div>

                        <h2 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white mt-1.5 flex items-center gap-2">
                          {disc.nameAr}
                          <span className="text-xs font-normal text-[var(--ink-2,#51607A)]">({disc.categoryNameAr})</span>
                        </h2>
                      </div>

                      {/* Official Certification & Export Actions */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Certification Toggle */}
                        {!isCertified ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenCertifyModal(disc)}
                            icon={<FileCheck className="w-3.5 h-3.5" />}
                            className="font-bold text-xs"
                          >
                            المصادقة واعتماد المحضر 📜
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenReopenModal(disc)}
                            icon={<Unlock className="w-3.5 h-3.5 text-amber-600" />}
                            className="text-xs"
                          >
                            إعادة فتح للتدقيق 🔓
                          </Button>
                        )}

                        {/* Preview PV */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPreviewingDiscipline(disc)}
                          icon={<Eye className="w-3.5 h-3.5" />}
                          className="text-xs"
                          title="معاينة المحضر الرسمي المعتمد"
                        >
                          معاينة المحضر
                        </Button>

                        {/* Single Discipline Export Buttons */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportCertifiedPV(disc, 'pdf')}
                          className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="تصدير هذا المحضر كـ PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">PDF</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportCertifiedPV(disc, 'word')}
                          className="text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          title="تصدير هذا المحضر كـ Word"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Word</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportCertifiedPV(disc, 'excel')}
                          className="text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title="تصدير هذا المحضر كـ Excel"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Excel</span>
                        </Button>
                      </div>
                    </div>

                    {/* Operations Table */}
                    <div className="overflow-x-auto rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] font-bold text-[11px] border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                          <tr>
                            <th className="py-3 px-3 text-center">الرتبة</th>
                            <th className="py-3 px-3 text-center">رقم الصدر</th>
                            <th className="py-3 px-4">اسم العداء</th>
                            <th className="py-3 px-3">النادي / الجمعية</th>
                            <th className="py-3 px-3 text-center">{isCourse ? 'الرواق' : 'الترتيب'}</th>
                            <th className="py-3 px-3 text-center">{isCourse ? 'الزمن المسجل' : 'المسافة / الارتفاع'}</th>
                            {disc.windSpeed && <th className="py-3 px-2 text-center">الرياح</th>}
                            <th className="py-3 px-3 text-center">النتيجة</th>
                            <th className="py-3 px-3 text-center">مسار الاعتماد</th>
                            <th className="py-3 px-3">الحكم المسجل</th>
                            <th className="py-3 px-3 text-center">إجراءات الاعتماد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                          {disc.operations.length === 0 ? (
                            <tr>
                              <td colSpan={disc.windSpeed ? 11 : 10} className="py-8 text-center text-[var(--ink-2,#51607A)]">
                                لا توجد عمليات تحكيم مسجلة لهذا التخصص حتى الآن
                              </td>
                            </tr>
                          ) : (
                            disc.operations.map((op) => {
                              const isEditing = editingOpId === op.id;
                              const hasAudit = op.auditTrail && op.auditTrail.length > 0;

                              return isEditing ? (
                                /* ── INLINE EDIT ROW ── */
                                <tr key={op.id} className="bg-[var(--primary-soft,#E8F0FA)] dark:bg-blue-950/30 border-2 border-[var(--primary,#0B3A6F)]">
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      value={editFormData.rank ?? op.rank}
                                      onChange={(e) => setEditFormData({ ...editFormData, rank: Number(e.target.value) })}
                                      className="w-12 bg-white dark:bg-slate-900 text-center text-[var(--ink,#0F1B2D)] dark:text-white font-bold rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      value={editFormData.bibNumber ?? op.bibNumber}
                                      onChange={(e) => setEditFormData({ ...editFormData, bibNumber: Number(e.target.value) })}
                                      className="w-14 bg-white dark:bg-slate-900 text-center text-[var(--accent,#E8590C)] font-bold rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={editFormData.athleteName ?? op.athleteName}
                                      onChange={(e) => setEditFormData({ ...editFormData, athleteName: e.target.value })}
                                      className="w-full bg-white dark:bg-slate-900 text-[var(--ink,#0F1B2D)] dark:text-white rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={editFormData.clubName ?? op.clubName}
                                      onChange={(e) => setEditFormData({ ...editFormData, clubName: e.target.value })}
                                      className="w-full bg-white dark:bg-slate-900 text-[var(--ink,#0F1B2D)] dark:text-white rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      value={editFormData.laneOrOrder ?? op.laneOrOrder}
                                      onChange={(e) => setEditFormData({ ...editFormData, laneOrOrder: Number(e.target.value) })}
                                      className="w-12 bg-white dark:bg-slate-900 text-center text-[var(--ink,#0F1B2D)] dark:text-white rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="text"
                                      value={editFormData.mark ?? op.mark}
                                      onChange={(e) => setEditFormData({ ...editFormData, mark: e.target.value })}
                                      className="w-20 bg-white dark:bg-slate-900 text-center text-[var(--primary,#0B3A6F)] dark:text-blue-400 font-mono font-bold rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs"
                                    />
                                  </td>
                                  {disc.windSpeed && (
                                    <td className="p-2 text-center">
                                      <input
                                        type="text"
                                        value={editFormData.windSpeed ?? op.windSpeed ?? ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, windSpeed: e.target.value })}
                                        className="w-16 bg-white dark:bg-slate-900 text-center text-[var(--ink-2,#51607A)] rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs"
                                      />
                                    </td>
                                  )}
                                  <td className="p-2 text-center">
                                    <select
                                      value={editFormData.status ?? op.status}
                                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                                      className="bg-white dark:bg-slate-900 text-[var(--ink,#0F1B2D)] dark:text-white rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs"
                                    >
                                      <option value="finished">أنهى (OK)</option>
                                      <option value="dnf">انسحاب (DNF)</option>
                                      <option value="dq">استبعاد (DQ)</option>
                                      <option value="dns">غياب (DNS)</option>
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      placeholder="سبب التعديل التدقيقي..."
                                      value={editReason}
                                      onChange={(e) => setEditReason(e.target.value)}
                                      className="w-full bg-white dark:bg-slate-900 text-[var(--ink,#0F1B2D)] dark:text-white placeholder-slate-400 rounded-lg border border-[var(--primary,#0B3A6F)] p-1 text-xs"
                                    />
                                  </td>
                                  <td className="p-2 text-center text-[11px] text-[var(--ink-2,#51607A)]">
                                    {op.judgeName}
                                  </td>
                                  <td className="p-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => handleSaveInline(disc.id, op.id)}
                                        className="p-1.5 rounded-lg bg-[var(--success,#15803D)] text-white hover:opacity-90 cursor-pointer"
                                        title="حفظ التعديل"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={cancelEditing}
                                        className="p-1.5 rounded-lg bg-[var(--danger,#B91C1C)] text-white hover:opacity-90 cursor-pointer"
                                        title="إلغاء"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                /* ── READ-ONLY ROW ── */
                                <tr key={op.id} className="hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-900/60 transition">
                                  <td className="py-2.5 px-3 text-center font-bold">
                                    {op.rank > 0 && op.rank < 900 ? (
                                      <span className={`inline-block w-6 h-6 rounded-full text-center leading-6 text-xs tabular-nums ${
                                        op.rank === 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-black border border-amber-300' :
                                        op.rank === 2 ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold border border-slate-300' :
                                        op.rank === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 font-bold border border-orange-300' :
                                        'text-[var(--ink-2,#51607A)]'
                                      }`}>
                                        {op.rank}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--accent,#E8590C)]">
                                    #{op.bibNumber}
                                  </td>
                                  <td className="py-2.5 px-4 font-bold text-[var(--ink,#0F1B2D)] dark:text-white">
                                    {op.athleteName}
                                    {op.notes && (
                                      <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                        {op.notes}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-[var(--ink-2,#51607A)]">
                                    {op.clubName}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono text-[var(--ink,#0F1B2D)] dark:text-white">
                                    {op.laneOrOrder}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-extrabold text-[var(--primary,#0B3A6F)] dark:text-blue-400 text-sm">
                                    {op.mark}
                                  </td>
                                  {disc.windSpeed && (
                                    <td className="py-2.5 px-2 text-center font-mono text-[var(--ink-2,#51607A)] text-[11px]">
                                      {op.windSpeed || '-'}
                                    </td>
                                  )}
                                  <td className="py-2.5 px-3 text-center">
                                    <Badge 
                                      variant={
                                        op.status === 'finished' ? 'success' :
                                        op.status === 'dnf' ? 'warning' :
                                        op.status === 'dq' ? 'danger' : 'neutral'
                                      } 
                                      size="sm"
                                    >
                                      {op.status === 'finished' ? 'أنهى' : op.status === 'dnf' ? 'DNF' : op.status === 'dq' ? 'DQ' : 'DNS'}
                                    </Badge>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <StatusPill 
                                      status={
                                        op.lifecycleStatus === 'recorded' ? 'draft' :
                                        op.lifecycleStatus === 'sent' ? 'sent' :
                                        op.lifecycleStatus === 'received' ? 'sent' :
                                        op.lifecycleStatus === 'under_review' ? 'under_review' :
                                        op.lifecycleStatus === 'certified' ? 'certified' :
                                        op.lifecycleStatus === 'rejected' ? 'rejected' :
                                        op.lifecycleStatus === 'locked' ? 'locked' :
                                        op.lifecycleStatus || 'draft'
                                      }
                                      customLabel={
                                        op.lifecycleStatus === 'recorded' ? '📱 مسجل' :
                                        op.lifecycleStatus === 'sent' ? '📡 مرسل' :
                                        op.lifecycleStatus === 'received' ? '📥 مستلم' :
                                        op.lifecycleStatus === 'under_review' ? '🔍 قيد المراجعة' :
                                        op.lifecycleStatus === 'certified' ? '✅ معتمد' :
                                        op.lifecycleStatus === 'rejected' ? '❌ مرفوض' :
                                        op.lifecycleStatus === 'corrected' ? '✏️ مصحح' :
                                        op.lifecycleStatus === 'locked' ? '🔒 مقفل' : undefined
                                      }
                                      size="sm"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 text-[var(--ink-2,#51607A)] text-[11px]">
                                    {op.judgeName}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                      {(disc.isLocked || op.isLocked) ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700" title="النتيجة أو المحضر مقفل رسمياً ومصان من التعديل">
                                          <Lock className="w-3 h-3 text-slate-500" />
                                          <span>مقفل</span>
                                        </span>
                                      ) : (
                                        <>
                                          {op.lifecycleStatus !== 'certified' && (
                                            <button
                                              onClick={() => handleQuickLifecycleChange(disc.id, op.id, 'certified')}
                                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                                              title="اعتماد النتيجة رسمياً (Approve)"
                                            >
                                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            </button>
                                          )}

                                          {op.lifecycleStatus !== 'rejected' && (
                                            <button
                                              onClick={() => handleOpenRejectModal(disc.id, op)}
                                              className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                                              title="رفض / استبعاد مع سبب إلزامي (Reject)"
                                            >
                                              <Ban className="w-3.5 h-3.5 text-rose-600" />
                                            </button>
                                          )}

                                          {op.lifecycleStatus === 'rejected' && (
                                            <button
                                              onClick={() => handleQuickLifecycleChange(disc.id, op.id, 'under_review', 'إعادة العملية للمراجعة والتدقيق')}
                                              className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                                              title="إعادة للمراجعة (Return to Review)"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                            </button>
                                          )}

                                          {op.lifecycleStatus === 'certified' && (
                                            <button
                                              onClick={() => handleQuickLifecycleChange(disc.id, op.id, 'locked', 'قفل أمني معتمد')}
                                              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                              title="قفل النتيجة (Lock)"
                                            >
                                              <Lock className="w-3.5 h-3.5 text-slate-600" />
                                            </button>
                                          )}

                                          <button
                                            onClick={() => startEditing(op)}
                                            className="p-1.5 rounded-lg text-[var(--ink-2,#51607A)] hover:text-[var(--primary,#0B3A6F)] hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-800 transition cursor-pointer"
                                            title="تعديل النتيجة (Inline Edit)"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}

                                      {hasAudit && (
                                        <button
                                          onClick={() => openAuditModal(op)}
                                          className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer relative"
                                          title={`سجل التعديلات (${op.auditTrail.length} تعديل)`}
                                        >
                                          <History className="w-3.5 h-3.5" />
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1 right-1" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}

          </div>
        }
      />

      {/* ── MODAL 1: OFFICIAL DISCIPLINE CERTIFICATION MODAL (Stage 5 / Phase E) ── */}
      <Modal
        isOpen={Boolean(certifyingDiscipline)}
        onClose={() => !isCertifying && setCertifyingDiscipline(null)}
        title={`المصادقة الرسمية على محضر: ${certifyingDiscipline?.nameAr}`}
        maxWidth="md"
      >
        <div className="space-y-4" dir="rtl">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600" />
              المصادقة وتثبيت المحضر الرسمي (Procès-Verbal d'épreuve)
            </span>
            <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
              بالمصادقة، يُقفل هذا الاختصاص ويولّد النظام رقم محضر رسمي غير قابل للتعديل ويُوثّق في السجلات الرسمية للرابطة.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">الحكم العام للمنافسة (Juge-Arbitre):</label>
              <Input
                type="text"
                value={certSignatures.chiefJudge}
                onChange={(e) => setCertSignatures({ ...certSignatures, chiefJudge: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">رئيس قضاة الميقاتية (FAT Chief Timekeeper):</label>
              <Input
                type="text"
                value={certSignatures.timingJudge}
                onChange={(e) => setCertSignatures({ ...certSignatures, timingJudge: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">رئيس قضاة الميدان والمضمار (Head of Track/Field Judges):</label>
              <Input
                type="text"
                value={certSignatures.trackJudge}
                onChange={(e) => setCertSignatures({ ...certSignatures, trackJudge: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button variant="ghost" size="sm" disabled={isCertifying} onClick={() => setCertifyingDiscipline(null)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isCertifying}
              onClick={handleConfirmCertify}
              icon={isCertifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              className="font-bold text-xs"
            >
              {isCertifying ? 'جارٍ المصادقة...' : 'تثبيت الاعتماد وتوليد رقم المحضر الرسمي 🔏'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: REOPEN DISCIPLINE MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={Boolean(reopeningDiscipline)}
        onClose={() => !isReopening && setReopeningDiscipline(null)}
        title={`إعادة فتح محضر: ${reopeningDiscipline?.nameAr}`}
        maxWidth="md"
      >
        <div className="space-y-4" dir="rtl">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              تنبيه تدقيقي لإدارة الرابطة
            </span>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              إعادة فتح المحضر ستُعيده إلى حالة &quot;قيد التدقيق&quot; وتتيح تعديل النتائج مع تسجيل السبب الإداري في السجل غير القابل للتلاعب.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--ink-2,#51607A)] mb-1">
              السبب الإداري لإعادة فتح المحضر (إلزامي للتدقيق):
            </label>
            <Input
              type="text"
              placeholder="مثال: تصحيح رقم صدرية أو خطأ في قراءة ريح..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button variant="ghost" size="sm" disabled={isReopening} onClick={() => setReopeningDiscipline(null)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isReopening}
              onClick={handleConfirmReopen}
              icon={isReopening ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              className="font-bold text-xs"
            >
              {isReopening ? 'جارٍ إعادة الفتح...' : 'تأكيد إعادة فتح المحضر 🔓'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: OFFICIAL CERTIFIED PV PREVIEW MODAL ─────────────────────── */}
      <Modal
        isOpen={Boolean(previewingDiscipline)}
        onClose={() => setPreviewingDiscipline(null)}
        title={`معاينة المحضر الرسمي المعتمد: ${previewingDiscipline?.nameAr}`}
        maxWidth="lg"
      >
        {previewingDiscipline && selectedCompetition && (
          <div className="space-y-4" dir="rtl">
            {/* ══ WA Official Protocol Banner (Phase E) ══ */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-slate-950 shadow-md">
              <div className="space-y-1 text-right w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Badge variant="accent" size="sm">WORLD ATHLETICS PROTOCOL</Badge>
                  <span className="font-mono text-xs text-amber-400 font-bold">
                    TR 19.1 &amp; TR 20.3
                  </span>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                    Rev {previewingDiscipline.revision || 1}.0
                  </span>
                </div>
                <div className="text-sm font-black flex items-center gap-2 mt-1">
                  <span>رقم المحضر الرسمي المعتمد:</span>
                  <span className="font-mono text-amber-300 text-base">{previewingDiscipline.pvNumber || 'PV-DRAFT'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <div className="w-10 h-10 bg-white text-slate-950 rounded flex items-center justify-center font-bold">
                  <QrCode className="w-8 h-8 text-slate-900" />
                </div>
                <div className="text-right text-[11px] space-y-0.5">
                  <span className="text-slate-400 block font-mono text-[10px]">كود التحقق الرقمي الموثق</span>
                  <span className="font-mono font-bold text-emerald-400 block tracking-wider">
                    WA-VERIF-{previewingDiscipline.qrVerificationCode || '4F89-2B01'}
                  </span>
                  <span className="text-[10px] text-slate-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>المحضر مقفل رسمياً وغير قابل للتعديل</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Embedded Official Federation Header */}
            <OfficialFederationHeader
              competitionName={selectedCompetition.name}
              venue={selectedCompetition.venue}
              date={selectedCompetition.date}
              discipline={previewingDiscipline.nameAr}
              category={previewingDiscipline.categoryNameAr}
              windSpeed={previewingDiscipline.windSpeed || '-'}
              timingSystem="Fully Automatic Timing (FAT Photo Finish 1/1000s)"
              chiefJudgeName={previewingDiscipline.chiefJudgeSignature || customHeader.chiefJudgeName}
              documentTitle="محضر النتائج الرسمية المعتمدة لسباقات ألعاب القوى"
              documentSubtitle="OFFICIAL CERTIFIED ATHLETICS RESULTS PROTOCOL"
              showSignatures={true}
            />

            {/* Results Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] font-bold text-[11px] border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                  <tr>
                    <th className="py-2.5 px-3 text-center">الرتبة</th>
                    <th className="py-2.5 px-3 text-center">رقم الصدر</th>
                    <th className="py-2.5 px-4">اسم الرياضي</th>
                    <th className="py-2.5 px-3">النادي / الجمعية</th>
                    <th className="py-2.5 px-3 text-center">النتيجة</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                  {previewingDiscipline.operations.map(op => (
                    <tr key={op.id} className="hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-900/60">
                      <td className="py-2 px-3 text-center font-bold tabular-nums">{op.rank}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-[var(--accent,#E8590C)]">#{op.bibNumber}</td>
                      <td className="py-2 px-4 font-bold text-[var(--ink,#0F1B2D)] dark:text-white">{op.athleteName}</td>
                      <td className="py-2 px-3 text-[var(--ink-2,#51607A)]">{op.clubName}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-[var(--primary,#0B3A6F)] dark:text-blue-400">{op.mark}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={op.status === 'finished' ? 'success' : 'warning'} size="sm">
                          {op.status === 'finished' ? 'أنهى' : op.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Federation Signatures Footer */}
            <OfficialFederationFooter
              chiefJudgeName={previewingDiscipline.chiefJudgeSignature || customHeader.chiefJudgeName}
              presidentName={currentLeague?.adminFullName || 'رئيس الرابطة الولائية'}
            />

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
              <span className="text-[11px] text-[var(--ink-2,#51607A)]">
                رقم الاعتماد: <strong className="text-[var(--ink,#0F1B2D)] dark:text-white font-mono">{previewingDiscipline.pvNumber || 'مسودة رسمية'}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExportCertifiedPV(previewingDiscipline, 'pdf')}
                  icon={<Printer className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  طباعة PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPreviewingDiscipline(null)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 3B: REJECT OPERATION MODAL (Phase E) ────────────────────────── */}
      <Modal
        isOpen={Boolean(rejectModalData)}
        onClose={() => !isRejecting && setRejectModalData(null)}
        title={`رفض / استبعاد نتيجة: ${rejectModalData?.athleteName} (صدرية #${rejectModalData?.bibNumber})`}
        maxWidth="md"
      >
        <div className="space-y-4" dir="rtl">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              تسجيل قرار تحكيمي بالاستبعاد أو الرفض (Disqualification / Rejection)
            </span>
            <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
              بموجب القواعد الفنية للاتحاد الدولي لألعاب القوى (World Athletics)، يجب ذكر السند القانوني أو الخطأ الفني المرتكب (مثال: انطلاقة خاطئة WA TR 16.8، خروج عن الحارة TR 17.3.1، إسقاط العصا TR 24.6).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--ink-2,#51607A)] mb-1">
              السبب الفني / القانوني للرفض (إلزامي للتوثيق والطعون):
            </label>
            <Input
              type="text"
              placeholder="مثال: استبعاد لانطلاقة خاطئة طبقاً للمادة TR 16.8..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          {saveError && (
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button variant="ghost" size="sm" disabled={isRejecting} onClick={() => setRejectModalData(null)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isRejecting || !rejectReason.trim()}
              onClick={handleConfirmReject}
              icon={isRejecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              className="font-bold text-xs cursor-pointer"
            >
              {isRejecting ? 'جارٍ تسجيل الرفض...' : 'تأكيد الرفض وتوثيق السبب ❌'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 4: AUDIT TRAIL MODAL ──────────────────────────────────────── */}
      <Modal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title={`سجل التدقيق والتعديلات: العداء ${auditTargetOp?.athleteName} (صدرية #${auditTargetOp?.bibNumber})`}
        maxWidth="lg"
      >
        <div className="space-y-4" dir="rtl">
          <p className="text-xs text-[var(--ink-2,#51607A)]">
            يسجل النظام كافة التعديلات الميدانية مع هوية المسؤول وتوقيتها الدقيق لحماية نزاهة النتائج الرسمية.
          </p>

          {auditLogsList.length === 0 ? (
            <div className="text-center py-6 text-[var(--ink-3,#8593A8)] text-xs">
              لا توجد تعديلات مسجلة على هذه النتيجة (بيانات أصلية من الحكم).
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pl-1 no-scrollbar">
              {auditLogsList.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--primary,#0B3A6F)] dark:text-blue-400">{log.modifiedBy}</span>
                    <span className="text-[10px] text-[var(--ink-3,#8593A8)] font-mono">
                      {new Date(log.modifiedAt).toLocaleString('ar-DZ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--ink-2,#51607A)]">الحقل المعدل:</span>
                    <Badge variant="neutral" size="sm">{log.fieldName}</Badge>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] bg-white dark:bg-slate-950 p-2 rounded-lg border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                    <span className="text-rose-600 line-through">القيمة السابقة: {String(log.oldValue)}</span>
                    <span className="text-[var(--ink-3,#8593A8)]">&rarr;</span>
                    <span className="text-emerald-600 font-bold">القيمة الجديدة: {String(log.newValue)}</span>
                  </div>
                  {log.reason && (
                    <div className="text-[11px] text-[var(--ink-2,#51607A)] italic">
                      السبب: &quot;{log.reason}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button variant="secondary" size="sm" onClick={() => setAuditModalOpen(false)}>
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 5: UNIFIED EXPORT CUSTOMIZATION MODAL ──────────────────────── */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="إعدادات التصدير بالترويسة الموحدة للرابطة"
        maxWidth="md"
      >
        <div className="space-y-4" dir="rtl">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
            <span>
              الصيغة المختارة: <strong>{exportFormat.toUpperCase()}</strong> | الهدف:{' '}
              <strong>{exportDisciplineTarget === 'all' ? 'جميع تخصصات المنافسة' : 'التخصص المحدد'}</strong>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">اسم الرابطة المنظمة (في الترويسة):</label>
              <Input
                type="text"
                value={customHeader.leagueName}
                onChange={(e) => setCustomHeader({ ...customHeader, leagueName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">اسم البطولة / المنافسة:</label>
              <Input
                type="text"
                value={customHeader.competitionName}
                onChange={(e) => setCustomHeader({ ...customHeader, competitionName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">الميدان والملعب:</label>
                <Input
                  type="text"
                  value={customHeader.venue}
                  onChange={(e) => setCustomHeader({ ...customHeader, venue: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">التاريخ:</label>
                <Input
                  type="text"
                  value={customHeader.date}
                  onChange={(e) => setCustomHeader({ ...customHeader, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">الحكم العام (لخانة الاعتماد والتوقيع):</label>
              <Input
                type="text"
                value={customHeader.chiefJudgeName}
                onChange={(e) => setCustomHeader({ ...customHeader, chiefJudgeName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <span className="text-[11px] text-[var(--ink-2,#51607A)]">خطوط Cairo/Amiri مدمجة بدعم RTL</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setExportModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="sm" onClick={executeExport} className="cursor-pointer">
                تأكيد وبدء التصدير
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 6: FINISH & ARCHIVE CONFIRMATION MODAL ──────────────────────── */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => !isArchiving && setIsFinishModalOpen(false)}
        title="إنهاء المنافسة، الأرشفة المعتمدة، وبث أمر مسح هواتف الحكام"
        maxWidth="md"
      >
        <div className="space-y-5 text-sm" dir="rtl">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-base text-rose-800 dark:text-rose-100">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>تنبيه هام ومحوري (إجراء لا رجعة فيه)</span>
            </div>
            <p className="text-xs leading-relaxed">
              سيتم تحويل حالة المنافسة إلى <strong>منتهية ومصادقة (Completed)</strong>، ونقل كافة مصفوفات النتائج وعمليات الحكام إلى
              <strong> الأرشيف الرقمي غير القابل للتلاعب</strong> مع الاحتفاظ التام بها في قاعدة البيانات للأغراض التدقيقية (دون أي حذف نهائي).
            </p>
          </div>

          {/* Permission restriction warning */}
          {!hasFinishPermission && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold space-y-1">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>خطأ في الصلاحيات (Permission Denied):</span>
              </div>
              <p className="font-normal text-[11px] text-rose-800 dark:text-rose-300">
                زر إنهاء وأرشفة المنافسة مقيد بإدارة الرابطة الولائية أو الحكم العام الفيدرالي المعتمد فقط.
              </p>
            </div>
          )}

          {/* Pending disciplines warning & detailed list (قائمة الاختصاصات العالقة) */}
          {pendingDisciplines.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>قائمة الاختصاصات العالقة ({pendingDisciplines.length} تخصص)</span>
                </div>
                <Badge variant="warning" size="sm">مطلوب الاعتماد أو الرفض</Badge>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                بموجب المادة TR31 وقواعد المنظومة غير القابلة للتفاوض، يُمنع إنهاء المنافسة أو مسح أجهزة الحكام حتى يتم اعتماد أو رفض كافة الاختصاصات التالية:
              </p>
              
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {pendingDisciplines.map(disc => {
                  const pendingOps = disc.operations.filter(op => 
                    !['certified', 'rejected', 'locked'].includes(op.lifecycleStatus || '')
                  );
                  return (
                    <div 
                      key={disc.id} 
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-xs text-[var(--ink,#0F1B2D)] dark:text-white truncate">
                          {disc.nameAr}
                        </div>
                        <div className="text-[10px] text-[var(--ink-2,#51607A)] flex items-center gap-2">
                          <span>الصنف: {disc.categoryNameAr || 'عام'}</span>
                          <span>•</span>
                          <span className="text-amber-700 dark:text-amber-400 font-bold">
                            {pendingOps.length > 0 ? `${pendingOps.length} عمليات قيد المراجعة` : 'المحضر بانتظار الاعتماد'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill status={disc.status === 'under_review' ? 'under_review' : 'draft'} />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveDisciplineFilter(disc.id);
                            setIsFinishModalOpen(false);
                          }}
                          className="text-[10px] py-1 px-2 font-bold cursor-pointer"
                        >
                          معاينة واعتماد
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>كافة الاختصاصات ({disciplines.length}) معتمدة أو مصادقة رسمياً. النظام جاهز تماماً للإنهاء والأرشفة وبث أمر المسح.</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2 text-xs">
            <span className="font-bold text-blue-900 dark:text-blue-200 block">ما الذي سيحدث لهواتف الحكام؟</span>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300 leading-relaxed">
              <li>سيتم إرسال أمر مسح فوري لتفريغ التخزين المحلي (IndexedDB / Cache) في هواتف الحكام لتلك المنافسة فقط.</li>
              <li>البيانات غير المرفوعة محمية: سيتأكد التطبيق من رفع كل العمليات المعلقة قبل المسح؛ وفي حال وجود عمليات معلقة يُمنع المسح فورًا.</li>
              <li>الأجهزة غير المتصلة (Offline) ستستقبل وتنفذ أمر المسح تلقائيًا عند أول اتصال.</li>
            </ul>
          </div>

          <div className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 rounded-xl p-4 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--ink-2,#51607A)]">المنافسة:</span>
              <span className="font-bold text-[var(--ink,#0F1B2D)] dark:text-white">{selectedCompetition?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ink-2,#51607A)]">إجمالي التخصصات والعمليات:</span>
              <span className="font-bold text-[var(--success,#15803D)]">{disciplines.length} تخصصات — {totalOperationsCount} عملية</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button
              variant="ghost"
              size="sm"
              disabled={isArchiving}
              onClick={() => setIsFinishModalOpen(false)}
            >
              إلغاء وتراجع
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isArchiving || !canFinishCompetition}
              onClick={handleFinishAndArchive}
              className="flex items-center gap-2 cursor-pointer font-bold"
            >
              {isArchiving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ الأرشفة وبث أمر المسح...</span>
                </>
              ) : !hasFinishPermission ? (
                <span>مقيّد بإدارة الرابطة فقط</span>
              ) : pendingDisciplines.length > 0 ? (
                <span>ممنوع الإنهاء (يوجد {pendingDisciplines.length} اختصاصات عالقة)</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الإنهاء والأرشفة ومسح الهواتف</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 7: DEVICE PURGE AUDIT LOG MODAL ─────────────────────────────── */}
      <Modal
        isOpen={isPurgeLogsModalOpen}
        onClose={() => setIsPurgeLogsModalOpen(false)}
        title="سجل إخلاء وتطهير أجهزة الحكام (Device Purge Audit Log)"
        maxWidth="lg"
      >
        <div className="space-y-4" dir="rtl">
          <div className="flex items-center justify-between text-xs text-[var(--ink-2,#51607A)]">
            <span>سجل مباشر لكل محاولات تفريغ هواتف الحكام وحالتها التدقيقية:</span>
            <Badge variant="accent" size="sm">{purgeLogs.length} سجلات مسجلة</Badge>
          </div>

          {purgeLogs.length === 0 ? (
            <div className="p-8 text-center bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] text-[var(--ink-3,#8593A8)] text-sm">
              لا توجد عمليات مسح مسجلة لهذه المنافسة بعد.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] font-bold sticky top-0 border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                  <tr>
                    <th className="p-3">معرّف الجهاز (Device ID)</th>
                    <th className="p-3">الحكم والمهمة</th>
                    <th className="p-3">الوقت والتاريخ</th>
                    <th className="p-3">الحالة والنتيجة</th>
                    <th className="p-3">البيانات / التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                  {purgeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-900/60 transition">
                      <td className="p-3 font-mono font-bold text-[var(--primary,#0B3A6F)] dark:text-blue-400">{log.deviceId}</td>
                      <td className="p-3">
                        <span className="font-bold text-[var(--ink,#0F1B2D)] dark:text-white block">{log.judgeName || 'حكم ميداني'}</span>
                        <span className="text-[10px] text-[var(--ink-2,#51607A)]">{log.judgeRole || 'نقطة مراقبة'}</span>
                      </td>
                      <td className="p-3 font-mono text-[var(--ink-2,#51607A)]">
                        {new Date(log.timestamp).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-3">
                        {log.status === 'purged_successfully' && (
                          <Badge variant="success" size="sm">
                            ✓ تم المسح بنجاح
                          </Badge>
                        )}
                        {log.status === 'blocked_pending_sync' && (
                          <Badge variant="danger" size="sm">
                            ⚠️ محظور (معلقة: {log.pendingItemsCount})
                          </Badge>
                        )}
                        {log.status === 'error' && (
                          <Badge variant="neutral" size="sm">
                            ✕ خطأ في المسح
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-[var(--ink-2,#51607A)] text-[11px] max-w-[200px] truncate" title={log.message}>
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button variant="secondary" size="sm" onClick={() => setIsPurgeLogsModalOpen(false)}>
              إغلاق النافذة
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
