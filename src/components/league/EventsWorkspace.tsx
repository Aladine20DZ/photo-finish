/**
 * PHOTO FINISH PRO AI — Events Workspace (Stage 2 — League Portal)
 * Full management workspace for "التظاهرات" (Athletics Events):
 * lifecycle transitions, linked competitions, documents, committees.
 * Visual language matches LeagueExecutiveSuite (track-pro solid surfaces).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Plus,
  MapPin,
  FileText,
  Users,
  ChevronLeft,
  Pencil,
  Trash2,
  Link2,
  Unlink,
  FolderOpen,
  CircleDot,
  Archive,
  Flag,
  PlayCircle,
  Loader2,
  X,
  ClipboardList,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Input } from '../design-system/Input';
import { Select } from '../design-system/Select';
import { Modal } from '../design-system/Modal';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';
import {
  eventsService,
  AthleticsEvent,
  EventStatus,
  EventType,
  EventClassification,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_FLOW,
  EVENT_TYPE_LABELS,
  EVENT_CLASSIFICATION_LABELS,
  EventDocument
} from '../../services/eventsService';
import { competitionsService, NationalCompetition } from '../../services/competitionsService';

interface EventsWorkspaceProps {
  leagueId: string;
  leagueName: string;
  onFeedback?: (type: 'success' | 'error', text: string) => void;
}

const STATUS_BADGE_VARIANT: Record<EventStatus, 'info' | 'success' | 'danger' | 'warning' | 'neutral'> = {
  preparing: 'neutral',
  open: 'info',
  ongoing: 'danger',
  completed: 'success',
  archived: 'warning'
};

const DOC_KIND_LABELS: Record<EventDocument['kind'], string> = {
  invitation: 'خطاب دعوة',
  program: 'برنامج رسمي',
  entry_list: 'قائمة مشاركين',
  results: 'نتائج',
  report: 'محضر / تقرير',
  other: 'مستند آخر'
};

interface EventFormState {
  name: string;
  type: EventType;
  classification: EventClassification;
  season: string;
  organizer: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  program: string;
  notes: string;
}

const EMPTY_FORM: EventFormState = {
  name: '',
  type: 'championship',
  classification: 'wilaya',
  season: String(new Date().getFullYear()),
  organizer: '',
  startDate: '',
  endDate: '',
  venue: '',
  city: '',
  program: '',
  notes: ''
};

export const EventsWorkspace: React.FC<EventsWorkspaceProps> = ({ leagueId, leagueName, onFeedback }) => {
  const [events, setEvents] = useState<AthleticsEvent[]>([]);
  const [competitions, setCompetitions] = useState<NationalCompetition[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AthleticsEvent | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [detailEvent, setDetailEvent] = useState<AthleticsEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AthleticsEvent | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocKind, setNewDocKind] = useState<EventDocument['kind']>('other');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [evts, comps] = await Promise.all([
        eventsService.getEvents(leagueId),
        competitionsService.getCompetitions(leagueId)
      ]);
      if (!alive) return;
      setEvents(evts);
      setCompetitions(comps);
    };
    load();
    const unsub = eventsService.onEventsChanged(() => load());
    return () => {
      alive = false;
      unsub();
    };
  }, [leagueId]);

  const stats = useMemo(() => eventsService.getStats(leagueId), [events, leagueId]);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? events : events.filter(e => e.status === statusFilter)),
    [events, statusFilter]
  );

  const availableCompetitions = useMemo(
    () => competitions.filter(c => !c.eventId || c.eventId === detailEvent?.id),
    [competitions, detailEvent]
  );

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM, organizer: leagueName });
    setShowForm(true);
  };

  const openEdit = (evt: AthleticsEvent) => {
    setEditingEvent(evt);
    setForm({
      name: evt.name,
      type: evt.type,
      classification: evt.classification,
      season: evt.season,
      organizer: evt.organizer,
      startDate: evt.startDate,
      endDate: evt.endDate,
      venue: evt.venue,
      city: evt.city,
      program: evt.program,
      notes: evt.notes
    });
    setShowForm(true);
  };

  const handleSaveEvent = async () => {
    if (!form.name.trim() || !form.startDate) {
      onFeedback?.('error', 'اسم التظاهرة وتاريخ البداية حقلان إلزاميان.');
      return;
    }
    const endDate = form.endDate || form.startDate;
    setBusyId('form');
    try {
      if (editingEvent) {
        await eventsService.updateEvent(editingEvent.id, { ...form, endDate });
        onFeedback?.('success', 'تم تحديث بيانات التظاهرة بنجاح.');
      } else {
        await eventsService.createEvent({
          name: form.name.trim(),
          type: form.type,
          classification: form.classification,
          season: form.season,
          organizer: form.organizer.trim() || leagueName,
          startDate: form.startDate,
          endDate,
          venue: form.venue.trim(),
          city: form.city.trim(),
          wilayaCode: '20',
          status: 'preparing',
          leagueId,
          leagueName,
          program: form.program,
          competitionsIds: [],
          clubsCount: 0,
          documents: [],
          committee: [],
          notes: form.notes
        });
        onFeedback?.('success', 'تم إنشاء التظاهرة في حالة "تحضير".');
      }
      setShowForm(false);
    } finally {
      setBusyId(null);
    }
  };

  const handleTransition = async (evt: AthleticsEvent, next: EventStatus) => {
    setBusyId(evt.id);
    const res = await eventsService.transitionEventStatus(evt.id, next);
    setBusyId(null);
    if (!res.success) {
      onFeedback?.('error', res.error || 'تعذر الانتقال.');
    } else {
      onFeedback?.('success', `تم تحديث حالة التظاهرة إلى "${EVENT_STATUS_LABELS[next]}".`);
      if (detailEvent?.id === evt.id) {
        setDetailEvent(await eventsService.getEventById(evt.id));
      }
    }
  };

  const handleDeleteConfirm = async (options: { reason: string; permanent: boolean }) => {
    if (!deleteTarget) return;
    const res = await eventsService.deleteEvent(deleteTarget.id, {
      reason: options.reason,
      permanent: options.permanent
    });
    setDeleteTarget(null);
    if (!res.success) {
      onFeedback?.('error', res.error || 'تعذر الحذف.');
    } else {
      onFeedback?.('success', 'تم نقل التظاهرة إلى سلة المحذوفات المركزية.');
      if (detailEvent?.id === deleteTarget.id) setDetailEvent(null);
    }
  };

  const handleLinkCompetition = async (comp: NationalCompetition) => {
    if (!detailEvent) return;
    setBusyId(comp.id);
    await competitionsService.linkCompetitionToEvent(comp.id, detailEvent.id, detailEvent.name);
    const refreshed = await eventsService.getEventById(detailEvent.id);
    setDetailEvent(refreshed);
    setBusyId(null);
    onFeedback?.('success', `تم ربط المنافسة "${comp.name}" بالتظاهرة.`);
  };

  const handleUnlinkCompetition = async (comp: NationalCompetition) => {
    if (!detailEvent) return;
    setBusyId(comp.id);
    await competitionsService.linkCompetitionToEvent(comp.id, null);
    await eventsService.unlinkCompetition(detailEvent.id, comp.id);
    const refreshed = await eventsService.getEventById(detailEvent.id);
    setDetailEvent(refreshed);
    setBusyId(null);
    onFeedback?.('success', 'تم فصل المنافسة عن التظاهرة.');
  };

  const handleAddDocument = async () => {
    if (!detailEvent || !newDocName.trim()) return;
    setBusyId('doc');
    await eventsService.addDocument(detailEvent.id, { name: newDocName.trim(), kind: newDocKind });
    setDetailEvent(await eventsService.getEventById(detailEvent.id));
    setNewDocName('');
    setNewDocKind('other');
    setBusyId(null);
    onFeedback?.('success', 'تمت إضافة المستند إلى ملف التظاهرة.');
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!detailEvent) return;
    await eventsService.removeDocument(detailEvent.id, docId);
    setDetailEvent(await eventsService.getEventById(detailEvent.id));
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {([
          { key: 'total', label: 'إجمالي التظاهرات', icon: CalendarDays },
          { key: 'preparing', label: 'قيد التحضير', icon: ClipboardList },
          { key: 'ongoing', label: 'جارية الآن', icon: PlayCircle },
          { key: 'completed', label: 'منتهية', icon: Flag },
          { key: 'archived', label: 'مؤرشفة', icon: Archive }
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? 'all' : (key as EventStatus))}
            className={`p-4 rounded-2xl border text-right transition cursor-pointer ${
              statusFilter === key
                ? 'border-[var(--primary,#0B3A6F)] bg-[var(--primary-soft,#E8F0FA)]'
                : 'border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] hover:border-[var(--primary,#0B3A6F)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--ink-2,#51607A)]">{label}</span>
              <Icon className="w-4 h-4 text-[var(--ink-3,#8593A8)]" />
            </div>
            <div className="text-2xl font-black text-[var(--ink,#0F1B2D)] dark:text-white mt-1">
              {stats[key]}
            </div>
          </button>
        ))}
      </div>

      {/* Header + Create */}
      <div className="p-6 rounded-2xl bg-[var(--surface,#FFFFFF)] dark:bg-[var(--surface,#111A2B)] border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[var(--primary,#0B3A6F)]" />
              التظاهرات الرياضية للرابطة ({filtered.length})
            </h3>
            <p className="text-xs text-[var(--ink-2,#51607A)] mt-0.5">
              كل تظاهرة تحتضن منافساتها ودورة حياتها الرسمية: تحضير ← مفتوحة ← جارية ← منتهية ← مؤرشفة
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate} icon={<Plus className="w-4 h-4" />} className="font-bold text-xs">
            تظاهرة جديدة
          </Button>
        </div>

        {/* Events Grid */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-[var(--ink-2,#51607A)]">
            لا توجد تظاهرات بهذه الحالة. أنشئ تظاهرة جديدة لتنظيم منافساتك تحت مظلة واحدة.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(evt => (
              <div
                key={evt.id}
                className="p-4 rounded-2xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 hover:border-[var(--primary,#0B3A6F)] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_BADGE_VARIANT[evt.status]} size="sm" dot={evt.status === 'ongoing'}>
                        {EVENT_STATUS_LABELS[evt.status]}
                      </Badge>
                      <span className="text-[10px] font-bold text-[var(--ink-2,#51607A)]">
                        {EVENT_TYPE_LABELS[evt.type]} • {EVENT_CLASSIFICATION_LABELS[evt.classification]}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-[var(--ink,#0F1B2D)] dark:text-white mt-1.5 truncate">
                      {evt.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[var(--ink-2,#51607A)]">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {evt.startDate}{evt.endDate !== evt.startDate ? ` ← ${evt.endDate}` : ''}
                      </span>
                      {evt.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {evt.venue}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono">
                        {evt.season}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setDetailEvent(evt)}
                      className="p-2 rounded-xl border border-[var(--border,#E3E8EF)] dark:border-slate-700 text-[var(--ink-2,#51607A)] hover:text-[var(--primary,#0B3A6F)] transition cursor-pointer"
                      title="تفاصيل التظاهرة"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(evt)}
                      className="p-2 rounded-xl border border-[var(--border,#E3E8EF)] dark:border-slate-700 text-[var(--ink-2,#51607A)] hover:text-[var(--primary,#0B3A6F)] transition cursor-pointer"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(evt)}
                      className="p-2 rounded-xl border border-[var(--border,#E3E8EF)] dark:border-slate-700 text-[var(--ink-2,#51607A)] hover:text-[var(--danger,#B91C1C)] transition cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border,#E3E8EF)] dark:border-slate-800 text-[11px] font-bold text-[var(--ink-2,#51607A)]">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[var(--primary,#0B3A6F)]" />
                    {evt.competitionsIds.length} منافسة مرتبطة
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {evt.documents.length} مستند
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {evt.committee.length} عضو لجنة
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingEvent ? 'تعديل بيانات التظاهرة' : 'تظاهرة رياضية جديدة'}
        subtitle="الحقول الإلزامية: الاسم وتاريخ البداية"
        maxWidth="2xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="اسم التظاهرة *"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: التظاهرة الولائية الكبرى — سعيدة 2026"
            />
          </div>
          <Select
            label="نوع التظاهرة"
            value={form.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, type: e.target.value as EventType }))}
            options={(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(k => ({ value: k, label: EVENT_TYPE_LABELS[k] }))}
          />
          <Select
            label="التصنيف الرسمي"
            value={form.classification}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, classification: e.target.value as EventClassification }))}
            options={(Object.keys(EVENT_CLASSIFICATION_LABELS) as EventClassification[]).map(k => ({ value: k, label: EVENT_CLASSIFICATION_LABELS[k] }))}
          />
          <Input
            label="الموسم الرياضي"
            value={form.season}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, season: e.target.value }))}
            placeholder="2026"
          />
          <Input
            label="الجهة المنظمة"
            value={form.organizer}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, organizer: e.target.value }))}
          />
          <Input
            label="تاريخ البداية *"
            type="date"
            value={form.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, startDate: e.target.value }))}
          />
          <Input
            label="تاريخ النهاية"
            type="date"
            value={form.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, endDate: e.target.value }))}
          />
          <Input
            label="المكان (المضمار/الملعب)"
            value={form.venue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, venue: e.target.value }))}
            placeholder="مضمار 13 أفريل 1958، سعيدة"
          />
          <Input
            label="المدينة"
            value={form.city}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, city: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[var(--ink,#0F1B2D)] dark:text-white mb-1">البرنامج العام</label>
            <textarea
              value={form.program}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, program: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 p-3 text-xs text-[var(--ink,#0F1B2D)] dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary,#0B3A6F)]"
              placeholder="وصف البرنامج الزمني للتظاهرة (الأيام، الفئات، الجولات...)"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[var(--ink,#0F1B2D)] dark:text-white mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 p-3 text-xs text-[var(--ink,#0F1B2D)] dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary,#0B3A6F)]"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)]">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>إلغاء</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveEvent}
            loading={busyId === 'form'}
            icon={busyId === 'form' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
          >
            {editingEvent ? 'حفظ التعديلات' : 'إنشاء التظاهرة'}
          </Button>
        </div>
      </Modal>

      {/* ── Event Detail Modal ── */}
      <Modal
        isOpen={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        title={detailEvent?.name || ''}
        subtitle={detailEvent ? `${EVENT_TYPE_LABELS[detailEvent.type]} • ${EVENT_CLASSIFICATION_LABELS[detailEvent.classification]} • موسم ${detailEvent.season}` : ''}
        maxWidth="3xl"
      >
        {detailEvent && (
          <div className="space-y-5">
            {/* Lifecycle bar */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-[var(--border,#22304A)] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--primary,#0B3A6F)]" />
                  دورة الحياة الرسمية
                </span>
                <Badge variant={STATUS_BADGE_VARIANT[detailEvent.status]} size="sm" dot={detailEvent.status === 'ongoing'}>
                  {EVENT_STATUS_LABELS[detailEvent.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((s, i) => {
                  const isCurrent = detailEvent.status === s;
                  const passed = ['preparing', 'open', 'ongoing', 'completed', 'archived'].indexOf(detailEvent.status) > i;
                  const allowed = (EVENT_STATUS_FLOW[detailEvent.status] || []).includes(s);
                  return (
                    <React.Fragment key={s}>
                      {i > 0 && <span className="w-4 h-[1.5px] bg-[var(--border,#E3E8EF)] dark:bg-slate-700" />}
                      <button
                        disabled={!allowed || busyId === detailEvent.id}
                        onClick={() => handleTransition(detailEvent, s)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                          isCurrent
                            ? 'bg-[var(--primary,#0B3A6F)] text-white'
                            : passed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-[var(--surface,#FFFFFF)] dark:bg-slate-800 border border-[var(--border,#E3E8EF)] dark:border-slate-700 text-[var(--ink-2,#51607A)]'
                        }`}
                        title={allowed ? `انتقال إلى: ${EVENT_STATUS_LABELS[s]}` : 'انتقال غير قانوني من الحالة الحالية'}
                      >
                        {EVENT_STATUS_LABELS[s]}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-slate-800">
                <span className="text-[var(--ink-2,#51607A)] block text-[10px] font-bold">الجهة المنظمة</span>
                <span className="text-[var(--ink,#0F1B2D)] dark:text-white font-bold">{detailEvent.organizer || '—'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-slate-800">
                <span className="text-[var(--ink-2,#51607A)] block text-[10px] font-bold">المكان والتاريخ</span>
                <span className="text-[var(--ink,#0F1B2D)] dark:text-white font-bold">
                  {detailEvent.venue || '—'} • {detailEvent.startDate}{detailEvent.endDate !== detailEvent.startDate ? ` ← ${detailEvent.endDate}` : ''}
                </span>
              </div>
              {detailEvent.program && (
                <div className="sm:col-span-2 p-3 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-slate-800">
                  <span className="text-[var(--ink-2,#51607A)] block text-[10px] font-bold mb-1">البرنامج العام</span>
                  <span className="text-[var(--ink,#0F1B2D)] dark:text-white leading-relaxed">{detailEvent.program}</span>
                </div>
              )}
            </div>

            {/* Linked competitions */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[var(--primary,#0B3A6F)]" />
                المنافسات المرتبطة بالتظاهرة ({detailEvent.competitionsIds.length})
              </h4>
              <div className="space-y-2">
                {competitions.filter(c => detailEvent.competitionsIds.includes(c.id)).map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-slate-800">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--ink,#0F1B2D)] dark:text-white truncate">{c.name}</div>
                      <div className="text-[10px] text-[var(--ink-2,#51607A)]">{c.date} • {c.venue}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkCompetition(c)}
                      loading={busyId === c.id}
                      className="text-[10px] shrink-0"
                    >
                      <Unlink className="w-3 h-3" />
                      فصل
                    </Button>
                  </div>
                ))}
                {availableCompetitions.filter(c => !detailEvent.competitionsIds.includes(c.id)).map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-dashed border-[var(--border,#E3E8EF)] dark:border-slate-700">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--ink-2,#51607A)] truncate">{c.name}</div>
                      <div className="text-[10px] text-[var(--ink-3,#8593A8)]">غير مرتبطة — متاحة للربط</div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleLinkCompetition(c)}
                      loading={busyId === c.id}
                      className="text-[10px] shrink-0"
                    >
                      <Link2 className="w-3 h-3" />
                      ربط
                    </Button>
                  </div>
                ))}
                {availableCompetitions.length === 0 && (
                  <div className="text-[11px] text-[var(--ink-2,#51607A)] py-2">
                    لا توجد منافسات متاحة للربط بعد. أنشئ المنافسات من تبويب "التظاهرات والمنافسات".
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-[var(--primary,#0B3A6F)]" />
                الوثائق والمرفقات ({detailEvent.documents.length})
              </h4>
              <div className="space-y-1.5">
                {detailEvent.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[var(--ink-3,#8593A8)] shrink-0" />
                      <span className="text-xs font-bold text-[var(--ink,#0F1B2D)] dark:text-white truncate">{doc.name}</span>
                      <Badge variant="neutral" size="sm">{DOC_KIND_LABELS[doc.kind]}</Badge>
                    </div>
                    <button
                      onClick={() => handleRemoveDocument(doc.id)}
                      className="p-1.5 rounded-lg text-[var(--ink-2,#51607A)] hover:text-[var(--danger,#B91C1C)] transition cursor-pointer shrink-0"
                      title="إزالة المستند"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="اسم مستند جديد"
                    value={newDocName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDocName(e.target.value)}
                    placeholder="مثال: خطاب دعوة الأندية"
                  />
                </div>
                <div className="w-44">
                  <Select
                    label="النوع"
                    value={newDocKind}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewDocKind(e.target.value as EventDocument['kind'])}
                    options={(Object.keys(DOC_KIND_LABELS) as EventDocument['kind'][]).map(k => ({ value: k, label: DOC_KIND_LABELS[k] }))}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddDocument}
                  disabled={!newDocName.trim()}
                  loading={busyId === 'doc'}
                  className="mb-0.5"
                >
                  إضافة
                </Button>
              </div>
            </div>

            {/* Committee */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[var(--ink,#0F1B2D)] dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--primary,#0B3A6F)]" />
                اللجنة المنظمة ({detailEvent.committee.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detailEvent.committee.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-2,#F8FAFC)] dark:bg-slate-900 border border-[var(--border,#E3E8EF)] dark:border-slate-800">
                    <CircleDot className="w-3 h-3 text-[var(--primary,#0B3A6F)] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--ink,#0F1B2D)] dark:text-white truncate">{m.fullName}</div>
                      <div className="text-[10px] text-[var(--ink-2,#51607A)]">{m.role}</div>
                    </div>
                  </div>
                ))}
                {detailEvent.committee.length === 0 && (
                  <div className="text-[11px] text-[var(--ink-2,#51607A)]">لم تُشكّل لجنة تنظيم لهذه التظاهرة بعد.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation ── */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        entityName={deleteTarget?.name || ''}
        entityType="event"
        sourceModule="events"
        warningDetails={deleteTarget?.competitionsIds.length
          ? `مرتبطة بـ ${deleteTarget.competitionsIds.length} منافسة — الحذف يتطلب تأكيدًا استثنائيًا.`
          : 'سيتم نقل التظاهرة إلى سلة المحذوفات المركزية مع إمكانية الاسترجاع.'}
      />
    </div>
  );
};
