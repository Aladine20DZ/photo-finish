import { describe, it, expect } from 'vitest';
import { coachRegistrationService, Athlete, Event } from '../src/services/coachRegistrationService';

describe('Stage 5: Coach Registration Wizard & Eligibility Validation', () => {
  const mockEvent100mSeniorMen: Event = {
    id: 'ev_100m_sm',
    competition_id: 'comp_nat_2026',
    league_id: 'lg_algiers',
    name: '100m Senior Men',
    event_code: '100M_SM',
    gender: 'M',
    category: 'SENIOR',
    event_type: 'sprint',
    round: 'final',
    heat_count: 2,
    scheduled_time: '2026-06-15T10:00:00Z',
    status: 'scheduled',
    wind_reading: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  };

  const validAthlete: Athlete = {
    id: 'ath_valid',
    league_id: 'lg_algiers',
    club_id: 'club_mca',
    first_name: 'يوسف',
    last_name: 'العبدلي',
    normalized_name: 'يوسف العبدلي',
    license_number: 'ALG-2026-001',
    bib_number: '101',
    birth_date: '2001-05-14',
    gender: 'M',
    category: 'SENIOR',
    medical_cert_expiry: '2026-12-31',
    is_active: true,
    pb_records: {},
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  };

  const athleteExpiredMedical: Athlete = {
    ...validAthlete,
    id: 'ath_expired_med',
    medical_cert_expiry: '2025-01-01' // منتهية الصلاحية
  };

  const athleteMismatchedGender: Athlete = {
    ...validAthlete,
    id: 'ath_female',
    gender: 'F'
  };

  it('validates a compliant athlete as eligible', () => {
    const res = coachRegistrationService.validateAthleteEligibility(validAthlete, mockEvent100mSeniorMen);
    expect(res.eligible).toBe(true);
    expect(res.reasons.length).toBe(0);
  });

  it('rejects an athlete with expired medical certification', () => {
    const res = coachRegistrationService.validateAthleteEligibility(athleteExpiredMedical, mockEvent100mSeniorMen);
    expect(res.eligible).toBe(false);
    expect(res.reasons.some(r => r.includes('الشهادة الطبية'))).toBe(true);
  });

  it('rejects an athlete with mismatched gender', () => {
    const res = coachRegistrationService.validateAthleteEligibility(athleteMismatchedGender, mockEvent100mSeniorMen);
    expect(res.eligible).toBe(false);
    expect(res.reasons.some(r => r.includes('جنس العداء'))).toBe(true);
  });

  it('submits batch entries and generates valid participation vouchers', async () => {
    const entries = [
      {
        eventId: mockEvent100mSeniorMen.id,
        competitionId: mockEvent100mSeniorMen.competition_id,
        leagueId: mockEvent100mSeniorMen.league_id,
        athleteId: validAthlete.id,
        clubId: validAthlete.club_id,
        seedMark: 10.12,
        bibNumber: '101'
      }
    ];

    const submitRes = await coachRegistrationService.submitEntriesBatch(entries);
    expect(submitRes.success).toBe(true);
    expect(submitRes.count).toBe(1);

    const voucher = coachRegistrationService.generateEntryVoucher({
      clubName: 'مولودية الجزائر (MCA)',
      competitionName: 'البطولة الوطنية 2026',
      totalAthletes: 1,
      entryFeePerAthlete: 500
    });

    expect(voucher.voucherNumber.startsWith('VCH-')).toBe(true);
    expect(voucher.totalAmountDzd).toBe(500);
  });
});
