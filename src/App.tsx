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
import { Runner, PhoneRole, RaceStatus, RaceSettings, NetworkPeerMessage, Heat } from './types/race';
import { athleticsAudio } from './services/audioService';
import { athleticsNetwork } from './services/networkService';
import { slitScanEngine } from './services/slitScanEngine';
import { opticalGateDetector } from './services/motionDetector';
import { burstCaptureService } from './services/burstCaptureService';

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
  const [role, setRole] = useState<PhoneRole>(() => getInitialRoleAndRoom().initialRole);
  const [roomCode, setRoomCode] = useState<string>(() => getInitialRoleAndRoom().initialRoom);
  const [raceStatus, setRaceStatus] = useState<RaceStatus>('waiting');
  const [showSchedulePanel, setShowSchedulePanel] = useState<boolean>(false);
  const [dispatchedHeatId, setDispatchedHeatId] = useState<string | null>(null);

  // مزامنة عنوان URL مع الدور والغرفة ورمز الجلسة الحالية دون إعادة تحميل الصفحة
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (role) {
          url.searchParams.set('role', role);
        } else {
          url.searchParams.delete('role');
        }
        url.searchParams.set('room', roomCode);
        if (athleticsNetwork.sessionToken) {
          url.searchParams.set('token', athleticsNetwork.sessionToken);
        }
        window.history.replaceState({}, '', url.toString());
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

  // النوافذ المشروطة (Modals)
  const [showPhotoFinishViewer, setShowPhotoFinishViewer] = useState<boolean>(false);
  const [showPodium, setShowPodium] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showInternetBridgeModal, setShowInternetBridgeModal] = useState<boolean>(false);

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

  // استقبال ومعالجة رسائل شبكة P2P بين الهواتف الثلاثة
  const handleIncomingMessage = useCallback((msg: NetworkPeerMessage) => {
    const current = settingsRef.current;
    switch (msg.type) {
      case 'ON_MARKS':
        setRaceStatus('on_marks');
        athleticsAudio.playBeep(440, 0.2);
        athleticsAudio.speakArabic('خذ مكانك');
        break;

      case 'SET':
        setRaceStatus('set');
        athleticsAudio.playBeep(660, 0.25);
        athleticsAudio.speakArabic('استعد');
        break;

      case 'START_GUN': {
        setRaceStatus('racing');
        const soundVol = msg.payload?.soundVolume ?? current.soundVolume;
        const soundPitch = msg.payload?.soundPitch ?? current.soundPitch;
        athleticsAudio.playStarterSound(soundVol, soundPitch);

        // توقيت البداية الدقيق مع تطبيق تصحيح فارق التوقيت NTP
        const rawStartTime = msg.payload?.startTime || msg.timestamp || Date.now();
        const offset = athleticsNetwork.clockOffsetMs || 0;
        const synchronizedStartTime = rawStartTime + offset;
        startLocalClock(synchronizedStartTime);
        break;
      }

      case 'RECALL_GUN':
        setRaceStatus('false_start');
        athleticsAudio.playRecallGun(
          current.soundVolume,
          current.soundPitch
        );
        stopLocalClock();
        break;

      case 'LANE_FINISH': {
        const { lane, timeMs, rank, snapshotUrl } = msg.payload || {};
        setRunners(prev => prev.map(r => r.lane === lane ? { 
          ...r, 
          finishTime: timeMs, 
          rank: rank || r.rank,
          crossingSnapshot: snapshotUrl || r.crossingSnapshot
        } : r));
        break;
      }

      case 'RACE_COMPLETE':
        setRaceStatus('finished');
        stopLocalClock();
        athleticsAudio.playWhistle(0.5, 2, current.soundVolume, current.soundPitch);
        if (msg.payload?.runners) {
          setRunners(msg.payload.runners);
        }
        if (msg.payload?.fullPhotoFinishUrl) {
          setHeats(prev => {
            const updated = [...prev];
            if (updated[currentHeatIndexRef.current]) {
              updated[currentHeatIndexRef.current].fullPhotoFinishUrl = msg.payload.fullPhotoFinishUrl;
            }
            return updated;
          });
        }
        setShowPodium(true);
        break;

      case 'SLIT_SCAN_IMAGE':
        if (msg.payload?.fullPhotoFinishUrl) {
          setHeats(prev => {
            const updated = [...prev];
            if (updated[currentHeatIndexRef.current]) {
              updated[currentHeatIndexRef.current].fullPhotoFinishUrl = msg.payload.fullPhotoFinishUrl;
            }
            return updated;
          });
        }
        break;

      case 'SYNC_RESET_ALL':
        handleLocalReset();
        break;

      case 'SETTINGS_SYNC':
        if (msg.payload?.settings) {
          setSettings(msg.payload.settings);
          settingsRef.current = msg.payload.settings;
        }
        if (msg.payload?.runners) {
          setRunners(msg.payload.runners);
          setHeats(prev => {
            const updated = [...prev];
            const idx = typeof msg.payload?.heatIndex === 'number' ? msg.payload.heatIndex : currentHeatIndexRef.current;
            if (updated[idx]) {
              updated[idx] = { ...updated[idx], runners: msg.payload.runners };
            }
            return updated;
          });
        }
        if (msg.payload?.heats) {
          setHeats(msg.payload.heats);
        }
        break;

      case 'JUDGE_UPDATE_RUNNER': {
        const { lane, updates } = msg.payload || {};
        setRunners(prev => {
          const updated = prev.map(r => r.lane === lane ? { ...r, ...updates } : r);
          if (updates.finishTime !== undefined) {
            const sorted = [...updated].filter(r => r.finishTime > 0).sort((a, b) => a.finishTime - b.finishTime);
            sorted.forEach((r, idx) => { r.rank = idx + 1; });
          }
          return updated;
        });
        break;
      }

      case 'HEAT_CHANGE': {
        const { heatIndex, heat } = msg.payload || {};
        if (typeof heatIndex === 'number') {
          setCurrentHeatIndex(heatIndex);
          if (heat?.runners) setRunners(heat.runners);
          if (heat) {
            setSettings(prev => ({
              ...prev,
              distance: heat.distance || prev.distance,
              heatNumber: heat.number,
              heatName: heat.name
            }));
          }
          handleLocalReset();
        }
        break;
      }

      case 'HEATS_SYNC':
        if (msg.payload?.heats) {
          setHeats(msg.payload.heats);
        }
        break;

      case 'HEAT_DISPATCH': {
        const { heatId, heatIndex } = msg.payload || {};
        setDispatchedHeatId(heatId || null);
        setHeats(prev => prev.map((h, idx) => ({
          ...h,
          isDispatched: h.id === heatId || idx === heatIndex,
          dispatchedAt: (h.id === heatId || idx === heatIndex) ? Date.now() : h.dispatchedAt
        })));
        if (typeof heatIndex === 'number') {
          setCurrentHeatIndex(heatIndex);
        }
        athleticsAudio.playWhistle(0.3, 1, 1.2, 1.2);
        break;
      }

      case 'HEATS_REORDER': {
        if (msg.payload?.heats) {
          setHeats(msg.payload.heats);
        }
        break;
      }

      case 'DELETE_HEAT': {
        const { heatId } = msg.payload || {};
        if (heatId) {
          setHeats(prev => prev.filter(h => h.id !== heatId));
        }
        break;
      }

      case 'REQUEST_STATE_SYNC':
        athleticsNetwork.sendMessage({
          type: 'RESPONSE_STATE_SYNC',
          timestamp: Date.now(),
          senderTime: Date.now(),
          payload: {
            settings: settingsRef.current,
            runners: runnersRef.current,
            raceStatus: raceStatusRef.current,
            clockTimeMs: clockTimeMsRef.current,
            heats: heatsRef.current,
            currentHeatIndex: currentHeatIndexRef.current,
            fromRole: role
          }
        });
        break;

      case 'RESPONSE_STATE_SYNC':
        if (msg.payload) {
          if (msg.payload.settings) {
            setSettings(msg.payload.settings);
            settingsRef.current = msg.payload.settings;
          }
          if (msg.payload.runners) setRunners(msg.payload.runners);
          if (msg.payload.raceStatus) setRaceStatus(msg.payload.raceStatus);
          if (msg.payload.clockTimeMs) setClockTimeMs(msg.payload.clockTimeMs);
          if (msg.payload.heats) setHeats(msg.payload.heats);
          if (typeof msg.payload.currentHeatIndex === 'number') {
            setCurrentHeatIndex(msg.payload.currentHeatIndex);
          }
        }
        break;

      case 'BELL_SIGNAL_START':
        setIsReceivingBellAlert(true);
        athleticsAudio.startPoliceSiren(current.soundVolume);
        athleticsNetwork.sendMessage({
          type: 'BELL_SIGNAL_ACK',
          timestamp: Date.now(),
          senderTime: Date.now()
        });
        break;

      case 'BELL_SIGNAL_STOP':
        setIsReceivingBellAlert(false);
        athleticsAudio.stopPoliceSiren();
        break;

      case 'BELL_SIGNAL_ACK':
        setIsPeerSirenRinging(true);
        break;

      default:
        break;
    }
  }, [handleLocalReset, startLocalClock, stopLocalClock, role]);

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

  // تعديل حكم الهاتف الثالث لعداء محدد
  const handleJudgeUpdateRunner = (lane: number, updates: Partial<Runner>) => {
    setRunners(prev => {
      const updated = prev.map(r => r.lane === lane ? { ...r, ...updates } : r);
      if (updates.finishTime !== undefined) {
        const sorted = [...updated].filter(r => r.finishTime > 0).sort((a, b) => a.finishTime - b.finishTime);
        sorted.forEach((r, idx) => { r.rank = idx + 1; });
      }
      return updated;
    });

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black" dir="rtl">
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

      {/* الشريط العلوي مع زر سباق جديد وجرس التنبيه وتفاصيل القائمة */}
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
        onSharedResetRace={handleSharedResetRace}
        onStartBellSignal={handleStartBellSignal}
        onStopBellSignal={handleStopBellSignal}
        isHoldingBell={isHoldingBellButton}
        isPeerSirenRinging={isPeerSirenRinging}
      />

      {/* الشاشات الرئيسية حسب دور الهاتف المختار */}
      <main className="flex-1 flex flex-col">
        {!role && (
          <RoleSelector
            roomCode={roomCode}
            onSetRoomCode={setRoomCode}
            onSelectRole={(selectedRole) => setRole(selectedRole)}
          />
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
    </div>
  );
};

export default App;
