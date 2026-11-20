/**
 * PHOTO FINISH PRO — SMART JUDGE WORKSPACE DESIGN TOKENS
 * Official Athletic Field & Competition Interface Styling
 * Conforms to Master Specification:
 * - Deep Navy: #101D35
 * - Primary Blue: #1677E8
 * - Success Green: #13A879
 * - Background Light: #F2F5F9
 * - White: #FFFFFF
 * - Warning Amber: #F59E0B
 * - Danger / Foul Red: #EF4444
 *
 * Strict Rule: Solid surfaces only for full contrast outdoors.
 */

export const JUDGE_THEME = {
  colors: {
    deepNavy: '#101D35',
    navySurface: '#0E172A',
    navyBorder: '#1E293B',
    primaryBlue: '#1677E8',
    primaryBlueHover: '#1260BD',
    primaryBlueSoft: 'rgba(22, 119, 232, 0.12)',
    successGreen: '#13A879',
    successGreenHover: '#0E8962',
    successGreenSoft: 'rgba(19, 168, 121, 0.15)',
    backgroundLight: '#F2F5F9',
    white: '#FFFFFF',
    amberWarning: '#F59E0B',
    amberSoft: 'rgba(245, 158, 11, 0.15)',
    dangerRed: '#EF4444',
    dangerSoft: 'rgba(239, 68, 68, 0.15)',
    textSlate: '#94A3B8',
    textMuted: '#64748B',
    borderSlate: '#334155',
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
