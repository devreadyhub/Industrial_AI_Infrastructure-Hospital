import { Router } from 'express';
import {
  handleGetAuditLogs,
  handleGetAuditStatistics,
  handleGetAuditSecurityStatus,
} from '../controllers/auditController';
import { authenticateJWT, protectRoute } from '../middleware/authMiddleware';

const router = Router();

// Require authentication for all audit routes
router.use(authenticateJWT);

/**
 * GET /api/audit/security-status
 * Check if the audit log has flagged a recent security violation
 * This endpoint is available to any authenticated user for session protection.
 */
router.get('/security-status', handleGetAuditSecurityStatus);

// Require admin-level clearance (level 5) for all other audit routes
router.use(protectRoute(5));

/**
 * GET /api/audit/logs
 * Retrieve audit logs with optional filtering
 * Requires: Admin clearance level (5) and valid JWT token
 * Query params:
 *  - interactionType: 'SQL_QUERY', 'AGENT_QUERY', 'VECTOR_STORE_REFRESH', etc.
 *  - status: 'SUCCESS', 'ERROR', 'PARTIAL'
 *  - userId: numeric user ID
 *  - userRole: filter by user role (case-insensitive)
 *  - accessStatus: 'SUCCESS' or 'DENIED_BY_PRIVACY_FILTER'
 *  - startDate: ISO date string
 *  - endDate: ISO date string
 *  - limit: max records (capped at 500)
 *  - offset: pagination offset
 *
 * Example: GET /api/audit/logs?userRole=nurse&accessStatus=DENIED_BY_PRIVACY_FILTER&limit=50&offset=0
 */
router.get('/logs', handleGetAuditLogs);

/**
 * GET /api/audit/statistics
 * Get audit statistics for compliance reporting
 * Requires: Admin clearance level (5) and valid JWT token
 * Query params:
 *  - startDate: ISO date string
 *  - endDate: ISO date string
 *
 * Returns: counts by type, success rates, error summary, average execution time
 *
 * Example: GET /api/audit/statistics?startDate=2026-05-01&endDate=2026-05-31
 */
router.get('/statistics', handleGetAuditStatistics);

export default router;
