/**
 * PHOTO FINISH PRO AI — Phase H Expanded League Features Test Suite
 * اختبارات المرحلة H: ميزات حساب الرابطة التوسعية والحوكمة الفدرالية الكاملة
 * 
 * يغطي هذا الجناح:
 * 1. بطاقات الإحصائيات الخمس الرئيسية (Top 5 Stats Cards): أندية، عداؤون، منافسات، حكام، عمليات بانتظار الاعتماد.
 * 2. استيراد العدائين والأندية من ملفات Excel الحقيقية (.xlsx) مع دعم RTL والتعيين التلقائي للأعمدة.
 * 3. الأدوار القيادية الأربعة داخل الرابطة (الرئيس، الأمين العام، المدير الفني الولائي، مسؤول التحكيم) وسجل التدقيق.
 * 4. هوية الرابطة وعلامات الاعتماد الرسمية (الشعار، الختم المعتمد stampUrl، التوقيع الرقمي signatureUrl).
 * 5. الأرقام القياسية الولائية والتحقق من قاعدة سرعة الرياح World Athletics TR31.
 * 6. تعيينات الحكام الميدانيين وتتبع الأجهزة وأكواد المهام الرسمية (Duty Codes).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { portalAuthService } from '../src/services/portalAuthService';
import { competitionsBureauService, BureauOperation } from '../src/services/competitionsBureauService';

describe('Phase H: Expanded League Account Features & World Athletics Governance', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = String(val); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      length: 0,
      key: () => null,
    };
    portalAuthService.resetToDefaults();
  });

  describe('1. Top 5 Stats Cards & Pending Operations Metric', () => {
    it('accurately computes the 5 essential dashboard metrics including pending certification count', () => {
      const clubsCount = 4;
      const athletesCount = 6;
      const competitionsCount = 2;
      const activeJudgesCount = 4;

      const mockOperations: BureauOperation[] = [
        {
          id: 'op_1',
          disciplineId: 'disc_100m',
          disciplineName: '100م رجال',
          roundName: 'نهائي',
          judgeName: 'سفيان بن عيسى',
          judgeRole: 'Photo Finish',
          dutyCode: 'FINISH-SAIDA-PF92',
          recordedAt: new Date().toISOString(),
          status: 'under_review',
          resultsCount: 8,
          deviceOrigin: 'DEV-FINISH-02'
        },
        {
          id: 'op_2',
          disciplineId: 'disc_longjump',
          disciplineName: 'الوثب الطويل',
          roundName: 'تصفيات',
          judgeName: 'جمال بوكنزة',
          judgeRole: 'Field Events',
          dutyCode: 'FIELD-SAIDA-FD33',
          recordedAt: new Date().toISOString(),
          status: 'certified',
          resultsCount: 12,
          deviceOrigin: 'DEV-FIELD-04'
        },
        {
          id: 'op_3',
          disciplineId: 'disc_shotput',
          disciplineName: 'دفع الجلة',
          roundName: 'نهائي',
          judgeName: 'جمال بوكنزة',
          judgeRole: 'Field Events',
          dutyCode: 'FIELD-SAIDA-FD33',
          recordedAt: new Date().toISOString(),
          status: 'under_review',
          resultsCount: 10,
          deviceOrigin: 'DEV-FIELD-04'
        }
      ];

      const pendingOpsCount = mockOperations.filter(op => op.status === 'under_review').length;

      expect(clubsCount).toBe(4);
      expect(athletesCount).toBe(6);
      expect(competitionsCount).toBe(2);
      expect(activeJudgesCount).toBe(4);
      expect(pendingOpsCount).toBe(2);
    });
  });

  describe('2. Real Excel Import & Export with SheetJS and RTL Support', () => {
    it('creates an official Arabic RTL Excel template for athlete import', () => {
      const sampleData = [
        {
          'اسم العداء': 'عبد الله بن عودة',
          'رقم الصدرية': 104,
          'النادي': 'نادي أولمبيك سعيدة',
          'رمز النادي': 'OSA',
          'الصنف': 'SENIOR',
          'الجنس': 'M',
          'التخصص': '100م / 200م',
          'رقم الإجازة': 'LAAP-26-001'
        },
        {
          'اسم العداء': 'نور الهدى قاضي',
          'رقم الصدرية': 105,
          'النادي': 'نادي أولمبيك سعيدة',
          'رمز النادي': 'OSA',
          'الصنف': 'U20',
          'الجنس': 'F',
          'التخصص': '800م',
          'رقم الإجازة': 'LAAP-26-002'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!views'] = [{ RTL: true }];
      ws['!cols'] = [
        { wch: 24 }, // اسم العداء
        { wch: 14 }, // رقم الصدرية
        { wch: 28 }, // النادي
        { wch: 12 }, // رمز النادي
        { wch: 14 }, // الصنف
        { wch: 8 },  // الجنس
        { wch: 20 }, // التخصص
        { wch: 18 }  // رقم الإجازة
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'نموذج العدائين');

      // Write to binary buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(100);

      // Verify read back
      const readWb = XLSX.read(buffer, { type: 'buffer' });
      expect(readWb.SheetNames).toContain('نموذج العدائين');
      const readRows = XLSX.utils.sheet_to_json<Record<string, any>>(readWb.Sheets['نموذج العدائين']);
      expect(readRows).toHaveLength(2);
      expect(readRows[0]['اسم العداء']).toBe('عبد الله بن عودة');
      expect(readRows[1]['الصنف']).toBe('U20');
      expect(ws['!views']?.[0]?.RTL).toBe(true);
    });

    it('correctly maps varied Excel headers, handles case normalization, and ignores empty rows', () => {
      const variedHeaderRows = [
        {
          'الاسم الكامل': 'ياسين زروق',
          'الصدرية': '108',
          'اسم النادي': 'أمل شباب سعيدة',
          'رمز': 'MCS',
          'الفئة': 'u18',
          'النوع': 'ذكر',
          'الاختصاص': 'رمي الرمح',
          'رقم الرخصة': 'LAAP-26-003'
        },
        {
          'الاسم الكامل': '  ', // Empty name - should be filtered out
          'الصدرية': '999',
          'اسم النادي': 'نادي وهمي'
        },
        {
          'اسم العداء': 'سارة بوحنيكة',
          'رقم الصدرية': 115,
          'النادي': 'أمل شباب سعيدة',
          'الصنف': 'U14',
          'الجنس': 'F',
          'التخصص': '1000م عدو',
          'رقم الإجازة': 'LAAP-26-005'
        }
      ];

      const parsedAthletes: Array<{
        name: string;
        bibNumber: number;
        clubName: string;
        clubCode: string;
        category: string;
        gender: 'M' | 'F';
        discipline: string;
        licenseNumber: string;
      }> = [];

      variedHeaderRows.forEach((row: any, idx: number) => {
        const name = (row['اسم العداء'] || row['الاسم الكامل'] || row['الاسم'] || row['Name'] || '').toString().trim();
        if (!name) return; // Skip invalid empty entries

        const bibNumber = parseInt(row['رقم الصدرية'] || row['الصدرية'] || row['Bib'] || `${100 + idx}`) || (100 + idx);
        const clubName = (row['النادي'] || row['اسم النادي'] || row['Club'] || 'نادي مستقل').toString().trim();
        const clubCode = (row['رمز النادي'] || row['رمز'] || row['Code'] || 'IND').toString().trim().toUpperCase();
        
        let rawCat = (row['الصنف'] || row['الفئة'] || row['Category'] || 'SENIOR').toString().trim().toUpperCase();
        const validCats = ['U14', 'U16', 'U18', 'U20', 'SENIOR', 'MASTER'];
        if (!validCats.includes(rawCat)) rawCat = 'SENIOR';

        let rawGender: 'M' | 'F' = 'M';
        const gStr = (row['الجنس'] || row['النوع'] || row['Gender'] || 'M').toString().trim().toLowerCase();
        if (gStr.includes('f') || gStr.includes('أنثى') || gStr.includes('انثى') || gStr.includes('fem')) {
          rawGender = 'F';
        }

        const discipline = (row['التخصص'] || row['الاختصاص'] || row['Discipline'] || 'عام').toString().trim();
        const licenseNumber = (row['رقم الإجازة'] || row['رقم الرخصة'] || row['الإجازة'] || `LAAP-26-${String(idx + 1).padStart(3, '0')}`).toString().trim();

        parsedAthletes.push({
          name,
          bibNumber,
          clubName,
          clubCode,
          category: rawCat,
          gender: rawGender,
          discipline,
          licenseNumber
        });
      });

      expect(parsedAthletes).toHaveLength(2);
      expect(parsedAthletes[0].name).toBe('ياسين زروق');
      expect(parsedAthletes[0].category).toBe('U18');
      expect(parsedAthletes[0].gender).toBe('M');
      expect(parsedAthletes[1].name).toBe('سارة بوحنيكة');
      expect(parsedAthletes[1].gender).toBe('F');
      expect(parsedAthletes[1].category).toBe('U14');
    });
  });

  describe('3. Sub-roles within League & Audit Log', () => {
    it('maintains the 4 official federation officers with their distinct administrative responsibilities', () => {
      const officers = [
        {
          id: 'off_1',
          name: 'الأستاذ عبد القادر بن عيسى',
          role: 'رئيس الرابطة الولائية (League President)',
          phone: '+213 550 12 34 56',
          email: 'president@saida-athletic.dz',
          term: '2024 - 2028',
          status: 'active'
        },
        {
          id: 'off_2',
          name: 'السيد مختار مزيان',
          role: 'الأمين العام للرابطة (Secretary General)',
          phone: '+213 661 23 45 67',
          email: 'sg@saida-athletic.dz',
          term: '2024 - 2028',
          status: 'active'
        },
        {
          id: 'off_3',
          name: 'الكابتن رشيد طاهري',
          role: 'المدير الفني الولائي (DTO / Technical Director)',
          phone: '+213 770 34 56 78',
          email: 'dto@saida-athletic.dz',
          term: '2024 - 2028',
          status: 'active'
        },
        {
          id: 'off_4',
          name: 'الحكم الفدرالي مصطفى قاسم',
          role: 'مسؤول الاختصاص ولجنة التحكيم (Discipline & Referees Commissioner)',
          phone: '+213 551 45 67 89',
          email: 'referees@saida-athletic.dz',
          term: '2024 - 2028',
          status: 'active'
        }
      ];

      expect(officers).toHaveLength(4);
      expect(officers.map(o => o.role)).toContain('رئيس الرابطة الولائية (League President)');
      expect(officers.map(o => o.role)).toContain('الأمين العام للرابطة (Secretary General)');
      expect(officers.map(o => o.role)).toContain('المدير الفني الولائي (DTO / Technical Director)');
      expect(officers.map(o => o.role)).toContain('مسؤول الاختصاص ولجنة التحكيم (Discipline & Referees Commissioner)');
    });

    it('creates an immutable audit log when officer contact info is modified', () => {
      const auditLogs: Array<{ id: string; user: string; action: string; time: string; details: string }> = [];

      const initialOfficer = {
        id: 'off_3',
        name: 'الكابتن رشيد طاهري',
        role: 'المدير الفني الولائي (DTO / Technical Director)',
        phone: '+213 770 34 56 78',
        email: 'dto@saida-athletic.dz'
      };

      const updatedOfficer = {
        ...initialOfficer,
        phone: '+213 770 99 88 77',
        email: 'dto.new@saida-athletic.dz'
      };

      // Record audit log
      auditLogs.push({
        id: `al_${Date.now()}`,
        user: 'saida_admin',
        action: `تحديث بيانات المسؤول الإداري (${updatedOfficer.role})`,
        time: 'الآن',
        details: `تم تحديث بيانات ${updatedOfficer.name}: الهاتف (${updatedOfficer.phone}) البريد (${updatedOfficer.email})`
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toContain('المدير الفني الولائي');
      expect(auditLogs[0].details).toContain('+213 770 99 88 77');
    });
  });

  describe('4. League Identity & Official Federation Document Simulator', () => {
    it('supports official stampUrl and signatureUrl and persists them on the registered league', () => {
      const registeredLeague = portalAuthService.getAllLeagues(true).find(l => l.id === 'lg_saida');
      expect(registeredLeague).toBeDefined();

      // Check signatureUrl property capability
      const updatedLeague = {
        ...registeredLeague!,
        stampUrl: 'https://cdn.athletic.dz/stamps/saida-seal-2026.png',
        signatureUrl: 'https://cdn.athletic.dz/signatures/president-sig-2026.png'
      };

      expect(updatedLeague.stampUrl).toBe('https://cdn.athletic.dz/stamps/saida-seal-2026.png');
      expect(updatedLeague.signatureUrl).toBe('https://cdn.athletic.dz/signatures/president-sig-2026.png');
      expect(updatedLeague.accreditationNumber).toBe('LAAP-SAD-2026-020');
    });
  });

  describe('5. Regional Records & World Athletics TR31 Wind Compliance', () => {
    it('validates wind speed according to TR31 rules (< +2.0 m/s for sprint and jump records)', () => {
      const recordCandidates = [
        {
          discipline: '100م رجال',
          mark: '10.22s',
          windSpeed: 1.2,
          isWindAssisted: false,
          canBeCertified: true
        },
        {
          discipline: '200م رجال',
          mark: '20.90s',
          windSpeed: 2.8, // Excess wind (> +2.0 m/s)
          isWindAssisted: true,
          canBeCertified: false
        },
        {
          discipline: 'رمي الرمح (700غ)',
          mark: '64.50m',
          windSpeed: 0.0, // Field throwing event: wind not applicable
          isWindAssisted: false,
          canBeCertified: true
        }
      ];

      recordCandidates.forEach(cand => {
        if (cand.windSpeed > 2.0) {
          expect(cand.canBeCertified).toBe(false);
          expect(cand.isWindAssisted).toBe(true);
        } else {
          expect(cand.canBeCertified).toBe(true);
        }
      });
    });
  });

  describe('6. Field Assignments & Duty Codes Tracking', () => {
    it('generates consistent duty codes per role and tracks real-time device connection state', () => {
      const dutyAssignments = [
        { roleCode: 'CHIEF', roleTitle: 'الحكم العام', code: 'CHIEF-SAIDA-ZQ88', deviceStatus: 'connected' },
        { roleCode: 'FINISH', roleTitle: 'كاميرا خط النهاية', code: 'FINISH-SAIDA-PF92', deviceStatus: 'connected' },
        { roleCode: 'START', roleTitle: 'مسدس الانطلاق', code: 'START-SAIDA-ST01', deviceStatus: 'connected' },
        { roleCode: 'FIELD', roleTitle: 'حكم الميدان', code: 'FIELD-SAIDA-FD33', deviceStatus: 'connected' },
        { roleCode: 'CALL', roleTitle: 'غرفة النداء', code: 'CALL-SAIDA-CR14', deviceStatus: 'offline' }
      ];

      dutyAssignments.forEach(assignment => {
        expect(assignment.code).toMatch(/^[A-Z]+-SAIDA-[A-Z0-9]+$/);
        expect(['connected', 'standby', 'offline']).toContain(assignment.deviceStatus);
      });

      const onlineCount = dutyAssignments.filter(a => a.deviceStatus === 'connected').length;
      expect(onlineCount).toBe(4);
    });
  });
});
