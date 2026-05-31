import { Router, Request, Response } from 'express';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { emitPatientAdmitted } from '../services/hospitalEventEmitter';
import { authenticateAIUser, protectRoute } from '../middleware/authMiddleware';

const prisma = new PrismaClient();
const admissionErrorLog = '/tmp/admit-debug.log';
const router = Router();

router.use(authenticateAIUser);
router.use(protectRoute(3));

// Record patient admission
router.post('/admit', async (req: Request, res: Response) => {
  try {
    const {
      ward,
      patientName,
      patientCode,
      triageLevel,
      admissionNotes,
      contactNumber,
    } = req.body;

    // Use the authenticated user's staffId as the admitting staff code
    const admittedBy = (req as any).user?.staffId;

    if (!ward || !admittedBy || !patientName || !triageLevel) {
      return res.status(400).json({ error: 'Missing required admission fields' });
    }

    // Verify staff ID exists using staffCode
    const staff = await prisma.staff.findUnique({ where: { staffCode: admittedBy } });
    if (!staff) {
      return res.status(400).json({ error: 'Invalid Staff ID' });
    }

    // Normalize triage values from UI labels into the database enum
    const triageMap: Record<string, string> = {
      Emergency: 'CRITICAL',
      Urgent: 'HIGH',
      'Non-urgent': 'NON_URGENT',
      CRITICAL: 'CRITICAL',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
      NON_URGENT: 'NON_URGENT',
    };
    const normalizedTriageLevel = triageMap[triageLevel] || 'NON_URGENT';

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

    const [firstName, ...rest] = patientName.trim().split(' ');
    const lastName = rest.join(' ') || 'N/A';
    const generatedPatientCode = patientCode || `PAT-${ward.replace(/\s+/g, '').toUpperCase()}-${Date.now().toString().slice(-5)}`;

    const patient = await prisma.patient.create({
      data: {
        patientCode: generatedPatientCode,
        firstName,
        lastName,
        phone: contactNumber || undefined,
        triageLevel: normalizedTriageLevel as any,
        wardId: wardRecord.id,
        admissionNotes,
      },
    });

    // Emit a hospital-wide update for new admissions so frontends can refresh
    try {
      emitPatientAdmitted(patient, {
        wardName: wardRecord.wardName,
        wardId: wardRecord.id,
        admittedByStaff: {
          staffCode: admittedBy,
          name: staff ? `${staff.firstName} ${staff.lastName}` : undefined,
        },
      });
    } catch (emitErr) {
      console.warn('Failed to emit patient admitted event', emitErr);
    }

    res.status(201).json({
      success: true,
      patientId: patient.id,
      patientCode: patient.patientCode,
    });
  } catch (error: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      route: '/api/patients/admit',
      body: req.body,
      error: error?.message ?? error,
      stack: error?.stack,
    };
    try {
      fs.appendFileSync(admissionErrorLog, `${JSON.stringify(logEntry)}\n`);
    } catch (fsError) {
      console.error('Failed to write admission debug log', fsError);
    }
    console.error('Patient admission failed', logEntry);
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return res.status(409).json({ error: 'The generated patient code already exists. Please try again.' });
    }
    return res.status(500).json({ error: error?.message || 'Failed to record admission' });
  }
});

// List patients for clinical dashboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        patientCode: true,
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
    const rawId = req.params.patientId;
    const numericId = Number(rawId);
    const patient = await prisma.patient.findUnique({
      where: Number.isNaN(numericId) ? { patientCode: rawId } : { id: numericId },
      include: {
        ward: true,
        labTests: true,
        prescriptions: true,
        billingRecords: true,
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

export default router;
