/**
 * PHOTO FINISH PRO — Competition Secretary Workspace (مساحة سكرتارية المنافسة)
 * Read + review + export focused workstation for the competition secretary judge.
 * NO write paths: consumes existing read APIs only (entries, assignments, bureau ops)
 * plus client-side export/download and window.print() for the official protocol.
 *
 * EXPORT CHOICE: competitionFileService.exportCompetitionBundle(competitionId) is used
 * (src/services/competitionFileService.ts:423) — signature (id: string) => string is
 * cleanly callable; the JSON bundle is downloaded client-side via Blob/anchor.
 * unifiedExportService.exportToPdf/Excel was skipped: assembling a full UnifiedExportPayload
 * is out of scope for a review screen.
 *
 * Visual language aligned with HorizontalJumpsWorkspace: dark cards bg-[#101D35],
 * border-[#1E293B], rounded-3xl, emerald accents, RTL Arabic, tabular-nums.
 * NOTE: the app print stylesheet (index.css @media print) hides <header>/<nav>/<aside>/.no-print
 * — never use those tags inside the print-ready protocol section.
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowRight, Users, ClipboardList, Activity, Printer, Download,
  CalendarDays, MapPin, FileText, AlertTriangle, Inbox, ShieldAlert, type LucideIcon
} from 'lucide-react';
import { judgesAssignmentService, type JudgeAssignment, type JudgeGrade } from '../../services/judgesAssignmentService';
import { competitionsService, type NationalCompetition } from '../../services/competitionsService';
import { competitionEntriesService, type AthleteCompetitionEntry, type EntryResultStatus } from '../../services/competitionEntriesService';
import { competitionsBureauService, type BureauDisciplineWithOps, type OperationLifecycleStatus } from '../../services/competitionsBureauService';
import { competitionFileService } from '../../services/competitionFileService';

export interface CompetitionSecretaryWorkspaceProps {
  assignment: JudgeAssignment;
  readOnly?: boolean;
  onBackToDashboard?: () => void;
}

type SecretaryTab = 'roster' | 'assignments' | 'results' | 'protocol';
interface StatusChip { label: string; cls: string; }

const ENTRY_STATUS_MAP: Record<EntryResultStatus, StatusChip> = {
  entered: { label: 'مُدرَج', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  finished: { label: 'منتهي', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  dns: { label: 'لم يشارك', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  dnf: { label: 'لم يُكمل', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  dq: { label: 'مستبعد', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  nm: { label: 'بلا علامة', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30' }
};

const ASSIGNMENT_STATUS_MAP: Record<JudgeAssignment['status'], StatusChip> = {
  assigned: { label: 'معيَّن', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  active: { label: 'نشِط', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  completed: { label: 'مكتمل', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  cancelled: { label: 'ملغى', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  revoked: { label: 'سحب الاختصاص', cls: 'bg-red-500/15 text-red-300 border-red-500/30' }
};

const LIFECYCLE_MAP: Record<OperationLifecycleStatus, StatusChip> = {
  recorded: { label: 'مسجَّلة', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  sent: { label: 'مُرسَلة', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  received: { label: 'مستلَمة', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  under_review: { label: 'قيد المراجعة', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  certified: { label: 'معتمدة', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'مرفوضة', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  corrected: { label: 'مصحَّحة', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  locked: { label: 'مقفلة', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' }
};

const DISCIPLINE_STATUS_MAP: Record<NonNullable<BureauDisciplineWithOps['status']>, StatusChip> = {
  draft: { label: 'مسودة', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  under_review: { label: 'قيد المراجعة', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  certified: { label: 'معتمدة', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'مرفوضة', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  locked: { label: 'مقفلة', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' }
};

const GRADE_MAP: Record<JudgeGrade, string> = {
  international: 'دولي', federal: 'فيدرالي', regional: 'جهوي', wilaya: 'ولائي', candidate: 'متدرب'
};

const LIFECYCLE_ORDER: OperationLifecycleStatus[] = [
  'recorded', 'sent', 'received', 'under_review', 'certified', 'rejected', 'corrected', 'locked'
];

const TABS: { id: SecretaryTab; label: string; icon: LucideIcon }[] = [
  { id: 'roster', label: 'القوائم والمشاركون', icon: Users },
  { id: 'assignments', label: 'التعيينات', icon: ClipboardList },
  { id: 'results', label: 'حالة النتائج', icon: Activity },
  { id: 'protocol', label: 'المحضر الرسمي', icon: FileText }
];

const fmtDate = (raw: string): string => (raw && raw.length >= 10 ? raw.slice(0, 10) : raw);

const StatusBadge: React.FC<{ chip: StatusChip }> = ({ chip }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${chip.cls}`}>
    {chip.label}
  </span>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-right">{children}</th>
);

const KpiCard: React.FC<{ icon: LucideIcon; value: string; label: string; sub?: string }> = ({ icon: Icon, value, label, sub }) => (
  <div className="bg-[#101D35] border border-[#1E293B] rounded-3xl p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-emerald-400" />
    </div>
    <div className="min-w-0">
      <div className="text-xl font-black text-white tabular-nums leading-tight">{value}</div>
      <div className="text-[11px] text-slate-400 font-semibold truncate">{label}</div>
      {sub && <div className="text-[10px] text-emerald-400/80 tabular-nums">{sub}</div>}
    </div>
  </div>
);

const SkeletonBlock: React.FC = () => (
  <div aria-hidden="true">
    <p className="text-sm text-slate-300 font-semibold mb-3">جاري تحميل بيانات المنافسة...</p>
    <div className="space-y-2">
      {[0, 1, 2, 3].map(i => <div key={i} className="h-10 rounded-xl bg-[#101D35]/70 border border-[#1E293B] animate-pulse" />)}
    </div>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <Inbox className="w-8 h-8 text-slate-500 mb-2" />
    <p className="text-sm text-slate-400 font-semibold">{message}</p>
  </div>
);

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 mb-3 print:hidden no-print">
    <AlertTriangle className="w-4 h-4 shrink-0" />
    {message}
  </div>
);

export const CompetitionSecretaryWorkspace: React.FC<CompetitionSecretaryWorkspaceProps> = ({
  assignment, readOnly = false, onBackToDashboard
}) => {
  // عزل النمط المستقل: مساحة العمل المستقلة (STW-) لا تلمس قاعدة بيانات المنصة إطلاقاً
  const isStandalone = assignment.assignmentRole === 'standalone' || assignment.competitionId.startsWith('STW-');
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const [competitionsError, setCompetitionsError] = useState<string | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>(assignment.competitionId);
  const [entries, setEntries] = useState<AthleteCompetitionEntry[] | null>(null);
  const [assignments, setAssignments] = useState<JudgeAssignment[] | null>(null);
  const [disciplines, setDisciplines] = useState<BureauDisciplineWithOps[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SecretaryTab>('roster');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Load competitions list ONCE on mount; prefer assignment.competitionId when present in the list.
  // في النمط المستقل: لا تحميل لأي بيانات منصة — عزل بالتصميم (الرؤية المعمارية PHASE 3.1)
  useEffect(() => {
    if (isStandalone) {
      setCompetitions([]);
      setCompetitionsLoading(false);
      setEntries([]);
      setAssignments([]);
      setDisciplines([]);
      return;
    }
    let cancelled = false;
    setCompetitionsLoading(true);
    competitionsService.getCompetitions()
      .then(list => {
        if (cancelled) return;
        setCompetitions(list);
        setCompetitionsError(null);
        setSelectedCompetitionId(prev =>
          prev && list.some(c => c.id === prev) ? prev : (list.length > 0 ? list[0].id : prev)
        );
      })
      .catch(() => { if (!cancelled) setCompetitionsError('تعذر تحميل قائمة المنافسات من خدمة المنافسات.'); })
      .finally(() => { if (!cancelled) setCompetitionsLoading(false); });
    return () => { cancelled = true; };
  }, [isStandalone]);

  // Load per-competition data (entries + assignments + bureau result operations) on selection change.
  // في النمط المستقل: القوائم فارغة بالتصميم — تُعرض لوحات «لا بيانات» بدل تسريب بيانات المنصة
  useEffect(() => {
    if (isStandalone) return;
    if (!selectedCompetitionId) { setEntries([]); setAssignments([]); setDisciplines([]); return; }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    Promise.all([
      competitionEntriesService.getEntries(selectedCompetitionId),
      Promise.resolve(judgesAssignmentService.getAssignments(selectedCompetitionId)),
      competitionsBureauService.getCompetitionDisciplinesWithOperations(selectedCompetitionId)
    ])
      .then(([entriesRes, assignmentsRes, disciplinesRes]) => {
        if (cancelled) return;
        setEntries(entriesRes);
        setAssignments(assignmentsRes);
        setDisciplines(disciplinesRes);
      })
      .catch(() => { if (!cancelled) setDetailError('تعذر تحميل بيانات المنافسة المحددة. حاول تغيير المنافسة أو إعادة المحاولة.'); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCompetitionId, isStandalone]);

  const selectedCompetition = competitions.find(c => c.id === selectedCompetitionId) ?? null;
  const allOperations = disciplines?.flatMap(d => d.operations) ?? [];
  const certifiedCount = allOperations.filter(op => op.lifecycleStatus === 'certified').length;
  const lifecycleSummary = LIFECYCLE_ORDER
    .map(status => ({ status, count: allOperations.filter(op => op.lifecycleStatus === status).length }))
    .filter(item => item.count > 0);
  const leagueName = selectedCompetition?.leagueName || 'الرابطة الولائية لألعاب القوى';
  const venue = selectedCompetition?.venue || assignment.venue;
  const date = fmtDate(selectedCompetition?.date || assignment.date);

  const handleExportBundle = (): void => {
    if (!selectedCompetition) return;
    try {
      const bundleJson = competitionFileService.exportCompetitionBundle(selectedCompetition.id);
      const blob = new Blob([bundleJson], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pfp-competition-${selectedCompetition.id}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setExportFeedback('تم تصدير ملف المنافسة (PFP Bundle) بنجاح.');
    } catch (err) {
      setExportFeedback(err instanceof Error ? err.message : 'فشل تصدير ملف المنافسة.');
    }
  };

  const renderRoster = () => {
    if (!entries) return <SkeletonBlock />;
    if (entries.length === 0) return <EmptyState message="لا توجد مداخل أو مشاركون مسجلون لهذه المنافسة بعد." />;
    const headers = ['الرقم', 'العداء', 'النادي', 'الفئة', 'المسابقة', 'العلامة', 'الحالة'];
    return (
      <div className="overflow-x-auto rounded-2xl border border-[#1E293B] bg-[#101D35]/60">
        <table className="glass-table min-w-[760px]">
          <thead><tr>{headers.map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td className="tabular-nums font-bold text-emerald-300">{e.bib}</td>
                <td className="font-bold text-white">{e.athleteName}</td>
                <td className="text-slate-300">{e.clubName}</td>
                <td className="text-slate-300">{e.category}</td>
                <td className="text-slate-300">{e.disciplineNameAr}</td>
                <td className="tabular-nums text-slate-200">{e.mark || '—'}</td>
                <td><StatusBadge chip={ENTRY_STATUS_MAP[e.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAssignments = () => {
    if (!assignments) return <SkeletonBlock />;
    if (assignments.length === 0) return <EmptyState message="لا توجد تعيينات حكام مسجلة لهذه المنافسة." />;
    const headers = ['الحكم', 'الدرجة', 'المهمة', 'الفعالية', 'المكان', 'الحالة'];
    return (
      <div className="overflow-x-auto rounded-2xl border border-[#1E293B] bg-[#101D35]/60">
        <table className="glass-table min-w-[720px]">
          <thead><tr>{headers.map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id}>
                <td className="font-bold text-white">{a.judgeName}</td>
                <td className="text-slate-300">{GRADE_MAP[a.judgeGrade]}</td>
                <td className="text-slate-200">{a.taskTitleAr}</td>
                <td className="text-slate-300">{a.disciplineNameAr}</td>
                <td className="text-slate-400 text-xs">{a.venue}</td>
                <td><StatusBadge chip={ASSIGNMENT_STATUS_MAP[a.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderResults = () => {
    if (!disciplines) return <SkeletonBlock />;
    if (disciplines.length === 0) return <EmptyState message="لا توجد عمليات نتائج مسجلة لهذه المنافسة بعد." />;
    const opHeaders = ['الرقم', 'الرياضي', 'النادي', 'العلامة', 'حالة الدورة'];
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {lifecycleSummary.map(({ status, count }) => (
            <span key={status} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tabular-nums bg-[#101D35] border-[#1E293B] text-slate-300">
              <StatusBadge chip={LIFECYCLE_MAP[status]} /><span>{count}</span>
            </span>
          ))}
        </div>
        {disciplines.map(d => (
          <div key={d.id} className="bg-[#101D35] border border-[#1E293B] rounded-3xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#1E293B]">
              <div>
                <span className="font-bold text-white text-sm">{d.nameAr}</span>
                <span className="text-xs text-slate-400 mr-2">({d.categoryNameAr})</span>
              </div>
              <div className="flex items-center gap-2">
                {d.status && <StatusBadge chip={DISCIPLINE_STATUS_MAP[d.status]} />}
                <span className="text-[11px] text-slate-400 tabular-nums">{d.operations.length} عملية</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="glass-table min-w-[640px]">
                <thead><tr>{opHeaders.map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {d.operations.map(op => (
                    <tr key={op.id}>
                      <td className="tabular-nums text-slate-300">{op.bibNumber}</td>
                      <td className="font-bold text-white">{op.athleteName}</td>
                      <td className="text-slate-300">{op.clubName}</td>
                      <td className="tabular-nums text-emerald-300">{op.mark}</td>
                      <td><StatusBadge chip={LIFECYCLE_MAP[op.lifecycleStatus ?? 'recorded']} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProtocol = () => (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden no-print">
        <button type="button" onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 transition-colors">
          <Printer className="w-4 h-4" />طباعة المحضر
        </button>
        {!readOnly && selectedCompetition && (
          <button type="button" onClick={handleExportBundle}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#101D35] hover:bg-[#16294a] border border-[#1E293B] text-slate-200 text-sm font-bold px-4 py-2.5 transition-colors">
            <Download className="w-4 h-4" />تصدير ملف المنافسة
          </button>
        )}
        {exportFeedback && <span className="text-xs font-semibold text-emerald-300">{exportFeedback}</span>}
      </div>
      <div className="max-w-[820px] mx-auto bg-white text-slate-900 rounded-3xl border border-[#1E293B] p-8">
        <div className="text-center border-b-2 border-slate-300 pb-4">
          <div className="text-lg font-black">{leagueName}</div>
          <div className="text-2xl font-black mt-2">{selectedCompetition?.name || 'منافسة ألعاب القوى'}</div>
          <div className="text-sm text-slate-600 mt-2 tabular-nums">المكان: {venue} &nbsp;|&nbsp; التاريخ: {date}</div>
          <div className="inline-block mt-3 rounded-full border-2 border-slate-800 px-4 py-1 text-sm font-black tracking-wide">محضر نتائج</div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 text-center">
          {[['عدد المشاركين', entries?.length ?? 0], ['عدد التعيينات', assignments?.length ?? 0], ['عمليات النتائج', allOperations.length]].map(([lbl, val]) => (
            <div key={String(lbl)} className="border border-slate-300 rounded-2xl p-3">
              <div className="text-2xl font-black tabular-nums">{val}</div>
              <div className="text-[11px] text-slate-600 font-bold">{lbl}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 border border-slate-300 rounded-2xl p-4">
          <div className="text-sm font-black mb-2">ملخص حالة النتائج {allOperations.length > 0 && `(منها ${certifiedCount} معتمدة)`}</div>
          {lifecycleSummary.length === 0 ? (
            <p className="text-xs text-slate-500">لا توجد عمليات نتائج مسجلة بعد.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
              {lifecycleSummary.map(({ status, count }) => (
                <li key={status} className="text-xs font-bold tabular-nums border border-slate-300 rounded-full px-3 py-1">
                  {LIFECYCLE_MAP[status].label}: {count}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-3 gap-6 mt-10">
          {[{ role: 'كاتب المحضر', name: assignment.judgeName }, { role: 'رئيس الحكام', name: '' }, { role: 'التاريخ', name: date }].map(item => (
            <div key={item.role} className="text-center">
              <div className="h-14 border-b-2 border-slate-800 flex items-end justify-center pb-1 text-xs font-bold text-slate-700">{item.name}</div>
              <div className="text-xs font-black mt-2">{item.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="space-y-4">
      <div className="bg-[#101D35] border border-[#1E293B] rounded-3xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden no-print">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToDashboard && (
            <button type="button" onClick={onBackToDashboard} aria-label="العودة إلى لوحة الحكام"
              className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center hover:bg-emerald-500/20 transition-colors shrink-0">
              <ArrowRight className="w-5 h-5 text-emerald-400" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-black text-white truncate">مساحة سكرتارية المنافسة</h1>
            <p className="text-xs text-slate-400 truncate">الحكم: {assignment.judgeName} — {assignment.taskTitleAr}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readOnly && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-bold px-3 py-1">قراءة فقط</span>}
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-semibold"><MapPin className="w-3.5 h-3.5 text-emerald-400" />{venue}</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-semibold tabular-nums"><CalendarDays className="w-3.5 h-3.5 text-emerald-400" />{date}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Activity} value={String(competitions.length)} label="المنافسات المكتشفة" />
        <KpiCard icon={Users} value={entries ? String(entries.length) : '—'} label="مداخل المنافسة المحددة" />
        <KpiCard icon={ClipboardList} value={assignments ? String(assignments.length) : '—'} label="تعيينات الحكام" />
        <KpiCard icon={FileText} value={disciplines ? String(allOperations.length) : '—'} label="عمليات النتائج"
          sub={disciplines ? `${certifiedCount} معتمدة` : undefined} />
      </div>

      <div className="bg-[#101D35] border border-[#1E293B] rounded-3xl p-4 space-y-3 print:hidden no-print">
        {isStandalone ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              النمط المستقل: هذه المساحة تعمل بمعزل تام عن بيانات الرابطة — لا توجد منافسات منصة
              متصلة. صدّر مساحة العمل من فضاء الميدان لمراجعة بياناتها المحلية خارج التطبيق.
            </span>
          </div>
        ) : (
          <label className="block">
            <span className="block text-xs font-bold text-slate-400 mb-1.5">اختيار المنافسة</span>
            <select value={selectedCompetitionId} disabled={competitionsLoading}
              onChange={ev => { setSelectedCompetitionId(ev.target.value); setExportFeedback(null); }}
              className="w-full sm:w-96 rounded-2xl bg-[#0B162B] border border-[#1E293B] text-white text-sm font-bold px-3 py-2.5 outline-none focus:border-emerald-500/50 disabled:opacity-50">
              {competitionsLoading && <option value="">جاري تحميل قائمة المنافسات...</option>}
              {competitions.length === 0 && !competitionsLoading && <option value={selectedCompetitionId}>لا توجد منافسات متاحة</option>}
              {competitions.map(c => <option key={c.id} value={c.id}>{c.name} — {fmtDate(c.date)}</option>)}
            </select>
          </label>
        )}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="أقسام مساحة السكرتارية">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" role="tab" aria-selected={isActive} onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-colors border ${
                  isActive ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-[#0B162B] border-[#1E293B] text-slate-300 hover:text-white'
                }`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#101D35] border border-[#1E293B] rounded-3xl p-4 sm:p-5 min-h-[240px]">
        {competitionsError && <ErrorBanner message={competitionsError} />}
        {detailError && <ErrorBanner message={detailError} />}
        {detailLoading && activeTab !== 'protocol' ? (
          <SkeletonBlock />
        ) : (
          <>
            {activeTab === 'roster' && renderRoster()}
            {activeTab === 'assignments' && renderAssignments()}
            {activeTab === 'results' && renderResults()}
            {activeTab === 'protocol' && renderProtocol()}
          </>
        )}
      </div>
    </div>
  );
};
