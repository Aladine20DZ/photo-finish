/**
 * PHOTO FINISH PRO AI — Stage 4 Test Suite
 * Tests for:
 * 1. Unified Multi-Format Export Engine (PDF, Word, Excel)
 * 2. Arabic RTL typography, font embedding (Cairo/Amiri), and table layout
 * 3. Unified document header (league logo, competition, date, venue, discipline)
 * 4. Single-discipline vs All-disciplines export
 * 5. Competitions Bureau: Inline editing, server-side permission check, and audit trail logging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loginTestLeague } from './helpers/leagueAuthHarness';
import { unifiedExportService, UnifiedExportPayload } from '../src/services/unifiedExportService';
import { competitionsBureauService, BureauJudgeOperation } from '../src/services/competitionsBureauService';
import { portalAuthService } from '../src/services/portalAuthService';

describe('Stage 4: Competitions Bureau, Inline Editing & Unified Multi-Format Export', () => {

  const samplePayload: UnifiedExportPayload = {
    header: {
      leagueName: 'الرابطة الولائية لألعاب القوى - سعيدة',
      leagueShortName: 'SAIDA',
      accreditationNumber: 'LAAP-SAD-2026-020',
      competitionName: 'البطولة الوطنية الرسمية لألعاب القوى 2026',
      venue: 'ملعب 5 جويلية، الجزائر العاصمة',
      date: '2026-06-25',
      disciplineName: '100 متر نهائي رجال',
      category: 'أكابر رجال (Seniors)',
      windSpeed: '+1.2 m/s',
      chiefJudgeName: 'الحكم العام الفيدرالي',
      season: 'الموسم الرياضي 2026'
    },
    sections: [
      {
        disciplineId: 'disc_100m_final',
        disciplineNameAr: '100 متر نهائي كبار رجال',
        group: 'course',
        categoryNameAr: 'أكابر رجال',
        windSpeed: '+1.2 m/s',
        columns: [
          { header: 'الرتبة', key: 'rank', align: 'center' },
          { header: 'رقم الصدر', key: 'bibNumber', align: 'center' },
          { header: 'اسم العداء', key: 'athleteName', align: 'right' },
          { header: 'النادي', key: 'clubName', align: 'right' },
          { header: 'الرواق', key: 'lane', align: 'center' },
          { header: 'الزمن المسجل', key: 'mark', align: 'center' },
          { header: 'الحالة', key: 'status', align: 'center' }
        ],
        rows: [
          { rank: 1, bibNumber: 101, athleteName: 'يوسف العبدلي', clubName: 'مولودية الجزائر', lane: 4, mark: '09.96s', status: 'أنهى السباق' },
          { rank: 2, bibNumber: 102, athleteName: 'سفيان البقالي', clubName: 'وفاق سطيف', lane: 5, mark: '10.08s', status: 'أنهى السباق' }
        ]
      }
    ]
  };

  describe('1. PDF Export Format with Cairo/Amiri Font & RTL Direction', () => {
    it('generates high-definition HTML for PDF with self-hosted Cairo fonts (offline-first, zero CDN)', () => {
      const html = unifiedExportService.generatePrintableHtml(samplePayload);
      expect(html).toContain('/fonts/cairo-arabic.woff2');
      expect(html).toContain('@font-face');
      expect(html).not.toContain('fonts.googleapis.com');
      expect(html).toContain("font-family: 'Cairo', 'Amiri'");
    });

    it('enforces strict right-to-left layout and Arabic language declaration', () => {
      const html = unifiedExportService.generatePrintableHtml(samplePayload);
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('lang="ar"');
      expect(html).toContain('direction: rtl');
      expect(html).toContain('text-align: right');
    });

    it('embeds unified official header with league, competition, venue, and WA standards', () => {
      const html = unifiedExportService.generatePrintableHtml(samplePayload);
      expect(html).toContain('الرابطة الولائية لألعاب القوى - سعيدة');
      expect(html).toContain('البطولة الوطنية الرسمية لألعاب القوى 2026');
      expect(html).toContain('ملعب 5 جويلية، الجزائر العاصمة');
      expect(html).toContain('World Athletics');
      expect(html).toContain('100 متر نهائي كبار رجال');
      expect(html).toContain('الحكم العام (الاعتماد الرسمي)');
    });
  });

  describe('2. Word (.doc) Package Export with Native RTL & Office Tags', () => {
    it('generates Word-compatible XML/HTML document with RTL WordSection and Cairo font', () => {
      const wordDoc = unifiedExportService.generateWordDocument(samplePayload);
      expect(wordDoc).toContain('xmlns:w="urn:schemas-microsoft-com:office:word"');
      expect(wordDoc).toContain('dir="rtl"');
      expect(wordDoc).toContain("font-family: 'Cairo'");
      expect(wordDoc).toContain('الرابطة الولائية لألعاب القوى - سعيدة');
      expect(wordDoc).toContain('يوسف العبدلي');
      expect(wordDoc).toContain('09.96s');
    });

    it('maintains proper table structure and cell borders in Word export', () => {
      const wordDoc = unifiedExportService.generateWordDocument(samplePayload);
      expect(wordDoc).toContain('<table');
      expect(wordDoc).toContain('border: 1pt solid #CBD5E1');
      expect(wordDoc).toContain('mso-header-margin');
    });
  });

  describe('3. Excel (.xml SpreadsheetML) Export with Native ss:RightToLeft="1"', () => {
    it('generates SpreadsheetML workbook with native RightToLeft attribute on worksheets', () => {
      const xml = unifiedExportService.generateExcelXml(samplePayload);
      expect(xml).toContain('xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
      expect(xml).toContain('ss:RightToLeft="1"');
      expect(xml).toContain('ss:ReadingOrder="RightToLeft"');
    });

    it('formats column styles with Cairo font and official headers', () => {
      const xml = unifiedExportService.generateExcelXml(samplePayload);
      expect(xml).toContain('ss:FontName="Cairo"');
      expect(xml).toContain('البطولة الوطنية الرسمية لألعاب القوى 2026');
      expect(xml).toContain('يوسف العبدلي');
      expect(xml).toContain('101');
    });
  });

  describe('4. Single Discipline vs All Disciplines Export Handling', () => {
    it('supports batch export for all disciplines across the competition', async () => {
      const disciplines = await competitionsBureauService.getCompetitionDisciplinesWithOperations('comp_nat_01');
      expect(disciplines.length).toBeGreaterThanOrEqual(2);

      const allSections = competitionsBureauService.buildExportSections(disciplines);
      expect(allSections.length).toBe(disciplines.length);

      const payload: UnifiedExportPayload = {
        header: unifiedExportService.getDefaultHeader('البطولة الشاملة', 'ملعب 5 جويلية', '2026'),
        sections: allSections
      };

      const html = unifiedExportService.generatePrintableHtml(payload);
      disciplines.forEach(d => {
        expect(html).toContain(d.nameAr);
      });
    });

    it('supports isolated export for a single selected discipline', async () => {
      const disciplines = await competitionsBureauService.getCompetitionDisciplinesWithOperations('comp_nat_01');
      const targetDiscId = 'disc_100m_final';
      const singleSection = competitionsBureauService.buildExportSections(disciplines, targetDiscId);
      
      expect(singleSection.length).toBe(1);
      expect(singleSection[0].disciplineId).toBe(targetDiscId);
    });
  });

  describe('5. Competitions Bureau: Inline Editing, Permission Check & Audit Trail', () => {
    beforeEach(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    });

    it('rejects inline edits when user role is unauthorized', async () => {
      const res = await competitionsBureauService.updateOperationInline(
        'comp_nat_01',
        'disc_100m_final',
        'op_100m_1',
        { mark: '09.88s' },
        { name: 'مجهول', role: 'SPECTATOR' }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('خطأ في الصلاحيات');
    });

    it('allows inline edits when user role is LEAGUE_ADMIN or SUPER_ADMIN', async () => {
      const auth = await loginTestLeague();
      const res = await competitionsBureauService.updateOperationInline(
        'comp_nat_01',
        'disc_100m_final',
        'op_100m_1',
        { mark: '09.92s', rank: 1 },
        { name: 'أمين الرابطة', role: 'LEAGUE_ADMIN', token: auth.session?.token },
        'تصحيح فوتوفينيش نهائي'
      );

      expect(res.success).toBe(true);
      expect(res.updatedOperation?.mark).toBe('09.92s');
    });

    it('records an audit trail entry logging who, when, old value, and new value', async () => {
      const auth = await loginTestLeague();
      await competitionsBureauService.updateOperationInline(
        'comp_nat_01',
        'disc_100m_final',
        'op_100m_2',
        { mark: '10.02s' },
        { name: 'الحكم العام مصطفى', role: 'CHIEF_JUDGE', token: auth.session?.token },
        'اعتماد طعن تقني'
      );

      const logs = competitionsBureauService.getAuditLog('comp_nat_01', 'disc_100m_final');
      expect(logs.length).toBeGreaterThan(0);

      const entry = logs.find(l => l.operationId === 'op_100m_2');
      expect(entry).toBeDefined();
      expect(entry?.modifiedBy).toBe('الحكم العام مصطفى');
      expect(entry?.fieldName).toBe('mark');
      expect(entry?.oldValue).toBe('10.08s');
      expect(entry?.newValue).toBe('10.02s');
      expect(entry?.reason).toBe('اعتماد طعن تقني');
      expect(entry?.modifiedAt).toBeDefined();
    });
  });

});
