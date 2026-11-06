# 🐘 دليل إعداد وربط منصة Supabase (PHOTO FINISH PRO AI)

يقدم هذا الدليل الخطوات التفصيلية لإعداد مشروع Supabase السحابي وتطبيق مخطط قاعدة البيانات والصلاحيات (RLS).

---

## 1. إنشاء مشروع جديد على Supabase
1. سجل الدخول إلى [لوحة تحكم Supabase](https://app.supabase.com/).
2. أنشئ مشروعاً جديداً باسم: `photo-finish-pro-ai`.
3. اختر المنطقة الأقرب لمضمار السباقات (مثلاً `eu-central-1` فرانكفورت أو `me-central-1` دبي).
4. احفظ كلمة مرور قاعدة البيانات (Database Password) في مكان آمن.

---

## 2. تنفيذ ملف الترحيل والمخطط (Schema Migration)
1. افتح تبويب **SQL Editor** من القائمة الجانبية في Supabase.
2. افتح الملف:
   `supabase/migrations/20260306000000_photo_finish_pro_schema.sql`
3. انسخ محتوى الملف بالكامل والصقه في محرر SQL في Supabase ثم اضغط **RUN**.
4. سيتم إنشاء:
   - كافة الجداول الـ 12 (`leagues`, `clubs`, `profiles`, `athletes`, `competitions`, `events`, `entries`, `results`, إلخ).
   - تفعيل أمان الصفوف (RLS) بنسبة 100% على كافة الجداول.
   - تفعيل قنوات البث اللحظي (Realtime Replica Identity Full).

---

## 3. ضبط متغيرات البيئة في التطبيق (.env)
انسخ ملف `.env.example` إلى `.env` في جذر المشروع:

```env
# رابط المشروع ومفتاح الوصول العام المتاح في المتصفح:
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# مفتاح الخادم الحصري (يُمنع وضعه في كود الواجهة VITE):
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# كلمة مرور لوحة الإدارة العليا:
ADMIN_PORTAL_PASSWORD=YourStrongAdminPassword2026!
```

---

## 4. العمل في الميدان دون اتصال (Offline-First)
- في حال انقطاع الإنترنت أو العمل في مناطق نائية، يتحول التطبيق تلقائياً إلى الوضع الميداني المستقل (Offline Mode).
- يتم تخزين النتائج والمشاركات محلياً في الـ LocalStorage وطابور الـ CRDT، ثم مزامنتها آلياً فور توفر الاتصال السحابي.
