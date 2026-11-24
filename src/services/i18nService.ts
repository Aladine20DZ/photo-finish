/**
 * PHOTO FINISH PRO AI — Multilingual & RTL Internationalization Engine (Stage 2)
 * Native RTL support for Arabic, with instant switching to French and English.
 */

import { useState, useEffect } from 'react';

export type SupportedLanguage = 'ar' | 'fr' | 'en';
export type TextDirection = 'rtl' | 'ltr';

export interface Translations {
  [key: string]: {
    ar: string;
    fr: string;
    en: string;
  };
}

export const DICTIONARY: Translations = {
  // Navigation
  app_name: {
    ar: 'PHOTO FINISH PRO AI',
    fr: 'PHOTO FINISH PRO AI',
    en: 'PHOTO FINISH PRO AI'
  },
  app_tagline: {
    ar: 'المنصة الذكية لإدارة وتحكيم وتوقيت ألعاب القوى',
    fr: 'Plateforme Intelligente de Gestion et Chronométrage d’Athlétisme',
    en: 'Smart Athletics Management, Judging & Timing Platform'
  },
  nav_public: {
    ar: 'البوابة العامة والنتائج',
    fr: 'Portail Public & Résultats',
    en: 'Public Portal & Results'
  },
  nav_league: {
    ar: 'إدارة الرابطة والاتحاد',
    fr: 'Suite Exécutive Ligue',
    en: 'League Executive Suite'
  },
  nav_coach: {
    ar: 'بوابة المدربين والأندية',
    fr: 'Portail Entraîneurs & Clubs',
    en: 'Coaches & Clubs Portal'
  },
  nav_field: {
    ar: 'وضع المنافسة والمضمار',
    fr: 'Mode Compétition & Piste',
    en: 'Competition & Field Mode'
  },
  nav_ai: {
    ar: 'المساعد الذكي والتحليلات',
    fr: 'Assistant IA & Analyses',
    en: 'AI Assistant & Analytics'
  },
  nav_admin: {
    ar: 'الإدارة والتراخيص',
    fr: 'Administration & Licences',
    en: 'Admin & Licenses'
  },

  // Navigation Shell — الشريط الرئيسي وشريط الحياة (المرحلة 2)
  nav_home: {
    ar: 'الرئيسية',
    fr: 'Accueil',
    en: 'Home'
  },
  nav_sheets: {
    ar: 'أوراق النتائج الرقمية',
    fr: 'Feuilles de Résultats Numériques',
    en: 'Digital Result Sheets'
  },
  nav_results: {
    ar: 'النتائج المعتمدة',
    fr: 'Résultats Homologués',
    en: 'Certified Results'
  },
  nav_competitions: {
    ar: 'المنافسات والرزنامة',
    fr: 'Compétitions & Calendrier',
    en: 'Competitions & Calendar'
  },
  nav_entries: {
    ar: 'النوادي والرياضيون',
    fr: 'Clubs & Athlètes',
    en: 'Clubs & Athletes'
  },
  nav_judge_workspace: {
    ar: 'مساحة الحكم الميداني',
    fr: 'Espace Juge de Terrain',
    en: 'Field Judge Workspace'
  },
  nav_league_admin: {
    ar: 'إدارة الرابطة',
    fr: 'Administration Ligue',
    en: 'League Administration'
  },
  status_cloud_connected: {
    ar: 'السحابة متصلة',
    fr: 'Cloud Connecté',
    en: 'Cloud Connected'
  },
  status_offline_local: {
    ar: 'أوفلاين محلي',
    fr: 'Hors-Ligne Local',
    en: 'Offline Local'
  },
  action_manual_timing: {
    ar: 'توقيت يدوي',
    fr: 'Chrono Manuel',
    en: 'Manual Timing'
  },
  action_duty_code: {
    ar: 'كود المهمة 🔑',
    fr: 'Code de Mission 🔑',
    en: 'Duty Code 🔑'
  },
  action_portals_login: {
    ar: 'دخول البوابات 🔐',
    fr: 'Connexion Portails 🔐',
    en: 'Portal Sign-In 🔐'
  },
  action_enter_field: {
    ar: 'دخول الميدان والتحكيم',
    fr: 'Entrer Terrain & Juge',
    en: 'Enter Field & Judging'
  },
  label_league_account: {
    ar: 'حساب الرابطة:',
    fr: 'Compte Ligue :',
    en: 'League Account:'
  },
  theme_night: {
    ar: 'ليلي',
    fr: 'Nuit',
    en: 'Night'
  },
  theme_solar: {
    ar: 'ميداني شمسي',
    fr: 'Terrain Solaire',
    en: 'Solar Field'
  },
  theme_day: {
    ar: 'نهاري',
    fr: 'Jour',
    en: 'Day'
  },
  comps_selector: {
    ar: 'اختر المنافسة النشطة:',
    fr: 'Choisir la compétition active :',
    en: 'Select active competition:'
  },

  // Status & Sync
  status_online: {
    ar: 'سحابة Supabase متصلة',
    fr: 'Supabase Connecté',
    en: 'Supabase Online'
  },
  status_offline: {
    ar: 'وضع ميداني دون اتصال (أوفلاين)',
    fr: 'Mode Terrain Hors-Ligne',
    en: 'Offline Field Mode'
  },
  status_synced: {
    ar: 'البيانات متزامنة',
    fr: 'Données Synchronisées',
    en: 'Data Synced'
  },
  syncing: {
    ar: 'جارٍ المزامنة...',
    fr: 'Synchronisation...',
    en: 'Syncing...'
  },

  // Roles
  role_super_admin: {
    ar: 'المدير العام للمنظومة',
    fr: 'Super Administrateur',
    en: 'Super Admin'
  },
  role_league_admin: {
    ar: 'مدير الرابطة / الاتحاد',
    fr: 'Administrateur Ligue',
    en: 'League Admin'
  },
  role_chief_judge: {
    ar: 'رئيس هيئة التحكيم',
    fr: 'Juge-Arbitre en Chef',
    en: 'Chief Judge'
  },
  role_field_judge: {
    ar: 'حكم ميداني / ميقاتي',
    fr: 'Juge de Terrain',
    en: 'Field Judge'
  },
  role_timing_operator: {
    ar: 'مشغّل كاميرا Photo Finish',
    fr: 'Opérateur Photo Finish',
    en: 'Timing Operator'
  },
  role_club_coach: {
    ar: 'مدرب نادي معتمد',
    fr: 'Entraîneur de Club',
    en: 'Club Coach'
  },
  role_public_viewer: {
    ar: 'مشاهد / زائر',
    fr: 'Visiteur Public',
    en: 'Public Viewer'
  },

  // Common Actions
  save: { ar: 'حفظ', fr: 'Enregistrer', en: 'Save' },
  cancel: { ar: 'إلغاء', fr: 'Annuler', en: 'Cancel' },
  confirm: { ar: 'تأكيد', fr: 'Confirmer', en: 'Confirm' },
  close: { ar: 'إغلاق', fr: 'Fermer', en: 'Close' },
  search: { ar: 'بحث...', fr: 'Rechercher...', en: 'Search...' },
  export_pdf: { ar: 'تصدير PDF رسمي', fr: 'Exporter PDF Officiel', en: 'Export Official PDF' },
  export_csv: { ar: 'تصدير Excel CSV', fr: 'Exporter Excel CSV', en: 'Export Excel CSV' },
  filter: { ar: 'تصفية', fr: 'Filtrer', en: 'Filter' },
  live_badge: { ar: 'مباشر 🔴', fr: 'EN DIRECT 🔴', en: 'LIVE 🔴' },
  certified_badge: { ar: 'معتمد رسمياً ⚖️', fr: 'Homologué Officiel ⚖️', en: 'Officially Certified ⚖️' }
};

const STORAGE_LANG_KEY = 'pfp_preferred_language_v1';

class I18nManager {
  private currentLanguage: SupportedLanguage = 'ar';
  private listeners: Set<(lang: SupportedLanguage) => void> = new Set();

  constructor() {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_LANG_KEY) as SupportedLanguage;
        if (saved && ['ar', 'fr', 'en'].includes(saved)) {
          this.currentLanguage = saved;
        }
      } catch {}
    }
    this.applyDocumentDirection();
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public getDirection(): TextDirection {
    return this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
  }

  public setLanguage(lang: SupportedLanguage): void {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(STORAGE_LANG_KEY, lang); } catch {}
    }
    this.applyDocumentDirection();
    this.listeners.forEach(fn => fn(lang));
  }

  public t(key: string, fallback?: string): string {
    const entry = DICTIONARY[key];
    if (!entry) return fallback || key;
    return entry[this.currentLanguage] || entry.ar || fallback || key;
  }

  public subscribe(fn: (lang: SupportedLanguage) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private applyDocumentDirection(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.currentLanguage;
      document.documentElement.dir = this.getDirection();
    }
  }
}

export const i18n = new I18nManager();

/**
 * React Hook for multilingual translation in components
 */
export function useTranslation() {
  const [lang, setLang] = useState<SupportedLanguage>(() => i18n.getLanguage());

  useEffect(() => {
    return i18n.subscribe((newLang) => setLang(newLang));
  }, []);

  return {
    lang,
    dir: i18n.getDirection(),
    t: (key: string, fallback?: string) => i18n.t(key, fallback),
    setLanguage: (newLang: SupportedLanguage) => i18n.setLanguage(newLang)
  };
}
