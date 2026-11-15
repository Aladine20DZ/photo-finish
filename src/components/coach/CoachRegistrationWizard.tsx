/**
 * PHOTO FINISH PRO AI — Coach Registration Wizard (Stage 5)
 * Multi-Step Guided Entry Submission, Digital Athlete Passports & Club Roster Binding.
 * 
 * 1. Bound to Coach's affiliated club.
 * 2. Uses permanent digital athlete passports to eliminate redundant data re-entry.
 * 3. Supports direct permanent athlete issuance & passport card preview.
 * 4. Supports competition & event selection.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  FileCheck, 
  Trophy,
  Printer,
  Plus,
  ShieldCheck,
  Building2,
  X,
  CreditCard,
  QrCode
} from 'lucide-react';
import { useAthleteStore } from '../../stores/athleteStore';
import { Athlete as StoreAthlete, AthleticsCompetition } from '../../types/athletics';
import { CategoryEngine } from '../../services/categoryEngine';
import { AthletePassportModal } from '../athletics/AthletePassportModal';
import { checkpointStorage } from '../../services/checkpointStorage';
import { coachRegistrationService } from '../../services/coachRegistrationService';

interface CoachRegistrationWizardProps {
  coachClubId?: string;
  coachClubName?: string;
  onFinished?: () => void;
}

interface AvailableEvent {
  id: string;
  name: string;
  category: string;
  gender: 'M' | 'F' | 'MIXED';
  scheduledTime: string;
}

const DEFAULT_EVENTS: AvailableEvent[] = [
  { id: 'ev_100m_sm', name: '100م أكابر رجال (100m Senior Men)', category: 'SENIOR', gender: 'M', scheduledTime: '10:00' },
  { id: 'ev_200m_sm', name: '200م أكابر رجال (200m Senior Men)', category: 'SENIOR', gender: 'M', scheduledTime: '11:15' },
  { id: 'ev_400m_sm', name: '400م أكابر رجال (400m Senior Men)', category: 'SENIOR', gender: 'M', scheduledTime: '14:30' },
  { id: 'ev_800m_sm', name: '800م نصف طويل رجال (800m Men)', category: 'SENIOR', gender: 'M', scheduledTime: '16:00' },
  { id: 'ev_1500m_sm', name: '1500م نصف طويل رجال (1500m Men)', category: 'SENIOR', gender: 'M', scheduledTime: '17:00' },
  { id: 'ev_100m_sw', name: '100م كبريات سيدات (100m Senior Women)', category: 'SENIOR', gender: 'F', scheduledTime: '10:30' },
  { id: 'ev_400m_sw', name: '400م كبريات سيدات (400m Senior Women)', category: 'SENIOR', gender: 'F', scheduledTime: '15:00' },
  { id: 'ev_lj_open', name: 'الوثب الطويل (Long Jump Open)', category: 'OPEN', gender: 'M', scheduledTime: '14:00' },
  { id: 'ev_sp_open', name: 'دفع الجلة (Shot Put Open)', category: 'OPEN', gender: 'M', scheduledTime: '15:30' }
];

export const CoachRegistrationWizard: React.FC<CoachRegistrationWizardProps> = ({
  coachClubId = 'club_mca',
  coachClubName = 'مولودية الجزائر (MCA)',
  onFinished
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const athletes = useAthleteStore((state) => state.athletes);
  const saveAthlete = useAthleteStore((state) => state.saveAthlete);

  // Competitions state
  const [competitions, setCompetitions] = useState<AthleticsCompetition[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('ev_100m_sm');

  // Selected athletes for participation
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [seedMarks, setSeedMarks] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Modal for digital passport inspection
  const [passportAthlete, setPassportAthlete] = useState<StoreAthlete | null>(null);
  const [isPassportOpen, setIsPassportOpen] = useState(false);

  // Modal for adding a permanent athlete to the club
  const [showAddAthleteModal, setShowAddAthleteModal] = useState(false);
  const [newAthleteForm, setNewAthleteForm] = useState({
    firstName: '',
    lastName: '',
    arabicName: '',
    birthDate: '2002-05-15',
    gender: 'M' as 'M' | 'F',
    primaryDiscipline: 'sprints',
    pbTime: '10.20',
    medicalClearanceExpiry: '2026-12-31'
  });

  // Load competitions from storage
  useEffect(() => {
    let isMounted = true;
    checkpointStorage.listCompetitions().then(comps => {
      if (isMounted) {
        setCompetitions(comps);
        if (comps.length > 0) {
          setSelectedCompetitionId(comps[0].id);
        }
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Filter athletes strictly bound to this coach's club
  const clubAthletes = useMemo(() => {
    return athletes.filter(a => {
      if (a.clubId && a.clubId === coachClubId) return true;
      if (a.clubName && (a.clubName.includes(coachClubName) || coachClubName.includes(a.clubName))) return true;
      // If coach club is MCA
      if (coachClubId.includes('mca') && (a.clubName?.includes('مولودية') || a.clubId?.includes('mca'))) return true;
      return false;
    });
  }, [athletes, coachClubId, coachClubName]);

  const selectedCompetition = useMemo(() => {
    return competitions.find(c => c.id === selectedCompetitionId) || {
      id: 'default_national_2026',
      name: 'البطولة الوطنية الشتوية لألعاب القوى 2026',
      venue: 'ملعب 5 جويلية الأولمبي • الجزائر العاصمة',
      date: '2026-06-15'
    };
  }, [competitions, selectedCompetitionId]);

  const selectedEvent = useMemo(() => {
    return DEFAULT_EVENTS.find(e => e.id === selectedEventId) || DEFAULT_EVENTS[0];
  }, [selectedEventId]);

  // Toggle athlete selection
  const toggleSelectAthlete = (ath: StoreAthlete) => {
    const isSelected = selectedAthleteIds.includes(ath.id);
    if (isSelected) {
      setSelectedAthleteIds(prev => prev.filter(id => id !== ath.id));
    } else {
      setSelectedAthleteIds(prev => [...prev, ath.id]);
      // Pre-fill seed mark from personal best if available
      const pb = ath.personalBests?.[0]?.recordValue || '10.25';
      setSeedMarks(prev => ({
        ...prev,
        [ath.id]: prev[ath.id] || String(pb)
      }));
    }
  };

  // Inspect passport
  const handleOpenPassport = (ath: StoreAthlete) => {
    setPassportAthlete(ath);
    setIsPassportOpen(true);
  };

  // Create permanent athlete
  const handleCreateAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAthleteForm.firstName || !newAthleteForm.lastName) return;

    const licenseNum = `DZ-2026-${Math.floor(10000 + Math.random() * 89999)}`;
    const randomBib = Math.floor(100 + Math.random() * 899);

    const newAthlete: StoreAthlete = {
      id: `ath_${Date.now().toString(36)}`,
      bibNumber: randomBib,
      licenseNumber: licenseNum,
      firstName: newAthleteForm.firstName.trim(),
      lastName: newAthleteForm.lastName.trim(),
      arabicName: newAthleteForm.arabicName.trim() || `${newAthleteForm.firstName} ${newAthleteForm.lastName}`,
      birthDate: newAthleteForm.birthDate,
      gender: newAthleteForm.gender,
      nationality: 'الجزائر 🇩🇿',
      clubId: coachClubId,
      clubName: coachClubName,
      wilaya: 'الجزائر',
      primaryDiscipline: newAthleteForm.primaryDiscipline,
      eligibleEvents: [newAthleteForm.primaryDiscipline],
      personalBests: [{
        eventCode: newAthleteForm.primaryDiscipline,
        eventName: newAthleteForm.primaryDiscipline,
        recordValue: newAthleteForm.pbTime,
        numericValueMsOrCm: parseFloat(newAthleteForm.pbTime) * 1000 || 10200,
        date: '2026-01-01',
        venue: 'البطولة الوطنية',
        wind: '+0.4'
      }],
      seasonBests: [{
        eventCode: newAthleteForm.primaryDiscipline,
        eventName: newAthleteForm.primaryDiscipline,
        recordValue: newAthleteForm.pbTime,
        numericValueMsOrCm: parseFloat(newAthleteForm.pbTime) * 1000 || 10200,
        date: '2026-02-15',
        venue: 'تجمع النخبة'
      }],
      medicalClearance: true,
      medicalClearanceExpiry: newAthleteForm.medicalClearanceExpiry,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await saveAthlete(newAthlete, true);
    setShowAddAthleteModal(false);

    // Auto-select newly created athlete
    setSelectedAthleteIds(prev => [...prev, newAthlete.id]);
    setSeedMarks(prev => ({ ...prev, [newAthlete.id]: newAthleteForm.pbTime }));

    // Reset form
    setNewAthleteForm({
      firstName: '',
      lastName: '',
      arabicName: '',
      birthDate: '2002-05-15',
      gender: 'M',
      primaryDiscipline: 'sprints',
      pbTime: '10.20',
      medicalClearanceExpiry: '2026-12-31'
    });
  };

  // Submit batch entries
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const entries = selectedAthleteIds.map(athId => {
        const ath = clubAthletes.find(a => a.id === athId);
        return {
          eventId: selectedEvent.id,
          competitionId: selectedCompetition.id,
          leagueId: 'lg_algiers',
          athleteId: athId,
          clubId: coachClubId,
          seedMark: parseFloat(seedMarks[athId]) || undefined,
          bibNumber: String(ath?.bibNumber || '100')
        };
      });

      await coachRegistrationService.submitEntriesBatch(entries);
      setSubmissionSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Banner - Coach Club Context */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 border border-emerald-500/40 flex items-center justify-center text-white shadow-lg">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold mb-1">
                <span>النادي المعتمد:</span>
                <span className="font-mono">{coachClubName}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                بوابة المدرب — إدارة المشاركات وبطاقات العدائين
              </h1>
              <p className="text-xs text-slate-400">
                تسجيل ومصادقة العدائين في المسابقات عبر بطاقة الهوية الرياضية الدائمة دون تكرار إدخال البيانات.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800/80">
              الخطوة {currentStep} من 4
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { step: 1, label: '1. التظاهرة والتخصص' },
            { step: 2, label: '2. اختيار العدائين' },
            { step: 3, label: '3. الأرقام التأهيلية (PB)' },
            { step: 4, label: '4. اعتماد القائمة والوصل' }
          ].map(s => (
            <div
              key={s.step}
              className={`p-3 rounded-2xl text-center text-xs font-bold border transition-all ${
                currentStep === s.step
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950 font-black'
                  : currentStep > s.step
                  ? 'bg-slate-900 text-emerald-400 border-slate-800'
                  : 'bg-slate-900/50 text-slate-500 border-slate-900'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* ═══ STEP 1: SELECT COMPETITION & EVENT ═══ */}
        {currentStep === 1 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>اختر التظاهرة الرياضية والتخصص</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {competitions.length > 0 ? `${competitions.length} مسابقة مجدولة` : 'المسابقات الرسمية'}
              </span>
            </div>

            {/* اختيار المسابقة */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">التظاهرة أو البطولة المجدولة:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {competitions.length > 0 ? (
                  competitions.map(comp => (
                    <div
                      key={comp.id}
                      onClick={() => setSelectedCompetitionId(comp.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedCompetitionId === comp.id
                          ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">{comp.date}</span>
                        {selectedCompetitionId === comp.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="text-sm font-black text-white mt-1">{comp.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{comp.venue}</div>
                    </div>
                  ))
                ) : (
                  <div
                    onClick={() => setSelectedCompetitionId('default_national_2026')}
                    className="p-4 rounded-2xl border bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">2026-06-15</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-sm font-black text-white mt-1">البطولة الوطنية الشتوية لألعاب القوى 2026</div>
                    <div className="text-xs text-slate-400 mt-0.5">ملعب 5 جويلية الأولمبي • الجزائر العاصمة</div>
                  </div>
                )}
              </div>
            </div>

            {/* اختيار التخصص الرياضي */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300">التخصص أو السباق المستهدف:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {DEFAULT_EVENTS.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedEventId === ev.id
                        ? 'bg-emerald-950/60 border-emerald-500 text-white font-black ring-1 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>الفئة: {ev.category}</span>
                      <span className="font-mono">{ev.scheduledTime}</span>
                    </div>
                    <div className="text-xs font-bold mt-1 text-white">{ev.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>المتابعة لاختيار العدائين</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: SELECT ATHLETES (PERMANENT PASSPORTS) ═══ */}
        {currentStep === 2 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>سجل عدائي النادي وبطاقات الهوية الدائمة</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  بيانات العدائين محفوظة بشكل دائم كمرجع رسمي؛ يكفي تحديد العداء دون الحاجة لإعادة التسجيل.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddAthleteModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold flex items-center gap-2 shadow cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ تسجيل عداء جديد وإصدار بطاقته</span>
              </button>
            </div>

            {/* Athletes List */}
            {clubAthletes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950 border border-dashed border-slate-800 space-y-3">
                <CreditCard className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">لا يوجد عدائين مسجلين باسم {coachClubName} حالياً</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  قم بإضافة الرياضي مرة واحدة فقط وسيتم منحه بطاقة هوية رياضية ورقم رخصة دائم معتمد في كل التظاهرات القادمة.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddAthleteModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>إصدار بطاقة العداء الأول بالنادي</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clubAthletes.map(ath => {
                  const isSelected = selectedAthleteIds.includes(ath.id);
                  const categoryInfo = ath.birthDate 
                    ? CategoryEngine.calculateCategory(ath.birthDate)
                    : { category: 'OPEN', age: 0, categoryNameAr: 'مفتوح' };

                  const isMedicalValid = ath.medicalClearance && (
                    !ath.medicalClearanceExpiry || new Date(ath.medicalClearanceExpiry) >= new Date()
                  );

                  return (
                    <div
                      key={ath.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-slate-950 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        
                        {/* Athlete info */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectAthlete(ath)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                              isSelected ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </button>

                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-black text-amber-400 text-sm">
                            #{ath.bibNumber || '---'}
                          </div>

                          <div>
                            <div className="text-sm font-black text-white flex items-center gap-2">
                              <span>{ath.arabicName || `${ath.firstName} ${ath.lastName}`}</span>
                              <span className="text-[10px] font-mono text-slate-400">({ath.firstName} {ath.lastName})</span>
                            </div>
                            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mt-0.5">
                              <span>الرخصة: <strong className="font-mono text-emerald-400">{ath.licenseNumber}</strong></span>
                              <span>الفئة: <strong className="text-slate-300">{categoryInfo.categoryNameAr} ({categoryInfo.category})</strong></span>
                              <span>الجنس: <strong className="text-slate-300">{ath.gender === 'M' ? 'ذكر' : 'أنثى'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badges & Passport Trigger */}
                        <div className="flex items-center gap-2">
                          {isMedicalValid ? (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>فحص طبي سارٍ</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-950 text-rose-400 border border-rose-800/80 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>فحص طبي منتهٍ</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenPassport(ath)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>بطاقة العداء الرقمية</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الرجوع للمسابقة</span>
              </button>
              <button
                disabled={selectedAthleteIds.length === 0}
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>متابعة إدخال الأرقام التأهيلية ({selectedAthleteIds.length})</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: SEED MARKS & PBs ═══ */}
        {currentStep === 3 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>تأكيد الأرقام التأهيلية والشخصية (Personal Bests)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تم استيراد الأرقام المسجلة في بطاقات الرياضيين تلقائياً؛ يمكنك تعديل رقم الدخول إن تطلب الأمر.
              </p>
            </div>

            <div className="space-y-3">
              {selectedAthleteIds.map(athId => {
                const ath = clubAthletes.find(a => a.id === athId);
                if (!ath) return null;
                return (
                  <div key={athId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-bold text-amber-400 text-sm">
                        #{ath.bibNumber || '---'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{ath.arabicName || `${ath.firstName} ${ath.lastName}`}</div>
                        <div className="text-xs text-slate-400 font-mono">الرخصة: {ath.licenseNumber}</div>
                      </div>
                    </div>

                    <div className="w-44">
                      <label className="block text-[11px] text-slate-400 mb-1">الرقم المرجعي للدخول (ثانية / متر):</label>
                      <input
                        type="text"
                        value={seedMarks[athId] || ''}
                        onChange={(e) => setSeedMarks({ ...seedMarks, [athId]: e.target.value })}
                        placeholder="10.20"
                        className="w-full p-2.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الرجوع للعدائين</span>
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
              >
                <span>مراجعة القائمة الرسمية</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: REVIEW & CONFIRMATION ═══ */}
        {currentStep === 4 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            {!submissionSuccess ? (
              <>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <span>مراجعة استمارة المشاركة ووصل الإيداع الرسمي</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    سيتم إرسال القائمة المعتمدة للرابطة وغرفة المناداة (Call Room) والتحكيم الفني.
                  </p>
                </div>

                {/* Voucher summary */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-900/60 space-y-3 text-xs">
                  <div className="flex justify-between items-center text-slate-300 border-b border-slate-800/80 pb-2">
                    <span>النادي الرياضي:</span>
                    <span className="font-bold text-white text-sm">{coachClubName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 border-b border-slate-800/80 pb-2">
                    <span>التظاهرة المعتمدة:</span>
                    <span className="font-bold text-emerald-400">{selectedCompetition.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 border-b border-slate-800/80 pb-2">
                    <span>التخصص والمستوى:</span>
                    <span className="font-bold text-white">{selectedEvent.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>إجمالي العدائين المؤكدين:</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{selectedAthleteIds.length} مشارك(ين)</span>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>تعديل القائمة</span>
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'جارٍ الإرسال والاعتماد...' : 'تأكيد وإرسال الاستمارة الرسمية'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">تم اعتماد قائمة المشاركة الرسمية بنجاح!</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    تم إدراج {selectedAthleteIds.length} عداء في جدول مسابقات {selectedCompetition.name}، وتثبيت أرقام الصدريات الرسمية لغرفة النداء.
                  </p>
                </div>

                {/* Printable receipt card */}
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-right space-y-4 max-w-md mx-auto shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-mono text-emerald-400 font-bold">وصل إيداع رقم: VCH-{Date.now().toString().slice(-6)}</span>
                    <QrCode className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div>النادي: <strong className="text-white">{coachClubName}</strong></div>
                    <div>المسابقة: <strong className="text-white">{selectedEvent.name}</strong></div>
                    <div>تاريخ التسجيل: <span className="font-mono text-slate-400">{new Date().toLocaleString('ar-DZ')}</span></div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>طباعة استمارة ووصل الإيداع الرسمي</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSubmissionSuccess(false);
                      setCurrentStep(1);
                      setSelectedAthleteIds([]);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                  >
                    تسجيل سباق أو تخصص آخر
                  </button>
                  <button
                    onClick={() => onFinished && onFinished()}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all"
                  >
                    العودة للبوابة الرئيسية
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═══ MODAL: ATHLETE DIGITAL PASSPORT CARD ═══ */}
      <AthletePassportModal
        athlete={passportAthlete}
        isOpen={isPassportOpen}
        onClose={() => {
          setIsPassportOpen(false);
          setPassportAthlete(null);
        }}
      />

      {/* ═══ MODAL: REGISTER NEW PERMANENT ATHLETE ═══ */}
      {showAddAthleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">إصدار بطاقة وهوية رياضية دائمة للعداء</h3>
                  <p className="text-[11px] text-slate-400">نادي: {coachClubName} (حفظ دائم في السجل الوطني)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddAthleteModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAthlete} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الاسم (بالحروف اللاتينية)</label>
                  <input
                    type="text"
                    required
                    value={newAthleteForm.firstName}
                    onChange={(e) => setNewAthleteForm({ ...newAthleteForm, firstName: e.target.value })}
                    placeholder="Youssef"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اللقب (بالحروف اللاتينية)</label>
                  <input
                    type="text"
                    required
                    value={newAthleteForm.lastName}
                    onChange={(e) => setNewAthleteForm({ ...newAthleteForm, lastName: e.target.value })}
                    placeholder="El Abdeli"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الاسم واللقب باللغة العربية</label>
                <input
                  type="text"
                  value={newAthleteForm.arabicName}
                  onChange={(e) => setNewAthleteForm({ ...newAthleteForm, arabicName: e.target.value })}
                  placeholder="يوسف العبدلي"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    required
                    value={newAthleteForm.birthDate}
                    onChange={(e) => setNewAthleteForm({ ...newAthleteForm, birthDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الجنس</label>
                  <select
                    value={newAthleteForm.gender}
                    onChange={(e) => setNewAthleteForm({ ...newAthleteForm, gender: e.target.value as 'M' | 'F' })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="M">ذكر (Men)</option>
                    <option value="F">أنثى (Women)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الاختصاص الأساسي</label>
                  <select
                    value={newAthleteForm.primaryDiscipline}
                    onChange={(e) => setNewAthleteForm({ ...newAthleteForm, primaryDiscipline: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="sprints">سباقات السرعة (100م - 400م)</option>
                    <option value="middle_distance">المسافات نصف الطويلة (800م - 1500م)</option>
                    <option value="long_distance">المسافات الطويلة (5000م فأكثر)</option>
                    <option value="jumps">الوثب والقفز</option>
                    <option value="throws">الرمي والدفع</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الرقم القياسي الشخصي (PB)</label>
                  <input
                    type="text"
                    value={newAthleteForm.pbTime}
                    onChange={(e) => setNewAthleteForm({ ...newAthleteForm, pbTime: e.target.value })}
                    placeholder="10.20s"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نهاية صلاحية الشهادة الطبية</label>
                <input
                  type="date"
                  value={newAthleteForm.medicalClearanceExpiry}
                  onChange={(e) => setNewAthleteForm({ ...newAthleteForm, medicalClearanceExpiry: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAthleteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  حفظ دائم وإصدار البطاقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
