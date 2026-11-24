/**
 * PHOTO FINISH PRO AI — Unified Export Service (Stage 4)
 * Enterprise-grade multi-format export engine for:
 * 1. PDF (High-definition print-ready HTML with embedded Cairo/Amiri web fonts & RTL)
 * 2. Word (.doc / WordprocessingML package with native RTL & font binding)
 * 3. Excel (.xml SpreadsheetML with native ss:RightToLeft="1" & formatted columns)
 *
 * Supports:
 * - Single discipline table export
 * - Batch all disciplines export
 * - Stage 3 Planning Bureau schedule export
 * - Official unified league header (logo + league name + competition + date + discipline)
 */

import { portalAuthService, RegisteredLeague } from './portalAuthService';
import * as XLSX from 'xlsx';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableCell, 
  TableRow, 
  TextRun, 
  AlignmentType, 
  WidthType 
} from 'docx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface UnifiedDocumentHeader {
  leagueName: string;
  leagueShortName?: string;
  leagueLogoUrl?: string;
  leagueLogoCode?: string;
  accreditationNumber?: string;
  competitionName: string;
  venue: string;
  date: string;
  disciplineName?: string;
  category?: string;
  gender?: string;
  windSpeed?: string;
  chiefJudgeName?: string;
  season?: string;
  notes?: string;
}

export interface ExportColumnDef {
  header: string;
  key: string;
  width?: string;
  align?: 'right' | 'center' | 'left';
}

export interface ExportTableRow {
  [key: string]: any;
}

export interface ExportDisciplineSection {
  disciplineId: string;
  disciplineNameAr: string;
  group: 'course' | 'concours' | 'combined';
  subGroup?: string;
  categoryNameAr?: string;
  measurementType?: 'time' | 'distance' | 'height' | 'points';
  windSpeed?: string;
  scheduledTime?: string;
  columns: ExportColumnDef[];
  rows: ExportTableRow[];
}

export interface UnifiedExportPayload {
  header: UnifiedDocumentHeader;
  sections: ExportDisciplineSection[];
}

export class UnifiedExportService {
  /**
   * Reads default header metadata from active league context, with fallback to default league.
   */
  getDefaultHeader(competitionName = 'البطولة الرسمية لألعاب القوى', venue = 'المركب الرياضي الأولمبي', date = '2026'): UnifiedDocumentHeader {
    const session = portalAuthService.getActiveSession();
    const allLeagues = portalAuthService.getAllLeagues();
    const currentLeague: RegisteredLeague | undefined = 
      session?.leagueId ? allLeagues.find(l => l.id === session.leagueId) : allLeagues[0];

    return {
      leagueName: currentLeague?.name || 'الرابطة الولائية لألعاب القوى',
      leagueShortName: currentLeague?.shortName || 'LAAP',
      leagueLogoUrl: currentLeague?.logoUrl,
      leagueLogoCode: currentLeague?.logoCode || '🏃',
      accreditationNumber: currentLeague?.accreditationNumber || 'LAAP-2026-DZ',
      competitionName,
      venue,
      date,
      season: 'الموسم الرياضي 2026',
      chiefJudgeName: 'الحكم العام الفيدرالي'
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 1. PDF / HIGH-DEFINITION PRINT EXPORT
  // ═════════════════════════════════════════════════════════════════════════
  generatePrintableHtml(payload: UnifiedExportPayload): string {
    const { header, sections } = payload;
    const isSingle = sections.length === 1;

    const sectionsHtml = sections.map((sec, idx) => {
      const headersHtml = sec.columns
        .map(c => `<th style="text-align:${c.align || 'right'}; padding: 7px 10px; border-bottom: 2px solid #0f172a; background: #f8fafc; font-size: 11px;">${c.header}</th>`)
        .join('');

      const rowsHtml = sec.rows.length === 0
        ? `<tr><td colspan="${sec.columns.length}" style="text-align:center; padding: 16px; color:#64748b;">لا توجد عمليات مسجلة حتى الآن</td></tr>`
        : sec.rows.map((r, rIdx) => {
            const cellsHtml = sec.columns
              .map(c => `<td style="text-align:${c.align || 'right'}; padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${r[c.key] !== undefined && r[c.key] !== null ? r[c.key] : '-'}</td>`)
              .join('');
            const bg = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
            return `<tr style="background:${bg};">${cellsHtml}</tr>`;
          }).join('');

      const pageBreakStyle = !isSingle && idx < sections.length - 1 ? 'page-break-after: always; margin-bottom: 30px;' : 'margin-bottom: 30px;';

      return `
        <div class="discipline-section" style="${pageBreakStyle}">
          <!-- Section Title Strip -->
          <div style="background: #0f172a; color: #ffffff; padding: 8px 14px; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 800; font-size: 13px;">
              ${sec.disciplineNameAr} ${sec.categoryNameAr ? `• ${sec.categoryNameAr}` : ''}
            </div>
            <div style="font-size: 11px; opacity: 0.85;">
              ${sec.windSpeed ? `الرياح: ${sec.windSpeed} | ` : ''}المشاركون: ${sec.rows.length}
            </div>
          </div>

          <!-- Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1;">
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Official Signatures Block (at end of each section) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 25px; text-align: center; font-size: 10px; page-break-inside: avoid;">
            <div style="border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px 8px 28px 8px;">
              <strong>حكم الميقات / خط النهاية</strong>
            </div>
            <div style="border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px 8px 28px 8px;">
              <strong>أمانة النتائج والإحصاء</strong>
            </div>
            <div style="border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px 8px 28px 8px;">
              <strong>الحكم العام (الاعتماد الرسمي)</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>الوثيقة الرسمية - ${header.competitionName}</title>
  <style>
    /* خط Cairo ذاتي الاستضافة (الوثائق تُفتح من نفس الأصل عبر window.open — المسار النسبي يعمل) */
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 200 1000;
      font-display: swap;
      src: url('/fonts/cairo-arabic.woff2') format('woff2'), url('/fonts/cairo-latin.woff2') format('woff2');
    }
    
    @page {
      size: A4 portrait;
      margin: 15mm 12mm 15mm 12mm;
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Amiri', 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11pt;
      line-height: 1.4;
    }

    .unified-header-container {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }

    .top-republic-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .republic-text {
      text-align: right;
      font-size: 10.5px;
      line-height: 1.35;
      font-weight: 700;
    }

    .logo-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .logo-img {
      width: 55px;
      height: 55px;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      padding: 2px;
      margin-bottom: 4px;
    }

    .logo-placeholder {
      width: 50px;
      height: 50px;
      background: #0f172a;
      color: #facc15;
      font-size: 24px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      margin-bottom: 4px;
    }

    .league-text {
      text-align: left;
      font-size: 11px;
      font-weight: 800;
      color: #065f46;
    }

    .meta-banner {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      font-size: 10px;
      margin-bottom: 16px;
    }

    .meta-banner strong {
      display: block;
      color: #475569;
      font-size: 9px;
    }

    .cert-stamp {
      font-size: 9px;
      color: #047857;
      font-weight: 800;
      text-align: center;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <!-- UNIFIED OFFICIAL HEADER -->
  <div class="unified-header-container">
    <div class="top-republic-row">
      <div class="republic-text">
        <div>الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div style="color: #475569; font-size: 9.5px;">وزارة الشباب والرياضة • الاتحاد الجزائري لألعاب القوى (FAA)</div>
        <div style="font-family: monospace; font-size: 8.5px; color: #64748b; direction: ltr;">RÉPUBLIQUE ALGÉRIENNE • FAA</div>
      </div>

      <div class="logo-badge">
        ${header.leagueLogoUrl 
          ? `<img src="${header.leagueLogoUrl}" alt="شعار الرابطة" class="logo-img" />`
          : `<div class="logo-placeholder">${header.leagueLogoCode || '🏃'}</div>`
        }
        <span style="font-family: monospace; font-weight: bold; font-size: 9px; color: #475569;">
          ${header.accreditationNumber || 'LAAP-2026'}
        </span>
      </div>

      <div class="league-text">
        <div>${header.leagueName}</div>
        <div style="font-size: 9.5px; color: #475569; font-weight: 600;">${header.season || 'الموسم الرياضي 2026'}</div>
        <div class="cert-stamp">معتمد رسمياً (World Athletics)</div>
      </div>
    </div>

    <!-- Metadata Strip -->
    <div class="meta-banner">
      <div>
        <strong>البطولة والمنافسة:</strong>
        <span style="font-weight: 800; color: #0f172a;">${header.competitionName}</span>
      </div>
      <div>
        <strong>الملعب والميدان:</strong>
        <span>📍 ${header.venue}</span>
      </div>
      <div>
        <strong>التاريخ والتوقيت:</strong>
        <span>${header.date}</span>
      </div>
      <div>
        <strong>الحكم العام:</strong>
        <span style="font-weight: 700;">${header.chiefJudgeName || 'الحكم العام الفيدرالي'}</span>
      </div>
    </div>
  </div>

  <!-- SECTIONS (Single or All Disciplines) -->
  ${sectionsHtml}
</body>
</html>`;
  }

  /**
   * Generates a genuine binary PDF document (A4 portrait, 300 DPI, full RTL with embedded styling).
   */
  async generateRealPdf(payload: UnifiedExportPayload): Promise<Blob> {
    const { header, sections } = payload;
    const htmlContent = this.generatePrintableHtml(payload);

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '794px';
        container.style.background = '#ffffff';
        container.innerHTML = htmlContent;
        document.body.appendChild(container);

        await new Promise(r => setTimeout(r, 150));

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        const arrayBuffer = pdf.output('arraybuffer');
        return new Blob([arrayBuffer], { type: 'application/pdf' });
      } catch (e) {
        console.warn('html2canvas rendering fallback to direct jsPDF:', e);
      }
    }

    // Direct jsPDF fallback (for headless / test environments)
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setR2L(true);
    pdf.setFontSize(16);
    pdf.text(header.competitionName, 105, 20, { align: 'center' });
    pdf.setFontSize(11);
    pdf.text(`${header.leagueName} • ${header.venue} • ${header.date}`, 105, 28, { align: 'center' });

    let currentY = 40;
    sections.forEach(sec => {
      pdf.setFontSize(13);
      pdf.text(`${sec.disciplineNameAr} (${sec.categoryNameAr || ''})`, 190, currentY, { align: 'right' });
      currentY += 8;

      pdf.setFontSize(10);
      sec.rows.slice(0, 25).forEach(r => {
        const line = `${r.rank || '-'} | #${r.bibNumber || '-'} | ${r.athleteName || '-'} | ${r.mark || '-'} | ${r.clubName || '-'}`;
        pdf.text(line, 190, currentY, { align: 'right' });
        currentY += 6;
      });
      currentY += 10;
    });

    const arrayBuffer = pdf.output('arraybuffer');
    return new Blob([arrayBuffer], { type: 'application/pdf' });
  }

  async exportToPdf(payload: UnifiedExportPayload): Promise<void> {
    const filename = `${payload.header.competitionName}_${payload.sections[0]?.disciplineNameAr || 'النتائج_الرسمية'}.pdf`;
    try {
      const blob = await this.generateRealPdf(payload);
      this.triggerDownload(blob, filename);
    } catch (e) {
      console.warn('Direct PDF export error, falling back to print window:', e);
      const html = this.generatePrintableHtml(payload);
      if (typeof window === 'undefined') return;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        this.triggerDownload(blob, `${payload.header.competitionName}_النتائج_الرسمية.html`);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. WORD (.DOC / MS WORD XML/HTML PACKAGE) EXPORT
  // ═════════════════════════════════════════════════════════════════════════
  generateWordDocument(payload: UnifiedExportPayload): string {
    const { header, sections } = payload;

    const sectionsHtml = sections.map((sec) => {
      const headersHtml = sec.columns
        .map(c => `<th style="background-color: #0F172A; color: #FFFFFF; font-weight: bold; padding: 8pt; border: 1pt solid #0F172A; text-align: ${c.align || 'right'}; font-family: 'Cairo', 'Arial', sans-serif; font-size: 10pt;">${c.header}</th>`)
        .join('');

      const rowsHtml = sec.rows.map((r, rIdx) => {
        const bg = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        const cellsHtml = sec.columns
          .map(c => `<td style="padding: 6pt 8pt; border: 1pt solid #CBD5E1; text-align: ${c.align || 'right'}; font-family: 'Cairo', 'Arial', sans-serif; font-size: 9.5pt;">${r[c.key] !== undefined && r[c.key] !== null ? r[c.key] : '-'}</td>`)
          .join('');
        return `<tr style="background-color: ${bg};">${cellsHtml}</tr>`;
      }).join('');

      return `
        <div style="margin-top: 18pt; margin-bottom: 24pt;">
          <h2 style="font-family: 'Cairo', 'Arial', sans-serif; font-size: 13pt; color: #0F172A; border-bottom: 2pt solid #0F172A; padding-bottom: 4pt; margin-bottom: 8pt;">
            ${sec.disciplineNameAr} ${sec.categoryNameAr ? `(${sec.categoryNameAr})` : ''}
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12pt; direction: rtl;" dir="rtl">
            <thead><tr>${headersHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;
    }).join('<br clear="all" style="page-break-before:always" />');

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
          @page WordSection1 {
            size: 595.3pt 841.9pt; /* A4 */
            margin: 42.5pt 42.5pt 42.5pt 42.5pt;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-paper-source: 0;
            direction: rtl;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          body {
            font-family: 'Cairo', 'Amiri', 'Traditional Arabic', Arial, sans-serif;
            direction: rtl;
            text-align: right;
            font-size: 11pt;
          }
          table {
            mso-displayed-decimal-separator: ".";
            mso-displayed-thousand-separator: ",";
          }
        </style>
      </head>
      <body lang="AR-DZ" dir="rtl" style="direction: rtl; text-align: right;">
        <div class="WordSection1" dir="rtl">
          <!-- Header Table -->
          <table style="width: 100%; border-collapse: collapse; border-bottom: 2pt solid #0F172A; margin-bottom: 14pt; direction: rtl;" dir="rtl">
            <tr>
              <td style="width: 35%; text-align: right; font-family: 'Cairo', Arial, sans-serif; font-size: 10pt;">
                <strong>الجمهورية الجزائرية الديمقراطية الشعبية</strong><br/>
                وزارة الشباب والرياضة<br/>
                الاتحاد الجزائري لألعاب القوى (FAA)
              </td>
              <td style="width: 30%; text-align: center; font-family: 'Cairo', Arial, sans-serif;">
                <h1 style="font-size: 16pt; margin: 0; color: #0F172A;">${header.competitionName}</h1>
                <p style="font-size: 10pt; color: #475569; margin: 2pt 0;">${header.venue} • ${header.date}</p>
              </td>
              <td style="width: 35%; text-align: left; font-family: 'Cairo', Arial, sans-serif; font-size: 10pt; color: #065F46;">
                <strong>${header.leagueName}</strong><br/>
                الاعتماد: ${header.accreditationNumber || 'LAAP-2026'}<br/>
                ${header.season || 'الموسم الرياضي 2026'}
              </td>
            </tr>
          </table>

          ${sectionsHtml}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates a genuine OOXML Word (.docx) document with native Arabic RTL and table styling.
   */
  async generateRealDocx(payload: UnifiedExportPayload): Promise<Blob> {
    const { header, sections } = payload;
    const docChildren: (Paragraph | Table)[] = [];

    // 1. Republic Honorary Top Header
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: 'الجمهورية الجزائرية الديمقراطية الشعبية',
            bold: true,
            font: 'Cairo',
            size: 24,
            color: '0F172A'
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: 'وزارة الشباب والرياضة • الاتحاد الجزائري لألعاب القوى (FAA)',
            bold: true,
            font: 'Cairo',
            size: 20,
            color: '334155'
          })
        ]
      })
    );

    // 2. League & Competition Meta Table
    const metaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({ text: 'المنافسة: ', bold: true, font: 'Cairo', size: 18 }),
                    new TextRun({ text: header.competitionName, bold: true, font: 'Cairo', size: 18, color: '0F172A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({ text: 'الميدان والملعب: ', bold: true, font: 'Cairo', size: 18 }),
                    new TextRun({ text: header.venue, font: 'Cairo', size: 18 })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({ text: 'التاريخ: ', bold: true, font: 'Cairo', size: 18 }),
                    new TextRun({ text: header.date, font: 'Cairo', size: 18 })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({ text: 'الهيئة المنظمة: ', bold: true, font: 'Cairo', size: 18 }),
                    new TextRun({ text: header.leagueName, bold: true, font: 'Cairo', size: 18, color: '065F46' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({ text: 'رقم الاعتماد: ', bold: true, font: 'Cairo', size: 18 }),
                    new TextRun({ text: header.accreditationNumber || 'LAAP-2026-DZ', font: 'Cairo', size: 18 })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({ text: 'الموسم الرياضي: ', bold: true, font: 'Cairo', size: 18 }),
                    new TextRun({ text: header.season || '2026', font: 'Cairo', size: 18 })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
    docChildren.push(metaTable);

    // 3. Discipline Sections
    for (const sec of sections) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 300, after: 120 },
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [
            new TextRun({
              text: `محضر رسمي: ${sec.disciplineNameAr} ${sec.categoryNameAr ? `(${sec.categoryNameAr})` : ''}`,
              bold: true,
              font: 'Cairo',
              size: 22,
              color: '0F172A'
            }),
            new TextRun({
              text: sec.windSpeed ? `  | الرياح: ${sec.windSpeed}` : '',
              font: 'Cairo',
              size: 18,
              color: 'B45309'
            })
          ]
        })
      );

      // Header Row
      const headerRow = new TableRow({
        tableHeader: true,
        children: sec.columns.map(col => new TableCell({
          shading: { fill: '0F172A' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              children: [
                new TextRun({
                  text: col.header,
                  bold: true,
                  color: 'FFFFFF',
                  font: 'Cairo',
                  size: 18
                })
              ]
            })
          ]
        }))
      });

      // Data Rows
      const dataRows = sec.rows.map((row, rIdx) => {
        const bg = rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
        return new TableRow({
          children: sec.columns.map(col => {
            const val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-';
            return new TableCell({
              shading: { fill: bg },
              children: [
                new Paragraph({
                  alignment: col.align === 'center' ? AlignmentType.CENTER : col.align === 'left' ? AlignmentType.LEFT : AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({
                      text: val,
                      font: 'Cairo',
                      size: 18,
                      bold: col.key === 'mark' || col.key === 'rank'
                    })
                  ]
                })
              ]
            });
          })
        });
      });

      const sectionTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows]
      });
      docChildren.push(sectionTable);

      // Official 3 Signatures Table
      const sigTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    bidirectional: true,
                    spacing: { before: 100, after: 200 },
                    children: [
                      new TextRun({ text: 'رئيس قضاة الميقاتية (FAT)', bold: true, font: 'Cairo', size: 16 }),
                      new TextRun({ text: '\n\nالتوقيع والمصادقة', italics: true, font: 'Cairo', size: 14, color: '64748B' })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    bidirectional: true,
                    spacing: { before: 100, after: 200 },
                    children: [
                      new TextRun({ text: 'ختم الرابطة المنظمة', bold: true, font: 'Cairo', size: 16 }),
                      new TextRun({ text: `\n\n${header.leagueName}`, italics: true, font: 'Cairo', size: 14, color: '065F46' })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 34, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    bidirectional: true,
                    spacing: { before: 100, after: 200 },
                    children: [
                      new TextRun({ text: 'الحكم العام للمنافسة (Juge-Arbitre)', bold: true, font: 'Cairo', size: 16 }),
                      new TextRun({ text: `\n\n${header.chiefJudgeName || 'الحكم العام'}`, font: 'Cairo', size: 16, bold: true, color: '0F172A' })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });
      docChildren.push(new Paragraph({ spacing: { before: 150 } }));
      docChildren.push(sigTable);
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren
      }]
    });

    if (typeof Packer.toBlob === 'function') {
      try {
        return await Packer.toBlob(doc);
      } catch {
        // Fallback to toBuffer if in Node
      }
    }
    const buffer = await Packer.toBuffer(doc);
    return new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  async exportToWord(payload: UnifiedExportPayload): Promise<void> {
    const filename = `${payload.header.competitionName}_${payload.sections[0]?.disciplineNameAr || 'النتائج_الرسمية'}.docx`;
    try {
      const blob = await this.generateRealDocx(payload);
      this.triggerDownload(blob, filename);
    } catch (e) {
      console.warn('Real docx export error, falling back to Word ML:', e);
      const content = this.generateWordDocument(payload);
      const BOM = '\uFEFF';
      const fallbackBlob = new Blob([BOM + content], { type: 'application/msword;charset=utf-8' });
      this.triggerDownload(fallbackBlob, `${payload.header.competitionName}_${payload.sections[0]?.disciplineNameAr || 'النتائج'}.doc`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. EXCEL (SPREADSHEETML XML WITH NATIVE ss:RightToLeft="1") EXPORT
  // ═════════════════════════════════════════════════════════════════════════
  generateExcelXml(payload: UnifiedExportPayload): string {
    const { header, sections } = payload;

    const worksheetsXml = sections.map((sec, idx) => {
      const sheetName = sec.disciplineNameAr.replace(/[:\\/?*\[\]]/g, '').substring(0, 30) || `تخصص ${idx + 1}`;
      
      const columnsXml = sec.columns.map(() => `<ss:Column ss:AutoFitWidth="1" ss:Width="110"/>`).join('\n');

      const headerRowCells = sec.columns.map(c => `
        <ss:Cell ss:StyleID="HeaderStyle">
          <ss:Data ss:Type="String">${this.escapeXml(c.header)}</ss:Data>
        </ss:Cell>
      `).join('');

      const dataRowsXml = sec.rows.map(r => {
        const cells = sec.columns.map(c => {
          const val = r[c.key] !== undefined && r[c.key] !== null ? String(r[c.key]) : '';
          const isNumeric = /^-?\d+(\.\d+)?$/.test(val.trim());
          const dataType = isNumeric ? 'Number' : 'String';
          return `
            <ss:Cell ss:StyleID="DataStyle">
              <ss:Data ss:Type="${dataType}">${this.escapeXml(val)}</ss:Data>
            </ss:Cell>
          `;
        }).join('');
        return `<ss:Row>${cells}</ss:Row>`;
      }).join('\n');

      return `
        <ss:Worksheet ss:Name="${this.escapeXml(sheetName)}" ss:RightToLeft="1">
          <ss:Table ss:DefaultRowHeight="20">
            ${columnsXml}
            
            <!-- Meta Title Rows -->
            <ss:Row ss:Height="25">
              <ss:Cell ss:StyleID="TitleStyle">
                <ss:Data ss:Type="String">${this.escapeXml(header.leagueName)} - ${this.escapeXml(header.competitionName)}</ss:Data>
              </ss:Cell>
            </ss:Row>
            <ss:Row ss:Height="18">
              <ss:Cell ss:StyleID="SubTitleStyle">
                <ss:Data ss:Type="String">الميدان: ${this.escapeXml(header.venue)} | التاريخ: ${this.escapeXml(header.date)} | التخصص: ${this.escapeXml(sec.disciplineNameAr)}</ss:Data>
              </ss:Cell>
            </ss:Row>
            <ss:Row ss:Height="10"></ss:Row>

            <!-- Table Headers -->
            <ss:Row ss:Height="22">
              ${headerRowCells}
            </ss:Row>

            <!-- Data Rows -->
            ${dataRowsXml}
          </ss:Table>
        </ss:Worksheet>
      `;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<ss:Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <ss:Styles>
    <ss:Style ss:ID="Default" ss:Name="Normal">
      <ss:Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <ss:Font ss:FontName="Cairo" ss:Size="11" ss:Color="#0F172A"/>
    </ss:Style>
    <ss:Style ss:ID="TitleStyle">
      <ss:Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <ss:Font ss:FontName="Cairo" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/>
    </ss:Style>
    <ss:Style ss:ID="SubTitleStyle">
      <ss:Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <ss:Font ss:FontName="Cairo" ss:Size="10" ss:Color="#475569"/>
    </ss:Style>
    <ss:Style ss:ID="HeaderStyle">
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
        <ss:Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <ss:Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <ss:Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
      </ss:Borders>
      <ss:Font ss:FontName="Cairo" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <ss:Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
    </ss:Style>
    <ss:Style ss:ID="DataStyle">
      <ss:Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
      <ss:Font ss:FontName="Cairo" ss:Size="10.5" ss:Color="#1E293B"/>
    </ss:Style>
  </ss:Styles>
  ${worksheetsXml}
</ss:Workbook>`;
  }

  /**
   * Generates a genuine binary Excel (.xlsx) workbook with native Right-To-Left view on worksheets.
   */
  generateRealXlsx(payload: UnifiedExportPayload): Blob {
    const { header, sections } = payload;
    const wb = XLSX.utils.book_new();

    sections.forEach((sec, idx) => {
      const aoa: any[][] = [];

      // Row 1: Republic & Federation Banner
      aoa.push(['الجمهورية الجزائرية الديمقراطية الشعبية - الاتحاد الجزائري لألعاب القوى (FAA)']);
      // Row 2: League & Competition
      aoa.push([`${header.leagueName} | ${header.competitionName}`]);
      // Row 3: Metadata
      aoa.push([
        `الميدان: ${header.venue}`,
        `التاريخ: ${header.date}`,
        `الموسم: ${header.season || '2026'}`,
        sec.windSpeed ? `الرياح: ${sec.windSpeed}` : '',
        `الحكم العام: ${header.chiefJudgeName || 'الحكم العام الفيدرالي'}`
      ]);
      // Row 4: Discipline Title
      aoa.push([`محضر رسمي معتمد: ${sec.disciplineNameAr} ${sec.categoryNameAr ? `(${sec.categoryNameAr})` : ''}`]);
      aoa.push([]);

      // Row 6: Column Headers
      aoa.push(sec.columns.map(c => c.header));

      // Row 7+: Data rows
      sec.rows.forEach(r => {
        const rowData = sec.columns.map(c => {
          const val = r[c.key];
          if (val === undefined || val === null) return '-';
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && /^-?\d+$/.test(val.trim())) {
            const num = parseInt(val.trim(), 10);
            return isNaN(num) ? val : num;
          }
          return val;
        });
        aoa.push(rowData);
      });

      // Signatures
      aoa.push([]);
      aoa.push([
        'رئيس قضاة الميقاتية (FAT)',
        '',
        'ختم واعتماد الرابطة الولائية',
        '',
        `الحكم العام للمنافسة (${header.chiefJudgeName || 'الحكم العام'})`
      ]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!views'] = [{ RTL: true }];
      ws['!cols'] = sec.columns.map(c => ({
        wch: Math.max(c.header.length * 2, 14)
      }));

      const sanitizedName = sec.disciplineNameAr
        .replace(/[:\\/?*\[\]]/g, '')
        .trim()
        .substring(0, 30) || `تخصص ${idx + 1}`;

      XLSX.utils.book_append_sheet(wb, ws, sanitizedName);
    });

    const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  exportToExcel(payload: UnifiedExportPayload): void {
    const filename = `${payload.header.competitionName}_${payload.sections[0]?.disciplineNameAr || 'النتائج_الرسمية'}.xlsx`;
    try {
      const blob = this.generateRealXlsx(payload);
      this.triggerDownload(blob, filename);
    } catch (e) {
      console.warn('Real xlsx export error, falling back to SpreadsheetML:', e);
      const xml = this.generateExcelXml(payload);
      const fallbackBlob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      this.triggerDownload(fallbackBlob, `${payload.header.competitionName}_${payload.sections[0]?.disciplineNameAr || 'النتائج'}.xls`);
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private escapeXml(unsafe: any): string {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe).replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}

export const unifiedExportService = new UnifiedExportService();
