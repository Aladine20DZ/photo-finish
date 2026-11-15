/**
 * PHOTO FINISH PRO AI — Supabase Enterprise Storage Service
 * ==============================================================================
 * يدير جميع عمليات التخزين السحابي للملفات، الوثائق، التواقيع، وصور Photo Finish:
 * 1. league-assets (Public): شعارات الرابطات، الأندية، الإعلانات العامة.
 * 2. signatures (Private): التواقيع والأختام الرسمية المعتمدة للحكام.
 * 3. athlete-media (Private): صور الرياضيين، الشهادات الطبية، رخص المنافسة.
 * 4. finish-images (Private): صور Photo Finish عالية الدقة وخط النهاية Slit-Scan.
 * 5. reports (Private): محاضر السباقات الرسمية وجداول النتائج المعتمدة.
 */

import { getSupabase, isSupabaseConfigured } from './supabaseClient';

export const STORAGE_BUCKETS = {
  LEAGUE_ASSETS: 'league-assets',
  SIGNATURES: 'signatures',
  ATHLETE_MEDIA: 'athlete-media',
  FINISH_IMAGES: 'finish-images',
  REPORTS: 'reports'
} as const;

export type StorageBucketKey = keyof typeof STORAGE_BUCKETS;
export type StorageBucketName = typeof STORAGE_BUCKETS[StorageBucketKey];

export interface FileUploadOptions {
  bucket: StorageBucketName;
  path: string;
  file: File | Blob;
  fileName?: string;
  mimeType?: string;
  competitionId?: string;
  eventId?: string;
  leagueId?: string;
  isCertifiedLocked?: boolean;
  metadata?: Record<string, any>;
}

export interface FileUploadResult {
  success: boolean;
  path: string;
  bucket: StorageBucketName;
  publicUrl?: string;
  signedUrl?: string;
  sizeBytes: number;
  mimeType: string;
  isOfflineLocal?: boolean;
  error?: string;
}

export class SupabaseStorageService {
  private static instance: SupabaseStorageService;

  public static getInstance(): SupabaseStorageService {
    if (!SupabaseStorageService.instance) {
      SupabaseStorageService.instance = new SupabaseStorageService();
    }
    return SupabaseStorageService.instance;
  }

  /**
   * رفع ملف إلى الحاوية المناسبة مع التحقق من النوع والحجم
   */
  public async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
    const {
      bucket,
      path,
      file,
      fileName = 'uploaded_file',
      mimeType = file.type || 'application/octet-stream',
      competitionId,
      eventId,
      leagueId,
      isCertifiedLocked = false,
      metadata = {}
    } = options;

    const sizeBytes = file.size;

    // التحقق من الحجم الأقصى المسموح لكل حاوية
    const maxLimits: Record<StorageBucketName, number> = {
      'league-assets': 5 * 1024 * 1024,      // 5MB
      'signatures': 2 * 1024 * 1024,         // 2MB
      'athlete-media': 10 * 1024 * 1024,     // 10MB
      'finish-images': 50 * 1024 * 1024,     // 50MB
      'reports': 25 * 1024 * 1024            // 25MB
    };

    if (sizeBytes > maxLimits[bucket]) {
      const maxMb = Math.round(maxLimits[bucket] / (1024 * 1024));
      return {
        success: false,
        bucket,
        path,
        sizeBytes,
        mimeType,
        error: `حجم الملف (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB) يتجاوز الحد الأقصى المسموح به لهذه الحاوية (${maxMb}MB).`
      };
    }

    // إذا كانت خدمة Supabase غير مهيأة أو الجهاز أوفلاين: حفظ مؤقت في المتصفح
    if (!isSupabaseConfigured() || typeof navigator !== 'undefined' && !navigator.onLine) {
      const localUrl = URL.createObjectURL(file);
      this.cacheOfflineFile({ bucket, path, localUrl, sizeBytes, mimeType, fileName, metadata });
      return {
        success: true,
        bucket,
        path,
        publicUrl: bucket === STORAGE_BUCKETS.LEAGUE_ASSETS ? localUrl : undefined,
        signedUrl: localUrl,
        sizeBytes,
        mimeType,
        isOfflineLocal: true
      };
    }

    try {
      const supabase = getSupabase();

      // 1. رفع الملف الثنائي إلى حاوية Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        return {
          success: false,
          bucket,
          path,
          sizeBytes,
          mimeType,
          error: uploadError.message
        };
      }

      // 2. تسجيل البيانات الوصفية للملف في جدول storage_files
      try {
        await (supabase as any).from('storage_files').insert({
          bucket_id: bucket,
          file_path: uploadData.path,
          file_name: fileName,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          league_id: leagueId,
          competition_id: competitionId,
          event_id: eventId,
          is_certified_locked: isCertifiedLocked,
          metadata
        });
      } catch {
        // تجاهل في حالة عدم اكتمال جدول التوثيق
      }

      // 3. استخراج الرابط
      let publicUrl: string | undefined;
      let signedUrl: string | undefined;

      if (bucket === STORAGE_BUCKETS.LEAGUE_ASSETS) {
        const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
        publicUrl = pubData.publicUrl;
      } else {
        const { data: signData } = await supabase.storage.from(bucket).createSignedUrl(uploadData.path, 3600);
        signedUrl = signData?.signedUrl;
      }

      return {
        success: true,
        bucket,
        path: uploadData.path,
        publicUrl,
        signedUrl,
        sizeBytes,
        mimeType,
        isOfflineLocal: false
      };
    } catch (err: any) {
      return {
        success: false,
        bucket,
        path,
        sizeBytes,
        mimeType,
        error: err?.message || 'فشل رفع الملف إلى التخزين السحابي.'
      };
    }
  }

  /**
   * توليد رابط موقع ومؤقت للملفات الخاصة (Signed URL)
   */
  public async getSignedUrl(bucket: StorageBucketName, path: string, expiresInSeconds: number = 3600): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
      if (error || !data) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  }

  /**
   * جلب الرابط العام لملفات الحاوية العامة
   */
  public getPublicUrl(bucket: StorageBucketName, path: string): string {
    if (!isSupabaseConfigured()) {
      return '';
    }
    const supabase = getSupabase();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || '';
  }

  /**
   * حذف ملف من الحاوية (محمي: يُمنع حذف الصور والمحاضر المعتمدة رسمياً)
   */
  public async deleteFile(bucket: StorageBucketName, path: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }
    try {
      const supabase = getSupabase();

      // التحقق من حالة القفل الرسمي
      const { data: fileRec } = await (supabase as any)
        .from('storage_files')
        .select('is_certified_locked')
        .eq('bucket_id', bucket)
        .eq('file_path', path)
        .maybeSingle();

      if (fileRec && fileRec.is_certified_locked) {
        return {
          success: false,
          error: 'لا يمكن حذف هذا الملف نظراً لكونه مرتبطاً بمحضر أو نتيجة رسمية معتمدة ومقفلة.'
        };
      }

      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) return { success: false, error: error.message };

      await (supabase as any).from('storage_files').delete().eq('bucket_id', bucket).eq('file_path', path);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف الملف.' };
    }
  }

  private cacheOfflineFile(item: any): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const existingRaw = localStorage.getItem('pfp_offline_storage_queue') || '[]';
      const existing = JSON.parse(existingRaw);
      existing.unshift({ ...item, timestamp: Date.now() });
      localStorage.setItem('pfp_offline_storage_queue', JSON.stringify(existing.slice(0, 50)));
    } catch {}
  }
}

export const supabaseStorageService = SupabaseStorageService.getInstance();
