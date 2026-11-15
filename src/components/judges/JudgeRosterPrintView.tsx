/**
 * PHOTO FINISH PRO AI — Official A4 Printable Judges & Assignments Roster
 * World Athletics Rule 18 & 19 Compliant Technical Officials Register.
 * Official print stylesheet with federation headers, stamp blocks, and signature lines.
 */

import React from 'react';
import { Printer, X } from 'lucide-react';
import { JudgeAssignment, CertifiedJudge } from '../../services/judgesAssignmentService';
import { NationalCompetition } from '../../services/competitionsService';
import { OfficialFederationHeader, OfficialFederationFooter } from '../athletics/OfficialFederationHeader';
import { portalAuthService } from '../../services/portalAuthService';

interface JudgeRosterPrintViewProps {
  competition: NationalCompetition;
  assignments: JudgeAssignment[];
  judges: CertifiedJudge[];
  selectedDisciplineName?: string;
  onClose: () => void;
}

export const JudgeRosterPrintView: React.FC<JudgeRosterPrintViewProps> = ({
  competition,
  assignments,
  judges,
  selectedDisciplineName,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const activeAssignments = selectedDisciplineName && selectedDisciplineName !== 'all'
    ? assignments.filter(a => a.disciplineNameAr === selectedDisciplineName)
    : assignments;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 overflow-y-auto flex justify-center p-2 sm:p-6" dir="rtl">
      
      {/* Container simulating A4 sheet */}
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col print:m-0 print:p-0 print:w-full print:max-w-none print:shadow-none print:rounded-none">
        
        {/* Screen Only Control Bar */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">🖨️</span>
            <div>
              <h2 className="text-sm sm:text-base font-black">معاينة وطباعة جدول التعيينات الرسمي للحكام (A4)</h2>
              <p className="text-xs text-slate-400">وثيقة رسمية معتمدة وفق القانون الدولي لألعاب القوى (TR 18 & 19)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند (Print A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 space-y-6 print:p-6 text-slate-900 bg-white">
          
          {/* Official Federation & League Header */}
          <OfficialFederationHeader
            competitionName={competition.name}
            league={portalAuthService.getLeagueById(competition.leagueId) || null}
            date={competition.date}
            venue={competition.venue}
            documentTitle="جدول التعيينات الميدانية للحكام والقضاة الرسميين"
          />

          {/* Subheading Information Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div>
              <span className="font-bold text-slate-500 block">المنافسة:</span>
              <span className="font-black text-slate-900">{competition.name}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">التاريخ والمكان:</span>
              <span className="font-black text-slate-900">{competition.date} • {competition.city}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">الجهة المنظمة:</span>
              <span className="font-black text-slate-900">{competition.leagueName}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">عدد الحكام المعينين:</span>
              <span className="font-black text-slate-900">{activeAssignments.length} حكماً رسمياً</span>
            </div>
          </div>

          {/* Main Roster Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black">
                <tr>
                  <th className="p-2.5 text-center border-l border-slate-300 w-10">#</th>
                  <th className="p-2.5 border-l border-slate-300">اسم ولقب الحكم</th>
                  <th className="p-2.5 border-l border-slate-300">الرتبة</th>
                  <th className="p-2.5 border-l border-slate-300">الرابطة</th>
                  <th className="p-2.5 border-l border-slate-300">التخصص المعين</th>
                  <th className="p-2.5 border-l border-slate-300">المهمة الرسمية</th>
                  <th className="p-2.5 border-l border-slate-300">مكان الميدان</th>
                  <th className="p-2.5 text-center">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {activeAssignments.map((a, idx) => {
                  const judge = judges.find(j => j.id === a.judgeId);
                  const gradeLabel = 
                    a.judgeGrade === 'international' ? 'دولي' :
                    a.judgeGrade === 'federal' ? 'فيدرالي' :
                    a.judgeGrade === 'regional' ? 'جهوي' : 'ولائي';

                  return (
                    <tr key={a.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="p-2.5 text-center font-mono font-bold border-l border-slate-200">{idx + 1}</td>
                      <td className="p-2.5 font-black border-l border-slate-200">
                        {a.judgeName}
                        <div className="text-[10px] text-slate-500 font-mono">{judge?.licenseNumber}</div>
                      </td>
                      <td className="p-2.5 border-l border-slate-200 font-bold">{gradeLabel}</td>
                      <td className="p-2.5 border-l border-slate-200">{judge?.wilaya || 'الرابطة الولائية'}</td>
                      <td className="p-2.5 border-l border-slate-200 font-bold text-slate-800">{a.disciplineNameAr}</td>
                      <td className="p-2.5 border-l border-slate-200 font-black text-slate-900">{a.taskTitleAr}</td>
                      <td className="p-2.5 border-l border-slate-200">{a.venue}</td>
                      <td className="p-2.5 text-center font-mono font-bold whitespace-nowrap">
                        {a.scheduledStartTime} - {a.scheduledEndTime}
                      </td>
                    </tr>
                  );
                })}

                {activeAssignments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      لم يتم تعيين أي حكام حتى الآن في هذا التخصص.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signatures & Stamps Footer */}
          <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-12">
              <span className="font-black text-slate-800 block">رئيس الرابطة الولائية المنظمة</span>
              <div className="text-[10px] text-slate-400 italic">الختم والتوقيع</div>
            </div>

            <div className="space-y-12">
              <span className="font-black text-slate-800 block">الحكم العام للمنافسة (Chief Judge)</span>
              <div className="text-[10px] text-slate-400 italic">الختم والتوقيع</div>
            </div>

            <div className="space-y-12">
              <span className="font-black text-slate-800 block">المندوب الفني للاتحاد (Technical Delegate)</span>
              <div className="text-[10px] text-slate-400 italic">الختم والتوقيع</div>
            </div>
          </div>

          <OfficialFederationFooter 
            chiefJudgeName="الحكم العام الفيدرالي"
            presidentName={competition.leagueName}
          />

        </div>

      </div>

    </div>
  );
};
