import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '@/config/supabaseClient';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type { ReceivedDocument } from '@/types/supervisor';

interface UseDocumentRealtimeOptions {
  /** Callback fired when a new document arrives via INSERT */
  onNewDocument?: (document: ReceivedDocument) => void;
  /** Callback fired when a document is updated */
  onDocumentUpdated?: (document: ReceivedDocument) => void;
  /** Enable/disable the subscription (default: true) */
  enabled?: boolean;
}

interface UseDocumentRealtimeReturn {
  /** Whether the subscription is currently active */
  isSubscribed: boolean;
}

/**
 * Hook to subscribe to real-time document changes for a project.
 * 
 * Uses Supabase Postgres Changes to listen for INSERT, UPDATE, and DELETE
 * events on the received_documents table, filtered by project_id.
 * 
 * The hook automatically:
 * - Updates the supervisorStore when events arrive
 * - Cleans up the subscription on unmount
 * - Handles reconnection automatically (via Supabase client)
 * 
 * @example
 * ```tsx
 * const { isSubscribed } = useDocumentRealtime(projectId, {
 *   onNewDocument: (doc) => {
 *     toast(`New document from ${doc.source_email}`);
 *   },
 * });
 * ```
 */
export function useDocumentRealtime(
  projectId: string | undefined,
  options: UseDocumentRealtimeOptions = {}
): UseDocumentRealtimeReturn {
  const { onNewDocument, onDocumentUpdated, enabled = true } = options;
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  
  // Get store actions
  const addDocumentRealtime = useSupervisorStore((s) => s.addDocumentRealtime);
  const updateDocumentRealtime = useSupervisorStore((s) => s.updateDocumentRealtime);
  const removeDocumentRealtime = useSupervisorStore((s) => s.removeDocumentRealtime);

  // Handle INSERT events
  const handleInsert = useCallback(
    (payload: RealtimePostgresChangesPayload<ReceivedDocument>) => {
      const newDocument = payload.new as ReceivedDocument;
      
      // Only process if it belongs to our project
      if (newDocument.project_id !== projectId) return;
      
      console.log('🔔 Realtime INSERT:', newDocument.original_filename);
      
      // Update store
      addDocumentRealtime(newDocument);
      
      // Fire callback
      onNewDocument?.(newDocument);
    },
    [projectId, addDocumentRealtime, onNewDocument]
  );

  // Handle UPDATE events
  const handleUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<ReceivedDocument>) => {
      const updatedDocument = payload.new as ReceivedDocument;
      
      // Only process if it belongs to our project
      if (updatedDocument.project_id !== projectId) return;
      
      console.log('🔄 Realtime UPDATE:', updatedDocument.id, updatedDocument.status);
      
      // Update store with full document (in case fields changed)
      updateDocumentRealtime(updatedDocument.id, updatedDocument);
      
      // Fire callback
      onDocumentUpdated?.(updatedDocument);
    },
    [projectId, updateDocumentRealtime, onDocumentUpdated]
  );

  // Handle DELETE events
  const handleDelete = useCallback(
    (payload: RealtimePostgresChangesPayload<ReceivedDocument>) => {
      // For DELETE, the old record contains the deleted document info
      const deletedDocument = payload.old as ReceivedDocument;
      
      // Only process if it belongs to our project
      if (deletedDocument.project_id !== projectId) return;
      
      console.log('🗑️ Realtime DELETE:', deletedDocument.id);
      
      // Remove from store
      removeDocumentRealtime(deletedDocument.id);
    },
    [projectId, removeDocumentRealtime]
  );

  useEffect(() => {
    // Don't subscribe if disabled or no projectId
    if (!enabled || !projectId) {
      return;
    }

    // Create a unique channel name for this project
    const channelName = `documents-${projectId}`;
    
    console.log(`📡 Subscribing to realtime documents for project: ${projectId}`);

    // Create the channel with Postgres Changes subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'received_documents',
          filter: `project_id=eq.${projectId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'received_documents',
          filter: `project_id=eq.${projectId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'received_documents',
          filter: `project_id=eq.${projectId}`,
        },
        handleDelete
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Realtime subscription active for project: ${projectId}`);
          isSubscribedRef.current = true;
        } else if (status === 'CLOSED') {
          console.log(`🔌 Realtime subscription closed for project: ${projectId}`);
          isSubscribedRef.current = false;
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Realtime subscription error for project: ${projectId}`);
          isSubscribedRef.current = false;
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        console.log(`🔌 Unsubscribing from realtime documents for project: ${projectId}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [projectId, enabled, handleInsert, handleUpdate, handleDelete]);

  return {
    isSubscribed: isSubscribedRef.current,
  };
}
