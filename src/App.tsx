import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { RoleSelector } from './components/RoleSelector';
import { StartPhoneView } from './components/StartPhoneView';
import { FinishPhoneView } from './components/FinishPhoneView';
import { JudgePhoneView } from './components/JudgePhoneView';
import { PhotoFinishViewer } from './components/PhotoFinishViewer';
import { ResultsPodium } from './components/ResultsPodium';
import { RaceSettingsModal } from './components/RaceSettingsModal';
import { InternetBridgeModal } from './components/InternetBridgeModal';
import { ChambreDappelView } from './components/ChambreDappelView';
import { RaceSchedulePanel } from './components/RaceSchedulePanel';
import { SubscriptionModal } from './components/SubscriptionModal';
import { LicenseTransferModal } from './components/LicenseTransferModal';
import { Runner, PhoneRole, RaceStatus, RaceSettings, NetworkPeerMessage, Heat, LicensePoolInfo } from './types/race';
import { licenseManager } from './services/licenseManager';
import { pricingService } from './services/pricingService';
import { athleticsAudio } from './services/audioService';
import { athleticsNetwork } from './services/networkService';
import { slitScanEngine } from './services/slitScanEngine';
import { opticalGateDetector } from './services/motionDetector';
import { burstCaptureService } from './services/burstCaptureService';
import { athleticsArchive } from './services/archiveService';
import { ArchiveModal } from './components/ArchiveModal';
import { PwaInstallButton } from './components/PwaInstallButton';
import { AdminGate } from './components/AdminGate';
import { CheckpointJudgeView } from './components/checkpoints/CheckpointJudgeView';
import { CheckpointConfigModal } from './components/checkpoints/CheckpointConfigModal';
import { JudgeManagementModal } from './components/checkpoints/JudgeManagementModal';
import { PassageMonitoringDashboard } from './components/checkpoints/PassageMonitoringDashboard';
import { AthleticsCompetition, Checkpoint } from './types/athletics';
import { checkpointStorage } from './services/checkpointStorage';
import { passageSyncEngine } from './services/passageSyncEngine';
import { auditService } from './services/securityService';
import { dispatchNetworkMessage } from './services/messageHandlers/messageDispatcher';
import { NavShell, NavTab } from './components/navigation/NavShell';
import { LwasOfficialPortal } from './components/public/LwasOfficialPortal';
import { CompetitionsEventsPage } from './components/public/CompetitionsEventsPage';
import { LeagueExecutiveSuite, LeagueSubTab } from './components/league/LeagueExecutiveSuite';
import { CoachRegistrationWizard } from './components/coach/CoachRegistrationWizard';
import { DutyCodeCheckIn } from './components/public/DutyCodeCheckIn';
import { PortalAuthModal } from './components/auth/PortalAuthModal';
import { LeagueGate } from './components/league/LeagueGate';
import { CoachGate } from './components/coach/CoachGate';
import { portalAuthService, PortalType, PortalSession } from './services/portalAuthService';
import { useTranslation } from './services/i18nService';
import { ManualTimingConsole } from './components/athletics/ManualTimingConsole';
import { DesignSystemShowcase, GlassLoginPage } from './components/design-system';
import { CompetitionEntriesAndResults } from './components/competitions/CompetitionEntriesAndResults';
import { JudgesManagementOffice } from './components/judges/JudgesManagementOffice';
import { DigitalCompetitionSheetsWorkspace } from './components/sheets/DigitalCompetitionSheetsWorkspace';
import { SmartJudgeWorkspace } from './components/judges/SmartJudgeWorkspace';
import { SmartJudgeDashboard } from './components/judges/SmartJudgeDashboard';
import { judgesAssignmentService, JudgeAssignment, CertifiedJudge } from './services/judgesAssignmentService';
import { LeagueProvider } from './context/LeagueContext';

const DEFAULT_RUNNERS: Runner[] = [
  { id: 1, bib: 101, name: 'يوسف العبدلي', country: 'الجزائر 🇩🇿', lane: 1, color: '#EF4444', finishTime: 0, status: 'OK' },
  { id: 2, bib: 102, name: 'سفيان البقالي', country: 'المغرب 🇲🇦', lane: 2, color: '#3B82F6', finishTime: 0, status: 'OK' },
  { id: 3, bib: 103, name: 'توفيق مخلوفي', country: 'الجزائر 🇩🇿', lane: 3, color: '#10B981', finishTime: 0, status: 'OK' },
  { id: 4, bib: 104, name: 'معتز برشم', country: 'قطر 🇶🇦', lane: 4, color: '#F59E0B', finishTime: 0, status: 'OK' },
];

const DEFAULT_HEATS: Heat[] = [
  {
    id: 'heat-1',
    number: 1,
    name: 'قائمة 1 (تصفية أولى)',
    distance: '100m',
    windSpeed: '+1.2 m/s',
    runners: DEFAULT_RUNNERS,
    status: 'pending'
  },
  {
    id: 'heat-2',
    number: 2,
    name: 'قائمة 2 (تصفية ثانية)',
    distance: '100m',
    windSpeed: '+1.2 m/s',
    runners: [
      { id: 21, bib: 201, name: 'عدنان الطاهر', country: 'الجزائر 🇩🇿', lane: 1, color: '#EF4444', finishTime: 0, status: 'OK' },
      { id: 22, bib: 202, name: 'حكيم الصالحي', country: 'تونس 🇹🇳', lane: 2, color: '#3B82F6', finishTime: 0, status: 'OK' },
      { id: 23, bib: 203, name: 'طارق بوكنزة', country: 'المغرب 🇲🇦', lane: 3, color: '#10B981', finishTime: 0, status: 'OK' },
      { id: 24, bib: 204, name: 'عبد الرحمن صمبا', country: 'قطر 🇶🇦', lane: 4, color: '#F59E0B', finishTime: 0, status: 'OK' },
    ],
    status: 'pending'
  },
  {
    id: 'heat-final',
    number: 3,
    name: 'النهائي الكبير (Final)',
    distance: '100m',
    windSpeed: '+1.2 m/s',
    runners: [
      { id: 31, bib: 301, name: 'أفضل متأهل 1', country: 'المتأهلين', lane: 1, color: '#EF4444', finishTime: 0, status: 'OK' },
      { id: 32, bib: 302, name: 'أفضل متأهل 2', country: 'المتأهلين', lane: 2, color: '#3B82F6', finishTime: 0, status: 'OK' },
      { id: 33, bib: 303, name: 'أفضل متأهل 3', country: 'المتأهلين', lane: 3, color: '#10B981', finishTime: 0, status: 'OK' },
      { id: 34, bib: 304, name: 'أفضل متأهل 4', country: 'المتأهلين', lane: 4, color: '#F59E0B', finishTime: 0, status: 'OK' },
    ],
    status: 'pending'
  }
];

const DEFAULT_SETTINGS: RaceSettings = {
  distance: '100m',
  availableDistances: ['50m', '60m', '100m', '200m', '400m', '800m', '1500m', '4x100m'],
  heatNumber: 1,
  heatName: 'قائمة 1 (تصفية أولى)',
  laneCount: 4,
  finishLineXPercent: 0.35,
  finishLineColor: '#EF4444',
  finishLineWidth: 2,
  preFinishLineXPercent: 0.22,
  preFinishLineColor: '#00E5FF',
  postFinishLineXPercent: 0.52,
  postFinishLineColor: '#A855F7',
  motionThreshold: 20,
  laserBeamVisible: true,
  gunSoundType: 'official_starter_gun',
  soundVolume: 1.8,
  soundPitch: 1.0,
  stadiumAcoustics: true,
  stadiumReverbLevel: 0.65,
  stadiumAmbience: true,
  hapticFeedback: true,
  starterMode: 'auto_random',
  autoDelayDuration: 2.0,
  slitScanWidth: 2,
  windSpeed: '+1.2 m/s',
  autoStopAfterLastRunner: true,
  cameraPlacement: 'side_classic', // الوضعية التاريخية الافتراضية — يُنصح بالتحويل إلى tele_parallel من الإعدادات
};

const getInitialRoleAndRoom = (): { initialRole: PhoneRole; initialRoom: string; initialToken?: string } => {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role')?.toLowerCase();
      const room = params.get('room');
      const token = params.get('token');
      let validRole: PhoneRole = null;
      if (r === 'start' || r === 'finish' || r === 'judge') {
        validRole = r;
      } else if (r === 'chambre' || r === 'chambre_dappel' || r === 'chambre-dappel' || r === 'call_room') {
        validRole = 'chambre_dappel';
      } else if (r === 'checkpoint' || r === 'checkpoint_judge' || r === 'cp') {
        validRole = 'checkpoint_judge';
      } else if (r === 'athletics_manager' || r === 'manager' || r === 'cross_country' || r === 'athletics') {
        validRole = 'athletics_manager';
      } else if (r === 'manual' || r === 'manual_timing' || r === 'timing') {
        validRole = 'manual_timing';
      }
      const validRoom = room ? room.trim().toUpperCase() : 'RACE-2026';
      if (token) {
        athleticsNetwork.sessionToken = token;
      }
      return { initialRole: validRole, initialRoom: validRoom, initialToken: token || undefined };
    }
  } catch (e) {}
  return { initialRole: null, initialRoom: 'RACE-2026' };
};

export const App: React.FC = () => {
  const { dir } = useTranslation();
  const [role, setRole] = useState<PhoneRole>(() => getInitialRoleAndRoom().initialRole);
  const [roomCode, setRoomCode] = useState<string>(() => getInitialRoleAndRoom().initialRoom);
  const [raceStatus, setRaceStatus] = useState<RaceStatus>('waiting');
  const [showSchedulePanel, setShowSchedulePanel] = useState<boolean>(false);
  const [dispatchedHeatId, setDispatchedHeatId] = useState<string | null>(null);
  const [leagueSubTab, setLeagueSubTab] = useState<LeagueSubTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const sub = params.get('sub');
        if (tab === 'planning') return 'planning';
        if (tab === 'competitions-bureau') return 'competitions-bureau';
        if (sub && ['overview', 'competitions', 'planning', 'competitions-bureau', 'clubs_athletes', 'judges', 'reports', 'identity', 'records', 'announcements', 'roles_audit'].includes(sub)) {
          return sub as LeagueSubTab;
        }
      }
    } catch {}
    return 'overview';
  });

  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const tab = new URLSearchParams(window.location.search).get('tab');
        // إعادة توجيه آمنة: مكتب التخطيط ومكتب المنافسات أصبحا مدمجين داخل حساب الرابطة
        if (tab === 'planning' || tab === 'competitions-bureau') {
          return 'league';
        }
        if (tab === 'judges-office' || tab === 'judges' || tab === 'assignments') {
          return 'judges-office';
        }
        if (tab === 'judge-workspace' || tab === 'workspace') {
          return 'judge-workspace';
        }
        if (tab === 'judge-dashboard' || tab === 'dashboard') {
          return 'judge-dashboard';
        }
        const duty = new URLSearchParams(window.location.search).get('duty') || new URLSearchParams(window.location.search).get('dutyCode');
        if (duty) {
          return 'judge-workspace';
        }
        if (tab === 'sheets') {
          return 'sheets';
        }
        if (tab === 'entries') {
          return 'entries';
        }
        if (tab === 'league' || tab === 'coach' || tab === 'competition' || tab === 'analytics' || tab === 'admin' || tab === 'design-system' || tab === 'login' || tab === 'competitions' || tab === 'results') {
          return tab;
        }
      }
    } catch {}
    return 'public';
  });

  const [activeJudgeAssignment, setActiveJudgeAssignment] = useState<JudgeAssignment | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        const duty = p.get('duty') || p.get('dutyCode');
        if (duty) {
          const verified = judgesAssignmentService.verifyDutyCode(duty);
          if (verified.valid && verified.duty) {
            return judgesAssignmentService.getAssignments().find(a => a.dutyCode === verified.duty?.dutyCode) || null;
          }
        }
      }
    } catch {}
    const all = judgesAssignmentService.getAssignments();
    return all.length > 0 ? all[0] : null;
  });

  const [currentJudgeProfile, setCurrentJudgeProfile] = useState<CertifiedJudge | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        const judgeId = p.get('judgeId');
        if (judgeId) {
          return judgesAssignmentService.getJudgeById(judgeId) || null;
        }
        const duty = p.get('duty') || p.get('dutyCode');
        if (duty) {
          const verified = judgesAssignmentService.verifyDutyCode(duty);
          if (verified.valid && verified.duty) {
            return judgesAssignmentService.getJudgeById(verified.duty.judgeId) || null;
          }
        }
      }
    } catch {}
    const judges = judgesAssignmentService.getAllJudges();
    return judges.length > 0 ? judges[0] : null;
  });

  const [judgeAssignmentsList, setJudgeAssignmentsList] = useState<JudgeAssignment[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        const judgeId = p.get('judgeId');
        if (judgeId) {
          return judgesAssignmentService.getAssignmentsForJudge(judgeId);
        }
        const duty = p.get('duty') || p.get('dutyCode');
        if (duty) {
          const verified = judgesAssignmentService.verifyDutyCode(duty);
          if (verified.valid && verified.duty) {
            return judgesAssignmentService.getAssignmentsForJudge(verified.duty.judgeId);
          }
        }
      }
    } catch {}
    const judges = judgesAssignmentService.getAllJudges();
    if (judges.length > 0) {
      const asgs = judgesAssignmentService.getAssignmentsForJudge(judges[0].id);
      if (asgs.length > 0) return asgs;
    }
    return judgesAssignmentService.getAssignments();
  });
  const [activeLeague] = useState<string>('الرابطة الولائية لألعاب القوى - سعيدة');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [targetAuthPortal, setTargetAuthPortal] = useState<PortalType>('league');
  const [leagueSession, setLeagueSession] = useState<PortalSession | null>(() => portalAuthService.getSession('league'));
  const [coachSession, setCoachSession] = useState<PortalSession | null>(() => portalAuthService.getSession('coach'));

  useEffect(() => {
    const unsub = portalAuthService.subscribe(() => {
      setLeagueSession(portalAuthService.getSession('league'));
      setCoachSession(portalAuthService.getSession('coach'));
    });
    return unsub;
  }, []);

  // مزامنة عنوان URL مع الدور والغرفة ورمز الجلسة الحالية دون إعادة تحميل الصفحة
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const currentRole = url.searchParams.get('role');
        const currentRoom = url.searchParams.get('room');
        const currentToken = url.searchParams.get('token');

        let changed = false;
        if (role) {
          if (currentRole !== role) { url.searchParams.set('role', role); changed = true; }
        } else {
          if (currentRole) { url.searchParams.delete('role'); changed = true; }
        }
        if (currentRoom !== roomCode) {
          url.searchParams.set('room', roomCode);
          changed = true;
        }
        if (athleticsNetwork.sessionToken && currentToken !== athleticsNetwork.sessionToken) {
          url.searchParams.set('token', athleticsNetwork.sessionToken);
          changed = true;
        }

        if (changed) {
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (e) {}
  }, [role, roomCode]);

  // استرجاع القوائم والسلاسل من التخزين المحلي
  const [heats, setHeats] = useState<Heat[]>(() => {
    try {
      const saved = localStorage.getItem('photo_finish_heats_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load heats from localStorage', e);
    }
    return DEFAULT_HEATS;
  });

  const [currentHeatIndex, setCurrentHeatIndex] = useState<number>(0);

  // استرجاع الإعدادات من التخزين المحلي (localStorage)
  const [settings, setSettings] = useState<RaceSettings>(() => {
    try {
      const saved = localStorage.getItem('photo_finish_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          availableDistances: parsed.availableDistances?.length ? parsed.availableDistances : DEFAULT_SETTINGS.availableDistances,
          stadiumAcoustics: parsed.stadiumAcoustics ?? DEFAULT_SETTINGS.stadiumAcoustics,
          stadiumReverbLevel: parsed.stadiumReverbLevel ?? DEFAULT_SETTINGS.stadiumReverbLevel,
          stadiumAmbience: parsed.stadiumAmbience ?? DEFAULT_SETTINGS.stadiumAmbience,
          soundVolume: parsed.soundVolume ?? DEFAULT_SETTINGS.soundVolume,
          soundPitch: parsed.soundPitch ?? DEFAULT_SETTINGS.soundPitch,
        };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [runners, setRunners] = useState<Runner[]>(() => {
    try {
      const saved = localStorage.getItem('photo_finish_runners');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load runners from localStorage', e);
    }
    return DEFAULT_RUNNERS;
  });

  const [clockTimeMs, setClockTimeMs] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // مراجع مستمرة لمنع Stale Closures ولتحديث حالة المزامنة دون إعادة بناء شبكة الاتصال
  const runnersRef = useRef<Runner[]>(runners);
  const heatsRef = useRef<Heat[]>(heats);
  const raceStatusRef = useRef<RaceStatus>(raceStatus);
  const clockTimeMsRef = useRef<number>(clockTimeMs);
  const currentHeatIndexRef = useRef<number>(currentHeatIndex);

  useEffect(() => { runnersRef.current = runners; }, [runners]);
  useEffect(() => { heatsRef.current = heats; }, [heats]);
  useEffect(() => { raceStatusRef.current = raceStatus; }, [raceStatus]);
  useEffect(() => { clockTimeMsRef.current = clockTimeMs; }, [clockTimeMs]);
  useEffect(() => { currentHeatIndexRef.current = currentHeatIndex; }, [currentHeatIndex]);

  // حالات جرس لفت الانتباه وفحص الإشارة
  const [isHoldingBellButton, setIsHoldingBellButton] = useState<boolean>(false);
  const [isPeerSirenRinging, setIsPeerSirenRinging] = useState<boolean>(false);
  const [isReceivingBellAlert, setIsReceivingBellAlert] = useState<boolean>(false);
  const bellHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // النوافذ المشروطة (Modals) وحالة التراخيص والاشتراك
  const [showPhotoFinishViewer, setShowPhotoFinishViewer] = useState<boolean>(false);
  const [showPodium, setShowPodium] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showInternetBridgeModal, setShowInternetBridgeModal] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [activeLicense, setActiveLicense] = useState(() => licenseManager.activeLicense);
  const [sharedPoolLicense, setSharedPoolLicense] = useState<LicensePoolInfo | null>(() => licenseManager.sharedPoolLicense);
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(() => pricingService.isTrialExpired());
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);

  // ═══ منظومة ألعاب القوى ونقاط المراقبة الجديدة ═══
  const [currentCompetition, setCurrentCompetition] = useState<AthleticsCompetition | null>(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showJudgesModal, setShowJudgesModal] = useState<boolean>(false);

  useEffect(() => {
    checkpointStorage.listCompetitions().then((comps) => {
      let activeComp: AthleticsCompetition;
      if (comps.length > 0) {
        activeComp = comps[0];
      } else {
        activeComp = {
          id: 'comp_cc_default',
          name: 'بطولة العدو الريفي الرسمية 8 كم',
          type: 'cross_country',
          venue: 'غابة بوشاوي',
          date: new Date().toISOString().split('T')[0],
          distanceKm: 8,
          lapCount: 4,
          category: 'SENIOR',
          gender: 'M',
          checkpoints: [
            { id: 'cp_start', code: 'START', name: 'خط الانطلاق', distanceKm: 0, type: 'start', requiredLaps: [1], order: 0, assignedJudgeIds: [] },
            { id: 'cp_01', code: 'CP01', name: 'نقطة جسر الوادي', distanceKm: 1.0, type: 'intermediate', requiredLaps: [1, 2, 3, 4], order: 1, assignedJudgeIds: [] },
            { id: 'cp_02', code: 'CP02', name: 'منعرج الصنوبر', distanceKm: 2.0, type: 'intermediate', requiredLaps: [1, 2, 3, 4], order: 2, assignedJudgeIds: [] },
            { id: 'cp_finish', code: 'FINISH', name: 'خط النهاية', distanceKm: 8.0, type: 'finish', requiredLaps: [4], order: 3, assignedJudgeIds: [] },
          ],
          scheduledStartTime: '10:00',
          status: 'ready',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        checkpointStorage.saveCompetition(activeComp);
      }
      setCurrentCompetition(activeComp);

      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        const cpParam = p.get('cp');
        if (cpParam) {
          const found = activeComp.checkpoints.find(c => c.id === cpParam || c.code.toLowerCase() === cpParam.toLowerCase());
          if (found) setSelectedCheckpoint(found);
          else setSelectedCheckpoint(activeComp.checkpoints[0]);
        } else {
          setSelectedCheckpoint(activeComp.checkpoints[0]);
        }
      }
    });
  }, []);

  useEffect(() => {
    const unsubLicense = licenseManager.subscribe(() => {
      setActiveLicense(licenseManager.activeLicense);
      setSharedPoolLicense(licenseManager.sharedPoolLicense);
    });
    const unsubPricing = pricingService.subscribe(() => {
      setIsTrialExpired(pricingService.isTrialExpired());
    });
    return () => {
      unsubLicense();
      unsubPricing();
    };
  }, []);

  // شرط قفل التطبيق الإجباري: انتهاء الـ 7 أيام التجريبية مع عدم وجود اشتراك نشط أو مشاركة شبكية 1*4
  const isAppLocked = isTrialExpired && !activeLicense && !sharedPoolLicense;

  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const raceStartTimeRef = useRef<number>(0);

  // حفظ القوائم تلقائياً
  useEffect(() => {
    try {
      localStorage.setItem('photo_finish_heats_v3', JSON.stringify(heats));
    } catch (e) {}
  }, [heats]);

  // مرجع دائم لأحدث الإعدادات لتجنب الـ Stale Closures في شبكة الاتصال
  const settingsRef = useRef<RaceSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
    athleticsAudio.globalVolume = settings.soundVolume ?? 1.8;
    athleticsAudio.globalPitch = settings.soundPitch ?? 1.0;
    athleticsAudio.stadiumAcoustics = settings.stadiumAcoustics ?? true;
    athleticsAudio.stadiumReverbLevel = settings.stadiumReverbLevel ?? 0.65;
    athleticsAudio.stadiumAmbience = settings.stadiumAmbience ?? true;
    athleticsAudio.hapticEnabled = settings.hapticFeedback ?? true;
  }, [settings]);

  // إيقاف واستمرار عداد الساعة بدقة عالية
  const startLocalClock = useCallback((officialStartTime: number) => {
    raceStartTimeRef.current = officialStartTime;
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);

    clockIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - raceStartTimeRef.current;
      setClockTimeMs(Math.max(0, elapsed));
    }, 10);
  }, []);

  const stopLocalClock = useCallback(() => {
    if (clockIntervalRef.current) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }
  }, []);

  // حفظ السباق المكتمل في الأرشيف الدائم (IndexedDB) — يعمل بدون إنترنت ولا تُفقد النتائج
  const saveRaceToArchive = useCallback((opts: { runners: Runner[]; fullPhotoFinishUrl?: string }) => {
    try {
      const heat = heatsRef.current[currentHeatIndexRef.current];
      athleticsArchive
        .saveRace({
          roomCode: roomCode,
          heatId: heat?.id || 'heat',
          heatName: heat?.name || settingsRef.current.heatName,
          heatNumber: heat?.number ?? settingsRef.current.heatNumber,
          distance: heat?.distance || settingsRef.current.distance,
          windSpeed: heat?.windSpeed || settingsRef.current.windSpeed,
          laneCount: settingsRef.current.laneCount,
          completedAt: Date.now(),
          runners: opts.runners.map((r) => ({
            bib: r.bib,
            name: r.name,
            country: r.country,
            lane: r.lane,
            finishTime: r.finishTime,
            rank: r.rank,
            status: r.status,
          })),
          fullPhotoFinishUrl: opts.fullPhotoFinishUrl,
        })
        .then((id) => console.log('[Archive] ✅ تم حفظ السباق في الأرشيف الدائم:', id))
        .catch(() => {});
    } catch (e) {}
  }, [roomCode]);

  // إعادة ضبط محلية فورية
  const handleLocalReset = useCallback(() => {
    setRaceStatus('waiting');
    stopLocalClock();
    setClockTimeMs(0);
    setRunners(prev => prev.map(r => ({ ...r, finishTime: 0, rank: undefined, status: 'OK', crossingSnapshot: undefined })));
    slitScanEngine.reset();
    burstCaptureService.reset();
    opticalGateDetector.reset();
    setShowPodium(false);
    setShowPhotoFinishViewer(false);
  }, [stopLocalClock]);

  // استقبال ومعالجة رسائل شبكة P2P بين الهواتف
  const handleIncomingMessage = useCallback((msg: NetworkPeerMessage) => {
    dispatchNetworkMessage(msg, {
      role,
      clockOffsetMs: athleticsNetwork.clockOffsetMs || 0,
      getSettings: () => settingsRef.current,
      getRunners: () => runnersRef.current,
      getHeats: () => heatsRef.current,
      getCurrentHeatIndex: () => currentHeatIndexRef.current,
      getRaceStatus: () => raceStatusRef.current,
      getClockTimeMs: () => clockTimeMsRef.current,

      setRaceStatus,
      startLocalClock,
      stopLocalClock,
      handleLocalReset,

      setRunners,
      setSettings,
      setHeats,
      setCurrentHeatIndex,
      setDispatchedHeatId,
      setShowPodium,
      setSharedPoolLicense,

      setIsHoldingBellButton,
      setIsPeerSirenRinging,
      setIsReceivingBellAlert,

      saveRaceToArchive,
    });
  }, [handleLocalReset, startLocalClock, stopLocalClock, role, saveRaceToArchive]);

  // بث التفعيل الشبكي 1*4 للهواتف الثلاثة الأخرى عند الدخول للغرفة
  useEffect(() => {
    if (role) {
      const pool = licenseManager.createPoolShareMessage(role);
      if (pool) {
        athleticsNetwork.sendMessage({
          type: 'LICENSE_SHARE_POOL',
          timestamp: Date.now(),
          senderTime: Date.now(),
          payload: pool
        });
      }
    }
  }, [role, roomCode]);

  // إرسال واستجابة جرس لفت الانتباه وفحص الإشارة
  const handleStopBellSignal = useCallback(() => {
    setIsHoldingBellButton(false);
    setIsPeerSirenRinging(false);
    if (bellHoldTimeoutRef.current) {
      clearTimeout(bellHoldTimeoutRef.current);
      bellHoldTimeoutRef.current = null;
    }
    athleticsNetwork.sendMessage({
      type: 'BELL_SIGNAL_STOP',
      timestamp: Date.now(),
      senderTime: Date.now()
    });
  }, []);

  const handleStartBellSignal = useCallback(() => {
    setIsHoldingBellButton(true);
    setIsPeerSirenRinging(false);
    athleticsAudio.triggerHaptic([70]);

    athleticsNetwork.sendMessage({
      type: 'BELL_SIGNAL_START',
      timestamp: Date.now(),
      senderTime: Date.now()
    });

    if (bellHoldTimeoutRef.current) clearTimeout(bellHoldTimeoutRef.current);
    bellHoldTimeoutRef.current = setTimeout(() => {
      handleStopBellSignal();
    }, 20000);
  }, [handleStopBellSignal]);

  // مرجع ثابت لمعالج الرسائل يمنع تدمير وإعادة بناء شبكة الاتصال عند كل تغيير في الحالة
  const incomingMessageRef = useRef<(msg: NetworkPeerMessage) => void>(handleIncomingMessage);
  useEffect(() => {
    incomingMessageRef.current = handleIncomingMessage;
  }, [handleIncomingMessage]);

  // إعداد شبكة الاتصال - لا يتم تدميرها إلا عند تغيير الدور أو كود الغرفة فعلياً
  useEffect(() => {
    if (role) {
      passageSyncEngine.attachNetwork((msg) => athleticsNetwork.sendMessage(msg));
      athleticsNetwork.init(
        role,
        roomCode,
        (msg) => {
          if (incomingMessageRef.current) {
            incomingMessageRef.current(msg);
          }
        },
        (connected, latency) => {
          setIsConnected(connected);
          setLatencyMs(latency);
        }
      );
    }
    return () => {
      athleticsNetwork.disconnect();
      stopLocalClock();
    };
  }, [role, roomCode, stopLocalClock]);

  // أحداث هاتف البداية (Starter Commands)
  const handleCommandOnMarks = () => {
    setRaceStatus('on_marks');
    athleticsAudio.playBeep(440, 0.2);
    athleticsAudio.speakArabic('خذ مكانك');
    athleticsNetwork.sendMessage({
      type: 'ON_MARKS',
      timestamp: Date.now(),
      senderTime: Date.now()
    });
  };

  const handleCommandSet = () => {
    setRaceStatus('set');
    athleticsAudio.playBeep(660, 0.25);
    athleticsAudio.speakArabic('استعد');
    athleticsNetwork.sendMessage({
      type: 'SET',
      timestamp: Date.now(),
      senderTime: Date.now()
    });
  };

  const handleFireGun = () => {
    const now = Date.now();
    const perfNow = performance.now();
    setRaceStatus('racing');

    const soundType = settingsRef.current.gunSoundType;
    const soundVol = settingsRef.current.soundVolume;
    const soundPitch = settingsRef.current.soundPitch;

    athleticsAudio.playStarterSound(soundVol, soundPitch);
    startLocalClock(now);

    athleticsNetwork.sendMessage({
      type: 'START_GUN',
      timestamp: now,
      senderTime: now,
      perfNow,
      payload: {
        startTime: now,
        perfNow,
        soundType,
        soundVolume: soundVol,
        soundPitch,
      }
    });
  };

  const handleRecallGun = () => {
    setRaceStatus('false_start');
    athleticsAudio.playRecallGun(
      settingsRef.current.soundVolume,
      settingsRef.current.soundPitch
    );
    stopLocalClock();

    athleticsNetwork.sendMessage({
      type: 'RECALL_GUN',
      timestamp: Date.now(),
      senderTime: Date.now()
    });
  };

  // أحداث هاتف النهاية وحساس خط النهاية اللحظي
  const handleLaneFinish = (lane: number, timeMs: number, snapshotUrl?: string) => {
    setRunners(prev => {
      const alreadyFinishedCount = prev.filter(r => r.finishTime > 0).length;
      const currentRank = alreadyFinishedCount + 1;

      const updated = prev.map(r => r.lane === lane ? {
        ...r,
        finishTime: timeMs,
        rank: currentRank,
        crossingSnapshot: snapshotUrl || r.crossingSnapshot,
      } : r);

      // بث زمن وترتيب وصورة وصول الرواق لجميع الهواتف المتصلة (هاتف 1، 2، 3)
      athleticsNetwork.sendMessage({
        type: 'LANE_FINISH',
        timestamp: Date.now(),
        senderTime: Date.now(),
        payload: { 
          lane, 
          timeMs, 
          rank: currentRank,
          snapshotUrl 
        }
      });

      const allFinished = updated.every(r => r.finishTime > 0);
      if (allFinished && settingsRef.current.autoStopAfterLastRunner) {
        setTimeout(() => {
          const panorama = slitScanEngine.exportCroppedPhotoFinishDataUrl(settingsRef.current.laneCount, updated);
          handleFinishRace(panorama || undefined);
        }, 400);
      }
      return updated;
    });
  };

  const handleFinishRace = (panoramaUrl?: string) => {
    setRaceStatus('finished');
    stopLocalClock();
    athleticsAudio.playWhistle(
      0.5,
      2,
      settingsRef.current.soundVolume,
      settingsRef.current.soundPitch
    );
    setShowPodium(true);

    const fullPanorama = panoramaUrl || slitScanEngine.exportCroppedPhotoFinishDataUrl(settingsRef.current.laneCount, runners);

    // تحديث حالة السلسلة الحالية كمكتملة وحفظ شريط المسح البانورامي
    setHeats(prev => {
      const updated = [...prev];
      if (updated[currentHeatIndex]) {
        updated[currentHeatIndex].status = 'completed';
        updated[currentHeatIndex].completedAt = Date.now();
        updated[currentHeatIndex].runners = runners;
        updated[currentHeatIndex].fullPhotoFinishUrl = fullPanorama || undefined;
      }
      return updated;
    });

    athleticsNetwork.sendMessage({
      type: 'RACE_COMPLETE',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { 
        runners,
        fullPhotoFinishUrl: fullPanorama || undefined
      }
    });

    // أرشفة السباق المكتمل تلقائياً مع شريط الـ Photo Finish الرسمي
    saveRaceToArchive({
      runners: runnersRef.current.length > 0 ? runnersRef.current : runners,
      fullPhotoFinishUrl: fullPanorama || undefined,
    });

    if (fullPanorama) {
      athleticsNetwork.sendMessage({
        type: 'SLIT_SCAN_IMAGE',
        timestamp: Date.now(),
        senderTime: Date.now(),
        payload: { fullPhotoFinishUrl: fullPanorama }
      });
    }
  };

  // زر مشترك لإعادة البدء في سباق جديد في الهواتف الثلاثة معاً
  const handleSharedResetRace = () => {
    handleLocalReset();
    athleticsNetwork.sendMessage({
      type: 'SYNC_RESET_ALL',
      timestamp: Date.now(),
      senderTime: Date.now()
    });
  };

  // تبديل القائمة / السلسلة
  const handleSelectHeat = (index: number) => {
    if (index < 0 || index >= heats.length) return;
    
    // حفظ حالة العدائين الحالية في السلسلة السابقة
    setHeats(prev => {
      const updated = [...prev];
      if (updated[currentHeatIndex]) {
        updated[currentHeatIndex].runners = runners;
      }
      return updated;
    });

    setCurrentHeatIndex(index);
    const targetHeat = heats[index];
    if (targetHeat) {
      setRunners(targetHeat.runners);
      setSettings(prev => ({
        ...prev,
        distance: targetHeat.distance || prev.distance,
        heatNumber: targetHeat.number,
        heatName: targetHeat.name
      }));
      handleLocalReset();

      athleticsNetwork.sendMessage({
        type: 'HEAT_CHANGE',
        timestamp: Date.now(),
        senderTime: Date.now(),
        payload: {
          heatIndex: index,
          heat: targetHeat
        }
      });
    }
  };

  // إضافة قائمة / تصفية جديدة مع إمكانية تحديد الاسم والمسافة
  const handleAddNewHeat = (customName?: string, customDistance?: string) => {
    const newNum = heats.length + 1;
    const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#EAB308'];
    const dist = customDistance || settings.distance;
    const name = customName || `${dist} Série ${newNum}`;

    const newHeat: Heat = {
      id: `heat-${Date.now()}`,
      number: newNum,
      name,
      distance: dist,
      windSpeed: settings.windSpeed,
      runners: Array.from({ length: settings.laneCount }).map((_, i) => ({
        id: Date.now() + i,
        bib: newNum * 100 + i + 1,
        name: `عداء الرواق ${i + 1}`,
        country: 'فريق محلي',
        lane: i + 1,
        color: colors[i % colors.length],
        finishTime: 0,
        status: 'OK'
      })),
      status: 'pending'
    };

    const updated = [...heats, newHeat];
    setHeats(updated);
    handleSelectHeat(updated.length - 1);

    athleticsNetwork.sendMessage({
      type: 'HEATS_SYNC',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heats: updated }
    });
  };

  // حذف قائمة/سلسلة سباق
  const handleDeleteHeat = (heatId: string) => {
    const updated = heats.filter(h => h.id !== heatId);
    if (updated.length === 0) return; // الحفاظ على قائمة واحدة على الأقل
    setHeats(updated);

    if (currentHeatIndex >= updated.length) {
      handleSelectHeat(updated.length - 1);
    } else {
      handleSelectHeat(currentHeatIndex);
    }

    athleticsNetwork.sendMessage({
      type: 'DELETE_HEAT',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heatId }
    });

    athleticsNetwork.sendMessage({
      type: 'HEATS_SYNC',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heats: updated }
    });
  };

  // إعادة ترتيب القوائم يدوياً أو تلقائياً
  const handleReorderHeats = (newHeats: Heat[]) => {
    setHeats(newHeats);
    athleticsNetwork.sendMessage({
      type: 'HEATS_REORDER',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heats: newHeats }
    });
  };

  // بث جميع القوائم والعدائين فورياً لجميع الهواتف
  const handleBroadcastHeats = () => {
    athleticsNetwork.sendMessage({
      type: 'HEATS_SYNC',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heats }
    });
  };

  // تحديد القائمة المعنية وبث أمر "إلى خط الانطلاق (Au Départ) 🏁" من هاتف 1
  const handleDispatchHeat = (heatId: string) => {
    const targetIndex = heats.findIndex(h => h.id === heatId);
    if (targetIndex < 0) return;

    setDispatchedHeatId(heatId);
    const updated = heats.map((h) => ({
      ...h,
      isDispatched: h.id === heatId,
      dispatchedAt: h.id === heatId ? Date.now() : h.dispatchedAt
    }));

    setHeats(updated);
    handleSelectHeat(targetIndex);

    // صوت إشعار الانطلاق
    athleticsAudio.playWhistle(0.4, 2, settings.soundVolume, settings.soundPitch);

    athleticsNetwork.sendMessage({
      type: 'HEAT_DISPATCH',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: {
        heatId,
        heatIndex: targetIndex,
        heat: updated[targetIndex]
      }
    });

    athleticsNetwork.sendMessage({
      type: 'HEATS_SYNC',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heats: updated }
    });
  };

  // إلغاء أمر خط الانطلاق وسحب القائمة (Annuler / Rappel)
  const handleCancelDispatchHeat = (heatId?: string) => {
    setDispatchedHeatId(null);
    setRaceStatus('waiting');
    const updated = heats.map(h => ({
      ...h,
      isDispatched: false,
      dispatchedAt: undefined
    }));
    setHeats(updated);

    athleticsAudio.playBeep(300, 0.3);

    athleticsNetwork.sendMessage({
      type: 'HEAT_CANCEL_DISPATCH',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heatId }
    });

    athleticsNetwork.sendMessage({
      type: 'HEATS_SYNC',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heats: updated }
    });
  };

  // تعديل حكم الهاتف الثالث لعداء محدد
  const handleJudgeUpdateRunner = (lane: number, updates: Partial<Runner>) => {
    let prevRunner: Runner | undefined;
    setRunners(prev => {
      prevRunner = prev.find(r => r.lane === lane);
      const updated = prev.map(r => r.lane === lane ? { ...r, ...updates } : r);
      if (updates.finishTime !== undefined) {
        const sortedLanes = [...updated]
          .filter(r => r.finishTime > 0)
          .sort((a, b) => a.finishTime - b.finishTime);
        const rankMap = new Map<number, number>();
        sortedLanes.forEach((r, idx) => { rankMap.set(r.lane, idx + 1); });
        return updated.map(r => rankMap.has(r.lane) ? { ...r, rank: rankMap.get(r.lane)! } : r);
      }
      return updated;
    });

    // تسجيل التعديل في سجل التدقيق الأمني الميداني (Immutable Audit Log)
    if (prevRunner) {
      const runnerName = (prevRunner as Runner).name || `عداء حارة ${lane}`;
      auditService.log({
        actorRole: role || 'judge',
        action: updates.finishTime !== undefined ? 'JUDGE_UPDATE_TIME' : 'JUDGE_UPDATE_RUNNER',
        target: `حارة ${lane} (${runnerName})`,
        oldValue: { finishTime: (prevRunner as Runner).finishTime, rank: (prevRunner as Runner).rank },
        newValue: updates,
        reason: 'تعديل توقيت/بيانات العداء من لوحة التحكيم'
      }).catch(err => console.warn('[Audit] Failed to log entry:', err));
    }

    athleticsNetwork.sendMessage({
      type: 'JUDGE_UPDATE_RUNNER',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { lane, updates }
    });
  };

  // تحديث قائمة العدائين وتوزيع الأروقة
  const handleUpdateRunnersList = (newRunners: Runner[]) => {
    setRunners(newRunners);
    const updatedHeats = heats.map((h, idx) => 
      idx === currentHeatIndex ? { ...h, runners: newRunners } : h
    );
    setHeats(updatedHeats);

    athleticsNetwork.sendMessage({
      type: 'SETTINGS_SYNC',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { 
        settings, 
        runners: newRunners,
        heatIndex: currentHeatIndex,
        heats: updatedHeats
      }
    });

    athleticsNetwork.sendMessage({
      type: 'HEATS_SYNC',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { heats: updatedHeats }
    });
  };

  // اعتماد وتدقيق توقيت العداء من نافذة الـ Photo Finish
  const handleUpdateRunnerTime = (lane: number, verifiedTimeMs: number) => {
    handleJudgeUpdateRunner(lane, { finishTime: verifiedTimeMs });
  };

  // حفظ الإعدادات ومزامنتها محلياً وشبكياً
  const handleSaveSettings = (newSettings: RaceSettings, newRunners: Runner[]) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    setRunners(newRunners);

    try {
      localStorage.setItem('photo_finish_settings', JSON.stringify(newSettings));
      localStorage.setItem('photo_finish_runners', JSON.stringify(newRunners));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }

    athleticsNetwork.sendMessage({
      type: 'SETTINGS_SYNC',
      timestamp: Date.now(),
      senderTime: Date.now(),
      payload: { settings: newSettings, runners: newRunners }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black" dir={dir}>
      {/* راية وتنبيه استلام جرس لفت الانتباه ورنين صفارة الشرطة من الهاتف الآخر */}
      {isReceivingBellAlert && (
        <div className="fixed top-14 inset-x-3 z-50 p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white border-2 border-yellow-300 shadow-2xl shadow-rose-600/50 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400 text-slate-950 rounded-xl font-black text-xl animate-bounce shadow">
              🚨
            </div>
            <div>
              <div className="font-black text-sm text-yellow-300">
                إشارة تنبيه واردة من الهاتف الآخر (Signal Alert)!
              </div>
              <div className="text-xs text-rose-100 font-medium">
                صفارة الشرطة ترن الآن لتأكيد اتصال الإشارة • ستتوقف فور إفلات الزر من الهاتف الآخر
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setIsReceivingBellAlert(false);
              athleticsAudio.stopPoliceSiren();
            }}
            className="px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 text-yellow-300 border border-yellow-400/50 text-xs font-bold transition-all shadow cursor-pointer"
          >
            كتم يدوي
          </button>
        </div>
      )}

      {/* شريط التنقل المتعدد للرابطات والمنظومة العامة — يظهر عند عدم تخصيص دور هاتف ميداني */}
      {!role && (
        <NavShell
          currentTab={currentTab}
          onOpenManualTiming={() => setRole("manual_timing")}
          onOpenAuthModal={(target) => {
            setTargetAuthPortal(target || 'league');
            setAuthModalMode('login');
            setShowAuthModal(true);
          }}
          onTabChange={(tab) => {
            if (tab === 'planning' || tab === 'competitions-bureau') {
              setLeagueSubTab(tab);
              setCurrentTab('league');
              try {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'league');
                url.searchParams.set('sub', tab);
                window.history.replaceState({}, '', url.toString());
              } catch {}
              return;
            }
            setCurrentTab(tab);
            try {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', tab);
              url.searchParams.delete('sub');
              window.history.replaceState({}, '', url.toString());
            } catch {}
          }}
        />
      )}

      {/* الشريط العلوي الميداني مع جرس التنبيه وتفاصيل القائمة — يظهر أثناء التحكيم أو وضع المنافسة */}
      {(role || currentTab === 'competition') && role !== 'checkpoint_judge' && role !== 'athletics_manager' && (
        <Header
          role={role}
          roomCode={roomCode}
          isConnected={isConnected}
          latencyMs={latencyMs}
          isMuted={isMuted}
          heatNumber={settings.heatNumber}
          heatName={settings.heatName}
          onToggleMute={() => {
            athleticsAudio.isMuted = !isMuted;
            setIsMuted(!isMuted);
          }}
          onChangeRole={() => setRole(null)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenInternetBridge={() => setShowInternetBridgeModal(true)}
          onOpenSchedulePanel={() => setShowSchedulePanel(true)}
          onOpenSubscriptionModal={() => setShowSubscriptionModal(true)}
          onOpenTransferModal={() => setShowTransferModal(true)}
          sharedPoolLicense={sharedPoolLicense}
          onOpenArchive={() => setShowArchiveModal(true)}
          onSharedResetRace={handleSharedResetRace}
          onStartBellSignal={handleStartBellSignal}
          onStopBellSignal={handleStopBellSignal}
          isHoldingBell={isHoldingBellButton}
          isPeerSirenRinging={isPeerSirenRinging}
        />
      )}

      {/* الشاشات الرئيسية حسب دور الهاتف المختار أو التبويب النشط */}
      <main className="flex-1 flex flex-col">
        {!role && currentTab === 'design-system' && (
          <DesignSystemShowcase />
        )}

        {!role && currentTab === 'login' && (
          <GlassLoginPage
            initialPortal={targetAuthPortal}
            onSuccess={(sess) => {
              if (sess.portal === 'league') {
                setLeagueSession(sess);
                setCurrentTab('league');
              } else if (sess.portal === 'coach') {
                setCoachSession(sess);
                setCurrentTab('coach');
              } else if (sess.portal === 'judge') {
                setCurrentTab('competition');
              } else if (sess.portal === 'admin') {
                setCurrentTab('admin');
              }
            }}
            onBack={() => setCurrentTab('public')}
          />
        )}

                {!role && currentTab === 'sheets' && (
          <DigitalCompetitionSheetsWorkspace 
            onBackToHome={() => setCurrentTab('public')}
            onOpenFieldMode={() => setCurrentTab('competition')}
          />
        )}

        {!role && currentTab === 'entries' && (
          <CompetitionEntriesAndResults 
            onBackToHome={() => setCurrentTab('public')}
            onOpenFieldMode={() => setCurrentTab('competition')}
          />
        )}

        {!role && currentTab === 'judges-office' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
            <JudgesManagementOffice />
          </div>
        )}

        {!role && currentTab === 'judge-workspace' && activeJudgeAssignment && (
          <SmartJudgeWorkspace
            assignment={activeJudgeAssignment}
            onBackToDashboard={() => {
              if (judgeAssignmentsList.length > 1 && currentJudgeProfile) {
                setCurrentTab('judge-dashboard');
              } else {
                setCurrentTab('judges-office');
              }
            }}
            otherAssignments={judgeAssignmentsList}
            onSwitchAssignment={(asg) => setActiveJudgeAssignment(asg)}
          />
        )}

        {!role && currentTab === 'judge-dashboard' && (
          <SmartJudgeDashboard
            judge={currentJudgeProfile || judgesAssignmentService.getAllJudges()[0]}
            assignments={judgeAssignmentsList.length > 0 ? judgeAssignmentsList : judgesAssignmentService.getAssignments()}
            activeCompetition={currentCompetition as any}
            onSelectAssignment={(asg) => {
              setActiveJudgeAssignment(asg);
              setCurrentTab('judge-workspace');
            }}
            onLogout={() => {
              setCurrentJudgeProfile(null);
              setActiveJudgeAssignment(null);
              setCurrentTab('public');
            }}
            onOpenAssignmentsOffice={() => setCurrentTab('judges-office')}
          />
        )}

        {!role && (currentTab === 'competitions' || currentTab === 'results') && (
          <CompetitionsEventsPage
            onBackToHome={() => setCurrentTab('public')}
            onOpenFieldMode={() => setCurrentTab('competition')}
          />
        )}

        {!role && currentTab === 'public' && (
          <LwasOfficialPortal 
            onEnterFieldMode={() => setCurrentTab('competition')} 
            onOpenCoachWizard={() => setCurrentTab('coach')}
            onOpenLeagueSuite={() => setCurrentTab('league')}
            onOpenEntriesList={() => setCurrentTab('entries')}
            onOpenSheets={() => setCurrentTab('sheets')}
            onOpenCompetitionsPage={() => setCurrentTab('competitions')}
          />
        )}

        {!role && currentTab === 'league' && (
          leagueSession ? (
            <LeagueExecutiveSuite 
              initialSubTab={leagueSubTab}
              onOpenFieldMode={() => setCurrentTab('competition')} 
              onOpenSheets={() => setCurrentTab('sheets')}
              onSwitchPortal={() => setLeagueSession(null)}
            />
          ) : (
            <LeagueGate 
              onAuthenticated={(sess) => setLeagueSession(sess)}
              onOpenFieldMode={() => setCurrentTab('competition')}
              onOpenAuthModal={(target, mode) => {
                setTargetAuthPortal(target);
                setAuthModalMode(mode || 'login');
                setShowAuthModal(true);
              }}
            />
          )
        )}

        {!role && currentTab === 'coach' && (
          coachSession ? (
            <CoachRegistrationWizard 
              coachClubId={coachSession.clubId}
              coachClubName={coachSession.clubName}
              onFinished={() => setCurrentTab('public')} 
            />
          ) : (
            <CoachGate 
              onAuthenticated={(sess) => setCoachSession(sess)} 
              onBackToPublic={() => setCurrentTab('public')}
              onOpenAuthModal={(target, mode) => {
                setTargetAuthPortal(target);
                setAuthModalMode(mode || 'login');
                setShowAuthModal(true);
              }}
            />
          )
        )}

        {!role && currentTab === 'admin' && (
          <AdminGate />
        )}

        {!role && (currentTab === 'competition' || currentTab === 'analytics') && (
          <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
            {/* مدخل كود المهمة الرسمي للحكام ومساعدي المسابقات */}
            <DutyCodeCheckIn
              onUnlockTask={(task) => {
                if (task.assignmentId || task.code) {
                  const verified = judgesAssignmentService.verifyDutyCode(task.code);
                  if (verified.valid && verified.duty) {
                    const asg = judgesAssignmentService.getAssignments().find(a => a.dutyCode === verified.duty?.dutyCode);
                    if (asg) {
                      setActiveJudgeAssignment(asg);
                      const jdg = judgesAssignmentService.getJudgeById(asg.judgeId);
                      if (jdg) {
                        setCurrentJudgeProfile(jdg);
                        setJudgeAssignmentsList(judgesAssignmentService.getAssignmentsForJudge(jdg.id));
                      }
                      setCurrentTab('judge-workspace');
                      return;
                    }
                  }
                }
                setRole(task.role);
              }}
              onEnterGeneralField={() => {
                // Focus into field role selector
              }}
            />

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                أو اختر دور الهاتف مباشرة في المنظومة
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <RoleSelector
              roomCode={roomCode}
              onSetRoomCode={setRoomCode}
              onSelectRole={(selectedRole) => setRole(selectedRole)}
              onOpenSubscriptionModal={() => setShowSubscriptionModal(true)}
              onOpenTransferModal={() => setShowTransferModal(true)}
              sharedPoolLicense={sharedPoolLicense}
            />
            {/* زر تثبيت التطبيق كـ PWA — يظهر فقط عند توفر إمكانية التثبيت */}
            <div className="px-4 pb-6 max-w-xl mx-auto w-full">
              <PwaInstallButton />
            </div>
          </div>
        )}

        {role === 'start' && !showPodium && (
          <StartPhoneView
            raceStatus={raceStatus}
            runners={runners}
            clockTimeMs={clockTimeMs}
            settings={settings}
            heats={heats}
            currentHeatIndex={currentHeatIndex}
            onSelectHeat={handleSelectHeat}
            onDispatchHeat={handleDispatchHeat}
            onCancelDispatchHeat={handleCancelDispatchHeat}
            onOpenSchedulePanel={() => setShowSchedulePanel(true)}
            onCommandOnMarks={handleCommandOnMarks}
            onCommandSet={handleCommandSet}
            onFireGun={handleFireGun}
            onRecallGun={handleRecallGun}
            onSharedResetRace={handleSharedResetRace}
            onViewResults={() => setShowPodium(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenInternetBridge={() => setShowInternetBridgeModal(true)}
            onStartBellSignal={handleStartBellSignal}
            onStopBellSignal={handleStopBellSignal}
            isHoldingBell={isHoldingBellButton}
            isPeerSirenRinging={isPeerSirenRinging}
          />
        )}

        {role === 'finish' && !showPodium && (
          <FinishPhoneView
            raceStatus={raceStatus}
            runners={runners}
            clockTimeMs={clockTimeMs}
            settings={settings}
            onLaneFinish={handleLaneFinish}
            onFinishRace={handleFinishRace}
            onSharedResetRace={handleSharedResetRace}
            onViewPhotoFinish={() => setShowPhotoFinishViewer(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenInternetBridge={() => setShowInternetBridgeModal(true)}
            onStartBellSignal={handleStartBellSignal}
            onStopBellSignal={handleStopBellSignal}
            isHoldingBell={isHoldingBellButton}
            isPeerSirenRinging={isPeerSirenRinging}
          />
        )}

        {role === 'judge' && !showPodium && (
          <JudgePhoneView
            raceStatus={raceStatus}
            runners={runners}
            clockTimeMs={clockTimeMs}
            settings={settings}
            heats={heats}
            currentHeatIndex={currentHeatIndex}
            onSelectHeat={handleSelectHeat}
            onAddNewHeat={handleAddNewHeat}
            onDeleteHeat={handleDeleteHeat}
            onReorderHeats={handleReorderHeats}
            onUpdateRunner={handleJudgeUpdateRunner}
            onUpdateRunnersList={handleUpdateRunnersList}
            onFinishRace={handleFinishRace}
            onSharedResetRace={handleSharedResetRace}
            onViewPhotoFinish={() => setShowPhotoFinishViewer(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenInternetBridge={() => setShowInternetBridgeModal(true)}
            fullPhotoFinishUrl={
              heats[currentHeatIndex]?.fullPhotoFinishUrl ||
              slitScanEngine.exportCroppedPhotoFinishDataUrl(settings.laneCount, runners) ||
              undefined
            }
          />
        )}

        {/* الهاتف الرابع: غرفة النداء وتسجيل القوائم */}
        {role === 'chambre_dappel' && (
          <ChambreDappelView
            heats={heats}
            currentHeatIndex={currentHeatIndex}
            settings={settings}
            onSelectHeat={handleSelectHeat}
            onAddNewHeat={handleAddNewHeat}
            onDeleteHeat={handleDeleteHeat}
            onReorderHeats={handleReorderHeats}
            onUpdateRunnersList={handleUpdateRunnersList}
            onBroadcastHeats={handleBroadcastHeats}
          />
        )}

        {/* شاشة منصة التتويج والنتائج الرسمية */}
        {showPodium && (
          <ResultsPodium
            runners={runners}
            settings={settings}
            onSharedResetRace={handleSharedResetRace}
            onViewPhotoFinish={() => setShowPhotoFinishViewer(true)}
          />
        )}

        {/* الدور الخامس: حكم نقطة المراقبة الميداني */}
        {role === 'checkpoint_judge' && currentCompetition && (
          <CheckpointJudgeView
            competition={currentCompetition}
            checkpoint={selectedCheckpoint || currentCompetition.checkpoints[0]}
            onExit={() => setRole(null)}
            onOpenMonitoring={() => setRole('athletics_manager')}
          />
        )}

        {/* الدور السادس: لوحة إدارة ألعاب القوى والترتيب المباشر للحكم العام */}
        {role === 'athletics_manager' && currentCompetition && (
          <PassageMonitoringDashboard
            competition={currentCompetition}
            onExit={() => setRole(null)}
            onOpenConfig={() => setShowConfigModal(true)}
            onOpenJudges={() => setShowJudgesModal(true)}
          />
        )}

        {/* الدور السابع: جهاز التوقيت اليدوي الاحترافي */}
        {role === 'manual_timing' && (
          <ManualTimingConsole
            onClose={() => setRole(null)}
            competitionName={activeLeague}
            defaultEventName={settings.distance ? `${settings.distance} ${settings.heatName}` : '100م نهائي رجال'}
            defaultHeatName={settings.heatName || 'تصفية 1'}
          />
        )}
      </main>

      {/* لوحة جدول وحالة السباقات (Au Départ / القادمة / المنتهية) */}
      {showSchedulePanel && (
        <RaceSchedulePanel
          heats={heats}
          currentHeatIndex={currentHeatIndex}
          dispatchedHeatId={dispatchedHeatId}
          role={role}
          onSelectHeat={handleSelectHeat}
          onDispatchHeat={handleDispatchHeat}
          onClose={() => setShowSchedulePanel(false)}
        />
      )}

      {/* نافذة تدقيق Photo Finish التفاعلية */}
      {showPhotoFinishViewer && (
        <PhotoFinishViewer
          runners={runners}
          settings={settings}
          fullPhotoFinishUrl={
            heats[currentHeatIndex]?.fullPhotoFinishUrl ||
            slitScanEngine.exportCroppedPhotoFinishDataUrl(settings.laneCount, runners) ||
            undefined
          }
          onUpdateRunnerTime={handleUpdateRunnerTime}
          onClose={() => setShowPhotoFinishViewer(false)}
        />
      )}

      {/* نافذة إعدادات السباق، الحساسات، والمسدس */}
      {showSettingsModal && (
        <RaceSettingsModal
          settings={settings}
          runners={runners}
          onSave={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* نافذة جسر الإنترنت وتسجيل عنوان الهاتف للمسافات الكبيرة */}
      {showInternetBridgeModal && (
        <InternetBridgeModal
          role={role}
          roomCode={roomCode}
          isConnected={isConnected}
          latencyMs={latencyMs}
          onClose={() => setShowInternetBridgeModal(false)}
          onSendTestPing={() => athleticsNetwork.performTimeSync()}
        />
      )}

      {/* نافذة خطط الاشتراكات والأسعار والتفعيل (عند النقر على زر الاشتراك) */}
      {showSubscriptionModal && !isAppLocked && (
        <SubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          isPaywallLock={false}
          currentRoomCode={roomCode}
          onConnectToMeshRoom={(newRoom) => {
            setRoomCode(newRoom);
            setShowSubscriptionModal(false);
          }}
          sharedPoolLicense={sharedPoolLicense}
        />
      )}

      {/* قفل التطبيق الإجباري (Paywall Gate) بعد انتهاء فترة الـ 7 أيام التجريبية: لا يفتح إلا بالاشتراك أو الاتصال بشبكة 1*4 */}
      {isAppLocked && (
        <SubscriptionModal
          onClose={() => {}}
          isPaywallLock={true}
          currentRoomCode={roomCode}
          onConnectToMeshRoom={(newRoom) => {
            setRoomCode(newRoom);
          }}
          sharedPoolLicense={sharedPoolLicense}
        />
      )}

      {/* نافذة تحويل ونقل الترخيص المشفر لمنع الازدواجية */}
      {showTransferModal && (
        <LicenseTransferModal
          onClose={() => setShowTransferModal(false)}
        />
      )}

      {/* نافذة أرشيف السباقات الدائم */}
      {showArchiveModal && (
        <ArchiveModal onClose={() => setShowArchiveModal(false)} />
      )}

      {/* نافذة إعداد المنافسة والمسار ونقاط المراقبة */}
      {showConfigModal && (
        <CheckpointConfigModal
          initialCompetition={currentCompetition || undefined}
          onSave={(comp) => {
            setCurrentCompetition(comp);
            setShowConfigModal(false);
          }}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {/* نافذة إدارة وتكليف الحكام وتوليد QR الأجهزة */}
      {showJudgesModal && currentCompetition && (
        <JudgeManagementModal
          competition={currentCompetition}
          roomCode={roomCode}
          onClose={() => setShowJudgesModal(false)}
        />
      )}

      {/* نافذة تسجيل الدخول والتسجيل الموحدة الشاملة لبوابات المنظومة */}
      <PortalAuthModal
        isOpen={showAuthModal}
        initialMode={authModalMode}
        initialPortal={targetAuthPortal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(sess) => {
          if (sess.portal === 'league') {
            setLeagueSession(sess);
            setCurrentTab('league');
          } else if (sess.portal === 'coach') {
            setCoachSession(sess);
            setCurrentTab('coach');
          } else if (sess.portal === 'judge') {
            setCurrentTab('competition');
          } else if (sess.portal === 'admin') {
            setCurrentTab('admin');
          }
        }}
      />
    </div>
  );
};

// ═══ الجذر: يوجه إلى ADMIN SUITE عند وجود ?admin في الرابط ═══
// مثال: https://<domain>/?admin → بوابة رمز المدير → لوحة التراخيص
const AppRoot: React.FC = () => {
  const [adminMode] = useState<boolean>(() => {
    try { return new URLSearchParams(window.location.search).has('admin'); } catch { return false; }
  });
  return (
    <LeagueProvider>
      {adminMode ? <AdminGate /> : <App />}
    </LeagueProvider>
  );
};

export default AppRoot;
