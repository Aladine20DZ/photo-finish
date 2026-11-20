import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  Archive,
  User,
  CheckCircle2,
  CheckSquare,
  Square,
  ArrowRight
} from 'lucide-react';
import { recycleBinService, RecycleBinItem, RecycleEntityType } from '../../services/recycleBinService';
import { competitionsService } from '../../services/competitionsService';
import { judgesAssignmentService } from '../../services/judgesAssignmentService';
import { athleteClubStorage } from '../../services/athleteClubStorage';
import { competitionsBureauService } from '../../services/competitionsBureauService';

interface RecycleBinWorkspaceProps {
  leagueId?: string;
  leagueName?: string;
  onClose?: () => void;
}

const ENTITY_TYPE_NAMES: Record<RecycleEntityType, { label: string; badgeClass: string }> = {
  competition: { label: 'منافسة رياضية', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  event: { label: 'مسابقة / تظاهرة', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  judge: { label: 'حكم معتمد', badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  assignment: { label: 'تعيين وتكليف', badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  athlete: { label: 'عداء / مشارك', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  club: { label: 'نادي رياضي', badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  registration: { label: 'تسجيل مشاركة', badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  race: { label: 'سلسلة / سباق', badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  result: { label: 'نتيجة رسمية', badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  report: { label: 'محضر / تقرير', badgeClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  device: { label: 'محطة ميدانية', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30' }
};

export const RecycleBinWorkspace: React.FC<RecycleBinWorkspaceProps> = ({
  leagueId = 'lg_saida',
  leagueName = 'رابطة ألعاب القوى سعيدة (LWAS)',
  onClose
}) => {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<RecycleEntityType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshItems = () => {
    const list = recycleBinService.listDeletedItems(leagueId);
    setItems(list);
  };

  useEffect(() => {
    refreshItems();
    const unsub = recycleBinService.onRecycleBinChanged(() => {
      refreshItems();
    });
    return unsub;
  }, [leagueId]);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterType !== 'all' && item.entityType !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = (item.entityName || '').toLowerCase().includes(query);
        const matchesType = (item.entityType || '').toLowerCase().includes(query);
        const matchesReason = (item.reason || '').toLowerCase().includes(query);
        const matchesAuthor = (item.deletedBy || '').toLowerCase().includes(query);
        if (!matchesName && !matchesType && !matchesReason && !matchesAuthor) return false;
      }
      return true;
    });
  }, [items, filterType, searchQuery]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  // Restore single item
  const handleRestore = async (item: RecycleBinItem) => {
    setIsProcessing(true);
    try {
      // 1. Restore inside specific core service
      if (item.entityType === 'competition') {
        await competitionsService.restoreCompetition(item.payload);
      } else if (item.entityType === 'judge') {
        await judgesAssignmentService.restoreJudge(item.payload);
      } else if (item.entityType === 'assignment') {
        await judgesAssignmentService.restoreAssignment(item.payload);
      } else if (item.entityType === 'athlete') {
        await athleteClubStorage.restoreAthlete(item.payload);
      } else if (item.entityType === 'club') {
        await athleteClubStorage.restoreClub(item.payload);
      } else if (item.entityType === 'result') {
        await competitionsBureauService.restoreOperation(item.payload);
      }

      // 2. Mark restored in recycle bin service
      const res = await recycleBinService.restoreItem(item.id);
      if (res.success) {
        notify(`تمت استعادة "${item.entityName}" بنجاح وإعادتها لقائمتها التشغيلية.`);
        refreshItems();
      } else {
        notify(res.error || 'فشلت عملية الاستعادة', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'حدث خطأ أثناء الاستعادة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Permanent Delete single item
  const handlePermanentDelete = async (item: RecycleBinItem) => {
    if (!window.confirm(`تنبيه قطعي: هل أنت متأكد من الحذف النهائي لـ "${item.entityName}"؟ لا يمكن استرجاع هذا السجل إطلاقاً.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await recycleBinService.permanentlyDeleteItem(item.id);
      if (res.success) {
        notify(`تم حذف "${item.entityName}" نهائياً من قاعدة البيانات.`);
        refreshItems();
      } else {
        notify(res.error || 'فشل الحذف النهائي', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'حدث خطأ أثناء الحذف', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Restore
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const item = items.find(i => i.id === id);
        if (item) {
          if (item.entityType === 'competition') await competitionsService.restoreCompetition(item.payload);
          else if (item.entityType === 'judge') await judgesAssignmentService.restoreJudge(item.payload);
          else if (item.entityType === 'assignment') await judgesAssignmentService.restoreAssignment(item.payload);
          else if (item.entityType === 'athlete') await athleteClubStorage.restoreAthlete(item.payload);
          else if (item.entityType === 'club') await athleteClubStorage.restoreClub(item.payload);
          else if (item.entityType === 'result') await competitionsBureauService.restoreOperation(item.payload);
        }
      }
      const res = await recycleBinService.bulkRestore(Array.from(selectedIds));
      notify(`تمت استعادة ${res.restoredCount} عناصر بنجاح إلى أماكنها الأصلية.`);
      setSelectedIds(new Set());
      refreshItems();
    } catch (e: any) {
      notify('حدث خطأ أثناء الاستعادة الجماعية', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Permanent Delete
  const handleBulkPermanentDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`تحذير أمني: أنت على وشك الحذف القطعي النهائي لـ (${selectedIds.size}) عناصر من قاعدة البيانات. هل تريد الاستمرار؟`)) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await recycleBinService.bulkPermanentDelete(Array.from(selectedIds));
      notify(`تم حذف ${res.deletedCount} عناصر نهائياً.`);
      setSelectedIds(new Set());
      refreshItems();
    } catch (e: any) {
      notify('حدث خطأ أثناء الحذف الجماعي', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty Bin
  const handleEmptyBin = async () => {
    if (items.length === 0) return;
    if (!window.confirm(`⚠️ تحذير نهائي: هل تريد إفراغ سلة المحذوفات بالكامل وحذف كافة العناصر الـ (${items.length}) نهائياً؟`)) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await recycleBinService.emptyRecycleBin(leagueId);
      notify(`تم إفراغ سلة المحذوفات بنجاح (${res.count} عنصر).`);
      setSelectedIds(new Set());
      refreshItems();
    } catch (e: any) {
      notify('حدث خطأ أثناء إفراغ السلة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(() => recycleBinService.getStats(leagueId), [items, leagueId]);

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ═══ Header ═══ */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">سلة المحذوفات المركزية</h2>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {stats.totalDeleted} عنصر محذوف
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                خاصة بـ <span className="text-slate-200 font-bold">{leagueName}</span> • استرجاع وحذف نهائي لكافة المنافسات والتظاهرات والحكام والعدائين والنتائج.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>العودة للرابطة</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleEmptyBin}
              disabled={items.length === 0 || isProcessing}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>إفراغ السلة كلياً</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            notification.type === 'success' 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Filters and Actions Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم، نوع الكيان، القائم بالحذف، أو سبب الحذف..."
              className="w-full pl-3 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans"
            />
          </div>

          {/* Bulk Action Buttons if items selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-2xl">
              <span className="text-xs font-bold text-amber-400">
                محدد: {selectedIds.size}
              </span>
              <button
                type="button"
                onClick={handleBulkRestore}
                disabled={isProcessing}
                className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-black flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>استعادة الكل المختار</span>
              </button>
              <button
                type="button"
                onClick={handleBulkPermanentDelete}
                disabled={isProcessing}
                className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-black flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>حذف نهائي</span>
              </button>
            </div>
          )}

        </div>

        {/* Entity Type Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-800/80">
          {[
            { id: 'all', label: `كافة العناصر (${items.length})` },
            { id: 'competition', label: `المنافسات (${stats.byType.competition || 0})` },
            { id: 'judge', label: `الحكام (${stats.byType.judge || 0})` },
            { id: 'assignment', label: `التعيينات (${stats.byType.assignment || 0})` },
            { id: 'athlete', label: `العداؤون (${stats.byType.athlete || 0})` },
            { id: 'club', label: `الأندية (${stats.byType.club || 0})` },
            { id: 'result', label: `النتائج (${stats.byType.result || 0})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* ═══ Items Table ═══ */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
              <Archive className="w-7 h-7" />
            </div>
            <div className="text-sm font-bold text-slate-300">
              {searchQuery ? 'لا توجد نتائج تطابق معايير البحث' : 'سلة المحذوفات فارغة حالياً'}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              عند حذف أي منافسة، أو تعيين، أو عداء، أو نادي، تظهر العناصر هنا مع إمكانية استرجاعها ببياناتها الكاملة بنقرة زر.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <button onClick={toggleSelectAll} className="cursor-pointer text-slate-400 hover:text-white">
                      {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">العنصر المحذوف</th>
                  <th className="py-3.5 px-3">نوع الكيان</th>
                  <th className="py-3.5 px-3">الوحدة المصدرية</th>
                  <th className="py-3.5 px-3">تاريخ ووقت الحذف</th>
                  <th className="py-3.5 px-3">القائم بالحذف</th>
                  <th className="py-3.5 px-3">سبب الحذف</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات التشغيلية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.map(item => {
                  const isSelected = selectedIds.has(item.id);
                  const typeMeta = ENTITY_TYPE_NAMES[item.entityType] || { label: item.entityType, badgeClass: 'bg-slate-800 text-slate-300' };

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition hover:bg-slate-800/40 ${isSelected ? 'bg-amber-500/5' : ''}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => toggleSelect(item.id)} className="cursor-pointer text-slate-400 hover:text-white">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-black text-white text-sm font-sans">
                          {item.entityName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {item.entityId}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${typeMeta.badgeClass}`}>
                          {typeMeta.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {item.sourceModule}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {new Date(item.deletedAt).toLocaleString('ar-DZ')}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        <div className="flex items-center gap-1.5 font-bold">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{item.deletedBy}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{item.deletedByRole}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate" title={item.reason}>
                        {item.reason || '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRestore(item)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1 transition cursor-pointer"
                            title="استعادة هذا السجل إلى حالته النشطة"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>استعادة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(item)}
                            disabled={isProcessing}
                            className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition cursor-pointer"
                            title="حذف نهائي لا رجعة فيه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
