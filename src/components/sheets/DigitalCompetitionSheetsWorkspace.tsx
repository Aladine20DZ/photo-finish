/**
 * PHOTO FINISH PRO AI — Master Digital Competition Result Sheets Workspace
 * ==============================================================================
 * Official Digital Protocol System for Track & Field Judges and Competition Directors.
 * 
 * Strict conformity to:
 * - Algerian Athletics Federation (FAA) formal championship report standards.
 * - Ligue Wilaya d'Athlétisme de Saïda (LWAS) official digital identity.
 * - Reference models:
 *     1) Liste Final COURSES.docx (Track: No, Nom, Prénom, D.N, Club, CW, PRE, CLS)
 *     2) Liste Final CONCOUR.docx (Field: N°, Nom, Prenom, D.N, Club, C.W, Essai 01-06, M. Perf, Class)
 *     3) Page 2 of COURSES.docx (Club Results: No, CLUB, CW, PER, CLS)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trophy,
  Shield,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  CheckSquare,
  History,
  X,
  ChevronDown,
  Layers,
  Sparkles,
  Award,
  Users,
  Timer,
  Wind,
  Settings,
  Globe,
  Sliders,
  Check
} from 'lucide-react';
import {
  digitalResultSheetsService,
  DigitalResultSheet,
  ResultSheetRow,
  SheetType,
  SheetStatus,
  ParticipantStatus,
  DocumentLanguage
} from '../../services/digitalResultSheetsService';
import { competitionsService, NationalCompetition } from '../../services/competitionsService';
import { disciplinesSeedService, AthleticsDiscipline } from '../../services/disciplinesSeedService';
import { portalAuthService } from '../../services/portalAuthService';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Modal } from '../design-system/Modal';
import { StatusPill } from '../design-system/StatusPill';

export interface DigitalCompetitionSheetsWorkspaceProps {
  onBackToHome?: () => void;
  onOpenFieldMode?: () => void;
}

export const DigitalCompetitionSheetsWorkspace: React.FC<DigitalCompetitionSheetsWorkspaceProps> = ({
  onBackToHome,
  onOpenFieldMode
}) => {
  // ── 1. States: Competitions & Filters ──────────────────────────────────────
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [selectedCompetition, setSelectedCompetition] = useState<NationalCompetition | null>(null);

  const [activeGroup, setActiveGroup] = useState<'course' | 'concours' | 'club_results'>('course');
  const [selectedDisciplineCode, setSelectedDisciplineCode] = useState<string>('100M');
  const [selectedCategory, setSelectedCategory] = useState<string>('أكابر');
  const [selectedGender, setSelectedGender] = useState<'M' | 'F' | 'Mixed'>('M');
  const [selectedRound, setSelectedRound] = useState<string>('النهائي المباشر');

  // Sheet Data
  const [activeSheet, setActiveSheet] = useState<DigitalResultSheet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [language, setLanguage] = useState<DocumentLanguage>('fr');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState<boolean>(false);

  // Forms
  const [newParticipant, setNewParticipant] = useState({
    no: 101,
    nom: '',
    prenom: '',
    dn: '2001-05-15',
    club: 'نادي أولمبيك سعيدة (OSA)',
    cw: '20',
    lane: 1
  });
  const [addReason, setAddReason] = useState<string>('إضافة مشارك مخول من المندوب الفني');

  // Administrative Correction Form
  const [correctionTargetRow, setCorrectionTargetRow] = useState<ResultSheetRow | null>(null);
  const [correctionField, setCorrectionField] = useState<string>('pre');
  const [correctionNewValue, setCorrectionNewValue] = useState<string>('');
  const [correctionOfficer, setCorrectionOfficer] = useState<string>('سفيان بن عيسى (الحكم العام الفيدرالي)');
  const [correctionReason, setCorrectionReason] = useState<string>('تصحيح بعد مراجعة شريط كاميرا خط النهاية Photo Finish');

  // Officer name for approval
  const [approverName, setApproverName] = useState<string>('سفيان بن عيسى (الحكم العام الفيدرالي)');

  // Save feedback
  const [saveStatus, setSaveStatus] = useState<string>('محفوظ محلياً 💾');
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── 2. Data Initialization ───────────────────────────────────────────────
  useEffect(() => {
    competitionsService.getCompetitions().then(comps => {
      setCompetitions(comps);
      const activeId = competitionsService.getActiveCompetitionId() || comps[0]?.id || 'comp_lwas_01';
      setSelectedCompId(activeId);
      const c = comps.find(item => item.id === activeId) || comps[0] || null;
      setSelectedCompetition(c);
    });

    const unsub = digitalResultSheetsService.subscribe(() => {
      if (activeSheet) {
        digitalResultSheetsService.getSheetById(activeSheet.id).then(s => {
          if (s) setActiveSheet({ ...s });
        });
      }
    });

    return unsub;
  }, []);

  // Load Sheet when parameters change
  useEffect(() => {
    if (!selectedCompId) return;

    setLoading(true);
    setSaveError(null);

    const load = async () => {
      try {
        if (activeGroup === 'club_results') {
          const clubSheet = await digitalResultSheetsService.generateClubResultsSheet(selectedCompId);
          setActiveSheet(clubSheet);
        } else {
          const sheet = await digitalResultSheetsService.createOrGetSheet({
            competitionId: selectedCompId,
            disciplineCode: selectedDisciplineCode,
            category: selectedCategory,
            gender: selectedGender,
            round: selectedRound,
            sheetType: activeGroup === 'concours' ? 'concour' : 'courses'
          });
          setActiveSheet(sheet);
        }
      } catch (err: any) {
        setSaveError(err?.message || 'فشل تحميل ورقة النتائج');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedCompId, selectedDisciplineCode, selectedCategory, selectedGender, selectedRound, activeGroup]);

  // Master Disciplines List
  const allDisciplines = useMemo(() => {
    return disciplinesSeedService.getAllDisciplines();
  }, []);

  const courseDisciplines = useMemo(() => {
    return allDisciplines.filter(d => d.group === 'course');
  }, [allDisciplines]);

  const concoursDisciplines = useMemo(() => {
    return allDisciplines.filter(d => d.group === 'concours');
  }, [allDisciplines]);

  // Filtered Rows for search
  const filteredRows = useMemo(() => {
    if (!activeSheet) return [];
    if (!searchFilter.trim()) return activeSheet.rows;
    const q = searchFilter.toLowerCase();
    return activeSheet.rows.filter(r => 
      r.nom.toLowerCase().includes(q) ||
      r.prenom.toLowerCase().includes(q) ||
      r.club.toLowerCase().includes(q) ||
      String(r.no).includes(q) ||
      r.cw.includes(q)
    );
  }, [activeSheet, searchFilter]);

  // Statistics counters
  const counters = useMemo(() => {
    if (!activeSheet) return { total: 0, recorded: 0, pending: 0 };
    const total = activeSheet.rows.length;
    let recorded = 0;
    activeSheet.rows.forEach(r => {
      if (activeSheet.disciplineType === 'track') {
        if (r.pre || r.status !== 'valid') recorded++;
      } else if (activeSheet.disciplineType === 'field') {
        const hasTrial = r.essais && r.essais.some(e => e.trim().length > 0);
        if (hasTrial || r.status !== 'valid') recorded++;
      } else {
        if (r.per) recorded++;
      }
    });
    return { total, recorded, pending: Math.max(0, total - recorded) };
  }, [activeSheet]);

  // ── 3. Actions ───────────────────────────────────────────────────────────
  const handleUpdateTrackPerformance = async (rowId: string, pre: string) => {
    if (!activeSheet) return;
    setSaveStatus('جاري الحفظ...');
    try {
      const updated = await digitalResultSheetsService.updateRow(activeSheet.id, rowId, { pre });
      setActiveSheet({ ...updated });
      setSaveStatus('محفوظ محلياً 💾');
    } catch (e: any) {
      setSaveError(e?.message);
    }
  };

  const handleUpdateTrial = async (rowId: string, trialIndex: number, value: string) => {
    if (!activeSheet) return;
    setSaveStatus('جاري الحفظ...');
    try {
      const targetRow = activeSheet.rows.find(r => r.id === rowId);
      if (!targetRow) return;

      const currentEssais = targetRow.essais ? [...targetRow.essais] : ['', '', '', '', '', ''];
      currentEssais[trialIndex] = value.toUpperCase();

      const updated = await digitalResultSheetsService.updateRow(activeSheet.id, rowId, {
        essais: currentEssais as [string, string, string, string, string, string]
      });
      setActiveSheet({ ...updated });
      setSaveStatus('محفوظ محلياً 💾');
    } catch (e: any) {
      setSaveError(e?.message);
    }
  };

  const handleUpdateStatus = async (rowId: string, status: ParticipantStatus) => {
    if (!activeSheet) return;
    setSaveStatus('جاري الحفظ...');
    try {
      const updated = await digitalResultSheetsService.updateRow(activeSheet.id, rowId, { status });
      setActiveSheet({ ...updated });
      setSaveStatus('محفوظ محلياً 💾');
    } catch (e: any) {
      setSaveError(e?.message);
    }
  };

  const handleAddParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheet || !newParticipant.nom.trim()) return;

    try {
      const updated = await digitalResultSheetsService.addParticipant(activeSheet.id, {
        no: Number(newParticipant.no) || activeSheet.rows.length + 1,
        nom: newParticipant.nom.toUpperCase(),
        prenom: newParticipant.prenom,
        dn: newParticipant.dn,
        club: newParticipant.club,
        cw: newParticipant.cw,
        lane: Number(newParticipant.lane) || 1,
        status: 'valid'
      }, addReason);

      setActiveSheet({ ...updated });
      setShowAddModal(false);
      setNewParticipant({
        no: Number(newParticipant.no) + 1,
        nom: '',
        prenom: '',
        dn: '2001-05-15',
        club: 'نادي أولمبيك سعيدة (OSA)',
        cw: '20',
        lane: 1
      });
    } catch (err: any) {
      setSaveError(err?.message);
    }
  };

  const handleRemoveParticipant = async (rowId: string) => {
    if (!activeSheet) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا المشارك من القائمة؟')) return;

    try {
      const updated = await digitalResultSheetsService.removeParticipant(activeSheet.id, rowId);
      setActiveSheet({ ...updated });
    } catch (err: any) {
      alert(err?.message || 'تعذر الحذف');
    }
  };

  const handleApproveSheet = async () => {
    if (!activeSheet) return;
    try {
      const approved = await digitalResultSheetsService.approveSheet(activeSheet.id, approverName);
      setActiveSheet({ ...approved });
      setShowApproveModal(false);
    } catch (e: any) {
      alert(e?.message);
    }
  };

  const handleExecuteCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheet || !correctionTargetRow || !correctionReason.trim()) return;

    try {
      const updates: any = {};
      updates[correctionField] = correctionNewValue;
      const updated = await digitalResultSheetsService.updateRow(
        activeSheet.id,
        correctionTargetRow.id,
        updates,
        { name: correctionOfficer, reason: correctionReason }
      );
      setActiveSheet({ ...updated });
      setShowCorrectionModal(false);
      setCorrectionTargetRow(null);
    } catch (err: any) {
      alert(err?.message);
    }
  };

  const handleExportExcel = () => {
    if (!activeSheet) return;
    digitalResultSheetsService.exportToExcel(activeSheet, language);
  };

  const handleExportDocx = async () => {
    if (!activeSheet) return;
    const blob = await digitalResultSheetsService.exportToDocx(activeSheet);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet.sheetType.toUpperCase()}_${activeSheet.disciplineCode}_${activeSheet.category}_LWAS.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Status badge styling
  const getStatusBadge = (status: SheetStatus) => {
    switch (status) {
      case 'draft':
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">مسودة أولية (Draft)</span>;
      case 'in_progress':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">قيد التحكيم الميداني ⚡</span>;
      case 'submitted':
        return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-full text-xs font-bold">بانتظار الاعتماد (Submitted)</span>;
      case 'approved':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1">معتمد ومقفل 🔏 (Homologué)</span>;
      case 'closed':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-full text-xs font-black">مغلق ومؤرشف 📦</span>;
    }
  };

  const isLocked = activeSheet?.status === 'approved' || activeSheet?.status === 'closed';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* ══════════════════════════════════════════════════════════════════════
          1. الشريط العلوي: شريط العمليات والتحكم (Workspace Header)
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* اليمين: عنوان الوحدة والهوية */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                  أوراق النتائج الرقمية الموحدة • Digital Competition Sheets
                </h1>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  FAA & LWAS 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مطابق لنماذج Liste Final COURSES و CONCOUR و ترتيب الأندية الرسمية
              </p>
            </div>
          </div>

          {/* اليسار: أدوات التصدير والاعتماد والحفظ */}
          <div className="flex items-center gap-2">
            
            {/* مؤشر الحفظ والمزامنة */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{saveStatus}</span>
            </div>

            {/* محدد اللغة */}
            <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${language === 'fr' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Français
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${language === 'ar' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                العربية
              </button>
            </div>

            {/* أزرار التصدير الرسمية */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow"
              title="تصدير جدول رسمي Excel XLSX"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportDocx}
              className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow"
              title="تصدير مستند Word DOCX رسمي"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">Word</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintPreviewModal(true)}
              className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow"
              title="معاينة وطباعة رسمية PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">طباعة / PDF</span>
            </button>

            {/* زر الاعتماد الرسمي */}
            {!isLocked ? (
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد النتائج 🔏</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuditModal(true)}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>سجل التدقيق ({activeSheet?.auditLogs?.length || 0})</span>
              </button>
            )}

            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                title="العودة للرئيسية"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          2. شريط اختيار المنافسة والاختصاص والنموذج
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 print:hidden">
        <div className="max-w-7xl mx-auto space-y-3">
          
          {/* الصف 1: اختيار المنافسة ونوع النموذج */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* اختيار المنافسة */}
            <div className="flex items-center gap-2 min-w-[280px]">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <label className="text-xs font-bold text-slate-400 shrink-0">المنافسة النشطة:</label>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-white focus:outline-none focus:border-emerald-500 w-full"
              >
                {competitions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.wilayaCode} - {c.date})
                  </option>
                ))}
              </select>
            </div>

            {/* ألسنة التبديل بين النماذج الثلاثة: COURSES vs CONCOUR vs CLUB RESULTS */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveGroup('course');
                  setSelectedDisciplineCode('100M');
                }}
                className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeGroup === 'course' ? 'bg-emerald-600 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🏃 سباقات المضمار (COURSES)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveGroup('concours');
                  setSelectedDisciplineCode('LJ');
                }}
                className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeGroup === 'concours' ? 'bg-purple-600 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🎯 مسابقات الميدان (CONCOUR)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveGroup('club_results')}
                className={`py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeGroup === 'club_results' ? 'bg-amber-600 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🏆 ترتيب الأندية (CLUB RESULTS)</span>
              </button>
            </div>

            {/* شارة حالة الورقة الرسمية */}
            <div>
              {activeSheet && getStatusBadge(activeSheet.status)}
            </div>
          </div>

          {/* الصف 2: اختيار الاختصاص والفئة والجنس (يظهر فقط في COURSES و CONCOUR) */}
          {activeGroup !== 'club_results' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
              
              {/* اختيار الاختصاص */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">الاختصاص (Épreuve):</span>
                <select
                  value={selectedDisciplineCode}
                  onChange={(e) => setSelectedDisciplineCode(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  {(activeGroup === 'course' ? courseDisciplines : concoursDisciplines).map(d => (
                    <option key={d.code} value={d.code}>
                      {d.code} • {d.nameFr} ({d.nameAr})
                    </option>
                  ))}
                </select>
              </div>

              {/* الفئة العمرية */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">الفئة (Catégorie):</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="أكابر">أكابر (SENIORS)</option>
                  <option value="أواسط">أواسط (U20)</option>
                  <option value="أشبال">أشبال (U18)</option>
                  <option value="أصاغر">أصاغر (U16)</option>
                  <option value="براعم">براعم (U14)</option>
                  <option value="قدماء">قدماء (MASTERS)</option>
                </select>
              </div>

              {/* الجنس */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">الجنس (Sexe):</span>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="M">ذكور (Hommes)</option>
                  <option value="F">إناث (Dames)</option>
                  <option value="Mixed">مختلط (Mixte)</option>
                </select>
              </div>

              {/* الدور */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">الدور (Tour):</span>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="النهائي المباشر">النهائي المباشر (Finale Directe)</option>
                  <option value="السلسلة 1">السلسلة 1 (Série 1)</option>
                  <option value="السلسلة 2">السلسلة 2 (Série 2)</option>
                  <option value="نصف النهائي">نصف النهائي (Demi-finale)</option>
                </select>
              </div>

              {/* إحصائيات سريعة */}
              <div className="text-[11px] font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                المشاركون: <strong className="text-white">{counters.total}</strong> • 
                المكتملة: <strong className="text-emerald-400">{counters.recorded}</strong> • 
                المتبقية: <strong className="text-amber-400">{counters.pending}</strong>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. المعاينة المباشرة للترويسة الرسمية الموحدة (Official Header Box)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSheet && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left border-b border-slate-800 pb-3 mb-3">
              
              {/* هوية الاتحاد الوطني */}
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
                </p>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  FÉDÉRATION ALGÉRIENNE D’ATHLÉTISME (FAA)
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  الاتحاد الجزائري لألعاب القوى
                </p>
              </div>

              {/* شعار الرابطة والاعتماد */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-slate-950 font-black flex items-center justify-center text-xl shadow border border-emerald-500/40 mb-1">
                  🏃
                </div>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  {activeSheet.header.accreditationNumber}
                </span>
              </div>

              {/* هوية رابطة سعيدة */}
              <div className="space-y-0.5 md:text-right">
                <h3 className="text-xs sm:text-sm font-black text-emerald-400">
                  LIGUE WILAYA D’ATHLÉTISME DE SAÏDA (LWAS)
                </h3>
                <p className="text-[11px] font-bold text-slate-300">
                  رابطة ألعاب القوى سعيدة • ولاية {activeSheet.header.wilayaCode}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {activeSheet.header.season}
                </p>
              </div>
            </div>

            {/* تفاصيل الاختصاص والمسابقة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block font-bold">المنافسة:</span>
                <span className="font-extrabold text-white truncate block">{activeSheet.header.competitionName}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block font-bold">الميدان والملعب:</span>
                <span className="font-bold text-slate-300 truncate block">📍 {activeSheet.header.venue}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block font-bold">الاختصاص والفئة:</span>
                <span className="font-extrabold text-emerald-400 truncate block">
                  {activeSheet.header.discipline} • {activeSheet.header.category}
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block font-bold">التاريخ والتوقيت:</span>
                <span className="font-mono text-amber-300 truncate block">📅 {activeSheet.header.date}</span>
              </div>
            </div>

            {/* في حال وجود رقم محضر اعتماد رسمي */}
            {activeSheet.pvNumber && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-emerald-300">محضر النتائج الرسمية المعتمد:</span>
                  <span className="font-mono font-black text-white bg-slate-900 px-2 py-0.5 rounded border border-emerald-700">
                    {activeSheet.pvNumber}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  الحكم العام: <strong className="text-white">{activeSheet.chiefJudgeName}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          4. شريط أدوات الجدول: بحث، إضافة، قفل وتعديل إداري
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800 text-xs">
          
          {/* البحث والتصفية */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="البحث باسم العداء أو النادي أو الرقم..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            
            {/* إضافة مشارك مخول قبل الانطلاق */}
            {!isLocked && activeGroup !== 'club_results' && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>إضافة مشارك مخول</span>
              </button>
            )}

            {/* إذا كانت الورقة مقفلة، إتاحة نافذة التعديل الإداري الموثق */}
            {isLocked && (
              <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-xl text-[11px] text-amber-300 font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>النتائج معتمدة ومقفلة ضد التعديل العادي. للتعديل يلزم استخدام إجراء الطعن الإداري.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          5. الجداول الرقمية الثلاثة (COURSES vs CONCOUR vs CLUB RESULTS)
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto w-full px-4 py-4 flex-1">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
            <p className="text-sm font-bold">جاري تحميل بيانات ورقة النتائج الرسمية...</p>
          </div>
        ) : !activeSheet || filteredRows.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
            <p className="text-sm font-bold">لا توجد تسجيلات مطابقة في هذا الاختصاص والفئة</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مشاركين إلى هذا الاختصاص</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            
            {/* ── النموذج 1: سباقات المضمار (COURSES Table) ── */}
            {activeSheet.sheetType === 'courses' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-black uppercase text-[11px]">
                      <th className="py-3 px-2 border-r border-slate-800 w-14">No</th>
                      <th className="py-3 px-3 border-r border-slate-800 text-left">Nom</th>
                      <th className="py-3 px-3 border-r border-slate-800 text-left">Prénom</th>
                      <th className="py-3 px-2 border-r border-slate-800 w-24">D.N</th>
                      <th className="py-3 px-3 border-r border-slate-800 text-left">Club</th>
                      <th className="py-3 px-2 border-r border-slate-800 w-12">CW</th>
                      <th className="py-3 px-3 border-r border-slate-800 w-36 bg-emerald-950/40 text-emerald-300">PRE (الأداء الزمني)</th>
                      <th className="py-3 px-2 border-r border-slate-800 w-16 bg-amber-950/40 text-amber-300">CLS</th>
                      <th className="py-3 px-2 border-r border-slate-800 w-24">الحالة</th>
                      {!isLocked && <th className="py-3 px-2 w-16">إجراء</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredRows.map((row, idx) => (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-slate-850/60 transition-colors ${
                          row.cls === 1 ? 'bg-amber-500/5' : idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900'
                        }`}
                      >
                        {/* No */}
                        <td className="py-2.5 px-2 border-r border-slate-800 font-mono font-bold text-slate-400">
                          {row.no}
                        </td>

                        {/* Nom */}
                        <td className="py-2.5 px-3 border-r border-slate-800 font-black text-white text-left font-sans">
                          {row.nom}
                        </td>

                        {/* Prénom */}
                        <td className="py-2.5 px-3 border-r border-slate-800 font-bold text-slate-300 text-left">
                          {row.prenom}
                        </td>

                        {/* D.N */}
                        <td className="py-2.5 px-2 border-r border-slate-800 font-mono text-slate-400">
                          {row.dn}
                        </td>

                        {/* Club */}
                        <td className="py-2.5 px-3 border-r border-slate-800 font-bold text-emerald-300 text-left">
                          {row.club}
                        </td>

                        {/* CW */}
                        <td className="py-2.5 px-2 border-r border-slate-800 font-mono font-black text-cyan-400">
                          {row.cw}
                        </td>

                        {/* PRE (الأداء الزمني) */}
                        <td className="py-2 px-2 border-r border-slate-800 bg-emerald-950/10">
                          {isLocked ? (
                            <span 
                              onClick={() => {
                                setCorrectionTargetRow(row);
                                setCorrectionField('pre');
                                setCorrectionNewValue(row.pre || '');
                                setShowCorrectionModal(true);
                              }}
                              className="font-mono font-black text-sm text-emerald-300 cursor-pointer hover:underline"
                              title="انقر لإجراء تعديل إداري موثق"
                            >
                              {row.pre || '-'}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={row.pre || ''}
                              onChange={(e) => handleUpdateTrackPerformance(row.id, e.target.value)}
                              placeholder="10.22s"
                              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2 py-1 text-center font-mono font-black text-emerald-300 text-xs focus:outline-none"
                            />
                          )}
                        </td>

                        {/* CLS (الترتيب) */}
                        <td className="py-2.5 px-2 border-r border-slate-800 bg-amber-950/10">
                          <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-full ${
                            row.cls === 1 ? 'bg-amber-500 text-slate-950' :
                            row.cls === 2 ? 'bg-slate-300 text-slate-950' :
                            row.cls === 3 ? 'bg-amber-700 text-white' :
                            row.cls === 'DNS' || row.cls === 'DNF' || row.cls === 'DQ' ? 'bg-rose-950 text-rose-300' :
                            'text-slate-300'
                          }`}>
                            {row.cls}
                          </span>
                        </td>

                        {/* الحالة */}
                        <td className="py-2 px-1 border-r border-slate-800">
                          {isLocked ? (
                            <span className="text-[10px] font-bold uppercase text-slate-400">{row.status}</span>
                          ) : (
                            <select
                              value={row.status}
                              onChange={(e) => handleUpdateStatus(row.id, e.target.value as ParticipantStatus)}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-300 focus:outline-none"
                            >
                              <option value="valid">Valid</option>
                              <option value="dns">DNS</option>
                              <option value="dnf">DNF</option>
                              <option value="dq">DQ</option>
                              <option value="nm">NM</option>
                            </select>
                          )}
                        </td>

                        {/* إجراء حذف */}
                        {!isLocked && (
                          <td className="py-2 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(row.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                              title="شطب المشارك"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── النموذج 2: مسابقات الميدان (CONCOUR Table - 6 Trials) ── */}
            {activeSheet.sheetType === 'concour' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-black uppercase text-[11px]">
                      <th className="py-3 px-2 border-r border-slate-800 w-12">N°</th>
                      <th className="py-3 px-3 border-r border-slate-800 text-left">Nom</th>
                      <th className="py-3 px-3 border-r border-slate-800 text-left">Prenom</th>
                      <th className="py-3 px-2 border-r border-slate-800 w-24">D.N</th>
                      <th className="py-3 px-3 border-r border-slate-800 text-left">Club</th>
                      <th className="py-3 px-2 border-r border-slate-800 w-12">C.W</th>
                      
                      {/* المحاولات الست Essai 01 إلى Essai 06 */}
                      <th className="py-3 px-1.5 border-r border-slate-800 w-16 bg-slate-900/80">Essai 01</th>
                      <th className="py-3 px-1.5 border-r border-slate-800 w-16 bg-slate-900/80">Essai 02</th>
                      <th className="py-3 px-1.5 border-r border-slate-800 w-16 bg-slate-900/80">Essai 03</th>
                      <th className="py-3 px-1.5 border-r border-slate-800 w-16 bg-slate-900/80">Essai 04</th>
                      <th className="py-3 px-1.5 border-r border-slate-800 w-16 bg-slate-900/80">Essai 05</th>
                      <th className="py-3 px-1.5 border-r border-slate-800 w-16 bg-slate-900/80">Essai 06</th>

                      <th className="py-3 px-2 border-r border-slate-800 w-20 bg-emerald-950/40 text-emerald-300">M. Perf</th>
                      <th className="py-3 px-2 border-r border-slate-800 w-16 bg-amber-950/40 text-amber-300">Class</th>
                      {!isLocked && <th className="py-3 px-2 w-14">إجراء</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredRows.map((row, idx) => {
                      const essais = row.essais || ['', '', '', '', '', ''];
                      return (
                        <tr 
                          key={row.id} 
                          className={`hover:bg-slate-850/60 transition-colors ${
                            row.cls === 1 ? 'bg-amber-500/5' : idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900'
                          }`}
                        >
                          <td className="py-2.5 px-2 border-r border-slate-800 font-mono font-bold text-slate-400">
                            {row.no}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-800 font-black text-white text-left font-sans">
                            {row.nom}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-800 font-bold text-slate-300 text-left">
                            {row.prenom}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-800 font-mono text-slate-400">
                            {row.dn}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-800 font-bold text-purple-300 text-left">
                            {row.club}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-800 font-mono font-black text-cyan-400">
                            {row.cw}
                          </td>

                          {/* 6 Trials Inputs */}
                          {[0, 1, 2, 3, 4, 5].map((trialIdx) => {
                            const val = essais[trialIdx] || '';
                            const isFoul = val.toUpperCase() === 'X';
                            const isPass = val === '-';
                            return (
                              <td key={trialIdx} className="py-1 px-1 border-r border-slate-800">
                                {isLocked ? (
                                  <span className={`font-mono font-bold ${isFoul ? 'text-rose-400' : isPass ? 'text-slate-500' : 'text-white'}`}>
                                    {val || '-'}
                                  </span>
                                ) : (
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={val}
                                      onChange={(e) => handleUpdateTrial(row.id, trialIdx, e.target.value)}
                                      placeholder="0.00"
                                      className={`w-full bg-slate-950 border rounded px-1 py-1 text-center font-mono font-bold text-xs focus:outline-none ${
                                        isFoul ? 'border-rose-500 text-rose-400' :
                                        isPass ? 'border-slate-800 text-slate-500' :
                                        val ? 'border-emerald-600 text-white' :
                                        'border-slate-800 text-slate-300 focus:border-purple-400'
                                      }`}
                                    />
                                    {/* أزرار سريعة للأخطاء والتنازل */}
                                    {!val && (
                                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 hover:opacity-100 transition">
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateTrial(row.id, trialIdx, 'X')}
                                          className="text-[9px] bg-rose-950 text-rose-400 px-1 rounded font-bold"
                                        >
                                          X
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateTrial(row.id, trialIdx, '-')}
                                          className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded font-bold"
                                        >
                                          -
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* M. Perf (أفضل محاولة) */}
                          <td className="py-2.5 px-2 border-r border-slate-800 bg-emerald-950/20 font-mono font-black text-sm text-emerald-300">
                            {row.mPerf || '-'}
                          </td>

                          {/* Class (الترتيب) */}
                          <td className="py-2.5 px-2 border-r border-slate-800 bg-amber-950/20">
                            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-full ${
                              row.cls === 1 ? 'bg-amber-500 text-slate-950' :
                              row.cls === 2 ? 'bg-slate-300 text-slate-950' :
                              row.cls === 3 ? 'bg-amber-700 text-white' :
                              'text-slate-300'
                            }`}>
                              {row.cls}
                            </span>
                          </td>

                          {/* إجراء */}
                          {!isLocked && (
                            <td className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveParticipant(row.id)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                                title="شطب المشارك"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── النموذج 3: ترتيب الأندية (CLUB RESULTS Table - Page 2) ── */}
            {activeSheet.sheetType === 'club_results' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-black uppercase text-[11px]">
                      <th className="py-3 px-3 border-r border-slate-800 w-16">No</th>
                      <th className="py-3 px-4 border-r border-slate-800 text-left">CLUB (النادي)</th>
                      <th className="py-3 px-3 border-r border-slate-800 w-20">CW</th>
                      <th className="py-3 px-4 border-r border-slate-800 w-44 bg-emerald-950/40 text-emerald-300">PER (مجموع النقاط)</th>
                      <th className="py-3 px-3 w-24 bg-amber-950/40 text-amber-300">CLS (الترتيب)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredRows.map((row, idx) => (
                      <tr 
                        key={row.id}
                        className={`hover:bg-slate-850/60 transition-colors ${
                          row.cls === 1 ? 'bg-amber-500/10' : idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900'
                        }`}
                      >
                        <td className="py-3 px-3 border-r border-slate-800 font-mono font-bold text-slate-400">
                          {row.no}
                        </td>
                        <td className="py-3 px-4 border-r border-slate-800 font-black text-white text-left font-sans text-sm">
                          {row.clubName || row.club}
                        </td>
                        <td className="py-3 px-3 border-r border-slate-800 font-mono font-black text-cyan-400">
                          {row.cw}
                        </td>
                        <td className="py-3 px-4 border-r border-slate-800 font-mono font-black text-emerald-400 text-sm bg-emerald-950/10">
                          {row.per}
                        </td>
                        <td className="py-3 px-3 bg-amber-950/10">
                          <span className={`font-mono font-black text-xs px-3 py-1 rounded-full ${
                            row.cls === 1 ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' :
                            row.cls === 2 ? 'bg-slate-300 text-slate-950' :
                            row.cls === 3 ? 'bg-amber-700 text-white' :
                            'text-slate-300'
                          }`}>
                            {row.cls}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* تذييل الجدول ومربعات التوقيع الرسمية */}
            <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <div className="space-y-1">
                <p>تاريخ ووقت الاستخراج: <span className="font-mono text-slate-300">{activeSheet.header.extractedAt}</span></p>
                <p>معتمد وفق لوائح الاتحاد الدولي لألعاب القوى (World Athletics Rules 165 & 25)</p>
              </div>

              <div className="flex items-center gap-6 text-center">
                <div className="border border-slate-800 p-2.5 rounded-xl bg-slate-900/80 min-w-[140px]">
                  <span className="text-[10px] text-slate-500 block">الحكم العام (Juge Arbitre)</span>
                  <span className="font-bold text-white block mt-1">{activeSheet.chiefJudgeName || 'الحكم العام'}</span>
                </div>
                <div className="border border-slate-800 p-2.5 rounded-xl bg-slate-900/80 min-w-[140px]">
                  <span className="text-[10px] text-slate-500 block">رئيس القضاة (Chef des Juges)</span>
                  <span className="font-bold text-white block mt-1">{activeSheet.refereeName || 'المندوب الفني'}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          6. النوافذ المنبثقة: إضافة مشارك، الاعتماد، والتعديل الإداري
      ══════════════════════════════════════════════════════════════════════ */}

      {/* نافذة إضافة مشارك مخول */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="إضافة مشارك مخول رسمياً إلى الورقة"
      >
        <form onSubmit={handleAddParticipantSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">اللقب (Nom):</label>
              <input
                type="text"
                required
                value={newParticipant.nom}
                onChange={(e) => setNewParticipant({ ...newParticipant, nom: e.target.value })}
                placeholder="BENALI"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">الاسم (Prénom):</label>
              <input
                type="text"
                required
                value={newParticipant.prenom}
                onChange={(e) => setNewParticipant({ ...newParticipant, prenom: e.target.value })}
                placeholder="Ahmed"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">رقم الصدر (No):</label>
              <input
                type="number"
                required
                value={newParticipant.no}
                onChange={(e) => setNewParticipant({ ...newParticipant, no: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">تاريخ الميلاد (D.N):</label>
              <input
                type="date"
                required
                value={newParticipant.dn}
                onChange={(e) => setNewParticipant({ ...newParticipant, dn: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">رمز الولاية (CW):</label>
              <input
                type="text"
                required
                value={newParticipant.cw}
                onChange={(e) => setNewParticipant({ ...newParticipant, cw: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">النادي الرياضي (Club):</label>
            <input
              type="text"
              required
              value={newParticipant.club}
              onChange={(e) => setNewParticipant({ ...newParticipant, club: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">سبب الإضافة الرسمية:</label>
            <input
              type="text"
              required
              value={addReason}
              onChange={(e) => setAddReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              تأكيد الإضافة
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة اعتماد النتائج وإغلاق الورقة */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="اعتماد وإقفال النتائج الرسمية (Certification)"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            باعتماد النتائج، سيتم إقفال الورقة رسمياً وتوليد رقم محضر رسمي (PV) صادر عن رابطة ألعاب القوى سعيدة (LWAS).
            لن يُسمح بعد ذلك بأي تعديل مباشر إلا عبر إجراء الطعن الإداري الموثق.
          </p>

          <div>
            <label className="block text-slate-400 font-bold mb-1">اسم الحكم العام المعتمد:</label>
            <input
              type="text"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleApproveSheet}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد الاعتماد والإقفال 🔏</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* نافذة التعديل الإداري الموثق (Audit Override) */}
      <Modal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        title="إجراء تصحيح إداري موثق على ورقة معتمدة"
      >
        <form onSubmit={handleExecuteCorrection} className="space-y-3.5 text-xs">
          <p className="text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/60 leading-relaxed">
            تنبيه: سيتم تسجيل القيمة السابقة والقيمة الجديدة واسم المسؤول وسبب التعديل في سجل تدقيق رسمي غير قابل للحذف.
          </p>

          <div>
            <label className="block text-slate-400 font-bold mb-1">الرياضي المستهدف:</label>
            <div className="font-bold text-white bg-slate-950 p-2 rounded-xl border border-slate-800">
              {correctionTargetRow ? `${correctionTargetRow.nom} ${correctionTargetRow.prenom} (رقم ${correctionTargetRow.no})` : '-'}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">القيمة الجديدة للأداء:</label>
            <input
              type="text"
              required
              value={correctionNewValue}
              onChange={(e) => setCorrectionNewValue(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">اسم المسؤول القائم بالتصحيح:</label>
            <input
              type="text"
              required
              value={correctionOfficer}
              onChange={(e) => setCorrectionOfficer(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">السبب الرسمي للتصحيح (قرار الحكم العام / قبول الطعن):</label>
            <textarea
              required
              rows={2}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCorrectionModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <CheckSquare className="w-4 h-4" />
              <span>تسجيل التعديل في مسار التدقيق</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة سجل التدقيق الرسمي (Audit Log Ledger) */}
      <Modal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title="سجل التدقيق والتصحيحات الرسمية المعتمدة"
      >
        <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto">
          {activeSheet?.auditLogs && activeSheet.auditLogs.length > 0 ? (
            activeSheet.auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-emerald-400">{log.athleteName}</span>
                  <span className="text-slate-500 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString('ar-DZ')}</span>
                </div>
                <div className="text-slate-300">
                  تعديل حقل <strong className="text-amber-400 font-mono">{log.field}</strong> من <span className="font-mono line-through text-rose-400">{log.oldValue || 'فارغ'}</span> إلى <span className="font-mono text-emerald-300">{log.newValue}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  بواسطة: <strong className="text-white">{log.officerName}</strong>
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  السبب: {log.reason}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-400 py-6">لم يتم تسجيل أي تعديل استثنائي على هذه الورقة.</p>
          )}
        </div>
      </Modal>

      {/* نافذة المعاينة والطباعة الرسمية الموحدة A4 */}
      {showPrintPreviewModal && activeSheet && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4 overflow-y-auto print:p-0 print:bg-white print:static" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="max-w-5xl mx-auto w-full bg-white text-slate-900 rounded-3xl p-8 shadow-2xl print:shadow-none print:p-0 space-y-6">
            
            {/* أزرار التحكم في المعاينة */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-300 print:hidden">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900">معاينة الوثيقة الرسمية الموحدة للطباعة (A4)</h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  {activeSheet.sheetType === 'concour' ? 'A4 أفقي (Landscape)' : 'A4 عمودي (Portrait)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن 🖨️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintPreviewModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* محتوى الوثيقة الرسمي المطبوع */}
            <div className="space-y-4">
              
              {/* الترويسة الموحدة */}
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <div className="text-xs font-bold text-slate-700 uppercase">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</div>
                <div className="text-sm font-black text-slate-900">FÉDÉRATION ALGÉRIENNE D’ATHLÉTISME</div>
                <div className="text-sm font-black text-emerald-800">LIGUE WILAYA D’ATHLÉTISME DE SAÏDA (LWAS)</div>
                <div className="text-xs font-extrabold text-slate-800 mt-2">
                  COMPÉTITION : {activeSheet.header.competitionName} • {activeSheet.header.season}
                </div>
                <div className="text-xs text-slate-600 font-bold mt-1">
                  EPREUVE : {activeSheet.header.discipline}   |   CATÉGORIE : {activeSheet.header.category} ({activeSheet.header.gender})   |   LIEU : {activeSheet.header.venue}
                </div>
              </div>

              {/* الجدول الرسمي المطبوع */}
              <table className="w-full border-collapse border border-slate-900 text-[10px] text-center">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-900 font-black">
                    {activeSheet.sheetType === 'concour' ? (
                      <>
                        <th className="border border-slate-900 p-1">N°</th>
                        <th className="border border-slate-900 p-1 text-left">Nom</th>
                        <th className="border border-slate-900 p-1 text-left">Prenom</th>
                        <th className="border border-slate-900 p-1">D.N</th>
                        <th className="border border-slate-900 p-1 text-left">Club</th>
                        <th className="border border-slate-900 p-1">C.W</th>
                        <th className="border border-slate-900 p-1">Essai 01</th>
                        <th className="border border-slate-900 p-1">Essai 02</th>
                        <th className="border border-slate-900 p-1">Essai 03</th>
                        <th className="border border-slate-900 p-1">Essai 04</th>
                        <th className="border border-slate-900 p-1">Essai 05</th>
                        <th className="border border-slate-900 p-1">Essai 06</th>
                        <th className="border border-slate-900 p-1 bg-slate-300 font-black">M. Perf</th>
                        <th className="border border-slate-900 p-1 bg-slate-300 font-black">Class</th>
                      </>
                    ) : activeSheet.sheetType === 'club_results' ? (
                      <>
                        <th className="border border-slate-900 p-1.5">No</th>
                        <th className="border border-slate-900 p-1.5 text-left">CLUB</th>
                        <th className="border border-slate-900 p-1.5">CW</th>
                        <th className="border border-slate-900 p-1.5 bg-slate-300 font-black">PER</th>
                        <th className="border border-slate-900 p-1.5 bg-slate-300 font-black">CLS</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-slate-900 p-1.5">No</th>
                        <th className="border border-slate-900 p-1.5 text-left">Nom</th>
                        <th className="border border-slate-900 p-1.5 text-left">Prénom</th>
                        <th className="border border-slate-900 p-1.5">D.N</th>
                        <th className="border border-slate-900 p-1.5 text-left">Club</th>
                        <th className="border border-slate-900 p-1.5">C W</th>
                        <th className="border border-slate-900 p-1.5 bg-slate-300 font-black">PRE</th>
                        <th className="border border-slate-900 p-1.5 bg-slate-300 font-black">CLS</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeSheet.rows.map((r) => {
                    const e = r.essais || ['', '', '', '', '', ''];
                    return (
                      <tr key={r.id} className="border-b border-slate-900">
                        {activeSheet.sheetType === 'concour' ? (
                          <>
                            <td className="border border-slate-900 p-1 font-mono font-bold">{r.no}</td>
                            <td className="border border-slate-900 p-1 text-left font-bold">{r.nom}</td>
                            <td className="border border-slate-900 p-1 text-left">{r.prenom}</td>
                            <td className="border border-slate-900 p-1 font-mono">{r.dn}</td>
                            <td className="border border-slate-900 p-1 text-left font-bold">{r.club}</td>
                            <td className="border border-slate-900 p-1 font-mono font-bold">{r.cw}</td>
                            <td className="border border-slate-900 p-1 font-mono">{e[0] || ''}</td>
                            <td className="border border-slate-900 p-1 font-mono">{e[1] || ''}</td>
                            <td className="border border-slate-900 p-1 font-mono">{e[2] || ''}</td>
                            <td className="border border-slate-900 p-1 font-mono">{e[3] || ''}</td>
                            <td className="border border-slate-900 p-1 font-mono">{e[4] || ''}</td>
                            <td className="border border-slate-900 p-1 font-mono">{e[5] || ''}</td>
                            <td className="border border-slate-900 p-1 font-mono font-black bg-slate-100">{r.mPerf || ''}</td>
                            <td className="border border-slate-900 p-1 font-mono font-black bg-slate-100">{r.cls}</td>
                          </>
                        ) : activeSheet.sheetType === 'club_results' ? (
                          <>
                            <td className="border border-slate-900 p-1.5 font-mono font-bold">{r.no}</td>
                            <td className="border border-slate-900 p-1.5 text-left font-black">{r.clubName || r.club}</td>
                            <td className="border border-slate-900 p-1.5 font-mono font-bold">{r.cw}</td>
                            <td className="border border-slate-900 p-1.5 font-mono font-black bg-slate-100">{r.per}</td>
                            <td className="border border-slate-900 p-1.5 font-mono font-black bg-slate-100">{r.cls}</td>
                          </>
                        ) : (
                          <>
                            <td className="border border-slate-900 p-1.5 font-mono font-bold">{r.no}</td>
                            <td className="border border-slate-900 p-1.5 text-left font-bold">{r.nom}</td>
                            <td className="border border-slate-900 p-1.5 text-left">{r.prenom}</td>
                            <td className="border border-slate-900 p-1.5 font-mono">{r.dn}</td>
                            <td className="border border-slate-900 p-1.5 text-left font-bold">{r.club}</td>
                            <td className="border border-slate-900 p-1.5 font-mono font-bold">{r.cw}</td>
                            <td className="border border-slate-900 p-1.5 font-mono font-black bg-slate-100">{r.pre || ''}</td>
                            <td className="border border-slate-900 p-1.5 font-mono font-black bg-slate-100">{r.cls}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* تذييل التوقيعات المطبوع */}
              <div className="pt-8 flex items-center justify-between text-xs font-bold text-slate-800">
                <div className="text-center space-y-8">
                  <p>Le Juge Arbitre :</p>
                  <p className="font-mono text-slate-600">{activeSheet.chiefJudgeName}</p>
                </div>

                <div className="text-center space-y-8">
                  <p>Le Chef des Juges :</p>
                  <p className="font-mono text-slate-600">{activeSheet.refereeName}</p>
                </div>

                <div className="text-center space-y-8">
                  <p>Le Secrétaire de la Compétition :</p>
                  <p className="font-mono text-slate-600">{activeSheet.secretaryName}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DigitalCompetitionSheetsWorkspace;
