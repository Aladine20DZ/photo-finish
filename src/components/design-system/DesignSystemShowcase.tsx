import React, { useState } from 'react';
import {
  Trophy,
  Users,
  Shield,
  Layers,
  Sparkles,
  Search,
  Clock,
  Flag,
  FileText,
  GitCommit,
  Award
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Table, Column } from './Table';
import { Modal } from './Modal';
import { Drawer } from './Drawer';
import { Tabs } from './Tabs';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { SplitLayout } from './SplitLayout';
import { Stepper, StepItem } from './Stepper';
import { Timeline, TimelineItem } from './Timeline';
import { ToastContainer, ToastItem } from './Toast';
import { Card } from './Card';
import { RankBadge } from './RankBadge';
import { StatusPill } from './StatusPill';
import { PageHeader } from './PageHeader';

interface SampleRunner {
  bib: number;
  name: string;
  club: string;
  discipline: string;
  time: string;
  status: 'draft' | 'review' | 'certified' | 'rejected' | 'locked';
}

const SAMPLE_RUNNERS: SampleRunner[] = [
  { bib: 101, name: 'يوسف العبدلي', club: 'مولودية الجزائر (MCA)', discipline: '100م نهائي رجال', time: '09.96s', status: 'certified' },
  { bib: 102, name: 'جمال سجاتي', club: 'أولمبي الشلف (ASO)', discipline: '800م رجال', time: '1:42.50', status: 'certified' },
  { bib: 103, name: 'سليمان بلمخفي', club: 'وفاق سطيف (ESS)', discipline: '100م نهائي رجال', time: '10.14s', status: 'review' },
  { bib: 104, name: 'أمينة بن دريس', club: 'نادي أولمبيك سعيدة (OSA)', discipline: '200م إناث', time: '22.84s', status: 'draft' },
  { bib: 105, name: 'رياض محرزي', club: 'شباب قسنطينة (CSC)', discipline: '400م حواجز', time: '49.12s', status: 'rejected' },
  { bib: 106, name: 'كريم بلحاج', club: 'نادي الحماية المدنية (Protection Civile)', discipline: '1500م رجال', time: '3:34.20', status: 'locked' },
];

export const DesignSystemShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectValue, setSelectValue] = useState<string>('100m');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [runners, setRunners] = useState<SampleRunner[]>(SAMPLE_RUNNERS);

  const addToast = (type: 'success' | 'warning' | 'error' | 'info') => {
    const newToast: ToastItem = {
      id: Math.random().toString(),
      type,
      title: type === 'success' ? 'تم حفظ التعديلات بنجاح' : type === 'warning' ? 'تنبيه سرعة الرياح' : 'خطأ في الاتصال',
      message: 'نظام تصميم مضمار Track Pro يدعم التنبيهات الموحدة وسرعة استجابة فائقة.',
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const handleCellEdit = (item: SampleRunner, key: string, value: any) => {
    setRunners((prev) =>
      prev.map((r) => (r.bib === item.bib ? { ...r, [key]: value } : r))
    );
    addToast('success');
  };

  const steps: StepItem[] = [
    { title: 'إعداد المنافسة', description: 'تحديد المضمار والفئات' },
    { title: 'برمجة التخصصات', description: 'توزيع التوقيت والسلاسل' },
    { title: 'تعيين الحكام', description: 'توليد أكواد التكليف' },
    { title: 'التحكيم الميداني', description: 'انطلاق السباقات ورصد FAT' },
    { title: 'اعتماد النتائج', description: 'التصدير والمصادقة النهائية' },
  ];

  const timelineEvents: TimelineItem[] = [
    {
      id: '1',
      title: 'انطلاق نهائي 100م رجال',
      time: '16:30:00.000',
      description: 'طلقة المسدس الرسمية — سرعة الرياح القانونية +1.2 m/s',
      status: 'success',
      badge: 'FAT مسجل',
    },
    {
      id: '2',
      title: 'وصول خط النهاية ورصد Slit-Scan',
      time: '16:30:09.960',
      description: 'كاميرا خط النهاية تسجل الفائز يوسف العبدلي برقم 09.96s',
      status: 'primary',
      badge: 'TR31 مطابق',
    },
    {
      id: '3',
      title: 'مراجعة شريط الفيديو من طرف قاضي التوقيت',
      time: '16:32:15',
      description: 'فحص الحارة رقم 4 وتطابق الصدرية والكتف',
      status: 'warning',
      badge: 'قيد المراجعة',
    },
    {
      id: '4',
      title: 'المصادقة الرسمية وختم النتيجة',
      time: '16:35:00',
      description: 'اعتماد النتيجة ونشرها المباشر في البوابة العامة وتطبيق الجمهور',
      status: 'success',
      badge: 'معتمد رسمياً',
    },
  ];

  const columns: Column<SampleRunner>[] = [
    {
      key: 'bib',
      header: 'الصدرية',
      width: '80px',
      render: (r) => <span className="font-mono font-bold text-[var(--ink)]">#{r.bib}</span>,
    },
    {
      key: 'name',
      header: 'اسم العداء',
      editable: true,
      render: (r) => <span className="font-bold text-[var(--ink)]">{r.name}</span>,
    },
    { key: 'club', header: 'النادي الرياضي' },
    { key: 'discipline', header: 'التخصص' },
    {
      key: 'time',
      header: 'التوقيت الرسمي (FAT)',
      editable: true,
      render: (r) => <span className="font-mono font-bold text-[var(--primary)] tabular-nums">{r.time}</span>,
    },
    {
      key: 'status',
      header: 'الحالة الموحدة',
      render: (r) => <Badge status={r.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-10" dir="rtl">
      {/* ═══ 1. Showcase Header with PageHeader ═══ */}
      <PageHeader
        title="كتالوج مكونات مضمار بنمط World Athletics"
        subtitle="نظام التصميم الرياضي الموحد • أسطح صلبة بيضاء • كتل سوداء • أرقام قياسية كبيرة • WCAG AA"
        eyebrow="WORLD ATHLETICS DESIGN SYSTEM"
        hatch
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
              معاينة الـ Drawer 📑
            </Button>
            <Button variant="accent" size="sm" onClick={() => setModalOpen(true)}>
              فتح نافذة Modal ✨
            </Button>
          </div>
        }
      />

      {/* ═══ 1.1 Card Variants Showcase ═══ */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-[var(--ink,#0A0A0A)] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--accent,#E5321B)]" />
          <span>أنماط البطاقات الرياضية الصلبة (Card Variants):</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="default" accentBorder="top-black" className="p-4">
            <div className="text-xs font-bold text-[var(--ink-2)]">بطاقة صلبة مع حد علوي أسود 3px</div>
            <div className="text-sm font-black mt-1">Card default + top-black border</div>
          </Card>
          <Card variant="strong" accentBorder="top-red" className="p-4">
            <div className="text-xs font-bold text-[var(--ink-2)]">بطاقة قوية مع حد أحمر 3px</div>
            <div className="text-sm font-black mt-1">Card strong + top-red border</div>
          </Card>
          <Card variant="interactive" accentBorder="right-red" className="p-4">
            <div className="text-xs font-bold text-[var(--ink-2)]">بطاقة تفاعلية مع حافة حمراء 4px</div>
            <div className="text-sm font-black mt-1">Card interactive + right-red border</div>
          </Card>
        </div>
      </section>

      {/* ═══ 2. World Athletics Design Tokens Swatches ═══ */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-[var(--ink,#0A0A0A)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent,#E5321B)]" />
          <span>أ) Design Tokens المركزية بنمط World Athletics:</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: '--block', val: '#0A0A0A', color: 'bg-[#0A0A0A] text-white' },
            { label: '--accent', val: '#E5321B', color: 'bg-[#E5321B] text-white' },
            { label: '--bg', val: '#FFFFFF', color: 'bg-[#FFFFFF] border border-slate-300' },
            { label: '--surface-alt', val: '#F3F3F1', color: 'bg-[#F3F3F1] border border-slate-300' },
            { label: '--border', val: '#DADAD6', color: 'bg-[#DADAD6]' },
            { label: '--ink', val: '#0A0A0A', color: 'bg-[#0A0A0A] text-white' },
            { label: '--success', val: '#0E7A3E', color: 'bg-[#0E7A3E] text-white' },
            { label: '--danger', val: '#B3261E', color: 'bg-[#B3261E] text-white' },
          ].map((token, i) => (
            <div key={i} className="bg-[var(--surface,#FFFFFF)] p-3 rounded-[var(--radius-sm,2px)] space-y-2 border border-[var(--border,#DADAD6)] text-center shadow-none">
              <div className={`w-full h-8 rounded-[var(--radius-sm,2px)] flex items-center justify-center text-[10px] font-black ${token.color}`}>
                WA
              </div>
              <div className="text-[10px] font-mono font-bold text-[var(--ink,#0A0A0A)] truncate">{token.label}</div>
              <div className="text-[9px] font-mono text-[var(--ink-3,#7C7C77)]">{token.val}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 2.1 Rank Badges (World Athletics Podium Squares) ═══ */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-[var(--ink,#0A0A0A)] flex items-center gap-2">
          <Award className="w-4 h-4 text-[var(--accent,#E5321B)]" />
          <span>ب) شارات رقم الحارة والمرتبة (RankBadge — مربعات سوداء ومنصة تتويج):</span>
        </h3>

        <div className="bg-[var(--surface,#FFFFFF)] p-4 rounded-[var(--radius-sm,2px)] border border-[var(--border,#DADAD6)] flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <RankBadge rank={1} size="lg" />
            <span className="text-xs font-bold">المرتبة 1 (الذهبية)</span>
          </div>
          <div className="flex items-center gap-2">
            <RankBadge rank={2} size="lg" />
            <span className="text-xs font-bold">المرتبة 2 (الفضية)</span>
          </div>
          <div className="flex items-center gap-2">
            <RankBadge rank={3} size="lg" />
            <span className="text-xs font-bold">المرتبة 3 (البرونزية)</span>
          </div>
          <div className="flex items-center gap-2">
            <RankBadge rank={4} size="lg" />
            <span className="text-xs font-bold">المرتبة 4 (مربع أسود)</span>
          </div>
          <div className="flex items-center gap-2">
            <RankBadge rank={8} size="md" />
            <span className="text-xs font-bold">الحارة 8</span>
          </div>
        </div>
      </section>

      {/* ═══ 3. Standardized Status Badges & StatusPill ═══ */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-[var(--ink,#0A0A0A)] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--block,#0A0A0A)]" />
          <span>ج) شارات الحالة الموحدة (StatusPill — نص + أيقونة معاً WCAG AA):</span>
        </h3>

        <div className="bg-[var(--surface,#FFFFFF)] p-4 rounded-[var(--radius-sm,2px)] border border-[var(--border,#DADAD6)] flex flex-wrap gap-3 items-center">
          <StatusPill status="draft" />
          <StatusPill status="sent" />
          <StatusPill status="under_review" />
          <StatusPill status="certified" />
          <StatusPill status="rejected" />
          <StatusPill status="locked" />
        </div>
      </section>

      {/* ═══ 4. Stepper Component (NEW) ═══ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[var(--ink)] flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-[var(--accent)]" />
            <span>ج) مكوّن الخطوات التتابعي (Stepper Component):</span>
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            >
              السابق
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={currentStep === steps.length - 1}
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
            >
              التالي
            </Button>
          </div>
        </div>

        <div className="bg-[var(--surface)] p-5 rounded-[var(--radius-md)] border border-[var(--border)] shadow-[var(--shadow-1)]">
          <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
        </div>
      </section>

      {/* ═══ 5. StatsCard Grid ═══ */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-[var(--ink)] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[var(--accent)]" />
          <span>د) بطاقات المؤشرات الرقمية (StatsCard مع أرقام جدولية):</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="الأندية الرياضية المنتسبة"
            value="142"
            change="12.5"
            isPositive={true}
            icon={Shield}
            subtitle="مقارنة بالموسم السابق"
          />
          <StatsCard
            title="العداؤون المسجلون رسمياً"
            value="3,850"
            change="8.4"
            isPositive={true}
            icon={Users}
            subtitle="عداء مرخص فيدرالياً"
          />
          <StatsCard
            title="دقة التوقيت بالمسح الشريطي"
            value="1/1000s"
            change="99.9"
            isPositive={true}
            icon={Trophy}
            subtitle="مطابق World Athletics"
          />
          <StatsCard
            title="التظاهرات والبطولات المبرمجة"
            value="96"
            change="2.1"
            isPositive={false}
            icon={Flag}
            subtitle="خلال الموسم الحالي"
          />
        </div>
      </section>

      {/* ═══ 6. High-Density Table with Sticky Header & Inline Editing ═══ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-[var(--ink)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
              <span>هـ) الجدول عالي الكثافة (High-Density Table — ارتفاع 40px وتعديل مباشر):</span>
            </h3>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              انقر على الخلايا المحددة بخط متقطع لتعديل الاسم أو التوقيت فورياً مع حفظ فوري.
            </p>
          </div>
          <span className="text-xs text-[var(--ink-3)] tabular-nums font-mono">{runners.length} سجلات</span>
        </div>

        <Table
          columns={columns}
          data={runners}
          keyExtractor={(item) => item.bib}
          onCellEdit={handleCellEdit}
          emptyText="لا توجد بيانات متاحة حالياً"
        />
      </section>

      {/* ═══ 7. Timeline Component (NEW) + SplitLayout ═══ */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-[var(--ink)] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--primary)]" />
          <span>و) المخطط الزمني للسباقات والتقسيم الثنائي (Timeline & SplitLayout):</span>
        </h3>

        <SplitLayout
          primaryTitle="التسلسل الزمني لعمليات التحكيم (Timeline Component)"
          secondaryTitle="نماذج الإدخال وأزرار اللمس الميداني"
          primarySpan={7}
          secondarySpan={5}
          primaryContent={
            <div className="bg-[var(--surface)] p-6 rounded-[var(--radius-md)] border border-[var(--border)] shadow-[var(--shadow-1)]">
              <Timeline items={timelineEvents} />
            </div>
          }
          secondaryContent={
            <div className="bg-[var(--surface)] p-6 rounded-[var(--radius-md)] border border-[var(--border)] shadow-[var(--shadow-1)] space-y-5">
              <h4 className="text-xs font-bold text-[var(--ink)] pb-2 border-b border-[var(--border)]">
                عناصر الإدخال وأزرار اللمس (≥ 48px)
              </h4>
              
              <div className="space-y-3">
                <Input
                  label="اسم العداء أو رقم الصدرية"
                  placeholder="ابحث بالاسم أو الصدرية..."
                  icon={<Search className="w-4 h-4 text-[var(--ink-3)]" />}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />

                <Select
                  label="التخصص الرياضي"
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  options={[
                    { value: '100m', label: '100م نهائي رجال' },
                    { value: '200m', label: '200م إناث' },
                    { value: '800m', label: '800م رجال' },
                    { value: 'cross_8k', label: 'عدو ريفي 8 كم' },
                  ]}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <label className="text-xs font-bold text-[var(--ink)] block">أنواع الأزرار المتاحة:</label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary">أساسي Primary</Button>
                  <Button variant="accent">تمييز Accent</Button>
                  <Button variant="secondary">ثانوي Secondary</Button>
                  <Button variant="danger">خطر Danger</Button>
                  <Button variant="ghost">خافت Ghost</Button>
                  <Button variant="primary" loading>جارٍ الحفظ...</Button>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--ink-2)] block font-bold">تجربة التنبيهات الموحدة (Toasts):</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => addToast('success')}>
                    نجاح 🟢
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => addToast('warning')}>
                    تحذير 🟡
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => addToast('error')}>
                    خطأ 🔴
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => addToast('info')}>
                    معلومات 🔵
                  </Button>
                </div>
              </div>
            </div>
          }
        />
      </section>

      {/* ═══ 8. Tabs & EmptyState Showcase ═══ */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-[var(--ink)] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--primary)]" />
          <span>ز) التبويبات المتحركة وحالة الفراغ (Tabs & EmptyState):</span>
        </h3>

        <Tabs
          tabs={[
            { id: 'all', label: 'جميع المنافسات', badge: 12 },
            { id: 'track', label: 'المضمار والميدان (Track & Field)', badge: 8 },
            { id: 'cross', label: 'العدو الريفي (Cross Country)', badge: 4 },
            { id: 'road', label: 'سباقات الطريق (Road Races)' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <EmptyState
          icon={<Trophy className="w-8 h-8 text-[var(--primary)]" />}
          title="لا توجد استئنافات أو طعون معلقة"
          description="جميع النتائج المسجلة في البطولة الحالية تمت المصادقة عليها من طرف الحكم العام دون أي اعتراضات."
          actionLabel="عرض سجل النتائج الرسمي"
          onAction={() => alert('الانتقال إلى سجل النتائج')}
        />
      </section>

      {/* Demo Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="نافذة حوار منبثقة (Track Pro Modal)"
        subtitle="عالية التباين وتدعم زر Esc والإغلاق عند النقر بالخارج"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--ink-2)] leading-relaxed">
            تم تطبيق نمط مضمار الصلب عالي التباين (Solid Surface + Clean Border + Discrete Shadow) بنسبة تباين تتجاوز معايير WCAG AA، مع الحفاظ الكامل على الأداء وخفة الحركة.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              تأكيد وحفظ
            </Button>
          </div>
        </div>
      </Modal>

      {/* Demo Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="لوحة سريعة منزلقة (Track Pro Drawer)"
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-[var(--ink-2)]">
            درج جانبي ينزلق بسلاسة من اليمين (RTL) مع سرعة انتقال 150ms لتوفير تجربة مستخدم سريعة ودقيقة.
          </p>
          <div className="space-y-2">
            <Input label="ملاحظة الحكم الميداني" placeholder="اكتب ملاحظة..." />
            <Button variant="primary" size="sm" className="w-full mt-2" onClick={() => setDrawerOpen(false)}>
              إرسال الملاحظة ✓
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Toast Manager */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
