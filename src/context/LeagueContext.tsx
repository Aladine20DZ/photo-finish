/**
 * PHOTO FINISH PRO AI — Unified League & Active Competition Context
 * ==============================================================================
 * Central Reactive Context providing a Single Source of Truth for:
 * 1. Active League Scoping (Multi-Tenancy Isolation).
 * 2. Active Competition System (Synced across Planning, Competitions, Events, Judges, Call Room, Timing & Results).
 * 3. Realtime Cross-Module Synchronization (Supabase Realtime, BroadcastChannel, Custom DOM Events).
 * 4. Role-Based Access Control (RBAC) awareness.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { competitionsService, NationalCompetition } from '../services/competitionsService';
import { portalAuthService, RegisteredLeague, PortalSession } from '../services/portalAuthService';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { ExecutiveUserRole } from '../types/athletics';

export type SynchronizationStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface LeagueContextValue {
  currentLeagueId: string;
  currentLeague: RegisteredLeague | null;
  currentUserRole: ExecutiveUserRole;
  activeCompetitionId: string | null;
  activeCompetition: NationalCompetition | null;
  availableCompetitions: NationalCompetition[];
  synchronizationStatus: SynchronizationStatus;
  lastSyncTime: Date | null;
  switchLeague: (leagueId: string) => Promise<void>;
  setActiveCompetition: (competitionId: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
  createCompetition: (data: Partial<NationalCompetition>) => Promise<NationalCompetition>;
  deleteCompetition: (id: string, options?: { reason?: string; permanent?: boolean }) => Promise<{ success: boolean; error?: string }>;
}

const LeagueContext = createContext<LeagueContextValue | undefined>(undefined);

export interface LeagueProviderProps {
  children: React.ReactNode;
  initialLeagueId?: string;
}

export const LeagueProvider: React.FC<LeagueProviderProps> = ({ children, initialLeagueId }) => {
  // 1. League Selection & Session
  const [currentLeagueId, setCurrentLeagueId] = useState<string>(() => {
    const session = portalAuthService.getSession('league') || portalAuthService.getActiveSession();
    return initialLeagueId || session?.leagueId || 'lg_saida';
  });

  const [currentLeague, setCurrentLeague] = useState<RegisteredLeague | null>(() => {
    return portalAuthService.getLeagueById(currentLeagueId, true) || {
      id: currentLeagueId,
      name: 'رابطة ألعاب القوى سعيدة (LWAS)',
      shortName: 'LWAS',
      wilayaCode: '20',
      wilayaNameAr: 'سعيدة',
      officialEmail: 'lwassaida20@gmail.com',
      phone: '+213 48 51 00 20',
      presidentName: 'رئيس الرابطة الولائية',
      technicalDirector: 'المدير الفني الولائي',
      address: 'المضمار الولائي 13 أفريل 1958، سعيدة',
      adminUsername: 'saida2026',
      isActive: true,
      registeredAt: '2026-01-01T00:00:00Z',
      competitionsCount: 1,
      clubsCount: 4,
      refereesCount: 16
    };
  });

  const [currentUserRole, setCurrentUserRole] = useState<ExecutiveUserRole>(() => {
    const session = portalAuthService.getActiveSession();
    if (!session) return 'read_only';
    if (session.portal === 'admin') return 'super_admin';
    if (session.portal === 'league') return 'league_admin';
    if (session.portal === 'judge') return 'chief_judge';
    return 'competition_manager';
  });

  // 2. Competitions State
  const [availableCompetitions, setAvailableCompetitions] = useState<NationalCompetition[]>([]);
  const [activeCompetitionId, setActiveCompetitionIdState] = useState<string | null>(null);
  const [activeCompetition, setActiveCompetitionState] = useState<NationalCompetition | null>(null);
  const [synchronizationStatus, setSynchronizationStatus] = useState<SynchronizationStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  // 3. Central Refresh Function
  const refreshData = useCallback(async () => {
    setSynchronizationStatus('syncing');
    try {
      // Refresh current league profile
      const l = portalAuthService.getLeagueById(currentLeagueId, true);
      if (l) setCurrentLeague(l);

      // Fetch competitions scoped by this league
      const comps = await competitionsService.getCompetitions(currentLeagueId);
      setAvailableCompetitions(comps);

      // Fetch active competition for this league
      const active = await competitionsService.getActiveCompetition(currentLeagueId);
      setActiveCompetitionState(active);
      setActiveCompetitionIdState(active ? active.id : null);

      setSynchronizationStatus(isSupabaseConfigured() ? 'synced' : 'offline');
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('[LeagueContext] Refresh error:', err);
      setSynchronizationStatus('error');
    }
  }, [currentLeagueId]);

  // Initial load & when leagueId changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 4. Switch Active League with Safe Clean-Up
  const switchLeague = useCallback(async (newLeagueId: string) => {
    if (newLeagueId === currentLeagueId) return;
    setSynchronizationStatus('syncing');

    const newLeague = portalAuthService.getLeagueById(newLeagueId, true);
    if (!newLeague) {
      console.warn(`[LeagueContext] League ${newLeagueId} not found`);
      return;
    }

    setCurrentLeagueId(newLeagueId);
    setCurrentLeague(newLeague);

    // Load newly active competition for the target league
    const comps = await competitionsService.getCompetitions(newLeagueId);
    setAvailableCompetitions(comps);

    const active = await competitionsService.getActiveCompetition(newLeagueId);
    setActiveCompetitionState(active);
    setActiveCompetitionIdState(active ? active.id : null);

    setSynchronizationStatus(isSupabaseConfigured() ? 'synced' : 'offline');
    setLastSyncTime(new Date());

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pfp:league-changed', {
        detail: { leagueId: newLeagueId, league: newLeague }
      }));
    }
  }, [currentLeagueId]);

  // 5. Set Active Competition with Cross-Module Broadcast
  const setActiveCompetition = useCallback(async (competitionId: string): Promise<boolean> => {
    setSynchronizationStatus('syncing');
    try {
      const success = await competitionsService.setActiveCompetitionId(competitionId, currentLeagueId);
      if (success) {
        const comp = await competitionsService.getActiveCompetition(currentLeagueId);
        setActiveCompetitionState(comp);
        setActiveCompetitionIdState(competitionId);
        setSynchronizationStatus(isSupabaseConfigured() ? 'synced' : 'offline');
        setLastSyncTime(new Date());
        return true;
      }
      return false;
    } catch (err) {
      console.error('[LeagueContext] Failed to set active competition:', err);
      setSynchronizationStatus('error');
      return false;
    }
  }, [currentLeagueId]);

  // 6. Create Competition scoped to Current League
  const createCompetition = useCallback(async (data: Partial<NationalCompetition>): Promise<NationalCompetition> => {
    setSynchronizationStatus('syncing');
    const created = await competitionsService.createCompetition({
      ...data,
      leagueId: currentLeagueId,
      leagueName: currentLeague?.name || 'رابطة ألعاب القوى',
      leagueShort: currentLeague?.shortName || 'LEAGUE'
    });
    await refreshData();
    return created;
  }, [currentLeagueId, currentLeague, refreshData]);

  // 7. Delete Competition with Safe Deactivation
  const deleteCompetition = useCallback(async (
    id: string, 
    options?: { reason?: string; permanent?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    setSynchronizationStatus('syncing');
    const res = await competitionsService.deleteCompetition(id, options);
    await refreshData();
    return res;
  }, [refreshData]);

  // 8. Event Listeners for Realtime Multi-Tab & Multi-Module Reactivity
  useEffect(() => {
    const unsubComp = competitionsService.onCompetitionsChanged(comps => {
      const filtered = comps.filter(c => c.leagueId === currentLeagueId || c.leagueShort === currentLeague?.shortName);
      setAvailableCompetitions(filtered);
    });

    const unsubActive = competitionsService.onActiveCompetitionChanged(active => {
      if (active && (active.leagueId === currentLeagueId || active.leagueShort === currentLeague?.shortName)) {
        setActiveCompetitionState(active);
        setActiveCompetitionIdState(active.id);
      }
    });

    const unsubAuth = portalAuthService.subscribe(() => {
      const session = portalAuthService.getActiveSession();
      if (session) {
        if (session.portal === 'admin') setCurrentUserRole('super_admin');
        else if (session.portal === 'league') setCurrentUserRole('league_admin');
        else if (session.portal === 'judge') setCurrentUserRole('chief_judge');
        else setCurrentUserRole('competition_manager');
      } else {
        setCurrentUserRole('read_only');
      }
    });

    const handleActiveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<NationalCompetition | null>;
      if (customEvent.detail) {
        setActiveCompetitionState(customEvent.detail);
        setActiveCompetitionIdState(customEvent.detail.id);
      }
    };

    const handleCompsEvent = () => {
      refreshData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pfp:active-competition-changed', handleActiveEvent);
      window.addEventListener('pfp:competitions-changed', handleCompsEvent);
      window.addEventListener('pfp:recycle-bin-changed', handleCompsEvent);
      window.addEventListener('pfp:entity-deleted', handleCompsEvent);
      window.addEventListener('pfp:entity-restored', handleCompsEvent);
    }

    // Supabase Realtime Subscription if online
    let channel: any = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel(`league_sync_${currentLeagueId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'active_competitions' }, () => {
          refreshData();
        })
        .subscribe();
    }

    return () => {
      unsubComp();
      unsubActive();
      unsubAuth();
      if (typeof window !== 'undefined') {
        window.removeEventListener('pfp:active-competition-changed', handleActiveEvent);
        window.removeEventListener('pfp:competitions-changed', handleCompsEvent);
        window.removeEventListener('pfp:recycle-bin-changed', handleCompsEvent);
        window.removeEventListener('pfp:entity-deleted', handleCompsEvent);
        window.removeEventListener('pfp:entity-restored', handleCompsEvent);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentLeagueId, currentLeague, refreshData]);

  const value = useMemo<LeagueContextValue>(() => ({
    currentLeagueId,
    currentLeague,
    currentUserRole,
    activeCompetitionId,
    activeCompetition,
    availableCompetitions,
    synchronizationStatus,
    lastSyncTime,
    switchLeague,
    setActiveCompetition,
    refreshData,
    createCompetition,
    deleteCompetition
  }), [
    currentLeagueId,
    currentLeague,
    currentUserRole,
    activeCompetitionId,
    activeCompetition,
    availableCompetitions,
    synchronizationStatus,
    lastSyncTime,
    switchLeague,
    setActiveCompetition,
    refreshData,
    createCompetition,
    deleteCompetition
  ]);

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeagueContext = (): LeagueContextValue => {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeagueContext must be used within a LeagueProvider');
  }
  return context;
};
