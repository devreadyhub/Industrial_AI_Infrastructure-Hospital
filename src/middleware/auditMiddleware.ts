import { Request, Response, NextFunction } from 'express';
import AuditLogger, { AuditAccessStatus } from '../services/AuditLogger';
import { AuthenticatedRequest } from './authMiddleware';

interface AuditedRequest extends AuthenticatedRequest {
  auditData?: {
    startTime: number;
    userPrompt?: string;
    sqlGenerated?: string;
    vectorQuery?: string;
    interactionType?: string;
    accessStatus?: AuditAccessStatus;
  };
}

/**
 * Middleware to capture and log AI interactions for medical accountability
 * Records user prompts, generated queries, and final outputs
 */
export const auditAIInteractionMiddleware = (
  req: AuditedRequest,
  res: Response,
  next: NextFunction,
) => {
  // Initialize audit data
  req.auditData = {
    startTime: Date.now(),
    userPrompt: req.body?.question || req.body?.prompt || '',
  };

  // Capture the original res.json to intercept responses
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    const executionTime = Date.now() - req.auditData!.startTime;

    const accessStatus = req.auditData?.accessStatus || 'SUCCESS';
    const userPrompt = req.auditData?.userPrompt || req.body?.question || req.body?.prompt || '';
    const interactionType = req.auditData?.interactionType || identifyInteractionType(req.path);

    const auditPayload = {
      actionType: interactionType,
      interactionType,
      userPrompt,
      systemResponse: data.answer || data.message || JSON.stringify(data),
      rawPrompt: userPrompt,
      rawOutput: JSON.stringify(data),
      finalOutput: data.answer || data.message || JSON.stringify(data),
      executionTime,
      status: (res.statusCode === 200 ? 'SUCCESS' : (res.statusCode >= 500 ? 'ERROR' : 'PARTIAL')) as 'SUCCESS' | 'ERROR' | 'PARTIAL',
      errorMessage: res.statusCode !== 200 ? (data.message || data.error || 'Unknown error') : undefined,
      accessStatus,
      userId: req.user?.staffId ? Number(req.user.staffId) : undefined,
      userRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
      },
    }; 

    AuditLogger.log(auditPayload).catch((err) => {
      console.error('[Audit] Logging error:', err);
    });

    return originalJson(data);
  } as any;

  next();
};

/**
 * Helper to identify interaction type from route
 */
function identifyInteractionType(path: string): string {
  if (path.includes('/sql-query')) return 'SQL_QUERY';
  if (path.includes('/agent-query')) return 'AGENT_QUERY';
  if (path.includes('/refresh-vector-store')) return 'VECTOR_STORE_REFRESH';
  return 'UNKNOWN';
}

/**
 * Middleware to capture SQL queries generated during AI interactions
 * Attach to req.auditData.sqlGenerated before passing to next handler
 */
export const captureSQLQuery = (sqlQuery: string) => {
  return (req: AuditedRequest, res: Response, next: NextFunction) => {
    if (req.auditData) {
      req.auditData.sqlGenerated = sqlQuery;
    }
    next();
  };
};

/**
 * Middleware to capture vector queries
 * Attach to req.auditData.vectorQuery before passing to next handler
 */
export const captureVectorQuery = (vectorQuery: string) => {
  return (req: AuditedRequest, res: Response, next: NextFunction) => {
    if (req.auditData) {
      req.auditData.vectorQuery = vectorQuery;
    }
    next();
  };
};
