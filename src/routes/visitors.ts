import { Router } from 'express';
import {
  getVisitors,
  checkInVisitor,
  checkOutVisitor,
  getPatients,
} from '../controllers/visitorController';
import { auditAIInteractionMiddleware } from '../middleware/auditMiddleware';
import { authenticateAIUser } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication and audit middleware to all visitor routes
router.use(authenticateAIUser);
router.use(auditAIInteractionMiddleware);

// Visitor management routes
router.get('/', getVisitors);
router.post('/check-in', checkInVisitor);
router.post('/:id/check-out', checkOutVisitor);

// Helper route to get patients for visitor check-in
router.get('/patients', getPatients);

export default router;