# PHOTO FINISH PRO — ENVIRONMENT VARIABLES SPECIFICATION
## الدليل المرجعي الكامل لمصفوفة متغيرات البيئة والأسرار

---

## 1. قواعد الأمان الإلزامية للمتغيرات

1. **المتغيرات ذات البادئة `VITE_`:**
   - يتم تضمينها داخل كود JavaScript المرسل لمتصفح العميل أثناء عملية البناء (`vite build`).
   - يجب أن تحتوي فقط على عناوين عامة ومفاتيح واجهة عامة (Client Public Keys).
   - **يُمنع منعاً باتاً وضع أي كلمة مرور، أو مفتاح خاص، أو مفتاح خدمة (Service Role Key) ببادئة `VITE_`.**

2. **المتغيرات الخادمة السرية (Server Secrets):**
   - لا تبدأ بـ `VITE_`.
   - تُقرأ حصراً على خوادم Vercel Serverless Functions أو خادم Render (`process.env.VARIABLE_NAME`).
   - لا تتسرب نهائياً إلى متصفح العميل أو ملف `dist/index.html`.

---

## 2. جدول متغيرات الواجهة الأمامية العامة (Vercel Frontend)

| اسم المتغير | النوع | إلزامي؟ | مثال توضيحي | الغرض والاستخدام |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | String (URL) | نعم (سحابياً) | `https://xyz.supabase.co` | نقطة اتصال مشروع Supabase السحابي |
| `VITE_SUPABASE_ANON_KEY` | String (JWT) | نعم (سحابياً) | `eyJhbGciOiJI...` | المفتاح العام للاستعلام مع تفعيل RLS |
| `VITE_RELAY_WS_URL` | String (WSS) | نعم (للمزامنة) | `wss://photo-finish-relay.onrender.com` | عنوان خادم الترحيل الفوري للهواتف الأربعة |
| `VITE_FIREBASE_API_KEY` | String | اختياري | `AIzaSy...` | مفتاح واجهة الويب لخدمات Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | String | اختياري | `pfp.firebaseapp.com` | نطاق مصادقة Firebase |
| `VITE_FIREBASE_PROJECT_ID` | String | اختياري | `photo-finish-prod` | معرف مشروع Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET`| String | لا (نستخدم Supabase)| `pfp.appspot.com` | غير مستخدم في التخزين المعتمد |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| String | للإشعارات | `102938475610` | رقم تعريف مرسل رسائل FCM |
| `VITE_FIREBASE_APP_ID` | String | للإشعارات | `1:102938475610:web:abc` | معرف تطبيق الويب المسجل في Firebase |
| `VITE_FIREBASE_VAPID_KEY` | String (B64) | للإشعارات | `BNx7...` | مفتاح VAPID العام لاشتراك Web Push |
| `VITE_DEFAULT_LEAGUE_PASSWORD` | String | للإنتاج | `SecureLeaguePass2026!` | كلمة مرور أولية لمشرف الرابطة |
| `VITE_SESSION_SECRET` | String (Hash) | نعم | `sha256_random_string` | توقيع وتشفير جلسات التخزين المحلي |

---

## 3. جدول متغيرات الخادم السرية (Serverless & Backend Secrets)

| اسم المتغير | المنصة | درجة السرية | مثال | الوصف |
|---|---|---|---|---|
| `ADMIN_PORTAL_PASSWORD` | Vercel | سرية حرجة 🔴 | `ComplexP@ssw0rd2026!` | كلمة مرور الدخول للوحة التحكم المركزية |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | سرية قصوى 🔴 | `eyJhbGciOiJI...` | يتجاوز RLS للعمليات الإدارية الخادمة |
| `LICENSE_PRIVATE_KEY_BASE64` | Vercel | سرية قصوى 🔴 | `ydyqLd+Qfl...` | المفتاح الخاص لتوقيع تراخيص Ed25519 |
| `LICENSE_PUBLIC_KEY_BASE64` | Vercel & Render | عامة 🟢 | `QKXMTkpN9u...` | المفتاح العام المعتمد للتحقق من التوقيع |
| `FIREBASE_SERVICE_ACCOUNT_KEY`| Vercel | سرية قصوى 🔴 | `{"type":"service_account"...}`| اعتماد خادم Firebase لإرسال الإشعارات |
| `ALLOWED_ORIGIN` | Render & Vercel | متوسطة 🟡 | `https://photo-finish.vercel.app`| تقييد اتصالات CORS و WebSocket |
| `PORT` | Render | تشغيلية 🟢 | `8080` | منفذ تشغيل خدمة خادم الترحيل |
| `NODE_ENV` | Render & Vercel | تشغيلية 🟢 | `production` | نمط التشغيل الإنتاجي |

---

## 4. إرشادات الضبط على المنصات السحابية

### 4.1 على Vercel:
1. اذهب إلى **Project Settings > Environment Variables**.
2. اختر البيئات المستهدفة: **Production**, **Preview**, **Development**.
3. احرص على تمييز مشروع Supabase الخاص بالتجارب (`pfp-staging`) في بيئة **Preview** عن مشروع الإنتاج (`pfp-prod`) في بيئة **Production**.

### 4.2 على Render:
1. اذهب إلى **Dashboard > photo-finish-relay > Environment**.
2. أضف `PORT=8080` و `NODE_ENV=production` و `ALLOWED_ORIGIN`.
3. لا يحتاج خادم الترحيل إلى مفاتيح قاعدة البيانات المركزية لأنه يعمل كوسيط لنقل الرسائل المشفرة بين الهواتف فقط دون فك تشفير البيانات الرياضية.
