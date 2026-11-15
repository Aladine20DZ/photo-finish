import { describe, it, expect } from 'vitest';
import { supabaseStorageService, STORAGE_BUCKETS } from '../src/services/supabaseStorageService';
import { firebaseNotificationService } from '../src/services/firebaseNotificationService';
import handler from '../api/index.js';

describe('Enterprise Cloud Infrastructure & Deployment Suite', () => {
  describe('1. Supabase Storage Buckets & Policies Specification', () => {
    it('defines the 5 mandatory storage buckets', () => {
      expect(STORAGE_BUCKETS.LEAGUE_ASSETS).toBe('league-assets');
      expect(STORAGE_BUCKETS.SIGNATURES).toBe('signatures');
      expect(STORAGE_BUCKETS.ATHLETE_MEDIA).toBe('athlete-media');
      expect(STORAGE_BUCKETS.FINISH_IMAGES).toBe('finish-images');
      expect(STORAGE_BUCKETS.REPORTS).toBe('reports');
    });

    it('enforces maximum size limits on file uploads', async () => {
      // Simulate file exceeding 50MB finish image limit
      const oversizedBlob = {
        size: 60 * 1024 * 1024, // 60MB
        type: 'image/tiff'
      } as Blob;

      const res = await supabaseStorageService.uploadFile({
        bucket: 'finish-images',
        path: 'test/finish.tiff',
        file: oversizedBlob
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('يتجاوز الحد الأقصى');
    });

    it('falls back gracefully to offline local object URL when Supabase is unconfigured', async () => {
      const validBlob = new Blob(['sample photo finish data'], { type: 'image/png' });
      const res = await supabaseStorageService.uploadFile({
        bucket: 'league-assets',
        path: 'logos/saida_lwas.png',
        file: validBlob
      });

      expect(res.success).toBe(true);
      expect(res.isOfflineLocal).toBe(true);
      expect(res.publicUrl).toBeDefined();
    });
  });

  describe('2. Firebase Cloud Messaging (FCM) & Web Push', () => {
    it('initializes FCM service without crashing in non-browser or test environments', () => {
      expect(firebaseNotificationService).toBeDefined();
      const status = firebaseNotificationService.getPermissionStatus();
      expect(['granted', 'denied', 'default', 'unsupported']).toContain(status);
    });

    it('queues notification and maintains local audit log', async () => {
      const res = await firebaseNotificationService.sendNotification({
        title: 'بطولة سعيدة لألعاب القوى 2026',
        body: 'تم اعتماد نتائج سباق 100م رجال رسمياً.',
        recipientGroup: 'judges'
      });

      expect(res.success).toBe(true);
      const logs = firebaseNotificationService.getNotificationLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].title).toBe('بطولة سعيدة لألعاب القوى 2026');
    });
  });

  describe('3. Vercel Serverless API Endpoints', () => {
    it('returns 200 on /api/health with healthy status', async () => {
      const req = {
        headers: { host: 'localhost' },
        url: 'https://localhost/api/health',
        method: 'GET'
      };

      let statusCode = 0;
      let responseJson: any = null;

      const res = {
        setHeader: () => {},
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => { responseJson = data; }
          };
        }
      };

      await handler(req as any, res as any);
      expect(statusCode).toBe(200);
      expect(responseJson.ok).toBe(true);
      expect(responseJson.status).toBe('healthy');
      expect(responseJson.service).toBe('photo-finish-pro-api');
    });

    it('registers FCM tokens on /api/notifications/register-token', async () => {
      const req = {
        headers: { host: 'localhost' },
        url: 'https://localhost/api/notifications/register-token',
        method: 'POST',
        body: {
          token: 'fcm_token_sample_123',
          deviceId: 'PF-83DD-C9A9',
          platform: 'Web/Android'
        }
      };

      let statusCode = 0;
      let responseJson: any = null;

      const res = {
        setHeader: () => {},
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => { responseJson = data; }
          };
        }
      };

      await handler(req as any, res as any);
      expect(statusCode).toBe(200);
      expect(responseJson.ok).toBe(true);
      expect(responseJson.deviceId).toBe('PF-83DD-C9A9');
    });

    it('dispatches push notifications on /api/notifications/send', async () => {
      const req = {
        headers: { host: 'localhost' },
        url: 'https://localhost/api/notifications/send',
        method: 'POST',
        body: {
          title: 'تنبيه تحكيم عاجل',
          body: 'يرجى من حكام خط النهاية التوجه للمسار 1.'
        }
      };

      let statusCode = 0;
      let responseJson: any = null;

      const res = {
        setHeader: () => {},
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => { responseJson = data; }
          };
        }
      };

      await handler(req as any, res as any);
      expect(statusCode).toBe(200);
      expect(responseJson.ok).toBe(true);
      expect(responseJson.notificationId).toBeDefined();
    });
  });
});
