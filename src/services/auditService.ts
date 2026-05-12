import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || '';
let prisma: PrismaClient | null = null;

const getPrisma = (): PrismaClient | null => {
  if (!databaseUrl) {
    return null;
  }

  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
};

export interface AuditLogPayload {
  interactionType: 'SQL_QUERY' | 'AGENT_QUERY' | 'VECTOR_SEARCH' | string;
  userPrompt: string;
  sqlGenerated?: string;
  vectorQuery?: string;
  rawOutput: string;
  finalOutput: string;
  status: 'SUCCESS' | 'ERROR' | 'PARTIAL';
  errorMessage?: string;
  userId?: number;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs AI interactions for medical accountability and compliance
 */
export const logAIInteraction = async (payload: AuditLogPayload): Promise<void> => {
  try {
    const client = getPrisma();
    if (!client) {
      console.log('[Audit] Database URL not configured; skipping audit log.');
      return;
    }

    await client.auditLog.create({
      data: {
        interactionType: payload.interactionType,
        userPrompt: payload.userPrompt,
        sqlGenerated: payload.sqlGenerated,
        vectorQuery: payload.vectorQuery,
        rawOutput: payload.rawOutput,
        finalOutput: payload.finalOutput,
        status: payload.status,
        errorMessage: payload.errorMessage,
        userId: payload.userId,
        userRole: payload.userRole,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        metadata: payload.metadata ?? undefined,
      },
    });

    console.log(`[Audit] Logged AI interaction: ${payload.interactionType} - ${payload.status}`);
  } catch (error) {
    console.error('[Audit] Failed to log AI interaction:', error);
    // Don't throw - audit logging should never break the AI flow
  }
};

/**
 * Retrieves audit logs with optional filtering
 */
export const getAuditLogs = async (options?: {
  interactionType?: string;
  status?: string;
  userId?: number;
  userRole?: string;
  accessStatus?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  try {
    const {
      interactionType,
      status,
      userId,
      userRole,
      accessStatus,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = options || {};

    const client = getPrisma();
    if (!client) {
      console.warn('[Audit] getAuditLogs skipped because DATABASE_URL is not configured');
      return [];
    }

    const logs = (await client.auditLog.findMany({
      where: {
        ...(interactionType && { interactionType: interactionType as any }),
        ...(status && { status: status as any }),
        ...(userId && { userId }),
        ...(userRole && { userRole: { contains: userRole, mode: 'insensitive' } }),
        ...(accessStatus && { accessStatus: accessStatus as any }),
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })) as any[];

    return logs;
  } catch (error) {
    console.error('[Audit] Failed to retrieve audit logs:', error);
    return [];
  }
};

export const getAuditSecurityStatus = async (options?: {
  userId?: number;
  userRole?: string;
}) => {
  try {
    const client = getPrisma();
    if (!client) {
      console.warn('[Audit] getAuditSecurityStatus skipped because DATABASE_URL is not configured');
      return false;
    }

    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const whereClause: any = {
      accessStatus: 'DENIED_BY_PRIVACY_FILTER',
      createdAt: {
        gte: thirtySecondsAgo,
      },
    };

    if (options?.userId) {
      whereClause.userId = options.userId;
    } else if (options?.userRole) {
      whereClause.userRole = { contains: options.userRole, mode: 'insensitive' };
    }

    const violation = await client.auditLog.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return Boolean(violation);
  } catch (error) {
    console.error('[Audit] Failed to retrieve security status:', error);
    return false;
  }
};

/**
 * Get audit log statistics for compliance reporting
 */
export const getAuditStatistics = async (startDate?: Date, endDate?: Date) => {
  try {
    const client = getPrisma();
    if (!client) {
      console.warn('[Audit] getAuditStatistics skipped because DATABASE_URL is not configured');
      return null;
    }

    const logs = (await client.auditLog.findMany({
      where: {
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        },
      },
    })) as any[];

    const stats = {
      totalInteractions: logs.length,
      successfulInteractions: logs.filter((l) => l.status === 'SUCCESS').length,
      errorInteractions: logs.filter((l) => l.status === 'ERROR').length,
      partialInteractions: logs.filter((l) => l.status === 'PARTIAL').length,
      byType: logs.reduce(
        (acc, log) => {
          acc[log.interactionType] = (acc[log.interactionType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      averageExecutionTime:
        logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + l.executionTime, 0) / logs.length) : 0,
      errorsWithMessages: logs
        .filter((l) => l.errorMessage)
        .map((l) => ({
          timestamp: l.createdAt,
          type: l.interactionType,
          error: l.errorMessage,
        })),
    };

    return stats;
  } catch (error) {
    console.error('[Audit] Failed to get audit statistics:', error);
    return null;
  }
};
