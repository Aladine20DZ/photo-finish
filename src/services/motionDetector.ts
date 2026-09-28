/**
 * حساس البوابة الضوئية وكاشف حركة خط النهاية (High-Precision Optical Gate Detector)
 * يراقب خط النهاية لكل رواق بالمضمار ويرصد لحظة قطع شعاع الحساس
 * لحساب التوقيت والترتيب التلقائي للعدائين (الأول، الثاني...) بدقة متناهية
 */

export interface OpticalLaneResult {
  lane: number;
  motionScore: number;
  isTriggered: boolean;
}

export class OpticalGateDetector {
  private prevFrameData: Uint8ClampedArray | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private triggeredLanes: Set<number> = new Set();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  public reset() {
    this.prevFrameData = null;
    this.triggeredLanes.clear();
  }

  /**
   * فحص الحساس الضوئي لكل رواق عند خط النهاية
   */
  public scan(
    video: HTMLVideoElement,
    laneCount: number = 4,
    finishLineXPercent: number = 0.35,
    threshold: number = 20
  ): OpticalLaneResult[] {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return [];

    // شريط ضيق ومحدد حول خط النهاية (Laser Beam ROI)
    const bandWidth = 20;
    const lineX = Math.floor(width * finishLineXPercent);
    const startX = Math.max(0, lineX - Math.floor(bandWidth / 2));

    this.canvas.width = bandWidth;
    this.canvas.height = height;

    this.ctx.drawImage(video, startX, 0, bandWidth, height, 0, 0, bandWidth, height);
    const frame = this.ctx.getImageData(0, 0, bandWidth, height);
    const currData = frame.data;

    const results: OpticalLaneResult[] = [];
    const laneHeight = Math.floor(height / laneCount);

    if (!this.prevFrameData || this.prevFrameData.length !== currData.length) {
      this.prevFrameData = new Uint8ClampedArray(currData);
      for (let l = 1; l <= laneCount; l++) {
        results.push({ lane: l, motionScore: 0, isTriggered: false });
      }
      return results;
    }

    const prev = this.prevFrameData;

    for (let laneIdx = 0; laneIdx < laneCount; laneIdx++) {
      const laneNumber = laneIdx + 1;
      const yStart = laneIdx * laneHeight;
      const yEnd = (laneIdx + 1) * laneHeight;

      let changedPixels = 0;
      let totalSamples = 0;

      for (let y = yStart; y < yEnd; y += 2) {
        for (let x = 0; x < bandWidth; x += 2) {
          const idx = (y * bandWidth + x) * 4;
          
          const grayCurr = (currData[idx] * 0.299 + currData[idx + 1] * 0.587 + currData[idx + 2] * 0.114);
          const grayPrev = (prev[idx] * 0.299 + prev[idx + 1] * 0.587 + prev[idx + 2] * 0.114);

          if (Math.abs(grayCurr - grayPrev) > threshold) {
            changedPixels++;
          }
          totalSamples++;
        }
      }

      const scorePercent = totalSamples > 0 ? (changedPixels / totalSamples) * 100 : 0;
      // انطلاق الحساس الفوري عند قطع خط النهاية
      const isTriggered = scorePercent > 16;

      results.push({
        lane: laneNumber,
        motionScore: Math.round(scorePercent),
        isTriggered
      });
    }

    this.prevFrameData.set(currData);
    return results;
  }

  /**
   * التقاط لقطة تذكارية رسمية فائقة الوضوح للحساس مع توثيق الرواق وترتيب العداء
   */
  public captureSnapshot(
    video: HTMLVideoElement,
    laneNumber: number,
    timeFormatted: string,
    finishLineXPercent: number = 0.35,
    runnerName?: string,
    bib?: number,
    rank?: number
  ): string | null {
    if (!video.videoWidth || !video.videoHeight) return null;
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = 500;
    snapCanvas.height = 300;
    const sCtx = snapCanvas.getContext('2d');
    if (!sCtx) return null;

    // رسم المشهد المباشر
    sCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
    
    const lineX = snapCanvas.width * finishLineXPercent;

    // رسم خط النهاية المضيء (Official Finish Line Plane)
    sCtx.save();
    sCtx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    sCtx.shadowBlur = 8;
    sCtx.strokeStyle = '#ef4444';
    sCtx.lineWidth = 3;
    sCtx.beginPath();
    sCtx.moveTo(lineX, 0);
    sCtx.lineTo(lineX, snapCanvas.height);
    sCtx.stroke();

    // خيط أبيض دقيق وسطه
    sCtx.shadowBlur = 0;
    sCtx.strokeStyle = '#ffffff';
    sCtx.lineWidth = 1;
    sCtx.beginPath();
    sCtx.moveTo(lineX, 0);
    sCtx.lineTo(lineX, snapCanvas.height);
    sCtx.stroke();

    // بطاقة توثيق IAAF الرسمية للعداء
    const badgeW = 240;
    const badgeH = 50;
    const badgeX = lineX > snapCanvas.width / 2 ? lineX - badgeW - 12 : lineX + 12;
    const badgeY = snapCanvas.height - badgeH - 12;

    sCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    sCtx.strokeStyle = rank === 1 ? '#eab308' : rank === 2 ? '#94a3b8' : '#38bdf8';
    sCtx.lineWidth = 1.5;
    sCtx.beginPath();
    sCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
    sCtx.fill();
    sCtx.stroke();

    // شارة الرواق والترتيب
    sCtx.fillStyle = rank === 1 ? '#eab308' : rank === 2 ? '#94a3b8' : '#f59e0b';
    sCtx.font = 'bold 13px sans-serif';
    sCtx.textAlign = 'right';
    const rankTitle = rank ? (rank === 1 ? '🥇 المركز الأول' : rank === 2 ? '🥈 المركز الثاني' : rank === 3 ? '🥉 المركز الثالث' : `#${rank}`) : '';
    sCtx.fillText(`${rankTitle} | رواق L${laneNumber}`, badgeX + badgeW - 8, badgeY + 18);

    // اسم المتسابق ورقمه والتوقيت
    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 12px sans-serif';
    const nameStr = runnerName ? `${runnerName} (صدر #${bib || laneNumber})` : `رواق L${laneNumber}`;
    sCtx.fillText(nameStr, badgeX + badgeW - 8, badgeY + 33);

    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'black 14px monospace';
    sCtx.textAlign = 'left';
    sCtx.fillText(timeFormatted, badgeX + 8, badgeY + 44);

    sCtx.restore();

    return snapCanvas.toDataURL('image/jpeg', 0.82);
  }
}

export const opticalGateDetector = new OpticalGateDetector();
export const motionDetector = opticalGateDetector;
