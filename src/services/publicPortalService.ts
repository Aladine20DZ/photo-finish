/**
 * PHOTO FINISH PRO AI — Public Portal Data Service (Stage 3)
 * Fetches published competitions, certified results, athlete records, and club directory.
 * Seamlessly queries Supabase when online, or falls back to local storage (Saïda League & Clubs) when offline.
 * Cleaned: All mock/demo data removed — starts 100% empty for production integrity.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Database } from '../types/supabase';
import { athleteClubStorage } from './athleteClubStorage';

export type PublicCompetition = Database['public']['Tables']['competitions']['Row'];
export type PublicEvent = Database['public']['Tables']['events']['Row'];
export type PublicResult = Database['public']['Tables']['results']['Row'] & {
  athlete_name?: string;
  club_name?: string;
  bib_number?: string;
};
export type PublicClub = Database['public']['Tables']['clubs']['Row'];

// Production Clean: Zero mock data
export const MOCK_PUBLIC_COMPETITIONS: PublicCompetition[] = [];
export const MOCK_PUBLIC_CLUBS: PublicClub[] = [];
export const MOCK_PUBLIC_RESULTS: PublicResult[] = [];

export class PublicPortalService {
  /**
   * Fetch all published competitions
   */
  public async getPublishedCompetitions(): Promise<PublicCompetition[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('competitions')
          .select('*')
          .eq('is_published', true)
          .order('start_date', { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch {
        // Fall back to local
      }
    }

    // Fall back to local storage for Saïda League competitions
    try {
      const stored = localStorage.getItem('pfp_league_competitions_saida');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((c: any) => ({
            id: c.id || `comp_${Date.now()}`,
            league_id: c.league_id || 'lg_saida',
            name: c.name || 'بطولة ألعاب القوى',
            competition_type: c.competition_type || 'track_and_field',
            venue: c.venue || 'المضمار الولائي',
            city: c.city || 'سعيدة',
            start_date: c.start_date || new Date().toISOString().split('T')[0],
            end_date: c.end_date || c.start_date || new Date().toISOString().split('T')[0],
            status: c.status || 'upcoming',
            is_published: c.is_published ?? true,
            settings: c.settings || {},
            course_data: c.course_data || null,
            created_at: c.created_at || new Date().toISOString(),
            updated_at: c.updated_at || new Date().toISOString()
          }));
        }
      }
    } catch {}

    return [];
  }

  /**
   * Fetch certified results for a specific competition
   */
  public async getCertifiedResults(competitionId: string): Promise<PublicResult[]> {
    if (isSupabaseConfigured()) {
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

        if (!error && data && data.length > 0) {
          return data.map((row: any) => ({
            ...row,
            athlete_name: row.athletes ? `${row.athletes.first_name} ${row.athletes.last_name}` : 'غير محدد',
            club_name: row.clubs?.name || 'مستقل',
            bib_number: row.athletes?.bib_number || '-'
          }));
        }
      } catch {}
    }

    return [];
  }

  /**
   * Fetch registered clubs directory
   */
  public async getClubsDirectory(): Promise<PublicClub[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch {}
    }

    // Fall back to local clubs
    try {
      const localClubs = await athleteClubStorage.getAllClubs();
      if (localClubs && localClubs.length > 0) {
        return localClubs.map((c: any) => ({
          id: c.id,
          league_id: c.wilayaCode === '20' ? 'lg_saida' : `lg_${c.wilayaCode}`,
          name: c.name,
          code: c.code,
          city: c.city,
          wilaya: c.wilayaName,
          contact_email: c.email || null,
          contact_phone: c.phone || null,
          logo_url: null,
          is_active: c.isActive,
          created_at: new Date(c.createdAt).toISOString(),
          updated_at: new Date(c.updatedAt).toISOString()
        }));
      }
    } catch {}

    return [];
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
    const allComps = await this.getPublishedCompetitions();
    const allClubs = await this.getClubsDirectory();
    const allResults: PublicResult[] = [];

    if (!q) {
      return {
        competitions: allComps,
        clubs: allClubs,
        results: allResults
      };
    }

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
