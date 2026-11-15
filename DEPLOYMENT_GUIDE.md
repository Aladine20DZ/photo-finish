# PHOTO FINISH PRO — ENTERPRISE CLOUD DEPLOYMENT GUIDE
## دليل النشر والتشغيل السحابي المتكامل (GitHub + Vercel + Supabase + Firebase + Render)

---

## 1. المعمارية السحابية المعتمدة (Target Architecture)

```
                       ┌──────────────────────────────────────────────┐
                       │          GitHub Source Repository            │
                       │     (github.com/flashnet20dz/photo-finish)   │
                       └──────────────┬───────────────────────────────┘
                                      │ Automated CI/CD
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
      ┌─────────────────────────────┐   ┌─────────────────────────────┐
      │     Vercel Production       │   │    Render Relay Service     │
      │   (Web PWA + REST APIs)     │   │   (WebSocket wsRooms Hub)   │
      └──────────────┬──────────────┘   └──────────────┬──────────────┘
                     │                                 │
     ┌───────────────┼───────────────┐                 │
     ▼               ▼               ▼                 ▼
┌───────────┐ ┌─────────────┐ ┌─────────────┐   ┌─────────────┐
│ Supabase  │ │  Supabase   │ │  Firebase   │   │ Race Timing │
│ PostgreSQL│ │   Storage   │ │     FCM     │   │ 4-Phone Net │
│ (DB & RLS)│ │ (5 Buckets) │ │(Push Alerts)│   │ (Quad-Sync) │
└───────────┘ └─────────────┘ └─────────────┘   └─────────────┘
```

---

## 2. الخطوة الأولى: إعداد Supabase (قاعدة البيانات والتخزين)

### 2.1 إنشاء المشاريع:
1. أنشئ مشروعين على [Supabase Dashboard](https://supabase.com):
   - **`pfp-prod`**: بيئة الإنتاج الرسمية.
   - **`pfp-staging`**: بيئة التجارب والاختبارات التمهيدية.
2. اختر منطقة الاستضافة الأقرب للمستخدمين (مثلاً: `eu-central-1` فرانكفورت أو `eu-west-3` باريس) لتقليل زمن الاستجابة (Latency < 35ms).

### 2.2 تطبيق الترحيلات (Database Migrations):
افتح **SQL Editor** في لوحة تحكم Supabase ونفذ ملفي الترحيل بالترتيب:
1. `supabase/migrations/20260306000000_photo_finish_pro_schema.sql` (إنشاء الجداول الـ 12 الأساسية).
2. `supabase/migrations/20260306000001_enterprise_cloud_infrastructure.sql` (إنشاء الحاويات الخمس، سياسات التخزين، إشعارات FCM، وسجل الحكام).

### 2.3 التحقق من حاويات التخزين (Storage Buckets):
تأكد من ظهور الحاويات التالية في قسم **Storage**:
- `league-assets` (Public)
- `signatures` (Private)
- `athlete-media` (Private)
- `finish-images` (Private)
- `reports` (Private)

---

## 3. الخطوة الثانية: إعداد Vercel (استضافة التطبيق وواجهات API)

### 3.1 ربط المستودع:
1. ادخل إلى [Vercel Dashboard](https://vercel.com) واضغط **Add New Project**.
2. اختر مستودع GitHub: `flashnet20dz/photo-finish`.
3. الإعدادات التلقائية:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`

### 3.2 إدخال متغيرات البيئة (Environment Variables):
في لوحة Vercel (**Settings > Environment Variables**)، أضف المتغيرات التالية:

| المتغير | البيئة | الوصف |
|---|---|---|
| `VITE_SUPABASE_URL` | Production & Preview | عنوان مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | Production & Preview | مفتاح Anon العام |
| `SUPABASE_SERVICE_ROLE_KEY` | Production Only | مفتاح Service Role السري للعمليات الإدارية |
| `VITE_RELAY_WS_URL` | Production & Preview | رابط خادم الترحيل (مثال: `wss://photo-finish-relay.onrender.com`) |
| `ADMIN_PORTAL_PASSWORD` | Production Only | كلمة مرور بوابة الإدارة العليا |
| `LICENSE_PRIVATE_KEY_BASE64` | Production Only | المفتاح الخاص لتوقيع تراخيص Ed25519 |
| `LICENSE_PUBLIC_KEY_BASE64` | Production & Preview | المفتاح العام المعتمد |
| `VITE_FIREBASE_API_KEY` | Production & Preview | مفتاح Firebase Web API |
| `VITE_FIREBASE_PROJECT_ID` | Production & Preview | معرف مشروع Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Production & Preview | معرف مرسل FCM |
| `VITE_FIREBASE_APP_ID` | Production & Preview | معرف تطبيق الويب |
| `VITE_FIREBASE_VAPID_KEY` | Production & Preview | مفتاح VAPID العام لـ Web Push |

---

## 4. الخطوة الثالثة: إعداد Render (خادم الترحيل المستمر WebSocket Relay)

### 4.1 إنشاء خدمة ويب جديدة:
1. ادخل إلى [Render Dashboard](https://render.com) واضغط **New > Web Service**.
2. اربط مستودع GitHub: `flashnet20dz/photo-finish`.
3. اضغط على **Apply Blueprint** لاكتشاف ملف `render.yaml` تلقائياً، أو اضبط الإعدادات يدوياً:
   - **Name:** `photo-finish-relay`
   - **Runtime:** `Node`
   - **Root Directory:** `.`
   - **Build Command:** `npm install`
   - **Start Command:** `node relay-server/index.js`
   - **Plan:** `Free` أو `Starter`

### 4.2 فحص الصحة (Health Check):
بعد اكتمال النشر، افتح الرابط:
`https://photo-finish-relay.onrender.com/health`
يجب أن تظهر الاستجابة:
```json
{
  "status": "ok",
  "rooms": 0,
  "service": "photo-finish-relay"
}
```
ثم انسخ عنوان WSS وضعه في `VITE_RELAY_WS_URL` على Vercel:
`wss://photo-finish-relay.onrender.com`

---

## 5. الخطوة الرابعة: إعداد Firebase Cloud Messaging (FCM)

1. افتح [Firebase Console](https://console.firebase.google.com).
2. أنشئ مشروعاً جديداً باسم `photo-finish-pro`.
3. أضف تطبيق ويب (**Web App**) واحصل على بيانات الإعدادات (`firebaseConfig`).
4. توجه إلى **Project Settings > Cloud Messaging**:
   - في قسم **Web configuration**، اضغط **Generate key pair** للحصول على **VAPID Key**.
   - انسخ الـ VAPID Key وضعه في `VITE_FIREBASE_VAPID_KEY`.
5. في قسم **Service accounts**، أنشئ مفتاح اعتماد جديد **Generate new private key** (JSON) وضعه كقيمة لـ `FIREBASE_SERVICE_ACCOUNT_KEY` في متغيرات Vercel السرية.

---

## 6. إجراءات التحديث الدوري والنشر المستمر (Continuous Deployment)

1. **العمل على فرع `develop`:** يتم إجراء التعديلات وتجربتها أولاً.
2. **التكامل عبر Pull Request:** يفتح المطور PR إلى `main`.
3. **فحص GitHub Actions الآلي:** يتحقق من TypeScript والاختبارات والأمان والبناء تلقائياً.
4. **النشر التلقائي للإنتاج:** عند الدمج في `main`، تقوم Vercel بنشر واجهة الويب فوراً، ويقوم Render بتحديث خادم الترحيل.
