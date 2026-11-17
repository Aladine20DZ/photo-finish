import { describe, it, expect, beforeEach } from 'vitest';
import { 
  digitalResultSheetsService, 
  ResultSheetRow 
} from '../src/services/digitalResultSheetsService';

describe('Digital Competition Result Sheets Suite (FAA & LWAS Standards)', () => {
  beforeEach(() => {
    digitalResultSheetsService.init();
  });

  // 1. اختبار الترويسة الموحدة
  it('builds official unified header with FAA & LWAS identity and bilingual metadata', () => {
    const header = digitalResultSheetsService.buildOfficialHeader({
      competitionName: 'البطولة الولائية لألعاب القوى - سعيدة 2026',
      venue: 'مضمار 13 أفريل سعيدة',
      discipline: '100m Hommes',
      disciplineCode: '100M',
      category: 'SENIOR',
      gender: 'M'
    });

    expect(header.federationNameFr).toBe('Fédération Algérienne d’Athlétisme');
    expect(header.federationNameAr).toBe('الاتحاد الجزائري لألعاب القوى');
    expect(header.leagueNameFr).toBe('Ligue Wilaya d’Athlétisme de Saïda');
    expect(header.wilayaCode).toBe('20');
    expect(header.disciplineCode).toBe('100M');
    expect(header.competitionName).toContain('سعيدة');
    expect(header.extractedAt).toBeDefined();
  });

  // 2. نموذج سباقات المضمار COURSES
  it('creates track race sheet matching Liste Final COURSES.docx and ranks by fastest time', async () => {
    const sheet = await digitalResultSheetsService.createOrGetSheet({
      competitionId: 'comp_test_track_01',
      disciplineCode: '100M',
      category: 'SENIOR',
      gender: 'M',
      sheetType: 'courses'
    });

    expect(sheet.sheetType).toBe('courses');
    expect(sheet.disciplineType).toBe('track');
    expect(sheet.rows.length).toBeGreaterThan(0);

    // التحقق من الأعمدة الأساسية للنموذج المرجعي: No, Nom, Prénom, D.N, Club, CW, PRE, CLS
    const firstRow = sheet.rows[0];
    expect(firstRow).toHaveProperty('no');
    expect(firstRow).toHaveProperty('nom');
    expect(firstRow).toHaveProperty('prenom');
    expect(firstRow).toHaveProperty('dn');
    expect(firstRow).toHaveProperty('club');
    expect(firstRow).toHaveProperty('cw');
    expect(firstRow).toHaveProperty('pre');
    expect(firstRow).toHaveProperty('cls');

    // محاكاة إدخال أزمنة مختلفة للعدائين واحتساب الترتيب
    const sampleRows: ResultSheetRow[] = [
      { id: 'r1', no: 101, nom: 'AL-ABDALI', prenom: 'Youssef', dn: '2001-04-15', club: 'MCA', cw: '16', pre: '10.45s', cls: 0, status: 'valid' },
      { id: 'r2', no: 102, nom: 'BARSHIM', prenom: 'Moutaz', dn: '2000-03-12', club: 'OSA', cw: '20', pre: '10.22s', cls: 0, status: 'valid' },
      { id: 'r3', no: 103, nom: 'KASMI', prenom: 'Hamza', dn: '2003-11-05', club: 'MCS', cw: '20', pre: '10.35s', cls: 0, status: 'valid' },
      { id: 'r4', no: 104, nom: 'BENALI', prenom: 'Ahmed', dn: '1999-02-10', club: 'WSA', cw: '20', pre: '', cls: 0, status: 'dns' },
      { id: 'r5', no: 105, nom: 'DAHMANI', prenom: 'Sofiane', dn: '2002-08-01', club: 'OSA', cw: '20', pre: '', cls: 0, status: 'dnf' }
    ];

    const ranked = digitalResultSheetsService.calculateTrackRankings(sampleRows);

    // الأول يجب أن يكون صاحب 10.22s (BARSHIM)
    expect(ranked[0].nom).toBe('BARSHIM');
    expect(ranked[0].cls).toBe(1);

    // الثاني صاحب 10.35s (KASMI)
    expect(ranked[1].nom).toBe('KASMI');
    expect(ranked[1].cls).toBe(2);

    // الثالث صاحب 10.45s (AL-ABDALI)
    expect(ranked[2].nom).toBe('AL-ABDALI');
    expect(ranked[2].cls).toBe(3);

    // DNS و DNF في الذيل
    const dnsRow = ranked.find(r => r.nom === 'BENALI');
    expect(dnsRow?.cls).toBe('DNS');

    const dnfRow = ranked.find(r => r.nom === 'DAHMANI');
    expect(dnfRow?.cls).toBe('DNF');
  });

  // 3. نموذج مسابقات الميدان CONCOUR (6 محاولات وكسر التعادل WA Rule 25)
  it('creates field event sheet matching Liste Final CONCOUR.docx with 6 trials and Rule 25 tie-breaking', async () => {
    const sheet = await digitalResultSheetsService.createOrGetSheet({
      competitionId: 'comp_test_field_01',
      disciplineCode: 'LJ', // Long Jump
      category: 'SENIOR',
      gender: 'M',
      sheetType: 'concour'
    });

    expect(sheet.sheetType).toBe('concour');
    expect(sheet.disciplineType).toBe('field');

    // إعداد محاولات لمتسابقين بينهم حالة تعادل دقيقة
    // المتسابق A و B لديهما نفس أفضل رقم (8.25م)، لكن المتسابق A محاولته الثانية 8.14م والمتسابق B محاولته الثانية 8.10م
    const testFieldRows: ResultSheetRow[] = [
      {
        id: 'f1',
        no: 412,
        nom: 'BOUHANOUN',
        prenom: 'Hicham',
        dn: '2000-01-10',
        club: 'MCA',
        cw: '16',
        essais: ['7.92', 'X', '8.14', '8.05', '-', '8.25'],
        mPerf: '',
        cls: 0,
        status: 'valid'
      },
      {
        id: 'f2',
        no: 415,
        nom: 'ZOUAOUI',
        prenom: 'Yassine',
        dn: '2001-05-20',
        club: 'OSA',
        cw: '20',
        essais: ['8.02', '8.25', 'X', '8.10', '8.08', 'X'],
        mPerf: '',
        cls: 0,
        status: 'valid'
      },
      {
        id: 'f3',
        no: 420,
        nom: 'BELHADJ',
        prenom: 'Ramzi',
        dn: '2002-09-15',
        club: 'MCS',
        cw: '20',
        essais: ['7.75', '7.85', '7.90', 'X', '7.82', '7.88'],
        mPerf: '',
        cls: 0,
        status: 'valid'
      },
      {
        id: 'f4',
        no: 425,
        nom: 'ALL_FOULS',
        prenom: 'Karim',
        dn: '2003-04-12',
        club: 'WSA',
        cw: '20',
        essais: ['X', 'X', 'X', 'X', 'X', 'X'],
        mPerf: '',
        cls: 0,
        status: 'valid'
      }
    ];

    const ranked = digitalResultSheetsService.calculateFieldPerformanceAndRankings(testFieldRows);

    // المتسابق A (BOUHANOUN) يفوز بالمركز الأول بفضل كسر التعادل بالمحاولة الثانية (8.14 vs 8.10)
    expect(ranked[0].nom).toBe('BOUHANOUN');
    expect(ranked[0].mPerf).toBe('8.25');
    expect(ranked[0].secondBest).toBe(8.14);
    expect(ranked[0].cls).toBe(1);

    // المتسابق B (ZOUAOUI) المركز الثاني
    expect(ranked[1].nom).toBe('ZOUAOUI');
    expect(ranked[1].mPerf).toBe('8.25');
    expect(ranked[1].secondBest).toBe(8.10);
    expect(ranked[1].cls).toBe(2);

    // المتسابق C (BELHADJ) المركز الثالث (7.90م)
    expect(ranked[2].nom).toBe('BELHADJ');
    expect(ranked[2].mPerf).toBe('7.90');
    expect(ranked[2].cls).toBe(3);

    // المتسابق صاحب المحاولات الفاشلة كلها يحصل على NM
    const nmRow = ranked.find(r => r.nom === 'ALL_FOULS');
    expect(nmRow?.mPerf).toBe('NM');
    expect(nmRow?.cls).toBe('NM');
  });

  // 4. نموذج نتائج الأندية CLUB RESULTS (الصفحة الثانية من COURSES)
  it('generates club standings sheet matching Page 2 of COURSES.docx and aggregates points', async () => {
    // إنشاء ورقة سباق وحفظ نتائج أندية فيها
    const trackSheet = await digitalResultSheetsService.createOrGetSheet({
      competitionId: 'comp_club_agg_test',
      disciplineCode: '100M',
      category: 'SENIOR',
      gender: 'M',
      sheetType: 'courses'
    });

    trackSheet.rows = [
      { id: 'c1', no: 101, nom: 'RUNNER1', prenom: 'A', dn: '2000-01-01', club: 'نادي أولمبيك سعيدة (OSA)', cw: '20', pre: '10.20s', cls: 1, status: 'valid' },
      { id: 'c2', no: 102, nom: 'RUNNER2', prenom: 'B', dn: '2000-01-01', club: 'أمل شباب سعيدة (MCS)', cw: '20', pre: '10.30s', cls: 2, status: 'valid' },
      { id: 'c3', no: 103, nom: 'RUNNER3', prenom: 'C', dn: '2000-01-01', club: 'وفاق سعيدة لألعاب القوى (WSA)', cw: '20', pre: '10.40s', cls: 3, status: 'valid' }
    ];

    const clubSheet = await digitalResultSheetsService.generateClubResultsSheet('comp_club_agg_test');

    expect(clubSheet.sheetType).toBe('club_results');
    expect(clubSheet.rows.length).toBeGreaterThan(0);

    // التحقق من أعمدة الصفحة الثانية: No, CLUB, CW, PER, CLS
    const firstClub = clubSheet.rows[0];
    expect(firstClub).toHaveProperty('no');
    expect(firstClub).toHaveProperty('clubName');
    expect(firstClub).toHaveProperty('cw');
    expect(firstClub).toHaveProperty('per');
    expect(firstClub).toHaveProperty('cls');

    // النادي الفائز بالمركز الأول في السباق (OSA) نال 9 نقاط (وفق مقياس الاتحاد الدولي Top 8)
    expect(firstClub.clubName).toContain('OSA');
    expect(firstClub.per).toContain('Pts');
    expect(firstClub.cls).toBe(1);
  });

  // 5. مسار الاعتماد والإغلاق الرسمي ومسار التدقيق (Approval Lifecycle & Audit Trail)
  it('enforces official approval lifecycle and logs administrative overrides to immutable audit trail', async () => {
    const sheet = await digitalResultSheetsService.createOrGetSheet({
      competitionId: 'comp_audit_test',
      disciplineCode: '200M',
      category: 'SENIOR',
      gender: 'M'
    });

    expect(sheet.status).toBe('draft');

    // تعديل عادي أثناء المسابقة
    const rowId = sheet.rows[0].id;
    await digitalResultSheetsService.updateRow(sheet.id, rowId, { pre: '21.40s' });
    expect(sheet.status).toBe('in_progress');

    // اعتماد الورقة من قبل الحكم العام
    const approvedSheet = await digitalResultSheetsService.approveSheet(sheet.id, 'سفيان بن عيسى (الحكم العام الفيدرالي)');
    expect(approvedSheet.status).toBe('approved');
    expect(approvedSheet.pvNumber).toContain('PV-LWAS-');
    expect(approvedSheet.approvedBy).toBe('سفيان بن عيسى (الحكم العام الفيدرالي)');

    // محاولة تعديل عادي بعد الاعتماد بدون مسار تدقيق رسمي يجب أن تفشل
    await expect(
      digitalResultSheetsService.updateRow(sheet.id, rowId, { pre: '21.30s' })
    ).rejects.toThrow(/معتمدة رسمياً ومقفلة/);

    // تعديل إداري رسمي موثق باسم المسؤول وسبب الطعن
    const updatedAfterAudit = await digitalResultSheetsService.updateRow(
      sheet.id, 
      rowId, 
      { pre: '21.32s' },
      { name: 'الحكم العام الفيدرالي', reason: 'تصحيح زمن بعد فحص شريط Photo Finish بدقة 1/1000s وقبول الطعن الرسمي' }
    );

    expect(updatedAfterAudit.rows.find(r => r.id === rowId)?.pre).toBe('21.32s');
    expect(updatedAfterAudit.auditLogs.length).toBeGreaterThan(0);
    expect(updatedAfterAudit.auditLogs[0].reason).toContain('Photo Finish');
    expect(updatedAfterAudit.auditLogs[0].field).toBe('pre');

    // إغلاق الاختصاص نهائياً
    const closedSheet = await digitalResultSheetsService.closeDiscipline(sheet.id, 'مدير المنافسات');
    expect(closedSheet.status).toBe('closed');
  });

  // 6. إضافة وحذف المشاركين المخولين قبل انطلاق الاختصاص
  it('allows authorized participant addition and pre-event removal while updating audit ledger', async () => {
    const sheet = await digitalResultSheetsService.createOrGetSheet({
      competitionId: 'comp_participant_test',
      disciplineCode: '800M',
      category: 'SENIOR',
      gender: 'M'
    });

    const initialCount = sheet.rows.length;

    // إضافة مشارك مخول
    const updatedSheet = await digitalResultSheetsService.addParticipant(sheet.id, {
      no: 999,
      nom: 'BENMEDDAH',
      prenom: 'Khaled',
      dn: '2002-03-15',
      club: 'نادي أولمبيك سعيدة (OSA)',
      cw: '20',
      status: 'valid'
    }, 'استدراك تسجيل استثنائي بقرار المندوب الفني');

    expect(updatedSheet.rows.length).toBe(initialCount + 1);
    const added = updatedSheet.rows.find(r => r.no === 999);
    expect(added).toBeDefined();
    expect(added?.nom).toBe('BENMEDDAH');

    // حذف مشارك قبل انطلاق الاختصاص
    const removedSheet = await digitalResultSheetsService.removeParticipant(sheet.id, added!.id, 'غياب مبرر بشهادة طبية');
    expect(removedSheet.rows.length).toBe(initialCount);
    expect(removedSheet.rows.find(r => r.no === 999)).toBeUndefined();
  });

  // 7. تصدير Word DOCX مطابق للوثيقة الرسمية
  it('exports Word DOCX blob conforming to official structure without runtime errors', async () => {
    const sheet = await digitalResultSheetsService.createOrGetSheet({
      competitionId: 'comp_docx_test',
      disciplineCode: '400M',
      category: 'SENIOR',
      gender: 'M'
    });

    const docxBlob = await digitalResultSheetsService.exportToDocx(sheet);
    expect(docxBlob).toBeDefined();
    expect(docxBlob.size).toBeGreaterThan(100);
    expect(docxBlob.type).toContain('word');
  });
});
