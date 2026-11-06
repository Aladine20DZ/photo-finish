/**
 * PHOTO FINISH PRO AI — Supabase Database Types & Enums
 * TypeScript schema definitions corresponding to PostgreSQL database
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | 'super_admin'
  | 'league_admin'
  | 'chief_judge'
  | 'field_judge'
  | 'timing_operator'
  | 'club_coach'
  | 'public_viewer';

export type CompetitionType =
  | 'track_and_field'
  | 'cross_country'
  | 'road_race'
  | 'trail'
  | 'mountain_race'
  | 'indoor';

export type EventStatus =
  | 'scheduled'
  | 'call_room'
  | 'in_progress'
  | 'under_review'
  | 'official_locked'
  | 'cancelled';

export type EntryStatus =
  | 'registered'
  | 'confirmed'
  | 'scratched'
  | 'dns'
  | 'active';

export type ResultStatus = 'OK' | 'DNF' | 'DNS' | 'DQ' | 'NM';

export type LicenseTier = 'ENTX' | 'CLUB' | 'BASIC' | 'TRIAL';

export interface Database {
  public: {
    Tables: {
      leagues: {
        Row: {
          id: string;
          name: string;
          code: string;
          country_code: string;
          region: string | null;
          logo_url: string | null;
          settings: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          country_code?: string;
          region?: string | null;
          logo_url?: string | null;
          settings?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leagues']['Insert']>;
      };
      clubs: {
        Row: {
          id: string;
          league_id: string;
          name: string;
          code: string;
          city: string | null;
          wilaya: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          name: string;
          code: string;
          city?: string | null;
          wilaya?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clubs']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          league_id: string | null;
          club_id: string | null;
          full_name: string;
          role: UserRole;
          phone: string | null;
          is_verified: boolean;
          avatar_url: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          league_id?: string | null;
          club_id?: string | null;
          full_name: string;
          role?: UserRole;
          phone?: string | null;
          is_verified?: boolean;
          avatar_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      athletes: {
        Row: {
          id: string;
          league_id: string;
          club_id: string;
          first_name: string;
          last_name: string;
          normalized_name: string;
          license_number: string;
          bib_number: string | null;
          birth_date: string;
          gender: 'M' | 'F';
          category: string;
          medical_cert_expiry: string | null;
          is_active: boolean;
          pb_records: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          club_id: string;
          first_name: string;
          last_name: string;
          normalized_name: string;
          license_number: string;
          bib_number?: string | null;
          birth_date: string;
          gender: 'M' | 'F';
          category: string;
          medical_cert_expiry?: string | null;
          is_active?: boolean;
          pb_records?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['athletes']['Insert']>;
      };
      competitions: {
        Row: {
          id: string;
          league_id: string;
          name: string;
          competition_type: CompetitionType;
          venue: string;
          city: string | null;
          start_date: string;
          end_date: string;
          status: string;
          is_published: boolean;
          settings: Json;
          course_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          name: string;
          competition_type?: CompetitionType;
          venue: string;
          city?: string | null;
          start_date: string;
          end_date: string;
          status?: string;
          is_published?: boolean;
          settings?: Json;
          course_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['competitions']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          competition_id: string;
          league_id: string;
          name: string;
          event_code: string;
          gender: 'M' | 'F' | 'X';
          category: string;
          event_type: string;
          round: string;
          heat_count: number;
          scheduled_time: string | null;
          status: EventStatus;
          wind_reading: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          league_id: string;
          name: string;
          event_code: string;
          gender: 'M' | 'F' | 'X';
          category: string;
          event_type: string;
          round?: string;
          heat_count?: number;
          scheduled_time?: string | null;
          status?: EventStatus;
          wind_reading?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      entries: {
        Row: {
          id: string;
          event_id: string;
          competition_id: string;
          league_id: string;
          athlete_id: string;
          club_id: string;
          status: EntryStatus;
          heat_number: number;
          lane_number: number | null;
          bib_number: string | null;
          seed_mark: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          competition_id: string;
          league_id: string;
          athlete_id: string;
          club_id: string;
          status?: EntryStatus;
          heat_number?: number;
          lane_number?: number | null;
          bib_number?: string | null;
          seed_mark?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['entries']['Insert']>;
      };
      results: {
        Row: {
          id: string;
          event_id: string;
          competition_id: string;
          league_id: string;
          athlete_id: string;
          club_id: string;
          rank: number | null;
          time_millis: number | null;
          distance_meters: number | null;
          status: ResultStatus;
          reaction_time_millis: number | null;
          wind_reading: number | null;
          slit_scan_image_url: string | null;
          certified_by: string | null;
          certified_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          competition_id: string;
          league_id: string;
          athlete_id: string;
          club_id: string;
          rank?: number | null;
          time_millis?: number | null;
          distance_meters?: number | null;
          status?: ResultStatus;
          reaction_time_millis?: number | null;
          wind_reading?: number | null;
          slit_scan_image_url?: string | null;
          certified_by?: string | null;
          certified_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['results']['Insert']>;
      };
      field_attempts: {
        Row: {
          id: string;
          event_id: string;
          competition_id: string;
          league_id: string;
          athlete_id: string;
          attempt_number: number;
          height_or_distance: number | null;
          is_valid: boolean | null;
          wind_reading: number | null;
          judge_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          competition_id: string;
          league_id: string;
          athlete_id: string;
          attempt_number: number;
          height_or_distance?: number | null;
          is_valid?: boolean | null;
          wind_reading?: number | null;
          judge_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['field_attempts']['Insert']>;
      };
      race_passages: {
        Row: {
          id: string;
          competition_id: string;
          league_id: string;
          checkpoint_id: string;
          checkpoint_code: string;
          bib_number: string;
          athlete_id: string | null;
          timestamp_millis: number;
          device_id: string;
          judge_id: string | null;
          sync_status: string;
          anomaly_flag: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          league_id: string;
          checkpoint_id: string;
          checkpoint_code: string;
          bib_number: string;
          athlete_id?: string | null;
          timestamp_millis: number;
          device_id: string;
          judge_id?: string | null;
          sync_status?: string;
          anomaly_flag?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['race_passages']['Insert']>;
      };
      licenses: {
        Row: {
          id: string;
          league_id: string | null;
          code: string;
          tier: LicenseTier;
          device_id: string;
          is_quad_pool: boolean;
          max_shared_slots: number;
          issued_at: string;
          expires_at: string;
          is_active: boolean;
          revoked_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          league_id?: string | null;
          code: string;
          tier?: LicenseTier;
          device_id: string;
          is_quad_pool?: boolean;
          max_shared_slots?: number;
          issued_at?: string;
          expires_at: string;
          is_active?: boolean;
          revoked_at?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database['public']['Tables']['licenses']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          league_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id?: string | null;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
  };
}
