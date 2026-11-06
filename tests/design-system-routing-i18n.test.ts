import { describe, it, expect } from 'vitest';
import { i18n, DICTIONARY, SupportedLanguage } from '../src/services/i18nService';

describe('Stage 2: Design System, Navigation Shell, Routing & i18n', () => {
  describe('Internationalization & Multilingual Matrix', () => {
    it('verifies all translation keys have valid values for ar, fr, and en', () => {
      const keys = Object.keys(DICTIONARY);
      expect(keys.length).toBeGreaterThan(15);

      for (const key of keys) {
        const item = DICTIONARY[key];
        expect(item.ar).toBeDefined();
        expect(item.ar.trim().length).toBeGreaterThan(0);
        expect(item.fr).toBeDefined();
        expect(item.fr.trim().length).toBeGreaterThan(0);
        expect(item.en).toBeDefined();
        expect(item.en.trim().length).toBeGreaterThan(0);
      }
    });

    it('enforces native RTL for Arabic and LTR for French and English', () => {
      i18n.setLanguage('ar');
      expect(i18n.getLanguage()).toBe('ar');
      expect(i18n.getDirection()).toBe('rtl');

      i18n.setLanguage('fr');
      expect(i18n.getLanguage()).toBe('fr');
      expect(i18n.getDirection()).toBe('ltr');

      i18n.setLanguage('en');
      expect(i18n.getLanguage()).toBe('en');
      expect(i18n.getDirection()).toBe('ltr');

      // Reset back to Arabic
      i18n.setLanguage('ar');
      expect(i18n.getDirection()).toBe('rtl');
    });

    it('translates known keys accurately and falls back gracefully for unknown keys', () => {
      i18n.setLanguage('ar');
      expect(i18n.t('app_name')).toBe('PHOTO FINISH PRO AI');
      expect(i18n.t('save')).toBe('حفظ');

      i18n.setLanguage('fr');
      expect(i18n.t('save')).toBe('Enregistrer');

      i18n.setLanguage('en');
      expect(i18n.t('save')).toBe('Save');

      // Unknown key fallback
      expect(i18n.t('non_existent_key_xyz', 'Default Value')).toBe('Default Value');
      expect(i18n.t('non_existent_key_xyz')).toBe('non_existent_key_xyz');

      // Reset back to Arabic
      i18n.setLanguage('ar');
    });
  });
});
