export interface PatientRecord {
  Diagnosis?: string | null;
  LabResults?: string | null;
  [key: string]: any;
}

const SENSITIVE_FIELD_PLACEHOLDER = '********';

const isElevatedRole = (userRole: string): boolean => {
  const normalizedRole = userRole?.trim().toLowerCase();
  return normalizedRole === 'doctor' || normalizedRole === 'senior nurse';
};

const maskValue = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return SENSITIVE_FIELD_PLACEHOLDER;
};

/**
 * Redacts sensitive patient fields for non-privileged users.
 *
 * Receptionists cannot see diagnosis or lab results.
 * Doctors and Senior Nurses receive full values.
 */
export const maskSensitiveData = <T extends PatientRecord>(
  patientRecord: T,
  userRole: string,
): T => {
  if (isElevatedRole(userRole)) {
    return patientRecord;
  }

  return {
    ...patientRecord,
    Diagnosis: maskValue(patientRecord.Diagnosis),
    LabResults: maskValue(patientRecord.LabResults),
  } as T;
};
