import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const resources = await prisma.facility.findMany({
      include: { maintenanceLogs: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch facility resources' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      resourceName,
      resourceStatus,
      quantityAvailable,
      quantityInUse,
      maintenanceLogs,
      lastMaintenanceDate,
      nextScheduledMaintenance,
    } = req.body;

    if (!resourceName || !resourceStatus) {
      return res.status(400).json({ error: 'Resource name and status are required' });
    }

    const existingFacility = await prisma.facility.findFirst({
      where: { resourceName },
    });

    const maintenanceData = maintenanceLogs
      ? {
          create: {
            maintenanceType: 'Update',
            description: `${maintenanceLogs}${quantityAvailable !== undefined || quantityInUse !== undefined ? ` | Qty available: ${quantityAvailable} | In use: ${quantityInUse}` : ''}`,
            performedDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : new Date(),
            nextScheduled: nextScheduledMaintenance ? new Date(nextScheduledMaintenance) : undefined,
          },
        }
      : undefined;

    const facility = existingFacility
      ? await prisma.facility.update({
          where: { id: existingFacility.id },
          data: {
            status: resourceStatus,
            maintenanceLogs: maintenanceData,
          },
        })
      : await prisma.facility.create({
          data: {
            resourceName,
            resourceType: 'General',
            location: 'Main Hospital',
            status: resourceStatus,
            maintenanceLogs: maintenanceData,
          },
        });

    res.json({ success: true, facility });
  } catch (error) {
    console.error('Facilities route error:', error);
    res.status(500).json({ error: 'Failed to update facility resource' });
  }
});

export default router;
