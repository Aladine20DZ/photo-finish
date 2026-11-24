import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DICTIONARY } from '../src/services/i18nService';

/**
 * المرحلة 2 — أساس التصميم الكنسي:
 *   1) خطوط ذاتية الاستضافة (صفر CDN — عقد Offline الميداني)
 *   2) قاموس i18n موسّع ومربوط بـNavShell
 */
const repoRoot = path.resolve(__dirname, '..');

describe('Phase 2 — canonical design foundation', () => {
  it('self-hosts all 11 woff2 files and references them from index.css with zero Google Fonts CDN', () => {
    const fontsDir = path.join(repoRoot, 'public', 'fonts');
    const files = fs.readdirSync(fontsDir).filter(f => f.endsWith('.woff2')).sort();
    expect(files).toHaveLength(11);
    expect(files).toContain('cairo-arabic.woff2');
    expect(files).toContain('cairo-latin-ext.woff2');
    expect(files).toContain('cairo-latin.woff2');
    expect(files).toContain('chakra-petch-500-latin.woff2');
    expect(files).toContain('chakra-petch-700-latin.woff2');

    const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf-8');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');

    const css = fs.readFileSync(path.join(repoRoot, 'src', 'index.css'), 'utf-8');
    const faceCount = (css.match(/url\('\/fonts\/[^']+'\) format\('woff2'\)/g) || []).length;
    expect(faceCount).toBe(11);
    expect(css).not.toContain('fonts.googleapis.com');
    expect(css).not.toContain('fonts.gstatic.com');
  });

  it('keeps generated official documents on self-hosted fonts (no CDN import in document services)', () => {
    const unified = fs.readFileSync(path.join(repoRoot, 'src', 'services', 'unifiedExportService.ts'), 'utf-8');
    const docgen = fs.readFileSync(path.join(repoRoot, 'src', 'services', 'documentGeneratorService.ts'), 'utf-8');
    expect(unified).not.toContain('fonts.googleapis.com');
    expect(docgen).not.toContain('fonts.googleapis.com');
    expect(unified).toContain('/fonts/cairo-arabic.woff2');
    expect(docgen).toContain('/fonts/chakra-petch-700-latin.woff2');
  });

  it('extends the i18n dictionary with navigation shell keys in ar/fr/en', () => {
    const requiredKeys = [
      'nav_home', 'nav_sheets', 'nav_results', 'nav_competitions', 'nav_entries',
      'nav_judge_workspace', 'nav_league_admin', 'status_cloud_connected', 'status_offline_local',
      'action_manual_timing', 'action_duty_code', 'action_portals_login', 'action_enter_field',
      'label_league_account', 'theme_night', 'theme_solar', 'theme_day', 'comps_selector',
    ];
    requiredKeys.forEach(key => {
      const entry = DICTIONARY[key];
      expect(entry, `missing dictionary key: ${key}`).toBeDefined();
      expect(entry.ar.length).toBeGreaterThan(0);
      expect(entry.fr.length).toBeGreaterThan(0);
      expect(entry.en.length).toBeGreaterThan(0);
    });
  });

  it('wires NavShell labels to the dictionary (no hardcoded primary nav labels)', () => {
    const nav = fs.readFileSync(path.join(repoRoot, 'src', 'components', 'navigation', 'NavShell.tsx'), 'utf-8');
    expect(nav).toContain("t('nav_home'");
    expect(nav).toContain("t('nav_sheets'");
    expect(nav).toContain("t('nav_judge_workspace'");
    expect(nav).toContain("t('nav_league_admin'");
    expect(nav).toContain("t('action_enter_field'");
    expect(nav).toContain("t('status_cloud_connected'");
    expect(nav).toContain("t('action_duty_code'");
    // لا عودة للقيم الصلبة القديمة
    expect(nav).not.toContain("label: 'الرئيسية'");
    expect(nav).not.toContain('دخول الميدان والتحكيم</span>');
  });
});
