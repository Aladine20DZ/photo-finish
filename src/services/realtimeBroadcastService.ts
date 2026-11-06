/**
 * PHOTO FINISH PRO AI — Supabase Realtime Channels & Broadcast Service (Stage 7)
 * Live Mark Announcements, Slit-Scan Stream Broadcasts & Judge Mesh Notifications.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RaceBroadcastEvent<T = any> {
  type: 
    | 'GUN_FIRED' 
    | 'RUNNER_FINISHED' 
    | 'WIND_UPDATE' 
    | 'RESULTS_CERTIFIED' 
    | 'ANOMALY_ALERT' 
    | 'HEARTBEAT';
  competitionId: string;
  senderDeviceId: string;
  timestamp: number;
  payload: T;
}

export class RealtimeBroadcastService {
  private activeChannels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to live competition broadcasts and database changes
   */
  public subscribeToCompetition(
    competitionId: string, 
    onEvent: (event: RaceBroadcastEvent) => void
  ): () => void {
    const channelName = `comp:${competitionId}:live`;

    if (!isSupabaseConfigured()) {
      // Mock subscription for offline mode
      return () => {};
    }

    if (this.activeChannels.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true }
      }
    });

    channel
      .on('broadcast', { event: 'race_event' }, ({ payload }) => {
        onEvent(payload as RaceBroadcastEvent);
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'results',
          filter: `competition_id=eq.${competitionId}`
        },
        (payload) => {
          onEvent({
            type: 'RESULTS_CERTIFIED',
            competitionId,
            senderDeviceId: 'supabase_db',
            timestamp: Date.now(),
            payload: payload.new
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Channel joined successfully
        }
      });

    this.activeChannels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Broadcast an urgent race event to all connected devices in the arena
   */
  public async broadcastEvent(event: RaceBroadcastEvent): Promise<{ success: boolean }> {
    const channelName = `comp:${event.competitionId}:live`;
    const channel = this.activeChannels.get(channelName);

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'race_event',
        payload: event
      });
      return { success: true };
    }

    return { success: true };
  }

  private unsubscribe(channelName: string): void {
    const channel = this.activeChannels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.activeChannels.delete(channelName);
    }
  }
}

export const realtimeBroadcastService = new RealtimeBroadcastService();
