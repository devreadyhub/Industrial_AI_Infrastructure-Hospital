import { emitGlobalHospitalUpdate, GlobalHospitalUpdate } from './socketService';

export const emitLabTestUpdate = (labTest: any, updatedBy?: string): void => {
  const update: GlobalHospitalUpdate = {
    eventType: 'LAB_TEST_UPDATED',
    timestamp: new Date().toISOString(),
    data: {
      id: labTest.id,
      testId: labTest.testId,
      testName: labTest.testName,
      testCategory: labTest.testCategory,
      status: labTest.status,
      patientId: labTest.patientId,
      staffId: labTest.staffId,
      resultDate: labTest.resultDate,
      notes: labTest.notes,
    },
    updatedBy,
  };
  // Log emission for easier verification in production logs
  console.log(`[HospitalEventEmitter] Emitting ${update.eventType} for ${update.data.patientCode}`);
  emitGlobalHospitalUpdate(update);
};

export const emitBillingRecordUpdate = (billingRecord: any, updatedBy?: string): void => {
  const update: GlobalHospitalUpdate = {
    eventType: 'BILLING_RECORD_UPDATED',
    timestamp: new Date().toISOString(),
    data: {
      id: billingRecord.id,
      invoiceNumber: billingRecord.invoiceNumber,
      patientId: billingRecord.patientId,
      totalAmount: billingRecord.totalAmount,
      amountDue: billingRecord.amountDue,
      paymentStatus: billingRecord.paymentStatus,
      paidDate: billingRecord.paidDate,
      dueDate: billingRecord.dueDate,
      notes: billingRecord.notes,
    },
    updatedBy,
  };
  emitGlobalHospitalUpdate(update);
};

export const emitPatientAdmitted = (
  patient: any,
  meta?: {
    wardName?: string;
    wardId?: number;
    admittedByStaff?: { staffCode?: string; name?: string };
  },
): void => {
  const update: GlobalHospitalUpdate = {
    eventType: 'PATIENT_ADMITTED',
    timestamp: new Date().toISOString(),
    data: {
      id: patient.id,
      patientId: patient.id,
      patientCode: patient.patientCode,
      patientName: `${patient.firstName} ${patient.lastName}`,
      ward: meta?.wardName,
      wardId: meta?.wardId,
      triageLevel: patient.triageLevel,
      contactNumber: patient.phone || null,
      admissionNotes: patient.admissionNotes || null,
      admissionDate: patient.admissionDate || new Date().toISOString(),
      admittedBy: meta?.admittedByStaff?.staffCode || undefined,
      admittedByName: meta?.admittedByStaff?.name || undefined,
    },
    updatedBy: meta?.admittedByStaff?.staffCode,
  };
  // Log admission emissions for easier verification
  console.log(`[HospitalEventEmitter] Emitting ${update.eventType} for ${update.data.patientCode}`);
  emitGlobalHospitalUpdate(update);
};
