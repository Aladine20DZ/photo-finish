/**
 * PHOTO FINISH PRO AI — League Executive Suite & Master Administration (Stage 5)
 * Upgraded to Track Pro Design System & Phase C Centralized Bureau Architecture:
 * 1. لوحة القيادة (overview): إحصائيات، رسوم بيانية تفاعلية، أحدث النتائج المعتمدة، وصول سريع لكافة المكاتب.
 * 2. التظاهرات والمنافسات (competitions): دليل منافسات الرابطة مع إمكانية الإنشاء والربط بمكتبي التخطيط والمنافسات.
 * 3. مكتب التخطيط (برنامج المنافسة) (planning) ← مدمج كلياً داخل حساب الرابطة.
 * 4. مكتب المنافسات (عمليات الحكام والنتائج) (competitions-bureau) ← مدمج كلياً داخل حساب الرابطة.
 * 5. الأندية والعداؤون (clubs_athletes): إدارة الفئات العمرية U14 إلى Masters، واستيراد وتصدير Excel.
 * 6. الحكام والتعيينات (judges): توليد أكواد التكليف الميداني الرسمية وتعيين الأدوار.
 * 7. النتائج والمحاضر والتقارير (reports): محضر رسمي لكل اختصاص مع التصدير الموحد (PDF / Word / Excel).
 * 8. الإعدادات والهوية والأرشيف (identity): ترويسة الرابطة والشعار، حماية وأرشفة الرابطات التجريبية والنسخ الاحتياطي.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Shield,
  Users,
  Award,
  Building2,
  Key,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
  FileText,
  Plus,
  Copy,
  Check,
  Search,
  Bell,
  History,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  Upload,
  Activity,
  LogOut,
  Settings,
  Calendar,
  Archive,
  Download,
  MapPin,
  Flame,
  CheckSquare,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { portalAuthService, RegisteredLeague, PortalSession } from '../../services/portalAuthService';
import { competitionsService, NationalCompetition } from '../../services/competitionsService';
import { unifiedExportService, UnifiedExportPayload } from '../../services/unifiedExportService';
import { PlanningBureauWorkspace } from '../planning/PlanningBureauWorkspace';
import { CompetitionsBureauWorkspace } from '../competitions/CompetitionsBureauWorkspace';
import { JudgesManagementOffice } from '../judges/JudgesManagementOffice';
import { StatsCard } from '../design-system/StatsCard';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Input } from '../design-system/Input';
import { Modal } from '../design-system/Modal';
import * as XLSX from 'xlsx';

export type LeagueSubTab = 
  | 'overview' 
  | 'competitions'
  | 'planning'
  | 'competitions-bureau'
  | 'clubs_athletes' 
  | 'judges' 
  | 'reports' 
  | 'identity'
  | 'records' 
  | 'announcements' 
  | 'roles_audit';

export interface LeagueExecutiveSuiteProps {
  leagueId?: string;
  leagueName?: string;
  initialSubTab?: LeagueSubTab;
  onOpenFieldMode?: () => void;
  onOpenSheets?: () => void;
  onSwitchPortal?: () => void;
}

interface ClubItem {
  id: string;
  name: string;
  code: string;
  city: string;
  athletesCount: number;
  coachName: string;
  coachPhone: string;
  status: 'active' | 'pending';
}

interface AthleteItem {
  id: string;
  name: string;
  bibNumber: number;
  clubCode: string;
  clubName: string;
  category: 'U14' | 'U16' | 'U18' | 'U20' | 'SENIOR' | 'MASTER';
  gender: 'M' | 'F';
  discipline: string;
  licenseNumber: string;
}

interface JudgeItem {
  id: string;
  name: string;
  roleTitle: string;
  roleCode: 'CHIEF' | 'FINISH' | 'START' | 'LANE' | 'FIELD' | 'CALL';
  dutyCode: string;
  assignedCompetition: string;
  assignedDiscipline: string;
  phone: string;
  status: 'active' | 'standby';
  deviceId?: string;
  deviceStatus?: 'connected' | 'offline' | 'purged';
  lastPurgedAt?: string;
}

interface RegionalRecordItem {
  id: string;
  athleteName: string;
  clubName: string;
  discipline: string;
  category: string;
  mark: string;
  windSpeed: number;
  date: string;
  status: 'certified' | 'pending' | 'rejected';
}

interface AnnouncementItem {
  id: string;
  title: string;
  date: string;
  urgency: 'normal' | 'urgent';
  target: 'all' | 'coaches' | 'judges';
  content: string;
}

interface LeagueRoleOfficer {
  id: string;
  title: string;
  fullName: string;
  email: string;
  phone: string;
  permissions: string[];
}

export const LeagueExecutiveSuite: React.FC<LeagueExecutiveSuiteProps> = ({
  leagueId: propLeagueId,
  leagueName: propLeagueName,
  initialSubTab,
  onOpenFieldMode,
  onOpenSheets,
  onSwitchPortal
}) => {
  // ── Active Session & League Resolution ────────────────────────────────────
  const [session, setSession] = useState<PortalSession | null>(() => portalAuthService.getSession('league'));
  const activeLeagueId = propLeagueId || session?.leagueId || 'lg_saida';
  
  const [currentLeague, setCurrentLeague] = useState<RegisteredLeague>(() => {
    return portalAuthService.getLeagueById(activeLeagueId, true) || {
      id: activeLeagueId,
      name: propLeagueName || session?.leagueName || 'رابطة ألعاب القوى سعيدة (LWAS)',
      shortName: session?.leagueShort || 'LWAS',
      type: 'wilaya',
      region: 'ولاية سعيدة • المستوى الولائي',
      wilaya: 'سعيدة',
      logoCode: '🏃',
      accreditationNumber: 'LAAP-SAD-2026-020',
      officialEmail: 'saida@athletic.dz',
      phone: '+213 65 00 00 20',
      adminFullName: 'مشرف الرابطة الولائية',
      adminUsername: 'saida_admin',
      adminPassword: '',
      createdAt: '2026-01-01',
      isActive: true,
      is_demo: false,
      archived_at: null
    };
  });

  const [activeTab, setActiveTab] = useState<LeagueSubTab>(() => initialSubTab || 'overview');
  const [selectedPlanningCompId, setSelectedPlanningCompId] = useState<string | undefined>(undefined);
  const [selectedBureauCompId, setSelectedBureauCompId] = useState<string | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync initialSubTab if changed externally
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // ── 1. CLUBS & ATHLETES STATE ─────────────────────────────────────────────
  const [clubs, setClubs] = useState<ClubItem[]>([
    { id: 'cl_1', name: 'نادي أولمبيك سعيدة', code: 'OSA', city: 'سعيدة', athletesCount: 64, coachName: 'سعيد بلخير', coachPhone: '0550112233', status: 'active' },
    { id: 'cl_2', name: 'أمل شباب سعيدة', code: 'MCS', city: 'سعيدة', athletesCount: 42, coachName: 'عمر بوعزة', coachPhone: '0661223344', status: 'active' },
    { id: 'cl_3', name: 'وداد عين الحجر لألعاب القوى', code: 'WAH', city: 'عين الحجر', athletesCount: 28, coachName: 'كمال يوسفي', coachPhone: '0770334455', status: 'active' },
    { id: 'cl_4', name: 'وفاق يوب الرياضي', code: 'WYR', city: 'يوب', athletesCount: 22, coachName: 'حميد مزيان', coachPhone: '0555445566', status: 'pending' }
  ]);

  const [athletes, setAthletes] = useState<AthleteItem[]>([
    { id: 'ath_1', name: 'عبد الله بن عودة', bibNumber: 104, clubCode: 'OSA', clubName: 'نادي أولمبيك سعيدة', category: 'SENIOR', gender: 'M', discipline: '100م / 200م', licenseNumber: 'LAAP-26-001' },
    { id: 'ath_2', name: 'نور الهدى قاضي', bibNumber: 105, clubCode: 'OSA', clubName: 'نادي أولمبيك سعيدة', category: 'U20', gender: 'F', discipline: '800م', licenseNumber: 'LAAP-26-002' },
    { id: 'ath_3', name: 'ياسين زروق', bibNumber: 108, clubCode: 'MCS', clubName: 'أمل شباب سعيدة', category: 'U18', gender: 'M', discipline: 'رمي الرمح', licenseNumber: 'LAAP-26-003' },
    { id: 'ath_4', name: 'إسلام صحراوي', bibNumber: 112, clubCode: 'WAH', clubName: 'وداد عين الحجر', category: 'U16', gender: 'M', discipline: 'الوثب الطويل', licenseNumber: 'LAAP-26-004' },
    { id: 'ath_5', name: 'سارة بوحنيكة', bibNumber: 115, clubCode: 'MCS', clubName: 'أمل شباب سعيدة', category: 'U14', gender: 'F', discipline: '1000م عدو', licenseNumber: 'LAAP-26-005' },
    { id: 'ath_6', name: 'حمزة عماري', bibNumber: 120, clubCode: 'OSA', clubName: 'نادي أولمبيك سعيدة', category: 'MASTER', gender: 'M', discipline: '5000م مستوية', licenseNumber: 'LAAP-26-006' }
  ]);

  const [athleteCategoryFilter, setAthleteCategoryFilter] = useState<string>('all');
  const [athleteSearchQuery, setAthleteSearchQuery] = useState<string>('');

  // ── 2. JUDGES & DUTY CODES STATE ──────────────────────────────────────────
  const [judges, setJudges] = useState<JudgeItem[]>([
    { id: 'jd_1', name: 'مصطفى قاسم', roleTitle: 'الحكم العام للمنافسة (Chief Judge)', roleCode: 'CHIEF', dutyCode: 'CHIEF-SAIDA-ZQ88', assignedCompetition: 'البطولة الولائية لألعاب القوى 2026', assignedDiscipline: 'كافة التخصصات', phone: '0555123456', status: 'active', deviceId: 'DEV-CHIEF-01', deviceStatus: 'connected' },
    { id: 'jd_2', name: 'سفيان بن عيسى', roleTitle: 'كاميرا خط النهاية (Photo Finish)', roleCode: 'FINISH', dutyCode: 'FINISH-SAIDA-PF92', assignedCompetition: 'البطولة الولائية لألعاب القوى 2026', assignedDiscipline: 'سباقات 100م و 400م', phone: '0661987654', status: 'active', deviceId: 'DEV-FINISH-02', deviceStatus: 'connected' },
    { id: 'jd_3', name: 'محمد بوشيخي', roleTitle: 'مسدس الانطلاق (Starter Gun)', roleCode: 'START', dutyCode: 'START-SAIDA-ST01', assignedCompetition: 'البطولة الولائية لألعاب القوى 2026', assignedDiscipline: 'المضمار الرئيسي', phone: '0770554433', status: 'active', deviceId: 'DEV-START-03', deviceStatus: 'connected' },
    { id: 'jd_4', name: 'جمال بوكنزة', roleTitle: 'حكم مسابقات الميدان (Field Events)', roleCode: 'FIELD', dutyCode: 'FIELD-SAIDA-FD33', assignedCompetition: 'البطولة الولائية لألعاب القوى 2026', assignedDiscipline: 'الوثب الطويل ودفع الجلة', phone: '0551778899', status: 'active', deviceId: 'DEV-FIELD-04', deviceStatus: 'connected' },
    { id: 'jd_5', name: 'عمر دحماني', roleTitle: 'غرفة النداء والتجهيز (Call Room)', roleCode: 'CALL', dutyCode: 'CALL-SAIDA-CR14', assignedCompetition: 'البطولة الولائية لألعاب القوى 2026', assignedDiscipline: 'تسليم الصدريات والمسامير', phone: '0662334411', status: 'standby', deviceId: 'DEV-CALL-05', deviceStatus: 'offline' }
  ]);

  // ── 3. REGIONAL RECORDS & TR31 STATE ──────────────────────────────────────
  const [records, setRecords] = useState<RegionalRecordItem[]>([
    { id: 'rec_1', athleteName: 'معتز برشم (OSA)', clubName: 'نادي أولمبيك سعيدة', discipline: '100م رجال', category: 'أكابر', mark: '10.22s', windSpeed: 1.2, date: '2026-06-25', status: 'certified' },
    { id: 'rec_2', athleteName: 'نور الهدى قاضي', clubName: 'نادي أولمبيك سعيدة', discipline: '800م إناث', category: 'أواسط', mark: '2:04.15', windSpeed: 0.0, date: '2026-06-25', status: 'certified' },
    { id: 'rec_3', athleteName: 'ياسين زروق', clubName: 'أمل شباب سعيدة', discipline: 'رمي الرمح (700غ)', category: 'أشبال', mark: '64.50m', windSpeed: 0.0, date: '2026-07-02', status: 'pending' },
    { id: 'rec_4', athleteName: 'حميد بوحجر', clubName: 'وداد عين الحجر', discipline: '200م رجال', category: 'أكابر', mark: '20.90s', windSpeed: 2.8, date: '2026-07-05', status: 'rejected' }
  ]);

  // ── 4. IDENTITY FORM STATE (Phase H Branding: Logo, Name, Signature, Stamp) ──
  const [identityForm, setIdentityForm] = useState({
    name: currentLeague.name,
    shortName: currentLeague.shortName,
    region: currentLeague.region || 'ولاية سعيدة • المستوى الولائي',
    accreditationNumber: currentLeague.accreditationNumber,
    officialEmail: currentLeague.officialEmail,
    phone: currentLeague.phone,
    logoUrl: currentLeague.logoUrl || '',
    logoCode: currentLeague.logoCode || '🏃',
    stampUrl: currentLeague.stampUrl || '',
    signatureUrl: currentLeague.signatureUrl || '',
    presidentName: currentLeague.presidentName || 'رئيس الرابطة الولائية',
    secretaryName: currentLeague.secretaryName || 'الأمين العام للرابطة'
  });

  // ── 5. ANNOUNCEMENTS STATE ────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([
    { id: 'ann_1', title: 'افتتاح التسجيلات للبطولة الولائية الصيفية لألعاب القوى 2026', date: '2026-06-01', urgency: 'urgent', target: 'all', content: 'تعلم الرابطة كافة الأندية المنتسبة بضرورة تأكيد قوائم العدائين ودفع الإجازات قبل تاريخ 20 جوان 2026.' },
    { id: 'ann_2', title: 'ملتقى تكويني للحكام حول تقنيات Photo Finish والتوقيت الإلكتروني', date: '2026-05-15', urgency: 'normal', target: 'judges', content: 'سينعقد ملتقى تكويني بمقر الرابطة حول نظام المسح الشريطي وأكواد التكليف الميداني المعتمدة.' },
    { id: 'ann_3', title: 'الروزنامة الفيدرالية للبطولات الوطنية والتأهيلية 2026', date: '2026-05-02', urgency: 'normal', target: 'coaches', content: 'نشر معايير المشاركة والأزمنة التأهيلية لبطولة الجزائر لألعاب القوى بالمركب الأولمبي 5 جويلية.' }
  ]);

  // ── 6. OFFICERS & AUDIT LOG STATE (Phase H 4 Official Roles) ──────────────
  const [officers, setOfficers] = useState<LeagueRoleOfficer[]>([
    { id: 'off_1', title: 'رئيس الرابطة الولائية', fullName: 'أحمد بن علي', email: 'president@saida-athletic.dz', phone: '0550000001', permissions: ['ALL', 'SANCTION', 'CERTIFY', 'ACCREDIT'] },
    { id: 'off_2', title: 'الأمين العام للرابطة', fullName: 'بلقاسم مرزوقي', email: 'secretary@saida-athletic.dz', phone: '0550000002', permissions: ['CLUBS', 'ATHLETES', 'ANNOUNCEMENTS'] },
    { id: 'off_3', title: 'المدير الفني الولائي (DTO/DTS)', fullName: 'رشيد بودراع', email: 'dts@saida-athletic.dz', phone: '0550000003', permissions: ['COMPETITIONS', 'RECORDS_TR31', 'JUDGES'] },
    { id: 'off_4', title: 'مسؤول الاختصاص ولجنة التحكيم', fullName: 'سفيان بن عيسى', email: 'referees@saida-athletic.dz', phone: '0550000004', permissions: ['JUDGES', 'DUTY_CODES', 'JURY_APPEALS'] }
  ]);

  const [editingOfficer, setEditingOfficer] = useState<LeagueRoleOfficer | null>(null);

  const [auditLogs, setAuditLogs] = useState<{ id: string; user: string; action: string; time: string; details: string }[]>([
    { id: 'al_1', user: 'أحمد بن علي (الرئيس)', action: 'اعتماد رقم قياسي TR31', time: 'منذ 15 دقيقة', details: 'اعتماد رقم 10.22s لمعتز برشم (رياح +1.2 m/s)' },
    { id: 'al_2', user: 'بلقاسم مرزوقي (الأمين العام)', action: 'تعديل هوية الرابطة', time: 'منذ ساعتين', details: 'تحديث بيانات الاعتماد والبريد الرسمي والختم المعتمد' },
    { id: 'al_3', user: 'رشيد بودراع (DTS)', action: 'إصدار أكواد تكليف الحكام', time: 'اليوم 09:30', details: 'توليد 5 أكواد تكليف ميداني لبطولة الولاية' },
    { id: 'al_4', user: 'سفيان بن عيسى (مسؤول الاختصاص)', action: 'مراجعة شريط الفوتو فينيش', time: 'اليوم 08:45', details: 'التحقق من وصول سباق 100م نهائي أكابر' }
  ]);

  // ── Excel Import State (Phase H) ──────────────────────────────────────────
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [excelParsedAthletes, setExcelParsedAthletes] = useState<AthleteItem[]>([]);
  const [excelParseErrors, setExcelParseErrors] = useState<string[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>('');

  // ── 7. LEAGUE COMPETITIONS DIRECTORY STATE ────────────────────────────────
  const [leagueCompetitions, setLeagueCompetitions] = useState<NationalCompetition[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState<boolean>(true);
  const [compStatusFilter, setCompStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    let mounted = true;
    competitionsService.getCompetitions().then(all => {
      if (mounted) {
        // Filter competitions for this league or show available national ones
        const forThisLeague = all.filter(c => c.leagueId === activeLeagueId || c.leagueShort === currentLeague.shortName);
        setLeagueCompetitions(forThisLeague.length > 0 ? forThisLeague : all.slice(0, 5));
        setCompetitionsLoading(false);
      }
    }).catch(() => {
      if (mounted) setCompetitionsLoading(false);
    });
    return () => { mounted = false; };
  }, [activeLeagueId, currentLeague.shortName]);

  // ── Modals State ──────────────────────────────────────────────────────────
  const [showAddClubModal, setShowAddClubModal] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubCode, setNewClubCode] = useState('');
  const [newClubCity, setNewClubCity] = useState('سعيدة');
  const [newClubCoach, setNewClubCoach] = useState('');
  const [newClubPhone, setNewClubPhone] = useState('');

  const [showAddJudgeModal, setShowAddJudgeModal] = useState(false);
  const [newJudgeName, setNewJudgeName] = useState('');
  const [newJudgeRole, setNewJudgeRole] = useState<'CHIEF' | 'FINISH' | 'START' | 'LANE' | 'FIELD' | 'CALL'>('FINISH');
  const [newJudgeComp, setNewJudgeComp] = useState('البطولة الولائية لألعاب القوى 2026');
  const [newJudgeDisc, setNewJudgeDisc] = useState('100م نهائي كبار');

  const [showNewAnnModal, setShowNewAnnModal] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnTarget, setNewAnnTarget] = useState<'all' | 'coaches' | 'judges'>('all');
  const [newAnnUrgent, setNewAnnUrgent] = useState(false);
  const [newAnnContent, setNewAnnContent] = useState('');

  // ── Feedback Toast Helper ─────────────────────────────────────────────────
  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // ── Filtered Athletes ─────────────────────────────────────────────────────
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      const matchCat = athleteCategoryFilter === 'all' || a.category === athleteCategoryFilter;
      const matchQuery = !athleteSearchQuery.trim() || 
        a.name.toLowerCase().includes(athleteSearchQuery.toLowerCase()) ||
        a.clubName.toLowerCase().includes(athleteSearchQuery.toLowerCase()) ||
        String(a.bibNumber).includes(athleteSearchQuery);
      return matchCat && matchQuery;
    });
  }, [athletes, athleteCategoryFilter, athleteSearchQuery]);

  // ── Filtered Competitions ─────────────────────────────────────────────────
  const filteredCompetitions = useMemo(() => {
    if (compStatusFilter === 'all') return leagueCompetitions;
    return leagueCompetitions.filter(c => c.status === compStatusFilter);
  }, [leagueCompetitions, compStatusFilter]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    notify(`تم نسخ كود التكليف: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleBackupLeagues = () => {
    const key = portalAuthService.backupLeagues();
    notify(`تم إنشاء نسخة احتياطية آمنة في التخزين المحلي (${key})`);
  };

  const handleArchiveCurrentLeague = () => {
    const success = portalAuthService.archiveLeague(currentLeague.id);
    if (success) {
      setCurrentLeague(prev => ({ ...prev, archived_at: new Date().toISOString() }));
      notify('تم أرشفة الرابطة وحجبها عن القوائم العامة بنجاح.');
    } else {
      notify('تعذر أرشفة الرابطة', 'error');
    }
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = portalAuthService.updateLeagueProfile(currentLeague.id, {
      name: identityForm.name,
      shortName: identityForm.shortName,
      region: identityForm.region,
      accreditationNumber: identityForm.accreditationNumber,
      officialEmail: identityForm.officialEmail,
      phone: identityForm.phone,
      logoUrl: identityForm.logoUrl,
      logoCode: identityForm.logoCode,
      stampUrl: identityForm.stampUrl,
      signatureUrl: identityForm.signatureUrl,
      presidentName: identityForm.presidentName,
      secretaryName: identityForm.secretaryName
    });

    if (updated) {
      setCurrentLeague(updated);
      setAuditLogs(prev => [
        {
          id: `al_${Date.now()}`,
          user: session?.username || 'مشرف الرابطة',
          action: 'تحديث هوية الرابطة والترويسة',
          time: 'الآن',
          details: `تم تحديث هوية الرابطة "${identityForm.name}"، والشعار والختم والتوقيع المعتمد.`
        },
        ...prev
      ]);
      notify('تم حفظ وتحديث هوية الرابطة والترويسة الرسمية الموحدة بنجاح!');
    } else {
      notify('تعذر تحديث بيانات الرابطة', 'error');
    }
  };

  // ── Excel Import Handlers (Phase H) ──────────────────────────────────────
  const handleDownloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const aoa = [
      ['اسم العداء واللقب', 'رقم الإجازة الفيدرالية', 'اسم النادي', 'رمز النادي', 'الصنف العمرية', 'الجنس (M/F)', 'التخصص الرئيسي', 'رقم الصدرية'],
      ['يوسف العبدلي', 'LAAP-2026-1001', 'نادي أولمبيك سعيدة', 'OSA', 'SENIOR', 'M', '100 متر', 101],
      ['إكرام بوعلام', 'LAAP-2026-2004', 'وفاق سعيدة لألعاب القوى', 'WSA', 'U20', 'F', '400 متر', 205],
      ['حمزة قاسم', 'LAAP-2026-3012', 'مولودية سعيدة', 'MCS', 'U18', 'M', 'الوثب الطويل', 312],
      ['فاطمة مباركي', 'LAAP-2026-4019', 'نادي أولمبيك سعيدة', 'OSA', 'U16', 'F', 'رمي الجلة', 408]
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!views'] = [{ RTL: true }];
    ws['!cols'] = [
      { wch: 22 },
      { wch: 18 },
      { wch: 24 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'العداؤون المسجلون');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نموذج_استيراد_عدائي_${currentLeague.shortName || 'الرابطة'}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('تم تنزيل نموذج إكسل الرسمي بنجاح!');
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelImportLoading(true);
    setExcelParseErrors([]);
    setExcelParsedAthletes([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          setExcelParseErrors(['الملف فارغ أو لا يحتوي على صفوف بيانات صالحة.']);
          setExcelImportLoading(false);
          return;
        }

        const validCategories = ['U14', 'U16', 'U18', 'U20', 'SENIOR', 'MASTER'];
        const parsedList: AthleteItem[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          const name = String(row['اسم العداء واللقب'] || row['اسم العداء'] || row['الاسم واللقب'] || row['الاسم'] || row['Nom'] || row['Name'] || '').trim();
          if (!name) {
            errors.push(`الصف ${rowNum}: اسم العداء غير موجود`);
            return;
          }

          const license = String(row['رقم الإجازة الفيدرالية'] || row['رقم الإجازة'] || row['الإجازة'] || row['Licence'] || row['License'] || `LAAP-2026-${1000 + idx}`).trim();
          const clubName = String(row['اسم النادي'] || row['النادي'] || row['Club'] || 'نادي مستقل').trim();
          const clubCode = String(row['رمز النادي'] || row['الكود'] || row['Code'] || clubName.slice(0, 3)).trim().toUpperCase();

          let catRaw = String(row['الصنف العمرية'] || row['الصنف'] || row['الفئة'] || row['Catégorie'] || row['Category'] || 'SENIOR').trim().toUpperCase();
          if (catRaw.includes('14') || catRaw.includes('براعم')) catRaw = 'U14';
          else if (catRaw.includes('16') || catRaw.includes('أصاغر')) catRaw = 'U16';
          else if (catRaw.includes('18') || catRaw.includes('أشبال')) catRaw = 'U18';
          else if (catRaw.includes('20') || catRaw.includes('أواسط')) catRaw = 'U20';
          else if (catRaw.includes('MASTER') || catRaw.includes('قدماء') || catRaw.includes('35')) catRaw = 'MASTER';
          else catRaw = 'SENIOR';

          const category = validCategories.includes(catRaw) ? (catRaw as AthleteItem['category']) : 'SENIOR';

          let genderRaw = String(row['الجنس (M/F)'] || row['الجنس'] || row['Genre'] || row['Sexe'] || 'M').trim().toUpperCase();
          const gender: 'M' | 'F' = (genderRaw.startsWith('F') || genderRaw.includes('أنثى') || genderRaw.includes('سيدات')) ? 'F' : 'M';

          const discipline = String(row['التخصص الرئيسي'] || row['التخصص'] || row['الاختصاص'] || row['Discipline'] || '100م').trim();
          const rawBib = row['رقم الصدرية'] || row['الصدرية'] || row['Dossard'] || row['Bib'];
          const bibNumber = typeof rawBib === 'number' ? rawBib : parseInt(String(rawBib || ''), 10) || (100 + idx);

          parsedList.push({
            id: `ath_imp_${Date.now()}_${idx}`,
            name,
            bibNumber,
            clubCode,
            clubName,
            category,
            gender,
            discipline,
            licenseNumber: license
          });
        });

        setExcelParsedAthletes(parsedList);
        setExcelParseErrors(errors);
      } catch (err: any) {
        setExcelParseErrors([`خطأ في قراءة ملف الإكسل: ${err?.message || 'تنسيق غير مدعوم'}`]);
      } finally {
        setExcelImportLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmExcelImport = () => {
    if (excelParsedAthletes.length === 0) return;

    const newClubsMap = new Map<string, ClubItem>();
    excelParsedAthletes.forEach(a => {
      if (!clubs.some(c => c.code === a.clubCode) && !newClubsMap.has(a.clubCode)) {
        newClubsMap.set(a.clubCode, {
          id: `cl_${Date.now()}_${a.clubCode}`,
          name: a.clubName,
          code: a.clubCode,
          city: currentLeague.wilaya || 'سعيدة',
          athletesCount: 1,
          coachName: 'مدرب معتمد',
          coachPhone: '0550000000',
          status: 'active'
        });
      }
    });

    const addedClubsCount = newClubsMap.size;
    if (addedClubsCount > 0) {
      setClubs(prev => [...Array.from(newClubsMap.values()), ...prev]);
    }

    setAthletes(prev => [...excelParsedAthletes, ...prev]);
    
    setAuditLogs(prev => [
      {
        id: `al_${Date.now()}`,
        user: session?.username || 'مشرف الرابطة',
        action: 'استيراد جماعي للعدائين (Excel)',
        time: 'الآن',
        details: `تم استيراد ${excelParsedAthletes.length} عداء بنجاح من ملف "${excelFileName}" (${addedClubsCount} أندية جديدة مضافة).`
      },
      ...prev
    ]);

    notify(`تم استيراد ${excelParsedAthletes.length} عداء بنجاح من ملف Excel!`);
    setShowExcelImportModal(false);
    setExcelParsedAthletes([]);
    setExcelFileName('');
  };

  const handleSaveOfficer = (updatedOfficer: LeagueRoleOfficer) => {
    setOfficers(prev => prev.map(o => o.id === updatedOfficer.id ? updatedOfficer : o));
    setAuditLogs(prev => [
      {
        id: `al_${Date.now()}`,
        user: session?.username || 'مشرف الرابطة',
        action: 'تعديل بيانات عضو مكتب الرابطة',
        time: 'الآن',
        details: `تم تحديث بيانات "${updatedOfficer.title}": ${updatedOfficer.fullName} (${updatedOfficer.phone}).`
      },
      ...prev
    ]);
    setEditingOfficer(null);
    notify(`تم تحديث بيانات "${updatedOfficer.title}" بنجاح.`);
  };

  const handleAddClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim() || !newClubCode.trim()) {
      notify('يرجى ملء اسم ورمز النادي', 'error');
      return;
    }
    const newClub: ClubItem = {
      id: `cl_${Date.now()}`,
      name: newClubName.trim(),
      code: newClubCode.trim().toUpperCase(),
      city: newClubCity.trim(),
      athletesCount: 0,
      coachName: newClubCoach.trim() || 'مدرب النادي',
      coachPhone: newClubPhone.trim() || '0550000000',
      status: 'active'
    };
    setClubs(prev => [newClub, ...prev]);
    setShowAddClubModal(false);
    setNewClubName('');
    setNewClubCode('');
    setNewClubCoach('');
    setNewClubPhone('');
    notify(`تم تسجيل نادي "${newClub.name}" (${newClub.code}) بنجاح`);
  };

  const handleAddJudge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudgeName.trim()) {
      notify('يرجى إدخال اسم الحكم', 'error');
      return;
    }
    const prefix = newJudgeRole;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dutyCode = `${prefix}-SAIDA-${randomSuffix}`;

    const roleTitles: Record<string, string> = {
      CHIEF: 'الحكم العام للمنافسة (Chief Judge)',
      FINISH: 'كاميرا خط النهاية (Photo Finish)',
      START: 'مسدس الانطلاق (Starter Gun)',
      LANE: 'حكم الأروقة والوصول (Lane Judge)',
      FIELD: 'حكم مسابقات الميدان (Field Events)',
      CALL: 'غرفة النداء والتجهيز (Call Room)'
    };

    const newJudge: JudgeItem = {
      id: `jd_${Date.now()}`,
      name: newJudgeName.trim(),
      roleTitle: roleTitles[newJudgeRole] || 'حكم معتمد',
      roleCode: newJudgeRole,
      dutyCode,
      assignedCompetition: newJudgeComp,
      assignedDiscipline: newJudgeDisc,
      phone: '0550000000',
      status: 'active',
      deviceId: `DEV-${newJudgeRole}-${Date.now().toString().slice(-4)}`,
      deviceStatus: 'connected'
    };

    setJudges(prev => [newJudge, ...prev]);
    setShowAddJudgeModal(false);
    setNewJudgeName('');
    notify(`تم تعيين الحكم "${newJudge.name}" بكود تكليف ميداني: ${dutyCode}`);
  };

  const handleCertifyRecord = (recId: string, approve: boolean) => {
    setRecords(prev => prev.map(r => {
      if (r.id !== recId) return r;
      if (approve) {
        if (r.windSpeed > 2.0 && (r.discipline.includes('100') || r.discipline.includes('200'))) {
          notify('مرفوض دولياً: سرعة الرياح المقاسة تتجاوز الحد القانوني (+2.0 m/s) وفق لائحة World Athletics TR31.', 'error');
          return { ...r, status: 'rejected' };
        }
        return { ...r, status: 'certified' };
      } else {
        return { ...r, status: 'rejected' };
      }
    }));

    notify(approve ? 'تم اعتماد الرقم القياسي وتوثيقه في السجل الولائي والجهوي!' : 'تم رفض اعتماد الرقم لمخالفة الشروط الفنية.');
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      notify('يرجى كتابة عنوان وتفاصيل الإعلان', 'error');
      return;
    }
    const newAnn: AnnouncementItem = {
      id: `ann_${Date.now()}`,
      title: newAnnTitle.trim(),
      date: new Date().toISOString().split('T')[0],
      urgency: newAnnUrgent ? 'urgent' : 'normal',
      target: newAnnTarget,
      content: newAnnContent.trim()
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    setShowNewAnnModal(false);
    setNewAnnTitle('');
    setNewAnnContent('');
    notify('تم نشر وتعميم البلاغ الرسمي بنجاح!');
  };

  const handleExportAnnualReport = (format: 'pdf' | 'word' | 'excel') => {
    const payload: UnifiedExportPayload = {
      header: {
        competitionName: 'التقرير السنوي وسجل الأنشطة والأرقام القياسية',
        date: new Date().toLocaleDateString('ar-DZ'),
        venue: 'مقر الرابطة الولائية لألعاب القوى',
        chiefJudgeName: currentLeague.presidentName || 'رئيس الرابطة',
        leagueName: currentLeague.name,
        leagueLogoUrl: currentLeague.logoUrl,
        leagueLogoCode: currentLeague.logoCode,
        accreditationNumber: currentLeague.accreditationNumber,
        disciplineName: 'سجل الأندية والرياضيين والأرقام المعتمدة',
        season: 'الموسم الرياضي 2026'
      },
      sections: [
        {
          disciplineId: 'clubs_list',
          disciplineNameAr: 'قائمة الأندية المنتسبة للرابطة',
          group: 'course',
          columns: [
            { header: 'رمز النادي', key: 'code', align: 'center', width: '80px' },
            { header: 'اسم النادي', key: 'name', align: 'right', width: '180px' },
            { header: 'البلدية / المقر', key: 'city', align: 'center', width: '110px' },
            { header: 'عدد الرياضيين', key: 'count', align: 'center', width: '100px' },
            { header: 'المدرب المشرف', key: 'coach', align: 'right', width: '140px' }
          ],
          rows: clubs.map(c => ({
            code: c.code,
            name: c.name,
            city: c.city,
            count: c.athletesCount,
            coach: c.coachName
          }))
        },
        {
          disciplineId: 'records_list',
          disciplineNameAr: 'سجل الأرقام القياسية المعتمدة (World Athletics TR31)',
          group: 'course',
          columns: [
            { header: 'العداء والنادي', key: 'athlete', align: 'right', width: '180px' },
            { header: 'التخصص', key: 'disc', align: 'right', width: '130px' },
            { header: 'الفئة', key: 'cat', align: 'center', width: '90px' },
            { header: 'الرقم المسجل', key: 'mark', align: 'center', width: '90px' },
            { header: 'الرياح', key: 'wind', align: 'center', width: '80px' },
            { header: 'الحالة الرسمية', key: 'status', align: 'center', width: '100px' }
          ],
          rows: records.map(r => ({
            athlete: `${r.athleteName} (${r.clubName})`,
            disc: r.discipline,
            cat: r.category,
            mark: r.mark,
            wind: `${r.windSpeed >= 0 ? '+' : ''}${r.windSpeed} m/s`,
            status: r.status === 'certified' ? 'معتمد رسمياً' : r.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'
          }))
        }
      ]
    };

    if (format === 'pdf') unifiedExportService.exportToPdf(payload);
    else if (format === 'word') unifiedExportService.exportToWord(payload);
    else if (format === 'excel') unifiedExportService.exportToExcel(payload);

    notify(`تم توليد وتصدير التقرير الرسمي بصيغة ${format.toUpperCase()}`);
  };

  // ── 8 Core Sub-Tabs Navigation List ───────────────────────────────────────
  const subTabsList: { id: LeagueSubTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'overview', label: 'لوحة القيادة', icon: Trophy },
    { id: 'competitions', label: 'التظاهرات والمنافسات', icon: Calendar, badge: String(leagueCompetitions.length) },
    { id: 'planning', label: 'مكتب التخطيط (البرنامج)', icon: CheckSquare, badge: 'مدمج' },
    { id: 'competitions-bureau', label: 'مكتب المنافسات (النتائج)', icon: Flame, badge: 'مدمج' },
    { id: 'clubs_athletes', label: 'الأندية والعداؤون', icon: Building2 },
    { id: 'judges', label: 'الحكام والتعيينات', icon: Award },
    { id: 'reports', label: 'المحاضر والتقارير', icon: Printer },
    { id: 'identity', label: 'الإعدادات والهوية والأرشيف', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg,#F4F6F9)] text-[var(--ink,#0F1B2D)] dark:bg-[var(--bg,#0B1220)] dark:text-[var(--ink,#E6EDF7)] p-4 sm:p-6 lg:p-8 relative" dir="rtl">
      
      {/* ── HEADER STRIP (Track Pro Solid High-Contrast Architecture) ───────── */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              {currentLeague.logoUrl ? (
                <img
                  src={currentLeague.logoUrl}
                  alt="شعار الرابطة"
                  className="w-14 h-14 rounded-2xl object-contain border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 p-1 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[var(--primary,#0B3A6F)] text-white font-black flex items-center justify-center text-3xl shadow">
                  {currentLeague.logoCode || '🏃'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--success,#15803D)]" />
                  <span className="text-xs font-black tracking-wider uppercase text-[var(--success,#15803D)]">
                    حساب الرابطة الولائية المعتمدة
                  </span>
                  {currentLeague.is_demo ? (
                    <Badge variant="warning" size="sm">تجريبية مؤرشفة</Badge>
                  ) : (
                    <Badge variant="info" size="sm">معتمدة رسمياً</Badge>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--ink,#0F1B2D)] dark:text-white mt-1">
                  {currentLeague.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                  <span>الاعتماد: <strong className="text-[var(--ink,#0F1B2D)] dark:text-white font-mono">{currentLeague.accreditationNumber}</strong></span>
                  <span>•</span>
                  <span>{currentLeague.region}</span>
                  <span>•</span>
                  <span className="text-[var(--primary,#0B3A6F)] dark:text-cyan-300 font-bold">{currentLeague.adminFullName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {onOpenFieldMode && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenFieldMode}
                  icon={<Activity className="w-4 h-4" />}
                  className="font-bold text-xs"
                >
                  دخول وضع التحكيم والميدان ⏱️
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab('identity')}
                icon={<Settings className="w-4 h-4" />}
                className="text-xs"
              >
                الإعدادات والهوية
              </Button>

              <button
                onClick={() => {
                  portalAuthService.logout('league');
                  setSession(null);
                  if (onSwitchPortal) onSwitchPortal();
                }}
                className="p-2 rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] text-[var(--ink-2,#51607A)] hover:text-[var(--danger,#B91C1C)] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feedback Alert Toast */}
          {feedbackMsg && (
            <div className={`mt-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200' 
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
            }`}>
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* ── 8 MODULES SUB-TABS NAVIGATION BAR ───────────────────────────── */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-4 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] no-scrollbar">
            {subTabsList.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[var(--primary,#0B3A6F)] text-white shadow-sm'
                      : 'bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] text-[var(--ink-2,#51607A)] hover:text-[var(--primary,#0B3A6F)] hover:bg-[var(--primary-soft,#E8F0FA)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[var(--ink-3,#8593A8)]'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-[var(--ink-2,#51607A)]'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── SUB-TAB CONTENTS ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ════════════════════════════════════════════════════════════════════
            1. TAB: OVERVIEW / DASHBOARD V2
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Top 5 Stats Cards (Phase H Dashboard: أندية، عداؤون، منافسات، حكام، عمليات بانتظار الاعتماد) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <StatsCard
                title="الأندية والجمعيات المنتسبة"
                value={clubs.length}
                change="+1 جديد هذا الموسم"
                isPositive={true}
                icon={Building2}
              />
              <StatsCard
                title="العداؤون المرخصون رسمياً"
                value={athletes.length}
                change="100% إجازات مفعلة"
                isPositive={true}
                icon={Users}
              />
              <StatsCard
                title="المنافسات المعتمدة 2026"
                value={leagueCompetitions.length || 6}
                change="روزنامة رسمية"
                isPositive={true}
                icon={Trophy}
              />
              <StatsCard
                title="حكام الميدان المعتمدون"
                value={judges.length}
                change="أكواد تكليف نشطة"
                isPositive={true}
                icon={Award}
              />
              <div 
                onClick={() => setActiveTab('competitions-bureau')}
                className="cursor-pointer transition hover:scale-[1.02]"
                title="انتقال لمكتب المنافسات لاعتماد العمليات"
              >
                <StatsCard
                  title="عمليات بانتظار الاعتماد"
                  value={3}
                  change="مراجعة المحاضر ←"
                  isPositive={false}
                  icon={Flame}
                />
              </div>
            </div>

            {/* Quick Centralized Bureaus Launcher (Phase C Highlights) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setActiveTab('planning')}
                className="p-5 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] hover:border-[var(--primary,#0B3A6F)] shadow-sm hover:shadow transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[var(--primary-soft,#E8F0FA)] text-[var(--primary,#0B3A6F)] flex items-center justify-center">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--ink,#0F1B2D)] dark:text-white">
                      مكتب التخطيط (برنامج المنافسة)
                    </h3>
                    <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                      تخطيط الجدول الزمني للمسابقات والفئات وتوزيع التصفيات
                    </p>
                  </div>
                </div>
                <Badge variant="info" size="sm">فتح المكتب ←</Badge>
              </div>

              <div 
                onClick={() => setActiveTab('competitions-bureau')}
                className="p-5 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] hover:border-[var(--accent,#E8590C)] shadow-sm hover:shadow transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft,#FDEEE5)] text-[var(--accent,#E8590C)] flex items-center justify-center">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--ink,#0F1B2D)] dark:text-white">
                      مكتب المنافسات (التحكيم والنتائج)
                    </h3>
                    <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                      متابعة عمليات الحكام الميدانية، المصادقة على النتائج والأرشيف
                    </p>
                  </div>
                </div>
                <Badge variant="accent" size="sm">فتح المكتب ←</Badge>
              </div>
            </div>

            {/* Quick Official Duty Codes Strip */}
            <div className="p-4 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[var(--accent,#E8590C)]" />
                  أكواد التكليف الميداني الرسمية للحكام:
                </span>
                <button
                  onClick={() => setActiveTab('judges')}
                  className="text-[11px] font-bold text-[var(--primary,#0B3A6F)] dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>إدارة كافة الحكام ({judges.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {judges.slice(0, 4).map((judge) => (
                  <div
                    key={judge.id}
                    className="p-3 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] text-[var(--ink-2,#51607A)] truncate">{judge.roleTitle}</div>
                      <div className="font-mono text-xs font-black text-[var(--primary,#0B3A6F)] dark:text-cyan-300 tracking-wider truncate">
                        {judge.dutyCode}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(judge.dutyCode)}
                      className="p-1.5 rounded-lg bg-[var(--surface,#FFFFFF)] dark:bg-slate-800 text-[var(--ink-2,#51607A)] hover:text-[var(--ink,#0F1B2D)] border border-[var(--border,#E3E8EF)] dark:border-slate-700 transition cursor-pointer shrink-0"
                      title="نسخ الكود"
                    >
                      {copiedCode === judge.dutyCode ? (
                        <Check className="w-3.5 h-3.5 text-[var(--success,#15803D)]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Charts & Participation Strip */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Category Distribution Chart */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-3">
                  <div>
                    <h3 className="text-base font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[var(--primary,#0B3A6F)]" />
                      توزيع الرياضيين حسب الأصناف العمرية (World Athletics)
                    </h3>
                    <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">معدل الانخراط حسب الفئات الرسمية للموسم 2026</p>
                  </div>
                  <Badge variant="info" size="sm">إحصاء حي</Badge>
                </div>

                {/* Visual Bars */}
                <div className="space-y-3 pt-2">
                  {[
                    { label: 'أكابر رجال وسيدات (Senior)', count: 68, pct: 85, color: 'bg-blue-600' },
                    { label: 'أواسط (U20)', count: 44, pct: 65, color: 'bg-teal-600' },
                    { label: 'أشبال (U18)', count: 38, pct: 55, color: 'bg-emerald-600' },
                    { label: 'أصاغر (U16)', count: 32, pct: 45, color: 'bg-indigo-600' },
                    { label: 'براعم (U14)', count: 26, pct: 35, color: 'bg-amber-600' },
                    { label: 'قدماء (Masters 35+)', count: 18, pct: 25, color: 'bg-purple-600' },
                  ].map((bar, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--ink,#0F1B2D)] dark:text-white">{bar.label}</span>
                        <span className="font-mono text-[var(--primary,#0B3A6F)] dark:text-cyan-400 font-bold">{bar.count} رياضي</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                        <div
                          className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                          style={{ width: `${bar.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Certified Results & Records Strip */}
              <div className="lg:col-span-5 p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-3">
                  <div>
                    <h3 className="text-base font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[var(--success,#15803D)]" />
                      آخر النتائج والأرقام المعتمدة
                    </h3>
                    <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">محاضر معتمدة وفق المعايير الدولية</p>
                  </div>
                  <Badge variant="success" size="sm">TR31</Badge>
                </div>

                <div className="space-y-2.5">
                  {records.slice(0, 3).map(rec => (
                    <div key={rec.id} className="p-3 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-1.5">
                          <span>{rec.athleteName}</span>
                          <span className="text-[10px] text-[var(--ink-2,#51607A)]">({rec.discipline})</span>
                        </div>
                        <div className="text-[11px] font-mono text-[var(--primary,#0B3A6F)] dark:text-cyan-400 font-extrabold">
                          {rec.mark} <span className="text-[var(--ink-3,#8593A8)] text-[10px]">({rec.windSpeed >= 0 ? `+${rec.windSpeed}` : rec.windSpeed} m/s)</span>
                        </div>
                      </div>
                      <Badge variant={rec.status === 'certified' ? 'success' : 'warning'} size="sm">
                        {rec.status === 'certified' ? 'معتمد' : 'قيد المراجعة'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('reports')}
                    className="w-full text-xs font-bold"
                  >
                    عرض كافة النتائج والمحاضر الرسمية
                  </Button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            9. TAB: RECORDS (الأرقام القياسية TR31)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[var(--success,#15803D)]" />
                    سجل الأرقام القياسية الولائية والجهوية (World Athletics TR31)
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                    التحقق الفني والمصادقة الصارمة على سرعة الرياح القانونية (أقل من +2.0 م/ث)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] font-bold text-[11px] border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                    <tr>
                      <th className="py-3 px-4">اسم العداء والنادي</th>
                      <th className="py-3 px-3">التخصص</th>
                      <th className="py-3 px-3 text-center">الفئة</th>
                      <th className="py-3 px-3 text-center font-mono">الرقم المسجل</th>
                      <th className="py-3 px-3 text-center font-mono">سرعة الرياح</th>
                      <th className="py-3 px-3 text-center">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراء الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                    {records.map(rec => (
                      <tr key={rec.id} className="hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-900/60 transition">
                        <td className="py-3 px-4 font-bold text-[var(--ink,#0F1B2D)] dark:text-white">
                          {rec.athleteName} <span className="text-[10px] text-[var(--ink-2,#51607A)] font-normal">({rec.clubName})</span>
                        </td>
                        <td className="py-3 px-3 text-[var(--primary,#0B3A6F)] dark:text-cyan-300 font-bold">{rec.discipline}</td>
                        <td className="py-3 px-3 text-center">{rec.category}</td>
                        <td className="py-3 px-3 text-center font-mono font-black text-[var(--accent,#E8590C)]">{rec.mark}</td>
                        <td className="py-3 px-3 text-center font-mono text-[var(--ink-2,#51607A)]">
                          {rec.windSpeed >= 0 ? `+${rec.windSpeed}` : rec.windSpeed} m/s
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={rec.status === 'certified' ? 'success' : rec.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                            {rec.status === 'certified' ? 'معتمد رسمياً' : rec.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {rec.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCertifyRecord(rec.id, true)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                اعتماد TR31
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCertifyRecord(rec.id, false)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                رفض
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[var(--ink-3,#8593A8)]">تم البت في النتيجة</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            2. TAB: COMPETITIONS DIRECTORY (دليل منافسات الرابطة)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'competitions' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[var(--primary,#0B3A6F)]" />
                    دليل منافسات وتظاهرات الرابطة ({filteredCompetitions.length})
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                    إدارة البرنامج الزمني والنتائج ومحاضر التحكيم الخاصة برابطة {currentLeague.name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedPlanningCompId(undefined);
                      setActiveTab('planning');
                    }}
                    icon={<Plus className="w-4 h-4" />}
                    className="font-bold text-xs"
                  >
                    تخطيط وبرمجة منافسة جديدة
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedBureauCompId(undefined);
                      setActiveTab('competitions-bureau');
                    }}
                    icon={<Flame className="w-4 h-4" />}
                    className="text-xs font-bold"
                  >
                    مكتب المنافسات المباشر
                  </Button>
                </div>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'كافة المنافسات' },
                  { id: 'live', label: '🔴 جارية الآن (Live)' },
                  { id: 'upcoming', label: '⏳ قادمة ومبرمجة' },
                  { id: 'completed', label: '🏁 منتهية ومصادقة' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setCompStatusFilter(filter.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      compStatusFilter === filter.id
                        ? 'bg-[var(--primary,#0B3A6F)] text-white shadow-sm'
                        : 'bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] hover:text-[var(--primary,#0B3A6F)]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Competitions Table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] font-bold text-[11px] border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                    <tr>
                      <th className="py-3 px-4">اسم التظاهرة / المنافسة</th>
                      <th className="py-3 px-3">المكان والملعب</th>
                      <th className="py-3 px-3 text-center">التاريخ</th>
                      <th className="py-3 px-3 text-center">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراءات المكاتب المدمجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                    {competitionsLoading ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-[var(--ink-2,#51607A)]">
                          جاري تحميل قائمة المنافسات...
                        </td>
                      </tr>
                    ) : filteredCompetitions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-[var(--ink-2,#51607A)]">
                          لا توجد منافسات مسجلة بهذه الفئة. يمكنك البدء بإنشاء منافسة من مكتب التخطيط.
                        </td>
                      </tr>
                    ) : (
                      filteredCompetitions.map(comp => (
                        <tr key={comp.id} className="hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-900/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[var(--ink,#0F1B2D)] dark:text-white text-sm">
                              {comp.name}
                            </div>
                            <div className="text-[10px] text-[var(--ink-2,#51607A)]">
                              الرابطة: {comp.leagueName || currentLeague.name}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[var(--ink-2,#51607A)]">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[var(--accent,#E8590C)] shrink-0" />
                              <span>{comp.venue}، {comp.city}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[var(--ink-2,#51607A)]">
                            {comp.date}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge 
                              variant={comp.status === 'live' ? 'danger' : comp.status === 'completed' ? 'success' : 'info'}
                              size="sm"
                              dot={comp.status === 'live'}
                            >
                              {comp.status === 'live' ? 'جارية الآن' : comp.status === 'completed' ? 'منتهية ومصادقة' : 'مبرمجة'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedPlanningCompId(comp.id);
                                  setActiveTab('planning');
                                }}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                تخطيط البرنامج
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedBureauCompId(comp.id);
                                  setActiveTab('competitions-bureau');
                                }}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                التحكيم والنتائج
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveTab('reports')}
                                className="text-[10px] py-1 px-2"
                              >
                                التقارير
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            3. TAB: PLANNING BUREAU (مكتب التخطيط المدمج كلياً)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'planning' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
              <div className="flex items-center gap-2">
                <Badge variant="info" size="md">مكتب التخطيط والبرمجة المدمج</Badge>
                <span className="text-xs text-[var(--ink-2,#51607A)]">
                  تخطيط وبرمجة التظاهرات والمسابقات لحساب {currentLeague.name}
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('overview')}>
                العودة للوحة القيادة
              </Button>
            </div>
            
            <PlanningBureauWorkspace
              initialLeagueId={activeLeagueId}
              initialLeagueName={currentLeague.name}
              initialCompetitionId={selectedPlanningCompId}
              onClose={() => setActiveTab('overview')}
              onScheduleSaved={() => setActiveTab('competitions')}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            4. TAB: COMPETITIONS BUREAU (مكتب المنافسات المدمج كلياً)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'competitions-bureau' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
              <div className="flex items-center gap-2">
                <Badge variant="accent" size="md">مكتب المنافسات والتحكيم المباشر المدمج</Badge>
                <span className="text-xs text-[var(--ink-2,#51607A)]">
                  متابعة عمليات الحكام والمصادقة على النتائج الرسمية والترحيل للأرشيف
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('overview')}>
                العودة للوحة القيادة
              </Button>
            </div>

            <CompetitionsBureauWorkspace
              initialCompetitionId={selectedBureauCompId}
              onClose={() => setActiveTab('overview')}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            5. TAB: CLUBS & ATHLETES MANAGEMENT
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'clubs_athletes' && (
          <div className="space-y-6">
            
            {/* Clubs Grid & Add Button */}
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[var(--primary,#0B3A6F)]" />
                    دليل الأندية والجمعيات المنتسبة ({clubs.length})
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">إدارة رخص وتأهيلات الأندية المعتمدة للموسم الحالي</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddClubModal(true)}
                  icon={<Plus className="w-4 h-4" />}
                  className="font-bold text-xs"
                >
                  تسجيل نادي جديد
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {clubs.map(club => (
                  <div key={club.id} className="p-4 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-[var(--primary,#0B3A6F)] dark:text-cyan-300 bg-blue-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-slate-700">
                        {club.code}
                      </span>
                      <Badge variant={club.status === 'active' ? 'success' : 'warning'} size="sm">
                        {club.status === 'active' ? 'نشط' : 'قيد التجديد'}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[var(--ink,#0F1B2D)] dark:text-white truncate">{club.name}</h4>
                      <p className="text-xs text-[var(--ink-2,#51607A)]">المقر: {club.city}</p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] flex items-center justify-between text-xs text-[var(--ink-2,#51607A)]">
                      <span>العداؤون: <strong className="text-[var(--ink,#0F1B2D)] dark:text-white font-mono">{club.athletesCount}</strong></span>
                      <span className="truncate max-w-[100px]">{club.coachName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Athletes Table with Age Category Filters */}
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--success,#15803D)]" />
                    سجل العدائين المرخصين حسب الأصناف العمرية ({filteredAthletes.length})
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">U14 (براعم) إلى Masters (قدماء) وفق معايير الاتحاد الدولي</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowExcelImportModal(true)}
                    icon={<Upload className="w-3.5 h-3.5" />}
                    className="text-xs font-bold cursor-pointer"
                  >
                    استيراد Excel
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadExcelTemplate}
                    icon={<Download className="w-3.5 h-3.5" />}
                    className="text-xs font-bold cursor-pointer"
                  >
                    تحميل نموذج Excel
                  </Button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'كافة الأصناف' },
                    { id: 'U14', label: 'براعم (U14)' },
                    { id: 'U16', label: 'أصاغر (U16)' },
                    { id: 'U18', label: 'أشبال (U18)' },
                    { id: 'U20', label: 'أواسط (U20)' },
                    { id: 'SENIOR', label: 'أكابر (Senior)' },
                    { id: 'MASTER', label: 'قدماء (Masters)' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setAthleteCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        athleteCategoryFilter === cat.id
                          ? 'bg-[var(--primary,#0B3A6F)] text-white shadow-sm'
                          : 'bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] hover:text-[var(--primary,#0B3A6F)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[var(--ink-3,#8593A8)] absolute right-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="ابحث بالاسم أو النادي أو الصدرية..."
                    value={athleteSearchQuery}
                    onChange={(e) => setAthleteSearchQuery(e.target.value)}
                    className="pr-8 py-1.5 text-xs bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] font-bold text-[10.5px] border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                    <tr>
                      <th className="py-3 px-3 text-center">الصدرية</th>
                      <th className="py-3 px-4">اسم العداء</th>
                      <th className="py-3 px-3">النادي المنتسب</th>
                      <th className="py-3 px-3 text-center">الصنف العمري</th>
                      <th className="py-3 px-3 text-center">الجنس</th>
                      <th className="py-3 px-3">التخصص الأساسي</th>
                      <th className="py-3 px-3 font-mono text-center">رقم الإجازة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                    {filteredAthletes.map(ath => (
                      <tr key={ath.id} className="hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-900/60 transition">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--accent,#E8590C)]">
                          #{ath.bibNumber}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-[var(--ink,#0F1B2D)] dark:text-white">{ath.name}</td>
                        <td className="py-2.5 px-3 text-[var(--ink-2,#51607A)]">{ath.clubName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--ink,#0F1B2D)] dark:text-white border border-[var(--border,#E3E8EF)] dark:border-slate-700">
                            {ath.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-[var(--ink-2,#51607A)]">
                          {ath.gender === 'M' ? 'ذكور' : 'إناث'}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--primary,#0B3A6F)] dark:text-cyan-300 font-semibold">{ath.discipline}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-[var(--ink-2,#51607A)] text-[11px]">{ath.licenseNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            9. TAB: RECORDS (الأرقام القياسية TR31)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[var(--success,#15803D)]" />
                    سجل الأرقام القياسية الولائية والجهوية (World Athletics TR31)
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                    التحقق الفني والمصادقة الصارمة على سرعة الرياح القانونية (أقل من +2.0 م/ث)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] font-bold text-[11px] border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                    <tr>
                      <th className="py-3 px-4">اسم العداء والنادي</th>
                      <th className="py-3 px-3">التخصص</th>
                      <th className="py-3 px-3 text-center">الفئة</th>
                      <th className="py-3 px-3 text-center font-mono">الرقم المسجل</th>
                      <th className="py-3 px-3 text-center font-mono">سرعة الرياح</th>
                      <th className="py-3 px-3 text-center">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراء الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                    {records.map(rec => (
                      <tr key={rec.id} className="hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-900/60 transition">
                        <td className="py-3 px-4 font-bold text-[var(--ink,#0F1B2D)] dark:text-white">
                          {rec.athleteName} <span className="text-[10px] text-[var(--ink-2,#51607A)] font-normal">({rec.clubName})</span>
                        </td>
                        <td className="py-3 px-3 text-[var(--primary,#0B3A6F)] dark:text-cyan-300 font-bold">{rec.discipline}</td>
                        <td className="py-3 px-3 text-center">{rec.category}</td>
                        <td className="py-3 px-3 text-center font-mono font-black text-[var(--accent,#E8590C)]">{rec.mark}</td>
                        <td className="py-3 px-3 text-center font-mono text-[var(--ink-2,#51607A)]">
                          {rec.windSpeed >= 0 ? `+${rec.windSpeed}` : rec.windSpeed} m/s
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={rec.status === 'certified' ? 'success' : rec.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                            {rec.status === 'certified' ? 'معتمد رسمياً' : rec.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {rec.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCertifyRecord(rec.id, true)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                اعتماد TR31
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCertifyRecord(rec.id, false)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                رفض
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[var(--ink-3,#8593A8)]">تم البت في النتيجة</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            6. TAB: JUDGES & DUTY CODES (مكتب الحكام والتعيينات الرسمي)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'judges' && (
          <div className="space-y-6">
            <JudgesManagementOffice />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            7. TAB: REPORTS & CERTIFIED MINUTES (المحاضر والتقارير الرسمية)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-6">
              <div className="border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-[var(--primary,#0B3A6F)]" />
                  المحاضر الرسمية والتقارير الموحدة للرابطة
                </h3>
                <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                  تصدير فوري للمحاضر الرسمية لكل اختصاص وسجلات الأندية والرياضيين بالصيغ الثلاث المعتمدة (PDF، Word، Excel).
                </p>
              </div>

              {/* Digital Competition Sheets Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                    نظام معتمد • Liste Final COURSES & CONCOUR
                  </div>
                  <h4 className="text-base font-black text-white">نظام أوراق النتائج الرقمية الموحدة للحكام</h4>
                  <p className="text-xs text-slate-300">
                    إعداد قوائم المشاركين، تسجيل نتائج المحاولات الست ومسابقات المضمار، احتساب الترتيب وكسر التعادل، وتصدير المحاضر الرسمية.
                  </p>
                </div>
                {onOpenSheets && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onOpenSheets}
                    className="font-black text-xs shadow-lg shadow-emerald-950 shrink-0"
                  >
                    فتح ورشة أوراق النتائج الرقمية 📄
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* PDF Card */}
                <div className="p-6 rounded-2xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[var(--ink,#0F1B2D)] dark:text-white">محضر رسمي عالي الدقة (PDF)</h4>
                    <p className="text-xs text-[var(--ink-2,#51607A)] mt-1">تنسيق طباعة A4 بالترويسة الموحدة للرابطة والأختام الرسمية</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExportAnnualReport('pdf')}
                    className="w-full font-bold text-xs"
                  >
                    طباعة وتصدير PDF
                  </Button>
                </div>

                {/* Word Card */}
                <div className="p-6 rounded-2xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-900">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[var(--ink,#0F1B2D)] dark:text-white">مستند محضر قابل للتحرير (Word)</h4>
                    <p className="text-xs text-[var(--ink-2,#51607A)] mt-1">مستند مكتبي Docx يدعم اتجاه RTL والخط العربي بالكامل</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExportAnnualReport('word')}
                    className="w-full font-bold text-xs"
                  >
                    تصدير مستند Word (.docx)
                  </Button>
                </div>

                {/* Excel Card */}
                <div className="p-6 rounded-2xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-900">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[var(--ink,#0F1B2D)] dark:text-white">جدول نتائج رسمي (Excel)</h4>
                    <p className="text-xs text-[var(--ink-2,#51607A)] mt-1">أوراق عمل منسقة بدعم أصيل لليمين إلى اليسار وقابلة للفرز</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExportAnnualReport('excel')}
                    className="w-full font-bold text-xs"
                  >
                    تصدير جدول Excel (.xlsx)
                  </Button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            8. TAB: IDENTITY, HEADER & ARCHIVE (الإعدادات والهوية والأرشيف)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'identity' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Identity Settings Form */}
              <div className="lg:col-span-6 p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
                <div className="border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-3">
                  <h3 className="text-base font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[var(--primary,#0B3A6F)]" />
                    إعدادات هوية الرابطة والترويسة الرسمية
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-1">
                    تُعتمد هذه البيانات كمرجع وحيد لتوليد الترويسة الموحدة لكافة تقارير PDF و Word و Excel في مكتبي التخطيط والمنافسات.
                  </p>
                </div>

                <form onSubmit={handleSaveIdentity} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">اسم الرابطة الرسمي الكامل:</label>
                    <Input
                      type="text"
                      value={identityForm.name}
                      onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">الرمز المختصر (Acronym):</label>
                      <Input
                        type="text"
                        value={identityForm.shortName}
                        onChange={(e) => setIdentityForm({ ...identityForm, shortName: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">رقم الاعتماد الرسمي:</label>
                      <Input
                        type="text"
                        value={identityForm.accreditationNumber}
                        onChange={(e) => setIdentityForm({ ...identityForm, accreditationNumber: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">الولاية والمستوى الإقليمي:</label>
                      <Input
                        type="text"
                        value={identityForm.region}
                        onChange={(e) => setIdentityForm({ ...identityForm, region: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">رابط الشعار الرسمي (URL أو رمز):</label>
                      <Input
                        type="text"
                        placeholder="https://... أو رمز 🏃"
                        value={identityForm.logoUrl}
                        onChange={(e) => setIdentityForm({ ...identityForm, logoUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">البريد الإلكتروني الرسمي:</label>
                      <Input
                        type="email"
                        value={identityForm.officialEmail}
                        onChange={(e) => setIdentityForm({ ...identityForm, officialEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">رقم الهاتف الفيدرالي:</label>
                      <Input
                        type="text"
                        value={identityForm.phone}
                        onChange={(e) => setIdentityForm({ ...identityForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">اسم رئيس الرابطة:</label>
                      <Input
                        type="text"
                        value={identityForm.presidentName}
                        onChange={(e) => setIdentityForm({ ...identityForm, presidentName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">اسم الأمين العام:</label>
                      <Input
                        type="text"
                        value={identityForm.secretaryName}
                        onChange={(e) => setIdentityForm({ ...identityForm, secretaryName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">ختم الرابطة الرسمي (Stamp / Seal):</label>
                      <Input
                        type="text"
                        placeholder="رابط صورة الختم أو رمز 🛡️"
                        value={identityForm.stampUrl}
                        onChange={(e) => setIdentityForm({ ...identityForm, stampUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">توقيع رئيس الرابطة المعتمد (Signature):</label>
                      <Input
                        type="text"
                        placeholder="رابط التوقيع أو الاسم المعتمد"
                        value={identityForm.signatureUrl}
                        onChange={(e) => setIdentityForm({ ...identityForm, signatureUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] flex justify-end">
                    <Button type="submit" variant="primary" size="md" className="cursor-pointer font-bold">
                      حفظ واعتماد هوية الرابطة
                    </Button>
                  </div>
                </form>
              </div>

              {/* Live Header Preview Card */}
              <div className="lg:col-span-6 p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-3">
                  <span className="text-xs font-black text-[var(--primary,#0B3A6F)] dark:text-cyan-400 uppercase tracking-wider">
                    معاينة حية للترويسة الرسمية الموحدة (Live Preview)
                  </span>
                  <Badge variant="success" size="sm">World Athletics Ready</Badge>
                </div>

                {/* Clean White Sheet Simulator */}
                <div className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-slate-900 space-y-3 font-sans text-xs shadow" dir="rtl">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="space-y-0.5 text-right">
                      <div className="font-extrabold text-[11px] text-slate-900">الجمهورية الجزائرية الديمقراطية الشعبية</div>
                      <div className="text-[9.5px] text-slate-600 font-bold">وزارة الشباب والرياضة • الاتحاد الجزائري لألعاب القوى</div>
                      <div className="text-[8px] font-mono text-slate-500 uppercase" dir="ltr">RÉPUBLIQUE ALGÉRIENNE • FAA</div>
                    </div>

                    <div className="flex flex-col items-center">
                      {identityForm.logoUrl ? (
                        <img src={identityForm.logoUrl} alt="شعار" className="w-12 h-12 object-contain border p-0.5 rounded-lg mb-0.5" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 font-black flex items-center justify-center text-2xl shadow mb-0.5">
                          {identityForm.logoCode || '🏃'}
                        </div>
                      )}
                      <span className="text-[8.5px] font-mono font-bold text-slate-600">{identityForm.accreditationNumber}</span>
                    </div>

                    <div className="space-y-0.5 text-left">
                      <div className="font-black text-[11px] text-emerald-800">{identityForm.name}</div>
                      <div className="text-[9.5px] text-slate-600">{identityForm.region}</div>
                      <div className="text-[8px] font-bold text-emerald-700">معتمد رسمياً (World Athletics)</div>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-center space-y-0.5">
                    <div className="font-extrabold text-xs text-slate-900">محضر النتائج الرسمية المعتمدة لسباقات ومسابقات ألعاب القوى</div>
                    <div className="text-[8.5px] font-mono text-slate-500 uppercase" dir="ltr">OFFICIAL CERTIFIED ATHLETICS PROTOCOL</div>
                  </div>

                  <div className="text-[10px] text-slate-600 flex justify-between pt-1">
                    <span>الرئيس: <strong>{identityForm.presidentName}</strong></span>
                    <span>الأمين العام: <strong>{identityForm.secretaryName}</strong></span>
                    <span>الهاتف: <strong>{identityForm.phone}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">الختم الرسمي:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 font-bold text-[9px]">
                        {identityForm.stampUrl ? '🛡️ ختم معتمد' : '🛡️ ختم الرابطة الولائية'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">التوقيع والمصادقة:</span>
                      <span className="font-serif italic font-bold text-slate-800 text-xs">
                        {identityForm.signatureUrl || identityForm.presidentName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] text-xs text-[var(--ink-2,#51607A)] space-y-1">
                  <span className="font-bold text-[var(--primary,#0B3A6F)] dark:text-cyan-300 block">تكامل مباشر وتلقائي:</span>
                  <p>
                    أي تعديل في هذا النموذج يتم تطبيقه تلقائياً في مكتبي التخطيط والمنافسات ومحاضر التصدير الثلاثة دون تكرار.
                  </p>
                </div>
              </div>
            </div>

            {/* Archive & Demo Protection Management Section (Rule 2: Never permanently delete) */}
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-3">
                <div>
                  <h3 className="text-base font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <Archive className="w-5 h-5 text-[var(--accent,#E8590C)]" />
                    حماية البيانات والأرشيف والنسخ الاحتياطي
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                    حماية الرابطات التجريبية بالعلامة الآمنة (is_demo / archived_at) مع إمكانية النسخ الاحتياطي والاستعادة
                  </p>
                </div>
                <Badge variant={currentLeague.is_demo ? 'warning' : 'success'} size="sm">
                  {currentLeague.is_demo ? 'رابطة تجريبية (محجوبة في الإنتاج)' : 'رابطة رسمية نشطة'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-3">
                  <h4 className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white">
                    نسخ احتياطي فوري للرابطات (Instant Backup)
                  </h4>
                  <p className="text-xs text-[var(--ink-2,#51607A)] leading-relaxed">
                    يقوم بإنشاء لقطة مشفرة لكافة بيانات الرابطات وحفظها في التخزين المحلي الآمن قبل أي عملية تعديل.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleBackupLeagues}
                    icon={<Download className="w-3.5 h-3.5" />}
                    className="font-bold text-xs"
                  >
                    إنشاء نسخة احتياطية الآن
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-3">
                  <h4 className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white">
                    أرشفة وحجب الرابطة التجريبية
                  </h4>
                  <p className="text-xs text-[var(--ink-2,#51607A)] leading-relaxed">
                    يتم وسم الرابطة وتعيين تاريخ الأرشفة دون حذف أي سجل، مما يحجبها تلقائياً عن الواجهة العامة للمستخدمين.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleArchiveCurrentLeague}
                    icon={<Archive className="w-3.5 h-3.5" />}
                    className="font-bold text-xs"
                  >
                    أرشفة الرابطة وحجبها عن العرض
                  </Button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            9. TAB: RECORDS (الأرقام القياسية TR31)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[var(--success,#15803D)]" />
                    سجل الأرقام القياسية الولائية والجهوية (World Athletics TR31)
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                    التحقق الفني والمصادقة الصارمة على سرعة الرياح القانونية (أقل من +2.0 م/ث)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-[var(--ink-2,#51607A)] font-bold text-[11px] border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                    <tr>
                      <th className="py-3 px-4">اسم العداء والنادي</th>
                      <th className="py-3 px-3">التخصص</th>
                      <th className="py-3 px-3 text-center">الفئة</th>
                      <th className="py-3 px-3 text-center font-mono">الرقم المسجل</th>
                      <th className="py-3 px-3 text-center font-mono">سرعة الرياح</th>
                      <th className="py-3 px-3 text-center">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراء الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                    {records.map(rec => (
                      <tr key={rec.id} className="hover:bg-[var(--surface-2,#F8FAFC)] dark:hover:bg-slate-900/60 transition">
                        <td className="py-3 px-4 font-bold text-[var(--ink,#0F1B2D)] dark:text-white">
                          {rec.athleteName} <span className="text-[10px] text-[var(--ink-2,#51607A)] font-normal">({rec.clubName})</span>
                        </td>
                        <td className="py-3 px-3 text-[var(--primary,#0B3A6F)] dark:text-cyan-300 font-bold">{rec.discipline}</td>
                        <td className="py-3 px-3 text-center">{rec.category}</td>
                        <td className="py-3 px-3 text-center font-mono font-black text-[var(--accent,#E8590C)]">{rec.mark}</td>
                        <td className="py-3 px-3 text-center font-mono text-[var(--ink-2,#51607A)]">
                          {rec.windSpeed >= 0 ? `+${rec.windSpeed}` : rec.windSpeed} m/s
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={rec.status === 'certified' ? 'success' : rec.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                            {rec.status === 'certified' ? 'معتمد رسمياً' : rec.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {rec.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCertifyRecord(rec.id, true)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                اعتماد TR31
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCertifyRecord(rec.id, false)}
                                className="text-[10px] py-1 px-2 font-bold"
                              >
                                رفض
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[var(--ink-3,#8593A8)]">تم البت في النتيجة</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            10. TAB: ANNOUNCEMENTS (التعميمات والإعلانات)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[var(--accent,#E8590C)]" />
                    التعميمات والبلاغات الرسمية للأندية والحكام ({announcements.length})
                  </h3>
                  <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                    إصدار ونشر المراسلات الرسمية وجداول التكليفات للرابطة
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowNewAnnModal(true)}
                  icon={<Plus className="w-4 h-4" />}
                  className="font-bold text-xs"
                >
                  نشر تعميم جديد
                </Button>
              </div>

              <div className="space-y-3">
                {announcements.map(ann => (
                  <div key={ann.id} className="p-4 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ann.urgency === 'urgent' && <Badge variant="danger" size="sm">عاجل</Badge>}
                        <h4 className="text-sm font-bold text-[var(--ink,#0F1B2D)] dark:text-white">{ann.title}</h4>
                      </div>
                      <span className="font-mono text-xs text-[var(--ink-2,#51607A)]">{ann.date}</span>
                    </div>
                    <p className="text-xs text-[var(--ink-2,#51607A)] leading-relaxed">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            11. TAB: ROLES & AUDIT (الأدوار وسجل التدقيق)
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'roles_audit' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[var(--primary,#0B3A6F)]" />
                  أعضاء مكتب الرابطة وسجل التدقيق الإداري
                </h3>
                <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
                  سجل غير قابل للتعديل لكافة العمليات الإدارية والفنية المعتمدة
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {officers.map(off => (
                  <div key={off.id} className="p-4 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[var(--primary,#0B3A6F)] dark:text-cyan-400">{off.title}</div>
                      <div className="text-sm font-black text-[var(--ink,#0F1B2D)] dark:text-white">{off.fullName}</div>
                      <div className="text-[11px] text-[var(--ink-2,#51607A)] font-mono">{off.email}</div>
                      <div className="text-[11px] text-[var(--ink-2,#51607A)] font-mono">{off.phone}</div>
                      
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {off.permissions.map((p, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingOfficer(off)}
                        icon={<Edit2 className="w-3 h-3 text-[var(--primary,#0B3A6F)]" />}
                        className="w-full justify-center text-[11px] font-bold py-1 cursor-pointer"
                      >
                        تعديل البيانات والصلاحيات
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                <h4 className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white">سجل العمليات الأخير (Audit Log):</h4>
                <div className="space-y-2">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[var(--ink,#0F1B2D)] dark:text-white">{log.user}: </span>
                        <span className="text-[var(--ink-2,#51607A)]">{log.details}</span>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--ink-3,#8593A8)] shrink-0">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}

      {/* 1. Add Club Modal */}
      <Modal
        isOpen={showAddClubModal}
        onClose={() => setShowAddClubModal(false)}
        title="تسجيل نادي أو جمعية رياضية جديدة"
        maxWidth="md"
      >
        <form onSubmit={handleAddClub} className="space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">اسم النادي الكامل:</label>
            <Input
              type="text"
              placeholder="مثال: نادي أولمبيك سعيدة"
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">رمز النادي المختصر (Acronym):</label>
              <Input
                type="text"
                placeholder="مثال: OSA"
                value={newClubCode}
                onChange={(e) => setNewClubCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">المقر والبلدية:</label>
              <Input
                type="text"
                value={newClubCity}
                onChange={(e) => setNewClubCity(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">اسم المدرب المشرف:</label>
              <Input
                type="text"
                placeholder="اسم المدرب"
                value={newClubCoach}
                onChange={(e) => setNewClubCoach(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">رقم الهاتف:</label>
              <Input
                type="text"
                placeholder="0550..."
                value={newClubPhone}
                onChange={(e) => setNewClubPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button variant="ghost" size="sm" onClick={() => setShowAddClubModal(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              تأكيد التسجيل
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Add Judge Modal */}
      <Modal
        isOpen={showAddJudgeModal}
        onClose={() => setShowAddJudgeModal(false)}
        title="تعيين حكم وتوليد كود تكليف ميداني"
        maxWidth="md"
      >
        <form onSubmit={handleAddJudge} className="space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">اسم الحكم الكامل:</label>
            <Input
              type="text"
              placeholder="مثال: فريد سلطاني"
              value={newJudgeName}
              onChange={(e) => setNewJudgeName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">الدور الميداني المخصص:</label>
            <select
              value={newJudgeRole}
              onChange={(e) => setNewJudgeRole(e.target.value as any)}
              className="w-full bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] rounded-xl px-3 py-2 text-[var(--ink,#0F1B2D)] dark:text-white font-bold"
            >
              <option value="CHIEF">الحكم العام (Chief Judge)</option>
              <option value="FINISH">كاميرا خط النهاية (Photo Finish)</option>
              <option value="START">مسدس الانطلاق (Starter Gun)</option>
              <option value="LANE">حكم الأروقة والتوقيت اليدوي (Lane Judge)</option>
              <option value="FIELD">حكم مسابقات الميدان (Field Events)</option>
              <option value="CALL">غرفة النداء والتجهيز (Call Room)</option>
            </select>
          </div>
          <div>
            <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">المنافسة المعنية:</label>
            <Input
              type="text"
              value={newJudgeComp}
              onChange={(e) => setNewJudgeComp(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">التخصص المسند:</label>
            <Input
              type="text"
              value={newJudgeDisc}
              onChange={(e) => setNewJudgeDisc(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button variant="ghost" size="sm" onClick={() => setShowAddJudgeModal(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              توليد الكود والتعيين
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. New Announcement Modal */}
      <Modal
        isOpen={showNewAnnModal}
        onClose={() => setShowNewAnnModal(false)}
        title="نشر تعميم وبلاغ رسمي للأندية"
        maxWidth="md"
      >
        <form onSubmit={handleAddAnnouncement} className="space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">عنوان التعميم:</label>
            <Input
              type="text"
              placeholder="مثال: ضبط مواعيد التسجيل النهائي"
              value={newAnnTitle}
              onChange={(e) => setNewAnnTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">الجهة المستهدفة:</label>
              <select
                value={newAnnTarget}
                onChange={(e) => setNewAnnTarget(e.target.value as any)}
                className="w-full bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] rounded-xl px-3 py-2 text-[var(--ink,#0F1B2D)] dark:text-white font-bold"
              >
                <option value="all">كافة الأندية والحكام</option>
                <option value="coaches">المدربون والأندية فقط</option>
                <option value="judges">الحكام وطاقم الميدان فقط</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="urgent-check"
                checked={newAnnUrgent}
                onChange={(e) => setNewAnnUrgent(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="urgent-check" className="text-[var(--ink,#0F1B2D)] dark:text-white font-bold cursor-pointer">
                وسم كبلاغ عاجل
              </label>
            </div>
          </div>
          <div>
            <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">نص التعميم الرسمي:</label>
            <textarea
              rows={4}
              value={newAnnContent}
              onChange={(e) => setNewAnnContent(e.target.value)}
              placeholder="اكتب تفاصيل البلاغ هنا..."
              className="w-full bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] rounded-xl p-3 text-[var(--ink,#0F1B2D)] dark:text-white text-xs"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button variant="ghost" size="sm" onClick={() => setShowNewAnnModal(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              نشر وتعميم
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Excel Import Athletes Modal (Phase H) */}
      <Modal
        isOpen={showExcelImportModal}
        onClose={() => {
          if (!excelImportLoading) {
            setShowExcelImportModal(false);
            setExcelParsedAthletes([]);
            setExcelParseErrors([]);
            setExcelFileName('');
          }
        }}
        title="استيراد جماعي للعدائين من ملف Excel (.xlsx / .xls)"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 dark:text-blue-200 block text-sm">
                استيراد قوائم الرياضيين المسجلين
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadExcelTemplate}
                icon={<Download className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                تحميل نموذج إكسل الفارغ
              </Button>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              يدعم النظام قراءة ملفات Excel (.xlsx, .xls) مباشرة مع الكشف التلقائي عن الأعمدة:
              الاسم، رقم الإجازة، النادي، الصنف (U14 إلى Masters)، الجنس، ورقم الصدرية.
            </p>
          </div>

          {/* File Picker */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 text-center space-y-3">
            <Upload className="w-8 h-8 text-[var(--primary,#0B3A6F)] mx-auto animate-pulse" />
            <div>
              <label 
                htmlFor="excel-file-upload" 
                className="inline-block px-4 py-2 rounded-xl bg-[var(--primary,#0B3A6F)] text-white font-bold text-xs cursor-pointer hover:bg-[var(--primary-hover,#0E4A8C)] transition"
              >
                اختر ملف الإكسل من جهازك (.xlsx / .xls)
              </label>
              <input
                id="excel-file-upload"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileUpload}
                className="hidden"
                disabled={excelImportLoading}
              />
            </div>
            {excelFileName && (
              <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                الملف المحدد: {excelFileName}
              </div>
            )}
          </div>

          {/* Parsing Errors */}
          {excelParseErrors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-1">
              <span className="font-bold block">تنبيهات أخطاء البيانات ({excelParseErrors.length}):</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 dark:text-rose-300">
                {excelParseErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Athletes Preview Grid */}
          {excelParsedAthletes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--ink,#0F1B2D)] dark:text-white">
                <span>معاينة العدائين الجاهزين للاستيراد ({excelParsedAthletes.length}):</span>
                <Badge variant="success" size="sm">جاهز للحفظ</Badge>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] no-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 font-bold text-[11px] border-b border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
                    <tr>
                      <th className="py-2 px-3">الاسم واللقب</th>
                      <th className="py-2 px-2 text-center">الصدرية</th>
                      <th className="py-2 px-2 text-center">الصنف</th>
                      <th className="py-2 px-2 text-center">الجنس</th>
                      <th className="py-2 px-3">النادي</th>
                      <th className="py-2 px-3 font-mono">رقم الإجازة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border,#E3E8EF)] dark:divide-[var(--border,#22304A)]">
                    {excelParsedAthletes.slice(0, 15).map((ath, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-1.5 px-3 font-bold">{ath.name}</td>
                        <td className="py-1.5 px-2 text-center font-mono text-[var(--accent,#E8590C)] font-bold">#{ath.bibNumber}</td>
                        <td className="py-1.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 font-bold">{ath.category}</span>
                        </td>
                        <td className="py-1.5 px-2 text-center">{ath.gender}</td>
                        <td className="py-1.5 px-3 truncate max-w-[140px]">{ath.clubName}</td>
                        <td className="py-1.5 px-3 font-mono text-[10px]">{ath.licenseNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {excelParsedAthletes.length > 15 && (
                <div className="text-[10px] text-center text-[var(--ink-2,#51607A)] font-bold">
                  ... و {excelParsedAthletes.length - 15} عداء إضافي في الملف
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
            <Button
              variant="ghost"
              size="sm"
              disabled={excelImportLoading}
              onClick={() => {
                setShowExcelImportModal(false);
                setExcelParsedAthletes([]);
                setExcelParseErrors([]);
                setExcelFileName('');
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={excelImportLoading || excelParsedAthletes.length === 0}
              onClick={handleConfirmExcelImport}
              icon={excelImportLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              className="font-bold"
            >
              {excelImportLoading ? 'جارٍ قراءة الملف...' : `تأكيد وإدراج ${excelParsedAthletes.length} عداء`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. Edit Officer Modal (Phase H) */}
      <Modal
        isOpen={Boolean(editingOfficer)}
        onClose={() => setEditingOfficer(null)}
        title={`تعديل بيانات عضو المكتب: ${editingOfficer?.title}`}
        maxWidth="md"
      >
        {editingOfficer && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveOfficer(editingOfficer);
            }}
            className="space-y-4 text-xs"
            dir="rtl"
          >
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">المنصب الرسمي في الرابطة:</label>
              <Input
                type="text"
                value={editingOfficer.title}
                onChange={(e) => setEditingOfficer({ ...editingOfficer, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">الاسم واللقب الكامل:</label>
              <Input
                type="text"
                value={editingOfficer.fullName}
                onChange={(e) => setEditingOfficer({ ...editingOfficer, fullName: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">البريد الإلكتروني:</label>
                <Input
                  type="email"
                  value={editingOfficer.email}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-[var(--ink-2,#51607A)] mb-1 font-bold">رقم الهاتف:</label>
                <Input
                  type="text"
                  value={editingOfficer.phone}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
              <Button variant="ghost" size="sm" onClick={() => setEditingOfficer(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="font-bold">
                حفظ التعديلات في السجل
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
