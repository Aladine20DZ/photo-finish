/**
 * PHOTO FINISH PRO – Complete Athletics Management System
 * تعريفات ونماذج البيانات لمنظومة المنافسات ونقاط المراقبة والحكام
 * 
 * المبادئ الحاكمة:
 * 1. الحفاظ على التوافق التام مع types/race.ts دون كسر.
 * 2. دعم كافة أنواع ألعاب القوى (العدو الريفي، سباقات الطريق، المضمار، والميدان).
 * 3. أحداث المرور غير قابلة للحذف وتتضمن مسار تدقيق رسمي (Audit Trail).
 */

export type AthleticsCompetitionType = 
  | 'cross_country'   // العدو الريفي (حلقات ومسارات طبيعية)
  | 'road_race'       // سباقات الطريق (10km، نصف ماراثون، ماراثون)
  | 'track_race'      // سباقات المضمار (السرعة، الحواجز، المسافات المتوسطة والطويلة)
  | 'race_walking'    // المشي الرياضي
  | 'field_event'     // مسابقات الميدان (الوثب والرمي)
  | 'combined_event'; // السباعي والعشاري

export type AgeCategory = 
  | 'U14'     // براعم
  | 'U16'     // أصاغر
  | 'U18'     // أشبال
  | 'U20'     // أواسط
  | 'SENIOR'  // أكابر
  | 'MASTER'  // قدماء
  | 'OPEN';   // مفتوح

export type GenderCategory = 'M' | 'F' | 'MIXED';

export type CheckpointType = 
  | 'start'          // خط الانطلاق
  | 'intermediate'   // نقطة مراقبة بينية عادية
  | 'turnaround'     // نقطة التفاف (U-Turn)
  | 'split'          // نقطة قياس زمن جزئي (Split Timing)
  | 'finish';        // خط النهاية

export interface Checkpoint {
  id: string;               // معرف فريد للنقطة (مثل cp_01_a9f)
  code: string;             // رمز النقطة المختصر (START, CP01, CP02, FINISH)
  name: string;             // الاسم التوضيحي (مثلاً: نقطة جسر الوادي، منعرج الصنوبر)
  distanceKm: number;       // المسافة بالكيلومتر من خط البداية (مثلاً 2.5 كم)
  type: CheckpointType;
  requiredLaps: number[];   // أرقام الحلقات التي يجب تسجيل المرور فيها (مثلاً [1, 2, 3, 4])
  order: number;            // ترتيب النقطة التسلسلي في المسار (0, 1, 2...)
  latitude?: number;        // الإحداثيات الجغرافية (اختياري للخرائط)
  longitude?: number;
  assignedJudgeIds: string[]; // معرفات الحكام المعينين في هذه النقطة
  expectedPassageCount?: number;
}

export interface AthleticsCompetition {
  id: string;               // UUID فريد
  name: string;             // اسم المنافسة (مثلاً: البطولة الجهوية للعدو الريفي - أكابر رجال)
  type: AthleticsCompetitionType;
  venue: string;            // مكان السباق (الملعب / المنتزه / الغابة)
  date: string;             // تاريخ المنافسة
  distanceKm: number;       // المسافة الإجمالية بالكيلومتر
  lapCount: number;         // عدد الحلقات (مثلاً 4 حلقات في سباق 8 كم)
  category: AgeCategory;
  gender: GenderCategory;
  checkpoints: Checkpoint[]; // قائمة نقاط المراقبة المرتبة
  scheduledStartTime?: string; // وقت الانطلاق المجدول (مثلاً "09:30")
  actualStartTime?: number;    // توقيت البداية الفعلي بالمللي ثانية (Date.now())
  status: 'draft' | 'ready' | 'in_progress' | 'completed' | 'official';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type JudgeRole = 
  | 'chief_judge'        // الحكم العام / الحكم الرئيسي (اعتماد النتائج ومراجعة التقارير)
  | 'checkpoint_judge'   // حكم نقطة مراقبة (تسجيل المرور)
  | 'course_marshal'     // مراقب مسار (رصد المخالفات)
  | 'finish_judge'       // حكم خط النهاية
  | 'results_secretary'; // مسؤول أمانة النتائج والإحصاء

export interface AthleticsJudge {
  id: string;                  // UUID فريد للحكم
  name: string;                // اسم الحكم الكامل
  phone?: string;              // رقم الهاتف
  pinCode: string;             // رمز PIN سريع للدخول (4 أرقام)
  role: JudgeRole;
  assignedCheckpointId?: string; // النقطة المخصصة حالياً
  assignedCompetitionId?: string;// المنافسة المخصصة
  deviceId?: string;           // معرف الجهاز المتصل
  isOnline?: boolean;
  lastSeen?: number;
  latencyMs?: number;
}

export type PassageSource = 
  | 'quick_button'   // ضغط سريع على لوحة الأرقام (Rapid Pad)
  | 'qr_scan'        // مسح باركود الصدرية بالكاميرا
  | 'nfc'            // بطاقة NFC
  | 'manual_entry';  // إدخال يدوي تدقيقي

export interface PassageEvent {
  id: string;               // UUID فريد عالمياً لمنع التكرار (Idempotency)
  competitionId: string;
  checkpointId: string;
  checkpointCode: string;   // للتسهيل والعرض السريع (CP01, FINISH...)
  lapNumber: number;        // رقم الحلقة الحالية للعداء (1, 2...)
  bibNumber: number;        // رقم الصدرية (Dossard)
  athleteName?: string;     // اسم العداء إن وجد
  club?: string;            // نادي العداء
  timestamp: number;        // توقيت التسجيل الحقيقي (Date.now())
  perfNow?: number;         // توقيت دقيق أحادي الاتجاه (performance.now())
  elapsedTimeMs?: number;   // الزمن المنقضي منذ انطلاق السباق
  splitTimeMs?: number;     // الزمن بين هذه النقطة والسابقة
  recordedByJudgeId: string;// معرف الحكم الذي سجل الحدث
  judgeName?: string;
  deviceId: string;         // معرف الجهاز
  source: PassageSource;
  syncStatus: 'pending' | 'synced' | 'conflict';
  syncedAt?: number;
  isFlagged?: boolean;      // هل هناك تنبيه أو اشتباه (مثلاً تخطي نقطة سابقة)
  flagReason?: string;
}

export interface PassageCorrection {
  id: string;               // UUID
  passageEventId: string;   // معرف الحدث الأصلي
  originalBibNumber: number;
  correctedBibNumber: number;
  reason: string;           // سبب التصحيح (خطأ إبصار، تصحيح من الحكم المساعد...)
  requestedByJudgeId: string;
  requestedByName: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByJudgeId?: string;
  reviewedByName?: string;
  reviewedAt?: number;
  reviewNote?: string;
}

export interface CourseViolation {
  id: string;
  competitionId: string;
  bibNumber: number;
  checkpointId?: string;
  reportedByJudgeId: string;
  judgeName: string;
  violationType: 'course_cutting' | 'unsporting' | 'illegal_assistance' | 'missed_checkpoint';
  description: string;
  reportedAt: number;
  status: 'pending' | 'confirmed' | 'dismissed';
  penaltyApplied?: 'warning' | 'time_penalty' | 'disqualification';
  penaltySeconds?: number;
  decidedByJudgeId?: string;
  decidedAt?: number;
}

export interface RunnerLiveRanking {
  bibNumber: number;
  athleteName: string;
  club?: string;
  category?: AgeCategory;
  lapsCompleted: number;
  lastCheckpointCode: string;
  lastCheckpointDistanceKm: number;
  lastPassageTime: number;
  totalElapsedTimeMs: number;
  rank: number;
  gapToLeaderMs: number;
  status: 'active' | 'finished' | 'dnf' | 'dq';
  hasAnomaly: boolean;
  anomalyReason?: string;
  passages: PassageEvent[];
}
