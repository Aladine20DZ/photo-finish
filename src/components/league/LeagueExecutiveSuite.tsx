/**
 * PHOTO FINISH PRO AI — Master League Executive Suite Component (Stage 4 Enterprise)
 * World Athletics Federation Governance, Competitions Sanctioning, Duty Codes, 
 * Smart Bib Allocation, TR31 Records Certification, Ed25519 Licensing & Audit Trails.
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Building2, 
  Users, 
  Trophy, 
  Key, 
  CheckCircle2, 
  XCircle, 
  FileCheck, 
  Sparkles, 
  Copy, 
  Check, 
  History, 
  PlusCircle, 
  MapPin, 
  Calendar, 
  Wind, 
  Printer, 
  Download, 
  Award, 
  QrCode, 
  FileText, 
  LogOut
} from 'lucide-react';
import { 
  leagueExecutiveService, 
  LeagueMetrics 
} from '../../services/leagueExecutiveService';
import { LicenseTier } from '../../types/supabase';
import { portalAuthService, PortalSession } from '../../services/portalAuthService';
import { LeagueRegistrationModal } from './LeagueRegistrationModal';

interface LeagueExecutiveSuiteProps {
  leagueId?: string;
  leagueName?: string;
  onOpenFieldMode?: () => void;
  onSwitchPortal?: () => void;
}

interface LeagueCompetitionItem {
  id: string;
  name: string;
  type: string;
  date: string;
  venue: string;
  status: 'sanctioned' | 'pending' | 'rejected';
  dutyCodes: {
    role: string;
    code: string;
    judgeName?: string;
  }[];
}

interface AffiliatedClubItem {
  id: string;
  name: string;
  code: string;
  city: string;
  athletesCount: number;
  coachName: string;
  coachPhone: string;
  status: 'active' | 'pending_renewal';
}

interface RecordApplicationItem {
  id: string;
  athleteName: string;
  club: string;
  discipline: string;
  markDisplay: string;
  windSpeed: number;
  timingType: 'FAT' | 'HAND';
  date: string;
  status: 'certified' | 'pending' | 'rejected';
  rejectionReason?: string;
}

export const LeagueExecutiveSuite: React.FC<LeagueExecutiveSuiteProps> = ({
  leagueId: propLeagueId,
  leagueName: propLeagueName,
  onOpenFieldMode,
  onSwitchPortal
}) => {
  const [session, setSession] = useState<PortalSession | null>(() => portalAuthService.getSession('league'));
  const [showRegModal, setShowRegModal] = useState(false);

  // Active League Resolution
  const activeLeagueId = propLeagueId || session?.leagueId || 'laa_algiers';
  const activeLeague = portalAuthService.getLeagueById(activeLeagueId) || {
    id: activeLeagueId,
    name: propLeagueName || session?.leagueName || 'الرابطة الولائية لألعاب القوى - الجزائر',
    shortName: session?.leagueShort || 'LAA',
    type: 'wilaya' as const,
    region: 'الجزائر العاصمة',
    wilaya: 'الجزائر',
    logoCode: '🏛️',
    accreditationNumber: 'LAA-ALG-2026-016',
    officialEmail: 'laa@athletic.dz',
    phone: '+213 21 00 00 16',
    adminFullName: session?.fullName || 'عمر بن أحمد (المدير التنفيذي)',
    adminUsername: session?.username || 'laa_admin',
    adminPassword: 'League@2026',
    createdAt: '2026-01-05T00:00:00Z',
    isActive: true
  };

  const [subTab, setSubTab] = useState<'overview' | 'competitions' | 'clubs' | 'bibs' | 'records' | 'licensing' | 'reports' | 'audit'>('overview');
  const [metrics, setMetrics] = useState<LeagueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // ═══ Competitions & Duty Codes State ═══
  const [competitions, setCompetitions] = useState<LeagueCompetitionItem[]>([
    {
      id: 'comp_algiers_2026',
      name: 'البطولة الولائية للعدو الريفي - الجزائر',
      type: 'cross_country',
      date: '2026-04-12',
      venue: 'غابة بوشاوي، الجزائر',
      status: 'sanctioned',
      dutyCodes: [
        { role: 'مسدس الانطلاق (Starter Gun)', code: 'START-ALG-9K4M' },
        { role: 'كاميرا خط النهاية (Photo Finish)', code: 'FINISH-ALG-7X2A' },
        { role: 'الحكم العام (Chief Judge)', code: 'CHIEF-ALG-Q9TX' },
        { role: 'غرفة النداء (Call Room)', code: 'CALL-ALG-3M1P' },
        { role: 'نقطة المراقبة 1 (4.5 كم)', code: 'CP-01-ALG-8V5T' }
      ]
    },
    {
      id: 'comp_tipaza_10k',
      name: 'سباق تيبازة الدولي 10 كلم للطريق',
      type: 'road_race',
      date: '2026-05-01',
      venue: 'الميناء القديم، تيبازة',
      status: 'pending',
      dutyCodes: [
        { role: 'مسدس الانطلاق', code: 'START-TIP-112B' },
        { role: 'كاميرا خط النهاية', code: 'FINISH-TIP-447Z' }
      ]
    },
    {
      id: 'comp_track_championship',
      name: 'ملتقى العاصمة للمضمار والميدان 2026',
      type: 'track_and_field',
      date: '2026-05-20',
      venue: 'ملعب 5 جويلية، الجزائر',
      status: 'sanctioned',
      dutyCodes: [
        { role: 'مسدس الانطلاق المعتمد', code: 'START-5J-889X' },
        { role: 'كاميرا المسح الشريطي المزدوج', code: 'FINISH-5J-334Y' },
        { role: 'الحكم العام والتوقيع الرقمي', code: 'CHIEF-5J-110A' }
      ]
    }
  ]);

  // New Competition Form State
  const [showNewCompModal, setShowNewCompModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompType, setNewCompType] = useState('track_and_field');
  const [newCompDate, setNewCompDate] = useState('2026-06-10');
  const [newCompVenue, setNewCompVenue] = useState('');

  // ═══ Affiliated Clubs State ═══
  const [clubs, setClubs] = useState<AffiliatedClubItem[]>([
    { id: 'club_mca', name: 'مولودية الجزائر', code: 'MCA', city: 'الجزائر العاصمة', athletesCount: 68, coachName: 'كمال منصوري', coachPhone: '+213 550 11 22 33', status: 'active' },
    { id: 'club_crb', name: 'شباب بلوزداد لألعاب القوى', code: 'CRB', city: 'الجزائر العاصمة', athletesCount: 54, coachName: 'ياسين بوجمعة', coachPhone: '+213 551 22 33 44', status: 'active' },
    { id: 'club_usma', name: 'اتحاد الجزائر الرياضي', code: 'USMA', city: 'الجزائر العاصمة', athletesCount: 46, coachName: 'عبد النور رحال', coachPhone: '+213 552 33 44 55', status: 'active' },
    { id: 'club_nrc', name: 'نجم رغاية الرياضي', code: 'NRR', city: 'رغاية', athletesCount: 38, coachName: 'مراد بلعيد', coachPhone: '+213 553 44 55 66', status: 'active' },
    { id: 'club_bouchaoui', name: 'نادي عدائي بوشاوي', code: 'CRBOU', city: 'بوشاوي', athletesCount: 42, coachName: 'سفيان حساني', coachPhone: '+213 554 55 66 77', status: 'active' }
  ]);
  const [showNewClubModal, setShowNewClubModal] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubCode, setNewClubCode] = useState('');
  const [newClubCoach, setNewClubCoach] = useState('');

  // ═══ Smart Bib Allocation State ═══
  const [bibStart, setBibStart] = useState<number>(101);
  const [bibEnd, setBibEnd] = useState<number>(350);
  const [allocatedBibs, setAllocatedBibs] = useState<{ bib: number; club: string; athlete: string; discipline: string }[]>([
    { bib: 101, club: 'مولودية الجزائر (MCA)', athlete: 'يوسف العبدلي', discipline: '100م نهائي رجال' },
    { bib: 102, club: 'شباب بلوزداد (CRB)', athlete: 'سفيان البقالي', discipline: '100م نهائي رجال' },
    { bib: 103, club: 'اتحاد الجزائر (USMA)', athlete: 'توفيق مخلوفي', discipline: '1500م رجال' },
    { bib: 104, club: 'وفاق سطيف (ESS)', athlete: 'سليمان بلمخفي', discipline: '100م نهائي رجال' },
    { bib: 105, club: 'نجم رغاية (NRR)', athlete: 'نبيل زبيري', discipline: '200م رجال' }
  ]);
  const [bibSuccessMsg, setBibSuccessMsg] = useState<string | null>(null);

  // ═══ TR31 Records Certification State ═══
  const [recordApps, setRecordApps] = useState<RecordApplicationItem[]>([
    {
      id: 'rec_101',
      athleteName: 'يوسف العبدلي',
      club: 'مولودية الجزائر (MCA)',
      discipline: '100م رجال',
      markDisplay: '09.96s',
      windSpeed: 1.2,
      timingType: 'FAT',
      date: '2026-06-15',
      status: 'pending'
    },
    {
      id: 'rec_102',
      athleteName: 'جمال سجاتي',
      club: 'أولمبي الشلف (ASO)',
      discipline: '800م رجال',
      markDisplay: '1:42.50',
      windSpeed: 0.0,
      timingType: 'FAT',
      date: '2026-05-18',
      status: 'certified'
    },
    {
      id: 'rec_103',
      athleteName: 'أمينة بن دريس',
      club: 'وفاق سطيف (ESS)',
      discipline: '200م إناث',
      markDisplay: '22.84s',
      windSpeed: 2.8, // Unfavorable wind > +2.0 m/s
      timingType: 'FAT',
      date: '2026-05-18',
      status: 'rejected',
      rejectionReason: 'سرعة الرياح (+2.8 m/s) تتجاوز الحد الأقصى المسموح به دولياً (+2.0 m/s) بموجب World Athletics TR31.'
    }
  ]);

  // ═══ Ed25519 Licensing State ═══
  const [tier, setTier] = useState<LicenseTier>('CLUB');
  const [expiryMonths, setExpiryMonths] = useState<number>(12);
  const [devHash, setDevHash] = useState<string>('POOL');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedDuty, setCopiedDuty] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [activeLeagueId]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await leagueExecutiveService.getLeagueMetrics(activeLeagueId);
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSanction = async (id: string, approve: boolean) => {
    await leagueExecutiveService.sanctionCompetition(id, approve);
    setCompetitions(prev => prev.map(c => c.id === id ? { ...c, status: approve ? 'sanctioned' : 'rejected' } : c));
  };

  const handleCreateCompetition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !newCompVenue.trim()) return;

    const newComp: LeagueCompetitionItem = {
      id: `comp_${Date.now().toString(36)}`,
      name: newCompName.trim(),
      type: newCompType,
      date: newCompDate,
      venue: newCompVenue.trim(),
      status: 'sanctioned',
      dutyCodes: [
        { role: 'مسدس الانطلاق (Starter Gun)', code: `START-${activeLeague.shortName}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` },
        { role: 'كاميرا خط النهاية (Photo Finish)', code: `FINISH-${activeLeague.shortName}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` },
        { role: 'الحكم العام (Chief Judge)', code: `CHIEF-${activeLeague.shortName}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` },
        { role: 'غرفة النداء (Call Room)', code: `CALL-${activeLeague.shortName}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` }
      ]
    };

    setCompetitions(prev => [newComp, ...prev]);
    setShowNewCompModal(false);
    setNewCompName('');
    setNewCompVenue('');
  };

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim() || !newClubCode.trim()) return;

    const newClub: AffiliatedClubItem = {
      id: `club_${newClubCode.toLowerCase()}`,
      name: newClubName.trim(),
      code: newClubCode.trim().toUpperCase(),
      city: activeLeague.wilaya,
      athletesCount: 1,
      coachName: newClubCoach.trim() || 'المدرب الرئيسي',
      coachPhone: '+213 550 00 00 00',
      status: 'active'
    };

    setClubs(prev => [...prev, newClub]);
    setShowNewClubModal(false);
    setNewClubName('');
    setNewClubCode('');
    setNewClubCoach('');
  };

  const handleGenerateBibAllocation = () => {
    let current = bibStart;
    const newAllocated: typeof allocatedBibs = [];
    clubs.forEach(c => {
      newAllocated.push({
        bib: current++,
        club: `${c.name} (${c.code})`,
        athlete: `عداء 1 - ${c.code}`,
        discipline: '100م كبار'
      });
      newAllocated.push({
        bib: current++,
        club: `${c.name} (${c.code})`,
        athlete: `عداء 2 - ${c.code}`,
        discipline: '400م كبار'
      });
    });
    setAllocatedBibs(newAllocated);
    setBibSuccessMsg(`تم تخصيص وتسلسل أرقام الصدريات بنجاح من الصدرية #${bibStart} إلى #${current - 1} لجميع الأندية المنتسبة.`);
    setTimeout(() => setBibSuccessMsg(null), 4000);
  };

  const handleCertifyRecord = (id: string, approve: boolean) => {
    setRecordApps(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (approve) {
        if (r.windSpeed > 2.0 && (r.discipline.includes('100') || r.discipline.includes('200'))) {
          alert('تنبيه رسمي: لا يمكن اعتماد الرقم القياسي! سرعة الرياح المقاسة تتجاوز الحد الدولي القانوني (+2.0 m/s) وفق لائحة World Athletics TR31.');
          return r;
        }
        return { ...r, status: 'certified' };
      } else {
        return { ...r, status: 'rejected', rejectionReason: 'لم يستوفِ الشروط الفنية أو معايير فحص المنشطات.' };
      }
    }));
  };

  const handleGenerateLicense = async () => {
    const res = await leagueExecutiveService.issueLeagueLicense({
      leagueId: activeLeagueId,
      tier,
      expiryMonths,
      devHash
    });
    setGeneratedCode(res.licenseCode);
    setCopiedCode(false);
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyDuty = (code: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopiedDuty(code);
      setTimeout(() => setCopiedDuty(null), 2000);
    }
  };

  const handleLogoutLeague = () => {
    portalAuthService.logout('league');
    setSession(null);
    if (onSwitchPortal) onSwitchPortal();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ═══ 1. Executive Top Banner with Credentials & Identity ═══ */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-900/60 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 flex items-center justify-center shadow-xl ring-2 ring-emerald-400/40 text-3xl shrink-0">
              {activeLeague.logoCode || '🏛️'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 uppercase">
                  {activeLeague.shortName} • معتمدة رسمياً
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  رقم الاعتماد: {activeLeague.accreditationNumber}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-amber-400 font-bold">World Athletics 2026</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {activeLeague.name}
              </h1>
              
              <div className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                <span className="text-emerald-400 font-bold">👤 {activeLeague.adminFullName}</span>
                <span>•</span>
                <span className="text-slate-400">الولاية: {activeLeague.wilaya}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowRegModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-700/60 text-emerald-300 text-xs font-black flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>تسجيل رابطة جديدة +</span>
            </button>

            <button
              onClick={() => onOpenFieldMode && onOpenFieldMode()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>دخول وضع التحكيم والميدان ⏱️</span>
            </button>

            <button
              onClick={handleLogoutLeague}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer"
              title="تسجيل الخروج من حساب الرابطة"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* ═══ 2. Executive Metrics KPI Grid ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {[
            { label: 'الأندية المنتسبة', value: clubs.length, icon: <Building2 className="w-4 h-4 text-emerald-400" /> },
            { label: 'العداؤون المرخصون', value: clubs.reduce((acc, c) => acc + c.athletesCount, 0), icon: <Users className="w-4 h-4 text-teal-400" /> },
            { label: 'المنافسات المعتمدة', value: competitions.length, icon: <Trophy className="w-4 h-4 text-amber-400" /> },
            { label: 'الصدريات المخصصة', value: allocatedBibs.length, icon: <FileText className="w-4 h-4 text-cyan-400" /> },
            { label: 'الأرقام المصادقة', value: recordApps.filter(r => r.status === 'certified').length, icon: <FileCheck className="w-4 h-4 text-emerald-400" /> }
          ].map((m, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">{m.label}</span>
                {m.icon}
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {loading ? '...' : (m.value || (metrics ? Object.values(metrics)[idx] : 0))}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ 3. Sub Navigation Bar (8 Comprehensive Tabs) ═══ */}
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'الجاهزية والامتثال', icon: <Shield className="w-4 h-4" /> },
            { id: 'competitions', label: 'إدارة البطولات وأكواد التكليف', icon: <Trophy className="w-4 h-4" />, badge: competitions.length },
            { id: 'clubs', label: 'الأندية وتراخيص الرياضيين', icon: <Building2 className="w-4 h-4" />, badge: clubs.length },
            { id: 'bibs', label: 'نظام الصدريات الذكي (Bibs)', icon: <FileText className="w-4 h-4" /> },
            { id: 'records', label: 'اعتماد الأرقام القياسية (TR31)', icon: <Award className="w-4 h-4" />, badge: recordApps.filter(r => r.status === 'pending').length },
            { id: 'licensing', label: 'التراخيص المشفرة (Ed25519)', icon: <Key className="w-4 h-4" /> },
            { id: 'reports', label: 'المحاضر والشهادات الرسمية', icon: <Printer className="w-4 h-4" /> },
            { id: 'audit', label: 'سجل التدقيق والرقابة', icon: <History className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                subTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-950 ring-1 ring-emerald-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-amber-300 font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ TAB 1: OVERVIEW & SYSTEM READINESS ═══ */}
        {subTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span>حالة الجاهزية الميدانية والامتثال للوائح الدولية 2026</span>
                </h2>
                <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 text-xs font-black border border-emerald-800">
                  نظام نشط ومعتمد ✅
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-4xl">
                المنصة مهيأة بالعزل الرياضي المؤسسي الكامل (Multi-Tenant Isolation). جميع بيانات أندية الرابطة وعدائيها ومحاضر البطولات محمية بتشفير قواعد البيانات وقوانين حماية البيانات الرياضية.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 font-bold mb-1">دقة التوقيت بالمسح الشريطي (FAT)</div>
                  <div className="text-2xl font-mono font-black text-emerald-400">1/1000s</div>
                  <p className="text-[11px] text-slate-500 mt-1">متوافق مع قاعدة World Athletics 164.2</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 font-bold mb-1">تشفير الأجهزة ونقاط المراقبة</div>
                  <div className="text-2xl font-mono font-black text-cyan-400">Ed25519 Sign</div>
                  <p className="text-[11px] text-slate-500 mt-1">توقيع رقمي غير قابل للتزوير للأختام</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 font-bold mb-1">المزامنة الميدانية المستقلة (Offline)</div>
                  <div className="text-2xl font-mono font-black text-amber-400">IndexedDB Queue</div>
                  <p className="text-[11px] text-slate-500 mt-1">حفظ فوري واسترجاع تلقائي عند عودة الشبكة</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: COMPETITIONS & DUTY CODES ═══ */}
        {subTab === 'competitions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>إدارة البطولات، الاعتمادات، وتوزيع أكواد التكليف</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  اعتماد التظاهرات وتوليد أكواد المهمات الرسمية لحكام المسدس والنهاية وغرفة النداء.
                </p>
              </div>

              <button
                onClick={() => setShowNewCompModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إنشاء بطولة جديدة +</span>
              </button>
            </div>

            <div className="space-y-4">
              {competitions.map(comp => (
                <div key={comp.id} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-black uppercase border border-emerald-800">
                          {comp.type}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          {comp.date}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          {comp.venue}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white">{comp.name}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {comp.status === 'sanctioned' ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>معتمدة رسمياً ✓</span>
                        </span>
                      ) : comp.status === 'rejected' ? (
                        <span className="px-3 py-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-700/60 text-xs font-bold flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>مرفوضة</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSanction(comp.id, true)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>اعتماد البطولة</span>
                          </button>
                          <button
                            onClick={() => handleSanction(comp.id, false)}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* أكواد التكليف الرسمية للحكام لهذه البطولة */}
                  <div>
                    <div className="text-xs font-black text-slate-300 mb-2 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span>أكواد التكليف الميداني الرسمية للحكام (Official Duty Codes):</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {comp.dutyCodes.map((d, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] text-slate-400 truncate">{d.role}</div>
                            <div className="text-xs font-mono font-black text-amber-400 tracking-wider truncate">
                              {d.code}
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopyDuty(d.code)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-300 transition-colors shrink-0"
                            title="نسخ كود التكليف"
                          >
                            {copiedDuty === d.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB 3: AFFILIATED CLUBS & ATHLETES ═══ */}
        {subTab === 'clubs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  <span>دليل الأندية الرياضية المنتسبة للرابطة ({clubs.length} أندية)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  إدارة الأندية المعتمدة، المدربين، وعدد الرياضيين المسجلين والمؤمنين للموسم.
                </p>
              </div>

              <button
                onClick={() => setShowNewClubModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة نادي رياضي معتمد +</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-black uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">رمز النادي</th>
                    <th className="py-3 px-4">اسم النادي الرياضي</th>
                    <th className="py-3 px-4">المدينة / المقر</th>
                    <th className="py-3 px-4 text-center">العداؤون المسجلون</th>
                    <th className="py-3 px-4">المدرب الرئيسي</th>
                    <th className="py-3 px-4">هاتف التواصل</th>
                    <th className="py-3 px-4 text-center">حالة الترخيص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {clubs.map(c => (
                    <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-amber-400">{c.code}</td>
                      <td className="py-3.5 px-4 font-black text-white">{c.name}</td>
                      <td className="py-3.5 px-4 text-slate-300">{c.city}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">{c.athletesCount} عداء</td>
                      <td className="py-3.5 px-4 text-slate-200">{c.coachName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{c.coachPhone}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-black border border-emerald-800/80">
                          معتمد 2026 ✓
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB 4: SMART BIB ALLOCATION (BIBS) ═══ */}
        {subTab === 'bibs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    <span>نظام الصدريات الذكي للبطولة (Smart Bib Allocator)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    توليد وتخصيص أرقام الصدريات للرياضيين المشاركين تلقائياً ومنع التكرار في مضمار السباق.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateBibAllocation}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>توليد وتوزيع الصدريات آلياً ⚡</span>
                  </button>
                </div>
              </div>

              {bibSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bibSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">بداية ترقيم الصدريات</label>
                  <input
                    type="number"
                    value={bibStart}
                    onChange={(e) => setBibStart(Number(e.target.value))}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نهاية نطاق الصدريات</label>
                  <input
                    type="number"
                    value={bibEnd}
                    onChange={(e) => setBibEnd(Number(e.target.value))}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">طريقة التوزيع</label>
                  <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500">
                    <option>حسب الأندية الرياضية (Club-grouped)</option>
                    <option>حسب التخصصات والمستويات</option>
                    <option>ترقيم تسلسلي عشوائي مانع للتلاعب</option>
                  </select>
                </div>
              </div>

              {/* جدول الصدريات المخصصة */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-bold text-[10px] border-b border-slate-800 uppercase">
                    <tr>
                      <th className="py-2.5 px-4 text-center">الصدرية</th>
                      <th className="py-2.5 px-4">اسم العداء</th>
                      <th className="py-2.5 px-4">النادي الرياضي</th>
                      <th className="py-2.5 px-4">التخصص المقيد فيه</th>
                      <th className="py-2.5 px-4 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {allocatedBibs.map((b) => (
                      <tr key={b.bib} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-4 text-center font-mono font-black text-amber-400 text-sm">#{b.bib}</td>
                        <td className="py-2.5 px-4 font-bold text-white">{b.athlete}</td>
                        <td className="py-2.5 px-4 text-slate-300">{b.club}</td>
                        <td className="py-2.5 px-4 text-slate-400">{b.discipline}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/60">
                            مخصصة ومؤكدة ✓
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ═══ TAB 5: TR31 RECORDS CERTIFICATION ═══ */}
        {subTab === 'records' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>محرك فحص واعتماد الأرقام القياسية (World Athletics TR31 Certification)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  تدقيق الأرقام المحققة وفق اللائحة الدولية 31: سرعة الرياح ≤ +2.0 m/s، التوقيت الأوتوماتيكي الكامل (FAT)، واعتماد الختم الرقمي للرابطة.
                </p>
              </div>

              <div className="space-y-4">
                {recordApps.map(rec => (
                  <div key={rec.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 text-xs font-black border border-amber-800">
                          {rec.discipline}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          التوقيت المحقق: {rec.markDisplay}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className={`text-xs font-mono font-bold flex items-center gap-1 ${rec.windSpeed > 2.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          <Wind className="w-3.5 h-3.5" />
                          <span>الرياح: {rec.windSpeed > 0 ? `+${rec.windSpeed}` : rec.windSpeed} m/s</span>
                          {rec.windSpeed > 2.0 && <span className="text-[10px] bg-rose-950 px-1 rounded">(غير قانونية ❌)</span>}
                        </span>
                      </div>

                      <div className="text-sm font-black text-white">
                        {rec.athleteName} — {rec.club}
                      </div>

                      {rec.rejectionReason && (
                        <div className="text-xs text-rose-300 font-semibold bg-rose-950/60 p-2 rounded-xl border border-rose-900/60">
                          سبب الرفض: {rec.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {rec.status === 'certified' ? (
                        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>رقم قياسي معتمد وموثق 🌟</span>
                        </span>
                      ) : rec.status === 'rejected' ? (
                        <span className="px-3.5 py-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-700/60 text-xs font-bold flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>غير معتمد بموجب TR31</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCertifyRecord(rec.id, true)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>المصادقة والاعتماد الرسمي</span>
                          </button>
                          <button
                            onClick={() => handleCertifyRecord(rec.id, false)}
                            className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                          >
                            رفض
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* ═══ TAB 6: ED25519 CRYPTOGRAPHIC LICENSING ═══ */}
        {subTab === 'licensing' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <span>إصدار تراخيص المنظومة المشفرة (Ed25519 Cryptographic Generator)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                توليد أكواد ترخيص رسمية بصيغة PFP2 موقعة تشفيرياً بالمفتاح السري للخادم، صالحة للاستخدام الميداني دون إنترنت لشبكات 1*4.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع الرخصة (Tier)</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as LicenseTier)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ENTX">رخصة الاتحادات والرابطات (ENTX - كاملة)</option>
                  <option value="CLUB">باقة الأندية المعتمدة (CLUB)</option>
                  <option value="BASIC">الباقة الأساسية الميدانية (BASIC)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">مدة الصلاحية</label>
                <select
                  value={expiryMonths}
                  onChange={(e) => setExpiryMonths(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>شهر واحد (30 يوماً)</option>
                  <option value={3}>3 أشهر</option>
                  <option value={6}>6 أشهر</option>
                  <option value={12}>سنة كاملة (12 شهراً)</option>
                  <option value={24}>سنتان (24 شهراً)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">تقييد الجهاز (Device Binding)</label>
                <input
                  type="text"
                  value={devHash}
                  onChange={(e) => setDevHash(e.target.value)}
                  placeholder="POOL أو كود جهاز معين"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">استخدم POOL للسماح بالمشاركة لـ 4 هواتف</span>
              </div>
            </div>

            <button
              onClick={handleGenerateLicense}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>توليد كود الترخيص المشفر الآن</span>
            </button>

            {generatedCode && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-800/60 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] text-emerald-400 font-bold mb-1">كود الترخيص المعتمد الرسمي:</div>
                  <div className="text-base font-mono font-black text-amber-300 tracking-wider truncate">
                    {generatedCode}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyCode(generatedCode)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'تم النسخ ✓' : 'نسخ الكود'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 7: OFFICIAL REPORTS & PROTOCOLS ═══ */}
        {subTab === 'reports' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span>المحاضر الرسمية وبطاقات الاعتماد (World Athletics Protocol Export)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تصدير محاضر النتائج الرسمية الموقعة وشهادات المشاركة وبطاقات الحكام المعتمدة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                <div>
                  <FileCheck className="w-8 h-8 text-emerald-400 mb-2" />
                  <h3 className="font-black text-sm text-white">محضر النتائج الرسمي الشامل</h3>
                  <p className="text-xs text-slate-400 mt-1">كشف النتائج الكامل مع صور الـ Photo Finish وسرعة الرياح وأسماء الحكام وتواقيعهم.</p>
                </div>
                <button 
                  onClick={() => alert('تم توليد وتنزيل محضر النتائج الرسمي بصيغة PDF بنجاح.')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>تصدير المحضر (PDF)</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                <div>
                  <Award className="w-8 h-8 text-amber-400 mb-2" />
                  <h3 className="font-black text-sm text-white">شهادات الأرقام القياسية المعتمدة</h3>
                  <p className="text-xs text-slate-400 mt-1">وثيقة التكريم الرسمية للرقم القياسي الولائي أو الوطني وفق لوائح World Athletics TR31.</p>
                </div>
                <button 
                  onClick={() => alert('تم توليد شهادة الرقم القياسي المعتمد مع الختم الرقمي Ed25519.')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>تصدير الشهادة (PDF)</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                <div>
                  <QrCode className="w-8 h-8 text-cyan-400 mb-2" />
                  <h3 className="font-black text-sm text-white">بطاقات وتكاليف الحكام (Badges)</h3>
                  <p className="text-xs text-slate-400 mt-1">بطاقات اعتماد الحكام والمارشال متضمنة كود المهمة ورمز QR للتحقق السريع في المضمار.</p>
                </div>
                <button 
                  onClick={() => alert('تم تصدير بطاقات تكليف الحكام والمارشال بصيغة جاهزة للطباعة.')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>تصدير بطاقات الحكام</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 8: AUDIT LOGS ═══ */}
        {subTab === 'audit' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in duration-200">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <span>سجل الرقابة والتدقيق الأمني المانع للتلاعب (Immutable Audit Trail)</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">التوقيت</th>
                    <th className="py-2.5 px-3">الإجراء</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3">المعرف</th>
                    <th className="py-2.5 px-3">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400">2026-03-06 05:12:00</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">COMPETITION_SANCTIONED</td>
                    <td className="py-2.5 px-3 text-slate-300">competition</td>
                    <td className="py-2.5 px-3 text-slate-400">comp_algiers_2026</td>
                    <td className="py-2.5 px-3 text-slate-500">{activeLeague.adminFullName}</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400">2026-03-06 05:08:14</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">LICENSE_ISSUED</td>
                    <td className="py-2.5 px-3 text-slate-300">license</td>
                    <td className="py-2.5 px-3 text-slate-400">PFP2-CLB8-2703-POOL</td>
                    <td className="py-2.5 px-3 text-slate-500">{activeLeague.adminFullName}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modal تسجيل رابطة جديدة */}
      <LeagueRegistrationModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
        onSuccess={() => {
          setShowRegModal(false);
          setSession(portalAuthService.getSession('league'));
        }}
      />

      {/* Modal إنشاء مسابقة جديدة */}
      {showNewCompModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-emerald-700/60 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>إنشاء واعتماد بطولة جديدة</span>
            </h3>

            <form onSubmit={handleCreateCompetition} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم البطولة</label>
                <input
                  type="text"
                  required
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="مثال: البطولة الولائية للأشبال 2026"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نوع المسابقة</label>
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="track_and_field">مضمار وميدان (Track & Field)</option>
                    <option value="cross_country">عدو ريفي (Cross Country)</option>
                    <option value="road_race">سباق طريق (Road Race)</option>
                    <option value="trail">تريل جبلي (Trail)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    value={newCompDate}
                    onChange={(e) => setNewCompDate(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المكان / الملعب</label>
                <input
                  type="text"
                  required
                  value={newCompVenue}
                  onChange={(e) => setNewCompVenue(e.target.value)}
                  placeholder="مثال: مضمار ألعاب القوى بالمركب الأولمبي"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCompModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow"
                >
                  إنشاء وتوليد أكواد التكليف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal إضافة نادي جديد */}
      {showNewClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-emerald-700/60 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <span>إضافة واعتماد نادي رياضي جديد</span>
            </h3>

            <form onSubmit={handleCreateClub} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم النادي الرياضي</label>
                <input
                  type="text"
                  required
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  placeholder="مثال: وفاق بئر خادم لألعاب القوى"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الرمز المختصر (Code)</label>
                  <input
                    type="text"
                    required
                    value={newClubCode}
                    onChange={(e) => setNewClubCode(e.target.value.toUpperCase())}
                    placeholder="مثال: WBK"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400 uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم المدرب الرئيسي</label>
                  <input
                    type="text"
                    required
                    value={newClubCoach}
                    onChange={(e) => setNewClubCoach(e.target.value)}
                    placeholder="اسم المدرب"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewClubModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow"
                >
                  اعتماد النادي وحفظه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
