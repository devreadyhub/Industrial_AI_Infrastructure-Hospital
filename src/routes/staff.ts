import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateAIUser, protectRoute } from '../middleware/authMiddleware';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticateAIUser);
router.use(protectRoute(5));

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
};

const normalizeCertifications = (value?: string | string[]) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const mapStaffResponse = (staff: any) => ({
  staffCode: staff.staffCode,
  firstName: staff.firstName,
  lastName: staff.lastName,
  staffName: `${staff.firstName} ${staff.lastName}`,
  department: staff.department || 'General',
  staffStatus: staff.currentStatus || 'On-duty',
  seniority: staff.seniority || 'MID_LEVEL',
  shiftAssignment: staff.shiftAssignment || 'Morning (6AM-2PM)',
  role: staff.role,
  email: staff.email || '',
  phone: staff.phone || '',
  dateOfBirth: staff.dateOfBirth || null,
  gender: staff.gender || null,
  bloodType: staff.bloodType || null,
  specialization: staff.specialization || null,
  yearsOfExperience: staff.yearsOfExperience ?? null,
  assignedWardId: staff.assignedWardId || null,
  onCallStatus: staff.onCallStatus || null,
  nextScheduledShift: staff.nextScheduledShift || null,
  emergencyContactName: staff.emergencyContactName || null,
  emergencyContactPhone: staff.emergencyContactPhone || null,
  backgroundCheckDate: staff.backgroundCheckDate || null,
  trainingExpiryDate: staff.trainingExpiryDate || null,
  licenseNumber: staff.licenseNumber || null,
  certifications: staff.certifications || [],
  currentLocation: staff.currentLocation || null,
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const staff = await prisma.staff.findMany({
      select: {
        staffCode: true,
        firstName: true,
        lastName: true,
        role: true,
        seniority: true,
        department: true,
        currentStatus: true,
        shiftAssignment: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        bloodType: true,
        specialization: true,
        yearsOfExperience: true,
        assignedWardId: true,
        onCallStatus: true,
        nextScheduledShift: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        backgroundCheckDate: true,
        trainingExpiryDate: true,
        licenseNumber: true,
        certifications: true,
        currentLocation: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(staff.map(mapStaffResponse));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      staffCode: bodyStaffCode,
      staffId,
      staffName,
      department,
      staffStatus,
      seniority,
      shiftAssignment,
      role,
      email,
      phone,
      dateOfBirth,
      gender,
      bloodType,
      specialization,
      yearsOfExperience,
      assignedWardId,
      onCallStatus,
      nextScheduledShift,
      emergencyContactName,
      emergencyContactPhone,
      backgroundCheckDate,
      trainingExpiryDate,
      licenseNumber,
      certifications,
      currentLocation,
    } = req.body;

    const staffCode = bodyStaffCode || staffId;

    console.log('POST /staff received:', {
      staffCode,
      staffId,
      staffName,
      department,
      staffStatus,
      seniority,
      shiftAssignment,
      role,
      email,
      phone,
    });

    if (!staffCode) {
      return res.status(400).json({ message: 'staffCode or staffId is required (e.g., STF-0001)' });
    }
    if (!staffName) {
      return res.status(400).json({ message: 'staffName is required' });
    }
    if (!department) {
      return res.status(400).json({ message: 'department is required' });
    }

    if (!/^STF-\d{4}$/.test(staffCode)) {
      return res.status(400).json({ message: 'staffCode must follow format STF-XXXX (e.g., STF-0001)' });
    }

    const [firstName, ...rest] = staffName.trim().split(' ');
    const lastName = rest.join(' ') || 'Staff';

    const staff = await prisma.staff.create({
      data: {
        staffCode,
        firstName,
        lastName,
        role: role || department,
        department,
        currentStatus: staffStatus || 'On-duty',
        shiftAssignment: shiftAssignment || 'Morning (6AM-2PM)',
        seniority: seniority || 'MID_LEVEL',
        email,
        phone,
        dateOfBirth: parseDate(dateOfBirth),
        gender,
        bloodType,
        specialization,
        yearsOfExperience: typeof yearsOfExperience === 'string' ? parseInt(yearsOfExperience, 10) : yearsOfExperience,
        assignedWardId,
        onCallStatus,
        nextScheduledShift: parseDate(nextScheduledShift),
        emergencyContactName,
        emergencyContactPhone,
        backgroundCheckDate: parseDate(backgroundCheckDate),
        trainingExpiryDate: parseDate(trainingExpiryDate),
        licenseNumber,
        certifications: normalizeCertifications(certifications),
        currentLocation,
      },
    });

    console.log('Staff created successfully:', staff.staffCode);
    res.status(201).json(mapStaffResponse(staff));
  } catch (error) {
    console.error('Error creating staff:', error);
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return res.status(409).json({ message: 'A staff member with that ID already exists.' });
    }
    res.status(500).json({ error: 'Failed to create staff member', details: (error as any).message });
  }
});

router.put('/:staffCode', async (req: Request, res: Response) => {
  try {
    const { staffCode } = req.params;
    const {
      staffName,
      department,
      staffStatus,
      seniority,
      shiftAssignment,
      role,
      email,
      phone,
      dateOfBirth,
      gender,
      bloodType,
      specialization,
      yearsOfExperience,
      assignedWardId,
      onCallStatus,
      nextScheduledShift,
      emergencyContactName,
      emergencyContactPhone,
      backgroundCheckDate,
      trainingExpiryDate,
      licenseNumber,
      certifications,
      currentLocation,
    } = req.body;

    const [firstName, ...rest] = staffName?.trim().split(' ') || [''];
    const lastName = rest.join(' ') || 'Staff';

    const staff = await prisma.staff.update({
      where: { staffCode },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role: role || department || undefined,
        department: department || undefined,
        currentStatus: staffStatus || undefined,
        shiftAssignment: shiftAssignment || undefined,
        seniority: seniority || undefined,
        email: email || undefined,
        phone: phone || undefined,
        dateOfBirth: parseDate(dateOfBirth),
        gender: gender || undefined,
        bloodType: bloodType || undefined,
        specialization: specialization || undefined,
        yearsOfExperience: typeof yearsOfExperience === 'string' ? parseInt(yearsOfExperience, 10) : yearsOfExperience,
        assignedWardId: assignedWardId || undefined,
        onCallStatus: onCallStatus || undefined,
        nextScheduledShift: parseDate(nextScheduledShift),
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        backgroundCheckDate: parseDate(backgroundCheckDate),
        trainingExpiryDate: parseDate(trainingExpiryDate),
        licenseNumber: licenseNumber || undefined,
        certifications: certifications ? normalizeCertifications(certifications) : undefined,
        currentLocation: currentLocation || undefined,
      },
    });

    res.json(mapStaffResponse(staff));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

export default router;
