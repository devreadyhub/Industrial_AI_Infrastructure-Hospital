import { Router } from 'express';
import {
  handleTriggerEmergency,
  handleResolveEmergency,
  handleGetActiveEmergencies,
} from '../controllers/emergencyController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All emergency routes require authentication
router.use(authenticateToken);

// Trigger a new emergency
router.post('/trigger', handleTriggerEmergency);

// Resolve an emergency
router.put('/:id/resolve', handleResolveEmergency);

// Get active emergencies
router.get('/active', handleGetActiveEmergencies);

export default router;