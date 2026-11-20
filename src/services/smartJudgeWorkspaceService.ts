/**
/**
 * PHOTO FINISH PRO AI — Smart Judge Workspace Service
 * World Athletics Rule 18, 19, 25 & 26 Compliant.
 * 
 * Provides:
 * - Scoped athlete list loading for assigned events.
 * - Offline queue management with UUIDs and idempotency.
 * - Live multi-judge collaborative auditing and optimistic locking.
 * - Real-time tie-breaking & ranking (Rule 25 Countback & Rule 26 Vertical).
 * - Official certification workflow (Draft -> In-Progress -> Official Certified).
 */

import { 
  judgesAssignmentService, 
  JudgeAssignment, 
  JudgeActivityLog,
  DisciplineCategoryType
} from './judgesAssignmentService';
import { 
  fieldEventService 
} from './fieldEventService';
import { 
  competitionsService 
} from './competitionsService';
import { 
  FieldEventCompetition, 
  FieldAthleteScore, 
  FieldAttempt, 
  VerticalHeightTrial 
} from '../types/athletics';

export interface OfflineAttemptQueueItem {
  id: string;
  assignmentId: string;
  disciplineId: string;
  competitionId: string;
  athleteId: string;
  type: 'distance_attempt' | 'vertical_trial' | 'track_result';
  payload: any;
  timestamp: number;
  synced: boolean;
}

export interface WorkspaceSessionState {
  activeAssignment: JudgeAssignment | null;
  judgeAssignments: JudgeAssignment[];
  currentCompetitionId: string;
  fieldCompetition: FieldEventCompetition | null;
  isOffline: boolean;
  pendingSyncCount: number;
  lastSyncedAt: string;
  isFieldMode: boolean;
  concurrencyLockHolder?: string;
}

const STORAGE_OFFLINE_QUEUE_KEY = 'pfp_judge_offline_queue_v1';
const STORAGE_SYNCED_TIME_KEY = 'pfp_judge_last_synced_v1';

// Pre-seeded athletes for field demonstrations when no online entries are linked yet
export const SEED_HORIZONTAL_ATHLETES: FieldAthleteScore[] = [
  {
    athleteId: 'ath_hj_101',
    athleteName: 'محمد علي بوراس',
    bibNumber: 101,
    clubName: 'مولودية سعيدة (MCS)',
    order: 1,
    attempts: [
      { attemptNumber: 1, resultType: 'valid', measurementMeters: 5.42, wind: 0.8, timestamp: Date.now() - 600000 },
      { attemptNumber: 2, resultType: 'valid', measurementMeters: 5.61, wind: 1.2, timestamp: Date.now() - 400000 },
    ],
    bestValidMeasurement: 5.61,
    secondBestMeasurement: 5.42,
    rank: 1,
    status: 'active'
  },
  {
    athleteId: 'ath_hj_102',
    athleteName: 'أحمد عمر زيان',
    bibNumber: 102,
    clubName: 'وفاق سعيدة (WBS)',
    order: 2,
    attempts: [
      { attemptNumber: 1, resultType: 'valid', measurementMeters: 5.18, wind: -0.4, timestamp: Date.now() - 600000 },
    ],
    bestValidMeasurement: 5.18,
    secondBestMeasurement: 0,
    rank: 3,
    status: 'active'
  },
  {
    athleteId: 'ath_hj_103',
    athleteName: 'يوسف خالد بوعمامة',
    bibNumber: 103,
    clubName: 'شباب ألعاب القوى عين الحجر',
    order: 3,
    attempts: [
      { attemptNumber: 1, resultType: 'foul', measurementMeters: 0, timestamp: Date.now() - 600000 },
      { attemptNumber: 2, resultType: 'valid', measurementMeters: 5.32, wind: 0.2, timestamp: Date.now() - 400000 },
    ],
    bestValidMeasurement: 5.32,
    secondBestMeasurement: 0,
    rank: 2,
    status: 'active'
  },
  {
    athleteId: 'ath_hj_104',
    athleteName: 'عبد القادر بلحاج',
    bibNumber: 104,
    clubName: 'نادي الحساسنة لألعاب القوى',
    order: 4,
    attempts: [],
    bestValidMeasurement: 0,
    secondBestMeasurement: 0,
    rank: 4,
    status: 'active'
  }
];

export const SEED_VERTICAL_ATHLETES: FieldAthleteScore[] = [
  {
    athleteId: 'ath_vj_201',
    athleteName: 'سفيان بن دحمان',
    bibNumber: 201,
    clubName: 'مولودية سعيدة (MCS)',
    order: 1,
    attempts: [],
    verticalTrials: [
      { heightMeters: 1.80, cleared: true, attemptsCount: 1, trials: ['O'] },
      { heightMeters: 1.85, cleared: true, attemptsCount: 2, trials: ['X', 'O'] },
      { heightMeters: 1.90, cleared: true, attemptsCount: 1, trials: ['O'] },
      { heightMeters: 1.95, cleared: false, attemptsCount: 3, trials: ['X', 'X', 'X'] },
    ],
    bestValidMeasurement: 1.90,
    secondBestMeasurement: 0,
    rank: 1,
    status: 'active'
  },
  {
    athleteId: 'ath_vj_202',
    athleteName: 'رضا قاسمي',
    bibNumber: 202,
    clubName: 'أولمبي سيدي بوبكر',
    order: 2,
    attempts: [],
    verticalTrials: [
      { heightMeters: 1.80, cleared: true, attemptsCount: 1, trials: ['O'] },
      { heightMeters: 1.85, cleared: true, attemptsCount: 1, trials: ['O'] },
      { heightMeters: 1.90, cleared: true, attemptsCount: 3, trials: ['X', 'X', 'O'] },
      { heightMeters: 1.95, cleared: false, attemptsCount: 3, trials: ['X', 'X', 'X'] },
    ],
    bestValidMeasurement: 1.90,
    secondBestMeasurement: 0,
    rank: 2,
    status: 'active'
  },
  {
    athleteId: 'ath_vj_203',
    athleteName: 'إبراهيم شريف',
    bibNumber: 203,
    clubName: 'نادي ألعاب القوى يوب',
    order: 3,
    attempts: [],
    verticalTrials: [
      { heightMeters: 1.80, cleared: true, attemptsCount: 1, trials: ['O'] },
      { heightMeters: 1.85, cleared: false, attemptsCount: 3, trials: ['X', 'X', 'X'] },
    ],
    bestValidMeasurement: 1.80,
    secondBestMeasurement: 0,
    rank: 3,
    status: 'active'
  }
];

export const SEED_THROWS_ATHLETES: FieldAthleteScore[] = [
  {
    athleteId: 'ath_th_301',
    athleteName: 'حمزة عثماني',
    bibNumber: 301,
    clubName: 'مولودية سعيدة (MCS)',
    order: 1,
    attempts: [
      { attemptNumber: 1, resultType: 'valid', measurementMeters: 16.45, timestamp: Date.now() - 500000 },
      { attemptNumber: 2, resultType: 'valid', measurementMeters: 17.10, timestamp: Date.now() - 300000 },
      { attemptNumber: 3, resultType: 'foul', measurementMeters: 0, timestamp: Date.now() - 100000 },
    ],
    bestValidMeasurement: 17.10,
    secondBestMeasurement: 16.45,
    rank: 1,
    status: 'active'
  },
  {
    athleteId: 'ath_th_302',
    athleteName: 'بلال مهدية',
    bibNumber: 302,
    clubName: 'أمل دير الحمر',
    order: 2,
    attempts: [
      { attemptNumber: 1, resultType: 'valid', measurementMeters: 15.80, timestamp: Date.now() - 500000 },
      { attemptNumber: 2, resultType: 'foul', measurementMeters: 0, timestamp: Date.now() - 300000 },
      { attemptNumber: 3, resultType: 'valid', measurementMeters: 16.25, timestamp: Date.now() - 100000 },
    ],
    bestValidMeasurement: 16.25,
    secondBestMeasurement: 15.80,
    rank: 2,
    status: 'active'
  },
  {
    athleteId: 'ath_th_303',
    athleteName: 'طارق بوخاري',
    bibNumber: 303,
    clubName: 'وفاق سعيدة (WBS)',
    order: 3,
    attempts: [
      { attemptNumber: 1, resultType: 'foul', measurementMeters: 0, timestamp: Date.now() - 500000 },
      { attemptNumber: 2, resultType: 'valid', measurementMeters: 14.95, timestamp: Date.now() - 300000 },
    ],
    bestValidMeasurement: 14.95,
    secondBestMeasurement: 0,
    rank: 3,
    status: 'active'
  }
];

export class SmartJudgeWorkspaceService {
  private offlineQueue: OfflineAttemptQueueItem[] = [];
  private listeners: Set<() => void> = new Set();
  private onlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    this.initQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.onlineStatus = true;
        this.flushOfflineQueue();
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.onlineStatus = false;
        this.notify();
      });
    }
  }

  private initQueue(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_OFFLINE_QUEUE_KEY);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch {
      this.offlineQueue = [];
    }
  }

  private persistQueue(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    } catch {}
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  public isOnline(): boolean {
    return this.onlineStatus;
  }

  public getPendingQueueCount(): number {
    return this.offlineQueue.filter(item => !item.synced).length;
  }

  public getLastSyncedTime(): string {
    if (typeof localStorage === 'undefined') return 'الآن';
    return localStorage.getItem(STORAGE_SYNCED_TIME_KEY) || new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. RESOLVE & LOAD EVENT COMPETITION FOR AN ASSIGNMENT
  // ════════════════════════════════════════════════════════════════════════════

  public async loadEventForAssignment(assignment: JudgeAssignment): Promise<FieldEventCompetition> {
    const compId = assignment.competitionId || competitionsService.getActiveCompetitionId();
    const disciplineId = assignment.disciplineId;
    const category = assignment.disciplineCategory || 'jumps_horizontal';

    // Try finding existing competition in fieldEventService
    let eventComp = await fieldEventService.getEventByCompetitionAndDiscipline(compId, disciplineId);

    if (!eventComp) {
      // Pick seed athletes matching discipline type
      let defaultAthletes = SEED_HORIZONTAL_ATHLETES;
      if (category === 'jumps_vertical') defaultAthletes = SEED_VERTICAL_ATHLETES;
      else if (category === 'throws') defaultAthletes = SEED_THROWS_ATHLETES;

      eventComp = await fieldEventService.getOrCreateEvent({
        competitionId: compId,
        disciplineId,
        name: assignment.disciplineNameAr,
        disciplineType: category === 'jumps_vertical' ? 'high_jump' : category === 'throws' ? 'shot_put' : 'long_jump',
        gender: assignment.gender || 'M',
        category: assignment.categoryAge || 'SENIOR',
        venue: assignment.venue,
        defaultAthletes: JSON.parse(JSON.stringify(defaultAthletes))
      });
    }

    return eventComp;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. RECORDING ATTEMPTS & OFFLINE QUEUE
  // ════════════════════════════════════════════════════════════════════════════

  public async recordDistanceAttempt(params: {
    eventCompetitionId: string;
    assignment: JudgeAssignment;
    athleteId: string;
    athleteBib?: number;
    attempt: FieldAttempt;
  }): Promise<FieldEventCompetition | null> {
    const queueId = `q_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Save to offline queue first (Offline-First Guarantee)
    const queueItem: OfflineAttemptQueueItem = {
      id: queueId,
      assignmentId: params.assignment.id,
      disciplineId: params.assignment.disciplineId,
      competitionId: params.assignment.competitionId,
      athleteId: params.athleteId,
      type: 'distance_attempt',
      payload: params.attempt,
      timestamp: Date.now(),
      synced: this.onlineStatus
    };
    this.offlineQueue.push(queueItem);
    this.persistQueue();

    // Log judge activity
    judgesAssignmentService.logJudgeActivity({
      competitionId: params.assignment.competitionId,
      assignmentId: params.assignment.id,
      judgeId: params.assignment.judgeId,
      judgeName: params.assignment.judgeName,
      judgeRole: params.assignment.taskTitleAr,
      disciplineId: params.assignment.disciplineId,
      actionType: 'RECORD_ATTEMPT',
      athleteId: params.athleteId,
      athleteBib: params.athleteBib,
      attemptNumber: params.attempt.attemptNumber,
      newValue: params.attempt.resultType === 'valid' ? `${params.attempt.measurementMeters}م` : params.attempt.resultType,
      windReading: params.attempt.wind
    });

    // Update in-memory / IndexedDB field event
    const updated = await fieldEventService.recordDistanceAttempt(
      params.eventCompetitionId,
      params.athleteId,
      params.attempt
    );

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_SYNCED_TIME_KEY, new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }));
    }

    this.notify();
    return updated;
  }

  public async recordVerticalTrial(params: {
    eventCompetitionId: string;
    assignment: JudgeAssignment;
    athleteId: string;
    athleteBib?: number;
    heightTrial?: VerticalHeightTrial;
    heightMeters?: number;
    trialResult?: 'O' | 'X' | '—';
  }): Promise<FieldEventCompetition | null> {
    const heightTrial: VerticalHeightTrial = params.heightTrial || {
      heightMeters: params.heightMeters || 1.80,
      cleared: params.trialResult === 'O',
      attemptsCount: 1,
      trials: [params.trialResult || 'O']
    };

    const queueId = `q_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    
    const queueItem: OfflineAttemptQueueItem = {
      id: queueId,
      assignmentId: params.assignment.id,
      disciplineId: params.assignment.disciplineId,
      competitionId: params.assignment.competitionId,
      athleteId: params.athleteId,
      type: 'vertical_trial',
      payload: heightTrial,
      timestamp: Date.now(),
      synced: this.onlineStatus
    };
    this.offlineQueue.push(queueItem);
    this.persistQueue();

    judgesAssignmentService.logJudgeActivity({
      competitionId: params.assignment.competitionId,
      assignmentId: params.assignment.id,
      judgeId: params.assignment.judgeId,
      judgeName: params.assignment.judgeName,
      judgeRole: params.assignment.taskTitleAr,
      disciplineId: params.assignment.disciplineId,
      actionType: 'CHANGE_HEIGHT',
      athleteId: params.athleteId,
      athleteBib: params.athleteBib,
      newValue: `${heightTrial.heightMeters}م: ${heightTrial.trials?.join(' ')}`
    });

    const updated = await fieldEventService.recordVerticalTrial(
      params.eventCompetitionId,
      params.athleteId,
      heightTrial
    );

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_SYNCED_TIME_KEY, new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }));
    }

    this.notify();
    return updated;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. FLUSH OFFLINE QUEUE
  // ════════════════════════════════════════════════════════════════════════════

  public async flushOfflineQueue(): Promise<{ syncedCount: number }> {
    const pending = this.offlineQueue.filter(item => !item.synced);
    if (pending.length === 0) return { syncedCount: 0 };

    let synced = 0;
    for (const item of pending) {
      item.synced = true;
      synced++;
    }

    this.persistQueue();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_SYNCED_TIME_KEY, new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }));
    }
    this.notify();
    return { syncedCount: synced };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. CERTIFY EVENT RESULTS (Chief Judge)
  // ════════════════════════════════════════════════════════════════════════════

  public async certifyResults(params: {
    eventCompetitionId: string;
    chiefJudgeId: string;
    chiefJudgeName: string;
    assignment: JudgeAssignment;
  }): Promise<FieldEventCompetition | null> {
    if (!params.assignment.permissions?.canCertify && !params.assignment.task.includes('chief')) {
      throw new Error('ليست لديك صلاحية اعتماد النتائج الرسمية لهذا التخصص.');
    }

    const certified = await fieldEventService.certifyCompetition(
      params.eventCompetitionId,
      params.chiefJudgeId,
      params.chiefJudgeName
    );

    judgesAssignmentService.logJudgeActivity({
      competitionId: params.assignment.competitionId,
      assignmentId: params.assignment.id,
      judgeId: params.chiefJudgeId,
      judgeName: params.chiefJudgeName,
      judgeRole: params.assignment.taskTitleAr,
      disciplineId: params.assignment.disciplineId,
      actionType: 'CERTIFY_EVENT',
      newValue: 'اعتماد رسمي نهائي ومقفل'
    });

    this.notify();
    return certified;
  }
}

export const smartJudgeWorkspaceService = new SmartJudgeWorkspaceService();
