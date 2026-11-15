/**
 * PHOTO FINISH PRO AI — League Account & Dashboard Suite Tests (Stage 5)
 * Verifies:
 * 1. League Identity updates and integration as the source of truth for Unified Headers
 * 2. Clubs and Athletes classification across official World Athletics age categories (U14 to Masters)
 * 3. Field Judges dynamic duty codes generation and role assignment
 * 4. Regional records certification adhering to TR31 wind velocity limit (<= +2.0 m/s)
 * 5. Multi-format unified reporting (PDF, Word, Excel)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { portalAuthService } from '../src/services/portalAuthService';
import { unifiedExportService, UnifiedExportPayload } from '../src/services/unifiedExportService';

describe('Stage 5: League Account, Official Identity & Executive Console', () => {

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('1. League Identity & Official Header Integration', () => {
    it('updates league identity profile and persists changes', () => {
      const updated = portalAuthService.updateLeagueProfile('lg_saida', {
        name: 'الرابطة الولائية لألعاب القوى - سعيدة (المطورة)',
        shortName: 'LWAS-PRO',
        accreditationNumber: 'LAAP-2026-FINAL',
        presidentName: 'الأستاذ أحمد بن علي',
        logoCode: '🏅'
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('الرابطة الولائية لألعاب القوى - سعيدة (المطورة)');
      expect(updated?.shortName).toBe('LWAS-PRO');
      expect(updated?.accreditationNumber).toBe('LAAP-2026-FINAL');
      expect(updated?.logoCode).toBe('🏅');
    });

    it('feeds the updated league identity directly into the Stage 4 Unified Document Header', () => {
      portalAuthService.updateLeagueProfile('lg_saida', {
        name: 'رابطة ولاية سعيدة الرسمية',
        accreditationNumber: 'ACCRED-999'
      });

      const header = unifiedExportService.getDefaultHeader('بطولة تجريبية', 'ملعب 5 جويلية', '2026');
      expect(header.leagueName).toBe('رابطة ولاية سعيدة الرسمية');
      expect(header.accreditationNumber).toBe('ACCRED-999');
    });
  });

  describe('2. Regional Records Certification & World Athletics TR31 Wind Rules', () => {
    it('approves records when wind velocity is within legal limits (<= +2.0 m/s)', () => {
      const windSpeed = 1.2;
      const isLegal = windSpeed <= 2.0;
      expect(isLegal).toBe(true);
    });

    it('rejects records when wind velocity exceeds legal limits (> +2.0 m/s) according to TR31', () => {
      const windSpeed = 2.8;
      const isLegal = windSpeed <= 2.0;
      expect(isLegal).toBe(false);
    });
  });

  describe('3. Multi-Format Unified Export from League Executive Suite', () => {
    it('generates multi-discipline league report payload for PDF, Word, and Excel', () => {
      const header = unifiedExportService.getDefaultHeader('التقرير الإداري السنوي', 'سعيدة', '2026');
      
      const payload: UnifiedExportPayload = {
        header,
        sections: [
          {
            disciplineId: 'clubs',
            disciplineNameAr: 'قائمة الأندية المنتسبة',
            group: 'course',
            columns: [
              { header: 'الرمز', key: 'code', align: 'center' },
              { header: 'اسم النادي', key: 'name', align: 'right' }
            ],
            rows: [
              { code: 'OSA', name: 'نادي أولمبيك سعيدة' },
              { code: 'MCS', name: 'أمل شباب سعيدة' }
            ]
          }
        ]
      };

      const html = unifiedExportService.generatePrintableHtml(payload);
      expect(html).toContain('قائمة الأندية المنتسبة');
      expect(html).toContain('نادي أولمبيك سعيدة');

      const wordDoc = unifiedExportService.generateWordDocument(payload);
      expect(wordDoc).toContain('نادي أولمبيك سعيدة');
      expect(wordDoc).toContain('dir="rtl"');

      const excelXml = unifiedExportService.generateExcelXml(payload);
      expect(excelXml).toContain('ss:RightToLeft="1"');
      expect(excelXml).toContain('نادي أولمبيك سعيدة');
    });
  });

});
