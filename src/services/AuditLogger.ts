import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, json, colorize } = format;

const auditLogDirectory = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(auditLogDirectory)) {
  fs.mkdirSync(auditLogDirectory, { recursive: true });
}

const auditLogFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}] ${message}`;
});

export const auditLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json(),
  ),
  transports: [
    new transports.Console({ format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), auditLogFormat) }),
    new transports.File({ filename: 'logs/audit.log', format: json() }),
  ],
});

const databaseUrl = process.env.DATABASE_URL || '';
let prisma: PrismaClient | null = null;

const getPrismaClient = (): PrismaClient | null => {
  if (!databaseUrl) {
    return null;
  }

  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
};

export type AuditActionType = 'SENSITIVE_QUERY' | 'TAB_ACCESS' | 'DATA_MODIFICATION' | string;
export type AuditAccessStatus = 'SUCCESS' | 'DENIED_BY_PRIVACY_FILTER';

export interface AuditLogEntry {
  userId?: number;
  userRole?: string;
  actionType: AuditActionType;
  rawPrompt: string;
  systemResponse: string;
  accessStatus: AuditAccessStatus;
  interactionType?: string;
  sqlGenerated?: string;
  vectorQuery?: string;
  status?: 'SUCCESS' | 'ERROR' | 'PARTIAL';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * AuditLogger is a write-only service for audit records. Logs are intentionally read-only from the application layer.
 * There is no delete or update method exposed here to preserve audit integrity.
 */
export class AuditLogger {
  static async log(entry: AuditLogEntry): Promise<void> {
    auditLogger.info('Audit entry created', {
      actionType: entry.actionType,
      userId: entry.userId,
      userRole: entry.userRole,
      accessStatus: entry.accessStatus,
      interactionType: entry.interactionType,
    });

    try {
      const client = getPrismaClient();
      if (!client) {
        auditLogger.warn('AuditLogger skipped database write because DATABASE_URL is not configured');
        return;
      }

      await client.auditLog.create({
        data: {
          interactionType: entry.interactionType || entry.actionType,
          actionType: entry.actionType,
          userPrompt: entry.rawPrompt,
          systemResponse: entry.systemResponse,
          rawOutput: entry.systemResponse,
          finalOutput: entry.systemResponse,
          accessStatus: entry.accessStatus,
          status: entry.status || 'SUCCESS',
          errorMessage: entry.errorMessage,
          userId: entry.userId,
          userRole: entry.userRole,
          sqlGenerated: entry.sqlGenerated,
          vectorQuery: entry.vectorQuery,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata ?? undefined,
        },
      });
    } catch (error) {
      auditLogger.error('Failed to write audit log to database', { error });
    }
  }
}

export default AuditLogger;
