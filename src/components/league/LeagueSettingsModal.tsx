/**
 * PHOTO FINISH PRO AI — League Profile & Branding Settings Modal
 * Allows League Executives to customize official league name, acronym, logo,
 * official stamp/signature image, accreditation number, and executive contact details.
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Save, 
  X, 
  CheckCircle2, 
  Image as ImageIcon, 
  Stamp
} from 'lucide-react';
import { portalAuthService, RegisteredLeague } from '../../services/portalAuthService';

interface LeagueSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  onLeagueUpdated?: (updated: RegisteredLeague) => void;
}

export const LeagueSettingsModal: React.FC<LeagueSettingsModalProps> = ({
  isOpen,
  onClose,
  leagueId,
  onLeagueUpdated,
}) => {
  const [league, setLeague] = useState<RegisteredLeague | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [region, setRegion] = useState('');
  const [accreditationNumber, setAccreditationNumber] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [presidentName, setPresidentName] = useState('');
  const [secretaryName, setSecretaryName] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = portalAuthService.getLeagueById(leagueId) || portalAuthService.getAllLeagues()[0];
      if (current) {
        setLeague(current);
        setName(current.name || '');
        setShortName(current.shortName || '');
        setWilaya(current.wilaya || '');
        setRegion(current.region || '');
        setAccreditationNumber(current.accreditationNumber || '');
        setOfficialEmail(current.officialEmail || '');
        setPhone(current.phone || '');
        setPresidentName(current.presidentName || current.adminFullName || '');
        setSecretaryName(current.secretaryName || '');
        setAddress(current.address || '');
        setLogoUrl(current.logoUrl || '');
        setStampUrl(current.stampUrl || '');
      }
    }
  }, [isOpen, leagueId]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setStampUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!league) return;

    const updates: Partial<RegisteredLeague> = {
      name: name.trim(),
      shortName: shortName.trim(),
      wilaya: wilaya.trim(),
      region: region.trim(),
      accreditationNumber: accreditationNumber.trim(),
      officialEmail: officialEmail.trim(),
      phone: phone.trim(),
      presidentName: presidentName.trim(),
      secretaryName: secretaryName.trim(),
      address: address.trim(),
      logoUrl: logoUrl.trim(),
      stampUrl: stampUrl.trim(),
    };

    const updated = portalAuthService.updateLeagueProfile(league.id, updates);
    if (updated) {
      setLeague(updated);
      setSavedSuccess(true);
      if (onLeagueUpdated) onLeagueUpdated(updated);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* رأس النافذة */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">إعدادات وهوية الرابطة الرياضية</h2>
              <p className="text-xs text-slate-400">
                تخصيص الشعار، الختم الرسمي، بيانات الاعتماد، والترويسة الموحدة لكافة المحاضر
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* إشعار النجاح */}
        {savedSuccess && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-5 py-3 text-xs font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تم حفظ وتحديث بيانات وشعار الرابطة بنجاح! ستظهر التعديلات على كافة الوثائق والشهادات فوراً.</span>
          </div>
        )}

        {/* استمارة البيانات */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* قسم الشعار والختم */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            {/* شعار الرابطة */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                شعار الرابطة الرسمي (Logo)
              </span>
              
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden p-1 shadow-inner relative group">
                {logoUrl ? (
                  <img src={logoUrl} alt="شعار الرابطة" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-3xl">{league?.logoCode || '🏃'}</span>
                )}
              </div>

              <label className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition">
                <Upload className="w-3.5 h-3.5" />
                <span>رفع الشعار (PNG/JPG)</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  حذف الشعار واستعادة الرمز الافتراضي
                </button>
              )}
            </div>

            {/* ختم وتوقيع الرابطة */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Stamp className="w-4 h-4 text-amber-400" />
                الختم والتوقيع الرسمي (Stamp)
              </span>
              
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                {stampUrl ? (
                  <img src={stampUrl} alt="الختم الرسمي" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-500 font-bold">لا يوجد ختم</span>
                )}
              </div>

              <label className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition">
                <Upload className="w-3.5 h-3.5" />
                <span>رفع صورة الختم المفرغة</span>
                <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
              </label>
              {stampUrl && (
                <button
                  type="button"
                  onClick={() => setStampUrl('')}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  حذف صورة الختم
                </button>
              )}
            </div>
          </div>

          {/* الحقول الأساسية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">اسم الرابطة الرسمي:</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">الرمز المختصر (Acronym):</label>
              <input
                type="text"
                value={shortName}
                onChange={e => setShortName(e.target.value)}
                required
                placeholder="مثال: SAIDA أو LAAP"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">الولاية والمقر:</label>
              <input
                type="text"
                value={wilaya}
                onChange={e => setWilaya(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">رقم الاعتماد الرسمي (Accreditation No):</label>
              <input
                type="text"
                value={accreditationNumber}
                onChange={e => setAccreditationNumber(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">اسم رئيس الرابطة:</label>
              <input
                type="text"
                value={presidentName}
                onChange={e => setPresidentName(e.target.value)}
                placeholder="رئيس الرابطة الولائية لألعاب القوى"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">اسم الكاتب / الأمين العام:</label>
              <input
                type="text"
                value={secretaryName}
                onChange={e => setSecretaryName(e.target.value)}
                placeholder="الكاتب العام للرابطة"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">البريد الإلكتروني الرسمي:</label>
              <input
                type="email"
                value={officialEmail}
                onChange={e => setOfficialEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">الهاتف الرسمي للاتصال:</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">عنوان المقر الإداري:</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="مثال: المركب الرياضي، ص.ب 20، سعيدة"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* زر الحفظ */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ هوية وإعدادات الرابطة</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
