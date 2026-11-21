export interface LeagueAuthRequestResult {
  status: number;
  json: Record<string, any>;
}

export function handleLeagueAuthRequest(params: {
  pathname: string;
  method: string;
  body: any;
  clientIp?: string;
}): Promise<LeagueAuthRequestResult | null>;
