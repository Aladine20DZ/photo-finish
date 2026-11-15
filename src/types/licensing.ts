/**
 * Photo Finish Pro — نماذج بيانات منظومة الباقات والتراخيص Enterprise
 * ==============================================================================
 */

export type LicenseTierCode = 'CLB8' | 'ENTX';
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended';

export interface LicensingPlan {
  id: string;
  name: string;
  description: string;
  laneCount: number;
  durationMonths: number;
  durationLabel: string;
  priceDZD: number;
  priceEUR: number;
  priceUSD: number;
  features: string[];
  badge?: string;
  tierCode: LicenseTierCode;
  maxDevices: number;
  isQuadPool: boolean;
  isActive: boolean;
  isRecommended: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LicensingRecord {
  code: string;
  planId?: string | null;
  tier: LicenseTierCode;
  tierName: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  deviceId: string;
  expiryDate: string;
  maxDevices: number;
  isQuadPool: boolean;
  status: LicenseStatus;
  createdAt: number;
  activatedAt?: number | null;
  revokedAt?: number | null;
  transferredTo?: string | null;
  notes?: string;
}

export interface LicensingActivation {
  id: string;
  licenseCode: string;
  deviceId: string;
  deviceName?: string;
  platform?: string;
  ipAddress?: string;
  activatedAt: number;
  lastSeenAt: number;
  isActive: boolean;
}

export interface LicensingRenewal {
  id: string;
  licenseCode: string;
  oldExpiryDate: string;
  newExpiryDate: string;
  extendedMonths: number;
  renewedBy: string;
  renewedAt: number;
}

export interface LicensingTransfer {
  voucherCode: string;
  originalCode: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  tier: string;
  transferredAt: number;
  revocationProof?: string;
  status: string;
}

export interface LicensingAuditLog {
  id: string;
  licenseCode?: string;
  action: string;
  actor: string;
  details: string;
  createdAt: number;
}

export interface LicensingStats {
  total: number;
  active: number;
  expired: number;
  revoked: number;
  totalDevices: number;
}
