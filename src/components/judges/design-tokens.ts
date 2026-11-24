/**
 * PHOTO FINISH PRO — SMART JUDGE WORKSPACE DESIGN TOKENS
 * Official Athletic Field & Competition Interface Styling
 *
 * جسر كنسي (المرحلة 2): كل القيم تشير إلى متغيرات CSS المعرفة في src/index.css
 * حصراً (--field-*) — تعريف واحد للمصدر، بلا قيم سداسية متناثرة في المكونات.
 * القيم الاحتياطية داخل var() تطابق التعريف الكنسي للسلامة خارج DOM.
 *
 * Strict Rule: Solid surfaces only for full contrast outdoors.
 */

export const JUDGE_THEME = {
  colors: {
    deepNavy: 'var(--field-navy, #101D35)',
    navySurface: 'var(--field-navy-surface, #0E172A)',
    navyBorder: 'var(--field-navy-border, #1E293B)',
    primaryBlue: 'var(--field-blue, #1677E8)',
    primaryBlueHover: 'var(--field-blue-hover, #1260BD)',
    primaryBlueSoft: 'var(--field-blue-soft, rgba(22, 119, 232, 0.12))',
    successGreen: 'var(--field-green, #13A879)',
    successGreenHover: 'var(--field-green-hover, #0E8962)',
    successGreenSoft: 'var(--field-green-soft, rgba(19, 168, 121, 0.15))',
    backgroundLight: 'var(--field-bg-light, #F2F5F9)',
    white: 'var(--field-white, #FFFFFF)',
    amberWarning: 'var(--field-amber, #F59E0B)',
    amberSoft: 'var(--field-amber-soft, rgba(245, 158, 11, 0.15))',
    dangerRed: 'var(--field-red, #EF4444)',
    dangerSoft: 'var(--field-red-soft, rgba(239, 68, 68, 0.15))',
    textSlate: 'var(--field-text-slate, #94A3B8)',
    textMuted: 'var(--field-text-muted, #64748B)',
    borderSlate: 'var(--field-border-slate, #334155)',
  },
  typography: {
    fontFamily: 'Cairo, "IBM Plex Sans Arabic", system-ui, -apple-system, sans-serif',
  },
  radius: {
    sm: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    '2xl': '1.25rem', // 20px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  }
};
