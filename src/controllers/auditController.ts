import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  getAuditLogs,
  getAuditStatistics,
  getAuditSecurityStatus,
} from '../services/auditService';

export const handleGetAuditLogs = async (req: Request, res: Response) => {
  try {
    const {
      interactionType,
      status,
      userId,
      userRole,
      accessStatus,
      startDate,
      endDate,
      limit = '100',
      offset = '0',
    } = req.query;

    const logs = await getAuditLogs({
      interactionType: interactionType as string | undefined,
      status: status as string | undefined,
      userId: userId ? parseInt(userId as string) : undefined,
      userRole: userRole as string | undefined,
      accessStatus: accessStatus as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: Math.min(parseInt(limit as string), 500), // Cap at 500
      offset: parseInt(offset as string) || 0,
    });

    return res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    return res.status(500).json({
      message: 'Failed to retrieve audit logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleGetAuditStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await getAuditStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
    );

    if (!stats) {
      return res.status(500).json({ message: 'Failed to calculate statistics' });
    }

    return res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    console.error('Failed to retrieve audit statistics:', error);
    return res.status(500).json({
      message: 'Failed to retrieve audit statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleGetAuditSecurityStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.staffId ? parseInt(req.user.staffId, 10) : undefined;
    const hasViolation = await getAuditSecurityStatus({
      userId: isNaN(userId || NaN) ? undefined : userId,
      userRole: req.user?.role,
    });

    return res.json({
      success: true,
      securityViolation: hasViolation,
    });
  } catch (error) {
    console.error('Failed to retrieve audit security status:', error);
    return res.status(500).json({
      message: 'Failed to retrieve audit security status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleGetAuditLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Note: This would require prisma.auditLog.findUnique which isn't exposed in getAuditLogs
    // For now, we'll get all logs and filter (in production, add a dedicated service method)
    const logs = await getAuditLogs({ limit: 1, offset: 0 });

    // Simplified - would need proper lookup in production
    return res.status(501).json({
      message: 'Individual log lookup not yet implemented. Use getAuditLogs with filters instead.',
    });
  } catch (error) {
    console.error('Failed to retrieve audit log:', error);
    return res.status(500).json({
      message: 'Failed to retrieve audit log',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
