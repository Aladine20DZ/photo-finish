import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { aiAnalyticsService, CandidateRunner } from '../src/services/aiAnalyticsService';

describe('Stage 8: Advanced Analytics, SEO & Performance Verification', () => {
  describe('Scientific Wind Normalization', () => {
    it('normalizes tailwind (+1.8 m/s) to a slower equivalent time at 0.0 m/s', () => {
      const res = aiAnalyticsService.normalizeTimeToZeroWind(10.00, 1.8, 100);
      expect(res.normalizedTimeZeroWind).toBeGreaterThan(10.00);
      expect(res.deltaSeconds).toBeGreaterThan(0.05);
      expect(res.advantageDescription).toContain('مساعدة');
    });

    it('normalizes headwind (-1.5 m/s) to a faster equivalent time at 0.0 m/s', () => {
      const res = aiAnalyticsService.normalizeTimeToZeroWind(10.20, -1.5, 100);
      expect(res.normalizedTimeZeroWind).toBeLessThan(10.20);
      expect(res.advantageDescription).toContain('معاكسة');
    });

    it('leaves zero-wind time unchanged', () => {
      const res = aiAnalyticsService.normalizeTimeToZeroWind(10.15, 0.0, 100);
      expect(res.normalizedTimeZeroWind).toBe(10.15);
      expect(res.deltaSeconds).toBe(0);
    });
  });

  describe('World Athletics Heat Qualification (Q & q)', () => {
    it('correctly assigns Big Q to top 2 per heat and small q to next fastest times', () => {
      const runners: CandidateRunner[] = [
        // Heat 1
        { bib: 101, name: 'Runner H1-1', heatNumber: 1, timeSeconds: 10.10 }, // Q (1st H1)
        { bib: 102, name: 'Runner H1-2', heatNumber: 1, timeSeconds: 10.20 }, // Q (2nd H1)
        { bib: 103, name: 'Runner H1-3', heatNumber: 1, timeSeconds: 10.25 }, // q (fastest non-Q)
        { bib: 104, name: 'Runner H1-4', heatNumber: 1, timeSeconds: 10.40 }, // DNQ

        // Heat 2
        { bib: 201, name: 'Runner H2-1', heatNumber: 2, timeSeconds: 10.12 }, // Q (1st H2)
        { bib: 202, name: 'Runner H2-2', heatNumber: 2, timeSeconds: 10.22 }, // Q (2nd H2)
        { bib: 203, name: 'Runner H2-3', heatNumber: 2, timeSeconds: 10.28 }, // q (2nd fastest non-Q)
        { bib: 204, name: 'Runner H2-4', heatNumber: 2, timeSeconds: 10.50 }  // DNQ
      ];

      const results = aiAnalyticsService.computeHeatQualifiers(runners, 2, 2);

      // Verify Heat 1 auto qualifiers
      expect(results.find(r => r.bib === 101)?.qualificationStatus).toBe('Q');
      expect(results.find(r => r.bib === 102)?.qualificationStatus).toBe('Q');

      // Verify Heat 2 auto qualifiers
      expect(results.find(r => r.bib === 201)?.qualificationStatus).toBe('Q');
      expect(results.find(r => r.bib === 202)?.qualificationStatus).toBe('Q');

      // Verify small q time qualifiers
      expect(results.find(r => r.bib === 103)?.qualificationStatus).toBe('q');
      expect(results.find(r => r.bib === 203)?.qualificationStatus).toBe('q');

      // Verify DNQ
      expect(results.find(r => r.bib === 104)?.qualificationStatus).toBe('DNQ');
      expect(results.find(r => r.bib === 204)?.qualificationStatus).toBe('DNQ');
    });
  });

  describe('SEO & OpenGraph HTML Metadata Inspection', () => {
    it('verifies index.html has complete SEO and OpenGraph tags', () => {
      const indexPath = path.resolve(__dirname, '../index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');

      expect(content).toContain('<meta property="og:title"');
      expect(content).toContain('<meta property="og:description"');
      expect(content).toContain('<meta property="og:type"');
      expect(content).toContain('application/ld+json');
      expect(content).toContain('SoftwareApplication');
      expect(content).toContain('theme-color');
    });
  });
});
