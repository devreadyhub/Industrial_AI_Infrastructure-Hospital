import { Router } from 'express';
import {
  getVisitors,
  checkInVisitor,
  checkOutVisitor,
  getPatients,
  getStaffMembers,
} from '../controllers/visitorController';
import { auditAIInteractionMiddleware } from '../middleware/auditMiddleware';
import { authenticateAIUser, protectRoute } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication and audit middleware to all visitor routes
router.use(authenticateAIUser);
router.use(protectRoute(1));
router.use(auditAIInteractionMiddleware);

// Visitor management routes
router.get('/', getVisitors);
router.post('/check-in', checkInVisitor);
router.post('/:id/check-out', checkOutVisitor);

// Helper routes to get patients and staff for visitor check-in
router.get('/patients', getPatients);
router.get('/staff', getStaffMembers);

export default router;