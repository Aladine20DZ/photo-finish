/**
 * PHOTO FINISH PRO AI — Official Athletics Disciplines Reference Table (Seed)
 * Complete, standardized World Athletics discipline catalog.
 * Expandable by administrators and partitioned into:
 * 1. Course (Races: Sprints, Middle-distance, Long-distance, Hurdles, Steeplechase, Race Walking, Road Races)
 *    - Sub-group: Relays (4x100m, 4x400m, Mixed, Medley)
 * 2. Concours (Field Events: High Jump, Pole Vault, Long Jump, Triple Jump, Shot Put, Discus, Javelin, Hammer)
 * 3. Combined Events (Decathlon, Heptathlon, Pentathlon) — classified as multi-discipline point-scoring events.
 */

export type DisciplineGroup = 'course' | 'concours' | 'combined';
export type DisciplineSubCategory = 
  | 'sprint' 
  | 'middle_distance' 
  | 'long_distance' 
  | 'hurdles' 
  | 'steeplechase' 
  | 'race_walking' 
  | 'road_race' 
  | 'relay' 
  | 'jump' 
  | 'throw' 
  | 'combined';

export interface AthleticsDiscipline {
  id: string;
  code: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  group: DisciplineGroup;
  subCategory: DisciplineSubCategory;
  isRelay?: boolean;
  standardDistanceMeters?: number;
  apparatusWeightKg?: {
    seniorM?: number;
    seniorF?: number;
    u20M?: number;
    u18M?: number;
    u16M?: number;
  };
  windGaugeRequired: boolean;
  defaultRounds: ('heats' | 'semi' | 'final')[];
  isCustom?: boolean;
}

export const SEED_ATHLETICS_DISCIPLINES: AthleticsDiscipline[] = [
  // ══════════════════════════════════════════════════════════════════
  // 1. COURSE (سباقات الجري)
  // ══════════════════════════════════════════════════════════════════

  // أ) سباقات السرعة (Sprints)
  {
    id: 'disc_60m',
    code: '60M',
    nameAr: '60 متر',
    nameFr: '60 mètres',
    nameEn: '60 metres',
    group: 'course',
    subCategory: 'sprint',
    standardDistanceMeters: 60,
    windGaugeRequired: false, // صالات أو مضمار مستقيم
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_100m',
    code: '100M',
    nameAr: '100 متر',
    nameFr: '100 mètres',
    nameEn: '100 metres',
    group: 'course',
    subCategory: 'sprint',
    standardDistanceMeters: 100,
    windGaugeRequired: true,
    defaultRounds: ['heats', 'semi', 'final']
  },
  {
    id: 'disc_200m',
    code: '200M',
    nameAr: '200 متر',
    nameFr: '200 mètres',
    nameEn: '200 metres',
    group: 'course',
    subCategory: 'sprint',
    standardDistanceMeters: 200,
    windGaugeRequired: true,
    defaultRounds: ['heats', 'semi', 'final']
  },
  {
    id: 'disc_400m',
    code: '400M',
    nameAr: '400 متر',
    nameFr: '400 mètres',
    nameEn: '400 metres',
    group: 'course',
    subCategory: 'sprint',
    standardDistanceMeters: 400,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'semi', 'final']
  },

  // ب) المسافات المتوسطة (Middle Distance)
  {
    id: 'disc_800m',
    code: '800M',
    nameAr: '800 متر',
    nameFr: '800 mètres',
    nameEn: '800 metres',
    group: 'course',
    subCategory: 'middle_distance',
    standardDistanceMeters: 800,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'semi', 'final']
  },
  {
    id: 'disc_1500m',
    code: '1500M',
    nameAr: '1500 متر',
    nameFr: '1500 mètres',
    nameEn: '1500 metres',
    group: 'course',
    subCategory: 'middle_distance',
    standardDistanceMeters: 1500,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'final']
  },

  // ج) المسافات الطويلة (Long Distance)
  {
    id: 'disc_3000m',
    code: '3000M',
    nameAr: '3000 متر',
    nameFr: '3000 mètres',
    nameEn: '3000 metres',
    group: 'course',
    subCategory: 'long_distance',
    standardDistanceMeters: 3000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_5000m',
    code: '5000M',
    nameAr: '5000 متر',
    nameFr: '5000 mètres',
    nameEn: '5000 metres',
    group: 'course',
    subCategory: 'long_distance',
    standardDistanceMeters: 5000,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_10000m',
    code: '10000M',
    nameAr: '10000 متر',
    nameFr: '10000 mètres',
    nameEn: '10000 metres',
    group: 'course',
    subCategory: 'long_distance',
    standardDistanceMeters: 10000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },

  // د) الحواجز والموانع (Hurdles & Steeplechase)
  {
    id: 'disc_60m_h',
    code: '60MH',
    nameAr: '60 متر حواجز (صالات ومضمار مستقيم)',
    nameFr: '60 mètres haies',
    nameEn: '60 metres hurdles',
    group: 'course',
    subCategory: 'hurdles',
    standardDistanceMeters: 60,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_100m_h',
    code: '100MH',
    nameAr: '100 متر حواجز (سيدات)',
    nameFr: '100 mètres haies (F)',
    nameEn: '100 metres hurdles (W)',
    group: 'course',
    subCategory: 'hurdles',
    standardDistanceMeters: 100,
    windGaugeRequired: true,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_110m_h',
    code: '110MH',
    nameAr: '110 متر حواجز (رجال)',
    nameFr: '110 mètres haies (H)',
    nameEn: '110 metres hurdles (M)',
    group: 'course',
    subCategory: 'hurdles',
    standardDistanceMeters: 110,
    windGaugeRequired: true,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_400m_h',
    code: '400MH',
    nameAr: '400 متر حواجز',
    nameFr: '400 mètres haies',
    nameEn: '400 metres hurdles',
    group: 'course',
    subCategory: 'hurdles',
    standardDistanceMeters: 400,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_3000m_st',
    code: '3000MST',
    nameAr: '3000 متر موانع',
    nameFr: '3000 mètres steeple',
    nameEn: '3000 metres steeplechase',
    group: 'course',
    subCategory: 'steeplechase',
    standardDistanceMeters: 3000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },

  // هـ) المشي الرياضي (Race Walking)
  {
    id: 'disc_3000m_w',
    code: '3000MW',
    nameAr: '3000 متر مشي (حلبة)',
    nameFr: '3000m marche (piste)',
    nameEn: '3000m race walk (track)',
    group: 'course',
    subCategory: 'race_walking',
    standardDistanceMeters: 3000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_5000m_w',
    code: '5000MW',
    nameAr: '5000 متر مشي (حلبة)',
    nameFr: '5000m marche (piste)',
    nameEn: '5000m race walk (track)',
    group: 'course',
    subCategory: 'race_walking',
    standardDistanceMeters: 5000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_10000m_w',
    code: '10000MW',
    nameAr: '10000 متر مشي (حلبة)',
    nameFr: '10000m marche (piste)',
    nameEn: '10000m race walk (track)',
    group: 'course',
    subCategory: 'race_walking',
    standardDistanceMeters: 10000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_20km_w',
    code: '20KMW',
    nameAr: '20 كم مشي (طريق)',
    nameFr: '20km marche (route)',
    nameEn: '20km race walk (road)',
    group: 'course',
    subCategory: 'race_walking',
    standardDistanceMeters: 20000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_35km_w',
    code: '35KMW',
    nameAr: '35 كم مشي (طريق)',
    nameFr: '35km marche (route)',
    nameEn: '35km race walk (road)',
    group: 'course',
    subCategory: 'race_walking',
    standardDistanceMeters: 35000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },

  // و) سباقات الطريق والماراثون (Road Races)
  {
    id: 'disc_10km_road',
    code: '10KMR',
    nameAr: '10 كم على الطريق',
    nameFr: '10km sur route',
    nameEn: '10km road race',
    group: 'course',
    subCategory: 'road_race',
    standardDistanceMeters: 10000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_half_marathon',
    code: 'HALF_MARA',
    nameAr: 'نصف ماراثون (21.097 كم)',
    nameFr: 'Semi-marathon (21.097 km)',
    nameEn: 'Half marathon (21.097 km)',
    group: 'course',
    subCategory: 'road_race',
    standardDistanceMeters: 21097,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_marathon',
    code: 'MARATHON',
    nameAr: 'ماراثون كامل (42.195 كم)',
    nameFr: 'Marathon (42.195 km)',
    nameEn: 'Marathon (42.195 km)',
    group: 'course',
    subCategory: 'road_race',
    standardDistanceMeters: 42195,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },

  // ز) سباقات التتابع - قسم فرعي تحت السباقات (Relays)
  {
    id: 'disc_4x100m_m',
    code: '4X100M_M',
    nameAr: 'تتابع 4×100 متر ذكور',
    nameFr: 'Relais 4×100m (H)',
    nameEn: '4x100m relay (M)',
    group: 'course',
    subCategory: 'relay',
    isRelay: true,
    standardDistanceMeters: 400,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_4x100m_f',
    code: '4X100M_F',
    nameAr: 'تتابع 4×100 متر إناث',
    nameFr: 'Relais 4×100m (F)',
    nameEn: '4x100m relay (W)',
    group: 'course',
    subCategory: 'relay',
    isRelay: true,
    standardDistanceMeters: 400,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_4x400m_m',
    code: '4X400M_M',
    nameAr: 'تتابع 4×400 متر ذكور',
    nameFr: 'Relais 4×400m (H)',
    nameEn: '4x400m relay (M)',
    group: 'course',
    subCategory: 'relay',
    isRelay: true,
    standardDistanceMeters: 1600,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_4x400m_f',
    code: '4X400M_F',
    nameAr: 'تتابع 4×400 متر إناث',
    nameFr: 'Relais 4×400m (F)',
    nameEn: '4x400m relay (W)',
    group: 'course',
    subCategory: 'relay',
    isRelay: true,
    standardDistanceMeters: 1600,
    windGaugeRequired: false,
    defaultRounds: ['heats', 'final']
  },
  {
    id: 'disc_4x400m_mixed',
    code: '4X400M_MIXED',
    nameAr: 'تتابع 4×400 متر مختلط (2 ذكور + 2 إناث)',
    nameFr: 'Relais 4×400m mixte',
    nameEn: '4x400m mixed relay',
    group: 'course',
    subCategory: 'relay',
    isRelay: true,
    standardDistanceMeters: 1600,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_medley_relay',
    code: 'SMR',
    nameAr: 'التتابع المتنوع (Medley Relay - السويدي 100-200-300-400)',
    nameFr: 'Relais Medley (100-200-300-400m)',
    nameEn: 'Swedish Medley relay',
    group: 'course',
    subCategory: 'relay',
    isRelay: true,
    standardDistanceMeters: 1000,
    windGaugeRequired: false,
    defaultRounds: ['final']
  },

  // ══════════════════════════════════════════════════════════════════
  // 2. CONCOURS (مسابقات الميدان: القفز والرمي)
  // ══════════════════════════════════════════════════════════════════

  // أ) مسابقات القفز (Jumps)
  {
    id: 'disc_high_jump',
    code: 'HJ',
    nameAr: 'الوثب العالي',
    nameFr: 'Saut en hauteur',
    nameEn: 'High jump',
    group: 'concours',
    subCategory: 'jump',
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_pole_vault',
    code: 'PV',
    nameAr: 'القفز بالزانة',
    nameFr: 'Saut à la perche',
    nameEn: 'Pole vault',
    group: 'concours',
    subCategory: 'jump',
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_long_jump',
    code: 'LJ',
    nameAr: 'الوثب الطويل',
    nameFr: 'Saut en longueur',
    nameEn: 'Long jump',
    group: 'concours',
    subCategory: 'jump',
    windGaugeRequired: true,
    defaultRounds: ['final']
  },
  {
    id: 'disc_triple_jump',
    code: 'TJ',
    nameAr: 'الوثب الثلاثي',
    nameFr: 'Triple saut',
    nameEn: 'Triple jump',
    group: 'concours',
    subCategory: 'jump',
    windGaugeRequired: true,
    defaultRounds: ['final']
  },

  // ب) مسابقات الرمي (Throws)
  {
    id: 'disc_shot_put',
    code: 'SP',
    nameAr: 'دفع الجلة',
    nameFr: 'Lancer du poids',
    nameEn: 'Shot put',
    group: 'concours',
    subCategory: 'throw',
    apparatusWeightKg: { seniorM: 7.26, seniorF: 4.0, u20M: 6.0, u18M: 5.0, u16M: 4.0 },
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_discus_throw',
    code: 'DT',
    nameAr: 'رمي القرص',
    nameFr: 'Lancer du disque',
    nameEn: 'Discus throw',
    group: 'concours',
    subCategory: 'throw',
    apparatusWeightKg: { seniorM: 2.0, seniorF: 1.0, u20M: 1.75, u18M: 1.5, u16M: 1.0 },
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_javelin_throw',
    code: 'JT',
    nameAr: 'رمي الرمح',
    nameFr: 'Lancer du javelot',
    nameEn: 'Javelin throw',
    group: 'concours',
    subCategory: 'throw',
    apparatusWeightKg: { seniorM: 0.8, seniorF: 0.6, u20M: 0.8, u18M: 0.7, u16M: 0.6 },
    windGaugeRequired: false,
    defaultRounds: ['final']
  },
  {
    id: 'disc_hammer_throw',
    code: 'HT',
    nameAr: 'رمي المطرقة',
    nameFr: 'Lancer du marteau',
    nameEn: 'Hammer throw',
    group: 'concours',
    subCategory: 'throw',
    apparatusWeightKg: { seniorM: 7.26, seniorF: 4.0, u20M: 6.0, u18M: 5.0, u16M: 4.0 },
    windGaugeRequired: false,
    defaultRounds: ['final']
  },

  // ══════════════════════════════════════════════════════════════════
  // 3. COMBINED EVENTS (المسابقات المركبة / المتعددة)
  // المنطق والافتراض: مجموعة متخصصة تضم سباقات وقفز ورمي بنظام النقاط
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'disc_decathlon',
    code: 'DEC',
    nameAr: 'العشاري (رجال - 10 مسابقات)',
    nameFr: 'Décathlon (H)',
    nameEn: 'Decathlon (M)',
    group: 'combined',
    subCategory: 'combined',
    windGaugeRequired: true,
    defaultRounds: ['final']
  },
  {
    id: 'disc_heptathlon',
    code: 'HEP',
    nameAr: 'السباعي (سيدات - 7 مسابقات)',
    nameFr: 'Heptathlon (F)',
    nameEn: 'Heptathlon (W)',
    group: 'combined',
    subCategory: 'combined',
    windGaugeRequired: true,
    defaultRounds: ['final']
  },
  {
    id: 'disc_pentathlon',
    code: 'PENT',
    nameAr: 'الخماسي (صالات)',
    nameFr: 'Pentathlon',
    nameEn: 'Pentathlon',
    group: 'combined',
    subCategory: 'combined',
    windGaugeRequired: false,
    defaultRounds: ['final']
  }
];

const STORAGE_CUSTOM_DISCIPLINES_KEY = 'pfp_custom_athletics_disciplines_v1';

export class DisciplinesSeedService {
  private customDisciplines: AthleticsDiscipline[] = [];

  constructor() {
    this.loadCustomDisciplines();
  }

  private loadCustomDisciplines(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_DISCIPLINES_KEY);
      if (stored) {
        this.customDisciplines = JSON.parse(stored);
      }
    } catch {
      this.customDisciplines = [];
    }
  }

  public getAllDisciplines(): AthleticsDiscipline[] {
    this.loadCustomDisciplines();
    return [...SEED_ATHLETICS_DISCIPLINES, ...this.customDisciplines];
  }

  public getDisciplineByCode(code: string): AthleticsDiscipline | undefined {
    const clean = code.trim().toUpperCase();
    return this.getAllDisciplines().find(d => d.code.toUpperCase() === clean || d.id.toUpperCase() === clean);
  }

  public getDisciplineById(id: string): AthleticsDiscipline | undefined {
    return this.getAllDisciplines().find(d => d.id === id);
  }

  public getCourseDisciplines(): AthleticsDiscipline[] {
    return this.getAllDisciplines().filter(d => d.group === 'course' && !d.isRelay);
  }

  public getRelayDisciplines(): AthleticsDiscipline[] {
    return this.getAllDisciplines().filter(d => d.group === 'course' && d.isRelay);
  }

  public getConcoursJumps(): AthleticsDiscipline[] {
    return this.getAllDisciplines().filter(d => d.group === 'concours' && d.subCategory === 'jump');
  }

  public getConcoursThrows(): AthleticsDiscipline[] {
    return this.getAllDisciplines().filter(d => d.group === 'concours' && d.subCategory === 'throw');
  }

  public getCombinedDisciplines(): AthleticsDiscipline[] {
    return this.getAllDisciplines().filter(d => d.group === 'combined');
  }

  public addCustomDiscipline(discipline: Omit<AthleticsDiscipline, 'id' | 'isCustom'>): AthleticsDiscipline {
    const newDisc: AthleticsDiscipline = {
      ...discipline,
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true
    };
    this.customDisciplines.push(newDisc);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CUSTOM_DISCIPLINES_KEY, JSON.stringify(this.customDisciplines));
      } catch {}
    }
    return newDisc;
  }
}

export const disciplinesSeedService = new DisciplinesSeedService();
