process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb';

import * as assert from 'node:assert';
import { detectUnsupportedSchemaFields, verifyColumns, staffCountPattern, billingPattern } from './langchainAgentService';
import { extractPatientNameFromQuestion, extractStaffNameFromQuestion, extractStaffDetailFieldFromQuestion, extractPatientDetailFieldFromQuestion } from './operationalDataService';

const runTests = () => {
  // verifyColumns positive cases
  assert.strictEqual(verifyColumns('Staff', ['id', 'firstName', 'department']), true, 'Staff valid columns should verify true');
  assert.strictEqual(verifyColumns('Patient', ['patientCode', 'triageLevel']), true, 'Patient valid columns should verify true');
  assert.strictEqual(verifyColumns('Ward', ['wardName', 'capacity', 'department']), true, 'Ward valid columns should verify true');

  // verifyColumns negative cases
  assert.strictEqual(verifyColumns('Staff', ['id', 'specialty']), false, 'Staff invalid column should verify false');
  assert.strictEqual(verifyColumns('BillingRecord', ['id', 'insurance']), false, 'BillingRecord invalid column should verify false');
  assert.strictEqual(verifyColumns('UnknownTable', ['id']), false, 'Unknown table should verify false');

  // unsupported schema field detection
  assert.deepStrictEqual(detectUnsupportedSchemaFields('What is Dr Ekpo specialty?'), ['specialty']);
  assert.deepStrictEqual(detectUnsupportedSchemaFields('Show me the staff email and phone number'), ['phone', 'email']);
  assert.deepStrictEqual(detectUnsupportedSchemaFields('How many patients are in ward 2?'), []);
  assert.deepStrictEqual(detectUnsupportedSchemaFields('What is the invoice number?'), []);

  // staff/patient name extraction tests
  assert.strictEqual(extractStaffNameFromQuestion('is Benjamin Amadi a staff?'), 'Benjamin Amadi');
  assert.strictEqual(extractStaffNameFromQuestion('do we have any doctor named Chris Adams'), 'Chris Adams');
  assert.strictEqual(extractPatientNameFromQuestion('is there any patient named Ahmed Suleiman'), 'Ahmed Suleiman');
  assert.strictEqual(extractPatientNameFromQuestion('patient named Mary Johnson'), 'Mary Johnson');
  assert.strictEqual(extractStaffDetailFieldFromQuestion('what duty is Emma Green in?'), 'shiftAssignment');
  assert.strictEqual(extractStaffDetailFieldFromQuestion('which department is Emma Green in?'), 'department');
  assert.strictEqual(extractPatientDetailFieldFromQuestion('what ward is Ahmed Suleiman in?'), 'wardId');

  // staffCountPattern tests (for the inconsistency issues)
  assert.strictEqual(staffCountPattern.test('provide staff list'), true, 'Should match "provide staff list"');
  assert.strictEqual(staffCountPattern.test('how many staff do we have'), true, 'Should match "how many staff do we have"');
  assert.strictEqual(staffCountPattern.test('how may staff do we have'), true, 'Should match typo variant');
  assert.strictEqual(staffCountPattern.test('staff list'), true, 'Should match "staff list"');
  assert.strictEqual(staffCountPattern.test('staff count'), true, 'Should match "staff count"');
  assert.strictEqual(staffCountPattern.test('total staff'), true, 'Should match "total staff"');
  assert.strictEqual(staffCountPattern.test('staff roster'), true, 'Should match "staff roster"');
  assert.strictEqual(staffCountPattern.test('number of staff'), true, 'Should match "number of staff"');
  assert.strictEqual(staffCountPattern.test('is there any visitor in W1'), false, 'Should not match non-staff queries');

  // billingPattern tests (for the inconsistency issues)
  assert.strictEqual(billingPattern.test('what is the last bill paid'), true, 'Should match "what is the last bill paid"');
  assert.strictEqual(billingPattern.test('show billing'), true, 'Should match "show billing"');
  assert.strictEqual(billingPattern.test('invoice'), true, 'Should match "invoice"');
  assert.strictEqual(billingPattern.test('payment'), true, 'Should match "payment"');
  assert.strictEqual(billingPattern.test('bill'), true, 'Should match "bill"');
  assert.strictEqual(billingPattern.test('do we have Blessing as staff'), false, 'Should not match non-billing queries');

  console.log('All langchainAgentService helper tests passed.');
};

runTests();

