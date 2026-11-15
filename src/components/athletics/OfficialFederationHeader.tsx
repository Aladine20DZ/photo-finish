/**
 * PHOTO FINISH PRO AI — Official Federation Header & Document Shell
 * Unified bi-lingual header meeting World Athletics (Rule 165/164.2) and
 * Algerian Athletics Federation (FAA) formal championship report standards.
 */

import React from 'react';
import { Wind, Timer, CheckCircle } from 'lucide-react';
import { portalAuthService, RegisteredLeague } from '../../services/portalAuthService';

export interface OfficialFederationHeaderProps {
  documentTitle?: string;
  documentSubtitle?: string;
  competitionName?: string;
  venue?: string;
  date?: string;
  discipline?: string;
  category?: string;
  gender?: 'M' | 'F' | 'Mixed' | string;
  windSpeed?: string | number;
  timingSystem?: string;
  chiefJudgeName?: string;
  league?: RegisteredLeague | null;
  season?: string;
  showSignatures?: boolean;
  className?: string;
}

export const OfficialFederationHeader: React.FC<OfficialFederationHeaderProps> = ({
  documentTitle = 'محضر النتائج الرسمية المعتمدة لسباقات ألعاب القوى',
  documentSubtitle = 'OFFICIAL CERTIFIED ATHLETICS RESULTS PROTOCOL',
  competitionName = 'البطولة الوطنية لألعاب القوى',
  venue = 'ملعب 5 جويلية، الجزائر العاصمة',
  date = '2026',
  discipline = '100م نهائي رجال',
  category = 'أكابر (Seniors)',
  gender = 'رجال (Hommes)',
  windSpeed = '+1.2 m/s',
  timingSystem = 'Fully Automatic Timing (FAT Photo Finish 1/1000s)',
  chiefJudgeName = 'الحكم العام الفيدرالي',
  league,
  season = 'الموسم الرياضي 2026',
  showSignatures = true,
  className = '',
}) => {
  // استخدام الرابطة الممررة أو الرابطة النشطة أو الافتراضية (سعيدة)
  const activeLeague = league || portalAuthService.getAllLeagues()[0] || null;

  return (
    <div className={`official-federation-document bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border-2 border-slate-900 shadow-xl print:shadow-none print:border-none print:p-0 ${className}`} dir="rtl">
      
      {/* ═══ 1. الترويسة الشرفية الرسمية للدولة والاتحاد (Top Republic Header) ═══ */}
      <div className="border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          
          {/* اليمين: شعار وهوية الجمهورية والاتحاد الوطني */}
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-black tracking-wide text-slate-900">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </div>
            <div className="text-[11px] font-bold text-slate-700">
              وزارة الشباب والرياضة • الاتحاد الجزائري لألعاب القوى (FAA)
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-tight" dir="ltr">
              RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE • FAA
            </div>
          </div>

          {/* الوسط: شعار الرابطة والبطولة */}
          <div className="flex flex-col items-center">
            {activeLeague?.logoUrl ? (
              <img 
                src={activeLeague.logoUrl} 
                alt="شعار الرابطة" 
                className="w-14 h-14 object-contain rounded-xl border border-slate-300 p-0.5 mb-1" 
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 font-black flex items-center justify-center text-2xl shadow-md border border-slate-700 mb-1">
                {activeLeague?.logoCode || '🏃'}
              </div>
            )}
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {activeLeague?.accreditationNumber || 'LAAP-2026'}
            </span>
          </div>

          {/* اليسار: هوية الرابطة المنظمة */}
          <div className="text-center sm:text-left space-y-1 sm:space-y-0.5">
            <div className="text-xs sm:text-sm font-black text-emerald-800">
              {activeLeague?.name || 'الرابطة الولائية لألعاب القوى'}
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              {activeLeague?.region || activeLeague?.wilaya || 'المستوى الولائي'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {season}
            </div>
          </div>

        </div>
      </div>

      {/* ═══ 2. عنوان الوثيقة الرسمية والاعتماد الدولي ═══ */}
      <div className="bg-slate-100 border border-slate-300 rounded-xl p-3.5 text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 mb-1">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          <span>معتمد وفق لوائح الاتحاد الدولي لألعاب القوى (World Athletics Rules 165 / 164.2)</span>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          {documentTitle}
        </h2>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider mt-0.5" dir="ltr">
          {documentSubtitle}
        </div>
      </div>

      {/* ═══ 3. جدول المعطيات الفنية للمسابقة (Technical Meta Grid) ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-5">
        <div>
          <span className="text-[10px] text-slate-500 block font-bold">اسم البطولة:</span>
          <span className="font-extrabold text-slate-900 truncate block">{competitionName}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block font-bold">الميدان والملعب:</span>
          <span className="font-bold text-slate-800 truncate block">📍 {venue}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block font-bold">التخصص والفئة:</span>
          <span className="font-extrabold text-emerald-800 block">{discipline} • {category} ({gender})</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block font-bold">التاريخ والتوقيت:</span>
          <span className="font-mono text-slate-700 block">{date}</span>
        </div>

        {/* الشريط الفني: سرعة الرياح ونظام التوقيت */}
        <div className="col-span-2 sm:col-span-2 pt-1 border-t border-slate-200 flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[11px] font-bold text-slate-700">
            مقياس الرياح القانوني (Anémomètre):{' '}
            <strong className="text-slate-900 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300">
              {typeof windSpeed === 'number' ? (windSpeed >= 0 ? `+${windSpeed}` : windSpeed) : windSpeed}
            </strong>
            <span className="text-[10px] text-emerald-700 font-bold mr-1.5">(قانونية &le; +2.0 m/s)</span>
          </span>
        </div>

        <div className="col-span-2 sm:col-span-2 pt-1 border-t border-slate-200 flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-slate-700 truncate">
            نظام التوقيت:{' '}
            <strong className="text-slate-900 font-mono text-[10px]">{timingSystem}</strong>
          </span>
        </div>
      </div>

      {showSignatures && (
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <span>الحكم العام للمنافسة: <strong className="text-slate-900">{chiefJudgeName}</strong></span>
          <span>الاعتماد الرسمي: <strong className="text-slate-900">{activeLeague?.accreditationNumber || 'LAAP-2026'}</strong></span>
        </div>
      )}

    </div>
  );
};

export const OfficialFederationFooter: React.FC<{
  chiefJudgeName?: string;
  stampUrl?: string;
  presidentName?: string;
}> = ({
  chiefJudgeName = 'الحكم العام الفيدرالي',
  stampUrl,
  presidentName = 'رئيس الرابطة الولائية',
}) => {
  return (
    <div className="mt-8 pt-4 border-t-2 border-slate-800 text-xs text-slate-800" dir="rtl">
      <div className="grid grid-cols-3 gap-6 text-center">
        
        {/* توقيع رئيس لجنة القضاة والميقاتيين */}
        <div className="space-y-8">
          <div>
            <div className="font-black text-slate-900">رئيس لجنة القضاة والميقاتيين</div>
            <div className="text-[10px] text-slate-500 font-mono">Chef des Chronométreurs</div>
          </div>
          <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-[11px] text-slate-400 italic">
            التوقيع والمصادقة
          </div>
        </div>

        {/* ختم واعتماد الرابطة الرسمي */}
        <div className="space-y-2 flex flex-col items-center justify-between">
          <div>
            <div className="font-black text-slate-900">ختم واعتماد الرابطة</div>
            <div className="text-[10px] text-slate-500 font-mono">Cachet Officiel de la Ligue</div>
          </div>
          <div className="w-24 h-20 rounded-xl border border-slate-300 flex flex-col items-center justify-center p-1 bg-slate-50">
            {stampUrl ? (
              <img src={stampUrl} alt="الختم الرسمي" className="max-h-full object-contain" />
            ) : (
              <div className="text-[10px] text-slate-400 text-center font-bold">
                الختم الرسمي<br />للرابطة الولائية
              </div>
            )}
            <span className="text-[9px] text-slate-600 font-bold mt-0.5">{presidentName}</span>
          </div>
        </div>

        {/* توقيع واعتماد الحكم العام */}
        <div className="space-y-8">
          <div>
            <div className="font-black text-slate-900">الحكم العام للمنافسة (Juge-Arbitre)</div>
            <div className="text-[11px] text-emerald-800 font-bold">{chiefJudgeName}</div>
          </div>
          <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-[11px] text-slate-400 italic">
            التوقيع الرسمي والتاريخ
          </div>
        </div>

      </div>

      <div className="text-center text-[10px] text-slate-400 font-mono pt-4 mt-4 border-t border-slate-200">
        وثيقة صادرة وموقعة إلكترونياً عبر منظومة Photo Finish Pro AI — مطابقة للوائح ألعاب القوى الرسمية (World Athletics / FAA)
      </div>
    </div>
  );
};
