export interface LicensingRequestOptions {
  pathname: string;
  searchParams?: URLSearchParams;
  method?: string;
  body?: any;
  authHeader?: string;
  clientIp?: string;
}

export interface LicensingResponse {
  status: number;
  json: any;
}

export function handleLicensingRequest(options: LicensingRequestOptions): Promise<LicensingResponse | null>;
