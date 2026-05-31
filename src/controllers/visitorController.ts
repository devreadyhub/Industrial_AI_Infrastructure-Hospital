import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const generateVisitorCode = (): string => {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `VIS-${suffix}-${Date.now().toString().slice(-4)}`;
};

export const getVisitors = async (_req: Request, res: Response) => {
  try {
    const visitors = await prisma.visitor.findMany({
      include: {
        patient: {
          select: { firstName: true, lastName: true, patientCode: true },
        },
        staff: {
          select: { firstName: true, lastName: true, staffCode: true },
        },
        ward: true,
      },
      orderBy: { checkInTime: 'desc' },
    });

    const mapped = visitors.map((visitor) => {
      const targetType = visitor.staffId ? 'staff' : 'patient';
      const targetName = visitor.staff
        ? `${visitor.staff.firstName} ${visitor.staff.lastName}`
        : visitor.patient
        ? `${visitor.patient.firstName} ${visitor.patient.lastName}`
        : 'Unknown';
      const targetCode = visitor.staff?.staffCode ?? visitor.patient?.patientCode ?? undefined;

      return {
        id: visitor.id,
        visitorCode: visitor.visitorCode,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        phone: visitor.phone,
        email: visitor.email,
        relationship: visitor.relationship,
        patientId: visitor.patientId ?? undefined,
        staffId: visitor.staffId ?? undefined,
        targetType,
        targetName,
        targetCode,
        wardId: visitor.wardId ?? undefined,
        wardName: visitor.ward?.wardName,
        checkInTime: visitor.checkInTime.toISOString(),
        checkOutTime: visitor.checkOutTime?.toISOString(),
        expiresAt: visitor.expiresAt?.toISOString(),
        purpose: visitor.purpose,
        checkedInBy: visitor.checkedInBy,
        status: visitor.status,
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ message: 'Failed to fetch visitors' });
  }
};

export const getStaffMembers = async (_req: Request, res: Response) => {
  try {
    const staff = await prisma.staff.findMany({
      select: {
        id: true,
        staffCode: true,
        firstName: true,
        lastName: true,
        department: true,
        assignedWardId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(staff.map((member) => ({
      id: member.id,
      staffCode: member.staffCode,
      firstName: member.firstName,
      lastName: member.lastName,
      department: member.department,
      assignedWardId: member.assignedWardId,
    })));
  } catch (error) {
    console.error('Error fetching staff members:', error);
    res.status(500).json({ message: 'Failed to fetch staff members' });
  }
};

export const checkInVisitor = async (req: Request, res: Response) => {
  try {
    const {
      visitorCode,
      firstName,
      lastName,
      phone,
      email,
      relationship,
      patientId,
      staffId,
      purpose,
      checkedInBy,
    } = req.body;

    if (!firstName || !lastName || !relationship || (!patientId && !staffId)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let wardId: number | undefined;

    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: Number(patientId) },
        include: { ward: true },
      });

      if (!patient) {
        return res.status(404).json({ message: 'Patient not found for check-in' });
      }

      wardId = patient.wardId;
    } else {
      const staffMember = await prisma.staff.findUnique({
        where: { id: Number(staffId) },
      });

      if (!staffMember) {
        return res.status(404).json({ message: 'Staff member not found for check-in' });
      }

      // No reliable ward mapping exists for arbitrary staff visits, keep ward optional.
      wardId = undefined;
    }

    const visitor = await prisma.visitor.create({
      data: {
        visitorCode: visitorCode || generateVisitorCode(),
        firstName,
        lastName,
        phone: phone || undefined,
        email: email || undefined,
        relationship,
        patientId: patientId ? Number(patientId) : undefined,
        staffId: staffId ? Number(staffId) : undefined,
        wardId: wardId ?? undefined,
        purpose: purpose || undefined,
        checkedInBy: checkedInBy || 'Security Staff',
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      id: visitor.id,
      visitorCode: visitor.visitorCode,
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      patientId: visitor.patientId,
      staffId: visitor.staffId,
      wardId: visitor.wardId,
      wardName: undefined,
      status: visitor.status,
      checkInTime: visitor.checkInTime.toISOString(),
      message: 'Visitor checked in successfully',
    });
  } catch (error) {
    console.error('Error checking in visitor:', error);
    res.status(500).json({ message: 'Failed to check in visitor' });
  }
};

export const checkOutVisitor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    const visitor = await prisma.visitor.update({
      where: { id: Number(id) },
      data: {
        checkOutTime: new Date(),
        expiresAt: new Date(),
        status: 'CHECKED_OUT',
      },
    });

    res.json({
      id: visitor.id,
      visitorCode: visitor.visitorCode,
      checkOutTime: visitor.checkOutTime?.toISOString(),
      expiresAt: visitor.expiresAt?.toISOString(),
      status: visitor.status,
      message: 'Visitor checked out successfully. The visitor ID has expired.',
    });
  } catch (error) {
    console.error('Error checking out visitor:', error);
    res.status(500).json({ message: 'Failed to check out visitor' });
  }
};

export const getPatients = async (_req: Request, res: Response) => {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        patientCode: true,
        firstName: true,
        lastName: true,
        ward: {
          select: {
            id: true,
            wardName: true,
          },
        },
      },
      orderBy: { admissionDate: 'desc' },
      take: 100,
    });

    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Failed to fetch patients' });
  }
};
