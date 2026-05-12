import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { emitLabTestUpdate } from '../services/hospitalEventEmitter';
import { authenticateAIUser } from '../middleware/authMiddleware';
import { applyRBAC, checkClearance, UserRole } from '../middleware/rbacMiddleware';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticateAIUser);
router.use(applyRBAC);

// Submit lab test results
router.post('/', checkClearance(UserRole.CLINICAL), async (req: Request, res: Response) => {
  try {
    const { testId, testName, testCategory, resultData, status, notes, resultDate } = req.body;

    const labTest = await prisma.labTest.create({
      data: {
        testId,
        testName,
        testCategory,
        resultData: JSON.stringify(resultData),
        status,
        notes,
        resultDate: resultDate ? new Date(resultDate) : new Date(),
        patientId: 1, // TODO: Get from request context
        staffId: 1,   // TODO: Get from request context
      },
    });

    // Emit socket event
    emitLabTestUpdate(labTest, 'system');

    res.json({ success: true, testId: labTest.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit lab results' });
  }
});

// Update lab test
router.put('/:id', checkClearance(UserRole.CLINICAL), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resultData, notes, resultDate } = req.body;

    const labTest = await prisma.labTest.update({
      where: { id: parseInt(id) },
      data: {
        status,
        resultData: resultData ? JSON.stringify(resultData) : undefined,
        notes,
        resultDate: resultDate ? new Date(resultDate) : undefined,
      },
    });

    // Emit socket event
    emitLabTestUpdate(labTest, 'system');

    res.json({ success: true, labTest });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lab test' });
  }
});

export default router;
