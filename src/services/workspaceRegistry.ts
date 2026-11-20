import type { OfficialDutyTask, DisciplineCategoryType, JudgeAssignment, JudgeAssignmentPermissions } from './judgesAssignmentService';

/**
 * ═════════════════════════════════════════════════════════════════════
 * سجل مساحات العمل المركزي (Workspace Registry) — PHASE 4 من الرؤية المعمارية
 * ═════════════════════════════════════════════════════════════════════
 * المصدر الوحيد للحقيقة لربط كل مهمة تحكيم (OfficialDutyTask) وكل تصنيف
 * تخصص (DisciplineCategoryType) بواجهة عملها المخصصة.
 *
 * مبدأ التصميم (القرار الثالث في الرؤية): «المهمة هي التي تصنع واجهة الحكم» —
 * ليس كل الحكام يرون الواجهة نفسها؛ نوع التعيين والتخصص والصلاحيات هو الذي
 * يحدد الشاشة والأدوات والقوائم المتاحة.
 *
 * ملاحظة معمارية: هذا السجل يخزن البيانات الوصفية فقط (metadata) بلا أي
 * استيراد لمكونات React — لتفادي الاستيراد الدائري. التوزيع الفعلي على
 * المكونات يحدث في SmartJudgeWorkspace وFieldSpaceEntry عبر workspaceKey.
 */

/** مفاتيح مساحات العمل المعتمدة في المنظومة */
export type WorkspaceKey =
  | 'jumps_horizontal'
  | 'jumps_vertical'
  | 'throws'
  | 'track_course'
  | 'checkpoint_station'
  | 'wind_gauge'
  | 'competition_secretary'
  | 'call_room'
  | 'start_line'
  | 'finish_line'
  | 'photo_finish'
  | 'manual_timing'
  | 'chief_judge_board';

/** نوع مساحة العمل حسب طبيعتها التشغيلية */
export type WorkspaceKind =
  | 'field'      // واجهة ميدانية لتسجيل الأداء (الوثب، الرمي، المسار...)
  | 'utility'    // واجهة مساندة (رياح، سكرتارية، غرفة النداء)
  | 'oversight'; // واجهة إشراف واعتماد (رئيس الحكام)

export interface WorkspaceDescriptor {
  /** المفتاح الفريد لمساحة العمل — مستخدم في التوجيه والتوزيع */
  id: WorkspaceKey;
  /** المهام الرسمية (OfficialDutyTask) التي تفتح هذه المساحة */
  taskTypes: OfficialDutyTask[];
  /** تصنيفات التخصصات المتوافقة (تُستخدم عند تعارض أو تنويع التوجيه) */
  categories: DisciplineCategoryType[];
  /** العنوان العربي الرسمي كما يظهر للحكم */
  titleAr: string;
  /** وصف موجز لدور الواجهة */
  descriptionAr: string;
  /** طبيعة الواجهة */
  kind: WorkspaceKind;
  /** الصلاحيات المطلوبة من JudgeAssignmentPermissions لتشغيل الأدوات الأساسية */
  requiredPermissions: Array<keyof JudgeAssignmentPermissions>;
  /** هل تحتاج تحميل منافسة ميدانية كاملة (FieldEventCompetition) قبل العمل؟ */
  requiresEventCompetition: boolean;
  /** خريطة الأدوار القديمة (PhoneRole) إذا كانت المهمة تُخدم حالياً بواجهة هاتف تقليدية */
  legacyPhoneRole?: 'start' | 'finish' | 'judge' | 'chambre_dappel' | 'checkpoint_judge' | 'manual_timing';
  /** تسمية أيقونة lucide-react (بلا استيراد مباشر — يستهلكها العرض) */
  icon: string;
}

/**
 * السجل المركزي — مرتب حسب دورة العمل الميدانية النموذجية
 * (غرفة النداء ← الانطلاق ← المسار/الميدان ← النهاية ← التوقيت ← الاعتماد)
 */
export const WORKSPACE_REGISTRY: readonly WorkspaceDescriptor[] = Object.freeze([
  // ─── واجهات الميدان (Field) ───
  {
    id: 'jumps_horizontal',
    taskTypes: ['field_judge_jumps', 'chief_field_jumps'],
    categories: ['jumps_horizontal'],
    titleAr: 'مساحة الوثب الطويل والثلاثي',
    descriptionAr: 'تسجيل المحاولات والمسافات والرياح والأخطاء وترتيب العدائين وفق المادة 25',
    kind: 'field',
    requiredPermissions: ['canRecord', 'canEdit'],
    requiresEventCompetition: true,
    icon: 'MoveHorizontal'
  },
  {
    id: 'jumps_vertical',
    taskTypes: ['field_judge_jumps', 'chief_field_jumps'],
    categories: ['jumps_vertical'],
    titleAr: 'مساحة الوثب العالي والقفز بالزانة',
    descriptionAr: 'إدارة الارتفاعات ورموز O/X/— وتسلسل الإخفاقات وكسر التعادل وفق المادة 26',
    kind: 'field',
    requiredPermissions: ['canRecord', 'canEdit'],
    requiresEventCompetition: true,
    icon: 'MoveVertical'
  },
  {
    id: 'throws',
    taskTypes: ['field_judge_throws', 'chief_field_throws'],
    categories: ['throws'],
    titleAr: 'مساحة مسابقات الرمي',
    descriptionAr: 'دفع الجلة ورمي القرص والرمح والمطرقة — قياس المسافات وصلاحية المحاولات وفق المادة 27',
    kind: 'field',
    requiredPermissions: ['canRecord', 'canEdit'],
    requiresEventCompetition: true,
    icon: 'CircleDot'
  },
  {
    id: 'track_course',
    taskTypes: ['field_judge_jumps', 'chief_field_jumps', 'finish_judge', 'chief_finish_judge', 'recall_starter'],
    categories: ['running'],
    titleAr: 'مساحة قاضي المضمار',
    descriptionAr: 'متابعة الأشواط والمجموعات وتسجيل أرقام الوصول والترتيب على المسار',
    kind: 'field',
    requiredPermissions: ['canRecord'],
    requiresEventCompetition: false,
    icon: 'Timer'
  },
  {
    id: 'checkpoint_station',
    taskTypes: ['field_judge_jumps', 'chief_field_jumps', 'finish_judge'],
    categories: ['checkpoint'],
    titleAr: 'نقطة مراقبة المسار',
    descriptionAr: 'محطة عدّ وتسجيل العدائين في العدو الريفي والمسارات الطويلة',
    kind: 'field',
    requiredPermissions: ['canRecord'],
    requiresEventCompetition: false,
    icon: 'MapPin'
  },
  // ─── واجهات مساندة (Utility) ───
  {
    id: 'wind_gauge',
    taskTypes: ['wind_gauge_operator'],
    categories: ['jumps_horizontal', 'throws', 'running'],
    titleAr: 'مساحة قياس الرياح',
    descriptionAr: 'تسجيل قراءات سرعة الرياح وربطها بالمحاولات والأشواط مع تنبيه الحدود القانونية +2.0م/ث',
    kind: 'utility',
    requiredPermissions: ['canRecord'],
    requiresEventCompetition: false,
    icon: 'Wind'
  },
  {
    id: 'competition_secretary',
    taskTypes: ['secretary'],
    categories: ['jumps_horizontal', 'jumps_vertical', 'throws', 'running', 'checkpoint'],
    titleAr: 'مساحة سكرتارية المنافسة',
    descriptionAr: 'مراجعة القوائم والنتائج والترتيب وتجهيز المحاضر الرسمية وتصدير الوثائق',
    kind: 'utility',
    requiredPermissions: ['canEdit'],
    requiresEventCompetition: false,
    icon: 'ClipboardList'
  },
  {
    id: 'call_room',
    taskTypes: ['call_room_chief'],
    categories: ['running', 'jumps_horizontal', 'jumps_vertical', 'throws'],
    titleAr: 'غرفة النداء',
    descriptionAr: 'التحقق من الحضور والصدريات والأهلية قبل التوجه لمنطقة المنافسة وفق المادة 22',
    kind: 'utility',
    requiredPermissions: ['canRecord'],
    requiresEventCompetition: false,
    legacyPhoneRole: 'chambre_dappel',
    icon: 'Users'
  },
  {
    id: 'start_line',
    taskTypes: ['starter', 'recall_starter'],
    categories: ['running'],
    titleAr: 'خط الانطلاق',
    descriptionAr: 'تأكيد الاستعداد وإشارات الانطلاق وإعادة السباق وتسجيل المخالفات وفق المادة 29',
    kind: 'field',
    requiredPermissions: ['canRecord'],
    requiresEventCompetition: false,
    legacyPhoneRole: 'start',
    icon: 'Flag'
  },
  {
    id: 'finish_line',
    taskTypes: ['finish_judge', 'chief_finish_judge'],
    categories: ['running', 'checkpoint'],
    titleAr: 'خط النهاية',
    descriptionAr: 'متابعة الوصول وتثبيت الترتيب وتسجيل الملاحظات مع التكامل مع نظام التوقيت',
    kind: 'field',
    requiredPermissions: ['canRecord'],
    requiresEventCompetition: false,
    legacyPhoneRole: 'finish',
    icon: 'FlagTriangleRight'
  },
  {
    id: 'photo_finish',
    taskTypes: ['photo_finish_operator'],
    categories: ['running'],
    titleAr: 'مشغل Photo Finish',
    descriptionAr: 'استقبال صور المسح الشريطي وتحليل خط النهاية وتثبيت الترتيب والتوقيت بدقة 1/1000 ثانية',
    kind: 'utility',
    requiredPermissions: ['canRecord'],
    requiresEventCompetition: false,
    legacyPhoneRole: 'finish',
    icon: 'Camera'
  },
  {
    id: 'manual_timing',
    taskTypes: ['timekeeper'],
    categories: ['running', 'checkpoint'],
    titleAr: 'التوقيت اليدوي',
    descriptionAr: 'تسجيل أزمنة العدائين ساعة يدوية وربطها بالسباقات والمسارات ومراجعة القراءات',
    kind: 'utility',
    requiredPermissions: ['canRecord'],
    requiresEventCompetition: false,
    legacyPhoneRole: 'manual_timing',
    icon: 'Watch'
  },
  // ─── واجهات الإشراف (Oversight) ───
  {
    id: 'chief_judge_board',
    taskTypes: ['chief_judge', 'deputy_chief_judge'],
    categories: ['jumps_horizontal', 'jumps_vertical', 'throws', 'running', 'checkpoint'],
    titleAr: 'لوحة رئيس الحكام',
    descriptionAr: 'الإشراف على التخصصات ومتابعة الحكام ومراجعة النتائج واعتمادها وإغلاق المنافسة',
    kind: 'oversight',
    requiredPermissions: ['canCertify', 'canApprove'],
    requiresEventCompetition: false,
    icon: 'ShieldCheck'
  }
]);

/** فهرس داخلي للبحث السريع بالمفتاح */
const BY_KEY = new Map<string, WorkspaceDescriptor>(WORKSPACE_REGISTRY.map(w => [w.id, w]));

/** فهرس المهام → مساحات العمل */
const BY_TASK = new Map<OfficialDutyTask, WorkspaceDescriptor[]>();
for (const w of WORKSPACE_REGISTRY) {
  for (const t of w.taskTypes) {
    if (!BY_TASK.has(t)) BY_TASK.set(t, []);
    BY_TASK.get(t)!.push(w);
  }
}

/**
 * تُعيد مساحة العمل الافتراضية المناسبة لمهمة تعيين حكم.
 * خوارزمية التوجيه (المهمة تصنع الواجهة):
 *   1. مساحات نوع taskType الخاص بالتعيين
 *   2. إن تخصص التعيين، تُقدّم المساحة ذات التصنيف المطابق
 *   3. مساحة قطبية للدور (chief → لوحة الإشراف)
 *   4. احتياط آمن: نقطة مراقبة (لا تُعطي صلاحيات إدخال ميداني غير مبرر)
 */
export function resolveWorkspaceForAssignment(assignment: Pick<JudgeAssignment, 'task' | 'disciplineCategory'>): WorkspaceDescriptor {
  const candidates = BY_TASK.get(assignment.task) || [];
  if (candidates.length > 0) {
    const category = assignment.disciplineCategory;
    if (category) {
      const exact = candidates.find(w => w.categories.includes(category));
      if (exact) return exact;
    }
    // تفضيل أول مساحة لا تتطلب منافسة ميدانية كاملة عند غياب التصنيف
    return candidates.find(w => w.kind !== 'oversight') || candidates[0];
  }
  return BY_KEY.get('checkpoint_station')!;
}

/**
 * تُعيد كل مساحات العمل المتاحة لتعيين حكم (للتنقل بين الأدوار عند تعدد المهام).
 * الترتيب: المطابقة بالتصنيف أولاً ثم البقية.
 */
export function listWorkspacesForAssignment(assignment: Pick<JudgeAssignment, 'task' | 'disciplineCategory'>): WorkspaceDescriptor[] {
  const primary = resolveWorkspaceForAssignment(assignment);
  const rest = (BY_TASK.get(assignment.task) || []).filter(w => w.id !== primary.id);
  return [primary, ...rest];
}

/**
 * فحص جاهزية صلاحيات التعيين لمساحة عمل (للعرض التحذيري فقط —
 * الإنفاذ الفعلي يبقى في طبقة الخدمات والخادم وفق مبدأ الرؤية 17).
 */
export function checkWorkspaceReadiness(
  workspace: WorkspaceDescriptor,
  permissions?: JudgeAssignmentPermissions
): { ready: boolean; missing: string[] } {
  if (!permissions) return { ready: false, missing: workspace.requiredPermissions.slice() };
  const missing = workspace.requiredPermissions.filter(p => !permissions[p]);
  return { ready: missing.length === 0, missing };
}

/** وصول مباشر بمفتاح (مع احتياط آمن) */
export function getWorkspaceDescriptor(key: WorkspaceKey): WorkspaceDescriptor {
  return BY_KEY.get(key) || BY_KEY.get('checkpoint_station')!;
}
