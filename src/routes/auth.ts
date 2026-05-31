import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signAuthToken, authenticateJWT, protectRoute, AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

const router = Router();

const ADMIN_STAFF_ID = process.env.ADMIN_STAFF_ID || 'ADMIN-MAIN-001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe@Admin2026';
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hospital.local';
const ADMIN_CLEARANCE_LEVEL = process.env.ADMIN_CLEARANCE_LEVEL
  ? Number(process.env.ADMIN_CLEARANCE_LEVEL)
  : 5;

const normalizeStaffRole = (role?: string): 'visitor' | 'staff' | 'admin' => {
  const normalized = (role || '').trim().toLowerCase();
  if (normalized.includes('admin') || normalized.includes('administrator') || normalized.includes('system admin') || normalized.includes('chief')) {
    return 'admin';
  }
  if (normalized === 'visitor') {
    return 'visitor';
  }
  return 'staff';
};


router.post('/login', async (req, res) => {
  try {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
      return res.status(400).json({ message: 'staffId and password are required' });
    }

    // Check DB for staff by staffCode
    const staff = await prisma.staff.findUnique({ where: { staffCode: staffId } });

    if (staff && staff.passwordHash) {
      const match = await bcrypt.compare(password, staff.passwordHash);
      if (!match) return res.status(401).json({ message: 'Invalid credentials' });

      const user = {
        id: staff.staffCode,
        staffId: staff.staffCode,
        name: `${staff.firstName} ${staff.lastName}`,
        role: normalizeStaffRole(staff.role),
        clearanceLevel: staff.clearanceLevel ?? 1,
        email: staff.email,
      };

      const token = signAuthToken({ staffId: user.staffId, role: user.role, clearanceLevel: user.clearanceLevel });
      return res.json({ token, user });
    }

    // If no DB record or no passwordHash, allow env-based admin login and bootstrap DB admin
    if (staffId === ADMIN_STAFF_ID && password === ADMIN_PASSWORD) {
      // upsert admin staff record with hashed password
      const hashed = await bcrypt.hash(password, 10);
      const upserted = await prisma.staff.upsert({
        where: { staffCode: ADMIN_STAFF_ID },
        update: {
          firstName: ADMIN_NAME.split(' ')[0] || ADMIN_NAME,
          lastName: ADMIN_NAME.split(' ').slice(1).join(' ') || '',
          email: ADMIN_EMAIL,
          isAdmin: true,
          clearanceLevel: ADMIN_CLEARANCE_LEVEL,
          passwordHash: hashed,
        },
        create: {
          staffCode: ADMIN_STAFF_ID,
          firstName: ADMIN_NAME.split(' ')[0] || ADMIN_NAME,
          lastName: ADMIN_NAME.split(' ').slice(1).join(' ') || '',
          email: ADMIN_EMAIL,
          role: 'System Admin',
          seniority: 'CHIEF',
          isAdmin: true,
          clearanceLevel: ADMIN_CLEARANCE_LEVEL,
          passwordHash: hashed,
        },
      });

      const user = {
        id: upserted.staffCode,
        staffId: upserted.staffCode,
        name: `${upserted.firstName} ${upserted.lastName}`,
        role: normalizeStaffRole(upserted.role),
        clearanceLevel: upserted.clearanceLevel,
        email: upserted.email,
      };

      const token = signAuthToken({ staffId: user.staffId, role: user.role, clearanceLevel: user.clearanceLevel });
      return res.json({ token, user });
    }

    return res.status(401).json({ message: 'Invalid staff ID or password' });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
      return res.status(400).json({ message: 'staffId and password are required' });
    }

    const existingStaff = await prisma.staff.findUnique({ where: { staffCode: staffId } });

    if (existingStaff && existingStaff.passwordHash) {
      return res.status(409).json({ message: 'A user with this Staff ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = existingStaff
      ? await prisma.staff.update({
          where: { staffCode: staffId },
          data: { passwordHash: hashedPassword },
        })
      : await prisma.staff.create({
          data: {
            staffCode: staffId,
            firstName: staffId,
            lastName: '',
            role: 'Staff',
            seniority: 'JUNIOR',
            certifications: [],
            passwordHash: hashedPassword,
          },
        });

    const user = {
      id: staff.staffCode,
      staffId: staff.staffCode,
      name: `${staff.firstName} ${staff.lastName}`.trim(),
      role: normalizeStaffRole(staff.role),
      clearanceLevel: staff.clearanceLevel ?? 1,
      email: staff.email,
    };

    const token = signAuthToken({ staffId: user.staffId, role: user.role, clearanceLevel: user.clearanceLevel });
    return res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

// Change password endpoint
router.post('/change-password', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword, targetStaffId } = req.body;
    const requester = req.user;

    if (!newPassword) return res.status(400).json({ message: 'New password is required' });

    const staffCodeToChange = targetStaffId || requester?.staffId;
    if (!staffCodeToChange) return res.status(400).json({ message: 'No target staff specified' });

    const staff = await prisma.staff.findUnique({ where: { staffCode: staffCodeToChange } });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    // If requester is changing someone else's password, require high clearance
    if (staffCodeToChange !== requester?.staffId && (requester?.clearanceLevel ?? 0) < 5) {
      return res.status(403).json({ message: 'Insufficient clearance to change other passwords' });
    }

    // If staff has existing passwordHash, require currentPassword unless admin
    if (staff.passwordHash && (requester?.clearanceLevel ?? 0) < 5) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
      const ok = await bcrypt.compare(currentPassword, staff.passwordHash);
      if (!ok) return res.status(401).json({ message: 'Current password incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.staff.update({ where: { staffCode: staffCodeToChange }, data: { passwordHash: hashed } });

    return res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Change password error', error);
    return res.status(500).json({ message: 'Failed to change password' });
  }
});

router.get('/me', authenticateJWT, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

router.get('/verify-clearance/:level', authenticateJWT, (req: AuthenticatedRequest, res, next) => {
  const requiredLevel = Number(req.params.level);
  if (Number.isNaN(requiredLevel)) {
    return res.status(400).json({ message: 'Invalid clearance level' });
  }
  return protectRoute(requiredLevel)(req, res, next);
}, (req: AuthenticatedRequest, res) => {
  return res.json({
    message: 'Access granted',
    user: req.user,
  });
});

export default router;
