import { z } from 'zod';

// Common validation patterns
const STF_ID_PATTERN = /^STF-\d{4}$/;
const PHONE_PATTERN = /^\d{10,}$/;
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Clinical/Nursing validation
export const clinicalSchema = z.object({
  patientName: z.string().min(2, 'Patient name must be at least 2 characters'),
  patientCode: z
    .union([
      z.string().regex(/^PAT-[A-Z0-9]{5,}$/, 'Patient code must follow format PAT-XXXXX'),
      z.literal(''),
    ])
    .optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other'], {
    errorMap: () => ({ message: 'Select a valid gender' }),
  }).optional(),
  bloodType: z.enum(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], {
    errorMap: () => ({ message: 'Select a valid blood type' }),
  }).optional(),
  allergies: z.string().max(500, 'Allergies must not exceed 500 characters').optional(),
  chronicConditions: z.string().max(500, 'Chronic conditions must not exceed 500 characters').optional(),
  currentMedications: z.string().max(500, 'Current medications must not exceed 500 characters').optional(),
  admissionSource: z.enum(['ER', 'Outpatient', 'Referral', 'Walk-in', 'Ambulance'], {
    errorMap: () => ({ message: 'Select a valid admission source' }),
  }).optional(),
  admissionTime: z.string().optional(),
  estimatedLengthOfStay: z.number().min(1).optional(),
  assignedAttendingPhysician: z.string().optional(),
  nextOfKinName: z.string().max(100, 'Next of kin name must not exceed 100 characters').optional(),
  nextOfKinContact: z.string().regex(PHONE_PATTERN, 'Invalid phone number').optional(),
  insuranceType: z.string().max(100, 'Insurance type must not exceed 100 characters').optional(),
  triageLevel: z.enum(['Emergency', 'Urgent', 'Non-urgent'], {
    errorMap: () => ({ message: 'Select a valid triage level' }),
  }),
  wardNumber: z.number().min(1).max(10, 'Ward number must be between 1 and 10'),
  admissionNotes: z.string().max(500, 'Notes must not exceed 500 characters'),
  admittedBy: z
    .string()
    .regex(STF_ID_PATTERN, 'Admitted_By must follow format STF-XXXX')
    .optional(),
  contactNumber: z.string().regex(PHONE_PATTERN, 'Invalid phone number'),
});

export type ClinicalFormData = z.infer<typeof clinicalSchema>;

// Staffing validation
export const staffingSchema = z.object({
  staffId: z
    .string()
    .regex(STF_ID_PATTERN, 'Staff_ID must follow format STF-XXXX'),
  staffName: z.string().min(2, 'Staff name must be at least 2 characters'),
  staffStatus: z.enum(['On-duty', 'Off-duty', 'On-break'], {
    errorMap: () => ({ message: 'Select a valid status' }),
  }),
  seniority: z.enum(['Junior', 'Mid-level', 'Senior', 'Lead'], {
    errorMap: () => ({ message: 'Select a valid seniority level' }),
  }),
  shiftAssignment: z.enum(['Morning (6AM-2PM)', 'Afternoon (2PM-10PM)', 'Night (10PM-6AM)'], {
    errorMap: () => ({ message: 'Select a valid shift' }),
  }),
  department: z.string().min(2, 'Department required'),
  role: z.string().max(100, 'Role must not exceed 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(PHONE_PATTERN, 'Invalid phone number').optional(),
  dateOfBirth: z.string().optional().refine(
    (val) => val === undefined || val === '' || LOCAL_DATE_PATTERN.test(val),
    'Invalid date format'
  ),
  gender: z.enum(['Male', 'Female', 'Other'], {
    errorMap: () => ({ message: 'Select a valid gender' }),
  }).optional(),
  bloodType: z.enum(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], {
    errorMap: () => ({ message: 'Select a valid blood type' }),
  }).optional(),
  specialization: z.string().max(100, 'Specialization must not exceed 100 characters').optional(),
  yearsOfExperience: z.number().int().min(0, 'Years of experience must be 0 or greater').max(60, 'Years of experience must be realistic').optional(),
  assignedWardId: z.string().max(50, 'Assigned ward must not exceed 50 characters').optional(),
  onCallStatus: z.enum(['On-call', 'Available', 'Standby', 'Off-call'], {
    errorMap: () => ({ message: 'Select a valid on-call status' }),
  }).optional(),
  nextScheduledShift: z.string().optional().refine(
    (val) => val === undefined || val === '' || LOCAL_DATETIME_PATTERN.test(val),
    'Invalid date/time format'
  ),
  emergencyContactName: z.string().max(100, 'Emergency contact name must not exceed 100 characters').optional(),
  emergencyContactPhone: z.string().optional().refine(
    (val) => val === undefined || val === '' || PHONE_PATTERN.test(val),
    'Invalid phone number'
  ),
  backgroundCheckDate: z.string().optional().refine(
    (val) => val === undefined || val === '' || LOCAL_DATE_PATTERN.test(val),
    'Invalid date format'
  ),
  trainingExpiryDate: z.string().optional().refine(
    (val) => val === undefined || val === '' || LOCAL_DATE_PATTERN.test(val),
    'Invalid date format'
  ),
  licenseNumber: z.string().max(50, 'License number must not exceed 50 characters').optional(),
  certifications: z.string().max(200, 'Certifications must not exceed 200 characters').optional(),
  currentLocation: z.string().max(100, 'Current location must not exceed 100 characters').optional(),
});

export type StaffingFormData = z.infer<typeof staffingSchema>;

// Lab Tech validation
export const labTechSchema = z.object({
  patientId: z.string().min(1, 'Patient ID required'),
  testName: z.string().min(2, 'Test name required'),
  testResults: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    'Invalid JSON format'
  ),
  testDate: z.string().regex(LOCAL_DATETIME_PATTERN, 'Invalid date format'),
  performedBy: z
    .string()
    .regex(STF_ID_PATTERN, 'Performed_By must follow format STF-XXXX')
    .optional(),
  normalRange: z.string().optional(),
});

export type LabTechFormData = z.infer<typeof labTechSchema>;

// Pharmacy validation
export const pharmacySchema = z.object({
  drugName: z.string().min(2, 'Drug name required'),
  drugCode: z.string().min(2, 'Drug code required'),
  unitsSold: z.number().min(1, 'Units sold must be at least 1'),
  unitPrice: z.number().min(0.01, 'Unit price must be greater than 0'),
  stockAdded: z.number().min(0, 'Stock cannot be negative'),
  expiryDate: z.string().regex(LOCAL_DATETIME_PATTERN, 'Invalid date format'),
  batchNumber: z.string().min(2, 'Batch number required'),
  supplier: z.string().optional(),
});

export type PharmacyFormData = z.infer<typeof pharmacySchema>;

// Facilities & Logistics validation
export const facilitiesSchema = z.object({
  resourceName: z.enum(['Oxygen', 'Ventilators', 'Beds', 'Wheelchairs', 'Monitors', 'Pumps'], {
    errorMap: () => ({ message: 'Select a valid resource' }),
  }),
  resourceStatus: z.enum(['Available', 'In-use', 'Maintenance'], {
    errorMap: () => ({ message: 'Select a valid status' }),
  }),
  quantityAvailable: z.number().min(0, 'Quantity cannot be negative'),
  quantityInUse: z.number().min(0, 'Quantity cannot be negative'),
  maintenanceLogs: z.string().max(1000, 'Logs must not exceed 1000 characters'),
  lastMaintenanceDate: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val === '' || LOCAL_DATETIME_PATTERN.test(val),
      'Invalid date format'
    ),
  nextScheduledMaintenance: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val === '' || LOCAL_DATETIME_PATTERN.test(val),
      'Invalid date format'
    ),
});

export type FacilitiesFormData = z.infer<typeof facilitiesSchema>;

// Finance/Billing validation
export const financeSchema = z.object({
  patientId: z.string().min(1, 'Patient ID required'),
  patientName: z.string().min(2, 'Patient name required'),
  insuranceProvider: z.string().min(2, 'Insurance provider required'),
  policyNumber: z.string().min(2, 'Policy number required'),
  totalAmount: z.number().min(0.01, 'Amount must be greater than 0'),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative'),
  paymentStatus: z.enum(['Paid', 'Partial', 'Outstanding'], {
    errorMap: () => ({ message: 'Select a valid payment status' }),
  }),
  paymentMethod: z.enum(['Cash', 'Card', 'Bank Transfer', 'Insurance'], {
    errorMap: () => ({ message: 'Select a valid payment method' }),
  }),
  dueDate: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val === '' || LOCAL_DATETIME_PATTERN.test(val),
      'Invalid date format'
    ),
});

export type FinanceFormData = z.infer<typeof financeSchema>;

// Nurse station admission validation
export const nurseAdmissionSchema = z.object({
  ward: z.string().min(2, 'Ward is required'),
  admittedBy: z
    .string()
    .regex(STF_ID_PATTERN, 'Admitted_By must follow format STF-XXXX')
    .optional(),
  patientName: z.string().min(2, 'Patient name must be at least 2 characters'),
  triageLevel: z.enum(['Emergency', 'Urgent', 'Non-urgent'], {
    errorMap: () => ({ message: 'Select a valid triage level' }),
  }),
  admissionNotes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
  contactNumber: z.string().regex(PHONE_PATTERN, 'Invalid phone number').optional(),
  patientCode: z
    .union([
      z.string().regex(/^PAT-[A-Z0-9]{5,}$/, 'Patient code must follow format PAT-XXXXX'),
      z.literal(''),
    ])
    .optional(),
});

export type NurseStationInput = z.infer<typeof nurseAdmissionSchema>;

export const labTestSchema = z.object({
  testId: z.string().min(1, 'Test ID is required'),
  testName: z.string().min(2, 'Test name required'),
  testCategory: z.enum(['Blood', 'Imaging', 'Pathology', 'Microbiology', 'Biochemistry'], {
    errorMap: () => ({ message: 'Select a valid test category' }),
  }),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'REVIEWED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Select a valid status' }),
  }),
  resultData: z.any(),
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
  resultDate: z.string().datetime('Invalid date format').optional(),
});

export type LabResultInput = z.infer<typeof labTestSchema>;

export const pharmacySaleSchema = z.object({
  drugName: z.string().min(2, 'Drug name required'),
  drugCode: z.string().min(2, 'Drug code required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  salePrice: z.number().min(0.01, 'Sale price must be greater than 0'),
  saleDate: z.string().datetime('Invalid date format'),
});

export type PharmacySalesInput = z.infer<typeof pharmacySaleSchema>;

// Legacy schemas for backward compatibility
export const NurseStationSchema = nurseAdmissionSchema;
export const LabResultSchema = labTestSchema;
export const PharmacySalesSchema = pharmacySaleSchema;
