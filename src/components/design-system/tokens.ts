/**
 * PHOTO FINISH PRO AI — نظام تصميم مضمار (Track Pro) بنمط World Athletics الدولي
 * Central CSS Variables, Theme colors, Radius, Typography, Shadows, and Spacing.
 * Conforms to World Athletics branding guidelines, WCAG AA contrast standards, and self-hosted Arabic typography.
 */

export const DESIGN_TOKENS = {
  // World Athletics Track Pro Core Tokens
  bg: 'var(--bg, #FFFFFF)',
  surface: 'var(--surface, #FFFFFF)',
  surfaceAlt: 'var(--surface-alt, #F3F3F1)',
  surface2: 'var(--surface-alt, #F3F3F1)',
  border: 'var(--border, #DADAD6)',
  borderStrong: 'var(--border-strong, #0A0A0A)',
  
  ink: 'var(--ink, #0A0A0A)',
  ink2: 'var(--ink-2, #4A4A47)',
  ink3: 'var(--ink-3, #7C7C77)',
  inkInverse: 'var(--ink-inverse, #FFFFFF)',
  
  block: 'var(--block, #0A0A0A)',
  block2: 'var(--block-2, #1C1C1A)',
  
  accent: 'var(--accent, #E5321B)',
  accentHover: 'var(--accent-hover, #C42A16)',
  accentSoft: 'var(--accent-soft, #FDECE9)',
  
  success: 'var(--success, #0E7A3E)',
  warning: 'var(--warning, #B26A00)',
  danger: 'var(--danger, #B3261E)',
  info: 'var(--info, #0B5CAD)',

  // Legacy mappings for backward compatibility
  primary: 'var(--block, #0A0A0A)',
  primaryHover: 'var(--block-2, #1C1C1A)',
  primarySoft: 'var(--surface-alt, #F3F3F1)',

  // Colors dictionary
  colors: {
    bg: 'var(--bg, #FFFFFF)',
    surface: 'var(--surface, #FFFFFF)',
    surfaceAlt: 'var(--surface-alt, #F3F3F1)',
    surface2: 'var(--surface-alt, #F3F3F1)',
    border: 'var(--border, #DADAD6)',
    borderStrong: 'var(--border-strong, #0A0A0A)',
    ink: 'var(--ink, #0A0A0A)',
    ink2: 'var(--ink-2, #4A4A47)',
    ink3: 'var(--ink-3, #7C7C77)',
    inkInverse: 'var(--ink-inverse, #FFFFFF)',
    block: 'var(--block, #0A0A0A)',
    block2: 'var(--block-2, #1C1C1A)',
    accent: 'var(--accent, #E5321B)',
    accentHover: 'var(--accent-hover, #C42A16)',
    accentSoft: 'var(--accent-soft, #FDECE9)',
    success: 'var(--success, #0E7A3E)',
    warning: 'var(--warning, #B26A00)',
    danger: 'var(--danger, #B3261E)',
    info: 'var(--info, #0B5CAD)',
    primary: 'var(--block, #0A0A0A)',
    primaryHover: 'var(--block-2, #1C1C1A)',
    primarySoft: 'var(--surface-alt, #F3F3F1)',
    // Backwards-compatibility aliases
    bgFrom: 'var(--bg, #FFFFFF)',
    bgVia: 'var(--surface-alt, #F3F3F1)',
    bgTo: 'var(--surface, #FFFFFF)',
    textPrimary: 'var(--ink, #0A0A0A)',
    textSecondary: 'var(--ink-2, #4A4A47)',
    glassBg: 'var(--surface, #FFFFFF)',
    glassBgStrong: 'var(--surface, #FFFFFF)',
    glassBorder: 'var(--border, #DADAD6)',
  },

  radius: {
    sm: 'var(--radius-sm, 2px)',
    md: 'var(--radius-md, 4px)',
    lg: 'var(--radius-lg, 6px)',
    xl: 'var(--radius-lg, 6px)',
  },

  shadows: {
    1: 'var(--shadow-1, none)',
    2: 'var(--shadow-2, 0 2px 0 rgba(10,10,10,.12))',
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
  },

  fontSizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    xl: '20px',
    '2xl': '28px',
    '3xl': '40px',
    '4xl': '64px',
  },

  blur: '0px',
  shadow: 'var(--shadow-1, none)',
} as const;

export type ThemeMode = 'dark' | 'light';

export const setThemeMode = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  if (mode === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
  try {
    localStorage.setItem('photo_finish_theme', mode);
  } catch {}
};

export const getStoredThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('photo_finish_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'light';
};
