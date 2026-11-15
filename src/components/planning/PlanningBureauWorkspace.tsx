/**
 * PHOTO FINISH PRO AI — Planning Bureau Workspace (Phase D)
 * World Athletics Track Pro Standards & Per-Competition Independent File Architecture:
 * - Independent storage & plan isolation per competition (ملف مستقل لكل منافسة).
 * - Metadata with competition level (وطني / ولائي / جهوي / محلي).
 * - Full participating categories & discipline selection with group select-all.
 * - Intelligent auto-timing calculation & World Athletics Rule TR20.3 rest interval checks.
 * - Dual-table schedule: COURSE (individual + relays) & CONCOURS (jumps + throws).
 * - Schedule reordering (Move Up / Move Down) with immutable audit history.
 * - Server-side persistence with offline synchronization & clear pending status indicator.
 * - Portable bundle import/export (.pfp-plan and .pfp-competition).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Shield, 
  Trophy, 
  CheckSquare, 
  Square, 
  Printer, 
  Download, 
  Upload,
  Layers, 
  FileSpreadsheet, 
  FileText, 
  Sparkles, 
  Trash2, 
  Award,
  AlertTriangle,
  CheckCircle2,
  Save,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { 
  disciplinesSeedService, 
  type AthleticsDiscipline 
} from '../../services/disciplinesSeedService';
import { 
  planningBureauService, 
  OFFICIAL_PARTICIPATING_CATEGORIES, 
  type CompetitionPlanningDraft, 
  type GeneratedCompetitionSchedule,
  type ScheduledDisciplineItem
} from '../../services/planningBureauService';
import { 
  competitionFileService, 
  type CompetitionLevel
} from '../../services/competitionFileService';
import { competitionsService, NationalCompetition } from '../../services/competitionsService';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';
import { Badge } from '../design-system/Badge';
import { SplitLayout } from '../design-system/SplitLayout';

export interface PlanningBureauWorkspaceProps {
  initialCompetitionId?: string;
  initialLeagueId?: string;
  initialLeagueName?: string;
  onClose?: () => void;
  onScheduleSaved?: (schedule: GeneratedCompetitionSchedule) => void;
}

export const PlanningBureauWorkspace: React.FC<PlanningBureauWorkspaceProps> = ({
  initialCompetitionId,
  initialLeagueId = 'lg_saida',
  initialLeagueName = 'الرابطة الولائية لألعاب القوى - سعيدة',
  onClose,
  onScheduleSaved
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ═══ Competitions Registry State ═══
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>(initialCompetitionId || '');

  // ═══ 1. Draft Form State (Right Panel) ═══
  const [competitionName, setCompetitionName] = useState('البطولة الولائية لألعاب القوى 2026');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState('مركب السعادة الأولمبي، سعيدة');
  const [competitionLevel, setCompetitionLevel] = useState<CompetitionLevel>('wilaya');
  const [organizingLeagueId, setOrganizingLeagueId] = useState(initialLeagueId);
  const [organizingLeagueName, setOrganizingLeagueName] = useState(initialLeagueName);

  // Selected Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'U18_M', 'U18_F', 'U20_M', 'U20_F', 'SENIOR_M', 'SENIOR_F'
  ]);

  // Selected Disciplines
  const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<string[]>([
    'disc_100m', 'disc_200m', 'disc_400m', 'disc_800m', 'disc_1500m',
    'disc_4x100m_m', 'disc_4x100m_f',
    'disc_long_jump', 'disc_high_jump',
    'disc_shot_put', 'disc_discus_throw'
  ]);

  // Active Wizard Tab on Right Panel
  const [activeSettingsTab, setActiveSettingsTab] = useState<'info' | 'categories' | 'disciplines' | 'timings'>('info');

  // Custom timings per discipline
  const [disciplineTimings, setDisciplineTimings] = useState<Record<string, { 
    dayIndex: number; 
    time: string; 
    round: 'heats' | 'semi' | 'final'; 
    venueLocation?: string; 
    notes?: string 
  }>>({
    'disc_100m': { dayIndex: 1, time: '09:00', round: 'heats', venueLocation: 'المضمار الرئيسي' },
    'disc_200m': { dayIndex: 1, time: '10:30', round: 'heats', venueLocation: 'المضمار الرئيسي' },
    'disc_400m': { dayIndex: 1, time: '11:45', round: 'final', venueLocation: 'المضمار الرئيسي' },
    'disc_800m': { dayIndex: 1, time: '15:00', round: 'final', venueLocation: 'المضمار الرئيسي' },
    'disc_1500m': { dayIndex: 1, time: '16:30', round: 'final', venueLocation: 'المضمار الرئيسي' },
    'disc_4x100m_m': { dayIndex: 1, time: '17:30', round: 'final', venueLocation: 'المضمار الرئيسي' },
    'disc_4x100m_f': { dayIndex: 1, time: '18:00', round: 'final', venueLocation: 'المضمار الرئيسي' },
    'disc_long_jump': { dayIndex: 1, time: '09:30', round: 'final', venueLocation: 'حفرة الوثب 1' },
    'disc_high_jump': { dayIndex: 1, time: '10:45', round: 'final', venueLocation: 'بساط الوثب العالي' },
    'disc_shot_put': { dayIndex: 1, time: '15:15', round: 'final', venueLocation: 'دائرة الرمي A' },
    'disc_discus_throw': { dayIndex: 1, time: '16:45', round: 'final', venueLocation: 'قفص القرص والمطرقة' },
  });

  // Reordered Schedule Override State
  const [scheduleOverride, setScheduleOverride] = useState<GeneratedCompetitionSchedule | null>(null);

  // Sync Status State (Server persistence vs local offline)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending_sync' | 'syncing' | 'error'>('pending_sync');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Notice & Feedback Toast
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const notify = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setFeedbackToast({ text, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // ═══ Sync initialCompetitionId if updated externally ═══
  useEffect(() => {
    if (initialCompetitionId) {
      setSelectedCompetitionId(initialCompetitionId);
    }
  }, [initialCompetitionId]);

  // ═══ Load Competitions on Mount ═══
  useEffect(() => {
    let mounted = true;
    competitionsService.getCompetitions().then(comps => {
      if (mounted) {
        setCompetitions(comps);
        if (!selectedCompetitionId && comps.length > 0) {
          setSelectedCompetitionId(comps[0].id);
        }
      }
    });
    return () => { mounted = false; };
  }, []);

  // ═══ Load Specific Plan When Active Competition Changes (Phase D Isolation) ═══
  useEffect(() => {
    if (!selectedCompetitionId) return;

    // 1. Try loading from unified competition file architecture
    const file = competitionFileService.getCompetitionFile(selectedCompetitionId);
    if (file) {
      setCompetitionName(file.metadata.name);
      setStartDate(file.metadata.startDate);
      setEndDate(file.metadata.endDate || file.metadata.startDate);
      setVenue(file.metadata.venue);
      setCompetitionLevel(file.metadata.level || 'wilaya');
      setOrganizingLeagueId(file.metadata.organizingLeagueId);
      setOrganizingLeagueName(file.metadata.organizingLeagueName);
      if (file.selectedCategoryCodes?.length) setSelectedCategories(file.selectedCategoryCodes);
      if (file.selectedDisciplineIds?.length) setSelectedDisciplineIds(file.selectedDisciplineIds);
      if (file.disciplineTimings) setDisciplineTimings(file.disciplineTimings);
      if (file.schedule) setScheduleOverride(file.schedule);
      setSyncStatus(file.syncStatus || 'pending_sync');
      setLastSyncedAt(file.lastSyncedAt || null);
      return;
    }

    // 2. Try loading existing saved plan
    const savedPlan = planningBureauService.getPlanningForCompetition(selectedCompetitionId);
    if (savedPlan && savedPlan.draft) {
      const d = savedPlan.draft;
      setCompetitionName(d.competitionName || competitionName);
      setStartDate(d.startDate || startDate);
      setEndDate(d.endDate || d.startDate || endDate);
      setVenue(d.venue || venue);
      setOrganizingLeagueId(d.organizingLeagueId || organizingLeagueId);
      setOrganizingLeagueName(d.organizingLeagueName || organizingLeagueName);
      if (d.selectedCategoryCodes?.length) setSelectedCategories(d.selectedCategoryCodes);
      if (d.selectedDisciplineIds?.length) setSelectedDisciplineIds(d.selectedDisciplineIds);
      if (d.disciplineTimings) setDisciplineTimings(d.disciplineTimings);
      if (savedPlan.schedule) setScheduleOverride(savedPlan.schedule);
      return;
    }

    // 3. Fallback: Initialize from competition record metadata
    const comp = competitions.find(c => c.id === selectedCompetitionId);
    if (comp) {
      setCompetitionName(comp.name);
      setStartDate(comp.date);
      setEndDate(comp.endDate || comp.date);
      setVenue(comp.venue);
      setOrganizingLeagueName(comp.leagueName || initialLeagueName);
      setScheduleOverride(null);
    }
  }, [selectedCompetitionId, competitions]);

  // Grouped disciplines for selection
  const courseIndividual = useMemo(() => disciplinesSeedService.getCourseDisciplines(), []);
  const relaysList = useMemo(() => disciplinesSeedService.getRelayDisciplines(), []);
  const jumpsList = useMemo(() => disciplinesSeedService.getConcoursJumps(), []);
  const throwsList = useMemo(() => disciplinesSeedService.getConcoursThrows(), []);
  const combinedList = useMemo(() => disciplinesSeedService.getCombinedDisciplines(), []);

  // ═══ 2. Live Generated Schedule ═══
  const draft: CompetitionPlanningDraft = useMemo(() => ({
    competitionName,
    startDate,
    endDate,
    venue,
    organizingLeagueId,
    organizingLeagueName,
    selectedCategoryCodes: selectedCategories,
    selectedDisciplineIds,
    disciplineTimings
  }), [competitionName, startDate, endDate, venue, organizingLeagueId, organizingLeagueName, selectedCategories, selectedDisciplineIds, disciplineTimings]);

  // Live active schedule (computed or overridden by user reordering)
  const liveSchedule: GeneratedCompetitionSchedule = useMemo(() => {
    if (scheduleOverride) {
      return {
        ...scheduleOverride,
        competitionName,
        venue,
        datesText: startDate === endDate ? startDate : `${startDate} إلى ${endDate}`,
        organizingLeagueName
      };
    }
    return planningBureauService.generateSchedule(draft);
  }, [draft, scheduleOverride, competitionName, venue, startDate, endDate, organizingLeagueName]);

  // ═══ World Athletics TR20.3 Rest Interval Validation ═══
  const restValidation = useMemo(() => {
    return planningBureauService.validateRestIntervals(liveSchedule);
  }, [liveSchedule]);

  // Handlers for "Select All" / "Deselect All"
  const toggleAllInList = (list: AthleticsDiscipline[]) => {
    setScheduleOverride(null);
    setSyncStatus('pending_sync');
    const ids = list.map(d => d.id);
    const allSelected = ids.every(id => selectedDisciplineIds.includes(id));
    if (allSelected) {
      setSelectedDisciplineIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedDisciplineIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const toggleAllCategories = () => {
    setScheduleOverride(null);
    setSyncStatus('pending_sync');
    const allCodes = OFFICIAL_PARTICIPATING_CATEGORIES.map(c => c.code);
    const allSelected = allCodes.every(code => selectedCategories.includes(code));
    if (allSelected) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(allCodes);
    }
  };

  const toggleDiscipline = (id: string) => {
    setScheduleOverride(null);
    setSyncStatus('pending_sync');
    setSelectedDisciplineIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCategory = (code: string) => {
    setScheduleOverride(null);
    setSyncStatus('pending_sync');
    setSelectedCategories(prev =>
      prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]
    );
  };

  const updateDisciplineTime = (discId: string, time: string) => {
    setScheduleOverride(null);
    setSyncStatus('pending_sync');
    setDisciplineTimings(prev => ({
      ...prev,
      [discId]: {
        ...(prev[discId] || { dayIndex: 1, round: 'final' }),
        time
      }
    }));
  };

  const updateDisciplineVenueLocation = (discId: string, venueLocation: string) => {
    setScheduleOverride(null);
    setSyncStatus('pending_sync');
    setDisciplineTimings(prev => ({
      ...prev,
      [discId]: {
        ...(prev[discId] || { dayIndex: 1, round: 'final', time: '09:00' }),
        venueLocation
      }
    }));
  };

  // ═══ Schedule Reordering Action (Phase D Requirement: قابل لإعادة ترتيب الفقرات) ═══
  const handleMoveScheduleItem = (
    tableKey: 'individualRaces' | 'relays' | 'jumps' | 'throws' | 'tableCombined',
    index: number,
    direction: 'up' | 'down'
  ) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const base = JSON.parse(JSON.stringify(liveSchedule)) as GeneratedCompetitionSchedule;

    let targetArray: ScheduledDisciplineItem[] | null = null;
    if (tableKey === 'individualRaces') targetArray = base.tableCourse.individualRaces;
    else if (tableKey === 'relays') targetArray = base.tableCourse.relays;
    else if (tableKey === 'jumps') targetArray = base.tableConcours.jumps;
    else if (tableKey === 'throws') targetArray = base.tableConcours.throws;
    else if (tableKey === 'tableCombined') targetArray = base.tableCombined;

    if (!targetArray || targetIndex < 0 || targetIndex >= targetArray.length) return;

    const [item] = targetArray.splice(index, 1);
    targetArray.splice(targetIndex, 0, item);

    setScheduleOverride(base);
    setSyncStatus('pending_sync');
    notify(`تم تعديل ترتيب فقرة "${item.disciplineNameAr}" ${direction === 'up' ? 'للأعلى' : 'للأسفل'}.`);
  };

  const handlePrint = () => {
    window.print();
  };

  // ═══ Action: Save Plan to Selected Competition (Phase D Core) ═══
  const handleSaveToCompetition = async () => {
    const targetCompId = selectedCompetitionId || `comp_${Date.now()}`;
    
    // Synthesize full competition file
    let file = competitionFileService.getCompetitionFile(targetCompId);
    if (!file) {
      file = competitionFileService.synthesizeFromFileOrDraft(targetCompId)!;
    }

    file.metadata.name = competitionName;
    file.metadata.startDate = startDate;
    file.metadata.endDate = endDate;
    file.metadata.venue = venue;
    file.metadata.level = competitionLevel;
    file.metadata.organizingLeagueId = organizingLeagueId;
    file.metadata.organizingLeagueName = organizingLeagueName;
    file.selectedCategoryCodes = selectedCategories;
    file.selectedDisciplineIds = selectedDisciplineIds;
    file.disciplineTimings = disciplineTimings;
    file.schedule = liveSchedule;

    setSyncStatus('syncing');
    const res = await competitionFileService.saveCompetitionFile(
      file, 
      'مسؤول مكتب التخطيط', 
      `حفظ واعتماد جدول وتوقيتات ${liveSchedule.totalEventsCount} مسابقة مبرمجة.`
    );

    setSyncStatus(res.syncStatus);
    if (res.syncStatus === 'synced') {
      setLastSyncedAt(new Date().toISOString());
    }

    if (onScheduleSaved) {
      onScheduleSaved(liveSchedule);
    }

    notify(`تم حفظ واعتماد ملف المنافسة المستقل لـ "${competitionName}" بنجاح (${res.syncStatus === 'synced' ? 'متزامن مع الخادم' : 'محفوظ محلياً Offline'}).`);
  };

  // ═══ Action: Push Sync to Server ═══
  const handleSyncWithServer = async () => {
    const targetCompId = selectedCompetitionId || `comp_${Date.now()}`;
    setSyncStatus('syncing');
    const result = await competitionFileService.syncWithServer(targetCompId);
    if (result.success) {
      setSyncStatus('synced');
      setLastSyncedAt(result.syncedAt || new Date().toISOString());
      notify('تمت المزامنة بنجاح مع السحابة الفيدرالية.');
    } else {
      setSyncStatus('error');
      notify(result.error || 'فشلت المزامنة مع الخادم. تم الإبقاء على النسخة المحلية.', 'error');
    }
  };

  // ═══ Action: Auto Calculate Timings ═══
  const handleAutoCalculateTimings = () => {
    const autoTimings = planningBureauService.autoCalculateIntelligentTimings(
      selectedDisciplineIds,
      selectedCategories,
      9 // Starts at 09:00 AM
    );
    setDisciplineTimings(autoTimings);
    setScheduleOverride(null);
    setSyncStatus('pending_sync');
    notify('تم توليد التوقيت الذكي وجدولة الفترات وفق معايير World Athletics بنجاح!');
  };

  // ═══ Action: Export Portable JSON Plan / Competition File ═══
  const handleExportPlanJson = () => {
    const targetCompId = selectedCompetitionId || 'comp_current';
    handleSaveToCompetition();

    const jsonStr = competitionFileService.exportCompetitionBundle(targetCompId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Competition_${competitionName.replace(/\s+/g, '_')}.pfp-competition`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('تم تصدير ملف المنافسة المستقل الشامل (.pfp-competition) بنجاح.');
  };

  // ═══ Action: Import Portable JSON Plan (.pfp-competition or .pfp-plan) ═══
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = competitionFileService.importCompetitionBundle(content);
        setSelectedCompetitionId(imported.metadata.id);
        setScheduleOverride(imported.schedule);
        notify(`تم استيراد ملف المنافسة "${imported.metadata.name}" بنجاح!`);
      } catch (err: any) {
        notify(err?.message || 'تعذر استيراد ملف المنافسة. تأكد من صحة الملف.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ═══ Action: Unified Multi-Format Export ═══
  const handleExportClick = (type: 'pdf' | 'word' | 'excel') => {
    const adapter = planningBureauService.createExportAdapter();
    const typeLabel = type === 'pdf' ? 'PDF' : type === 'word' ? 'Word (Docx)' : 'Excel';
    notify(`جاري تصدير وثيقة ${typeLabel} بالترويسة الموحدة للرابطة...`);
    if (type === 'pdf') adapter.exportToPdf(liveSchedule);
    else if (type === 'word') adapter.exportToWord(liveSchedule);
    else adapter.exportToExcel(liveSchedule);
  };

  return (
    <div className="min-h-screen bg-[var(--bg,#FFFFFF)] text-[var(--ink,#0A0A0A)] relative pb-16" dir="rtl">
      
      {/* Hidden File Input for Plan Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".pfp-competition,.pfp-plan,.json" 
        className="hidden" 
      />

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 relative z-10">
        
        {/* ═══ Header & Active Competition Selector Bar (World Athletics Architecture) ═══ */}
        <div className="p-5 rounded-[var(--radius-lg,6px)] bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)] shadow-[var(--shadow-2,0_2px_0_rgba(10,10,10,.12))] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="accent" dot>
                  مكتب التخطيط والبرمجة الفيدرالي • المرحلة D
                </Badge>
                <span className="text-xs text-[var(--ink-2,#4A4A47)] font-mono">World Athletics Dual-Table Engine</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--ink,#0A0A0A)] flex items-center gap-2.5">
                <Calendar className="w-6 h-6 text-[var(--accent,#E5321B)]" />
                <span>مكتب التخطيط وهندسة برامج المنافسات (الملف المستقل)</span>
              </h1>
              <p className="text-xs text-[var(--ink-2,#4A4A47)] mt-0.5">
                تخطيط مستقل لكل منافسة، حفظ ومزامنة مع الخادم، إعادة ترتيب الفقرات، والتحقق الصارم من فواصل الراحة TR20.3.
              </p>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleSaveToCompetition} 
                icon={<Save className="w-3.5 h-3.5" />}
                className="font-bold text-xs"
              >
                حفظ واعتماد البرنامج 💾
              </Button>

              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleExportPlanJson} 
                icon={<Download className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
                title="تصدير ملف منافسة مستقل لنقله لأجهزة أخرى دون إنترنت"
              >
                تصدير الملف المستقل (.pfp)
              </Button>

              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()} 
                icon={<Upload className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
                title="استيراد خطة منافسة من ملف خارجي"
              >
                استيراد ملف
              </Button>

              <Button variant="ghost" size="sm" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />}>
                طباعة 🖨️
              </Button>

              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  إغلاق
                </Button>
              )}
            </div>
          </div>

          {/* Active Competition Selector & Sync Indicator Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-[var(--border,#DADAD6)]">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-bold text-[var(--ink-2,#4A4A47)] shrink-0 flex items-center gap-1">
                <Trophy className="w-4 h-4 text-[var(--accent,#E5321B)]" />
                المنافسة النشطة:
              </span>
              <select
                value={selectedCompetitionId}
                onChange={(e) => setSelectedCompetitionId(e.target.value)}
                className="w-full max-w-md px-3 py-1.5 rounded-[var(--radius-sm,2px)] text-xs font-bold bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] text-[var(--ink,#0A0A0A)] focus:outline-none cursor-pointer"
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city} - {c.date})
                  </option>
                ))}
                <option value="new_draft">+ مسودة منافسة جديدة</option>
              </select>
            </div>

            {/* Server Persistence & Offline Sync Indicator (Phase D Core) */}
            <div className="flex items-center gap-2 flex-wrap">
              {syncStatus === 'synced' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm,2px)] bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>متزامن مع الخادم الفيدرالي {lastSyncedAt ? `(${new Date(lastSyncedAt).toLocaleTimeString('ar-DZ')})` : ''}</span>
                </div>
              ) : syncStatus === 'syncing' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm,2px)] bg-blue-50 border border-blue-300 text-blue-800 text-xs font-bold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>جاري المزامنة مع الخادم...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm,2px)] bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold">
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>تغييرات محلية غير متزامنة (Offline)</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSyncWithServer}
                    icon={<RefreshCw className="w-3 h-3" />}
                    className="text-[11px] py-1 px-2.5 h-7 font-bold"
                  >
                    مزامنة الآن 🔄
                  </Button>
                </div>
              )}

              {/* WA TR20.3 Live Indicator */}
              {restValidation.valid ? (
                <Badge variant="success" size="sm" dot>
                  فواصل الراحة مطابقة TR20.3
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" dot>
                  {restValidation.warnings.length} تداخل زمني بحاجة لمراجعة
                </Badge>
              )}
            </div>
          </div>

          {/* Feedback Toast */}
          {feedbackToast && (
            <div className={`p-3 rounded-[var(--radius-sm,2px)] border text-xs font-bold flex items-center gap-2 ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedbackToast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {feedbackToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{feedbackToast.text}</span>
            </div>
          )}

          {/* Rest Interval Warnings Strip if any */}
          {!restValidation.valid && (
            <div className="p-3.5 rounded-[var(--radius-sm,2px)] bg-amber-50 border border-amber-300 space-y-1.5 text-xs">
              <div className="font-black text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>تنبيهات الفواصل الزمنية الرسمية (World Athletics Rule TR20.3):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11.5px] pr-2">
                {restValidation.warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ═══ DUAL SPLIT LAYOUT (World Athletics Solid High Contrast) ═══ */}
        <SplitLayout
          primaryTitle="برنامج المنافسة المعتمد"
          secondaryTitle="إعدادات وبرمجة المنافسة"
          primarySpan={7}
          secondarySpan={5}
          secondaryContent={
            <div className="space-y-5">
              <div className="p-5 sm:p-6 rounded-[var(--radius-lg,6px)] bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)] shadow-[var(--shadow-2,0_2px_0_rgba(10,10,10,.12))] space-y-5">
                
                {/* Settings Sub-Tabs */}
                <div className="flex items-center justify-between border-b border-[var(--border,#DADAD6)] pb-3">
                  {[
                    { id: 'info', label: '1. البيانات', icon: Trophy },
                    { id: 'categories', label: '2. الأصناف', icon: Award },
                    { id: 'disciplines', label: '3. التخصصات', icon: Layers },
                    { id: 'timings', label: '4. التوقيت والميدان', icon: Clock },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSettingsTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm,2px)] text-xs font-bold transition cursor-pointer ${
                        activeSettingsTab === tab.id
                          ? 'bg-[var(--block,#0A0A0A)] text-white font-black shadow-sm'
                          : 'text-[var(--ink-2,#4A4A47)] hover:text-[var(--ink,#0A0A0A)] hover:bg-[var(--surface-alt,#F3F3F1)]'
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab 1: Competition Basic Info & Level (Phase D Wizard) */}
                {activeSettingsTab === 'info' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <Input
                      label="اسم المنافسة الرسمية"
                      value={competitionName}
                      onChange={(e) => {
                        setCompetitionName(e.target.value);
                        setSyncStatus('pending_sync');
                      }}
                      placeholder="مثلاً: البطولة الولائية للأكابر 2026"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="تاريخ البداية"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setSyncStatus('pending_sync');
                        }}
                      />
                      <Input
                        label="تاريخ الختام"
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setSyncStatus('pending_sync');
                        }}
                      />
                    </div>

                    <Input
                      label="مكان ومضمار المنافسة"
                      value={venue}
                      onChange={(e) => {
                        setVenue(e.target.value);
                        setSyncStatus('pending_sync');
                      }}
                      placeholder="المركب الرياضي الأولمبي..."
                    />

                    {/* Level Selection (وطني / ولائي / جهوي / محلي) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--ink,#0A0A0A)]">
                        مستوى المنافسة (Competition Level)
                      </label>
                      <select
                        value={competitionLevel}
                        onChange={(e) => {
                          setCompetitionLevel(e.target.value as CompetitionLevel);
                          setSyncStatus('pending_sync');
                        }}
                        className="w-full px-3 py-2 rounded-[var(--radius-sm,2px)] text-xs font-bold bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] text-[var(--ink,#0A0A0A)] focus:outline-none cursor-pointer"
                      >
                        <option value="national">بطولة وطنية فيدرالية (FAA National Championship)</option>
                        <option value="regional">بطولة جهوية (Regional Meet)</option>
                        <option value="wilaya">بطولة ولائية رسمية (Wilaya Official Championship)</option>
                        <option value="local">تجمع محلي / ما بين الأندية (Local Athletics Meet)</option>
                      </select>
                    </div>

                    <Input
                      label="الرابطة المنظمة"
                      value={organizingLeagueName}
                      onChange={(e) => {
                        setOrganizingLeagueName(e.target.value);
                        setSyncStatus('pending_sync');
                      }}
                    />

                    <div className="pt-2 flex justify-end">
                      <Button variant="secondary" size="sm" onClick={() => setActiveSettingsTab('categories')}>
                        التالي: اختيار الأصناف العمرية ←
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Age Categories (All WA Official Categories) */}
                {activeSettingsTab === 'categories' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--ink-2,#4A4A47)]">
                        الأصناف العمرية المعتمدة ({selectedCategories.length} مختارة):
                      </span>
                      <Button variant="ghost" size="sm" onClick={toggleAllCategories} className="text-xs">
                        {selectedCategories.length === OFFICIAL_PARTICIPATING_CATEGORIES.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                      {OFFICIAL_PARTICIPATING_CATEGORIES.map(cat => {
                        const isSelected = selectedCategories.includes(cat.code);
                        return (
                          <div
                            key={cat.id}
                            onClick={() => toggleCategory(cat.code)}
                            className={`p-3 rounded-[var(--radius-sm,2px)] border text-xs cursor-pointer transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-red-50 border-[var(--accent,#E5321B)] font-bold text-[var(--accent,#E5321B)]'
                                : 'bg-[var(--surface-alt,#F3F3F1)] border-[var(--border,#DADAD6)] text-[var(--ink-2,#4A4A47)]'
                            }`}
                          >
                            <div>
                              <div>{cat.nameAr}</div>
                              <div className="text-[10px] text-[var(--ink-3,#7C7C77)]">{cat.ageRange}</div>
                            </div>
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--accent,#E5321B)]" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--ink-3,#7C7C77)]" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setActiveSettingsTab('info')}>
                        السابق
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setActiveSettingsTab('disciplines')}>
                        التالي: اختيار التخصصات ←
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Disciplines Selection (39 Reference Disciplines + Group Select) */}
                {activeSettingsTab === 'disciplines' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--ink-2,#4A4A47)]">
                        التخصصات المختارة ({selectedDisciplineIds.length}):
                      </span>
                    </div>

                    {/* Groups Sections */}
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      
                      {/* Course Individual */}
                      <div className="p-3 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-[var(--ink,#0A0A0A)]">
                            1. مسابقات المضمار والجري ({courseIndividual.length})
                          </span>
                          <button
                            onClick={() => toggleAllInList(courseIndividual)}
                            className="text-[11px] text-[var(--accent,#E5321B)] font-bold hover:underline"
                          >
                            تحديد المجموعة
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {courseIndividual.map(d => (
                            <label
                              key={d.id}
                              className="flex items-center gap-2 p-1.5 rounded-[var(--radius-sm,2px)] hover:bg-slate-200 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDisciplineIds.includes(d.id)}
                                onChange={() => toggleDiscipline(d.id)}
                                className="rounded"
                              />
                              <span className="truncate">{d.nameAr}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Relays */}
                      <div className="p-3 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-[var(--accent,#E5321B)]">
                            2. سباقات التتابع ({relaysList.length})
                          </span>
                          <button
                            onClick={() => toggleAllInList(relaysList)}
                            className="text-[11px] text-[var(--accent,#E5321B)] font-bold hover:underline"
                          >
                            تحديد المجموعة
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {relaysList.map(d => (
                            <label
                              key={d.id}
                              className="flex items-center gap-2 p-1.5 rounded-[var(--radius-sm,2px)] hover:bg-slate-200 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDisciplineIds.includes(d.id)}
                                onChange={() => toggleDiscipline(d.id)}
                                className="rounded"
                              />
                              <span className="truncate">{d.nameAr}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Jumps */}
                      <div className="p-3 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-emerald-700">
                            3. مسابقات الوثب والقفز ({jumpsList.length})
                          </span>
                          <button
                            onClick={() => toggleAllInList(jumpsList)}
                            className="text-[11px] text-[var(--accent,#E5321B)] font-bold hover:underline"
                          >
                            تحديد المجموعة
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {jumpsList.map(d => (
                            <label
                              key={d.id}
                              className="flex items-center gap-2 p-1.5 rounded-[var(--radius-sm,2px)] hover:bg-slate-200 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDisciplineIds.includes(d.id)}
                                onChange={() => toggleDiscipline(d.id)}
                                className="rounded"
                              />
                              <span className="truncate">{d.nameAr}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Throws */}
                      <div className="p-3 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-purple-700">
                            4. مسابقات الرمي ({throwsList.length})
                          </span>
                          <button
                            onClick={() => toggleAllInList(throwsList)}
                            className="text-[11px] text-[var(--accent,#E5321B)] font-bold hover:underline"
                          >
                            تحديد المجموعة
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {throwsList.map(d => (
                            <label
                              key={d.id}
                              className="flex items-center gap-2 p-1.5 rounded-[var(--radius-sm,2px)] hover:bg-slate-200 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDisciplineIds.includes(d.id)}
                                onChange={() => toggleDiscipline(d.id)}
                                className="rounded"
                              />
                              <span className="truncate">{d.nameAr}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Combined */}
                      <div className="p-3 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-indigo-700">
                            5. المسابقات المركبة ({combinedList.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {combinedList.map(d => (
                            <label
                              key={d.id}
                              className="flex items-center gap-2 p-1.5 rounded-[var(--radius-sm,2px)] hover:bg-slate-200 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDisciplineIds.includes(d.id)}
                                onChange={() => toggleDiscipline(d.id)}
                                className="rounded"
                              />
                              <span className="truncate">{d.nameAr}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setActiveSettingsTab('categories')}>
                        السابق
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setActiveSettingsTab('timings')}>
                        التالي: ضبط التوقيت والميدان ←
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tab 4: Timings, Venue Locations & Intelligent Auto-Scheduler */}
                {activeSettingsTab === 'timings' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--ink-2,#4A4A47)]">
                        تعديل توقيت الانطلاق والأدوار ومكان الإجراء:
                      </span>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleAutoCalculateTimings}
                        icon={<Sparkles className="w-3.5 h-3.5 text-[var(--accent,#E5321B)]" />}
                        className="text-xs font-bold"
                      >
                        جدولة ذكية تلقائية ⚡
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {selectedDisciplineIds.map(discId => {
                        const disc = disciplinesSeedService.getAllDisciplines().find(d => d.id === discId);
                        if (!disc) return null;
                        const timing = disciplineTimings[discId] || { dayIndex: 1, time: '09:00', round: 'final' };

                        return (
                          <div
                            key={discId}
                            className="p-3 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="font-bold text-[var(--ink,#0A0A0A)] truncate">{disc.nameAr}</div>
                                <div className="text-[10px] text-[var(--ink-3,#7C7C77)]">{disc.code}</div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <select
                                  value={timing.round}
                                  onChange={(e) => {
                                    setSyncStatus('pending_sync');
                                    setDisciplineTimings(prev => ({
                                      ...prev,
                                      [discId]: {
                                        ...(prev[discId] || { dayIndex: 1, time: '09:00' }),
                                        round: e.target.value as any
                                      }
                                    }));
                                  }}
                                  className="px-2 py-1 rounded-[var(--radius-sm,2px)] text-xs bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)]"
                                >
                                  <option value="heats">تصفيات</option>
                                  <option value="semi">نصف نهائي</option>
                                  <option value="final">نهائي مباشر</option>
                                </select>

                                <input
                                  type="time"
                                  value={timing.time}
                                  onChange={(e) => updateDisciplineTime(discId, e.target.value)}
                                  className="px-2 py-1 rounded-[var(--radius-sm,2px)] text-xs font-mono font-bold bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)]"
                                />
                              </div>
                            </div>

                            {/* Location / Venue Slot (Phase D Requirement: مكان الإجراء) */}
                            <div className="flex items-center gap-2 pt-1 border-t border-[var(--border,#DADAD6)] text-[11px]">
                              <span className="text-[var(--ink-3,#7C7C77)] shrink-0">مكان الإجراء:</span>
                              <input
                                type="text"
                                value={timing.venueLocation || ''}
                                onChange={(e) => updateDisciplineVenueLocation(discId, e.target.value)}
                                placeholder="مثلاً: المضمار الرئيسي، الميدان A، حفرة الوثب..."
                                className="w-full px-2 py-0.5 rounded-[var(--radius-sm,2px)] bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)] text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setActiveSettingsTab('disciplines')}>
                        السابق
                      </Button>
                      <Button variant="primary" size="sm" onClick={handleSaveToCompetition} icon={<Save className="w-3.5 h-3.5" />}>
                        حفظ البرنامج المعتمد
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          }
          primaryContent={
            <div className="space-y-6">

              {/* Top Dynamic Overview Strip */}
              <div className="p-5 rounded-[var(--radius-lg,6px)] bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)] shadow-[var(--shadow-2,0_2px_0_rgba(10,10,10,.12))] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border,#DADAD6)] pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-[var(--ink,#0A0A0A)]">
                      {liveSchedule.competitionName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-2,#4A4A47)] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[var(--accent,#E5321B)]" />
                        <span>{liveSchedule.datesText}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[var(--accent,#E5321B)]" />
                        <span>{liveSchedule.venue}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        <span>{liveSchedule.organizingLeagueName}</span>
                      </span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10.5px]">
                        {competitionLevel === 'national' ? 'بطولة وطنية' : competitionLevel === 'regional' ? 'بطولة جهوية' : competitionLevel === 'wilaya' ? 'بطولة ولائية' : 'تجمع محلي'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="accent" size="sm">
                      {liveSchedule.totalEventsCount} مسابقة مبرمجة
                    </Badge>
                  </div>
                </div>

                {/* Export Toolbar (Unified Header Integration) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <span className="text-[var(--ink-2,#4A4A47)] font-bold">تصدير البرنامج الرسمي المعتمد:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportClick('pdf')}
                      className="px-2.5 py-1.5 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] hover:bg-slate-200 border border-[var(--border,#DADAD6)] text-[var(--ink,#0A0A0A)] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-rose-600" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleExportClick('word')}
                      className="px-2.5 py-1.5 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] hover:bg-slate-200 border border-[var(--border,#DADAD6)] text-[var(--ink,#0A0A0A)] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span>Word (.docx)</span>
                    </button>
                    <button
                      onClick={() => handleExportClick('excel')}
                      className="px-2.5 py-1.5 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] hover:bg-slate-200 border border-[var(--border,#DADAD6)] text-[var(--ink,#0A0A0A)] flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span>Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ═══ TABLE 1: COURSE (سباقات المضمار والجري + سباقات التتابع) ═══ */}
              <div className="p-6 rounded-[var(--radius-lg,6px)] bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)] shadow-[var(--shadow-2,0_2px_0_rgba(10,10,10,.12))] space-y-5">
                <div className="flex items-center justify-between border-b border-[var(--border,#DADAD6)] pb-3">
                  <h3 className="text-base font-black text-[var(--ink,#0A0A0A)] flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[var(--accent,#E5321B)]" />
                    <span>1. جدول مسابقات المضمار والجري (Course)</span>
                  </h3>
                  <span className="text-xs font-mono text-[var(--accent,#E5321B)] font-bold">
                    {liveSchedule.tableCourse.individualRaces.length + liveSchedule.tableCourse.relays.length} سباقات
                  </span>
                </div>

                {/* Individual Races with Move Up / Move Down Reordering */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[var(--ink-2,#4A4A47)] flex items-center justify-between">
                    <span>سباقات السرعة والمسافات المتوسطة والطويلة والحواجز:</span>
                    <span className="text-[11px] text-[var(--ink-3,#7C7C77)]">استعمل الأسهم لإعادة ترتيب تسلسل الفقرات</span>
                  </div>
                  {liveSchedule.tableCourse.individualRaces.length === 0 ? (
                    <div className="p-4 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] text-center text-xs text-[var(--ink-2,#4A4A47)]">
                      لم يتم اختيار سباقات فردية بعد من لوحة الإعدادات يميناً.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-[var(--radius-sm,2px)] border border-[var(--border,#DADAD6)]">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[var(--surface-alt,#F3F3F1)] text-[var(--ink-2,#4A4A47)] font-bold border-b border-[var(--border,#DADAD6)] text-[11px]">
                          <tr>
                            <th className="py-2.5 px-2 text-center w-12">ترتيب</th>
                            <th className="py-2.5 px-3">التوقيت</th>
                            <th className="py-2.5 px-3">المسافة والتخصص</th>
                            <th className="py-2.5 px-3">الصنف والجنس</th>
                            <th className="py-2.5 px-3">نوع الدور</th>
                            <th className="py-2.5 px-3">المكان</th>
                            <th className="py-2.5 px-3 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border,#DADAD6)]">
                          {liveSchedule.tableCourse.individualRaces.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-[var(--surface-alt,#F3F3F1)] transition">
                              <td className="py-2 px-1 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    disabled={idx === 0}
                                    onClick={() => handleMoveScheduleItem('individualRaces', idx, 'up')}
                                    className="p-1 rounded hover:bg-slate-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="تقديم الترتيب للأعلى"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={idx === liveSchedule.tableCourse.individualRaces.length - 1}
                                    onClick={() => handleMoveScheduleItem('individualRaces', idx, 'down')}
                                    className="p-1 rounded hover:bg-slate-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="تأخير الترتيب للأسفل"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-[var(--accent,#E5321B)]">
                                {item.time} (يوم {item.dayIndex})
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[var(--ink,#0A0A0A)]">
                                {item.disciplineNameAr}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[var(--ink,#0A0A0A)]">
                                {item.categoryNameAr}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--ink-2,#4A4A47)]">
                                <span className="px-2 py-0.5 rounded-[var(--radius-sm,2px)] bg-slate-100 border border-[var(--border,#DADAD6)] font-bold text-[10px]">
                                  {item.roundLabelAr}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-[var(--ink-3,#7C7C77)]">
                                {disciplineTimings[item.disciplineId]?.venueLocation || 'المضمار الرئيسي'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => toggleDiscipline(item.disciplineId)}
                                  className="p-1 rounded-[var(--radius-sm,2px)] text-[var(--ink-3,#7C7C77)] hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="حذف من البرنامج"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sub-Table: Relays */}
                <div className="space-y-2 pt-2 border-t border-[var(--border,#DADAD6)]">
                  <div className="text-xs font-black text-[var(--accent,#E5321B)] flex items-center justify-between">
                    <span>سباقات التتابع (Relais - قسم فرعي):</span>
                    <span className="text-[11px] text-[var(--ink-3,#7C7C77)]">إمكانية الترتيب بالأزرار</span>
                  </div>
                  {liveSchedule.tableCourse.relays.length === 0 ? (
                    <div className="p-4 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] text-center text-xs text-[var(--ink-2,#4A4A47)]">
                      لم يتم اختيار سباقات تتابع بعد.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-[var(--radius-sm,2px)] border border-[var(--border,#DADAD6)]">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-red-50 text-red-900 font-bold border-b border-[var(--border,#DADAD6)] text-[11px]">
                          <tr>
                            <th className="py-2.5 px-2 text-center w-12">ترتيب</th>
                            <th className="py-2.5 px-3">التوقيت</th>
                            <th className="py-2.5 px-3">سباق التتابع</th>
                            <th className="py-2.5 px-3">الصنف</th>
                            <th className="py-2.5 px-3">الدور</th>
                            <th className="py-2.5 px-3 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border,#DADAD6)]">
                          {liveSchedule.tableCourse.relays.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-[var(--surface-alt,#F3F3F1)] transition">
                              <td className="py-2 px-1 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    disabled={idx === 0}
                                    onClick={() => handleMoveScheduleItem('relays', idx, 'up')}
                                    className="p-1 rounded hover:bg-slate-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="تقديم الترتيب للأعلى"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={idx === liveSchedule.tableCourse.relays.length - 1}
                                    onClick={() => handleMoveScheduleItem('relays', idx, 'down')}
                                    className="p-1 rounded hover:bg-slate-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="تأخير الترتيب للأسفل"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-[var(--accent,#E5321B)]">
                                {item.time} (يوم {item.dayIndex})
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[var(--ink,#0A0A0A)]">
                                {item.disciplineNameAr}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--accent,#E5321B)] font-bold">
                                {item.categoryNameAr}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--ink-2,#4A4A47)]">
                                <span className="px-2 py-0.5 rounded-[var(--radius-sm,2px)] bg-slate-100 border border-[var(--border,#DADAD6)] font-bold text-[10px]">
                                  {item.roundLabelAr}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => toggleDiscipline(item.disciplineId)}
                                  className="p-1 rounded-[var(--radius-sm,2px)] text-[var(--ink-3,#7C7C77)] hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="حذف من البرنامج"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ TABLE 2: CONCOURS (مسابقات الميدان: الوثب + الرمي) ═══ */}
              <div className="p-6 rounded-[var(--radius-lg,6px)] bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)] shadow-[var(--shadow-2,0_2px_0_rgba(10,10,10,.12))] space-y-5">
                <div className="flex items-center justify-between border-b border-[var(--border,#DADAD6)] pb-3">
                  <h3 className="text-base font-black text-[var(--ink,#0A0A0A)] flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-700" />
                    <span>2. جدول مسابقات الميدان (Concours - الوثب والرمي)</span>
                  </h3>
                  <span className="text-xs font-mono text-emerald-700 font-bold">
                    {liveSchedule.tableConcours.jumps.length + liveSchedule.tableConcours.throws.length} مسابقات
                  </span>
                </div>

                {/* Jumps with Reordering */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                    <span>مسابقات القفز والوثب (طويل، ثلاثي، عالي، بالزانة):</span>
                    <span className="text-[11px] text-[var(--ink-3,#7C7C77)]">إمكانية الترتيب بالأزرار</span>
                  </div>
                  {liveSchedule.tableConcours.jumps.length === 0 ? (
                    <div className="p-4 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] text-center text-xs text-[var(--ink-2,#4A4A47)]">
                      لم يتم اختيار مسابقات وثب بعد.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-[var(--radius-sm,2px)] border border-[var(--border,#DADAD6)]">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-emerald-50 text-emerald-900 font-bold border-b border-[var(--border,#DADAD6)] text-[11px]">
                          <tr>
                            <th className="py-2.5 px-2 text-center w-12">ترتيب</th>
                            <th className="py-2.5 px-3">التوقيت</th>
                            <th className="py-2.5 px-3">المسابقة</th>
                            <th className="py-2.5 px-3">الفئة</th>
                            <th className="py-2.5 px-3">المرحلة</th>
                            <th className="py-2.5 px-3">الميدان</th>
                            <th className="py-2.5 px-3 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border,#DADAD6)]">
                          {liveSchedule.tableConcours.jumps.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-[var(--surface-alt,#F3F3F1)] transition">
                              <td className="py-2 px-1 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    disabled={idx === 0}
                                    onClick={() => handleMoveScheduleItem('jumps', idx, 'up')}
                                    className="p-1 rounded hover:bg-slate-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="تقديم الترتيب للأعلى"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={idx === liveSchedule.tableConcours.jumps.length - 1}
                                    onClick={() => handleMoveScheduleItem('jumps', idx, 'down')}
                                    className="p-1 rounded hover:bg-slate-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="تأخير الترتيب للأسفل"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-[var(--accent,#E5321B)]">
                                {item.time} (يوم {item.dayIndex})
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[var(--ink,#0A0A0A)]">
                                {item.disciplineNameAr}
                              </td>
                              <td className="py-2.5 px-3 text-emerald-800 font-bold">
                                {item.categoryNameAr}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--ink-2,#4A4A47)]">
                                <span className="px-2 py-0.5 rounded-[var(--radius-sm,2px)] bg-slate-100 border border-[var(--border,#DADAD6)] font-bold text-[10px]">
                                  {item.roundLabelAr}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-[var(--ink-3,#7C7C77)]">
                                {disciplineTimings[item.disciplineId]?.venueLocation || 'حفرة الوثب'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => toggleDiscipline(item.disciplineId)}
                                  className="p-1 rounded-[var(--radius-sm,2px)] text-[var(--ink-3,#7C7C77)] hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="حذف من البرنامج"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Throws with Reordering */}
                <div className="space-y-2 pt-2 border-t border-[var(--border,#DADAD6)]">
                  <div className="text-xs font-bold text-purple-800 flex items-center justify-between">
                    <span>مسابقات الرمي (جلة، قرص، رمح، مطرقة):</span>
                    <span className="text-[11px] text-[var(--ink-3,#7C7C77)]">إمكانية الترتيب بالأزرار</span>
                  </div>
                  {liveSchedule.tableConcours.throws.length === 0 ? (
                    <div className="p-4 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] text-center text-xs text-[var(--ink-2,#4A4A47)]">
                      لم يتم اختيار مسابقات رمي بعد.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-[var(--radius-sm,2px)] border border-[var(--border,#DADAD6)]">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-purple-50 text-purple-900 font-bold border-b border-[var(--border,#DADAD6)] text-[11px]">
                          <tr>
                            <th className="py-2.5 px-2 text-center w-12">ترتيب</th>
                            <th className="py-2.5 px-3">التوقيت</th>
                            <th className="py-2.5 px-3">مسابقة الرمي</th>
                            <th className="py-2.5 px-3">الفئة</th>
                            <th className="py-2.5 px-3">المرحلة</th>
                            <th className="py-2.5 px-3">الميدان</th>
                            <th className="py-2.5 px-3 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border,#DADAD6)]">
                          {liveSchedule.tableConcours.throws.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-[var(--surface-alt,#F3F3F1)] transition">
                              <td className="py-2 px-1 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    disabled={idx === 0}
                                    onClick={() => handleMoveScheduleItem('throws', idx, 'up')}
                                    className="p-1 rounded hover:bg-slate-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="تقديم الترتيب للأعلى"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={idx === liveSchedule.tableConcours.throws.length - 1}
                                    onClick={() => handleMoveScheduleItem('throws', idx, 'down')}
                                    className="p-1 rounded hover:bg-slate-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="تأخير الترتيب للأسفل"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-[var(--accent,#E5321B)]">
                                {item.time} (يوم {item.dayIndex})
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[var(--ink,#0A0A0A)]">
                                {item.disciplineNameAr}
                              </td>
                              <td className="py-2.5 px-3 text-purple-800 font-bold">
                                {item.categoryNameAr}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--ink-2,#4A4A47)]">
                                <span className="px-2 py-0.5 rounded-[var(--radius-sm,2px)] bg-slate-100 border border-[var(--border,#DADAD6)] font-bold text-[10px]">
                                  {item.roundLabelAr}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-[var(--ink-3,#7C7C77)]">
                                {disciplineTimings[item.disciplineId]?.venueLocation || 'ميدان الرمي'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => toggleDiscipline(item.disciplineId)}
                                  className="p-1 rounded-[var(--radius-sm,2px)] text-[var(--ink-3,#7C7C77)] hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="حذف من البرنامج"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ TABLE 3: COMBINED EVENTS (المسابقات المركبة) ═══ */}
              {liveSchedule.tableCombined.length > 0 && (
                <div className="p-6 rounded-[var(--radius-lg,6px)] bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)] shadow-[var(--shadow-2,0_2px_0_rgba(10,10,10,.12))] space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border,#DADAD6)] pb-3">
                    <h3 className="text-base font-black text-[var(--ink,#0A0A0A)] flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-700" />
                      <span>3. المسابقات المركبة (Combined Events)</span>
                    </h3>
                    <span className="text-xs font-mono text-indigo-700 font-bold">
                      {liveSchedule.tableCombined.length} مسابقات
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-[var(--radius-sm,2px)] border border-[var(--border,#DADAD6)]">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-indigo-50 text-indigo-900 font-bold border-b border-[var(--border,#DADAD6)] text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">التوقيت</th>
                          <th className="py-2.5 px-3">المسابقة المركبة</th>
                          <th className="py-2.5 px-3">الفئة</th>
                          <th className="py-2.5 px-3">المرحلة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border,#DADAD6)]">
                        {liveSchedule.tableCombined.map((item) => (
                          <tr key={item.id} className="hover:bg-[var(--surface-alt,#F3F3F1)] transition">
                            <td className="py-2.5 px-3 font-mono font-black text-[var(--accent,#E5321B)]">
                              {item.time} (يوم {item.dayIndex})
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[var(--ink,#0A0A0A)]">
                              {item.disciplineNameAr}
                            </td>
                            <td className="py-2.5 px-3 text-indigo-800 font-bold">
                              {item.categoryNameAr}
                            </td>
                            <td className="py-2.5 px-3 text-[var(--ink-2,#4A4A47)]">
                              {item.roundLabelAr}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          }
        />

      </div>
    </div>
  );
};
