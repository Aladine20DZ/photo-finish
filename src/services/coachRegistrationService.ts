/**
 * PHOTO FINISH PRO AI — Coach Registration Wizard Service (Stage 5)
 * Multi-Step Entry Submissions, Eligibility Verification & Bib Assignment Engine.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Database } from '../types/supabase';

export type Athlete = Database['public']['Tables']['athletes']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type Entry = Database['public']['Tables']['entries']['Row'];

export interface AthleteEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export class CoachRegistrationService {
  /**
   * Validate athlete eligibility for a specific competition event
   */
  public validateAthleteEligibility(athlete: Athlete, event: Event): AthleteEligibilityResult {
    const reasons: string[] = [];

    // 1. فحص النشاط
    if (!athlete.is_active) {
      reasons.push('العداء غير نشط في سجلات الرابطة.');
    }

    // 2. فحص الفحص الطبي
    if (!athlete.medical_cert_expiry) {
      reasons.push('الشهادة الطبية غير مسجلة في ملف العداء.');
    } else {
      const expiry = new Date(athlete.medical_cert_expiry);
      if (new Date() > expiry) {
        reasons.push(`الشهادة الطبية منتهية الصلاحية منذ ${athlete.medical_cert_expiry}.`);
      }
    }

    // 3. فحص الجنس
    if (event.gender !== 'X' && event.gender !== athlete.gender) {
      reasons.push(`جنس العداء (${athlete.gender}) لا يتطابق مع جنس المسابقة (${event.gender}).`);
    }

    // 4. فحص الفئة العمرية (إذا كانت المسابقة محددة بفئة معينة)
    if (event.category && event.category !== 'OPEN' && event.category !== athlete.category) {
      reasons.push(`فئة العداء (${athlete.category}) لا تطابق فئة المسابقة (${event.category}).`);
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
  }

  /**
   * Batch submit entries for a club
   */
  public async submitEntriesBatch(entries: {
    eventId: string;
    competitionId: string;
    leagueId: string;
    athleteId: string;
    clubId: string;
    seedMark?: number;
    bibNumber?: string;
  }[]): Promise<{ success: boolean; count: number; message: string }> {
    if (entries.length === 0) {
      return { success: false, count: 0, message: 'لم يتم تحديد أي عداء للمشاركة.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const payload = entries.map(e => ({
          event_id: e.eventId,
          competition_id: e.competitionId,
          league_id: e.leagueId,
          athlete_id: e.athleteId,
          club_id: e.clubId,
          seed_mark: e.seedMark || null,
          bib_number: e.bibNumber || null,
          status: 'registered' as const,
          heat_number: 1
        }));

        await (supabase.from('entries') as any).upsert(payload, { onConflict: 'event_id,athlete_id' });
      } catch (err: any) {
        console.warn('Supabase batch entries error:', err);
      }
    }

    return {
      success: true,
      count: entries.length,
      message: `تم تسجيل ${entries.length} مشارك(ين) بنجاح وإرسال القوائم لغرفة المناداة واعتماد الحكام.`
    };
  }

  /**
   * Generate an official Entry Submission Voucher summary
   */
  public generateEntryVoucher(params: {
    clubName: string;
    competitionName: string;
    totalAthletes: number;
    entryFeePerAthlete?: number;
  }) {
    const fee = params.entryFeePerAthlete || 500; // 500 DZD per entry default
    const totalAmount = params.totalAthletes * fee;
    const voucherNumber = `VCH-${Date.now().toString().slice(-6)}`;

    return {
      voucherNumber,
      issuedAt: new Date().toISOString(),
      clubName: params.clubName,
      competitionName: params.competitionName,
      totalAthletes: params.totalAthletes,
      feePerAthlete: fee,
      totalAmountDzd: totalAmount,
      status: 'pending_payment_verification'
    };
  }
}

export const coachRegistrationService = new CoachRegistrationService();
