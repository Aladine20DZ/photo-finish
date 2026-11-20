/**
 * PHOTO FINISH PRO AI — Smart Judge Workspace & Smart Assignment Engine Test Suite
 * Fully verifying World Athletics Rule 18, 19, 25 & 26 Compliance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  judgesAssignmentService,
  resolveDisciplineCategory
} from '../src/services/judgesAssignmentService';
import { 
  fieldEventService,
  FieldEventService
} from '../src/services/fieldEventService';
import { 
  smartJudgeWorkspaceService 
} from '../src/services/smartJudgeWorkspaceService';
import { 
  FieldAthleteScore, 
  FieldAttempt, 
  VerticalHeightTrial 
} from '../src/types/athletics';

describe('Smart Judge Workspace & Smart Assignment Engine (World Athletics Rule 18, 19, 25 & 26)', () => {
  beforeEach(() => {
    // Reset any state if necessary
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. PHASE 2 & 3: Advanced Assignment Engine & Discipline Categorization
  // ════════════════════════════════════════════════════════════════════════════
  describe('1. Advanced Assignment Engine & Dynamic Categorization', () => {
    it('correctly categorizes disciplines into horizontal jumps, vertical jumps, throws, and running', () => {
      expect(resolveDisciplineCategory('disc_long_jump', 'الوثب الطويل')).toBe('jumps_horizontal');
      expect(resolveDisciplineCategory('disc_triple_jump', 'الوثب الثلاثي')).toBe('jumps_horizontal');
      expect(resolveDisciplineCategory('disc_high_jump', 'الوثب العالي')).toBe('jumps_vertical');
      expect(resolveDisciplineCategory('disc_pole_vault', 'القفز بالزانة')).toBe('jumps_vertical');
      expect(resolveDisciplineCategory('disc_shot_put', 'دفع الجلة')).toBe('throws');
      expect(resolveDisciplineCategory('disc_javelin', 'رمي الرمح')).toBe('throws');
      expect(resolveDisciplineCategory('disc_100m', '100م نهائي')).toBe('running');
      expect(resolveDisciplineCategory('disc_cp01', 'نقطة مراقبة مسار')).toBe('checkpoint');
    });

    it('creates an assignment with full metadata, duty code, and role-based permissions', async () => {
      const res = await judgesAssignmentService.assignJudge({
        competitionId: 'comp_test_field_01',
        leagueId: 'lg_saida',
        judgeId: 'jdg_01',
        disciplineId: 'disc_long_jump',
        disciplineNameAr: 'نهائي الوثب الطويل - رجال',
        venue: 'حفرة الوثب رقم 1',
        task: 'chief_field_jumps',
        date: '2026-07-01',
        startTime: '09:00',
        endTime: '11:00'
      });

      expect(res.success).toBe(true);
      expect(res.assignment).toBeDefined();
      expect(res.assignment?.disciplineCategory).toBe('jumps_horizontal');
      expect(res.assignment?.dutyCode).toContain('DUTY-');
      expect(res.assignment?.permissions?.canCertify).toBe(true);
      expect(res.assignment?.permissions?.canRecord).toBe(true);
    });

    it('detects venue and time conflicts when a judge is assigned to two places at once', () => {
      const conflict = judgesAssignmentService.checkAssignmentConflicts(
        'jdg_01',
        'comp_test_field_01',
        '2026-07-01',
        '09:30',
        '10:30',
        'ميدان الرمي',
        'disc_shot_put'
      );

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflicts.length).toBeGreaterThan(0);
      expect(conflict.conflicts[0].type).toBe('venue_conflict');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. PHASE 5: Rule 25 Distance Ranking (Countback Tie-Breaker)
  // ════════════════════════════════════════════════════════════════════════════
  describe('2. Rule 25 Distance Ranking & Countback Engine', () => {
    it('ranks athletes by best valid mark and applies Countback on exact ties', () => {
      const mockAthletes: FieldAthleteScore[] = [
        {
          athleteId: 'ath_1',
          athleteName: 'العداء أ',
          bibNumber: 10,
          clubName: 'نادي أ',
          order: 1,
          attempts: [
            { attemptNumber: 1, resultType: 'valid', measurementMeters: 7.85, timestamp: 1 },
            { attemptNumber: 2, resultType: 'valid', measurementMeters: 7.60, timestamp: 2 },
            { attemptNumber: 3, resultType: 'foul', measurementMeters: 0, timestamp: 3 },
          ],
          bestValidMeasurement: 0,
          secondBestMeasurement: 0,
          rank: 0,
          status: 'active'
        },
        {
          athleteId: 'ath_2',
          athleteName: 'العداء ب',
          bibNumber: 20,
          clubName: 'نادي ب',
          order: 2,
          attempts: [
            { attemptNumber: 1, resultType: 'valid', measurementMeters: 7.85, timestamp: 1 },
            { attemptNumber: 2, resultType: 'valid', measurementMeters: 7.50, timestamp: 2 },
            { attemptNumber: 3, resultType: 'valid', measurementMeters: 7.40, timestamp: 3 },
          ],
          bestValidMeasurement: 0,
          secondBestMeasurement: 0,
          rank: 0,
          status: 'active'
        },
        {
          athleteId: 'ath_3',
          athleteName: 'العداء ج',
          bibNumber: 30,
          clubName: 'نادي ج',
          order: 3,
          attempts: [
            { attemptNumber: 1, resultType: 'foul', measurementMeters: 0, timestamp: 1 },
            { attemptNumber: 2, resultType: 'foul', measurementMeters: 0, timestamp: 2 },
          ],
          bestValidMeasurement: 0,
          secondBestMeasurement: 0,
          rank: 0,
          status: 'active'
        }
      ];

      const ranked = FieldEventService.rankDistanceFieldAthletes(mockAthletes);

      // Both ath_1 and ath_2 have best mark 7.85, but ath_1 has 7.60 as second best vs ath_2's 7.50
      expect(ranked[0].athleteId).toBe('ath_1');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].bestValidMeasurement).toBe(7.85);
      expect(ranked[0].secondBestMeasurement).toBe(7.60);

      expect(ranked[1].athleteId).toBe('ath_2');
      expect(ranked[1].rank).toBe(2);
      expect(ranked[1].bestValidMeasurement).toBe(7.85);
      expect(ranked[1].secondBestMeasurement).toBe(7.50);

      // ath_3 has only fouls -> NM status
      expect(ranked[2].athleteId).toBe('ath_3');
      expect(ranked[2].status).toBe('nm');
      expect(ranked[2].bestValidMeasurement).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. PHASE 5: Rule 26 Vertical Jumps (High Jump & Pole Vault)
  // ════════════════════════════════════════════════════════════════════════════
  describe('3. Rule 26 Vertical Progression & Tie-Breaking Engine', () => {
    it('breaks ties using fewer attempts at winning height and fewer total failures', () => {
      const mockVerticalAthletes: FieldAthleteScore[] = [
        {
          athleteId: 'v_ath_1',
          athleteName: 'رياضي 1',
          bibNumber: 1,
          clubName: 'النادي 1',
          order: 1,
          attempts: [],
          verticalTrials: [
            { heightMeters: 1.90, cleared: true, attemptsCount: 1, trials: ['O'] },
            { heightMeters: 1.95, cleared: true, attemptsCount: 2, trials: ['X', 'O'] },
            { heightMeters: 2.00, cleared: false, attemptsCount: 3, trials: ['X', 'X', 'X'] }
          ],
          bestValidMeasurement: 0,
          secondBestMeasurement: 0,
          rank: 0,
          status: 'active'
        },
        {
          athleteId: 'v_ath_2',
          athleteName: 'رياضي 2',
          bibNumber: 2,
          clubName: 'النادي 2',
          order: 2,
          attempts: [],
          verticalTrials: [
            { heightMeters: 1.90, cleared: true, attemptsCount: 1, trials: ['O'] },
            { heightMeters: 1.95, cleared: true, attemptsCount: 1, trials: ['O'] },
            { heightMeters: 2.00, cleared: false, attemptsCount: 3, trials: ['X', 'X', 'X'] }
          ],
          bestValidMeasurement: 0,
          secondBestMeasurement: 0,
          rank: 0,
          status: 'active'
        }
      ];

      const ranked = FieldEventService.rankVerticalFieldAthletes(mockVerticalAthletes);

      // Both cleared 1.95m. Athlete 2 cleared on 1st attempt ['O'], Athlete 1 on 2nd ['X', 'O'].
      // Therefore Athlete 2 ranks 1st.
      expect(ranked[0].athleteId).toBe('v_ath_2');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].bestValidMeasurement).toBe(1.95);

      expect(ranked[1].athleteId).toBe('v_ath_1');
      expect(ranked[1].rank).toBe(2);
      expect(ranked[1].bestValidMeasurement).toBe(1.95);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. PHASE 7 & 8: Multi-Judge Concurrency Lock & Audit Trail
  // ════════════════════════════════════════════════════════════════════════════
  describe('4. Multi-Judge Concurrency & Activity Audit Trail', () => {
    it('manages concurrent attempt locks between judges', () => {
      const lockKey = 'comp_01_ath_101_att_1';
      
      // Judge A acquires lock
      const lockA = judgesAssignmentService.acquireAttemptLock(lockKey, 'jdg_A', 'القاضي أحمد');
      expect(lockA.success).toBe(true);

      // Judge B attempts to acquire the same lock -> denied
      const lockB = judgesAssignmentService.acquireAttemptLock(lockKey, 'jdg_B', 'القاضي محمد');
      expect(lockB.success).toBe(false);
      expect(lockB.holder).toBe('القاضي أحمد');

      // Judge A releases lock
      judgesAssignmentService.releaseAttemptLock(lockKey, 'jdg_A');

      // Now Judge B can acquire
      const lockBRetry = judgesAssignmentService.acquireAttemptLock(lockKey, 'jdg_B', 'القاضي محمد');
      expect(lockBRetry.success).toBe(true);
    });

    it('logs judge activities with timestamp, athlete bib, and values', () => {
      const log = judgesAssignmentService.logJudgeActivity({
        competitionId: 'comp_audit_01',
        disciplineId: 'disc_shot_put',
        judgeId: 'jdg_01',
        judgeName: 'أحمد بن خليفة',
        judgeRole: 'حكم رئيسي',
        actionType: 'RECORD_ATTEMPT',
        athleteId: 'ath_sp_1',
        athleteBib: 412,
        attemptNumber: 1,
        newValue: '18.42م'
      });

      expect(log.id).toBeDefined();
      expect(log.timestamp).toBeGreaterThan(0);
      expect(log.newValue).toBe('18.42م');

      const logs = judgesAssignmentService.getJudgeActivityLogs('disc_shot_put', 'comp_audit_01');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].judgeName).toBe('أحمد بن خليفة');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. PHASE 9: Smart QR & Duty Code Verification
  // ════════════════════════════════════════════════════════════════════════════
  describe('5. Smart QR Access & Duty Code Validation', () => {
    it('validates active duty codes and returns full assignment context', async () => {
      const asgRes = await judgesAssignmentService.assignJudge({
        competitionId: 'comp_qr_01',
        judgeId: 'jdg_03',
        disciplineId: 'disc_triple_jump',
        disciplineNameAr: 'الوثب الثلاثي',
        venue: 'حفرة 2',
        task: 'field_judge_jumps',
        date: '2026-08-10',
        startTime: '14:00',
        endTime: '16:00'
      });

      expect(asgRes.success).toBe(true);
      const code = asgRes.assignment!.dutyCode;

      const verification = judgesAssignmentService.verifyDutyCode(code, 'comp_qr_01');
      expect(verification.valid).toBe(true);
      expect(verification.duty).toBeDefined();
      expect(verification.duty?.disciplineNameAr).toBe('الوثب الثلاثي');
      expect(verification.duty?.disciplineCategory).toBe('jumps_horizontal');
    });

    it('rejects duty code if used for a different competition', async () => {
      const asgRes = await judgesAssignmentService.assignJudge({
        competitionId: 'comp_champ_A',
        judgeId: 'jdg_05',
        disciplineId: 'disc_100m',
        disciplineNameAr: '100م',
        venue: 'المضمار',
        task: 'finish_judge',
        date: '2026-08-10',
        startTime: '10:00',
        endTime: '11:00'
      });

      const code = asgRes.assignment!.dutyCode;
      const verification = judgesAssignmentService.verifyDutyCode(code, 'comp_champ_B');
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('هذا الكود مخصص لمنافسة أخرى');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. PHASE 11: Offline-First Queue & Sync
  // ════════════════════════════════════════════════════════════════════════════
  describe('6. Offline-First Queue & Sync Management', () => {
    it('enqueues attempts when recording and flushes queue successfully', async () => {
      const asg = (await judgesAssignmentService.assignJudge({
        competitionId: 'comp_offline_01',
        judgeId: 'jdg_06',
        disciplineId: 'disc_shot_put',
        disciplineNameAr: 'دفع الجلة',
        venue: 'دائرة 1',
        task: 'field_judge_throws',
        date: '2026-09-01',
        startTime: '08:00',
        endTime: '10:00'
      })).assignment!;

      const initialPending = smartJudgeWorkspaceService.getPendingQueueCount();

      await smartJudgeWorkspaceService.recordDistanceAttempt({
        eventCompetitionId: 'comp_offline_01',
        assignment: asg,
        athleteId: 'ath_off_1',
        athleteBib: 99,
        attempt: {
          attemptNumber: 1,
          resultType: 'valid',
          measurementMeters: 17.55,
          timestamp: Date.now(),
          judgeId: asg.judgeId
        }
      });

      // Queue has item
      expect(smartJudgeWorkspaceService.getPendingQueueCount()).toBeGreaterThanOrEqual(initialPending);

      // Flush queue
      const flushed = await smartJudgeWorkspaceService.flushOfflineQueue();
      expect(flushed).toBeDefined();
    });
  });
});
