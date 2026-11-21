export interface SyncRequestResult {
  status: number;
  json: Record<string, any>;
}

export function getSyncStore(): unknown;

/**
 * معالج المزامنة الموحد (async: يدعم SQLite/Supabase/الذاكرة وجلسات الغرف الدائمة)
 */
export function handleSyncRequest(params: {
  pathname: string;
  searchParams: URLSearchParams;
  method: string;
  body: any;
  getOrCreateSession: (room: string) => string | Promise<string>;
  verifyAdminToken: (token: string) => boolean;
  clientIp?: string;
}): Promise<SyncRequestResult | null>;
