export interface LicenseRecord {
  code: string;
  planId?: string | null;
  tier: string;
  tierName: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  deviceId: string;
  expiryDate: string;
  maxDevices: number;
  isQuadPool: boolean;
  status: 'active' | 'revoked' | 'expired';
  createdAt: number;
  activatedAt?: number | null;
  revokedAt?: number | null;
  transferredTo?: string | null;
  notes?: string;
}

export interface PlanRecord {
  id: string;
  tierCode: 'CLB8' | 'ENTX';
  name: string;
  description: string;
  priceDzd: number;
  priceEur: number;
  priceUsd: number;
  durationMonths: number;
  laneCount: number;
  isQuadPool: boolean;
  features: string[];
  isCustom?: boolean;
  isActive: boolean;
  displayOrder: number;
  updatedAt?: number;
}

export interface LicensingStore {
  listPlans(options?: { activeOnly?: boolean }): PlanRecord[];
  getPlan(id: string): PlanRecord | null;
  savePlan(plan: Partial<PlanRecord>): PlanRecord;
  deletePlan(id: string): boolean;
  saveLicense(lic: Partial<LicenseRecord>): LicenseRecord;
  getLicense(code: string): LicenseRecord | null;
  listLicenses(options?: { status?: string; search?: string }): LicenseRecord[];
  recordActivation(params: { licenseCode: string; deviceId: string; deviceName?: string; platform?: string; ipAddress?: string }): any;
  getActivations(licenseCode: string): any[];
  unbindDevice(licenseCode: string, deviceId: string): boolean;
  revokeLicense(code: string, reason?: string): boolean;
  renewLicense(code: string, additionalMonths: number): LicenseRecord | null;
  getStats(): any;
  logAudit(entry: { action: string; actor?: string; details?: string; licenseCode?: string }): any;
  getAuditLogs(options?: { limit?: number; offset?: number }): any[];
}

export declare const DEFAULT_INITIAL_PLANS: PlanRecord[];
export declare function getLicensingStore(dbPath?: string): LicensingStore;
