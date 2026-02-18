'use client';

/**
 * Subscribe to applications table Postgres Changes for real-time status updates.
 * Per contracts/realtime-channels.md: INSERT and UPDATE events, filter by user_id.
 *
 * Requires: applications table in supabase_realtime publication (migration 00015).
 */

import { createDbClient, type Database } from '@repo/db';
import { useEffect, useRef } from 'react';

type ApplicationRow = Database['public']['Tables']['applications']['Row'];

export interface RealtimeApplicationPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ApplicationRow;
  old?: Partial<ApplicationRow>;
}

export interface UseRealtimeApplicationsOptions {
  /** Authenticated user ID. When null, subscription is inactive. */
  userId: string | null;
  /** Called when a new application is inserted for this user. */
  onInsert?: (payload: RealtimeApplicationPayload) => void;
  /** Called when an application is updated for this user. */
  onUpdate?: (payload: RealtimeApplicationPayload) => void;
}

function toApplicationPayload(
  payload: { eventType: string; new: unknown; old?: unknown }
): RealtimeApplicationPayload {
  return payload as unknown as RealtimeApplicationPayload;
}

/**
 * Subscribes to applications table Postgres Changes (INSERT, UPDATE) filtered by user_id.
 * On UPDATE: refresh affected application in UI; on INSERT: add to tracker.
 */
export function useRealtimeApplications({
  userId,
  onInsert,
  onUpdate,
}: UseRealtimeApplicationsOptions): void {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);

  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!userId) return;

    const supabase = createDbClient();
    const channel = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onInsertRef.current?.(toApplicationPayload(payload));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdateRef.current?.(toApplicationPayload(payload));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
