import { Router } from 'express';
import { signAuthToken, authenticateJWT, protectRoute, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

const demoStaffUsers = [
  {
    id: 'STAFF-REC-01',
    staffId: 'STAFF-REC-01',
    name: 'Jane Smith',
    role: 'Receptionist',
    clearanceLevel: 1,
  },
  {
    id: 'STAFF-PHA-01',
    staffId: 'STAFF-PHA-01',
    name: 'Michael Johnson',
    role: 'Pharmacist',
    clearanceLevel: 2,
  },
  {
    id: 'STAFF-NUR-01',
    staffId: 'STAFF-NUR-01',
    name: 'Sarah Williams',
    role: 'Ward Nurse',
    clearanceLevel: 3,
  },
  {
    id: 'STAFF-SUR-01',
    staffId: 'STAFF-SUR-01',
    name: 'David Brown',
    role: 'Chief Surgeon',
    clearanceLevel: 4,
  },
  {
    id: 'STAFF-ADM-01',
    staffId: 'STAFF-ADM-01',
    name: 'Lisa Davis',
    role: 'System Admin',
    clearanceLevel: 5,
  },
];

router.post('/login', (req, res) => {
  const { staffId, password } = req.body;

  if (!staffId || !password) {
    return res.status(400).json({
      message: 'staffId and password are required',
    });
  }

  if (password !== 'demo123') {
    return res.status(401).json({
      message: 'Invalid credentials',
    });
  }

  const user = demoStaffUsers.find((staff) => staff.staffId === staffId);

  if (!user) {
    return res.status(401).json({
      message: 'Invalid staff ID or password',
    });
  }

  const token = signAuthToken({
    staffId: user.staffId,
    role: user.role,
    clearanceLevel: user.clearanceLevel,
  });

  return res.json({
    token,
    user,
  });
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
