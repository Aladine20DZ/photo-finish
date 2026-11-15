import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DESIGN_TOKENS, getStoredThemeMode, setThemeMode } from '../src/components/design-system/tokens';

describe('Design System Track Pro (World Athletics Style) Tokens & Components', () => {
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
    (globalThis as any).window = globalThis;
    (globalThis as any).document = {
      documentElement: {
        setAttribute: () => {},
        classList: {
          add: () => {},
          remove: () => {},
        },
      },
    };
  });

  it('contains all required World Athletics Track Pro CSS variables and design tokens in tokens.ts', () => {
    expect(DESIGN_TOKENS.bg).toContain('#FFFFFF');
    expect(DESIGN_TOKENS.surface).toContain('#FFFFFF');
    expect(DESIGN_TOKENS.surfaceAlt).toContain('#F3F3F1');
    expect(DESIGN_TOKENS.border).toContain('#DADAD6');
    expect(DESIGN_TOKENS.borderStrong).toContain('#0A0A0A');
    expect(DESIGN_TOKENS.ink).toContain('#0A0A0A');
    expect(DESIGN_TOKENS.block).toContain('#0A0A0A');
    expect(DESIGN_TOKENS.block2).toContain('#1C1C1A');
    expect(DESIGN_TOKENS.accent).toContain('#E5321B');
    expect(DESIGN_TOKENS.accentHover).toContain('#C42A16');
    expect(DESIGN_TOKENS.accentSoft).toContain('#FDECE9');
    expect(DESIGN_TOKENS.success).toContain('#0E7A3E');
    expect(DESIGN_TOKENS.warning).toContain('#B26A00');
    expect(DESIGN_TOKENS.danger).toContain('#B3261E');
    expect(DESIGN_TOKENS.info).toContain('#0B5CAD');
    expect(DESIGN_TOKENS.radius.sm).toContain('2px');
    expect(DESIGN_TOKENS.radius.md).toContain('4px');
    expect(DESIGN_TOKENS.radius.lg).toContain('6px');
    expect(DESIGN_TOKENS.spacing[1]).toBe('4px');
    expect(DESIGN_TOKENS.fontSizes.xs).toBe('12px');
    expect(DESIGN_TOKENS.fontSizes['2xl']).toBe('28px');
    expect(DESIGN_TOKENS.fontSizes['3xl']).toBe('40px');
    expect(DESIGN_TOKENS.fontSizes['4xl']).toBe('64px');
  });

  it('verifies World Athletics tokens are present in src/index.css', () => {
    const cssPath = path.resolve(__dirname, '../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('--bg: #FFFFFF');
    expect(cssContent).toContain('--block: #0A0A0A');
    expect(cssContent).toContain('--accent: #E5321B');
    expect(cssContent).toContain('--radius-sm: 2px');
    expect(cssContent).toContain('--border-strong: #0A0A0A');
  });

  it('handles light (default) and dark themes correctly in World Athletics style', () => {
    expect(getStoredThemeMode()).toBe('light');
    setThemeMode('dark');
    expect(getStoredThemeMode()).toBe('dark');
    setThemeMode('light');
    expect(getStoredThemeMode()).toBe('light');
  });

  it('exposes all design system components including Card, RankBadge, StatusPill, PageHeader', async () => {
    const ds = await import('../src/components/design-system');
    // New World Athletics core components
    expect(ds.Card).toBeDefined();
    expect(ds.RankBadge).toBeDefined();
    expect(ds.StatusPill).toBeDefined();
    expect(ds.PageHeader).toBeDefined();
    // Legacy backwards-compatibility alias
    expect(ds.GlassCard).toBeDefined();
    // High-density & athletic components
    expect(ds.StatsCard).toBeDefined();
    expect(ds.Button).toBeDefined();
    expect(ds.Input).toBeDefined();
    expect(ds.Select).toBeDefined();
    expect(ds.Table).toBeDefined();
    expect(ds.Modal).toBeDefined();
    expect(ds.Drawer).toBeDefined();
    expect(ds.ToastContainer).toBeDefined();
    expect(ds.Tabs).toBeDefined();
    expect(ds.Badge).toBeDefined();
    expect(ds.EmptyState).toBeDefined();
    expect(ds.SplitLayout).toBeDefined();
    expect(ds.Stepper).toBeDefined();
    expect(ds.Timeline).toBeDefined();
    expect(ds.AdminDashboardLayout).toBeDefined();
    expect(ds.PublicLayout).toBeDefined();
    expect(ds.GlassLoginPage).toBeDefined();
    expect(ds.DesignSystemShowcase).toBeDefined();
  }, 120000);

  it('strictly verifies zero occurrences of backdrop-filter or backdrop-blur in all src/ files', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const violations: { file: string; line: number; text: string }[] = [];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(tsx?|css)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (/backdrop-filter|backdrop-blur/i.test(line)) {
              violations.push({
                file: path.relative(srcDir, fullPath),
                line: index + 1,
                text: line.trim(),
              });
            }
          });
        }
      }
    }

    scanDir(srcDir);
    expect(violations, `Found forbidden backdrop-filter/backdrop-blur in: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
});
