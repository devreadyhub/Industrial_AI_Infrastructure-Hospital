import { UserRole, ROLE_LEVELS } from '../middleware/rbacMiddleware';

/**
 * AI Security Service
 * Handles role-based access control for AI queries and enforces data masking/filtering
 */

/**
 * Build AI security context based on user role
 * This ensures the AI only returns data the user is authorized to see
 */
export const buildAISecurityContext = (userRole: UserRole, userId?: string): string => {
  const userLevel = ROLE_LEVELS[userRole];
  const securityRules: Record<string, string> = {
    [UserRole.RECEPTION]: `You are assisting a RECEPTION staff member (Level 1). 
    You can only provide: visitor information, basic patient demographics, check-in/check-out times.
    NEVER provide: medical history, prescriptions, lab results, or clinical notes.
    Respond with "I don't have access to that information" if asked for restricted data.`,

    [UserRole.PHARMACY]: `You are assisting a PHARMACY staff member (Level 2).
    You can provide: medication information, prescriptions, inventory levels, dosage recommendations.
    You can provide limited: patient names and basic demographics when relevant to prescriptions.
    NEVER provide: full medical history, lab results without context, or clinical assessments.
    Respond with "I need clinical context from a doctor" if appropriate.`,

    [UserRole.CLINICAL]: `You are assisting a CLINICAL staff member (Level 3, typically Nurse/Technician).
    You can provide: patient vitals, nursing notes, lab test results, medication schedules, patient observations.
    You can reference: medical history relevant to current treatment.
    NEVER provide: treatment plan modifications without doctor approval, diagnosis recommendations, or financial/billing info.`,

    [UserRole.DOCTOR]: `You are assisting a DOCTOR (Level 4).
    You have full access to: patient medical records, lab results, imaging reports, treatment history, prescriptions, vitals, clinical notes.
    You can provide: diagnostic recommendations, treatment plans, medication adjustments, referrals.
    Remember: Always follow hospital protocols and patient privacy regulations (HIPAA/local equivalents).`,

    [UserRole.ADMIN]: `You are assisting an ADMIN staff member (Level 5).
    You have full system access: audit logs, user management, system settings, staff scheduling, financial records, all patient data.
    You can modify: system configurations, user permissions, hospital policies.
    Use this access responsibly and always maintain audit trails.`,
  };

  const baseContext = `
SECURITY LEVEL: ${userRole} (Level ${userLevel})
USER ID: ${userId || 'anonymous'}
ROLE: ${userRole}

${securityRules[userRole] || ''}

You MUST enforce these security rules in every response.
If a user asks for data outside their permission level, respond with an appropriate access denial message.
`;

  return baseContext;
};

/**
 * Add user metadata to AI query for tracking and security
 */
export const buildAIQueryMetadata = (
  userRole: UserRole,
  userId?: string,
  originalQuery?: string
) => {
  return {
    role: userRole,
    level: ROLE_LEVELS[userRole],
    userId,
    timestamp: new Date().toISOString(),
    originalQuery: originalQuery || '',
    requiresAudit: true,
  };
};

/**
 * Filter sensitive data from AI response based on user role
 * This is a secondary safeguard after the AI has already been constrained by context
 */
export const filterAIResponseByRole = (
  response: string,
  userRole: UserRole,
  dataType?: 'PATIENT_RECORD' | 'FINANCIAL' | 'AUDIT_LOG' | 'STAFF_SCHEDULE'
): string => {
  const userLevel = ROLE_LEVELS[userRole];

  // ADMIN can see everything
  if (userLevel >= ROLE_LEVELS[UserRole.ADMIN]) {
    return response;
  }

  // Apply role-specific filtering
  const filters: Record<string, (response: string) => string> = {
    PATIENT_RECORD: (resp) => {
      // Clinical level (3+) can see medical records
      if (userLevel >= ROLE_LEVELS[UserRole.CLINICAL]) {
        return resp;
      }
      // Pharmacy can see medication-related info
      if (userLevel >= ROLE_LEVELS[UserRole.PHARMACY]) {
        return resp.replace(/\b(SSN|Social Security|banking|account number)\b/gi, '[REDACTED]');
      }
      // Reception can only see demographics
      return resp.replace(
        /\b(diagnosis|treatment|medication|prescription|clinical|lab|test|result)\b/gi,
        '[ACCESS DENIED]'
      );
    },

    FINANCIAL: (resp) => {
      // Only ADMIN can see financial data
      if (userLevel >= ROLE_LEVELS[UserRole.ADMIN]) {
        return resp;
      }
      return '[FINANCIAL DATA - ACCESS DENIED]';
    },

    AUDIT_LOG: (resp) => {
      // Only ADMIN can see audit logs
      if (userLevel >= ROLE_LEVELS[UserRole.ADMIN]) {
        return resp;
      }
      return '[AUDIT LOG - ACCESS DENIED]';
    },

    STAFF_SCHEDULE: (resp) => {
      // DOCTOR and ADMIN can see staff schedules
      if (userLevel >= ROLE_LEVELS[UserRole.DOCTOR]) {
        return resp;
      }
      return '[STAFF SCHEDULE - ACCESS DENIED]';
    },
  };

  if (dataType && filters[dataType]) {
    return filters[dataType](response);
  }

  return response;
};

/**
 * Validate that a user can perform an action on a resource
 * Returns true if allowed, false otherwise
 */
export const canUserAccessResource = (
  userRole: UserRole,
  resourceType: string,
  action: 'READ' | 'WRITE' | 'DELETE'
): boolean => {
  const userLevel = ROLE_LEVELS[userRole];

  const permissions: Record<string, Record<string, number>> = {
    // Resource: minimum level required for each action
    VISITOR: { READ: 1, WRITE: 1, DELETE: 4 }, // Receptionist can check-in, Doctor/Admin can delete
    PRESCRIPTION: { READ: 2, WRITE: 4, DELETE: 4 }, // Pharmacy can read, Doctor+ can write/delete
    LAB_RESULT: { READ: 3, WRITE: 3, DELETE: 4 }, // Clinical+ can read, Doctor+ can delete
    PATIENT_RECORD: { READ: 3, WRITE: 4, DELETE: 5 }, // Clinical can read, Doctor can write, Admin can delete
    AUDIT_LOG: { READ: 5, WRITE: 5, DELETE: 5 }, // Admin only
    USER_MANAGEMENT: { READ: 5, WRITE: 5, DELETE: 5 }, // Admin only
  };

  if (!permissions[resourceType]) {
    return false; // Resource not found in permissions
  }

  const requiredLevel = permissions[resourceType][action];
  return userLevel >= requiredLevel;
};

/**
 * Get data masking rules for a user role
 * Use this when returning sensitive data in API responses
 */
export const getMaskingRulesForRole = (userRole: UserRole) => {
  const userLevel = ROLE_LEVELS[userRole];

  return {
    // SSN visible only to DOCTOR and ADMIN
    maskSSN: userLevel < ROLE_LEVELS[UserRole.DOCTOR],

    // Financial info visible only to ADMIN
    maskFinancial: userLevel < ROLE_LEVELS[UserRole.ADMIN],

    // Full medical history visible to DOCTOR and ADMIN
    maskMedicalHistory: userLevel < ROLE_LEVELS[UserRole.DOCTOR],

    // Prescriptions visible to PHARMACY and above
    maskPrescriptions: userLevel < ROLE_LEVELS[UserRole.PHARMACY],

    // Lab results visible to CLINICAL and above
    maskLabResults: userLevel < ROLE_LEVELS[UserRole.CLINICAL],

    // Clinical notes visible to CLINICAL and above
    maskClinicalNotes: userLevel < ROLE_LEVELS[UserRole.CLINICAL],

    // Staff salary info visible only to ADMIN
    maskSalary: userLevel < ROLE_LEVELS[UserRole.ADMIN],
  };
};
