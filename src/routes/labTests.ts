import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { emitLabTestUpdate } from '../services/hospitalEventEmitter';
import { authenticateAIUser } from '../middleware/authMiddleware';
import { applyRBAC, checkClearance, UserRole } from '../middleware/rbacMiddleware';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticateAIUser);
router.use(applyRBAC);

// List lab tests
router.get('/', checkClearance(UserRole.CLINICAL), async (_req: Request, res: Response) => {
  try {
    const labTests = await prisma.labTest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      labTests.map((labTest) => ({
        ...labTest,
        resultData: labTest.resultData ? JSON.parse(labTest.resultData) : null,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lab tests' });
  }
});

// Submit lab test results
router.post('/', checkClearance(UserRole.CLINICAL), async (req: Request, res: Response) => {
  try {
    const {
      testId,
      testName,
      testCategory,
      resultData,
      status,
      notes,
      resultDate,
      patientId,
      performedBy,
    } = req.body;

    const resolvedTestId = testId || `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const resolvedPatientId = Number(patientId);
    let patientIdValue = !Number.isNaN(resolvedPatientId) ? resolvedPatientId : undefined;
    if (!patientIdValue) {
      const patient = await prisma.patient.findUnique({ where: { patientCode: String(patientId) } });
      patientIdValue = patient?.id ?? 1;
    }

    // Prefer the authenticated user's staffId; fall back to provided `performedBy` code
    let staffId = 1;
    const currentStaffCode = (req as any).user?.staffId || performedBy;
    if (currentStaffCode) {
      const staff = await prisma.staff.findUnique({ where: { staffCode: String(currentStaffCode) } });
      if (staff) {
        staffId = staff.id;
      }
    }

    const labTest = await prisma.labTest.create({
      data: {
        testId: resolvedTestId,
        testName,
        testCategory: testCategory || 'General',
        resultData: JSON.stringify(resultData),
        status: status || 'PENDING',
        notes,
        resultDate: resultDate ? new Date(resultDate) : new Date(),
        patientId: patientIdValue,
        staffId,
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
