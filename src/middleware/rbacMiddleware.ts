import { Request, Response, NextFunction } from 'express';

/**
 * RBAC Role Definitions with Access Levels
 * Higher level = more permissions
 */
export enum UserRole {
  RECEPTION = 'RECEPTION',      // Level 1: Basic access, visitor/patient check-in
  PHARMACY = 'PHARMACY',        // Level 2: Medication management
  CLINICAL = 'CLINICAL',        // Level 3: Patient vitals, nursing notes
  DOCTOR = 'DOCTOR',            // Level 4: Full clinical access, diagnostics
  ADMIN = 'ADMIN',              // Level 5: System administration
}

export const ROLE_LEVELS: Record<UserRole, number> = {
  [UserRole.RECEPTION]: 1,
  [UserRole.PHARMACY]: 2,
  [UserRole.CLINICAL]: 3,
  [UserRole.DOCTOR]: 4,
  [UserRole.ADMIN]: 5,
};

/**
 * Map old roles to new RBAC roles for backward compatibility
 */
export const normalizeToRBACRole = (role: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    visitor: UserRole.RECEPTION,
    staff: UserRole.CLINICAL,
    admin: UserRole.ADMIN,
    reception: UserRole.RECEPTION,
    pharmacy: UserRole.PHARMACY,
    clinical: UserRole.CLINICAL,
    doctor: UserRole.DOCTOR,
  };

  return roleMap[role.toLowerCase()] || UserRole.RECEPTION;
};

/**
 * Extended authenticated request with RBAC role
 */
export interface RBACUser {
  id?: string;
  role: UserRole;
  level: number;
}

export interface RBACRequest extends Request {
  user?: RBACUser;
}

/**
 * Middleware: Convert user role to RBAC role
 * Should be used after authenticateAIUser
 */
export const applyRBAC = (req: RBACRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const rbacRole = normalizeToRBACRole(req.user.role);
  const level = ROLE_LEVELS[rbacRole];

  req.user = {
    ...req.user,
    role: rbacRole,
    level,
  };

  next();
};

/**
 * Factory function to create access control middleware
 * Usage: app.get('/api/lab-results', checkClearance(UserRole.CLINICAL), getLabResults)
 */
export const checkClearance = (requiredRole: UserRole | UserRole[]) => {
  return (req: RBACRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userLevel = req.user.level || 0;
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const requiredLevel = Math.min(...requiredRoles.map(r => ROLE_LEVELS[r]));

    if (userLevel < requiredLevel) {
      const userRoleStr = req.user.role || 'UNKNOWN';
      const requiredRolesStr = requiredRoles.join(', ');

      console.warn(
        `[RBAC] Access denied: User ${req.user.id} (${userRoleStr}, Level ${userLevel}) ` +
        `tried to access resource requiring ${requiredRolesStr} (Level ${requiredLevel})`
      );

      return res.status(403).json({
        message: 'Insufficient permissions',
        userRole: userRoleStr,
        userLevel,
        requiredLevel,
        requiredRoles: requiredRolesStr,
      });
    }

    next();
  };
};

/**
 * Check if user has specific role (exact match or higher)
 */
export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
};

/**
 * Check if user can access multiple resources
 * Returns permission map for each resource
 */
export const getUserResourcePermissions = (userRole: UserRole) => {
  const userLevel = ROLE_LEVELS[userRole];

  return {
    // Reception (Level 1+)
    visitorCheckIn: userLevel >= ROLE_LEVELS[UserRole.RECEPTION],
    patientDashboard: userLevel >= ROLE_LEVELS[UserRole.RECEPTION],

    // Pharmacy (Level 2+)
    prescriptions: userLevel >= ROLE_LEVELS[UserRole.PHARMACY],
    medicationInventory: userLevel >= ROLE_LEVELS[UserRole.PHARMACY],
    pharmacyTransactions: userLevel >= ROLE_LEVELS[UserRole.PHARMACY],

    // Clinical (Level 3+)
    patientVitals: userLevel >= ROLE_LEVELS[UserRole.CLINICAL],
    nursingNotes: userLevel >= ROLE_LEVELS[UserRole.CLINICAL],
    labTests: userLevel >= ROLE_LEVELS[UserRole.CLINICAL],

    // Doctor (Level 4+)
    diagnostics: userLevel >= ROLE_LEVELS[UserRole.DOCTOR],
    treatmentPlans: userLevel >= ROLE_LEVELS[UserRole.DOCTOR],
    medicalHistory: userLevel >= ROLE_LEVELS[UserRole.DOCTOR],

    // Admin (Level 5+)
    auditLogs: userLevel >= ROLE_LEVELS[UserRole.ADMIN],
    userManagement: userLevel >= ROLE_LEVELS[UserRole.ADMIN],
    systemSettings: userLevel >= ROLE_LEVELS[UserRole.ADMIN],
    staffScheduling: userLevel >= ROLE_LEVELS[UserRole.ADMIN],
  };
};
