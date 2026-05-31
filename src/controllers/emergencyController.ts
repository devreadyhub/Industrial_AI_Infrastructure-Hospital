import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmergencyService, EmergencyTriggerRequest } from '../services/emergencyService';

const prisma = new PrismaClient();

export const handleTriggerEmergency = async (req: Request, res: Response): Promise<void> => {
  try {
    const { incidentType, location, description, patientId }: EmergencyTriggerRequest = req.body;
    // Resolve authenticated user's staffCode to numeric staff ID
    const triggeredByStaffCode = (req as any).user?.staffId;
    let triggeredByStaffId: number | undefined = undefined;
    if (triggeredByStaffCode) {
      const staff = await prisma.staff.findUnique({ where: { staffCode: String(triggeredByStaffCode) } });
      triggeredByStaffId = staff?.id;
    }

    if (!incidentType || !location) {
      res.status(400).json({ error: 'Incident type and location are required' });
      return;
    }

    const payload = await EmergencyService.triggerEmergency({
      incidentType,
      location,
      description,
      patientId,
      triggeredByStaffId,
    });

    res.status(201).json({
      message: 'Emergency triggered successfully',
      emergency: payload,
    });
  } catch (error) {
    console.error('Error triggering emergency:', error);
    res.status(500).json({ error: 'Failed to trigger emergency' });
  }
};

export const handleResolveEmergency = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { actionsTaken } = req.body;
    const resolvedByStaffCode = (req as any).user?.staffId;
    let resolvedByStaffId: number | undefined = undefined;
    if (resolvedByStaffCode) {
      const staff = await prisma.staff.findUnique({ where: { staffCode: String(resolvedByStaffCode) } });
      resolvedByStaffId = staff?.id;
    }

    if (!actionsTaken) {
      res.status(400).json({ error: 'Actions taken are required' });
      return;
    }

    await EmergencyService.resolveEmergency(parseInt(id), actionsTaken, resolvedByStaffId);

    res.json({ message: 'Emergency resolved successfully' });
  } catch (error) {
    console.error('Error resolving emergency:', error);
    res.status(500).json({ error: 'Failed to resolve emergency' });
  }
};

export const handleGetActiveEmergencies = async (req: Request, res: Response): Promise<void> => {
  try {
    const emergencies = await EmergencyService.getActiveEmergencies();
    res.json({ emergencies });
  } catch (error) {
    console.error('Error fetching emergencies:', error);
    res.status(500).json({ error: 'Failed to fetch emergencies' });
  }
};