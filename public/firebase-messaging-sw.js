/**
 * PHOTO FINISH PRO AI — Firebase Cloud Messaging Service Worker
 * ==============================================================================
 * يعالج الإشعارات الفورية في الخلفية عند قفل الشاشة أو تشغيل المتصفح في الخلفية:
 * - تعيينات الحكام والمهام الرسمية
 * - تنبيهات انطلاق السباقات وغرفة النداء
 * - تحديثات برنامج المنافسة وجداول التصفيات
 * - إشعارات اعتماد وتوثيق النتائج
 */

/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  // تفعيل فوري لـ Service Worker دون انتظار إغلاق النوافذ القديمة
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// استقبال رسائل Push القادمة من خادم Firebase FCM
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      notification: {
        title: 'تنبيه من Photo Finish Pro ⚡',
        body: event.data.text()
      }
    };
  }

  const title = payload.notification?.title || payload.title || 'Photo Finish Pro ⚡';
  const body = payload.notification?.body || payload.body || 'إشعار تحكيم أو منافسة جديد';
  const icon = payload.notification?.icon || '/favicon.ico';
  const badge = payload.notification?.badge || '/favicon.ico';
  const data = payload.data || {};

  const notificationOptions = {
    body,
    icon,
    badge,
    data,
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: data.requireInteraction === 'true' || false,
    tag: data.tag || 'pfp-notification',
    renotify: true,
    actions: [
      { action: 'open', title: 'عرض التفاصيل 📋' },
      { action: 'dismiss', title: 'إغلاق ✕' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// النقر على الإشعار: توجيه المستخدم للشاشة المناسبة
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // إذا كانت النافذة مفتوحة بالفعل، نركز عليها ونوجهها
      for (let client of windowClients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            payload: event.notification.data
          });
          return client.focus();
        }
      }
      // إذا كانت مغلقة، نفتح نافذة جديدة
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
