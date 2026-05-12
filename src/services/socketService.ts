import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { runHospitalAgentQueryWithAudit } from './langchainAgentService';
import { normalizeAIUserRole, isSensitiveQuery } from './aiSecurity';

let io: SocketIOServer | null = null;

export interface GlobalHospitalUpdate {
  eventType: 'BILLING_RECORD_UPDATED' | 'LAB_TEST_UPDATED';
  timestamp: string;
  data: Record<string, any>;
  updatedBy?: string;
}

interface SocketAIUser {
  id?: number;
  role: 'visitor' | 'staff' | 'admin';
}

export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    const rawUserRole = socket.handshake.auth?.userRole;
    const rawUserId = socket.handshake.auth?.userId;
    const user: SocketAIUser = {
      role: normalizeAIUserRole(rawUserRole),
      id: rawUserId ? Number(rawUserId) : undefined,
    };

    socket.data.user = user;

    console.log(`[Socket.io] Client connected: ${socket.id} as ${user.role}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });

    socket.on('join-updates', () => {
      socket.join('hospital-updates');
      console.log(`[Socket.io] Client ${socket.id} joined hospital-updates room`);
    });

    socket.on('leave-updates', () => {
      socket.leave('hospital-updates');
      console.log(`[Socket.io] Client ${socket.id} left hospital-updates room`);
    });

    socket.on('chat-message', async (payload: { question?: string; context?: string }) => {
      if (!payload?.question || typeof payload.question !== 'string') {
        socket.emit('chat-error', { error: 'Question is required for chat requests.' });
        return;
      }

      if (user.role === 'visitor' && isSensitiveQuery(payload.question)) {
        socket.emit('chat-response', {
          answer: "I'm sorry, I don't have permission to share that information.",
        });
        return;
      }

      try {
        const { answer } = await runHospitalAgentQueryWithAudit(payload.question, user.role, payload.context);
        socket.emit('chat-response', { answer });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during AI chat.';
        socket.emit('chat-error', { error: message });
      }
    });
  });

  return io;
};

export const getSocketIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initializeSocketIO() first.');
  }
  return io;
};

export const emitGlobalHospitalUpdate = (update: GlobalHospitalUpdate): void => {
  const socketIO = getSocketIO();
  socketIO.to('hospital-updates').emit('GLOBAL_HOSPITAL_UPDATE', update);
};

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

export const initializeEmergencyNamespace = (io: SocketIOServer): void => {
  const emergencyNamespace = io.of('/emergency');

  emergencyNamespace.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth?.userId;
    console.log(`[Emergency] Client connected: ${socket.id}`);

    if (userId) {
      socket.join(`staff-${userId}`);
      console.log(`[Emergency] Staff ${userId} joined personal emergency room`);
    }

    socket.on('disconnect', () => {
      console.log(`[Emergency] Client disconnected: ${socket.id}`);
    });

    socket.on('join-emergency', () => {
      socket.join('emergency-alerts');
      console.log(`[Emergency] Client ${socket.id} joined emergency-alerts room`);
    });

    socket.on('leave-emergency', () => {
      socket.leave('emergency-alerts');
      console.log(`[Emergency] Client ${socket.id} left emergency-alerts room`);
    });

    socket.on('join-staff-room', (data: { staffId?: number }) => {
      if (data?.staffId) {
        socket.join(`staff-${data.staffId}`);
        console.log(`[Emergency] Client ${socket.id} joined staff-${data.staffId}`);
      }
    });

    socket.on('leave-staff-room', (data: { staffId?: number }) => {
      if (data?.staffId) {
        socket.leave(`staff-${data.staffId}`);
        console.log(`[Emergency] Client ${socket.id} left staff-${data.staffId}`);
      }
    });
  });
};

export const broadcastEmergencyAlert = (payload: EmergencyPayload): void => {
  const socketIO = getSocketIO();
  const emergencyNamespace = socketIO.of('/emergency');
  emergencyNamespace.to('emergency-alerts').emit('EMERGENCY_ALERT', payload);
  console.log(`[Emergency] Broadcasted alert: ${payload.incidentType} at ${payload.location}`);
};

export const notifyEmergencyStaff = (
  staffIds: number[],
  message: string,
  payload?: Record<string, any>,
): void => {
  const socketIO = getSocketIO();
  const emergencyNamespace = socketIO.of('/emergency');

  staffIds.forEach((staffId) => {
    emergencyNamespace.to(`staff-${staffId}`).emit('STAFF_EMERGENCY_NOTIFICATION', {
      message,
      payload,
    });
    console.log(`[Emergency] Sent push notification to staff-${staffId}`);
  });
};
