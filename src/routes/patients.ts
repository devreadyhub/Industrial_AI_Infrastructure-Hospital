import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Record patient admission
router.post('/admit', async (req: Request, res: Response) => {
  try {
    const { ward, admittedBy, patientName, triageLevel, admissionNotes } = req.body;

    // Verify staff ID exists
    const staff = await prisma.staff.findUnique({ where: { id: admittedBy } });
    if (!staff) {
      res.status(400).json({ error: 'Invalid Staff ID' });
      return;
    }

    // Find or create ward
    let wardRecord = await prisma.ward.findFirst({ where: { wardName: ward } });
    if (!wardRecord) {
      wardRecord = await prisma.ward.create({
        data: {
          wardName: ward,
          capacity: 20,
          department: ward,
        },
      });
    }

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        firstName: patientName.split(' ')[0],
        lastName: patientName.split(' ').slice(1).join(' ') || 'N/A',
        triageLevel,
        wardId: wardRecord.id,
        admissionNotes,
      },
    });

    res.json({ success: true, patientId: patient.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record admission' });
  }
});

// List patients for clinical dashboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        triageLevel: true,
        admissionDate: true,
        dischargeDate: true,
        ward: {
          select: {
            wardName: true,
            department: true,
          },
        },
      },
      orderBy: {
        admissionDate: 'desc',
      },
    });

    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get single patient by ID
router.get('/:patientId', async (req: Request, res: Response) => {
  try {
    const patientId = Number(req.params.patientId);
    if (Number.isNaN(patientId)) {
      res.status(400).json({ error: 'Invalid patient ID' });
      return;
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        ward: true,
        labTests: true,
        prescriptions: true,
        billingRecords: true,
      },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

export default router;
