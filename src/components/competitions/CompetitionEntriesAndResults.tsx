/**
 * PHOTO FINISH PRO AI — Master Competition Entries & Results Workspace
 * Section 11 of Official Master Specification.
 *
 * Capabilities:
 * - Dynamic Mode:
 *   * Pre-competition: «قائمة أولية لمنافسة لم تجرِ بعد» with EMPTY marks, Excel import, and entry management.
 *   * Post-competition: «قائمة النتائج النهائية للمنافسة» with official marks (FAT times, jumps/throws attempts O/X/XO, PB, SB, DNS, DNF, DQ).
 * - Full Disciplines Directory: Track (60m to 10000m, hurdles, relays) and Field (jumps, throws).
 * - Single Unified Export Button: «تصدير جميع تخصصات المنافسة» (All disciplines unified in one file).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Plus, 
  Upload, 
  Trash2
} from 'lucide-react';
import { 
  competitionEntriesService, 
  AthleteCompetitionEntry
} from '../../services/competitionEntriesService';
import { competitionsService, NationalCompetition } from '../../services/competitionsService';
import { disciplinesSeedService } from '../../services/disciplinesSeedService';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Modal } from '../design-system/Modal';
import * as XLSX from 'xlsx';

interface CompetitionEntriesAndResultsProps {
  onBackToHome?: () => void;
  onOpenFieldMode?: () => void;
}

export const CompetitionEntriesAndResults: React.FC<CompetitionEntriesAndResultsProps> = () => {
  // ── 1. States ──
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [selectedCompetition, setSelectedCompetition] = useState<NationalCompetition | null>(null);
  const [entries, setEntries] = useState<AthleteCompetitionEntry[]>([]);
  
  // Selected Discipline
  const [selectedDisciplineCode, setSelectedDisciplineCode] = useState<string>('100M');
  const [selectedDisciplineGroup, setSelectedDisciplineGroup] = useState<'all' | 'course' | 'concours'>('all');
  
  // Modals
  const [showAddAthleteModal, setShowAddAthleteModal] = useState<boolean>(false);
  const [showImportExcelModal, setShowImportExcelModal] = useState<boolean>(false);

  // Add Athlete Form State
  const [newAthleteName, setNewAthleteName] = useState('');
  const [newAthleteBib, setNewAthleteBib] = useState<number>(101);
  const [newAthleteDob, setNewAthleteDob] = useState('2002-05-15');
  const [newAthleteCategory, setNewAthleteCategory] = useState('أكابر');
  const [newAthleteClub, setNewAthleteClub] = useState('مولودية الجزائر (MCA)');
  const [newAthleteLane, setNewAthleteLane] = useState<number>(1);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 2. Data Loading ──
  useEffect(() => {
    competitionsService.getCompetitions().then(comps => {
      setCompetitions(comps);
      const activeId = competitionsService.getActiveCompetitionId() || comps[0]?.id || '';
      setSelectedCompId(activeId);
      const activeComp = comps.find(c => c.id === activeId) || comps[0] || null;
      setSelectedCompetition(activeComp);
    });
  }, []);

  const loadEntries = async (compId: string) => {
    const list = await competitionEntriesService.getEntries(compId);
    setEntries(list);
  };

  useEffect(() => {
    if (selectedCompId) {
      loadEntries(selectedCompId);
      competitionsService.getCompetitionById(selectedCompId).then(c => setSelectedCompetition(c));
    }
  }, [selectedCompId]);

  // Master disciplines list
  const allDisciplines = useMemo(() => {
    return disciplinesSeedService.getAllDisciplines();
  }, []);

  const filteredDisciplines = useMemo(() => {
    if (selectedDisciplineGroup === 'all') return allDisciplines;
    return allDisciplines.filter(d => d.group === selectedDisciplineGroup);
  }, [allDisciplines, selectedDisciplineGroup]);

  // Current active discipline
  const currentDiscipline = useMemo(() => {
    return allDisciplines.find(d => d.code === selectedDisciplineCode) || allDisciplines[0];
  }, [allDisciplines, selectedDisciplineCode]);

  // Entries filtered by current discipline
  const currentDisciplineEntries = useMemo(() => {
    return entries.filter(e => 
      e.disciplineId === currentDiscipline.id || 
      e.disciplineNameAr.includes(currentDiscipline.nameAr) ||
      e.disciplineNameAr.toLowerCase().includes(currentDiscipline.code.toLowerCase())
    );
  }, [entries, currentDiscipline]);

  // Check if competition is upcoming or already finished
  const isPreCompetition = selectedCompetition?.status === 'upcoming';

  // ── 3. Actions ──
  const handleAddAthleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompId || !newAthleteName.trim()) return;

    await competitionEntriesService.addEntry({
      competitionId: selectedCompId,
      disciplineId: currentDiscipline.id,
      disciplineNameAr: currentDiscipline.nameAr,
      athleteId: `ath_${Date.now().toString(36)}`,
      bib: Number(newAthleteBib) || 100,
      athleteName: newAthleteName.trim(),
      birthDate: newAthleteDob,
      category: newAthleteCategory,
      gender: 'M',
      clubId: 'club_custom',
      clubName: newAthleteClub.trim(),
      status: 'entered',
      mark: '', // Empty in pre-competition!
      lane: Number(newAthleteLane) || 1
    });

    setShowAddAthleteModal(false);
    setNewAthleteName('');
    setNewAthleteBib(prev => prev + 1);
    loadEntries(selectedCompId);
  };

  const handleRemoveEntry = async (entryId: string) => {
    await competitionEntriesService.removeEntry(entryId);
    loadEntries(selectedCompId);
  };

  // Unified Export of all disciplines
  const handleExportAllExcel = async () => {
    if (!selectedCompetition) return;
    await competitionEntriesService.exportAllDisciplinesToExcel(selectedCompetition);
  };

  const handlePrintCurrentRoster = () => {
    window.print();
  };

  // Handle Excel File Import
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const rows = data.map((item, idx) => ({
          bib: Number(item['الرقم'] || item['bib'] || item['صدرية'] || (100 + idx)),
          name: String(item['الاسم واللقب'] || item['name'] || item['اسم العداء'] || ''),
          birthDate: String(item['تاريخ الميلاد'] || item['dob'] || '2002-01-01'),
          category: String(item['الصنف'] || item['category'] || 'أكابر'),
          club: String(item['النادي'] || item['club'] || 'نادي مستقل')
        })).filter(r => r.name.trim().length > 0);

        if (rows.length > 0) {
          await competitionEntriesService.importFromExcelRows(
            selectedCompId,
            currentDiscipline.id,
            currentDiscipline.nameAr,
            rows
          );
          loadEntries(selectedCompId);
          setShowImportExcelModal(false);
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة ملف Excel. يرجى التأكد من توافق الأعمدة.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6" dir="rtl">
      
      {/* ════════════════════════════════════════════════════════════════════════
          1. HEADER & COMPETITION SELECTOR (11.1 اختيار المنافسة)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl shrink-0">
              📋
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  واجهة قائمة التخصصات • COMPETITION ENTRIES & RESULTS
                </span>
                
                {/* Dynamic Status Badge */}
                {isPreCompetition ? (
                  <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-600/60 animate-pulse">
                    قائمة أولية لمنافسة لم تجرِ بعد ⏳
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-600/60">
                    قائمة النتائج النهائية للمنافسة 🏆
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {selectedCompetition ? selectedCompetition.name : 'البطولة الوطنية لألعاب القوى'}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 font-bold">
            <span>📅 {selectedCompetition?.date || '2026-06-25'}</span>
            <span>•</span>
            <span>📍 {selectedCompetition?.venue || 'مركب 5 جويلية'}</span>
            <span>•</span>
            <span className="text-emerald-400">{selectedCompetition?.leagueName || 'الاتحاد الجزائري'}</span>
            <span>•</span>
            <span className="text-slate-300">موسم 2025 / 2026</span>
          </div>
        </div>

        {/* Competition Selector Dropdown & Unified Export Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">المنافسة المختارة:</label>
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="w-full sm:w-64 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {competitions.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status === 'upcoming' ? 'قادمة' : c.status === 'live' ? 'جارية 🔴' : 'مكتملة'})
                </option>
              ))}
            </select>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              UNIFIED EXPORT BUTTON (الميزة الأساسية المطلوبة: تصدير جميع تخصصات المنافسة)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="sm:self-end">
            <button
              onClick={handleExportAllExcel}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
              title="تصدير ملف موحد يجمع كافة تخصصات المنافسة والعدائين والنتائج"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" />
              <span>تصدير جميع تخصصات المنافسة 📑</span>
            </button>
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          2. DISCIPLINES DIRECTORY BAR (11.2 عرض التخصصات)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        
        {/* Category Filters (All, Track races, Field competitions) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-black">
            <button
              onClick={() => setSelectedDisciplineGroup('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                selectedDisciplineGroup === 'all' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              كافة التخصصات ({allDisciplines.length})
            </button>
            <button
              onClick={() => setSelectedDisciplineGroup('course')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                selectedDisciplineGroup === 'course' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              سباقات المضمار (COURSE) 🏃
            </button>
            <button
              onClick={() => setSelectedDisciplineGroup('concours')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                selectedDisciplineGroup === 'concours' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              مسابقات الميدان (CONCOURS) 🎯
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => setShowAddAthleteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-600/60 text-xs font-black text-emerald-400 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عداء للتخصص +</span>
            </button>

            <button
              onClick={() => setShowImportExcelModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 cursor-pointer transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>استيراد Excel 📥</span>
            </button>

            <button
              onClick={handlePrintCurrentRoster}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 cursor-pointer transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة A4 🖨️</span>
            </button>
          </div>
        </div>

        {/* Horizontal Discipline Chips Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {filteredDisciplines.slice(0, 30).map(disc => {
            const isSelected = disc.code === selectedDisciplineCode;
            const count = entries.filter(e => e.disciplineId === disc.id || e.disciplineNameAr.includes(disc.nameAr)).length;

            return (
              <button
                key={disc.id}
                onClick={() => setSelectedDisciplineCode(disc.code)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-lg shadow-emerald-950/80 scale-[1.02]'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{disc.nameAr}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  isSelected ? 'bg-slate-950/60 text-amber-300' : 'bg-slate-950 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          3. ATHLETES ENTRIES & RESULTS TABLE (11.3 جدول العدائين)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden space-y-0">
        
        {/* Table Title Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              {currentDiscipline.group === 'course' ? '🏃' : '🎯'}
            </span>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>جدول المشاركين والنتائج: {currentDiscipline.nameAr}</span>
                <span className="text-xs text-slate-500 font-mono">({currentDiscipline.code})</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isPreCompetition 
                  ? 'قائمة المسجلين المعتمدة — خانة النتيجة فارغة قبل إطلاق السباق' 
                  : 'النتائج الرسمية المعتمدة مع توثيق أزمنة FAT والمحاولات'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span>إجمالي العدائين المسجلين:</span>
            <span className="font-mono font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              {currentDisciplineEntries.length}
            </span>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-black border-b border-slate-800">
              <tr>
                <th className="p-3 w-12 text-center">الرقم</th>
                <th className="p-3">الاسم واللقب</th>
                <th className="p-3">تاريخ الميلاد</th>
                <th className="p-3">الصنف</th>
                <th className="p-3">النادي الرياضي</th>
                <th className="p-3 text-center">المسار</th>
                <th className="p-3 text-center">
                  {isPreCompetition ? 'النتيجة (فارغة قبل السباق)' : 'النتيجة المعتمدة'}
                </th>
                <th className="p-3 text-center">الترتيب</th>
                <th className="p-3 text-center">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-white">
              {currentDisciplineEntries.map((e) => {
                const isWinner = e.rank === 1;
                const isPodium = e.rank && e.rank <= 3;

                return (
                  <tr key={e.id} className="hover:bg-slate-800/50 transition-colors">
                    
                    {/* الرقم والصدرية */}
                    <td className="p-3 text-center font-mono font-black text-emerald-400">
                      <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800">
                        {e.bib}
                      </span>
                    </td>

                    {/* الاسم واللقب */}
                    <td className="p-3 font-black text-white">
                      <div className="flex items-center gap-2">
                        <span>{e.athleteName}</span>
                        {e.isPersonalBest && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950 text-amber-300 border border-amber-600/60 font-bold" title="رقم شخصي جديد">
                            PB 🔥
                          </span>
                        )}
                        {e.isSeasonBest && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold" title="أفضل رقم في الموسم">
                            SB
                          </span>
                        )}
                      </div>
                    </td>

                    {/* تاريخ الميلاد */}
                    <td className="p-3 font-mono text-slate-300">{e.birthDate}</td>

                    {/* الصنف */}
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300">
                        {e.category}
                      </span>
                    </td>

                    {/* النادي الرياضي */}
                    <td className="p-3 font-bold text-slate-200">
                      {e.clubName}
                    </td>

                    {/* المسار */}
                    <td className="p-3 text-center font-mono font-bold text-slate-400">
                      {e.lane ? `حارة ${e.lane}` : '-'}
                    </td>

                    {/* النتيجة */}
                    <td className="p-3 text-center font-mono font-black">
                      {e.mark ? (
                        <div className="flex flex-col items-center">
                          <span className={`text-sm px-2.5 py-0.5 rounded-lg ${
                            isWinner ? 'bg-amber-950 text-amber-300 border border-amber-600/80 shadow' :
                            isPodium ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            'bg-slate-950 text-white'
                          }`}>
                            {e.mark}
                          </span>
                          {e.attempts && e.attempts.length > 0 && (
                            <span className="text-[10px] text-slate-400 mt-0.5 font-normal">
                              ({e.attempts.join(' - ')})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-bold italic">فارغة</span>
                      )}
                    </td>

                    {/* الترتيب */}
                    <td className="p-3 text-center font-mono font-black">
                      {e.rank ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          e.rank === 1 ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/50' :
                          e.rank === 2 ? 'bg-slate-300 text-slate-950 font-black' :
                          e.rank === 3 ? 'bg-amber-700 text-white font-black' :
                          'text-slate-400'
                        }`}>
                          {e.rank}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* الحالة */}
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          e.status === 'finished' ? 'success' :
                          e.status === 'dns' ? 'neutral' :
                          e.status === 'dnf' || e.status === 'dq' ? 'danger' : 'info'
                        }
                        size="sm"
                      >
                        {e.status === 'finished' ? 'مكتمل' :
                         e.status === 'dns' ? 'DNS (غائب)' :
                         e.status === 'dnf' ? 'DNF (انسحاب)' :
                         e.status === 'dq' ? 'DQ (إقصاء)' : 'مشارك'}
                      </Badge>
                    </td>

                    {/* إجراءات */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleRemoveEntry(e.id)}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="حذف من التخصص"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                );
              })}

              {currentDisciplineEntries.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500 font-bold">
                    لم يتم تسجيل أي عداء في هذا التخصص حتى الآن. استخدم زر «إضافة عداء للتخصص +» لتسجيل المشاركين.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          4. MODALS (Add Athlete & Import Excel)
      ════════════════════════════════════════════════════════════════════════ */}

      {/* ── Modal: Add Athlete ── */}
      {showAddAthleteModal && (
        <Modal
          isOpen={showAddAthleteModal}
          onClose={() => setShowAddAthleteModal(false)}
          title={`إضافة عداء لتخصص: ${currentDiscipline.nameAr}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddAthleteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">اسم ولقب العداء:</label>
              <input
                type="text"
                required
                value={newAthleteName}
                onChange={(e) => setNewAthleteName(e.target.value)}
                placeholder="مثال: يوسف العبدلي"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الصدرية (Bib):</label>
                <input
                  type="number"
                  required
                  value={newAthleteBib}
                  onChange={(e) => setNewAthleteBib(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم المسار (الحارة):</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={newAthleteLane}
                  onChange={(e) => setNewAthleteLane(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الميلاد:</label>
                <input
                  type="date"
                  value={newAthleteDob}
                  onChange={(e) => setNewAthleteDob(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الصنف الرياضي:</label>
                <select
                  value={newAthleteCategory}
                  onChange={(e) => setNewAthleteCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                >
                  <option value="أكابر">أكابر (Senior)</option>
                  <option value="أواسط">أواسط (U20)</option>
                  <option value="أشبال">أشبال (U18)</option>
                  <option value="أصاغر">أصاغر (U16)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">النادي الرياضي:</label>
              <input
                type="text"
                required
                value={newAthleteClub}
                onChange={(e) => setNewAthleteClub(e.target.value)}
                placeholder="مولودية الجزائر (MCA)"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setShowAddAthleteModal(false)}>إلغاء</Button>
              <Button variant="primary" size="sm" type="submit">تأكيد التسجيل وإدراج العداء</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Import Excel ── */}
      {showImportExcelModal && (
        <Modal
          isOpen={showImportExcelModal}
          onClose={() => setShowImportExcelModal(false)}
          title={`استيراد قائمة العدائين من ملف Excel: ${currentDiscipline.nameAr}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs space-y-2">
              <div className="font-black text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تنسيق الأعمدة المدعوم في ملف Excel:</span>
              </div>
              <p>
                يجب أن يحتوي الملف على الأعمدة التالية في الصف الأول:
              </p>
              <div className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-emerald-300">
                الرقم | الاسم واللقب | تاريخ الميلاد | الصنف | النادي
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <Upload className="w-8 h-8 text-emerald-400" />
                <span className="text-xs font-black text-white">انقر لاختيار ملف Excel من جهازك</span>
                <span className="text-[10px] text-slate-500">يدعم صيغ .xlsx و .xls و .csv</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowImportExcelModal(false)}>إغلاق</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
