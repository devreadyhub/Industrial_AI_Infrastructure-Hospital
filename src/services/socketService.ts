import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { runHospitalAgentQueryWithAudit } from './langchainAgentService';
import { normalizeAIUserRole, isSensitiveQuery } from './aiSecurity';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'hospital-secret-key';

let io: SocketIOServer | null = null;

export interface GlobalHospitalUpdate {
  eventType: 'BILLING_RECORD_UPDATED' | 'LAB_TEST_UPDATED' | 'PATIENT_ADMITTED';
  timestamp: string;
  data: Record<string, any>;
  updatedBy?: string;
}

interface SocketAIUser {
  id?: number | string;
  role: 'visitor' | 'staff' | 'admin';
}

export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1000000,
    perMessageDeflate: {
      threshold: 1024,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Optional JWT handshake verification: if a token is provided, validate it and use claims.
    const token = socket.handshake.auth?.token as string | undefined;
    let user: SocketAIUser = { role: 'visitor' };

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const rawHandshakeUserId = socket.handshake.auth?.userId;
        // Preserve raw userId (string) when it cannot be coerced to a number
        const parsedId = decoded?.staffId ? Number(decoded.staffId) : rawHandshakeUserId ? Number(rawHandshakeUserId) : undefined;
        user = {
          role: normalizeAIUserRole(decoded.role || socket.handshake.auth?.userRole),
          id: Number.isFinite(parsedId) ? parsedId : (decoded?.staffId ?? rawHandshakeUserId),
        } as SocketAIUser;
      } catch (err) {
        console.warn('[Socket.io] JWT verification failed for socket connection:', err instanceof Error ? err.message : err);
        // Fall back to explicit handshake values if token verification fails
        const rawUserRole = socket.handshake.auth?.userRole;
        const rawUserId = socket.handshake.auth?.userId;
        const parsedId = rawUserId ? Number(rawUserId) : undefined;
        user = {
          role: normalizeAIUserRole(rawUserRole),
          id: Number.isFinite(parsedId) ? parsedId : rawUserId,
        } as SocketAIUser;
      }
    } else {
      const rawUserRole = socket.handshake.auth?.userRole;
      const rawUserId = socket.handshake.auth?.userId;
      const parsedId = rawUserId ? Number(rawUserId) : undefined;
      user = {
        role: normalizeAIUserRole(rawUserRole),
        id: Number.isFinite(parsedId) ? parsedId : rawUserId,
      } as SocketAIUser;
    }

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
        const metadata = { userId: user.id, socketId: socket.id };
        const { answer } = await runHospitalAgentQueryWithAudit(payload.question, user.role, payload.context, metadata);
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
