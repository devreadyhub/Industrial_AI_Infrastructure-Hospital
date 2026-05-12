import { Router } from 'express';
import healthRouter from './health';
import userRouter from './user';
import staffRouter from './staff';
import patientRouter from './patients';
import labRouter from './labTests';
import labResultsRouter from './labResults';
import pharmacyRouter from './pharmacy';
import aiRouter from './ai';
import auditRouter from './audit';
import authRouter from './auth';
import visitorRouter from './visitors';
import emergencyRouter from './emergency';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/staff', staffRouter);
router.use('/patients', patientRouter);
router.use('/lab-tests', labRouter);
router.use('/lab-results', labResultsRouter);
router.use('/pharmacy', pharmacyRouter);
router.use('/ai', aiRouter);
router.use('/audit', auditRouter);
router.use('/visitors', visitorRouter);
router.use('/emergency', emergencyRouter);

export default router;
