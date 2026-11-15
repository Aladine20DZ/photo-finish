/**
 * PHOTO FINISH PRO AI — Automated Tests: Stage 6
 * Device Purge & Archive Engine (مسح بيانات الحكام وتصفير المنظومة وأرشفة المنافسات)
 * 
 * Verifies:
 * 1. Successful Finish & Server-Grade Immutable Archive without database loss.
 * 2. Pre-Purge Safety Barrier: Guard against wiping when un-uploaded operations exist (blocking with warning).
 * 3. Offline Device Reconnection: Handling offline devices and executing purge upon reconnect.
 * 4. Strict Competition Isolation: Operations of different competitions are 100% unaffected.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { devicePurgeArchiveService } from '../src/services/devicePurgeArchiveService';
import { checkpointStorage } from '../src/services/checkpointStorage';
import { competitionsService } from '../src/services/competitionsService';
import { competitionsBureauService } from '../src/services/competitionsBureauService';
import { portalAuthService } from '../src/services/portalAuthService';
import { PassageEvent } from '../src/types/athletics';

describe('Stage 6: Device Purge & Archive Engine Tests', () => {
  const targetCompId = 'comp_stage6_target';
  const otherCompId = 'comp_stage6_isolated';

  beforeEach(async () => {
    // Reset service state before each test
    devicePurgeArchiveService.resetServiceState();
    checkpointStorage.resetMemoryState();
    await portalAuthService.loginLeague('saida_admin', 'Saida@2026', 'lg_saida');

    // Setup target competition
    await competitionsService.saveCompetition({
      id: targetCompId,
      name: 'بطولة الرابطة الولائية سعيدة 2026',
      date: '2026-11-15',
      venue: 'ملعب السعيد عمارة، سعيدة',
      city: 'سعيدة',
      wilayaCode: '20',
      status: 'live',
      leagueId: 'lg_saida',
      leagueName: 'الرابطة الولائية لألعاب القوى - سعيدة',
      leagueShort: 'LWAS',
      competitionType: 'track_and_field',
      eventsCount: 12,
      athletesCount: 150,
      description: 'منافسة رسمية للرابطة',
      schedule: [],
      resultsSummary: [],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Setup another competition to verify isolation
    await competitionsService.saveCompetition({
      id: otherCompId,
      name: 'بطولة الجزائر العاصمة الشتوية',
      date: '2026-12-01',
      venue: 'مركب 5 جويلية',
      city: 'الجزائر العاصمة',
      wilayaCode: '16',
      status: 'live',
      leagueId: 'lg_algiers',
      leagueName: 'رابطة ولاية الجزائر لألعاب القوى',
      leagueShort: 'LAA',
      competitionType: 'track_and_field',
      eventsCount: 8,
      athletesCount: 90,
      description: 'منافسة العاصمة المستقلة',
      schedule: [],
      resultsSummary: [],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Test 1: Successful Finish & Server-Grade Immutable Archive
  // ═════════════════════════════════════════════════════════════════════════
  it('1. successfully archives competition operations on server and purges clean judge device', async () => {
    // Seed some operations for target competition
    const p1: PassageEvent = {
      id: 'pass_t1_01',
      competitionId: targetCompId,
      checkpointId: 'cp_finish',
      checkpointCode: 'FINISH',
      lapNumber: 1,
      bibNumber: 42,
      timestamp: 1700000010,
      recordedByJudgeId: 'judge_finish_01',
      judgeName: 'حكم خط النهاية',
      deviceId: 'DEV-FINISH-01',
      source: 'quick_button',
      syncStatus: 'synced'
    };
    await checkpointStorage.recordPassage(p1);

    // Verify passage exists
    const beforePassages = await checkpointStorage.getPassagesForCompetition(targetCompId);
    expect(beforePassages).toHaveLength(1);

    // 1. Finish & Archive
    const finishRes = await devicePurgeArchiveService.finishAndArchiveCompetition(targetCompId, {
      name: 'الأستاذ أحمد - الحكم العام',
      role: 'CHIEF_JUDGE'
    });

    expect(finishRes.success).toBe(true);
    expect(finishRes.archive).toBeDefined();
    expect(finishRes.archive?.competitionId).toBe(targetCompId);
    expect(finishRes.archive?.status).toBe('archived_immutable');
    expect(finishRes.archive?.totalPassages).toBe(1);
    expect(finishRes.purgeCommand).toBeDefined();

    // Verify competition status updated to 'completed'
    const updatedComp = await competitionsService.getCompetitionById(targetCompId);
    expect(updatedComp?.status).toBe('completed');

    // 2. Execute Purge on judge device (DEV-FINISH-01 has 0 pending items)
    const purgeRes = await devicePurgeArchiveService.checkAndExecuteDevicePurge(targetCompId, {
      deviceId: 'DEV-FINISH-01',
      judgeId: 'judge_finish_01',
      judgeRole: 'finish_judge',
      judgeName: 'حكم خط النهاية'
    });

    expect(purgeRes.status).toBe('purged_successfully');
    expect(purgeRes.deletedCount).toBe(1);
    expect(purgeRes.pendingCount).toBe(0);

    // Verify target local passages are now completely wiped
    const afterPassages = await checkpointStorage.getPassagesForCompetition(targetCompId);
    expect(afterPassages).toHaveLength(0);

    // Verify device purge audit log was properly created
    const logs = devicePurgeArchiveService.getPurgeLogs(targetCompId);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const lastLog = logs[0];
    expect(lastLog.status).toBe('purged_successfully');
    expect(lastLog.deviceId).toBe('DEV-FINISH-01');
    expect(lastLog.deletedItemsCount).toBe(1);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Test 2: Guard against Purging when un-uploaded operations exist (Pre-Purge Safety Barrier)
  // ═════════════════════════════════════════════════════════════════════════
  it('2. blocks purge and displays warning when un-synced operations exist in queue', async () => {
    // Record a pending un-synced passage
    const pendingPassage: PassageEvent = {
      id: 'pass_pending_01',
      competitionId: targetCompId,
      checkpointId: 'cp_01',
      checkpointCode: 'CP1',
      lapNumber: 1,
      bibNumber: 88,
      timestamp: 1700000050,
      recordedByJudgeId: 'judge_cp1',
      judgeName: 'حكم النقطة 1',
      deviceId: 'DEV-CP1-99',
      source: 'quick_button',
      syncStatus: 'pending' // Still in local sync queue!
    };
    await checkpointStorage.recordPassage(pendingPassage);

    // Verify it is flagged in pending queue
    const unuploadedCount = await checkpointStorage.hasUnsyncedPassages(targetCompId);
    expect(unuploadedCount).toBe(1);

    // Issue finish competition command
    await devicePurgeArchiveService.finishAndArchiveCompetition(targetCompId);

    // Attempt to purge device DEV-CP1-99
    const blockedRes = await devicePurgeArchiveService.checkAndExecuteDevicePurge(targetCompId, {
      deviceId: 'DEV-CP1-99',
      judgeId: 'judge_cp1',
      judgeRole: 'checkpoint_judge',
      judgeName: 'حكم النقطة 1'
    });

    // MUST be blocked!
    expect(blockedRes.status).toBe('blocked_pending_sync');
    expect(blockedRes.pendingCount).toBe(1);
    expect(blockedRes.deletedCount).toBe(0);
    expect(blockedRes.message).toContain('تم منع مسح بيانات الجهاز');

    // Passage MUST NOT be deleted
    const stillExists = await checkpointStorage.getPassagesForCompetition(targetCompId);
    expect(stillExists).toHaveLength(1);
    expect(stillExists[0].bibNumber).toBe(88);

    // Check audit log recorded the blocked event
    const logs = devicePurgeArchiveService.getPurgeLogs(targetCompId);
    const blockedLog = logs.find(l => l.status === 'blocked_pending_sync');
    expect(blockedLog).toBeDefined();
    expect(blockedLog?.pendingItemsCount).toBe(1);

    // Now simulate successful sync/upload of the event
    await checkpointStorage.markPassagesSynced([pendingPassage.id]);
    const remainingPending = await checkpointStorage.hasUnsyncedPassages(targetCompId);
    expect(remainingPending).toBe(0);

    // Try purge again after successful upload
    const retryRes = await devicePurgeArchiveService.checkAndExecuteDevicePurge(targetCompId, {
      deviceId: 'DEV-CP1-99',
      judgeId: 'judge_cp1',
      judgeRole: 'checkpoint_judge'
    });

    // Now it succeeds cleanly!
    expect(retryRes.status).toBe('purged_successfully');
    expect(retryRes.deletedCount).toBe(1);

    const clearedPassages = await checkpointStorage.getPassagesForCompetition(targetCompId);
    expect(clearedPassages).toHaveLength(0);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Test 3: Offline Device Handling & Execution on Reconnection
  // ═════════════════════════════════════════════════════════════════════════
  it('3. handles offline devices by queuing command and executing purge upon reconnect', async () => {
    // Record synced passage on offline judge device
    const offlinePassage: PassageEvent = {
      id: 'pass_offline_01',
      competitionId: targetCompId,
      checkpointId: 'cp_callroom',
      checkpointCode: 'CALL',
      lapNumber: 1,
      bibNumber: 105,
      timestamp: 1700000090,
      recordedByJudgeId: 'judge_call',
      judgeName: 'حكم غرفة النداء',
      deviceId: 'DEV-OFFLINE-77',
      source: 'manual_entry',
      syncStatus: 'synced'
    };
    await checkpointStorage.recordPassage(offlinePassage);

    // Competition is ended while DEV-OFFLINE-77 is disconnected
    await devicePurgeArchiveService.finishAndArchiveCompetition(targetCompId);

    // Check that device is not yet marked purged
    const alreadyPurgedBefore = devicePurgeArchiveService.hasDeviceBeenPurged(targetCompId, 'DEV-OFFLINE-77');
    expect(alreadyPurgedBefore).toBe(false);

    // Device comes online and reconnects: checks and executes offline pending purges
    const reconnectRes = await devicePurgeArchiveService.processOfflinePendingPurges(targetCompId, {
      deviceId: 'DEV-OFFLINE-77',
      judgeId: 'judge_call',
      judgeRole: 'chambre_dappel',
      judgeName: 'حكم غرفة النداء'
    });

    expect(reconnectRes.processed).toBe(true);
    expect(reconnectRes.status).toBe('purged_successfully');

    // Device is now registered as purged
    const alreadyPurgedAfter = devicePurgeArchiveService.hasDeviceBeenPurged(targetCompId, 'DEV-OFFLINE-77');
    expect(alreadyPurgedAfter).toBe(true);

    // Second reconnect attempt does not duplicate work
    const secondReconnect = await devicePurgeArchiveService.processOfflinePendingPurges(targetCompId, {
      deviceId: 'DEV-OFFLINE-77'
    });
    expect(secondReconnect.processed).toBe(false);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Test 4: Strict Competition Isolation (Other competitions untouched)
  // ═════════════════════════════════════════════════════════════════════════
  it('4. strictly preserves data of other competitions during target competition purge', async () => {
    // 1. Passage in target competition
    await checkpointStorage.recordPassage({
      id: 'pass_target_comp',
      competitionId: targetCompId,
      checkpointId: 'cp_01',
      checkpointCode: 'CP1',
      lapNumber: 1,
      bibNumber: 12,
      timestamp: 1700000200,
      recordedByJudgeId: 'j_target',
      deviceId: 'DEV-SHARED-01',
      source: 'quick_button',
      syncStatus: 'synced'
    });

    // 2. Passage in OTHER competition
    await checkpointStorage.recordPassage({
      id: 'pass_other_comp',
      competitionId: otherCompId,
      checkpointId: 'cp_01',
      checkpointCode: 'CP1',
      lapNumber: 1,
      bibNumber: 999,
      timestamp: 1700000300,
      recordedByJudgeId: 'j_other',
      deviceId: 'DEV-SHARED-01',
      source: 'quick_button',
      syncStatus: 'synced'
    });

    // Verify both exist
    expect(await checkpointStorage.getPassagesForCompetition(targetCompId)).toHaveLength(1);
    expect(await checkpointStorage.getPassagesForCompetition(otherCompId)).toHaveLength(1);

    // Finish and purge TARGET competition only
    await devicePurgeArchiveService.finishAndArchiveCompetition(targetCompId);
    const purgeTargetRes = await devicePurgeArchiveService.checkAndExecuteDevicePurge(targetCompId, {
      deviceId: 'DEV-SHARED-01'
    });

    expect(purgeTargetRes.status).toBe('purged_successfully');

    // Target competition data is purged
    const targetAfter = await checkpointStorage.getPassagesForCompetition(targetCompId);
    expect(targetAfter).toHaveLength(0);

    // OTHER competition data MUST be 100% intact!
    const otherAfter = await checkpointStorage.getPassagesForCompetition(otherCompId);
    expect(otherAfter).toHaveLength(1);
    expect(otherAfter[0].id).toBe('pass_other_comp');
    expect(otherAfter[0].bibNumber).toBe(999);

    // OTHER competition status MUST still be 'live'
    const otherComp = await competitionsService.getCompetitionById(otherCompId);
    expect(otherComp?.status).toBe('live');
  });
});
