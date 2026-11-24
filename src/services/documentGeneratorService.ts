/**
 * PHOTO FINISH PRO AI — Official Document & Certificate Generation Engine (Stage 7)
 * World Athletics Rule 8 Results Protocols, Diplomas of Merit & Heat Sheets with UTF-8 Arabic print styling.
 */

export interface CertificateData {
  athleteName: string;
  clubName: string;
  competitionName: string;
  eventName: string;
  rank: number;
  markText: string;
  wind?: number;
  date: string;
  venue: string;
  certificateNumber: string;
}

export interface ResultsProtocolData {
  competitionName: string;
  eventName: string;
  category: string;
  venue: string;
  date: string;
  windSpeed?: string;
  chiefJudgeName: string;
  timingOperatorName: string;
  rows: {
    rank: number | string;
    bib: string;
    athleteName: string;
    club: string;
    timeOrMark: string;
    reactionTime?: string;
    notes?: string;
  }[];
}

export class DocumentGeneratorService {
  /**
   * Generate an official Print-Ready HTML Diploma of Merit (شهادة تتويج رسمية)
   */
  public generateDiplomaHtml(data: CertificateData): string {
    const medalEmoji = data.rank === 1 ? '🥇' : data.rank === 2 ? '🥈' : data.rank === 3 ? '🥉' : '🎖️';
    const rankTitle = data.rank === 1 ? 'المركز الأول (البطل)' : data.rank === 2 ? 'المركز الثاني (الوصيف)' : data.rank === 3 ? 'المركز الثالث' : `المرتبة ${data.rank}`;

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>شهادة تتويج رسمية - ${data.athleteName}</title>
  <style>
    /* خطوط ذاتية الاستضافة — Cairo + Chakra Petch (صفر CDN، تعمل دون شبكة) */
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 200 1000;
      font-display: swap;
      src: url('/fonts/cairo-arabic.woff2') format('woff2'), url('/fonts/cairo-latin.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Chakra Petch';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url('/fonts/chakra-petch-700-latin.woff2') format('woff2');
    }
    body {
      font-family: 'Cairo', sans-serif;
      background: #f8fafc;
      margin: 0;
      padding: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .diploma-card {
      width: 800px;
      background: #ffffff;
      border: 12px double #065f46;
      border-radius: 24px;
      padding: 50px 60px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
      position: relative;
    }
    .header-crest {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .federation-title {
      font-size: 20px;
      font-weight: 900;
      color: #064e3b;
      margin-bottom: 4px;
    }
    .championship-name {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .diploma-title {
      font-size: 32px;
      font-weight: 900;
      color: #d97706;
      border-bottom: 2px solid #fef3c7;
      display: inline-block;
      padding-bottom: 6px;
      margin-bottom: 24px;
    }
    .certify-text {
      font-size: 15px;
      color: #334155;
      margin-bottom: 12px;
    }
    .athlete-name {
      font-size: 36px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .club-name {
      font-size: 18px;
      font-weight: 700;
      color: #047857;
      margin-bottom: 24px;
    }
    .achievement-box {
      background: #f0fdf4;
      border: 1px dashed #059669;
      border-radius: 16px;
      padding: 16px 24px;
      display: flex;
      justify-content: space-around;
      margin-bottom: 36px;
    }
    .achievement-item .label {
      font-size: 12px;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .achievement-item .value {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      font-family: 'Chakra Petch', 'Cairo', sans-serif;
    }
    .footer-signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
    }
    .signature-block {
      text-align: center;
      width: 220px;
    }
    .signature-block .role {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 40px;
    }
    .signature-block .line {
      border-top: 1px dashed #94a3b8;
      font-size: 11px;
      color: #94a3b8;
      padding-top: 4px;
    }
    @media print {
      body { background: transparent; padding: 0; }
      .diploma-card { box-shadow: none; width: 100%; border-width: 8px; }
    }
  </style>
</head>
<body>
  <div class="diploma-card">
    <div class="header-crest">${medalEmoji}</div>
    <div class="federation-title">الاتحاد الجزائري لألعاب القوى</div>
    <div class="championship-name">${data.competitionName} • ${data.venue}</div>
    
    <div class="diploma-title">شهادة تتويج وتقدير</div>
    
    <div class="certify-text">تشهد اللجنة المنظمة وهيئة التحكيم الرسمية بأن الرياضي:</div>
    <div class="athlete-name">${data.athleteName}</div>
    <div class="club-name">نادي: ${data.clubName}</div>
    
    <div class="achievement-box">
      <div class="achievement-item">
        <div class="label">المسابقة</div>
        <div class="value">${data.eventName}</div>
      </div>
      <div class="achievement-item">
        <div class="label">الترتيب المحقق</div>
        <div class="value">${rankTitle}</div>
      </div>
      <div class="achievement-item">
        <div class="label">التوقيت / الإنجاز</div>
        <div class="value">${data.markText}</div>
      </div>
    </div>
    
    <div class="footer-signatures">
      <div class="signature-block">
        <div class="role">رئيس هيئة التحكيم</div>
        <div class="line">التوقيع والخاتم الرسمي</div>
      </div>
      <div class="signature-block">
        <div class="role">رقم الوثيقة المعتمد</div>
        <div class="value" style="font-size: 12px; font-family: monospace; color: #64748b;">${data.certificateNumber}</div>
        <div class="line">${data.date}</div>
      </div>
      <div class="signature-block">
        <div class="role">مدير التوقيت الإلكتروني</div>
        <div class="line">التوقيع الرسمي</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate an official World Athletics Rule 8 Results Protocol HTML
   */
  public generateResultsProtocolHtml(data: ResultsProtocolData): string {
    const tableRows = data.rows.map(r => `
      <tr>
        <td style="font-weight: 900; text-align: center;">${r.rank}</td>
        <td style="font-family: monospace; text-align: center; font-weight: 700;">${r.bib}</td>
        <td style="font-weight: 700;">${r.athleteName}</td>
        <td>${r.club}</td>
        <td style="font-family: monospace; font-weight: 900; text-align: center; color: #047857;">${r.timeOrMark}</td>
        <td style="font-family: monospace; text-align: center; color: #64748b;">${r.reactionTime || '-'}</td>
        <td style="font-size: 11px; color: #64748b;">${r.notes || '-'}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>محضر النتائج الرسمية - ${data.eventName}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; }
    .header { border-bottom: 3px solid #047857; padding-bottom: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; text-align: right; }
    td { padding: 8px 10px; border: 1px solid #e2e8f0; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 22px;">محضر النتائج الرسمية المعتمد (World Athletics Rule 8)</h1>
    <div style="font-size: 14px; color: #475569; margin-top: 5px;">
      المنافسة: ${data.competitionName} | المسابقة: ${data.eventName} (${data.category}) | التاريخ: ${data.date}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px; text-align: center;">الرتبة</th>
        <th style="width: 60px; text-align: center;">الصدر</th>
        <th>العداء</th>
        <th>النادي</th>
        <th style="width: 100px; text-align: center;">الزمن / الإنجاز</th>
        <th style="width: 80px; text-align: center;">رد الفعل</th>
        <th>ملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="signatures">
    <div><strong>رئيس هيئة التحكيم:</strong> ${data.chiefJudgeName} (توقيع: ........................)</div>
    <div><strong>مشغل Photo Finish:</strong> ${data.timingOperatorName} (توقيع: ........................)</div>
  </div>
</body>
</html>`;
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
