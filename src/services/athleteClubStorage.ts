import { Athlete, Club, CategorySnapshot } from '../types/athletics';
import { recycleBinService } from './recycleBinService';

const DB_NAME = 'athletics_competition_db_v1';
const DB_VERSION = 2; // ترقية قاعدة البيانات لدعم مخازن العدائين والأندية واللقطات

const STORE_ATHLETES = 'athletes';
const STORE_CLUBS = 'clubs';
const STORE_SNAPSHOTS = 'category_snapshots';

export const INITIAL_CLUBS: Club[] = [];

export const INITIAL_ATHLETES: Athlete[] = [];


class AthleteClubStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryAthletes: Map<string, Athlete> = new Map();
  private memoryClubs: Map<string, Club> = new Map();
  private memorySnapshots: Map<string, CategorySnapshot> = new Map();

  constructor() {
    // تحميل البيانات التأسيسية في الذاكرة مباشرة كاحتياط أوفلاين
    INITIAL_CLUBS.forEach((c) => this.memoryClubs.set(c.id, { ...c }));
    INITIAL_ATHLETES.forEach((a) => this.memoryAthletes.set(a.id, { ...a }));
  }

  private async getDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;

          // 1. مخزن العدائين
          if (!db.objectStoreNames.contains(STORE_ATHLETES)) {
            const athleteStore = db.createObjectStore(STORE_ATHLETES, { keyPath: 'id' });
            athleteStore.createIndex('licenseNumber', 'licenseNumber', { unique: true });
            athleteStore.createIndex('clubId', 'clubId', { unique: false });
            athleteStore.createIndex('lastName', 'lastName', { unique: false });
          }

          // 2. مخزن الأندية
          if (!db.objectStoreNames.contains(STORE_CLUBS)) {
            const clubStore = db.createObjectStore(STORE_CLUBS, { keyPath: 'id' });
            clubStore.createIndex('code', 'code', { unique: true });
            clubStore.createIndex('wilaya', 'wilaya', { unique: false });
          }

          // 3. مخزن لقطات الفئات المجمدة
          if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
            db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'competitionId' });
          }
        };

        req.onsuccess = async () => {
          const db = req.result;
          // تفعيل البذور التأسيسية إذا كانت القاعدة فارغة
          await this.seedInitialData(db);
          resolve(db);
        };

        req.onerror = () => {
          reject(req.error);
        };
      });
    }

    return this.dbPromise;
  }

  private async seedInitialData(db: IDBDatabase): Promise<void> {
    try {
      const tx = db.transaction([STORE_CLUBS, STORE_ATHLETES], 'readwrite');
      const clubStore = tx.objectStore(STORE_CLUBS);
      const athStore = tx.objectStore(STORE_ATHLETES);

      const countReq = clubStore.count();
      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          INITIAL_CLUBS.forEach((c) => clubStore.put(c));
          INITIAL_ATHLETES.forEach((a) => athStore.put(a));
        }
      };
    } catch (e) {
      console.warn('[AthleteClubStorage] Seed note:', e);
    }
  }

  // ═══════════════════════════════════════════════════
  // إدارة العدائين (Athletes CRUD)
  // ═══════════════════════════════════════════════════

  public async getAllAthletes(): Promise<Athlete[]> {
    return this.listAthletes();
  }

  public async listAthletes(filter?: { clubId?: string; search?: string }): Promise<Athlete[]> {
    const db = await this.getDb();
    let athletes: Athlete[] = [];

    if (db) {
      athletes = await new Promise<Athlete[]>((resolve, reject) => {
        const tx = db.transaction(STORE_ATHLETES, 'readonly');
        const store = tx.objectStore(STORE_ATHLETES);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } else {
      athletes = Array.from(this.memoryAthletes.values());
    }

    // إذا كانت القاعدة فارغة بعد الفحص، نستخدم بيانات الذاكرة التأسيسية
    if (!athletes.length) {
      athletes = Array.from(this.memoryAthletes.values());
    }

    // تطبيق الفلاتر والبحث
    return athletes.filter((ath) => {
      if (filter?.clubId && ath.clubId !== filter.clubId) {
        return false;
      }
      if (filter?.search) {
        const q = filter.search.trim().toLowerCase();
        const fullName = `${ath.firstName} ${ath.lastName} ${ath.arabicName || ''}`.toLowerCase();
        const matchesName = fullName.includes(q);
        const matchesLicense = ath.licenseNumber.toLowerCase().includes(q);
        const matchesBib = ath.bibNumber ? String(ath.bibNumber).includes(q) : false;
        const matchesClub = ath.clubName ? ath.clubName.toLowerCase().includes(q) : false;
        return matchesName || matchesLicense || matchesBib || matchesClub;
      }
      return true;
    });
  }

  public async getAthleteById(id: string): Promise<Athlete | null> {
    const db = await this.getDb();
    if (db) {
      return new Promise<Athlete | null>((resolve, reject) => {
        const tx = db.transaction(STORE_ATHLETES, 'readonly');
        const req = tx.objectStore(STORE_ATHLETES).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    }
    return this.memoryAthletes.get(id) || null;
  }

  public async saveAthlete(athlete: Athlete): Promise<Athlete> {
    const updated: Athlete = {
      ...athlete,
      updatedAt: Date.now(),
      createdAt: athlete.createdAt || Date.now(),
    };

    this.memoryAthletes.set(updated.id, updated);

    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ATHLETES, 'readwrite');
        const req = tx.objectStore(STORE_ATHLETES).put(updated);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    return updated;
  }

  public async deleteAthlete(id: string): Promise<boolean> {
    this.memoryAthletes.delete(id);
    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ATHLETES, 'readwrite');
        const req = tx.objectStore(STORE_ATHLETES).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
    return true;
  }

  public async softDeleteAthlete(
    id: string, 
    options?: { reason?: string; deletedBy?: string; leagueId?: string; permanent?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    const athlete = await this.getAthleteById(id);
    if (!athlete) return { success: false, error: 'العداء غير موجود' };

    if (!options?.permanent) {
      try {
        await recycleBinService.moveToRecycleBin({
          leagueId: options?.leagueId || 'lg_saida',
          entityType: 'athlete',
          entityId: athlete.id,
          entityName: `${athlete.firstName} ${athlete.lastName} (${athlete.licenseNumber})`,
          sourceModule: 'athletes',
          payload: { ...athlete },
          deletedBy: options?.deletedBy || 'مدير الرابطة',
          reason: options?.reason || 'حذف ونقل لسلة المحذوفات'
        });
      } catch (e) {
        console.warn('[AthleteClubStorage] Soft delete error:', e);
      }
    }

    await this.deleteAthlete(id);
    return { success: true };
  }

  public async restoreAthlete(athlete: Athlete): Promise<Athlete> {
    return await this.saveAthlete(athlete);
  }

  public async bulkDeleteAthletes(
    ids: string[], 
    options?: { reason?: string; deletedBy?: string; leagueId?: string }
  ): Promise<{ success: boolean; count: number }> {
    let count = 0;
    for (const id of ids) {
      const res = await this.softDeleteAthlete(id, options);
      if (res.success) count++;
    }
    return { success: count > 0, count };
  }


  // ═══════════════════════════════════════════════════
  // إدارة الأندية الرياضية (Clubs CRUD)
  // ═══════════════════════════════════════════════════

  public async getAllClubs(): Promise<Club[]> {
    return this.listClubs();
  }

  public async listClubs(): Promise<Club[]> {
    const db = await this.getDb();
    let clubs: Club[] = [];

    if (db) {
      clubs = await new Promise<Club[]>((resolve, reject) => {
        const tx = db.transaction(STORE_CLUBS, 'readonly');
        const req = tx.objectStore(STORE_CLUBS).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } else {
      clubs = Array.from(this.memoryClubs.values());
    }

    if (!clubs.length) {
      clubs = Array.from(this.memoryClubs.values());
    }

    return clubs.sort((a, b) => b.medalsTally.gold - a.medalsTally.gold);
  }

  public async getClubById(id: string): Promise<Club | null> {
    const db = await this.getDb();
    if (db) {
      return new Promise<Club | null>((resolve, reject) => {
        const tx = db.transaction(STORE_CLUBS, 'readonly');
        const req = tx.objectStore(STORE_CLUBS).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    }
    return this.memoryClubs.get(id) || null;
  }

  public async saveClub(club: Club): Promise<Club> {
    const updated: Club = {
      ...club,
      updatedAt: Date.now(),
      createdAt: club.createdAt || Date.now(),
    };

    this.memoryClubs.set(updated.id, updated);

    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CLUBS, 'readwrite');
        const req = tx.objectStore(STORE_CLUBS).put(updated);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    return updated;
  }

  public async deleteClub(id: string): Promise<boolean> {
    this.memoryClubs.delete(id);
    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CLUBS, 'readwrite');
        const req = tx.objectStore(STORE_CLUBS).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
    return true;
  }

  public async softDeleteClub(
    id: string, 
    options?: { reason?: string; deletedBy?: string; leagueId?: string; permanent?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    const club = await this.getClubById(id);
    if (!club) return { success: false, error: 'النادي غير موجود' };

    if (!options?.permanent) {
      try {
        await recycleBinService.moveToRecycleBin({
          leagueId: options?.leagueId || 'lg_saida',
          entityType: 'club',
          entityId: club.id,
          entityName: `${club.name} (${club.code})`,
          sourceModule: 'clubs',
          payload: { ...club },
          deletedBy: options?.deletedBy || 'مدير الرابطة',
          reason: options?.reason || 'حذف ونقل لسلة المحذوفات'
        });
      } catch (e) {
        console.warn('[AthleteClubStorage] Soft delete club error:', e);
      }
    }

    await this.deleteClub(id);
    return { success: true };
  }

  public async restoreClub(club: Club): Promise<Club> {
    return await this.saveClub(club);
  }

  public async bulkDeleteClubs(
    ids: string[], 
    options?: { reason?: string; deletedBy?: string; leagueId?: string }
  ): Promise<{ success: boolean; count: number }> {
    let count = 0;
    for (const id of ids) {
      const res = await this.softDeleteClub(id, options);
      if (res.success) count++;
    }
    return { success: count > 0, count };
  }


  // ═══════════════════════════════════════════════════
  // لقطات الفئات العمرية المجمدة (Category Snapshots)
  // ═══════════════════════════════════════════════════

  public async saveCategorySnapshot(snapshot: CategorySnapshot): Promise<void> {
    this.memorySnapshots.set(snapshot.competitionId, snapshot);
    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
        const req = tx.objectStore(STORE_SNAPSHOTS).put(snapshot);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  }

  public async getCategorySnapshot(competitionId: string): Promise<CategorySnapshot | null> {
    const db = await this.getDb();
    if (db) {
      return new Promise<CategorySnapshot | null>((resolve, reject) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
        const req = tx.objectStore(STORE_SNAPSHOTS).get(competitionId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    }
    return this.memorySnapshots.get(competitionId) || null;
  }

  /**
   * مسح وإعادة تعيين البيانات للقيم التأسيسية (مفيد للاختبارات ولإعادة التهيئة)
   */
  public async clearAll(): Promise<void> {
    this.memoryAthletes.clear();
    this.memoryClubs.clear();
    this.memorySnapshots.clear();

    INITIAL_CLUBS.forEach((c) => this.memoryClubs.set(c.id, { ...c }));
    INITIAL_ATHLETES.forEach((a) => this.memoryAthletes.set(a.id, { ...a }));

    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_ATHLETES, STORE_CLUBS, STORE_SNAPSHOTS], 'readwrite');
        tx.objectStore(STORE_ATHLETES).clear();
        tx.objectStore(STORE_CLUBS).clear();
        tx.objectStore(STORE_SNAPSHOTS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      await this.seedInitialData(db);
    }
  }
}

export const athleteClubStorage = new AthleteClubStorage();
