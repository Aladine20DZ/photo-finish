/**
 * PHOTO FINISH PRO AI — New League Account Registration Wizard
 * Full multi-step onboarding for Wilaya Leagues, Regional Leagues, and National Federations.
 */

import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  User, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  ArrowRight,
  Award
} from 'lucide-react';
import { portalAuthService, RegisteredLeague } from '../../services/portalAuthService';

interface LeagueRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (league: RegisteredLeague) => void;
}

const WILAYAS_LIST = [
  'أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة', 'بشار',
  'البليدة', 'البويرة', 'تمنراست', 'تبسة', 'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر العاصمة',
  'الجلفة', 'جيجل', 'سطيف', 'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة',
  'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 'معسكر', 'ورقلة', 'وهران', 'البيض',
  'إليزي', 'برج بوعريريج', 'بومرداس', 'الطارف', 'تندوف', 'تيسمسيلت', 'الوادي', 'خنشلة',
  'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 'النعامة', 'عين تموشنت', 'غرداية', 'غليزان'
];

export const LeagueRegistrationModal: React.FC<LeagueRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<'wilaya' | 'regional' | 'national'>('wilaya');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [wilaya, setWilaya] = useState('الجزائر العاصمة');
  const [accreditationNumber, setAccreditationNumber] = useState('');
  const [logoCode, setLogoCode] = useState('🏛️');

  const [officialEmail, setOfficialEmail] = useState('');
  const [phone, setPhone] = useState('+213 ');

  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleAutoFillName = (selectedWilaya: string) => {
    setWilaya(selectedWilaya);
    if (!name || name.startsWith('الرابطة الولائية لألعاب القوى')) {
      setName(`الرابطة الولائية لألعاب القوى - ${selectedWilaya}`);
    }
    if (!shortName) {
      const idx = WILAYAS_LIST.indexOf(selectedWilaya) + 1;
      const code = idx.toString().padStart(2, '0');
      setShortName(`LAW${code}`);
    }
  };

  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      setError('يرجى إدخال الاسم الرسمي للرابطة.');
      return false;
    }
    if (!shortName.trim() || shortName.trim().length < 2) {
      setError('يرجى تحديد الرمز الرياضي المختصر (حرفان على الأقل مثل LAA).');
      return false;
    }
    if (!accreditationNumber.trim()) {
      setError('يرجى إدخال رقم الاعتماد الرسمي أو القرار الوزاري.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!officialEmail.trim() || !officialEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني رسمي صحيح.');
      return false;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setError('يرجى إدخال رقم هاتف الرابطة.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFullName.trim()) {
      setError('يرجى إدخال الاسم الكامل للمدير التنفيذي أو رئيس الرابطة.');
      return;
    }
    if (!adminUsername.trim() || adminUsername.trim().length < 3) {
      setError('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.');
      return;
    }
    if (!adminPassword || adminPassword.length < 6) {
      setError('كلمة المرور يجب أن لا تقل عن 6 خانات.');
      return;
    }
    if (adminPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await portalAuthService.registerNewLeague({
      name,
      shortName: shortName.toUpperCase(),
      type,
      wilaya,
      accreditationNumber,
      logoCode,
      officialEmail,
      phone,
      adminFullName,
      adminUsername,
      adminPassword
    });

    setLoading(false);

    if (!res.success || !res.league) {
      setError(res.error || 'فشل تسجيل الرابطة. يرجى المحاولة مرة أخرى.');
      return;
    }

    onSuccess(res.league);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-emerald-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-b border-emerald-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 flex items-center justify-center shadow-lg text-2xl">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/80">
                  World Athletics Compliance
                </span>
                <span className="text-xs text-slate-400">الاعتماد المؤسسي</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">
                تسجيل حساب رابطة رياضية جديدة
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-6 py-3 flex items-center justify-between text-xs font-bold">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-black ${
              step >= 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>1</span>
            <span>هوية الرابطة والولاية</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-800" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-black ${
              step >= 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>2</span>
            <span>الاتصال والاعتماد</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-800" />
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-black ${
              step === 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>3</span>
            <span>حساب المدير التنفيذي</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-6 mb-0 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع الكيان الرياضي</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'wilaya', label: 'رابطة ولائية', icon: '🏛️' },
                    { id: 'regional', label: 'رابطة جهوية', icon: '☀️' },
                    { id: 'national', label: 'اتحاد وطني', icon: '🇩🇿' },
                  ].map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        setType(t.id as any);
                        setLogoCode(t.icon);
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        type === t.id
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-lg'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-xs font-black">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">المقر / الولاية</label>
                  <select
                    value={wilaya}
                    onChange={(e) => handleAutoFillName(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  >
                    {WILAYAS_LIST.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">الرمز الرياضي المختصر (Code)</label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                    placeholder="مثال: LAA, LAO, LAW23"
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono font-black text-amber-300 tracking-wider focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الرابطة الرسمي بالعربية</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: الرابطة الولائية لألعاب القوى - عنابة"
                  className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم الاعتماد الرسمي / القرار الوزاري</label>
                <input
                  type="text"
                  value={accreditationNumber}
                  onChange={(e) => setAccreditationNumber(e.target.value)}
                  placeholder="مثال: DEC-2026-MJS-44 أو FAA-SANCTION-2026"
                  className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-slate-200 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  <span>متابعة لبيانات الاتصال</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">البريد الإلكتروني الرسمي للرابطة</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    placeholder="مثال: contact@laa-athletics.dz"
                    className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم الهاتف الرسمي</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+213 21 00 00 00"
                    className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  الميزات المفعلة تلقائياً لحساب الرابطة المعتمد:
                </span>
                <ul className="text-[11px] text-slate-400 space-y-1 pr-2 list-disc list-inside">
                  <li>إدارة وتوليد أكواد التكليف الرسمية للحكام ومساعدي المسابقات (Duty Codes)</li>
                  <li>توليد وتخصيص الصدريات الذكي لجميع عدائي الأندية (Smart Bibs)</li>
                  <li>اعتماد الأرقام القياسية الولائية والوطنية وفق لوائح World Athletics TR31</li>
                  <li>توليد تراخيص الاستخدام المشفرة للأجهزة بالملعب (Ed25519) دون إنترنت</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  الرجوع للسابق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  <span>متابعة لبيانات المدير التنفيذي</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم الكامل للمدير التنفيذي أو رئيس الرابطة</label>
                <div className="relative">
                  <User className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="مثال: الأستاذ جمال بن ناصر (رئيس الرابطة)"
                    className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم لتسجيل الدخول (Username)</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                    placeholder="مثال: law23_admin"
                    className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور (Password)</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="6 خانات على الأقل"
                      className="w-full pr-10 pl-3 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  className="w-full p-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  بمجرد النقر على "إتمام التسجيل والاعتماد"، سيتم إنشاء وتفعيل حساب الرابطة فوراً، وستتمكن من فتح لوحة القيادة التنفيذية مباشرة.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  الرجوع للسابق
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black flex items-center gap-2 shadow-xl shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{loading ? 'جارٍ التسجيل والاعتماد...' : 'إتمام التسجيل والاعتماد الرسمي 🚀'}</span>
                </button>
              </div>
            </div>
          )}

        </form>

      </div>
    </div>
  );
};
