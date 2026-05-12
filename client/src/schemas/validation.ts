import { z } from 'zod';

// Common validation patterns
const STF_ID_PATTERN = /^STF-\d{4}$/;
const PHONE_PATTERN = /^\d{10,}$/;

// Clinical/Nursing validation
export const clinicalSchema = z.object({
  patientName: z.string().min(2, 'Patient name must be at least 2 characters'),
  triageLevel: z.enum(['Emergency', 'Urgent', 'Non-urgent'], {
    errorMap: () => ({ message: 'Select a valid triage level' }),
  }),
  wardNumber: z.number().min(1).max(10, 'Ward number must be between 1 and 10'),
  admissionNotes: z.string().max(500, 'Notes must not exceed 500 characters'),
  admittedBy: z
    .string()
    .regex(STF_ID_PATTERN, 'Admitted_By must follow format STF-XXXX'),
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
  testDate: z.string().datetime('Invalid date format'),
  performedBy: z
    .string()
    .regex(STF_ID_PATTERN, 'Performed_By must follow format STF-XXXX'),
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
  expiryDate: z.string().datetime('Invalid date format'),
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
  lastMaintenanceDate: z.string().datetime('Invalid date format').optional(),
  nextScheduledMaintenance: z.string().datetime('Invalid date format').optional(),
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
  dueDate: z.string().datetime('Invalid date format').optional(),
});

export type FinanceFormData = z.infer<typeof financeSchema>;

// Legacy types for backward compatibility
export type NurseStationInput = ClinicalFormData;
export type LabResultInput = LabTechFormData;
export type PharmacySalesInput = PharmacyFormData;

// Legacy schemas for backward compatibility
export const NurseStationSchema = clinicalSchema;
export const LabResultSchema = labTechSchema;
export const PharmacySalesSchema = pharmacySchema;
