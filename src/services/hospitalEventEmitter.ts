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
