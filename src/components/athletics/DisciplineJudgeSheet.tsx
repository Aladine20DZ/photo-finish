import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Trophy, 
  Timer, 
  Award, 
  Printer, 
  Trash2, 
  Plus, 
  Wind, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  X, 
  FileSpreadsheet 
} from 'lucide-react';
import { OfficialFederationHeader, OfficialFederationFooter } from './OfficialFederationHeader';
import { RegisteredLeague } from '../../services/portalAuthService';

export type DisciplineCategory = 'running' | 'throws' | 'jumps_horizontal' | 'jumps_vertical';

export interface RunningEntry {
  id: string;
  lane: number;
  bib: string;
  athleteName: string;
  club: string;
  gunTime: string; // e.g. 10.245
  netTime?: string;
  reactionTime?: string;
  windSpeed?: string;
  status: 'OK' | 'DNS' | 'DNF' | 'DQ';
  dqRule?: string; // e.g. TR16.8 (false start)
  rank?: number;
  notes?: string;
}

export interface FieldAttemptEntry {
  id: string;
  order: number;
  bib: string;
  athleteName: string;
  club: string;
  attempts: [string, string, string, string, string, string]; // e.g. "20.45", "X", "-"
  windAttempts?: [string, string, string, string, string, string];
  bestMark: string;
  rank?: number;
  isRecord?: boolean;
}

export interface VerticalJumpEntry {
  id: string;
  order: number;
  bib: string;
  athleteName: string;
  club: string;
  heightAttempts: Record<string, string>; // height -> "O" | "XO" | "XXO" | "XXX" | "-"
  bestHeight: string;
  failuresAtWinningHeight: number;
  totalFailures: number;
  rank?: number;
}

export interface DisciplineSheetData {
  competitionId: string;
  competitionTitle: string;
  disciplineId: string;
  disciplineName: string;
  category: DisciplineCategory;
  gender: 'men' | 'women' | 'mixed';
  ageGroup: 'seniors' | 'u20' | 'u18' | 'u16';
  round: 'final' | 'semi' | 'heats';
  heatNumber?: number;
  scheduledTime: string;
  chiefJudgeName: string;
  chiefJudgeLicense: string;
  chiefTimekeeperName?: string;
  generalWind?: string;
  isCertified: boolean;
  certifiedAt?: string;
  certifiedBy?: string;
  runningEntries: RunningEntry[];
  fieldEntries: FieldAttemptEntry[];
  verticalEntries: VerticalJumpEntry[];
  verticalHeights: string[]; // e.g. ["1.80", "1.85", "1.90", "1.95", "2.00"]
}

interface DisciplineJudgeSheetProps {
  competitionId?: string;
  competitionTitle?: string;
  disciplineId?: string;
  activeLeague?: RegisteredLeague | null;
  readOnly?: boolean;
  onClose?: () => void;
}

const CATEGORY_DISCIPLINES: Record<DisciplineCategory, { id: string; name: string }[]> = {
  running: [
    { id: '100m', name: '100م سرعة' },
    { id: '200m', name: '200م سرعة' },
    { id: '400m', name: '400م مستوية' },
    { id: '800m', name: '800م نصف طويل' },
    { id: '1500m', name: '1500م نصف طويل' },
    { id: '5000m', name: '5000م مسافات طويلة' },
    { id: '10000m', name: '10000م مسافات طويلة' },
    { id: '110mH', name: '110م حواجز' },
    { id: '400mH', name: '400م حواجز' },
    { id: '3000mSC', name: '3000م موانع' },
    { id: '4x100m', name: 'تتابع 4×100م' },
    { id: '4x400m', name: 'تتابع 4×400م' }
  ],
  throws: [
    { id: 'shot_put', name: 'دفع الجلة (Shot Put)' },
    { id: 'discus_throw', name: 'رمي القرص (Discus)' },
    { id: 'javelin_throw', name: 'رمي الرمح (Javelin)' },
    { id: 'hammer_throw', name: 'رمي المطرقة (Hammer)' }
  ],
  jumps_horizontal: [
    { id: 'long_jump', name: 'الوثب الطويل (Long Jump)' },
    { id: 'triple_jump', name: 'الوثب الثلاثي (Triple Jump)' }
  ],
  jumps_vertical: [
    { id: 'high_jump', name: 'الوثب العالي (High Jump)' },
    { id: 'pole_vault', name: 'القفز بالزانة (Pole Vault)' }
  ]
};

const DEFAULT_VERTICAL_HEIGHTS = ['1.80', '1.85', '1.90', '1.95', '2.00', '2.05', '2.10'];

export const DisciplineJudgeSheet: React.FC<DisciplineJudgeSheetProps> = ({
  competitionId = 'comp_saida_2026',
  competitionTitle = 'البطولة الولائية لألعاب القوى — ولاية سعيدة',
  disciplineId: initialDisciplineId = '100m',
  activeLeague,
  readOnly = false,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DisciplineCategory>('running');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>(initialDisciplineId);
  const [round, setRound] = useState<'final' | 'semi' | 'heats'>('final');
  const [heatNumber, setHeatNumber] = useState<number>(1);
  const [gender, setGender] = useState<'men' | 'women' | 'mixed'>('men');
  const [ageGroup, setAgeGroup] = useState<'seniors' | 'u20' | 'u18' | 'u16'>('seniors');
  const [chiefJudgeName, setChiefJudgeName] = useState<string>('الحكم الفيدرالي المعتمد');
  const [chiefJudgeLicense, setChiefJudgeLicense] = useState<string>('JUDGE-ALG-020');
  const [chiefTimekeeper, setChiefTimekeeper] = useState<string>('رئيس هيئة الميقاتيين');
  const [generalWind, setGeneralWind] = useState<string>('+1.2');
  const [isCertified, setIsCertified] = useState<boolean>(false);
  const [certifiedAt, setCertifiedAt] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [broadcastNotice, setBroadcastNotice] = useState<string>('');

  // جداول القياسات بحسب نوع التخصص
  const [runningEntries, setRunningEntries] = useState<RunningEntry[]>([]);
  const [fieldEntries, setFieldEntries] = useState<FieldAttemptEntry[]>([]);
  const [verticalEntries, setVerticalEntries] = useState<VerticalJumpEntry[]>([]);
  const [verticalHeights, setVerticalHeights] = useState<string[]>(DEFAULT_VERTICAL_HEIGHTS);

  // مفتاح التخزين الفريد
  const storageKey = useMemo(() => {
    return `pfp_discipline_sheet_${competitionId}_${selectedDiscipline}_${gender}_${round}_${heatNumber}`;
  }, [competitionId, selectedDiscipline, gender, round, heatNumber]);

  // استرجاع البيانات من التخزين
  const loadSheetData = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data: DisciplineSheetData = JSON.parse(stored);
        setSelectedCategory(data.category || 'running');
        setChiefJudgeName(data.chiefJudgeName || 'الحكم الفيدرالي المعتمد');
        setChiefJudgeLicense(data.chiefJudgeLicense || 'JUDGE-ALG-020');
        setChiefTimekeeper(data.chiefTimekeeperName || 'رئيس هيئة الميقاتيين');
        setGeneralWind(data.generalWind || '+1.2');
        setIsCertified(!!data.isCertified);
        setCertifiedAt(data.certifiedAt || '');
        setRunningEntries(data.runningEntries || []);
        setFieldEntries(data.fieldEntries || []);
        setVerticalEntries(data.verticalEntries || []);
        if (data.verticalHeights && data.verticalHeights.length > 0) {
          setVerticalHeights(data.verticalHeights);
        }
      } else {
        // إنشاء قائمة فارغة أولية
        setIsCertified(false);
        setCertifiedAt('');
        setRunningEntries([]);
        setFieldEntries([]);
        setVerticalEntries([]);
      }
    } catch (e) {
      console.error('Error loading discipline sheet', e);
    }
  }, [storageKey]);

  useEffect(() => {
    loadSheetData();
  }, [loadSheetData]);

  // الاستماع إلى تحديثات المزامنة الفورية عبر BroadcastChannel
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('pfp_discipline_sync');
      bc.onmessage = (ev) => {
        if (ev.data && ev.data.key === storageKey) {
          loadSheetData();
          setBroadcastNotice('تم استلام تحديث قياسات متزامن ⚡');
          setTimeout(() => setBroadcastNotice(''), 3000);
        }
      };
    } catch {}

    const handleWindowStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        loadSheetData();
      }
    };
    window.addEventListener('storage', handleWindowStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleWindowStorage);
    };
  }, [storageKey, loadSheetData]);

  // حفظ ومزامنة البيانات مع جميع النوافذ المفتوحة
  const saveAndBroadcast = (override?: Partial<DisciplineSheetData>) => {
    const disciplineMeta = CATEGORY_DISCIPLINES[selectedCategory].find(d => d.id === selectedDiscipline);
    const dataToSave: DisciplineSheetData = {
      competitionId,
      competitionTitle,
      disciplineId: selectedDiscipline,
      disciplineName: disciplineMeta?.name || selectedDiscipline,
      category: selectedCategory,
      gender,
      ageGroup,
      round,
      heatNumber,
      scheduledTime: new Date().toISOString(),
      chiefJudgeName,
      chiefJudgeLicense,
      chiefTimekeeperName: chiefTimekeeper,
      generalWind,
      isCertified,
      certifiedAt,
      certifiedBy: activeLeague?.name || 'الرابطة الولائية لألعاب القوى',
      runningEntries,
      fieldEntries,
      verticalEntries,
      verticalHeights,
      ...override
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      const bc = new BroadcastChannel('pfp_discipline_sync');
      bc.postMessage({ key: storageKey, timestamp: Date.now() });
      bc.close();
    } catch (e) {
      console.error('Failed to save discipline sheet', e);
    }
  };

  // ═══ دوال التعامل مع سباقات الجري (Running) ═══
  const addRunningCompetitor = () => {
    const nextLane = runningEntries.length + 1;
    const newEntry: RunningEntry = {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lane: nextLane <= 8 ? nextLane : 1,
      bib: '',
      athleteName: '',
      club: '',
      gunTime: '',
      netTime: '',
      status: 'OK'
    };
    const updated = [...runningEntries, newEntry];
    setRunningEntries(updated);
    saveAndBroadcast({ runningEntries: updated });
  };

  const updateRunningEntry = (id: string, updates: Partial<RunningEntry>) => {
    let updated = runningEntries.map(e => e.id === id ? { ...e, ...updates } : e);
    // إعادة حساب الترتيب تلقائياً للنتائج المعتمدة OK
    const sortedOk = updated
      .filter(e => e.status === 'OK' && e.gunTime && !isNaN(parseFloat(e.gunTime)))
      .sort((a, b) => parseFloat(a.gunTime) - parseFloat(b.gunTime));
    
    updated = updated.map(e => {
      if (e.status !== 'OK' || !e.gunTime) {
        return { ...e, rank: undefined };
      }
      const idx = sortedOk.findIndex(o => o.id === e.id);
      return { ...e, rank: idx >= 0 ? idx + 1 : undefined };
    });

    setRunningEntries(updated);
    saveAndBroadcast({ runningEntries: updated });
  };

  const removeRunningEntry = (id: string) => {
    const updated = runningEntries.filter(e => e.id !== id);
    setRunningEntries(updated);
    saveAndBroadcast({ runningEntries: updated });
  };

  // ═══ دوال التعامل مع الرمي والوثب الأفقي (Throws & Horizontal Jumps) ═══
  const addFieldCompetitor = () => {
    const nextOrder = fieldEntries.length + 1;
    const newEntry: FieldAttemptEntry = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: nextOrder,
      bib: '',
      athleteName: '',
      club: '',
      attempts: ['', '', '', '', '', ''],
      windAttempts: ['', '', '', '', '', ''],
      bestMark: '0.00'
    };
    const updated = [...fieldEntries, newEntry];
    setFieldEntries(updated);
    saveAndBroadcast({ fieldEntries: updated });
  };

  const computeBestMark = (attempts: [string, string, string, string, string, string]): string => {
    const numericAttempts = attempts
      .map(a => parseFloat(String(a).trim()))
      .filter(n => !isNaN(n) && n > 0);
    if (numericAttempts.length === 0) return '0.00';
    return Math.max(...numericAttempts).toFixed(2);
  };

  const updateFieldAttempt = (id: string, attemptIdx: number, val: string, windVal?: string) => {
    let updated = fieldEntries.map(e => {
      if (e.id !== id) return e;
      const nextAtt = [...e.attempts] as [string, string, string, string, string, string];
      nextAtt[attemptIdx] = val.trim().toUpperCase();
      const nextWind = [...(e.windAttempts || ['', '', '', '', '', ''])] as [string, string, string, string, string, string];
      if (windVal !== undefined) nextWind[attemptIdx] = windVal;
      const best = computeBestMark(nextAtt);
      return { ...e, attempts: nextAtt, windAttempts: nextWind, bestMark: best };
    });

    // إعادة الترتيب
    const sorted = [...updated].sort((a, b) => parseFloat(b.bestMark) - parseFloat(a.bestMark));
    updated = updated.map(e => {
      const idx = sorted.findIndex(s => s.id === e.id);
      return { ...e, rank: parseFloat(e.bestMark) > 0 ? idx + 1 : undefined };
    });

    setFieldEntries(updated);
    saveAndBroadcast({ fieldEntries: updated });
  };

  const removeFieldEntry = (id: string) => {
    const updated = fieldEntries.filter(e => e.id !== id);
    setFieldEntries(updated);
    saveAndBroadcast({ fieldEntries: updated });
  };

  // ═══ دوال التعامل مع الوثب العالي والزانة (Vertical Jumps) ═══
  const addVerticalCompetitor = () => {
    const nextOrder = verticalEntries.length + 1;
    const newEntry: VerticalJumpEntry = {
      id: `vert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: nextOrder,
      bib: '',
      athleteName: '',
      club: '',
      heightAttempts: {},
      bestHeight: '0.00',
      failuresAtWinningHeight: 0,
      totalFailures: 0
    };
    const updated = [...verticalEntries, newEntry];
    setVerticalEntries(updated);
    saveAndBroadcast({ verticalEntries: updated });
  };

  const updateVerticalAttempt = (id: string, height: string, status: string) => {
    let updated = verticalEntries.map(e => {
      if (e.id !== id) return e;
      const nextMap = { ...e.heightAttempts, [height]: status.trim().toUpperCase() };
      
      // حساب أفضل ارتفاع تم اجتيازه (يحوي O)
      let best = 0;
      let failsAtBest = 0;
      let totalFails = 0;

      verticalHeights.forEach(h => {
        const val = nextMap[h] || '';
        if (val.includes('O')) {
          const numH = parseFloat(h);
          if (numH > best) {
            best = numH;
            // عدد الأخطاء في هذا الارتفاع الفائز
            failsAtBest = (val.match(/X/g) || []).length;
          }
        }
        totalFails += (val.match(/X/g) || []).length;
      });

      return {
        ...e,
        heightAttempts: nextMap,
        bestHeight: best > 0 ? best.toFixed(2) : '0.00',
        failuresAtWinningHeight: failsAtBest,
        totalFailures: totalFails
      };
    });

    // قاعدة كسر التعادل وفق World Athletics Rule 181 (Countback)
    const sorted = [...updated].sort((a, b) => {
      const bestDiff = parseFloat(b.bestHeight) - parseFloat(a.bestHeight);
      if (bestDiff !== 0) return bestDiff;
      const atBestDiff = a.failuresAtWinningHeight - b.failuresAtWinningHeight;
      if (atBestDiff !== 0) return atBestDiff;
      return a.totalFailures - b.totalFailures;
    });

    updated = updated.map(e => {
      const idx = sorted.findIndex(s => s.id === e.id);
      return { ...e, rank: parseFloat(e.bestHeight) > 0 ? idx + 1 : undefined };
    });

    setVerticalEntries(updated);
    saveAndBroadcast({ verticalEntries: updated });
  };

  const removeVerticalEntry = (id: string) => {
    const updated = verticalEntries.filter(e => e.id !== id);
    setVerticalEntries(updated);
    saveAndBroadcast({ verticalEntries: updated });
  };

  // تفريغ الجدول بالكامل
  const handleWipeData = () => {
    if (!window.confirm('هل أنت متأكد من تفريغ كافة قياسات هذا التخصص؟ لا يمكن التراجع.')) return;
    setRunningEntries([]);
    setFieldEntries([]);
    setVerticalEntries([]);
    setIsCertified(false);
    setCertifiedAt('');
    localStorage.removeItem(storageKey);
    const bc = new BroadcastChannel('pfp_discipline_sync');
    bc.postMessage({ key: storageKey, timestamp: Date.now() });
    bc.close();
  };

  // المصادقة الرسمية والإقفال
  const handleToggleCertify = () => {
    const nextState = !isCertified;
    const dateStr = nextState ? new Date().toISOString() : '';
    setIsCertified(nextState);
    setCertifiedAt(dateStr);
    saveAndBroadcast({ isCertified: nextState, certifiedAt: dateStr });
  };

  // تصدير CSV رسمي بترميز UTF-8 BOM
  const handleExportCSV = () => {
    let rows: string[][] = [];
    const disciplineMeta = CATEGORY_DISCIPLINES[selectedCategory].find(d => d.id === selectedDiscipline);
    const title = disciplineMeta?.name || selectedDiscipline;

    if (selectedCategory === 'running') {
      rows.push(['الترتيب', 'الرواق', 'الصدرية', 'اسم العداء', 'النادي', 'زمن البندقية (Gun)', 'الزمن الصافي', 'سرعة الرياح', 'الحالة', 'ملاحظات']);
      runningEntries.forEach(e => {
        rows.push([
          e.rank ? String(e.rank) : '-',
          String(e.lane),
          e.bib,
          e.athleteName,
          e.club,
          e.gunTime,
          e.netTime || '',
          e.windSpeed || generalWind,
          e.status,
          e.dqRule || e.notes || ''
        ]);
      });
    } else if (selectedCategory === 'throws' || selectedCategory === 'jumps_horizontal') {
      rows.push(['الترتيب', 'الترتيب التنافسي', 'الصدرية', 'اسم العداء', 'النادي', 'المحاولة 1', 'المحاولة 2', 'المحاولة 3', 'المحاولة 4', 'المحاولة 5', 'المحاولة 6', 'أفضل قياس قانوني']);
      fieldEntries.forEach(e => {
        rows.push([
          e.rank ? String(e.rank) : '-',
          String(e.order),
          e.bib,
          e.athleteName,
          e.club,
          e.attempts[0],
          e.attempts[1],
          e.attempts[2],
          e.attempts[3],
          e.attempts[4],
          e.attempts[5],
          e.bestMark
        ]);
      });
    } else {
      const headerRow = ['الترتيب', 'الترتيب التنافسي', 'الصدرية', 'اسم المتسابق', 'النادي', ...verticalHeights, 'أفضل ارتفاع', 'أخطاء الارتفاع الفائز', 'مجموع الأخطاء'];
      rows.push(headerRow);
      verticalEntries.forEach(e => {
        const heightCols = verticalHeights.map(h => e.heightAttempts[h] || '-');
        rows.push([
          e.rank ? String(e.rank) : '-',
          String(e.order),
          e.bib,
          e.athleteName,
          e.club,
          ...heightCols,
          e.bestHeight,
          String(e.failuresAtWinningHeight),
          String(e.totalFailures)
        ]);
      });
    }

    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `محضر_رسمي_${title}_${competitionId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const disciplineMeta = CATEGORY_DISCIPLINES[selectedCategory].find(d => d.id === selectedDiscipline);

  return (
    <div className="bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-6" dir="rtl">
      
      {/* ═══ 1. الشريط العلوي: تحديد المنافسة والتخصص ونمط المزامنة ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>محضر تحكيم وقياسات التخصصات الميدانية (Discipline Sheet)</span>
                {isCertified ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    معتمد رسمياً
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/40">
                    قيد التدوين الميداني
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {competitionTitle} • التوثيق الفوري وفق قواعد الاتحاد الدولي لألعاب القوى (World Athletics Rules)
              </p>
            </div>
          </div>
        </div>

        {/* مؤشر المزامنة الحية وأزرار الإجراءات */}
        <div className="flex items-center gap-2 flex-wrap">
          {broadcastNotice && (
            <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-3 py-1 rounded-xl animate-pulse">
              {broadcastNotice}
            </span>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="تصدير جدول القياسات إلى ملف Excel CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="طباعة المحضر الرسمي بالترويسة الموحدة"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>طباعة المحضر 🖨️</span>
          </button>

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleToggleCertify}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow ${
                  isCertified 
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isCertified ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{isCertified ? 'إلغاء الإقفال 🔓' : 'المصادقة والإقفال ⚖️'}</span>
              </button>

              <button
                type="button"
                onClick={handleWipeData}
                className="p-2 rounded-xl bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/40 transition-colors cursor-pointer"
                title="تفريغ القياسات بالكامل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ 2. محددات التخصص والفئة والحكم الرئيسي ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        
        {/* اختيار صنف المسابقة */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">صنف المسابقة:</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              const cat = e.target.value as DisciplineCategory;
              setSelectedCategory(cat);
              setSelectedDiscipline(CATEGORY_DISCIPLINES[cat][0].id);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
          >
            <option value="running">الجري والسرعة (Track)</option>
            <option value="throws">مسابقات الرمي (Throws)</option>
            <option value="jumps_horizontal">الوثب الأفقي (Horizontal Jumps)</option>
            <option value="jumps_vertical">الوثب العمودي (Vertical Jumps)</option>
          </select>
        </div>

        {/* اختيار التخصص الدقيق */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">التخصص الرياضي:</label>
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
          >
            {CATEGORY_DISCIPLINES[selectedCategory].map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* الجنس والفئة العمرية */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">الجنس:</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold text-white"
            >
              <option value="men">رجال</option>
              <option value="women">سيدات</option>
              <option value="mixed">مختلط</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">الفئة:</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-white"
            >
              <option value="seniors">أكابر</option>
              <option value="u20">أواسط U20</option>
              <option value="u18">أشبال U18</option>
              <option value="u16">أصاغر U16</option>
            </select>
          </div>
        </div>

        {/* الدور والتصفية */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">المرحلة:</label>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-cyan-300"
            >
              <option value="final">النهائي</option>
              <option value="semi">نصف النهائي</option>
              <option value="heats">التصفيات</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">المجموعة:</label>
            <input
              type="number"
              min={1}
              value={heatNumber}
              onChange={(e) => setHeatNumber(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-white text-center"
            />
          </div>
        </div>

        {/* مقياس الرياح وحكم الفعالية */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center justify-between">
            <span>مقياس الرياح (Wind):</span>
            <span className="text-[10px] text-cyan-400 font-mono">Max +2.0m/s</span>
          </label>
          <div className="relative">
            <Wind className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              dir="ltr"
              value={generalWind}
              disabled={isCertified || readOnly}
              onChange={(e) => {
                setGeneralWind(e.target.value);
                saveAndBroadcast({ generalWind: e.target.value });
              }}
              placeholder="+1.2"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-2 text-xs font-mono font-bold text-cyan-300 text-left"
            />
          </div>
        </div>

      </div>

      {/* ═══ 3. جدول القياسات التفاعلي بحسب التخصص ═══ */}

      {/* نوع 1: سباقات الجري والمضمار (Running) */}
      {selectedCategory === 'running' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-emerald-400" />
              قائمة أروقة المتسابقين وتوقيتات الوصول (1/1000s):
            </span>
            {!readOnly && !isCertified && (
              <button
                type="button"
                onClick={addRunningCompetitor}
                className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة عداء للرواق</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3 text-center w-14">الرتبة</th>
                  <th className="p-3 text-center w-16">الرواق</th>
                  <th className="p-3 text-center w-20">الصدرية</th>
                  <th className="p-3">اسم العداء</th>
                  <th className="p-3">النادي</th>
                  <th className="p-3 text-center">زمن البندقية (Gun)</th>
                  <th className="p-3 text-center">الزمن الصافي (Net)</th>
                  <th className="p-3 text-center">الحالة</th>
                  {!readOnly && !isCertified && <th className="p-3 text-center w-12">حذف</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {runningEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">
                      لا يوجد عداؤون مسجلون في هذا الشوط حالياً. انقر على "إضافة عداء للرواق" للبدء.
                    </td>
                  </tr>
                ) : (
                  runningEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-2.5 text-center">
                        {e.rank ? (
                          <span className={`px-2 py-0.5 rounded-lg font-black text-xs ${
                            e.rank === 1 ? 'bg-amber-400 text-slate-950 shadow' :
                            e.rank === 2 ? 'bg-slate-300 text-slate-950' :
                            e.rank === 3 ? 'bg-amber-700 text-white' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {e.rank}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          value={e.lane}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => updateRunningEntry(e.id, { lane: parseInt(ev.target.value) || 1 })}
                          className="w-12 bg-slate-900 border border-slate-800 rounded-lg p-1 text-center text-white font-bold"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          value={e.bib}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => updateRunningEntry(e.id, { bib: ev.target.value })}
                          placeholder="#"
                          className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-1 text-center font-bold text-cyan-300"
                        />
                      </td>
                      <td className="p-2.5 font-sans">
                        <input
                          type="text"
                          value={e.athleteName}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => updateRunningEntry(e.id, { athleteName: ev.target.value })}
                          placeholder="الاسم واللقب..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-100 font-bold"
                        />
                      </td>
                      <td className="p-2.5 font-sans">
                        <input
                          type="text"
                          value={e.club}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => updateRunningEntry(e.id, { club: ev.target.value })}
                          placeholder="النادي / الرابطة..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          dir="ltr"
                          value={e.gunTime}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => updateRunningEntry(e.id, { gunTime: ev.target.value })}
                          placeholder="00:00.000"
                          className="w-24 bg-slate-900 border border-slate-800 rounded-lg p-1 text-center font-bold text-amber-400"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          dir="ltr"
                          value={e.netTime || ''}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => updateRunningEntry(e.id, { netTime: ev.target.value })}
                          placeholder="00:00.000"
                          className="w-24 bg-slate-900 border border-slate-800 rounded-lg p-1 text-center text-slate-300"
                        />
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        <select
                          value={e.status}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => updateRunningEntry(e.id, { status: ev.target.value as any })}
                          className={`bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-bold ${
                            e.status === 'OK' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <option value="OK">OK رسمي</option>
                          <option value="DNS">DNS غائب</option>
                          <option value="DNF">DNF انسحاب</option>
                          <option value="DQ">DQ إقصاء</option>
                        </select>
                      </td>
                      {!readOnly && !isCertified && (
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRunningEntry(e.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نوع 2: مسابقات الرمي والوثب الأفقي (Throws & Horizontal Jumps) */}
      {(selectedCategory === 'throws' || selectedCategory === 'jumps_horizontal') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              جدول المحاولات الست (6 Attempts) وحساب أفضل رمية/وثبة قانونية:
            </span>
            {!readOnly && !isCertified && (
              <button
                type="button"
                onClick={addFieldCompetitor}
                className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة متسابق</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3 text-center w-12">الرتبة</th>
                  <th className="p-3 text-center w-14">الترتيب</th>
                  <th className="p-3 text-center w-16">الصدرية</th>
                  <th className="p-3">اسم المتسابق</th>
                  <th className="p-3">النادي</th>
                  <th className="p-3 text-center">1</th>
                  <th className="p-3 text-center">2</th>
                  <th className="p-3 text-center">3</th>
                  <th className="p-3 text-center">4</th>
                  <th className="p-3 text-center">5</th>
                  <th className="p-3 text-center">6</th>
                  <th className="p-3 text-center font-bold text-amber-300">أفضل قياس</th>
                  {!readOnly && !isCertified && <th className="p-3 text-center w-10">حذف</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {fieldEntries.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-500 font-sans">
                      لا يوجد متسابقون مسجلون. انقر على "إضافة متسابق" لملء محاولات المسابقة الميدانية.
                    </td>
                  </tr>
                ) : (
                  fieldEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-2 text-center">
                        {e.rank ? (
                          <span className={`px-2 py-0.5 rounded-lg font-black text-xs ${
                            e.rank === 1 ? 'bg-amber-400 text-slate-950 shadow' :
                            e.rank === 2 ? 'bg-slate-300 text-slate-950' :
                            e.rank === 3 ? 'bg-amber-700 text-white' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {e.rank}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-2 text-center text-slate-400">{e.order}</td>
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={e.bib}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => {
                            const updated = fieldEntries.map(f => f.id === e.id ? { ...f, bib: ev.target.value } : f);
                            setFieldEntries(updated);
                            saveAndBroadcast({ fieldEntries: updated });
                          }}
                          className="w-14 bg-slate-900 border border-slate-800 rounded p-1 text-center font-bold text-cyan-300"
                        />
                      </td>
                      <td className="p-2 font-sans">
                        <input
                          type="text"
                          value={e.athleteName}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => {
                            const updated = fieldEntries.map(f => f.id === e.id ? { ...f, athleteName: ev.target.value } : f);
                            setFieldEntries(updated);
                            saveAndBroadcast({ fieldEntries: updated });
                          }}
                          placeholder="الاسم..."
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-bold"
                        />
                      </td>
                      <td className="p-2 font-sans">
                        <input
                          type="text"
                          value={e.club}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => {
                            const updated = fieldEntries.map(f => f.id === e.id ? { ...f, club: ev.target.value } : f);
                            setFieldEntries(updated);
                            saveAndBroadcast({ fieldEntries: updated });
                          }}
                          placeholder="النادي..."
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs"
                        />
                      </td>
                      {[0, 1, 2, 3, 4, 5].map((idx) => (
                        <td key={idx} className="p-2 text-center">
                          <input
                            type="text"
                            dir="ltr"
                            value={e.attempts[idx]}
                            disabled={isCertified || readOnly}
                            onChange={(ev) => updateFieldAttempt(e.id, idx, ev.target.value)}
                            placeholder="-"
                            className={`w-14 border rounded p-1 text-center font-bold text-xs ${
                              e.attempts[idx] === 'X' 
                                ? 'bg-red-950/60 border-red-800/80 text-red-400' 
                                : e.attempts[idx] && e.attempts[idx] !== '-' 
                                ? 'bg-slate-900 border-slate-700 text-white' 
                                : 'bg-slate-950 border-slate-850 text-slate-500'
                            }`}
                          />
                        </td>
                      ))}
                      <td className="p-2 text-center font-bold text-amber-300 bg-amber-950/20">
                        {e.bestMark}م
                      </td>
                      {!readOnly && !isCertified && (
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeFieldEntry(e.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نوع 3: مسابقات الوثب العمودي (الوثب العالي والزانة) */}
      {selectedCategory === 'jumps_vertical' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-cyan-400" />
              مصفوفة الارتفاعات (O=اجتياز، X=إسقاط، -=تنازل) مع كسر التعادل الفيدرالي:
            </span>
            {!readOnly && !isCertified && (
              <button
                type="button"
                onClick={addVerticalCompetitor}
                className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة واثب</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3 text-center w-12">الرتبة</th>
                  <th className="p-3 text-center w-14">الصدرية</th>
                  <th className="p-3">اسم الواثب</th>
                  <th className="p-3">النادي</th>
                  {verticalHeights.map((h) => (
                    <th key={h} className="p-3 text-center font-mono text-cyan-300">{h}م</th>
                  ))}
                  <th className="p-3 text-center font-bold text-amber-300">أفضل علو</th>
                  <th className="p-3 text-center text-[10px] text-slate-400">أخطاء العلو</th>
                  <th className="p-3 text-center text-[10px] text-slate-400">مجموع الأخطاء</th>
                  {!readOnly && !isCertified && <th className="p-3 text-center w-10">حذف</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {verticalEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6 + verticalHeights.length} className="p-8 text-center text-slate-500 font-sans">
                      لا يوجد واثبون مسجلون. أضف واثباً لرصد محاولات تخطي العارضة.
                    </td>
                  </tr>
                ) : (
                  verticalEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-2 text-center">
                        {e.rank ? (
                          <span className={`px-2 py-0.5 rounded-lg font-black text-xs ${
                            e.rank === 1 ? 'bg-amber-400 text-slate-950 shadow' :
                            e.rank === 2 ? 'bg-slate-300 text-slate-950' :
                            e.rank === 3 ? 'bg-amber-700 text-white' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {e.rank}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={e.bib}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => {
                            const updated = verticalEntries.map(v => v.id === e.id ? { ...v, bib: ev.target.value } : v);
                            setVerticalEntries(updated);
                            saveAndBroadcast({ verticalEntries: updated });
                          }}
                          className="w-14 bg-slate-900 border border-slate-800 rounded p-1 text-center font-bold text-cyan-300"
                        />
                      </td>
                      <td className="p-2 font-sans">
                        <input
                          type="text"
                          value={e.athleteName}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => {
                            const updated = verticalEntries.map(v => v.id === e.id ? { ...v, athleteName: ev.target.value } : v);
                            setVerticalEntries(updated);
                            saveAndBroadcast({ verticalEntries: updated });
                          }}
                          placeholder="الاسم..."
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-bold"
                        />
                      </td>
                      <td className="p-2 font-sans">
                        <input
                          type="text"
                          value={e.club}
                          disabled={isCertified || readOnly}
                          onChange={(ev) => {
                            const updated = verticalEntries.map(v => v.id === e.id ? { ...v, club: ev.target.value } : v);
                            setVerticalEntries(updated);
                            saveAndBroadcast({ verticalEntries: updated });
                          }}
                          placeholder="النادي..."
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs"
                        />
                      </td>
                      {verticalHeights.map((h) => {
                        const val = e.heightAttempts[h] || '';
                        return (
                          <td key={h} className="p-2 text-center">
                            <input
                              type="text"
                              dir="ltr"
                              value={val}
                              disabled={isCertified || readOnly}
                              onChange={(ev) => updateVerticalAttempt(e.id, h, ev.target.value)}
                              placeholder="-"
                              className={`w-14 border rounded p-1 text-center font-bold text-xs ${
                                val.includes('O') 
                                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300' 
                                  : val.includes('X') 
                                  ? 'bg-red-950/60 border-red-800 text-red-400' 
                                  : 'bg-slate-950 border-slate-850 text-slate-500'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="p-2 text-center font-bold text-amber-300 bg-amber-950/20">
                        {e.bestHeight}م
                      </td>
                      <td className="p-2 text-center text-slate-400">{e.failuresAtWinningHeight}</td>
                      <td className="p-2 text-center text-slate-400">{e.totalFailures}</td>
                      {!readOnly && !isCertified && (
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeVerticalEntry(e.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ 4. نافذة المعاينة والطباعة الرسمية الموحدة (Official Print Preview Modal) ═══ */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl">
          <div className="bg-white text-slate-950 w-full max-w-4xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto">
            
            {/* أزرار التحكم في الطباعة */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print">
              <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                معاينة المحضر الرسمي قبل الطباعة أو الحفظ كـ PDF
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن 🖨️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* محتوى الوثيقة الرسمية بالترويسة الموحدة */}
            <div className="space-y-6 print:space-y-4">
              <OfficialFederationHeader
                league={activeLeague}
                competitionName={competitionTitle}
                discipline={disciplineMeta?.name || selectedDiscipline}
                windSpeed={generalWind}
                timingSystem="Fully Automatic Timing (FAT 1/1000s)"
              />

              {/* جدول النتائج للطباعة */}
              <div className="overflow-hidden border border-slate-300 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <tr>
                      <th className="p-2.5 text-center w-12">الرتبة</th>
                      <th className="p-2.5 text-center w-16">الصدرية</th>
                      <th className="p-2.5">اسم الرياضي</th>
                      <th className="p-2.5">النادي المنتسب</th>
                      <th className="p-2.5 text-center">النتيجة / القياس</th>
                      <th className="p-2.5 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-slate-900">
                    {selectedCategory === 'running' && runningEntries.map(e => (
                      <tr key={e.id}>
                        <td className="p-2 text-center font-bold">{e.rank || '-'}</td>
                        <td className="p-2 text-center">{e.bib}</td>
                        <td className="p-2 font-sans font-bold">{e.athleteName}</td>
                        <td className="p-2 font-sans">{e.club}</td>
                        <td className="p-2 text-center font-bold text-emerald-800">{e.gunTime}s</td>
                        <td className="p-2 text-center font-sans">{e.status}</td>
                      </tr>
                    ))}

                    {(selectedCategory === 'throws' || selectedCategory === 'jumps_horizontal') && fieldEntries.map(e => (
                      <tr key={e.id}>
                        <td className="p-2 text-center font-bold">{e.rank || '-'}</td>
                        <td className="p-2 text-center">{e.bib}</td>
                        <td className="p-2 font-sans font-bold">{e.athleteName}</td>
                        <td className="p-2 font-sans">{e.club}</td>
                        <td className="p-2 text-center font-bold text-emerald-800">{e.bestMark}م</td>
                        <td className="p-2 text-center font-sans">{parseFloat(e.bestMark) > 0 ? 'معتمد' : 'NM'}</td>
                      </tr>
                    ))}

                    {selectedCategory === 'jumps_vertical' && verticalEntries.map(e => (
                      <tr key={e.id}>
                        <td className="p-2 text-center font-bold">{e.rank || '-'}</td>
                        <td className="p-2 text-center">{e.bib}</td>
                        <td className="p-2 font-sans font-bold">{e.athleteName}</td>
                        <td className="p-2 font-sans">{e.club}</td>
                        <td className="p-2 text-center font-bold text-emerald-800">{e.bestHeight}م</td>
                        <td className="p-2 text-center font-sans">{parseFloat(e.bestHeight) > 0 ? 'معتمد' : 'NM'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* التذييل الرسمي الموحد مع التوقيعات والأختام */}
              <OfficialFederationFooter
                chiefJudgeName={chiefJudgeName}
                presidentName={activeLeague?.presidentName || 'رئيس الرابطة الولائية'}
                stampUrl={activeLeague?.stampUrl}
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
