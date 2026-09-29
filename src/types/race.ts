export type GunSoundType = 'official_starter_gun'; // صوت طلقة مسدس الانطلاق الاحترافي الموحد (Web Audio API)

export type StarterMode = 'auto_random' | 'manual';

export interface Runner {
  id: number;
  bib: number;           // رقم الصدرية (Dossard)
  name: string;          // الاسم واللقب
  birthDate?: string;    // تاريخ الميلاد (Date de Naissance)
  country: string;       // الدولة / النادي
  club?: string;         // النادي الرياضي
  wilaya?: string;       // الولاية / الرابطة
  lane: number;          // رقم الرواق في المضمار (1 إلى 8)
  color: string;
  finishTime: number;    // التوقيت بالمللي ثانية (0 إذا لم ينته بعد)
  reactionTime?: number;
  rank?: number;         // الترتيب: 1 للأول، 2 للثاني...
  status: 'OK' | 'DNF' | 'DQ' | 'DNS'; // OK: عادي، DNF: لم يكمل، DQ: إقصاء، DNS: لم يبدأ
  avatar?: string;
  crossingSnapshot?: string; // لقطة الحساس الدقيقة عند قطع خط النهاية من كاميرا هاتف 2
  notes?: string;        // ملاحظات الحكم العام
}

// الأدوار الأربعة للنظام: هاتف البداية، هاتف الكاميرا، هاتف التحكيم، وهاتف غرفة النداء (Chambre d'Appel)
export type PhoneRole = 'start' | 'finish' | 'judge' | 'chambre_dappel' | null;

export type RaceStatus = 
  | 'idle'
  | 'waiting'
  | 'on_marks'
  | 'set'
  | 'racing'
  | 'finished'
  | 'false_start';

export type RaceDistance = string;

// نموذج السلسلة أو القائمة (Heat / Series) في السباق
export interface Heat {
  id: string;
  number: number;        // رقم القائمة / السلسلة (قائمة 1، قائمة 2...)
  name: string;          // اسم القائمة (مثلاً: 800m Série 1، 800m Série 2، النهائي)
  distance: RaceDistance;
  windSpeed: string;
  runners: Runner[];
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: number;
  order?: number;        // ترتيب القائمة في جدول السباقات
  scheduledTime?: string;// التوقيت المجدول للسباق (مثلاً 16:30)
  isDispatched?: boolean;// تم إرسال أمر Au Départ من هاتف البداية
  dispatchedAt?: number; // وقت الإرسال إلى خط الانطلاق
  fullPhotoFinishUrl?: string; // شريط المسح البانورامي المستمر الحقيقي للسباق (Slit-Scan)
}

export interface RaceSettings {
  distance: RaceDistance;
  availableDistances: string[];  // قائمة المسافات المتاحة
  heatNumber: number;            // رقم القائمة الحالية (1، 2، 3...)
  heatName: string;              // اسم القائمة الحالية (تصفية 1، النهائي...)
  laneCount: number;             // عدد الأروقة (2، 4، 6، 8)
  finishLineXPercent: number;    // موقع خط النهاية الرسمي (مثلاً 35%)
  finishLineColor: string;       // لون خط النهاية
  finishLineWidth: number;       // سُمك خط النهاية
  preFinishLineXPercent?: number;  // موقع خط ما قبل النهاية (بدء التصوير التلقائي)
  preFinishLineColor?: string;     // لون خط ما قبل النهاية
  postFinishLineXPercent?: number; // موقع خط ما بعد النهاية (انتهاء التصوير)
  postFinishLineColor?: string;    // لون خط ما بعد النهاية
  motionThreshold: number;       // حساسية حساس خط النهاية
  laserBeamVisible: boolean;     // إظهار شعاع الحساس الضوئي
  gunSoundType: GunSoundType;    // نوع صوت طلقة الانطلاق
  soundVolume: number;           // مستوى الصوت
  soundPitch: number;            // حدة وسرعة الصوت
  stadiumAcoustics: boolean;     // تفعيل صدى وهندسة صوت الملعب
  stadiumReverbLevel: number;    // مستوى صدى مدرجات الملعب
  stadiumAmbience: boolean;      // أجواء وضوضاء مضمار الملعب
  hapticFeedback: boolean;       // اهتزاز الهاتف
  starterMode: StarterMode;      // نمط زر الانطلاق
  autoDelayDuration: number;     // مدة التأخير العشوائي بعد استعد
  slitScanWidth: number;         // عرض شريحة المسح الشريطي
  windSpeed: string;             // سرعة الرياح الرسمية (+1.2 m/s)
  autoStopAfterLastRunner: boolean;
}

export interface NetworkPeerMessage {
  type: 
    | 'SYNC_PING' 
    | 'SYNC_PONG' 
    | 'ON_MARKS' 
    | 'SET' 
    | 'START_GUN' 
    | 'RECALL_GUN' 
    | 'CLOCK_TICK' 
    | 'LANE_FINISH' 
    | 'RACE_COMPLETE' 
    | 'SYNC_RESET_ALL'          // زر مشترك لإعادة ضبط السباق في الهواتف معاً
    | 'SETTINGS_SYNC'
    | 'BELL_SIGNAL_START'       // بدء جرس/إشارة لفت الانتباه
    | 'BELL_SIGNAL_STOP'        // إيقاف جرس التنبيه
    | 'BELL_SIGNAL_ACK'         // تأكيد استلام إشارة الرنين
    | 'JUDGE_UPDATE_RUNNER'     // تعديل النتيجة أو الترتيب من هاتف الحكم
    | 'HEAT_CHANGE'             // تبديل القائمة النشطة (قائمة 1، قائمة 2...)
    | 'HEAT_DISPATCH'           // أمر "إلى خط الانطلاق (Au Départ)" من هاتف البداية
    | 'HEAT_CANCEL_DISPATCH'    // إلغاء أمر خط الانطلاق وسحب القائمة
    | 'HEATS_SYNC'              // مزامنة جميع القوائم والعدائين
    | 'HEATS_REORDER'           // إعادة ترتيب القوائم يدوياً أو تلقائياً
    | 'DELETE_HEAT'             // حذف قائمة/سلسلة
    | 'SLIT_SCAN_IMAGE'         // بث شريط المسح البانورامي المستمر الكامل
    | 'REQUEST_STATE_SYNC'      // طلب مزامنة الحالة الكاملة عند دخول هاتف جديد
    | 'RESPONSE_STATE_SYNC';    // إرسال الحالة الكاملة للهاتف المنضم
  timestamp: number;            // ساعة الحائط Date.now() — للعرض
  senderTime: number;           // ساعة الحائط وقت الإرسال
  perfNow?: number;             // ساعة أحادية الاتجاه performance.now() — للتوقيت الدقيق
  payload?: any;
}

export interface LaneMotionState {
  lane: number;
  motionScore: number;
  isTriggered: boolean;
  hasFinished: boolean;
  finishTime?: number;
}
