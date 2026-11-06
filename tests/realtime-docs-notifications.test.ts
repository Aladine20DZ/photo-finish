import { describe, it, expect } from 'vitest';
import { realtimeBroadcastService, RaceBroadcastEvent } from '../src/services/realtimeBroadcastService';
import { documentGeneratorService, CertificateData, ResultsProtocolData } from '../src/services/documentGeneratorService';

describe('Stage 7: Realtime Channels, Document Generation & Notifications', () => {
  describe('Realtime Channels & Event Broadcast', () => {
    it('formats and dispatches a valid broadcast event structure', async () => {
      const mockEvent: RaceBroadcastEvent = {
        type: 'RUNNER_FINISHED',
        competitionId: 'comp_algiers_2026',
        senderDeviceId: 'phone_finish_01',
        timestamp: Date.now(),
        payload: { bib: '101', lane: 1, timeMillis: 10120 }
      };

      const res = await realtimeBroadcastService.broadcastEvent(mockEvent);
      expect(res.success).toBe(true);
    });

    it('subscribes and unregisters realtime competition listener without error', () => {
      const unsubscribe = realtimeBroadcastService.subscribeToCompetition('comp_test', () => {});
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Official Document & Certificate Generation', () => {
    it('generates a complete Print-Ready HTML Diploma of Merit', () => {
      const certData: CertificateData = {
        athleteName: 'يوسف العبدلي',
        clubName: 'مولودية الجزائر (MCA)',
        competitionName: 'البطولة الوطنية لألعاب القوى 2026',
        eventName: 'نهائي 100م رجال',
        rank: 1,
        markText: '10.12s',
        date: '2026-06-15',
        venue: 'ملعب 5 جويلية، الجزائر العاصمة',
        certificateNumber: 'CERT-2026-001'
      };

      const html = documentGeneratorService.generateDiplomaHtml(certData);
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('شهادة تتويج وتقدير');
      expect(html).toContain('يوسف العبدلي');
      expect(html).toContain('مولودية الجزائر (MCA)');
      expect(html).toContain('10.12s');
      expect(html).toContain('🥇');
      expect(html).toContain('CERT-2026-001');
    });

    it('generates an official World Athletics Rule 8 Results Protocol', () => {
      const protocolData: ResultsProtocolData = {
        competitionName: 'البطولة الوطنية 2026',
        eventName: '100م رجال',
        category: 'أكابر',
        venue: 'ملعب 5 جويلية',
        date: '2026-06-15',
        chiefJudgeName: 'أحمد بن علي',
        timingOperatorName: 'سمير قادري',
        rows: [
          { rank: 1, bib: '101', athleteName: 'يوسف العبدلي', club: 'MCA', timeOrMark: '10.12s', reactionTime: '142ms' },
          { rank: 2, bib: '102', athleteName: 'سفيان البقالي', club: 'CRB', timeOrMark: '10.18s', reactionTime: '155ms' }
        ]
      };

      const protocolHtml = documentGeneratorService.generateResultsProtocolHtml(protocolData);
      expect(protocolHtml).toContain('World Athletics Rule 8');
      expect(protocolHtml).toContain('يوسف العبدلي');
      expect(protocolHtml).toContain('10.12s');
      expect(protocolHtml).toContain('أحمد بن علي');
      expect(protocolHtml).toContain('سمير قادري');
    });
  });
});
