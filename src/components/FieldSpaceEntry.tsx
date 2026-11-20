/**
 * PHOTO FINISH PRO — ميدان التحكيم المستقل (Independent Field Judging Space)
 * ═══════════════════════════════════════════════════════════════════════════
 * القرار الأول في الرؤية المعمارية: ميدان التحكيم ليس صفحة داخل حساب الرابطة
 * بل فضاء عمل مستقل له مدخله وتصميمه ودورة حياته الخاصة (يُعرض عبر ?space=field
 * بلا NavShell إطلاقاً).
 *
 * نمطا الدخول (PHASE 3.1):
 *   1) دخول بكود المهمة — تحقق صارم: الكود يجب أن يكون مرتبطاً بتكليف رسمي
 *      صادر من الرابطة (لا يُقبل أي كود شكلي ≥6 أحرف كما كان سابقاً).
 *   2) العمل المستقل Standalone — مساحة عمل محلية معزولة تماماً عن بيانات
 *      الرابطات (معرفات مستقلة، بلا league_id، تصدير/استيراد JSON).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  KeyRound,
  Wifi,
  WifiOff,
  RefreshCcw,
  ArrowRight,
  Trash2,
  Download,
  Upload,
  Plus,
  UserPlus,
  Play,
  Database,
  Loader2,
  ShieldCheck,
  Award,
  X
} from 'lucide-react';
import { DutyCodeCheckIn, type TaskAssignment } from './public/DutyCodeCheckIn';
import { SmartJudgeWorkspace } from './judges/SmartJudgeWorkspace';
import { judgesAssignmentService, type JudgeAssignment } from '../services/judgesAssignmentService';
import {
  standaloneWorkspaceService,
  type StandaloneWorkspace,
  type StandaloneAthlete
} from '../services/standaloneWorkspaceService';
import { smartJudgeWorkspaceService } from '../services/smartJudgeWorkspaceService';
import type { FieldAthleteScore } from '../types/athletics';
import type { DisciplineCategoryType, OfficialDutyTask } from '../services/judgesAssignmentService';

type FieldView = 'entry' | 'active';
type StandalonePanel = 'none' | 'manage' | 'detail';

/** تحويل عداء مساحة العمل المستقلة إلى عداء ميداني جاهز للتحكيم (بلا أي بيانات تجريبية) */
function toFieldAthlete(sa: StandaloneAthlete, index: number): FieldAthleteScore {
  return {
    athleteId: sa.id,
    athleteName: sa.fullName,
    bibNumber: Number.parseInt(sa.bib, 10) || index + 1,
    clubName: sa.clubName || 'مستقل',
    order: index + 1,
    attempts: [],
    bestValidMeasurement: 0,
    secondBestMeasurement: 0,
    rank: 0,
    status: 'active'
  };
}

const CATEGORY_OPTIONS: Array<{ value: DisciplineCategoryType; labelAr: string }> = [
  { value: 'jumps_horizontal', labelAr: 'الوثب الطويل والثلاثي' },
  { value: 'jumps_vertical', labelAr: 'الوثب العالي والقفز بالزانة' },
  { value: 'throws', labelAr: 'مسابقات الرمي' },
  { value: 'running', labelAr: 'سباقات المضمار' },
  { value: 'checkpoint', labelAr: 'نقاط المراقبة والعدو الريفي' }
];

const TASK_OPTIONS: Array<{ value: OfficialDutyTask; labelAr: string }> = [
  { value: 'field_judge_jumps', labelAr: 'حكم مسابقات الوثب' },
  { value: 'chief_field_jumps', labelAr: 'رئيس حكام الوثب' },
  { value: 'field_judge_throws', labelAr: 'حكم مسابقات الرمي' },
  { value: 'chief_field_throws', labelAr: 'رئيس حكام الرمي' },
  { value: 'wind_gauge_operator', labelAr: 'مشغل مقياس الرياح' },
  { value: 'secretary', labelAr: 'كاتب المحضر والنتائج' },
  { value: 'finish_judge', labelAr: 'قاضي خط النهاية' },
  { value: 'starter', labelAr: 'قاضي خط البداية' }
];

export const FieldSpaceEntry: React.FC = () => {
  const [view, setView] = useState<FieldView>('entry');
  const [activeAssignment, setActiveAssignment] = useState<JudgeAssignment | null>(null);
  const [otherAssignments, setOtherAssignments] = useState<JudgeAssignment[]>([]);

  const [standalonePanel, setStandalonePanel] = useState<StandalonePanel>('none');
  const [workspaces, setWorkspaces] = useState<StandaloneWorkspace[]>([]);
  const [openWorkspaceId, setOpenWorkspaceId] = useState<string | null>(null);
  /** عدائون محليون للنمط المستقل — تُحقن في مساحة العمل بدل البيانات التجريبية */
  const [standaloneAthletes, setStandaloneAthletes] = useState<FieldAthleteScore[]>([]);

  // نموذج إنشاء مساحة عمل مستقلة
  const [wsName, setWsName] = useState('');
  const [wsCompetition, setWsCompetition] = useState('');
  const [wsVenue, setWsVenue] = useState('');
  const [wsDate, setWsDate] = useState(() => new Date().toISOString().slice(0, 10));

  // نموذج إضافة تخصص وعداء داخل مساحة مفتوحة
  const [discName, setDiscName] = useState('');
  const [discCategory, setDiscCategory] = useState<DisciplineCategoryType>('jumps_horizontal');
  const [discTask, setDiscTask] = useState<OfficialDutyTask>('field_judge_jumps');
  const [athleteName, setAthleteName] = useState('');
  const [athleteBib, setAthleteBib] = useState('');
  const [athleteClub, setAthleteClub] = useState('');

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshStatus = useCallback(() => {
    try {
      setIsOnline(smartJudgeWorkspaceService.isOnline());
      setPendingCount(smartJudgeWorkspaceService.getPendingQueueCount());
    } catch {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
      setPendingCount(0);
    }
  }, []);

  const refreshWorkspaces = useCallback(() => {
    setWorkspaces(standaloneWorkspaceService.listWorkspaces());
  }, []);

  useEffect(() => {
    refreshWorkspaces();
    refreshStatus();
    const t = window.setInterval(refreshStatus, 5000);
    return () => window.clearInterval(t);
  }, [refreshWorkspaces, refreshStatus]);

  /** فتح كود مهمة رسمي — تحقق صارم: التكليف الرسمي فقط (وفق PHASE 3.1) */
  const handleUnlockTask = useCallback((task: TaskAssignment) => {
    const verification = judgesAssignmentService.verifyDutyCode(task.code);
    if (!verification.valid || !verification.duty) {
      setNotice('الكود غير مرتبط بتكليف رسمي صادر من الرابطة — فضاء الميدان يقبل أكواد المهام الرسمية فقط.');
      return;
    }
    const asg = judgesAssignmentService
      .getAssignments()
      .find(a => a.dutyCode === verification.duty?.dutyCode && a.status !== 'cancelled' && a.status !== 'revoked');
    if (!asg) {
      setNotice('تعذر العثور على التكليف المرتبط بهذا الكود أو تم إلغاؤه من الرابطة.');
      return;
    }
    const judge = judgesAssignmentService.getJudgeById(asg.judgeId);
    const all = judge ? judgesAssignmentService.getAssignmentsForJudge(judge.id) : [];
    setOtherAssignments(all.filter(a => a.id !== asg.id && a.status !== 'cancelled' && a.status !== 'revoked'));
    setStandaloneAthletes([]); // مسار رسمي — بلا عدائين محليين
    setActiveAssignment(asg);
    setView('active');
    setNotice(null);
  }, []);

  /** بدء التحكيم على تخصص من مساحة عمل مستقلة — عدائون محليون، عزل كامل */
  const startStandaloneTask = useCallback(async (ws: StandaloneWorkspace, disciplineId: string, judgeName: string, task: OfficialDutyTask) => {
    setBusy(true);
    try {
      const asg = standaloneWorkspaceService.buildLocalAssignment(ws, disciplineId, judgeName, task);
      if (!asg) {
        setNotice('تعذر بناء التكليف المحلي — تأكد من وجود التخصص.');
        return;
      }
      // حقن العدائين المحليين للمساحة — عزل كامل عن البيانات التجريبية
      setStandaloneAthletes(ws.athletes.map((a, i) => toFieldAthlete(a, i)));
      setOtherAssignments([]);
      setActiveAssignment(asg);
      setView('active');
      setNotice(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const createStandaloneWorkspace = useCallback(() => {
    if (!wsName.trim() || !wsCompetition.trim()) {
      setNotice('اسم مساحة العمل واسم المنافسة حقلان إلزاميان.');
      return;
    }
    const ws = standaloneWorkspaceService.createWorkspace({
      nameAr: wsName.trim(),
      competitionTitleAr: wsCompetition.trim(),
      venue: wsVenue.trim() || 'الميدان المحلي',
      date: wsDate || new Date().toISOString().slice(0, 10)
    });
    setWsName('');
    setWsCompetition('');
    setWsVenue('');
    refreshWorkspaces();
    setOpenWorkspaceId(ws.id);
    setStandalonePanel('detail');
    setNotice(`تم إنشاء مساحة العمل المستقلة (${ws.id}) — بياناتها محلية ومعزولة تماماً.`);
  }, [wsName, wsCompetition, wsVenue, wsDate, refreshWorkspaces]);

  const openWorkspace = workspaces.find(w => w.id === openWorkspaceId) || null;

  const exportOpenWorkspace = useCallback(() => {
    if (!openWorkspace) return;
    const json = standaloneWorkspaceService.exportWorkspace(openWorkspace.id);
    if (!json) return;
    try {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${openWorkspace.id}-workspace.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('تم تصدير مساحة العمل — الملف يصلح كنسخة احتياطية كاملة.');
    } catch {
      setNotice('تعذر تنزيل الملف في هذا المتصفح.');
    }
  }, [openWorkspace]);

  const importWorkspaceFile = useCallback(async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const res = standaloneWorkspaceService.importWorkspace(text, { onConflictRename: true });
      if (!res.ok) {
        setImportError(res.error || 'فشل الاستيراد');
        return;
      }
      refreshWorkspaces();
      if (res.workspace) {
        setOpenWorkspaceId(res.workspace.id);
        setStandalonePanel('detail');
      }
      setNotice(`تم استيراد مساحة العمل بنجاح${res.workspace ? ` (${res.workspace.id})` : ''}.`);
    } catch {
      setImportError('تعذر قراءة الملف المحدد.');
    }
  }, [refreshWorkspaces]);

  // ═══════════ عرض مساحة العمل النشطة (توزيع عبر SmartJudgeWorkspace) ═══════════
  if (view === 'active' && activeAssignment) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
        <FieldStatusBar
          isOnline={isOnline}
          pendingCount={pendingCount}
          onExit={() => {
            setView('entry');
            setActiveAssignment(null);
            refreshWorkspaces();
          }}
        />
        <SmartJudgeWorkspace
          assignment={activeAssignment}
          otherAssignments={otherAssignments}
          standaloneAthletes={standaloneAthletes}
          onSwitchAssignment={(a) => {
            setActiveAssignment(a);
            setOtherAssignments(prev => prev.filter(x => x.id !== a.id));
          }}
          onBackToDashboard={() => {
            setView('entry');
            setActiveAssignment(null);
            refreshWorkspaces();
          }}
        />
      </div>
    );
  }

  // ═══════════ شاشة الدخول: نمطا العمل + إدارة المساحات المستقلة ═══════════
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      <FieldStatusBar isOnline={isOnline} pendingCount={pendingCount} onExit={() => {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('space');
          window.history.replaceState({}, '', url.pathname);
          window.location.href = url.pathname;
        } catch {
          window.location.href = window.location.pathname;
        }
      }} />

      <main className="max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* ترويسة الفضاء */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            PHOTO FINISH PRO — فضاء التحكيم الميداني المستقل
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            ميدان التحكيم
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            اختر طريقة العمل: استلم مهمتك الرسمية بكود الرابطة، أو ابدأ مساحة عمل مستقلة
            تعمل دون أي حساب إداري — وتُزامن بياناتك تلقائياً عند عودة الاتصال.
          </p>
        </div>

        {notice && (
          <div className="glass-card p-3 text-sm font-bold text-amber-300 flex items-center gap-2" role="status">
            <RefreshCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="ms-auto text-slate-500 hover:text-white" aria-label="إغلاق التنبيه">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* بطاقتا نمطا العمل */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1 — كود المهمة الرسمي */}
          <section className="glass-card-strong p-5 space-y-4" aria-labelledby="mode-duty">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                <KeyRound className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="mode-duty" className="text-base font-black text-white">الدخول بكود المهمة</h2>
                <p className="text-[11px] text-slate-400 font-bold">متصل بالرابطة — استلام تعيين رسمي</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              تحقق صارم من التكليف: تحميل المنافسة والقوائم والتخصص والصلاحيات تلقائياً،
              وواجهة عمل مخصصة حسب نوع المهمة.
            </p>
            <DutyCodeCheckIn
              onUnlockTask={handleUnlockTask}
              onEnterGeneralField={() => setNotice('اختر دوراً من نمط العمل المستقل، أو أدخل كود تكليف رسمي صادر من الرابطة.')}
            />
          </section>

          {/* 2 — العمل المستقل */}
          <section className="glass-card-strong p-5 space-y-4" aria-labelledby="mode-standalone">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                <Database className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="mode-standalone" className="text-base font-black text-white">العمل المستقل</h2>
                <p className="text-[11px] text-slate-400 font-bold">Standalone — دون حساب رابطة</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              إنشاء مساحة عمل محلية معزولة: تخصصاتك وعداؤوك وقوائمك على جهازك فقط،
              مع تصدير/استيراد كامل — ولا تُرسل أي بيانات لأي حساب إداري تلقائياً.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStandalonePanel(standalonePanel === 'manage' ? 'none' : 'manage')}
                className="judge-touch-button px-3 bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                إنشاء مساحة
              </button>
              <button
                type="button"
                onClick={() => {
                  refreshWorkspaces();
                  const target: StandalonePanel = standalonePanel === 'detail' && openWorkspaceId ? 'none' : 'detail';
                  setStandalonePanel(target);
                  // فتح أول مساحة تلقائياً عند غياب اختيار — وإلا وجّه المستخدم للإنشاء
                  if (target === 'detail' && !openWorkspaceId) {
                    const list = standaloneWorkspaceService.listWorkspaces();
                    if (list.length > 0) setOpenWorkspaceId(list[0].id);
                    else setStandalonePanel('manage');
                  }
                }}
                className="judge-touch-button px-3 bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800 transition-colors text-sm"
              >
                <ClipboardList className="w-4 h-4" aria-hidden="true" />
                مساحاتي ({workspaces.length})
              </button>
            </div>
          </section>
        </div>

        {/* لوحة إنشاء مساحة عمل مستقلة */}
        {standalonePanel === 'manage' && (
          <section className="glass-card-strong p-5 space-y-4" aria-label="إنشاء مساحة عمل مستقلة">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" aria-hidden="true" />
              مساحة عمل مستقلة جديدة
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-bold text-slate-300">
                اسم مساحة العمل *
                <input value={wsName} onChange={e => setWsName(e.target.value)} placeholder="مثال: لقاء الربيع المفتوح"
                  className="glass-input w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-300">
                اسم المنافسة *
                <input value={wsCompetition} onChange={e => setWsCompetition(e.target.value)} placeholder="مثال: الوثب الطويل — نهائي"
                  className="glass-input w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-300">
                المكان
                <input value={wsVenue} onChange={e => setWsVenue(e.target.value)} placeholder="ملعب الجامعة"
                  className="glass-input w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-300">
                التاريخ
                <input type="date" value={wsDate} onChange={e => setWsDate(e.target.value)}
                  className="glass-input w-full px-3 py-2.5 text-sm" />
              </label>
            </div>
            <button
              type="button"
              onClick={createStandaloneWorkspace}
              className="judge-touch-button w-full bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Database className="w-4 h-4" aria-hidden="true" />
              إنشاء المساحة والبدء في تجهيزها
            </button>
            {workspaces.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold text-slate-400">مساحات محفوظة على هذا الجهاز:</p>
                {workspaces.map(ws => (
                  <div key={ws.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-100 truncate">{ws.nameAr}</p>
                      <p className="text-[10px] text-slate-400 font-mono" dir="ltr">{ws.id} • {ws.athletes.length} عداء • {ws.disciplines.length} تخصص</p>
                    </div>
                    <button onClick={() => { setOpenWorkspaceId(ws.id); setStandalonePanel('detail'); }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors">
                      فتح
                    </button>
                    <button
                      onClick={() => {
                        standaloneWorkspaceService.deleteWorkspace(ws.id);
                        refreshWorkspaces();
                        if (openWorkspaceId === ws.id) setOpenWorkspaceId(null);
                      }}
                      className="p-2 rounded-lg bg-red-950/60 border border-red-900/60 text-red-300 hover:text-red-200 transition-colors"
                      aria-label={`حذف مساحة ${ws.nameAr}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* لوحة تفاصيل المساحة المفتوحة */}
        {standalonePanel === 'detail' && openWorkspace && (
          <StandaloneWorkspacePanel
            ws={openWorkspace}
            discName={discName} setDiscName={setDiscName}
            discCategory={discCategory} setDiscCategory={setDiscCategory}
            discTask={discTask} setDiscTask={setDiscTask}
            athleteName={athleteName} setAthleteName={setAthleteName}
            athleteBib={athleteBib} setAthleteBib={setAthleteBib}
            athleteClub={athleteClub} setAthleteClub={setAthleteClub}
            busy={busy}
            notice={notice}
            importError={importError}
            onChanged={refreshWorkspaces}
            setNotice={setNotice}
            exportWorkspace={exportOpenWorkspace}
            importWorkspaceFile={importWorkspaceFile}
            startTask={startStandaloneTask}
          />
        )}

        {/* خروج أنيق أسفل الشاشة */}
        <div className="text-center pb-6">
          <p className="text-[10px] text-slate-500 font-bold">
            PHOTO FINISH PRO • ميدان التحكيم المستقل — يعمل أوفلاين بالكامل ويتزامن عند عودة الاتصال
          </p>
        </div>
      </main>
    </div>
  );
};

/** شريط حالة الفضاء: اتصال + مزامنة معلقة + خروج إلى المنصة */
const FieldStatusBar: React.FC<{ isOnline: boolean; pendingCount: number; onExit: () => void }> = ({ isOnline, pendingCount, onExit }) => (
  <div className="sticky top-0 z-40 bg-[#0B1220] border-b border-emerald-950/60 safe-top">
    <div className="max-w-5xl mx-auto w-full px-4 h-12 flex items-center gap-3">
      <span className="text-sm font-black text-emerald-400">ميدان التحكيم</span>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${isOnline ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800' : 'bg-amber-950/70 text-amber-300 border-amber-800'}`}>
        {isOnline ? <Wifi className="w-3 h-3" aria-hidden="true" /> : <WifiOff className="w-3 h-3" aria-hidden="true" />}
        {isOnline ? 'متصل' : 'أوفلاين — التسجيل مستمر'}
      </span>
      {pendingCount > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-sky-950/70 text-sky-300 border border-sky-800">
          <RefreshCcw className="w-3 h-3 animate-spin" aria-hidden="true" />
          {pendingCount} عملية بانتظار المزامنة
        </span>
      )}
      <button
        onClick={onExit}
        className="ms-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-xs font-bold"
      >
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        المنصة الرئيسية
      </button>
    </div>
  </div>
);

interface PanelProps {
  ws: StandaloneWorkspace;
  discName: string; setDiscName: (v: string) => void;
  discCategory: DisciplineCategoryType; setDiscCategory: (v: DisciplineCategoryType) => void;
  discTask: OfficialDutyTask; setDiscTask: (v: OfficialDutyTask) => void;
  athleteName: string; setAthleteName: (v: string) => void;
  athleteBib: string; setAthleteBib: (v: string) => void;
  athleteClub: string; setAthleteClub: (v: string) => void;
  busy: boolean;
  notice: string | null;
  importError: string | null;
  onChanged: () => void;
  setNotice: (v: string | null) => void;
  exportWorkspace: () => void;
  importWorkspaceFile: (f: File) => Promise<void>;
  startTask: (ws: StandaloneWorkspace, disciplineId: string, judgeName: string, task: OfficialDutyTask) => Promise<void>;
}

const StandaloneWorkspacePanel: React.FC<PanelProps> = ({
  ws, discName, setDiscName, discCategory, setDiscCategory, discTask, setDiscTask,
  athleteName, setAthleteName, athleteBib, setAthleteBib, athleteClub, setAthleteClub,
  busy, importError, onChanged, setNotice, exportWorkspace, importWorkspaceFile, startTask
}) => {
  const [judgeName, setJudgeName] = useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  return (
    <section className="glass-card-strong p-5 space-y-5" aria-label={`مساحة العمل ${ws.nameAr}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <h3 className="text-base font-black text-white">{ws.nameAr}</h3>
          <p className="text-[11px] text-slate-400">{ws.competitionTitleAr} • {ws.venue} • {ws.date}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-900 border border-slate-700 text-slate-300 font-mono" dir="ltr">{ws.id}</span>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950/70 border border-emerald-800 text-emerald-300">معزولة محلياً</span>
        <button onClick={exportWorkspace} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors" aria-label="تصدير مساحة العمل">
          <Download className="w-4 h-4" aria-hidden="true" />
        </button>
        <button onClick={() => fileRef.current?.click()} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors" aria-label="استيراد مساحة عمل">
          <Upload className="w-4 h-4" aria-hidden="true" />
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void importWorkspaceFile(f); e.target.value = ''; }} />
      </div>

      {importError && <p className="text-xs font-bold text-red-300">{importError}</p>}

      {/* إدارة التخصصات */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
          تخصصات التحكيم ({ws.disciplines.length})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input value={discName} onChange={e => setDiscName(e.target.value)} placeholder="اسم التخصص (الوثب الطويل — نهائي)"
            className="glass-input px-3 py-2.5 text-xs sm:col-span-2" />
          <select value={discCategory} onChange={e => setDiscCategory(e.target.value as DisciplineCategoryType)} className="glass-input px-2 py-2.5 text-xs">
            {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.labelAr}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!discName.trim()) { setNotice('اكتب اسم التخصص أولاً.'); return; }
              const d = standaloneWorkspaceService.addDiscipline(ws.id, discName.trim(), discCategory, [discTask]);
              if (!d) { setNotice('هذا التخصص موجود مسبقاً في المساحة.'); return; }
              setDiscName('');
              onChanged();
              setNotice(`تمت إضافة التخصص (${d.nameAr}).`);
            }}
            className="judge-touch-button bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-xs"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> إضافة
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ws.disciplines.map(d => (
            <div key={d.id} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-100 truncate">{d.nameAr}</p>
                  <p className="text-[10px] text-slate-400">{CATEGORY_OPTIONS.find(c => c.value === d.category)?.labelAr || d.category}</p>
                </div>
                <button
                  onClick={() => { standaloneWorkspaceService.removeDiscipline(ws.id, d.id); onChanged(); }}
                  className="p-1.5 rounded-lg bg-red-950/50 border border-red-900/50 text-red-300 hover:text-red-200"
                  aria-label={`حذف تخصص ${d.nameAr}`}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <input value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="اسم الحكم"
                  className="glass-input flex-1 min-w-[120px] px-2.5 py-1.5 text-[11px]" />
                <select value={discTask} onChange={e => setDiscTask(e.target.value as OfficialDutyTask)} className="glass-input px-1.5 py-1.5 text-[10px] max-w-[150px]">
                  {TASK_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
                </select>
                <button
                  type="button"
                  disabled={busy || !judgeName.trim()}
                  onClick={() => { void startTask(ws, d.id, judgeName.trim(), discTask); }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-black inline-flex items-center gap-1 transition-colors"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Play className="w-3 h-3" aria-hidden="true" />}
                  بدء التحكيم
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* إدارة العدائين */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
          المشاركون ({ws.athletes.length}) — بيانات محلية بحتة
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input value={athleteName} onChange={e => setAthleteName(e.target.value)} placeholder="اسم العداء"
            className="glass-input px-3 py-2.5 text-xs" />
          <input value={athleteClub} onChange={e => setAthleteClub(e.target.value)} placeholder="النادي (اختياري)"
            className="glass-input px-3 py-2.5 text-xs" />
          <input value={athleteBib} onChange={e => setAthleteBib(e.target.value)} inputMode="numeric" placeholder="رقم الصدريية"
            className="glass-input px-3 py-2.5 text-xs" />
          <button
            type="button"
            onClick={() => {
              if (!athleteName.trim() || !athleteBib.trim()) { setNotice('اسم العداء ورقم الصدريية إلزاميان.'); return; }
              const a = standaloneWorkspaceService.addAthlete(ws.id, {
                bib: athleteBib.trim(), fullName: athleteName.trim(), clubName: athleteClub.trim() || undefined
              });
              if (!a) { setNotice(`الصدريية (${athleteBib.trim()}) مستخدمة مسبقاً في هذه المساحة.`); return; }
              setAthleteName(''); setAthleteBib('');
              onChanged();
              setNotice(`تمت إضافة العداء ${a.fullName} بالصدريية ${a.bib}.`);
            }}
            className="judge-touch-button bg-sky-700 text-white hover:bg-sky-600 transition-colors text-xs"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" /> إضافة
          </button>
        </div>
        {ws.athletes.length > 0 && (
          <div className="max-h-56 overflow-y-auto scrollbar-thin rounded-xl border border-slate-800">
            <table className="w-full text-[11px] glass-table">
              <thead>
                <tr>
                  <th className="text-right">الصدريية</th>
                  <th className="text-right">العداء</th>
                  <th className="text-right">النادي</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {ws.athletes.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono font-black text-slate-200">{a.bib}</td>
                    <td className="font-bold text-slate-100">{a.fullName}</td>
                    <td className="text-slate-400">{a.clubName || '—'}</td>
                    <td>
                      <button
                        onClick={() => { standaloneWorkspaceService.removeAthlete(ws.id, a.id); onChanged(); }}
                        className="p-1.5 rounded-lg text-red-300 hover:text-red-200"
                        aria-label={`حذف العداء ${a.fullName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default FieldSpaceEntry;
