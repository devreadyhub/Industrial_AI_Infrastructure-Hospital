import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface HospitalUpdate {
  eventType: 'BILLING_RECORD_UPDATED' | 'LAB_TEST_UPDATED';
  timestamp: string;
  data: Record<string, any>;
  updatedBy?: string;
}

export interface UseHospitalUpdatesOptions {
  enabled?: boolean;
  onUpdate?: (update: HospitalUpdate) => void;
  autoJoinUpdates?: boolean;
}

/**
 * Hook to subscribe to real-time hospital updates via Socket.io
 * Automatically updates AI Chat context when BillingRecord or LabTest changes
 */
export const useHospitalUpdates = (options: UseHospitalUpdatesOptions = {}) => {
  const { enabled = true, onUpdate, autoJoinUpdates = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<HospitalUpdate | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Initialize socket connection
    const backendUrl = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000';
    socketRef.current = io(backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    // Connection handlers
    socketRef.current.on('connect', () => {
      console.log('[Socket.io] Connected to hospital updates');
      setIsConnected(true);

      // Auto-join updates room if enabled
      if (autoJoinUpdates && socketRef.current) {
        socketRef.current.emit('join-updates');
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('[Socket.io] Disconnected from hospital updates');
      setIsConnected(false);
    });

    // Listen for global hospital updates
    socketRef.current.on('GLOBAL_HOSPITAL_UPDATE', (update: HospitalUpdate) => {
      console.log('[Socket.io] Received hospital update:', update);
      setLatestUpdate(update);

      // Call custom handler if provided
      if (onUpdate) {
        onUpdate(update);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current && autoJoinUpdates) {
        socketRef.current.emit('leave-updates');
      }
      socketRef.current?.disconnect();
    };
  }, [enabled, autoJoinUpdates, onUpdate]);

  const joinUpdates = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-updates');
    }
  };

  const leaveUpdates = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-updates');
    }
  };

  return {
    isConnected,
    latestUpdate,
    joinUpdates,
    leaveUpdates,
  };
};
