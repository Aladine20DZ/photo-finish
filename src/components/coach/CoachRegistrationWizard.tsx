/**
 * PHOTO FINISH PRO AI — Coach Registration Wizard (Stage 5)
 * Multi-Step Guided Entry Submission, Eligibility Verification & Bib Assignment.
 */

import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  FileCheck, 
  Trophy 
} from 'lucide-react';
import { 
  coachRegistrationService, 
  Athlete, 
  Event 
} from '../../services/coachRegistrationService';

interface CoachRegistrationWizardProps {
  coachClubId?: string;
  coachClubName?: string;
  onFinished?: () => void;
}

export const CoachRegistrationWizard: React.FC<CoachRegistrationWizardProps> = ({
  coachClubId = 'club_mca',
  coachClubName = 'مولودية الجزائر (MCA)',
  onFinished
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Mock club athletes (isolated to this coach's club)
  const [clubAthletes] = useState<Athlete[]>([
    {
      id: 'ath_mca_01',
      league_id: 'lg_algiers',
      club_id: coachClubId,
      first_name: 'يوسف',
      last_name: 'العبدلي',
      normalized_name: 'يوسف العبدلي',
      license_number: 'ALG-2026-001',
      bib_number: '101',
      birth_date: '2001-05-14',
      gender: 'M',
      category: 'SENIOR',
      medical_cert_expiry: '2026-12-31', // صالحة
      is_active: true,
      pb_records: { '100m': '10.12' },
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    },
    {
      id: 'ath_mca_02',
      league_id: 'lg_algiers',
      club_id: coachClubId,
      first_name: 'كريم',
      last_name: 'المنصوري',
      normalized_name: 'كريم المنصوري',
      license_number: 'ALG-2026-002',
      bib_number: '105',
      birth_date: '2002-08-20',
      gender: 'M',
      category: 'SENIOR',
      medical_cert_expiry: '2026-01-01', // منتهية الصلاحية
      is_active: true,
      pb_records: { '100m': '10.45' },
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    },
    {
      id: 'ath_mca_03',
      league_id: 'lg_algiers',
      club_id: coachClubId,
      first_name: 'أمين',
      last_name: 'بوزيان',
      normalized_name: 'امين بوزيان',
      license_number: 'ALG-2026-003',
      bib_number: '106',
      birth_date: '2005-02-10',
      gender: 'M',
      category: 'U20',
      medical_cert_expiry: '2026-11-30', // صالحة
      is_active: true,
      pb_records: { '100m': '10.65' },
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    }
  ]);

  // Selected event
  const [selectedEvent] = useState<Event>({
    id: 'ev_100m_senior',
    competition_id: 'comp_algiers_national_2026',
    league_id: 'lg_algiers',
    name: 'سباق 100م أكابر رجال (100m Senior Men)',
    event_code: '100M_SM',
    gender: 'M',
    category: 'SENIOR',
    event_type: 'sprint',
    round: 'final',
    heat_count: 2,
    scheduled_time: '2026-06-15T16:00:00Z',
    status: 'scheduled',
    wind_reading: null,
    created_at: '2026-03-01',
    updated_at: '2026-03-01'
  });

  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>(['ath_mca_01']);
  const [seedMarks, setSeedMarks] = useState<Record<string, string>>({
    ath_mca_01: '10.12'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const toggleSelectAthlete = (id: string) => {
    setSelectedAthleteIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const entries = selectedAthleteIds.map(athId => ({
        eventId: selectedEvent.id,
        competitionId: selectedEvent.competition_id,
        leagueId: selectedEvent.league_id,
        athleteId: athId,
        clubId: coachClubId,
        seedMark: parseFloat(seedMarks[athId]) || undefined,
        bibNumber: clubAthletes.find(a => a.id === athId)?.bib_number || undefined
      }));

      await coachRegistrationService.submitEntriesBatch(entries);
      setSubmissionSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800/80 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400">{coachClubName}</div>
              <h1 className="text-xl font-black text-white">معالج تسجيل ومشاركة العدائين (Wizard)</h1>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            خطوة {currentStep} من 4
          </span>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: '1. المسابقة والتخصص' },
            { step: 2, label: '2. اختيار العدائين' },
            { step: 3, label: '3. الفحص والأرقام' },
            { step: 4, label: '4. المراجعة والاعتماد' }
          ].map(s => (
            <div
              key={s.step}
              className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all ${
                currentStep === s.step
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950'
                  : currentStep > s.step
                  ? 'bg-slate-900 text-emerald-400 border-slate-800'
                  : 'bg-slate-900/50 text-slate-500 border-slate-900'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Step 1: Select Event */}
        {currentStep === 1 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>اختر المسابقة والتخصص الرياضي</span>
            </h2>

            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-400 font-bold">البطولة الوطنية لألعاب القوى 2026</span>
                <h3 className="text-sm font-black text-white mt-0.5">{selectedEvent.name}</h3>
                <span className="text-xs text-slate-400">الفئة: أكابر (SENIOR) • الجنس: رجال (Men)</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow"
              >
                <span>المتابعة لاختيار العدائين</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Athletes */}
        {currentStep === 2 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>اختر عدائي النادي المشاركين</span>
              </h2>
              <span className="text-xs text-slate-400">تم اختيار {selectedAthleteIds.length} عداء</span>
            </div>

            <div className="space-y-3">
              {clubAthletes.map(ath => {
                const isSelected = selectedAthleteIds.includes(ath.id);
                const eligibility = coachRegistrationService.validateAthleteEligibility(ath, selectedEvent);
                return (
                  <div
                    key={ath.id}
                    onClick={() => eligibility.eligible && toggleSelectAthlete(ath.id)}
                    className={`p-4 rounded-2xl border transition-all ${
                      !eligibility.eligible
                        ? 'opacity-60 bg-slate-950/40 border-rose-900/40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-slate-950 border-emerald-500 shadow-md ring-1 ring-emerald-500/40 cursor-pointer'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {ath.bib_number || '#'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">
                            {ath.first_name} {ath.last_name}
                          </div>
                          <div className="text-xs text-slate-400">
                            الرخصة: {ath.license_number} • الفئة: {ath.category}
                          </div>
                        </div>
                      </div>

                      <div>
                        {eligibility.eligible ? (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                            isSelected ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                        ) : (
                          <span className="text-xs text-rose-400 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>غير مؤهل</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {!eligibility.eligible && (
                      <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                        {eligibility.reasons.join(' ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الرجوع</span>
              </button>
              <button
                disabled={selectedAthleteIds.length === 0}
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow"
              >
                <span>متابعة إدخال الأرقام</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Seed Marks */}
        {currentStep === 3 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>تأكيد الأرقام التقديرية (Seed Marks / Personal Best)</span>
            </h2>

            <div className="space-y-3">
              {selectedAthleteIds.map(athId => {
                const ath = clubAthletes.find(a => a.id === athId)!;
                return (
                  <div key={athId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-white">{ath.first_name} {ath.last_name}</div>
                      <div className="text-xs text-slate-400 font-mono">الصدر المقترح: {ath.bib_number}</div>
                    </div>
                    <div className="w-36">
                      <label className="block text-[11px] text-slate-400 mb-1">الرقم المرجعي (ثانية)</label>
                      <input
                        type="text"
                        value={seedMarks[athId] || ''}
                        onChange={(e) => setSeedMarks({ ...seedMarks, [athId]: e.target.value })}
                        placeholder="10.12"
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الرجوع</span>
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow"
              >
                <span>مراجعة القائمة النهائية</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            {!submissionSuccess ? (
              <>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <span>مراجعة استمارة المشاركة الرسمية</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    سيتم إرسال القائمة لغرفة المناداة (Call Room) وتثبيت أرقام الصدريات رسميّاً.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>النادي:</span>
                    <span className="font-bold text-white">{coachClubName}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>المسابقة والتخصص:</span>
                    <span className="font-bold text-emerald-400">{selectedEvent.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>عدد العدائين المؤكدين:</span>
                    <span className="font-bold text-amber-400 font-mono">{selectedAthleteIds.length}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>تعديل</span>
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'جارٍ الإرسال...' : 'تأكيد وإرسال الاستمارة الرسمية'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-white">تم استلام استمارة المشاركة بنجاح!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  تم تسجيل ومصادقة العدائين في نظام إدارة البطولة، وتجهيز أرقام الصدريات لغرفة التحكيم والمناداة.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => onFinished && onFinished()}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all"
                  >
                    العودة للقائمة الرئيسية
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
