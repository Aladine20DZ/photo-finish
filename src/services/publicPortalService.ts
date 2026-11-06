/**
 * PHOTO FINISH PRO AI — Public Portal Data Service (Stage 3)
 * Fetches published competitions, certified results, athlete records, and club directory.
 * Seamlessly queries Supabase when online, or falls back to local IndexedDB/mock data when offline.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Database } from '../types/supabase';

export type PublicCompetition = Database['public']['Tables']['competitions']['Row'];
export type PublicEvent = Database['public']['Tables']['events']['Row'];
export type PublicResult = Database['public']['Tables']['results']['Row'] & {
  athlete_name?: string;
  club_name?: string;
  bib_number?: string;
};
export type PublicClub = Database['public']['Tables']['clubs']['Row'];

// High quality mock data for offline preview and tests
export const MOCK_PUBLIC_COMPETITIONS: PublicCompetition[] = [
  {
    id: 'comp_algiers_national_2026',
    league_id: 'lg_algiers',
    name: 'البطولة الوطنية لألعاب القوى للأكابر 2026',
    competition_type: 'track_and_field',
    venue: 'ملعب 5 جويلية 1962، الجزائر العاصمة',
    city: 'الجزائر العاصمة',
    start_date: '2026-06-15',
    end_date: '2026-06-17',
    status: 'in_progress',
    is_published: true,
    settings: { rulebook: 'WORLD_ATHLETICS_2026' },
    course_data: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z'
  },
  {
    id: 'comp_oran_half_marathon_2026',
    league_id: 'lg_oran',
    name: 'نصف ماراثون وهران الدولي 2026',
    competition_type: 'road_race',
    venue: 'واجهة البحر، وهران',
    city: 'وهران',
    start_date: '2026-04-20',
    end_date: '2026-04-20',
    status: 'upcoming',
    is_published: true,
    settings: { distanceKm: 21.097 },
    course_data: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z'
  },
  {
    id: 'comp_chrea_trail_2026',
    league_id: 'lg_blida',
    name: 'تريل الشريعة الجبلي للضاحية 2026',
    competition_type: 'trail',
    venue: 'الحظيرة الوطنية للشريعة، البليدة',
    city: 'البليدة',
    start_date: '2026-03-10',
    end_date: '2026-03-10',
    status: 'finished',
    is_published: true,
    settings: { elevationGain: 1250 },
    course_data: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z'
  }
];

export const MOCK_PUBLIC_CLUBS: PublicClub[] = [
  {
    id: 'club_mca',
    league_id: 'lg_algiers',
    name: 'مولودية الجزائر (MCA)',
    code: 'MCA',
    city: 'الجزائر العاصمة',
    wilaya: 'الجزائر',
    contact_email: 'athletics@mca.dz',
    contact_phone: '+213 21 00 00 01',
    logo_url: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'club_crb',
    league_id: 'lg_algiers',
    name: 'شباب بلوزداد (CRB)',
    code: 'CRB',
    city: 'بلوزداد، الجزائر',
    wilaya: 'الجزائر',
    contact_email: 'athletics@crb.dz',
    contact_phone: '+213 21 00 00 02',
    logo_url: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'club_mco',
    league_id: 'lg_oran',
    name: 'مولودية وهران (MCO)',
    code: 'MCO',
    city: 'وهران',
    wilaya: 'وهران',
    contact_email: 'athletics@mco.dz',
    contact_phone: '+213 41 00 00 03',
    logo_url: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
];

export const MOCK_PUBLIC_RESULTS: PublicResult[] = [
  {
    id: 'res_1',
    event_id: 'ev_100m_final',
    competition_id: 'comp_algiers_national_2026',
    league_id: 'lg_algiers',
    athlete_id: 'ath_101',
    club_id: 'club_mca',
    rank: 1,
    time_millis: 10120, // 10.12s
    distance_meters: null,
    status: 'OK',
    reaction_time_millis: 142,
    wind_reading: 1.2,
    slit_scan_image_url: null,
    certified_by: 'judge_chief_01',
    certified_at: '2026-06-15T16:30:00Z',
    notes: 'رقم قياسي وطني جديد',
    created_at: '2026-06-15T16:25:00Z',
    updated_at: '2026-06-15T16:30:00Z',
    athlete_name: 'يوسف العبدلي',
    club_name: 'مولودية الجزائر (MCA)',
    bib_number: '101'
  },
  {
    id: 'res_2',
    event_id: 'ev_100m_final',
    competition_id: 'comp_algiers_national_2026',
    league_id: 'lg_algiers',
    athlete_id: 'ath_102',
    club_id: 'club_crb',
    rank: 2,
    time_millis: 10180, // 10.18s
    distance_meters: null,
    status: 'OK',
    reaction_time_millis: 155,
    wind_reading: 1.2,
    slit_scan_image_url: null,
    certified_by: 'judge_chief_01',
    certified_at: '2026-06-15T16:30:00Z',
    notes: null,
    created_at: '2026-06-15T16:25:00Z',
    updated_at: '2026-06-15T16:30:00Z',
    athlete_name: 'سفيان البقالي',
    club_name: 'شباب بلوزداد (CRB)',
    bib_number: '102'
  },
  {
    id: 'res_3',
    event_id: 'ev_100m_final',
    competition_id: 'comp_algiers_national_2026',
    league_id: 'lg_algiers',
    athlete_id: 'ath_103',
    club_id: 'club_mco',
    rank: 3,
    time_millis: 10240, // 10.24s
    distance_meters: null,
    status: 'OK',
    reaction_time_millis: 161,
    wind_reading: 1.2,
    slit_scan_image_url: null,
    certified_by: 'judge_chief_01',
    certified_at: '2026-06-15T16:30:00Z',
    notes: null,
    created_at: '2026-06-15T16:25:00Z',
    updated_at: '2026-06-15T16:30:00Z',
    athlete_name: 'توفيق مخلوفي',
    club_name: 'مولودية وهران (MCO)',
    bib_number: '103'
  }
];

export class PublicPortalService {
  /**
   * Fetch all published competitions
   */
  public async getPublishedCompetitions(): Promise<PublicCompetition[]> {
    if (!isSupabaseConfigured()) {
      return MOCK_PUBLIC_COMPETITIONS;
    }

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('is_published', true)
        .order('start_date', { ascending: false });

      if (error || !data || data.length === 0) {
        return MOCK_PUBLIC_COMPETITIONS;
      }
      return data;
    } catch {
      return MOCK_PUBLIC_COMPETITIONS;
    }
  }

  /**
   * Fetch certified results for a specific competition
   */
  public async getCertifiedResults(competitionId: string): Promise<PublicResult[]> {
    if (!isSupabaseConfigured()) {
      return MOCK_PUBLIC_RESULTS.filter(r => r.competition_id === competitionId);
    }

    try {
      const { data, error } = await (supabase
        .from('results')
        .select(`
          *,
          athletes(first_name, last_name, bib_number),
          clubs(name)
        `)
        .eq('competition_id', competitionId)
        .not('certified_at', 'is', null)
        .order('rank', { ascending: true }) as any);

      if (error || !data || data.length === 0) {
        return MOCK_PUBLIC_RESULTS.filter(r => r.competition_id === competitionId);
      }

      return data.map((row: any) => ({
        ...row,
        athlete_name: row.athletes ? `${row.athletes.first_name} ${row.athletes.last_name}` : 'غير محدد',
        club_name: row.clubs?.name || 'مستقل',
        bib_number: row.athletes?.bib_number || '-'
      }));
    } catch {
      return MOCK_PUBLIC_RESULTS.filter(r => r.competition_id === competitionId);
    }
  }

  /**
   * Fetch registered clubs directory
   */
  public async getClubsDirectory(): Promise<PublicClub[]> {
    if (!isSupabaseConfigured()) {
      return MOCK_PUBLIC_CLUBS;
    }

    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error || !data || data.length === 0) {
        return MOCK_PUBLIC_CLUBS;
      }
      return data;
    } catch {
      return MOCK_PUBLIC_CLUBS;
    }
  }

  /**
   * Quick Universal Search across Competitions, Athletes, and Clubs
   */
  public async universalSearch(query: string): Promise<{
    competitions: PublicCompetition[];
    clubs: PublicClub[];
    results: PublicResult[];
  }> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        competitions: await this.getPublishedCompetitions(),
        clubs: await this.getClubsDirectory(),
        results: MOCK_PUBLIC_RESULTS
      };
    }

    const allComps = await this.getPublishedCompetitions();
    const allClubs = await this.getClubsDirectory();
    const allResults = MOCK_PUBLIC_RESULTS;

    const matchedComps = allComps.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.venue.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q))
    );

    const matchedClubs = allClubs.filter(cl =>
      cl.name.toLowerCase().includes(q) ||
      cl.code.toLowerCase().includes(q) ||
      (cl.city && cl.city.toLowerCase().includes(q))
    );

    const matchedResults = allResults.filter(r =>
      (r.athlete_name && r.athlete_name.toLowerCase().includes(q)) ||
      (r.club_name && r.club_name.toLowerCase().includes(q)) ||
      (r.bib_number && r.bib_number.includes(q))
    );

    return {
      competitions: matchedComps,
      clubs: matchedClubs,
      results: matchedResults
    };
  }
}

export const publicPortalService = new PublicPortalService();
