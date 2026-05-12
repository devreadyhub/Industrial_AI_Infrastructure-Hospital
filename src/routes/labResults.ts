import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAIUser } from '../middleware/authMiddleware';
import { applyRBAC, checkClearance, UserRole } from '../middleware/rbacMiddleware';
import { Request } from 'express';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticateAIUser);
router.use(applyRBAC);

router.get('/', checkClearance(UserRole.CLINICAL), async (req: Request, res: Response) => {
  try {
    const labResults = await prisma.labTest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        testId: true,
        testName: true,
        testCategory: true,
        resultData: true,
        status: true,
        notes: true,
        resultDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ labResults });
  } catch (error) {
    console.error('Failed to fetch lab results:', error);
    return res.status(500).json({ message: 'Unable to fetch lab results' });
  }
});

export default router;
