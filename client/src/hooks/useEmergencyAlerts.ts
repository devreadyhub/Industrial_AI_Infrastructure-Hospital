import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

export interface EmergencyPayload {
  incidentType: string;
  location: string;
  priority: 'HIGH' | 'CRITICAL' | 'CODE_BLUE';
  description?: string;
  patientId?: number;
  requiredActions: string[];
  triggeredBy?: string;
  timestamp: string;
}

export const useEmergencyAlerts = () => {
  const { user } = useAuth();
  const [latestAlert, setLatestAlert] = useState<EmergencyPayload | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    const backendUrl = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000';
    const socket = io(`${backendUrl}/emergency`, {
      auth: {
        userRole: user.role,
        userId: user.id,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-emergency');
      socket.emit('join-staff-room', { staffId: user.id });
    });

    socket.on('EMERGENCY_ALERT', (payload: EmergencyPayload) => {
      setLatestAlert(payload);
      setNotificationMessage(`Emergency: ${payload.incidentType} at ${payload.location}`);
    });

    socket.on('STAFF_EMERGENCY_NOTIFICATION', (payload: { message: string }) => {
      setNotificationMessage(payload.message);
    });

    return () => {
      socket.emit('leave-emergency');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return {
    latestAlert,
    notificationMessage,
    clearNotification: () => setNotificationMessage(null),
  };
};