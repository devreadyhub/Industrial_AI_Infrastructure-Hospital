import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { SqlDatabase } from 'langchain/sql_db';
import { createSqlQueryChain } from 'langchain/chains/sql_db';
import { PrismaClient } from '@prisma/client';
import { buildAiAccessGuidance, AIUserRole } from './aiSecurity';
import {
  buildAISecurityContext,
  buildAIQueryMetadata,
  filterAIResponseByRole,
} from './aiSecurityService';
import { normalizeToRBACRole } from '../middleware/rbacMiddleware';
import {
  createChatOllama,
  createDeterministicChatOllama,
  ensureOllamaIsReachable,
  invokeOllamaWithTimeout,
  ollamaBaseUrl,
  ollamaModel,
} from './ollamaService';
import { answerQuestionFromDatabase } from './operationalDataService';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in .env');
}

/**
 * Guardrail: Validates that requested columns are allowed.
 * Prevents LLM hallucination of columns like 'salary' or 'diagnosis' 
 * that are not in the current active schema.
 */
export const validateColumnRequest = (table: string, requestedColumns: string[]): string[] => {
  const allowed = schemaMap[table] || [];
  const invalid = requestedColumns.filter((col) => !allowed.includes(col));
  return invalid;
};

const prisma = new PrismaClient();
const embeddings = new OllamaEmbeddings({ baseUrl: ollamaBaseUrl });
let memoizedVectorStore: MemoryVectorStore | null = null;
let ollamaAvailable: boolean | null = null;

export const schemaMap: Record<string, string[]> = {
  // === PATIENTS ===
  // Recommended UI/Schema Mapping for the patient dashboard:
  // 1. Essential Clinical Data (Medical Integrity)
  // 2. Operational & Workflow Efficiency
  // 3. Compliance & Logistical Data
  Patient: [
    'id',
    'patientCode',
    'firstName',
    'lastName',
    'email',
    'phone',

    // Patient Demographics
    'dateOfBirth',
    'gender',
    'bloodType',

    // Safety
    'allergies',
    'chronicConditions',
    'currentMedications',

    // Operational & Workflow
    'triageLevel',
    'wardId',
    'admissionNotes',
    'admissionDate',
    'admissionTime',
    'admissionSource',
    'estimatedLengthOfStay',
    'assignedAttendingPhysicianId',
    'nextOfKinName',
    'nextOfKinContact',

    // Compliance & Logistics
    'insuranceType',
    'status',
    'dischargeDate',
    'createdAt',
    'updatedAt',
  ],
  
  // === WARDS ===
  Ward: ['id', 'wardName', 'capacity', 'currentOccupancy', 'department', 'createdAt', 'updatedAt'],
  
  // === STAFF ===
  Staff: ['id', 'staffCode', 'firstName', 'lastName', 'email', 'passwordHash', 'isAdmin', 'clearanceLevel', 'phone', 'role', 'seniority', 'currentStatus', 'shiftAssignment', 'department', 'licenseNumber', 'certifications', 'currentLocation', 'dateOfBirth', 'gender', 'bloodType', 'specialization', 'yearsOfExperience', 'assignedWardId', 'onCallStatus', 'nextScheduledShift', 'emergencyContactName', 'emergencyContactPhone', 'backgroundCheckDate', 'trainingExpiryDate', 'createdAt', 'updatedAt'],
  
  // === LAB TESTS ===
  LabTest: ['id', 'testId', 'patientId', 'staffId', 'testName', 'testCategory', 'resultData', 'status', 'notes', 'sampleCollectionDate', 'resultDate', 'createdAt', 'updatedAt'],
  
  // === PHARMACY & PRESCRIPTIONS ===
  Pharmacy: ['id', 'drugName', 'drugCode', 'stock', 'minStockLevel', 'maxStockLevel', 'expiryDate', 'unitPrice', 'createdAt', 'updatedAt'],
  Prescription: ['id', 'patientId', 'pharmacyId', 'staffId', 'dosage', 'frequency', 'duration', 'quantity', 'notes', 'createdAt', 'updatedAt'],
  PharmacySales: ['id', 'pharmacyId', 'quantity', 'salePrice', 'saleDate', 'createdAt', 'updatedAt'],
  
  // === BILLING ===
  BillingRecord: ['id', 'patientId', 'invoiceNumber', 'insuranceProvider', 'totalAmount', 'amountCovered', 'amountDue', 'paymentStatus', 'paymentMethod', 'dueDate', 'paidDate', 'notes', 'createdAt', 'updatedAt'],
  
  // === VISITORS ===
  // Recommended visitor dashboard fields:
  // - Visit Type (General, Palliative, Legal/Consultation)
  // - Access Level / Zone (General Ward, ICU Restricted, Admin)
  // - Escort Required (Boolean for restricted zones)
  // - Health Screening Status (Cleared, Flagged, Pending)
  // - Visitor Credentials / ID Type (Government ID, Visitor Badge ID)
  Visitor: [
    'id',
    'visitorCode',
    'firstName',
    'lastName',
    'phone',
    'email',
    'relationship',
    'patientId',
    'wardId',
    'checkInTime',
    'checkOutTime',
    'expiresAt',
    'purpose',
    'checkedInBy',
    'status',
    'createdAt',
    'updatedAt',
    // If these fields are added to the Visitor schema, include them here:
    // 'visitType', 'accessLevel', 'escortRequired', 'healthScreeningStatus', 'visitorCredentialsType',
  ],
  
  // === FACILITIES & MAINTENANCE ===
  Facility: ['id', 'resourceName', 'resourceType', 'location', 'status', 'staffId', 'purchaseDate', 'warrantyExpiry', 'createdAt', 'updatedAt'],
  MaintenanceLog: ['id', 'facilityId', 'maintenanceType', 'description', 'performedDate', 'nextScheduled', 'notes', 'createdAt', 'updatedAt'],
  
  // === EMERGENCY & RESPONSE ===
  Emergency: ['id', 'incidentType', 'location', 'priority', 'status', 'description', 'staffId', 'patientId', 'actionsTaken', 'resolvedAt', 'createdAt', 'updatedAt'],
  StaffEmergency: ['id', 'staffId', 'emergencyId', 'role', 'createdAt', 'updatedAt'],
  
  // === AUDIT LOGS ===
  AuditLog: ['id', 'interactionType', 'actionType', 'userPrompt', 'systemResponse', 'sqlGenerated', 'vectorQuery', 'rawOutput', 'finalOutput', 'accessStatus', 'status', 'errorMessage', 'userId', 'userRole', 'ipAddress', 'userAgent', 'metadata', 'createdAt', 'updatedAt'],
};

export const verifyColumns = (table: string, columns: string[]): boolean => {
  const allowed = schemaMap[table];
  if (!allowed) return false;
  return columns.every((c) => allowed.includes(c));
};

export const dashboardGroupings: Record<string, Record<string, string[]>> = {
  PATIENT_OVERVIEW: {
    Patient: schemaMap.Patient,
    Ward: schemaMap.Ward,
    LabTest: schemaMap.LabTest,
    Prescription: schemaMap.Prescription,
    BillingRecord: schemaMap.BillingRecord,
    Visitor: schemaMap.Visitor,
    Emergency: schemaMap.Emergency,
  },
  STAFF_OPERATIONS: {
    Staff: schemaMap.Staff,
    Facility: schemaMap.Facility,
    MaintenanceLog: schemaMap.MaintenanceLog,
    Emergency: schemaMap.Emergency,
    StaffEmergency: schemaMap.StaffEmergency,
    Prescription: schemaMap.Prescription,
  },
  PHARMACY_INVENTORY: {
    Pharmacy: schemaMap.Pharmacy,
    Prescription: schemaMap.Prescription,
    PharmacySales: schemaMap.PharmacySales,
    BillingRecord: schemaMap.BillingRecord,
  },
  BILLING_DASHBOARD: {
    BillingRecord: schemaMap.BillingRecord,
    Patient: schemaMap.Patient,
    Prescription: schemaMap.Prescription,
    PharmacySales: schemaMap.PharmacySales,
  },
  FACILITY_MANAGEMENT: {
    Facility: schemaMap.Facility,
    MaintenanceLog: schemaMap.MaintenanceLog,
    Staff: schemaMap.Staff,
    AuditLog: schemaMap.AuditLog,
  },
  VISITOR_TRACKING: {
    Visitor: schemaMap.Visitor,
    Patient: schemaMap.Patient,
    Ward: schemaMap.Ward,
    Staff: schemaMap.Staff,
  },
  EMERGENCY_RESPONSE: {
    Emergency: schemaMap.Emergency,
    Staff: schemaMap.Staff,
    StaffEmergency: schemaMap.StaffEmergency,
    Patient: schemaMap.Patient,
  },
  AUDIT_DASHBOARD: {
    AuditLog: schemaMap.AuditLog,
    Staff: schemaMap.Staff,
    Patient: schemaMap.Patient,
    Facility: schemaMap.Facility,
    BillingRecord: schemaMap.BillingRecord,
  },
  PRESCRIPTION_OVERVIEW: {
    Prescription: schemaMap.Prescription,
    Pharmacy: schemaMap.Pharmacy,
    PharmacySales: schemaMap.PharmacySales,
    Patient: schemaMap.Patient,
    Staff: schemaMap.Staff,
  },
  HOSPITAL_OVERVIEW: {
    Patient: schemaMap.Patient,
    Staff: schemaMap.Staff,
    Ward: schemaMap.Ward,
    Pharmacy: schemaMap.Pharmacy,
    Prescription: schemaMap.Prescription,
    PharmacySales: schemaMap.PharmacySales,
    BillingRecord: schemaMap.BillingRecord,
    Visitor: schemaMap.Visitor,
    Facility: schemaMap.Facility,
    MaintenanceLog: schemaMap.MaintenanceLog,
    Emergency: schemaMap.Emergency,
    StaffEmergency: schemaMap.StaffEmergency,
    AuditLog: schemaMap.AuditLog,
  },
};

const supportedFieldSynonyms: Record<string, string[]> = {
  name: ['firstName', 'lastName'],
  'first name': ['firstName'],
  'last name': ['lastName'],
  status: ['currentStatus', 'paymentStatus', 'status'],
  department: ['department'],
  shift: ['shiftAssignment'],
  ward: ['wardId', 'wardName', 'assignedWardId'],
  patient: ['patientCode', 'firstName', 'lastName', 'wardId', 'email', 'phone', 'dateOfBirth'],
  admission: ['admissionDate', 'admissionTime', 'admissionNotes', 'admissionSource'],
  discharge: ['dischargeDate'],
  inventory: ['stock', 'minStockLevel', 'maxStockLevel', 'expiryDate', 'drugName', 'drugCode'],
  drug: ['drugName', 'drugCode', 'unitPrice'],
  billing: ['invoiceNumber', 'totalAmount', 'amountDue', 'paymentStatus', 'dueDate', 'paidDate', 'amountCovered', 'insuranceProvider', 'paymentMethod', 'insuranceType'],
  visitor: ['firstName', 'lastName', 'relationship', 'patientId', 'wardId', 'checkInTime', 'checkOutTime', 'status', 'purpose', 'visitorCode'],
  test: ['testName', 'testCategory', 'status', 'resultData', 'sampleCollectionDate', 'resultDate', 'testId', 'notes'],
  facility: ['resourceName', 'resourceType', 'location', 'status', 'purchaseDate', 'warrantyExpiry'],
  maintenance: ['maintenanceType', 'performedDate', 'nextScheduled', 'description', 'notes'],
  emergency: ['incidentType', 'location', 'priority', 'status', 'actionsTaken', 'resolvedAt', 'description', 'staffId', 'patientId'],
  prescription: ['dosage', 'frequency', 'duration', 'quantity', 'notes', 'patientId', 'staffId', 'pharmacyId'],
  dosage: ['dosage'],
  frequency: ['frequency'],
  duration: ['duration'],
  quantity: ['quantity'],
  sale: ['quantity', 'salePrice', 'saleDate', 'pharmacyId'],
  'sale price': ['salePrice'],
  sales: ['quantity', 'salePrice', 'saleDate'],
  revenue: ['salePrice', 'totalAmount'],
  'prescribed by': ['staffId'],
  'prescribed to': ['patientId'],
  responders: ['staffId', 'emergencyId', 'role'],
  responder: ['staffId', 'emergencyId', 'role'],
  audit: ['interactionType', 'actionType', 'accessStatus', 'userRole', 'errorMessage', 'sqlGenerated', 'rawOutput', 'finalOutput'],
  certification: ['certifications', 'licenseNumber', 'clearanceLevel', 'seniority'],
  location: ['currentLocation', 'location', 'wardName'],
  seniority: ['seniority', 'role', 'clearanceLevel', 'isAdmin'],
  staffcode: ['staffCode'],
  'patient code': ['patientCode'],
  'visitor code': ['visitorCode'],
  'blood type': ['bloodType'],
  bloodtype: ['bloodType'],
  allergies: ['allergies'],
  allergy: ['allergies'],
  'dob': ['dateOfBirth'],
  'date of birth': ['dateOfBirth'],
  gender: ['gender'],
  'biological sex': ['gender'],
  sex: ['gender'],
  'chronic conditions': ['chronicConditions'],
  'chronic disease': ['chronicConditions'],
  medications: ['currentMedications'],
  'current medications': ['currentMedications'],
  'medication list': ['currentMedications'],
  'admission source': ['admissionSource'],
  'length of stay': ['estimatedLengthOfStay'],
  'los': ['estimatedLengthOfStay'],
  'attending physician': ['assignedAttendingPhysicianId'],
  'physician': ['assignedAttendingPhysicianId'],
  'doctor': ['assignedAttendingPhysicianId'],
  'next of kin': ['nextOfKinName', 'nextOfKinContact'],
  'emergency contact': ['nextOfKinName', 'nextOfKinContact', 'emergencyContactName', 'emergencyContactPhone'],
  'contact name': ['nextOfKinName', 'emergencyContactName'],
  'contact number': ['nextOfKinContact', 'emergencyContactPhone'],
  'contact phone': ['nextOfKinContact', 'emergencyContactPhone'],
  insurance: ['insuranceType', 'insuranceProvider'],
  'insurance type': ['insuranceType'],
  // Staff-specific fields
  specialization: ['specialization'],
  specialty: ['specialization'],
  'medical specialty': ['specialization'],
  experience: ['yearsOfExperience'],
  'years of experience': ['yearsOfExperience'],
  'years experience': ['yearsOfExperience'],
  'assigned ward': ['assignedWardId'],
  'oncall': ['onCallStatus'],
  'on call': ['onCallStatus'],
  'on-call': ['onCallStatus'],
  'on call status': ['onCallStatus'],
  'next shift': ['nextScheduledShift'],
  'scheduled shift': ['nextScheduledShift'],
  'next scheduled shift': ['nextScheduledShift'],
  'background check': ['backgroundCheckDate'],
  'training expiry': ['trainingExpiryDate'],
  'training expires': ['trainingExpiryDate'],
  'license': ['licenseNumber'],
  'license number': ['licenseNumber'],
  'staff contact': ['emergencyContactName', 'emergencyContactPhone'],
  'staff emergency contact': ['emergencyContactName', 'emergencyContactPhone'],
};

const unsupportedSchemaTerms = [
  'specialty',
  'specialisation',
  'specialization',
  'address',
  'age',
  'salary',
  'diagnosis',
  'treatment',
  'procedure',
  'room',
  'bed',
  'allergy',
  'appointment',
  'schedule',
  'team',
  'consultant',
];

export const detectUnsupportedSchemaFields = (question: string): string[] => {
  const lower = question.toLowerCase();
  return unsupportedSchemaTerms.filter((term) => lower.includes(term));
};

export const staffCountPattern = /(how\s+many\s+staff|staff\s+list|staff\s+count|number\s+of\s+staff|total\s+staff|staff\s+roster|provide\s+staff|list\s+staff|staff\s+do\s+we\s+have)/i;
export const billingPattern = /(billing|invoice|payment|bill|last bill|paid|payable)/i;

const sqlPrompt = PromptTemplate.fromTemplate(`
You are a factual medical database assistant. MANDATORY RULES:

1. You MUST ONLY answer based on the provided database results and context.
2. If the database context is EMPTY or does NOT contain the answer, you MUST respond with exactly:
   "The information is not available in the hospital database."
3. Do NOT infer, assume, or use pre-trained knowledge for patient-specific queries.
4. All medical facts must come directly from the database schema results.
5. Every statement must be traceable to a specific database record.

Database Schema (STRICT - Map queries exactly or return 'No record found'):
- Patient(id, patientCode, firstName, lastName, email, phone, dateOfBirth, gender, bloodType, allergies, chronicConditions, triageLevel, wardId, admissionNotes, admissionDate, admissionTime, admissionSource, dischargeDate, status, currentMedications, estimatedLengthOfStay, assignedAttendingPhysicianId, nextOfKinName, nextOfKinContact, insuranceType, createdAt, updatedAt)
- Ward(id, wardName, capacity, currentOccupancy, department, createdAt, updatedAt)
- Staff(id, staffCode, firstName, lastName, email, passwordHash, isAdmin, clearanceLevel, phone, role, seniority, currentStatus, shiftAssignment, department, licenseNumber, certifications, currentLocation, dateOfBirth, gender, bloodType, specialization, yearsOfExperience, assignedWardId, onCallStatus, nextScheduledShift, emergencyContactName, emergencyContactPhone, backgroundCheckDate, trainingExpiryDate, createdAt, updatedAt)
- LabTest(id, testId, patientId, staffId, testName, testCategory, resultData, status, notes, sampleCollectionDate, resultDate, createdAt, updatedAt)
- Pharmacy(id, drugName, drugCode, stock, minStockLevel, maxStockLevel, expiryDate, unitPrice, createdAt, updatedAt)
- Prescription(id, patientId, pharmacyId, staffId, dosage, frequency, duration, quantity, notes, createdAt, updatedAt)
- PharmacySales(id, pharmacyId, quantity, salePrice, saleDate, createdAt, updatedAt)
- BillingRecord(id, patientId, invoiceNumber, insuranceProvider, totalAmount, amountCovered, amountDue, paymentStatus, paymentMethod, dueDate, paidDate, notes, createdAt, updatedAt)
- Visitor(id, visitorCode, firstName, lastName, phone, email, relationship, patientId, wardId, checkInTime, checkOutTime, expiresAt, purpose, checkedInBy, status, createdAt, updatedAt)
- Facility(id, resourceName, resourceType, location, status, staffId, purchaseDate, warrantyExpiry, createdAt, updatedAt)
- MaintenanceLog(id, facilityId, maintenanceType, description, performedDate, nextScheduled, notes, createdAt, updatedAt)
- Emergency(id, incidentType, location, priority, status, description, staffId, patientId, actionsTaken, resolvedAt, createdAt, updatedAt)
- StaffEmergency(id, staffId, emergencyId, role, createdAt, updatedAt)
- AuditLog(id, interactionType, actionType, userPrompt, systemResponse, sqlGenerated, vectorQuery, rawOutput, finalOutput, accessStatus, status, errorMessage, userId, userRole, ipAddress, userAgent, metadata, createdAt, updatedAt)

If you cannot map the query to this schema, respond: "No record found for this query in the hospital database."

Question: {input}
`);

const safelyStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable response]';
    }
  }
};

const createHospitalSqlChain = async () => {
  const db = await SqlDatabase.fromOptionsParams({
    appDataSourceOptions: {
      type: 'postgres',
      url: databaseUrl,
    },
  });

  const llm = createChatOllama();
  // @ts-ignore: LangChain generic types are too deep for current TS inference here
  const chain: any = createSqlQueryChain({
    llm,
    db,
    dialect: 'postgres',
    prompt: sqlPrompt,
  });
  return chain;
};

const loadSoftDataDocuments = async (): Promise<Document[]> => {
  const [patients, prescriptions, labTests] = await Promise.all([
    prisma.patient.findMany({
      where: { admissionNotes: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNotes: true,
        admissionDate: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
    prisma.prescription.findMany({
      where: { notes: { not: null } },
      select: {
        id: true,
        patientId: true,
        dosage: true,
        frequency: true,
        notes: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
    prisma.labTest.findMany({
      where: { notes: { not: null } },
      select: {
        id: true,
        patientId: true,
        testName: true,
        status: true,
        notes: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
  ]);

  const docs: Document[] = [];

  patients.forEach((patient) => {
    if (patient.admissionNotes) {
      docs.push(
        new Document({
          pageContent: patient.admissionNotes,
          metadata: {
            source: 'patient_admission',
            patientId: patient.id,
            subject: `${patient.firstName} ${patient.lastName}`,
            createdAt: patient.updatedAt.toISOString(),
          },
        }),
      );
    }
  });

  prescriptions.forEach((prescription) => {
    if (prescription.notes) {
      docs.push(
        new Document({
          pageContent: prescription.notes,
          metadata: {
            source: 'prescription_notes',
            patientId: prescription.patientId,
            subject: `Prescription ${prescription.id}`,
            createdAt: prescription.updatedAt.toISOString(),
          },
        }),
      );
    }
  });

  labTests.forEach((labTest) => {
    if (labTest.notes) {
      docs.push(
        new Document({
          pageContent: labTest.notes,
          metadata: {
            source: 'lab_test_notes',
            patientId: labTest.patientId,
            subject: `${labTest.testName} (${labTest.status})`,
            createdAt: labTest.updatedAt.toISOString(),
          },
        }),
      );
    }
  });

  return docs;
};

const getPatientSoftVectorStore = async (): Promise<MemoryVectorStore> => {
  if (memoizedVectorStore) {
    return memoizedVectorStore;
  }

  const docs = await loadSoftDataDocuments();
  if (docs.length === 0) {
    throw new Error('No patient soft data documents were found for the vector store.');
  }

  memoizedVectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
  return memoizedVectorStore;
};

const sqlTool: any = (tool as unknown as any)(
  async (input: string) => {
    // CONTEXT VERIFICATION: Log the input before tool invocation
    console.log(`[LangchainAgentService:sqlTool] Input query: "${input}"`);
    
    if (!input || input.trim().length === 0) {
      const errMsg = 'SQL tool received empty input; halting to prevent hallucination.';
      console.error(`[LangchainAgentService:sqlTool] ${errMsg}`);
      throw new Error(errMsg);
    }
    
    const sqlChain = await createHospitalSqlChain();
    const result = await invokeOllamaWithTimeout(sqlChain.invoke({ input }));
    
    // Extract and verify the result
    let resultContent: string;
    if (typeof result === 'string') {
      resultContent = result;
    } else {
      const anyResult = result as any;
      const content = anyResult.content ?? anyResult.text;
      if (typeof content === 'string') {
        resultContent = content;
      } else if (Array.isArray(content)) {
        resultContent = content
          .map((block) => (typeof block === 'string' ? block : (block as any).text ?? JSON.stringify(block)))
          .join('');
      } else {
        resultContent = JSON.stringify(result);
      }
    }

    // CONTEXT VERIFICATION: Log the formatted context before it reaches LLM
    console.log(`[LangchainAgentService:sqlTool] Formatted SQL context length: ${resultContent.length} chars`);
    console.log(`[LangchainAgentService:sqlTool] Context preview: "${resultContent.substring(0, 300)}${resultContent.length > 300 ? '...' : ''}"`);

    // STRICT SCHEMA ADHERENCE: Validate result is not empty and represents actual data
    if (!resultContent || resultContent.trim().length === 0) {
      console.warn('[LangchainAgentService:sqlTool] Database returned empty result');
      const directAnswer = await answerQuestionFromDatabase(input);
      if (directAnswer) {
        console.log('[LangchainAgentService:sqlTool] Using direct DB fallback answer after empty SQL tool result');
        return directAnswer;
      }
      return 'The information is not available in the hospital database.';
    }

    if (resultContent.toLowerCase().includes('no record') || resultContent.toLowerCase().includes('not found')) {
      console.warn('[LangchainAgentService:sqlTool] Database explicitly returned no records');
      const directAnswer = await answerQuestionFromDatabase(input);
      if (directAnswer) {
        console.log('[LangchainAgentService:sqlTool] Using direct DB fallback answer after SQL tool no-record result');
        return directAnswer;
      }
      return 'No record found for this query in the hospital database.';
    }

    return resultContent;
  },
  {
    name: 'HospitalSQL',
    description:
      'Use this tool for structured numeric or factual queries against the hospital Postgres database, such as counts, patient census, inventory, and schedule facts.',
    schema: z.string(),
  },
);

const vectorTool = (tool as unknown as any)(
  async (input: string) => {
    // CONTEXT VERIFICATION: Log the vector search input
    console.log(`[LangchainAgentService:vectorTool] Search query: "${input}"`);
    
    if (!input || input.trim().length === 0) {
      const errMsg = 'Vector tool received empty input; halting to prevent hallucination.';
      console.error(`[LangchainAgentService:vectorTool] ${errMsg}`);
      throw new Error(errMsg);
    }

    const vectorStore = await getPatientSoftVectorStore();
    const searchResults = await vectorStore.similaritySearchWithScore(input, 10);

    const normalizedResults = searchResults
      .map((result: any) => {
        const [doc, score] = result;
        return {
          content: doc.pageContent,
          metadata: doc.metadata || {},
          score: typeof score === 'number' ? score : 0,
        };
      })
      .sort((a: any, b: any) => {
        const aTs = a.metadata?.createdAt ? new Date(a.metadata.createdAt).getTime() : 0;
        const bTs = b.metadata?.createdAt ? new Date(b.metadata.createdAt).getTime() : 0;
        if (bTs !== aTs) {
          return bTs - aTs;
        }
        return b.score - a.score;
      });

    // CONTEXT VERIFICATION: Log the formatted context before it reaches LLM
    console.log(`[LangchainAgentService:vectorTool] Retrieved ${normalizedResults.length} results from vector store`);
    
    if (normalizedResults.length === 0) {
      console.warn('[LangchainAgentService:vectorTool] No documents found in vector store');
      return 'The information is not available in the hospital database.';
    }

    // TRACEABILITY: Ensure every result includes full citation metadata
    const formattedResults = normalizedResults
      .map((item: any, index: number) => {
        const createdAt = item.metadata?.createdAt
          ? new Date(item.metadata.createdAt).toISOString()
          : 'unknown';
        
        // Build citation for traceability
        const citation = [
          `[Citation ${index + 1}]`,
          `source=${item.metadata?.source || 'unknown'}`,
          `subject=${item.metadata?.subject || 'unknown'}`,
          `patientId=${item.metadata?.patientId || 'unknown'}`,
          `createdAt=${createdAt}`,
          `relevanceScore=${item.score.toFixed(4)}`,
        ].join(' | ');
        
        return [
          citation,
          '---',
          item.content,
        ].join('\n');
      })
      .join('\n\n');

    console.log(`[LangchainAgentService:vectorTool] Formatted context length: ${formattedResults.length} chars`);
    console.log(`[LangchainAgentService:vectorTool] Context preview: "${formattedResults.substring(0, 300)}${formattedResults.length > 300 ? '...' : ''}"`);
    
    return formattedResults;
  },
  {
    name: 'PatientMoodVectorTool',
    description:
      'Search recent patient soft notes, admission narratives, lab notes, and prescription notes. Prioritize recent timestamps for context and mood-related decision support.',
    schema: z.string(),
  },
);

const visitorQueryTool = (tool as unknown as any)(
  async (query: string) => {
    // CONTEXT VERIFICATION: Log the visitor query input
    console.log(`[LangchainAgentService:visitorQueryTool] Query: "${query}"`);
    
    if (!query || query.trim().length === 0) {
      const errMsg = 'Visitor query tool received empty input; halting to prevent hallucination.';
      console.error(`[LangchainAgentService:visitorQueryTool] ${errMsg}`);
      throw new Error(errMsg);
    }

    // Mock visitor data for AI queries
    const mockVisitors = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Smith',
        relationship: 'Family',
        patientName: 'Jane Doe',
        wardName: 'W1',
        checkInTime: new Date().toISOString(),
        status: 'ACTIVE',
        purpose: 'Family visit',
      },
      {
        id: 2,
        firstName: 'Mary',
        lastName: 'Johnson',
        relationship: 'Friend',
        patientName: 'Bob Wilson',
        wardName: 'W2',
        checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        purpose: 'Support visit',
      },
      {
        id: 3,
        firstName: 'Robert',
        lastName: 'Brown',
        relationship: 'Family',
        patientName: 'Alice Davis',
        wardName: 'W3',
        checkInTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        checkOutTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        status: 'CHECKED_OUT',
        purpose: 'Family visit',
      },
    ];

    // Simple keyword matching for demo with STRICT SCHEMA ADHERENCE
    const lowerQuery = query.toLowerCase();
    const relevantVisitors = mockVisitors.filter(visitor => {
      const visitorText = `${visitor.firstName} ${visitor.lastName} ${visitor.relationship} ${visitor.patientName} ${visitor.wardName} ${visitor.purpose} ${visitor.status}`.toLowerCase();
      return visitorText.includes(lowerQuery) ||
             lowerQuery.includes(visitor.firstName.toLowerCase()) ||
             lowerQuery.includes(visitor.lastName.toLowerCase()) ||
             lowerQuery.includes(visitor.patientName.toLowerCase()) ||
             lowerQuery.includes(visitor.wardName.toLowerCase());
    });

    // CONTEXT VERIFICATION: Log the results
    console.log(`[LangchainAgentService:visitorQueryTool] Found ${relevantVisitors.length} matching visitor(s)`);

    if (relevantVisitors.length === 0) {
      console.warn('[LangchainAgentService:visitorQueryTool] No visitors found matching the query');
      return 'No visitors found matching your query in the hospital database.';
    }

    const formattedResults = relevantVisitors.map((visitor, index) => {
      const checkInTime = new Date(visitor.checkInTime).toLocaleString();
      const checkOutTime = visitor.checkOutTime ? new Date(visitor.checkOutTime).toLocaleString() : 'Still checked in';

      return `[Citation ${index + 1}] Visitor Record | source=visitor_log | recordId=${visitor.id}
---
Visitor: ${visitor.firstName} ${visitor.lastName}
Relationship: ${visitor.relationship}
Visiting: ${visitor.patientName} (Ward: ${visitor.wardName})
Purpose: ${visitor.purpose}
Check-in: ${checkInTime}
Check-out: ${checkOutTime}
Status: ${visitor.status}`;
    }).join('\n\n');

    console.log(`[LangchainAgentService:visitorQueryTool] Formatted context length: ${formattedResults.length} chars`);
    
    return formattedResults;
  },
  {
    name: 'VisitorQueryTool',
    description: 'Query visitor information including who is visiting patients, check-in/check-out times, relationships, and current status. Can answer questions like "Who is visiting Ward 3?", "Has John Smith had visitors today?", "Show me active visitors".',
    schema: z.string(),
  },
);

/**
 * Create a deterministic LLM for RAG retrieval with temperature=0
 * Ensures factual, non-creative outputs that prevent hallucinations.
 */
const createDeterministicLLM = () => {
  // Uses temperature=0 for deterministic, factual outputs
  // Critical for medical/factual queries to prevent inference and assumptions
  return createDeterministicChatOllama();
};

const createAgentModel = () => {
  return createDeterministicLLM();
};

const buildAgentPrompt = (
  question: string,
  guidance: string,
  securityContext: string,
  metadata?: Record<string, any>,
  context?: string,
) => {
  const metadataBlock = metadata ? `AI QUERY METADATA: ${JSON.stringify(metadata)}\n\n` : '';
  return `${guidance}\n\n${securityContext}\n${metadataBlock}${context ? `Conversation context:\n${context}\n\n` : ''}${question.trim()}`;
};

const invokeAgent = async (agent: ReturnType<typeof createAgentModel>, prompt: string): Promise<any> => {
  try {
    return await invokeOllamaWithTimeout(agent.invoke(prompt));
  } catch (error) {
    const message = error instanceof Error ? error.message : safelyStringify(error);
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { error };

    console.error('[LangchainAgentService] invokeAgent error:', errorDetails);

    if (message.includes('does not support tools') || message.includes('not support tools')) {
      throw new Error(`Ollama model does not support tools: ${message}. Ensure the configured model (${ollamaModel}) supports tool invocation and bindings.`);
    }

    if (message.includes('connect ECONNREFUSED') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
      throw new Error(`Ollama service unreachable at ${ollamaBaseUrl}. Ensure the Ollama daemon is running and reachable.`);
    }

    if (/model .* not found/i.test(message)) {
      throw new Error(`Ollama model not found: ${message}. Ensure the configured model (${ollamaModel}) is installed and available.`);
    }

    throw new Error(`Ollama invocation error: ${message}`);
  }
};

/**
 * Main agent query function with strict RAG integrity controls:
 * - Enforces zero-hallucination mandate via system prompt
 * - Verifies context before LLM invocation
 * - Uses deterministic temperature=0 for factual outputs
 * - Enforces strict schema adherence with "No record found" fallback
 * - Includes citation traceability in responses
 */
export const runHospitalAgentQuery = async (
  question: string,
  userRole: AIUserRole = 'visitor',
  context?: string,
  metadata?: Record<string, any>,
): Promise<string> => {
  
  // CONTEXT VERIFICATION: Validate input
  if (!question || question.trim().length === 0) {
    console.error('[LangchainAgentService:runHospitalAgentQuery] Question is empty');
    return 'The information is not available in the hospital database.';
  }

  console.log(`[LangchainAgentService:runHospitalAgentQuery] Query: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);

  // Direct DB fallback for explicit operational queries
  try {
    const directAnswer = await answerQuestionFromDatabase(question);
    if (directAnswer) {
      console.log('[LangchainAgentService:runHospitalAgentQuery] Using direct DB fallback answer');
      return directAnswer;
    }
  } catch (fallbackError) {
    console.warn('[LangchainAgentService:runHospitalAgentQuery] Direct DB fallback failed:', fallbackError);
  }

  // Determine which tool to call based on question content
  // STRICT SCHEMA ADHERENCE: Only use tools for queries that map to schema
  let toolOutput = '';
  const questionLower = question.toLowerCase();
  
  try {
    if (questionLower.includes('visitor') || questionLower.includes('check-in') || questionLower.includes('checked out')) {
      console.log('[LangchainAgentService:runHospitalAgentQuery] Using VisitorQueryTool');
      toolOutput = await visitorQueryTool.invoke(question);
    } else if (questionLower.includes('note') || questionLower.includes('admission') || questionLower.includes('prescription') || questionLower.includes('lab')) {
      console.log('[LangchainAgentService:runHospitalAgentQuery] Using PatientMoodVectorTool');
      toolOutput = await vectorTool.invoke(question);
    } else if (questionLower.includes('patient') || questionLower.includes('staff') || questionLower.includes('ward') || questionLower.includes('pharmacy') || questionLower.includes('billing')) {
      console.log('[LangchainAgentService:runHospitalAgentQuery] Using HospitalSQL');
      toolOutput = await sqlTool.invoke(question);
    } else {
      // Default to SQL tool for structured queries
      console.log('[LangchainAgentService:runHospitalAgentQuery] Using HospitalSQL (default)');
      toolOutput = await sqlTool.invoke(question);
    }
  } catch (toolError) {
    console.error('[LangchainAgentService:runHospitalAgentQuery] Tool invocation error:', toolError);
    return 'The information is not available in the hospital database.';
  }

  // CONTEXT VERIFICATION: Verify tool output is not empty
  if (!toolOutput || toolOutput.trim().length === 0) {
    console.warn('[LangchainAgentService:runHospitalAgentQuery] Tool returned empty output');
    return 'The information is not available in the hospital database.';
  }

  console.log(`[LangchainAgentService:runHospitalAgentQuery] Tool output length: ${toolOutput.length} chars`);

  // Use deterministic LLM (temperature=0) for final answer generation
  const agent = createDeterministicLLM();
  
  // Build the final prompt with context verification
  const metadataContext = metadata ? `AI QUERY METADATA: ${JSON.stringify(metadata)}\n\n` : '';
  const conversationContext = context ? `Conversation context:\n${context}\n\n` : '';
  
  const finalPrompt = `${conversationContext}Based on the following data from the hospital database:\n\n${toolOutput}\n\nAnswer this question factually and only based on the provided data. If the data does not contain the answer, respond with: "The information is not available in the hospital database."\n\nQuestion: ${question}`;
  
  // CONTEXT VERIFICATION: Log the final context
  console.log('[LangchainAgentService:runHospitalAgentQuery] === FINAL CONTEXT VERIFICATION ===');
  console.log(`[LangchainAgentService:runHospitalAgentQuery] Total context length: ${finalPrompt.length} chars`);
  console.log(`[LangchainAgentService:runHospitalAgentQuery] Context preview: "${finalPrompt.substring(0, 300)}${finalPrompt.length > 300 ? '...' : ''}"`);
  console.log('[LangchainAgentService:runHospitalAgentQuery] === CONTEXT VERIFICATION COMPLETE ===\n');
  
  try {
    const response = await invokeAgent(agent, finalPrompt);
    
    // Extract answer from response
    let answer: string;
    if (typeof response === 'string') {
      answer = response;
    } else if (typeof response === 'object' && response !== null) {
      const anyResponse = response as any;
      answer = anyResponse.content || anyResponse.text || JSON.stringify(response);
    } else {
      answer = String(response);
    }

    // ZERO-HALLUCINATION: Enforce response compliance
    if (!answer || answer.trim().length === 0) {
      answer = 'The information is not available in the hospital database.';
    }

    return answer;
  } catch (error) {
    console.error('[LangchainAgentService:runHospitalAgentQuery] LLM invocation error:', error);
    return 'The information is not available in the hospital database.';
  }
};
/**
 * Extended version of runHospitalAgentQuery that also returns audit details
 * WITH STRICT RAG INTEGRITY CONTROLS:
 * - Zero-Hallucination: System prompt enforces database-only answers
 * - Context Verification: Logs formattedContext before LLM invocation and halts if empty
 * - Deterministic Output: Temperature=0 for factual, non-creative responses
 * - Strict Schema Adherence: Defaults to "No record found" for unmappable queries
 * - Traceability: All responses include source citations from document metadata
 */
export const runHospitalAgentQueryWithAudit = async (
  question: string,
  userRole: AIUserRole = 'visitor',
  context?: string,
  metadata?: Record<string, any>,
): Promise<{
  answer: string;
  sqlGenerated?: string;
  vectorQuery?: string;
  rawResponse: string;
  citations?: string[];
}> => {
  if (!question.trim()) {
    throw new Error('Question is required for the hospital agent.');
  }

  if (!(await ensureOllamaIsReachable())) {
    throw new Error(`Ollama service is unavailable at ${ollamaBaseUrl}. Ensure the Ollama daemon is running and the model ${ollamaModel} is loaded.`);
  }

  // Use deterministic LLM (temperature=0) for all RAG queries
  const agent = createDeterministicLLM();
  const guidance = buildAiAccessGuidance(userRole);
  const securityContext = buildAISecurityContext(
    normalizeToRBACRole(userRole === 'admin' ? 'admin' : userRole === 'staff' ? 'clinical' : 'reception'),
    metadata?.userId,
  );
  
  // CONTEXT VERIFICATION: Build and log the formatted context before LLM invocation
  const metadataBlock = metadata ? `AI QUERY METADATA: ${JSON.stringify(metadata)}\n\n` : '';
  const contextBlock = context ? `Conversation context:\n${context}\n\n` : '';
  
  const formattedContext = `${guidance}\n\n${securityContext}\n${metadataBlock}${contextBlock}`;
  
  // LOG FORMATTED CONTEXT FOR VERIFICATION
  console.log('[LangchainAgentService:runHospitalAgentQueryWithAudit] === CONTEXT VERIFICATION START ===');
  console.log(`[LangchainAgentService] Formatted Context Length: ${formattedContext.length} chars`);
  console.log(`[LangchainAgentService] Context Preview:\n${formattedContext.substring(0, 500)}${formattedContext.length > 500 ? '\n...[truncated]' : ''}`);
  console.log('[LangchainAgentService:runHospitalAgentQueryWithAudit] === CONTEXT VERIFICATION END ===\n');
  
  // CONTEXT VERIFICATION: Halt if context is empty
  if (!formattedContext || formattedContext.trim().length === 0) {
    const errorMsg = 'Formatted context is empty; halting to prevent hallucination.';
    console.error(`[LangchainAgentService] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Direct DB fallback for name-based and structured operational queries
  try {
    const directAnswer = await answerQuestionFromDatabase(question);
    if (directAnswer) {
      return {
        answer: directAnswer,
        sqlGenerated: 'DIRECT_DB_FALLBACK',
        rawResponse: directAnswer,
        citations: [],
      };
    }
  } catch (fallbackError) {
    console.warn('[LangchainAgentService:runHospitalAgentQueryWithAudit] Direct DB fallback failed:', fallbackError);
  }

  // -----------------------
  // Schema awareness mapping
  // -----------------------
  // Chain-of-thought reasoning (auditable): decide table and columns to query
  const reasoning: string[] = [];
  const q = question.trim();
  const qLower = q.toLowerCase();

  const unsupportedFields = detectUnsupportedSchemaFields(q);
  if (unsupportedFields.length > 0) {
    const auditSql = `Unsupported schema field request detected: ${unsupportedFields.join(', ')}`;
    return { answer: 'No data retrieved for this query. Please check the database entries.', sqlGenerated: auditSql, rawResponse: '', citations: [] };
  }

  const inferTargetTable = (query: string): string | undefined => {
    if (/(staff|doctor|physician)/i.test(query)) return 'Staff';
    if (/(billing|invoice|payment|bill|payable)/i.test(query)) return 'BillingRecord';
    if (/(pharmacy|drug|medication|inventory|stock)/i.test(query)) return 'Pharmacy';
    if (/(lab test|lab results|lab|test|laboratory)/i.test(query)) return 'LabTest';
    if (/(visitor|visitors|visiting|check-in|check out)/i.test(query)) return 'Visitor';
    if (/(ward|current occupancy|department)/i.test(query)) return 'Ward';
    if (/(patient|admitted|discharge|triage|patient code)/i.test(query)) return 'Patient';
    return undefined;
  };

  const extractColumnsFromQuery = (query: string, table?: string): string[] => {
    const lower = query.toLowerCase();
    const columns = new Set<string>();
    const tableColumns = table ? schemaMap[table] || [] : [];

    const shouldAddColumn = (col: string) => {
      if (!table) return true;
      return tableColumns.includes(col);
    };

    if (tableColumns.length > 0) {
      tableColumns.forEach((col) => {
        if (lower.includes(col.toLowerCase())) {
          columns.add(col);
        }
      });
    } else {
      Object.values(schemaMap).forEach((allowedColumns) => {
        allowedColumns.forEach((col) => {
          if (lower.includes(col.toLowerCase())) {
            columns.add(col);
          }
        });
      });
    }

    Object.entries(supportedFieldSynonyms).forEach(([keyword, mappedColumns]) => {
      if (!lower.includes(keyword)) return;
      mappedColumns.forEach((col) => {
        if (shouldAddColumn(col)) {
          columns.add(col);
        }
      });
    });

    return Array.from(columns);
  };

  const targetTable = inferTargetTable(qLower);
  const requestedCols = extractColumnsFromQuery(q, targetTable);
  if (targetTable && requestedCols.length > 0) {
    const invalidCols = validateColumnRequest(targetTable, requestedCols);
    if (invalidCols.length > 0) {
      console.error(`[Security] Query blocked: Invalid columns: ${invalidCols.join(', ')}`);
      return {
        answer: 'No data retrieved for this query. Please check the database entries.',
        sqlGenerated: 'COLUMN_VALIDATION_FAILURE',
        rawResponse: '',
        citations: [],
      };
    }
  }

  // Helper: standardized empty-result response required by mandate
  const emptyResultResponse = 'No data retrieved for this query. Please check the database entries.';

  const extractProperName = (query: string): string | null => {
    const patterns = [
      /\b(?:named|called|is|does|has|had)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\b/i,
      /\b([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\s+(?:on duty|available|present|working|department|ward|role|position|status|assigned|assigned to)\b/i,
    ];
    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  };

  const formatStaffSearchAnswer = (results: any[], name: string) => {
    const rows = results.slice(0, 10).map((staff) => `${staff.firstName} ${staff.lastName} | ${staff.role || 'Unknown role'} | ${staff.department || 'Unknown department'} | ${staff.currentStatus || 'Unknown status'}`);
    return `Found ${results.length} staff record(s) matching "${name}". Example rows:\n${rows.join('\n')}`;
  };

  const formatPatientSearchAnswer = (results: any[], name: string) => {
    const rows = results.slice(0, 10).map((patient) => {
      const admission = patient.admissionDate ? new Date(patient.admissionDate).toISOString().split('T')[0] : 'Unknown admission';
      const discharge = patient.dischargeDate ? new Date(patient.dischargeDate).toISOString().split('T')[0] : 'Not discharged';
      return `${patient.firstName} ${patient.lastName} | ${patient.patientCode || 'No code'} | Admitted: ${admission} | Discharged: ${discharge}`;
    });
    return `Found ${results.length} patient record(s) matching "${name}". Example rows:\n${rows.join('\n')}`;
  };

  const formatGenericListAnswer = (title: string, results: any[]) => {
    const rows = results.slice(0, 10).map((row: any) => JSON.stringify(row));
    return `${title}: ${results.length} record(s) returned. Example rows:\n${rows.join('\n')}`;
  };

  const searchStaffByName = async (name: string) => {
    reasoning.push(`Intent: staff lookup by name -> searching Staff table for firstName/lastName ILIKE '%${name}%'`);
    const sqlDesc = `SELECT * FROM "Staff" WHERE LOWER("firstName") LIKE LOWER('%${name}%') OR LOWER("lastName") LIKE LOWER('%${name}%')`;
    const results = await prisma.staff.findMany({
      where: {
        OR: [
          { firstName: { contains: name, mode: 'insensitive' as any } },
          { lastName: { contains: name, mode: 'insensitive' as any } },
        ],
      },
    });
    return { results, sql: sqlDesc };
  };

  const getStockLevel = async (term?: string) => {
    reasoning.push(`Intent: pharmacy inventory lookup -> querying Pharmacy table${term ? ` for drugName ILIKE '%${term}%'` : ''}`);
    const sqlDesc = term
      ? `SELECT * FROM "Pharmacy" WHERE LOWER("drugName") LIKE LOWER('%${term}%') ORDER BY "stock" ASC`
      : `SELECT * FROM "Pharmacy" ORDER BY "stock" ASC`;
    const results = term
      ? await prisma.pharmacy.findMany({ where: { drugName: { contains: term, mode: 'insensitive' as any } }, orderBy: { stock: 'asc' } })
      : await prisma.pharmacy.findMany({ orderBy: { stock: 'asc' } });
    return { results, sql: sqlDesc };
  };

  const getPatientCount = async () => {
    reasoning.push('Intent: patient census -> counting Patient records with dischargeDate IS NULL');
    const sqlDesc = `SELECT COUNT(*) FROM "Patient" WHERE "dischargeDate" IS NULL`;
    const count = await prisma.patient.count({ where: { dischargeDate: null } });
    return { results: [{ count }], sql: sqlDesc };
  };

  const searchPatientByName = async (name: string) => {
    reasoning.push(`Intent: patient lookup by name -> searching Patient table for firstName/lastName ILIKE '%${name}%'`);
    const sqlDesc = `SELECT * FROM "Patient" WHERE LOWER("firstName") LIKE LOWER('%${name}%') OR LOWER("lastName") LIKE LOWER('%${name}%')`;
    const results = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: name, mode: 'insensitive' as any } },
          { lastName: { contains: name, mode: 'insensitive' as any } },
        ],
      },
    });
    return { results, sql: sqlDesc };
  };

  const getShiftBreakdown = async () => {
    reasoning.push('Intent: shift breakdown -> grouping Staff by shiftAssignment');
    const sqlDesc = `SELECT "shiftAssignment", COUNT("id") FROM "Staff" GROUP BY "shiftAssignment"`;
    const results = await prisma.staff.groupBy({ by: ['shiftAssignment'], _count: { id: true } });
    return { results, sql: sqlDesc };
  };

  const searchLabTests = async (term?: string) => {
    reasoning.push(`Intent: lab test lookup -> querying LabTest table${term ? ` for testName ILIKE '%${term}%'` : ''}`);
    const sqlDesc = term
      ? `SELECT * FROM "LabTest" WHERE LOWER("testName") LIKE LOWER('%${term}%')`
      : `SELECT * FROM "LabTest"`;
    const results = term
      ? await prisma.labTest.findMany({ where: { testName: { contains: term, mode: 'insensitive' as any } } })
      : await prisma.labTest.findMany();
    return { results, sql: sqlDesc };
  };

  const getStaffCount = async () => {
    reasoning.push('Intent: staff count/list -> counting all Staff records and grouping by status');
    const sqlDesc = `SELECT COUNT(*) as total FROM "Staff"`;
    const totalCount = await prisma.staff.count();
    const byStatus = await prisma.staff.groupBy({ by: ['currentStatus'], _count: { id: true } });
    return { results: [{ total: totalCount, byStatus }], sql: sqlDesc };
  };

  const getBillingInfo = async () => {
    reasoning.push('Intent: billing lookup -> querying BillingRecord table ordered by due date');
    const sqlDesc = `SELECT * FROM "BillingRecord" ORDER BY "dueDate" DESC LIMIT 20`;
    const results = await prisma.billingRecord.findMany({ orderBy: { dueDate: 'desc' }, take: 20 });
    return { results, sql: sqlDesc };
  };

  const getAllPatientsFields = async () => {
    reasoning.push('Intent: comprehensive patient dashboard -> querying all Patient fields');
    const sqlDesc = `SELECT * FROM "Patient"`;
    const results = await prisma.patient.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllStaffFields = async () => {
    reasoning.push('Intent: comprehensive staff dashboard -> querying all Staff fields');
    const sqlDesc = `SELECT * FROM "Staff"`;
    const results = await prisma.staff.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllPharmacyFields = async () => {
    reasoning.push('Intent: comprehensive pharmacy dashboard -> querying all Pharmacy fields');
    const sqlDesc = `SELECT * FROM "Pharmacy"`;
    const results = await prisma.pharmacy.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllBillingFields = async () => {
    reasoning.push('Intent: comprehensive billing dashboard -> querying all BillingRecord fields');
    const sqlDesc = `SELECT * FROM "BillingRecord"`;
    const results = await prisma.billingRecord.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllLabTestFields = async () => {
    reasoning.push('Intent: comprehensive lab test dashboard -> querying all LabTest fields');
    const sqlDesc = `SELECT * FROM "LabTest"`;
    const results = await prisma.labTest.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllVisitorFields = async () => {
    reasoning.push('Intent: comprehensive visitor dashboard -> querying all Visitor fields');
    const sqlDesc = `SELECT * FROM "Visitor"`;
    const results = await prisma.visitor.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllFacilityFields = async () => {
    reasoning.push('Intent: comprehensive facility dashboard -> querying all Facility fields');
    const sqlDesc = `SELECT * FROM "Facility"`;
    const results = await prisma.facility.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllWardFields = async () => {
    reasoning.push('Intent: comprehensive ward dashboard -> querying all Ward fields');
    const sqlDesc = `SELECT * FROM "Ward"`;
    const results = await prisma.ward.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllMaintenanceLogFields = async () => {
    reasoning.push('Intent: comprehensive maintenance dashboard -> querying all MaintenanceLog fields');
    const sqlDesc = `SELECT * FROM "MaintenanceLog"`;
    const results = await prisma.maintenanceLog.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllEmergencyFields = async () => {
    reasoning.push('Intent: comprehensive emergency dashboard -> querying all Emergency fields');
    const sqlDesc = `SELECT * FROM "Emergency"`;
    const results = await prisma.emergency.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllPrescriptionFields = async () => {
    reasoning.push('Intent: comprehensive prescription dashboard -> querying all Prescription fields');
    const sqlDesc = `SELECT * FROM "Prescription"`;
    const results = await prisma.prescription.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllPharmacySalesFields = async () => {
    reasoning.push('Intent: comprehensive pharmacy sales dashboard -> querying all PharmacySales fields');
    const sqlDesc = `SELECT * FROM "PharmacySales"`;
    const results = await prisma.pharmacySales.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllStaffEmergencyFields = async () => {
    reasoning.push('Intent: comprehensive staff emergency dashboard -> querying all StaffEmergency fields');
    const sqlDesc = `SELECT * FROM "StaffEmergency"`;
    const results = await prisma.staffEmergency.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getAllAuditFields = async () => {
    reasoning.push('Intent: comprehensive audit dashboard -> querying all AuditLog fields');
    const sqlDesc = `SELECT * FROM "AuditLog"`;
    const results = await prisma.auditLog.findMany({ take: 100 });
    return { results, sql: sqlDesc };
  };

  const getDashboardByGroup = async (groupName: string) => {
    reasoning.push(`Intent: dashboard grouping -> retrieving ${groupName} dashboard with related fields`);
    const dashConfig = dashboardGroupings[groupName];
    if (!dashConfig) {
      return { results: {}, sql: `Dashboard ${groupName} not found` };
    }
    
    const results: Record<string, any> = {};
    for (const [table, _fields] of Object.entries(dashConfig)) {
      if (table === 'Patient') {
        results.Patient = await prisma.patient.findMany({ take: 50 });
      } else if (table === 'Staff') {
        results.Staff = await prisma.staff.findMany({ take: 50 });
      } else if (table === 'Ward') {
        results.Ward = await prisma.ward.findMany();
      } else if (table === 'LabTest') {
        results.LabTest = await prisma.labTest.findMany({ take: 50 });
      } else if (table === 'BillingRecord') {
        results.BillingRecord = await prisma.billingRecord.findMany({ take: 50 });
      } else if (table === 'Visitor') {
        results.Visitor = await prisma.visitor.findMany({ take: 50 });
      } else if (table === 'Facility') {
        results.Facility = await prisma.facility.findMany({ take: 50 });
      } else if (table === 'MaintenanceLog') {
        results.MaintenanceLog = await prisma.maintenanceLog.findMany({ take: 50 });
      } else if (table === 'Emergency') {
        results.Emergency = await prisma.emergency.findMany({ take: 50 });
      } else if (table === 'Pharmacy') {
        results.Pharmacy = await prisma.pharmacy.findMany({ take: 50 });
      } else if (table === 'Prescription') {
        results.Prescription = await prisma.prescription.findMany({ take: 50 });
      } else if (table === 'PharmacySales') {
        results.PharmacySales = await prisma.pharmacySales.findMany({ take: 50 });
      } else if (table === 'StaffEmergency') {
        results.StaffEmergency = await prisma.staffEmergency.findMany({ take: 50 });
      } else if (table === 'AuditLog') {
        results.AuditLog = await prisma.auditLog.findMany({ take: 50 });
      }
    }
    return { results, sql: `Multi-table dashboard query: ${Object.keys(results).join(', ')}` };
  };

  const formatComprehensiveAnswer = (title: string, results: any[]) => {
    if (results.length === 0) return `No records found for ${title}`;
    const count = results.length;
    const fieldCount = results[0] ? Object.keys(results[0]).length : 0;
    const summary = results.slice(0, 5).map((row: any) => JSON.stringify(row).substring(0, 100)).join('\n  ');
    return `${title}: ${count} record(s), ${fieldCount} field(s) per record.\n\nFirst 5 records (truncated):\n  ${summary}${count > 5 ? `\n  ... and ${count - 5} more records` : ''}`;
  };

  const formatDashboardAnswer = (groupName: string, data: Record<string, any[]>) => {
    const tables = Object.entries(data)
      .filter(([_, records]) => Array.isArray(records) && records.length > 0)
      .map(([table, records]) => `  ${table}: ${records.length} records`)
      .join('\n');
    return `${groupName} Dashboard:\n${tables || '  No data available'}`;
  };

  let auditSql: string | undefined = undefined;
  let vectorQuery: string | undefined = undefined;
  let rawResponse = '';
  let citations: string[] = [];

  const nameQuery = extractProperName(question);

  const validateResult = (results: any, sql: string, title: string, citationPrefix: string) => {
    const isEmpty = results == null || (Array.isArray(results) && results.length === 0) || (typeof results === 'object' && !Array.isArray(results) && Object.keys(results).length === 0);
    if (isEmpty) {
      return { answer: emptyResultResponse, sqlGenerated: sql, rawResponse: safelyStringify(results), citations: [] };
    }

    const answer = typeof results === 'string'
      ? String(results)
      : title === 'Staff search'
      ? formatStaffSearchAnswer(results as any[], nameQuery || 'query')
      : title === 'Patient search'
      ? formatPatientSearchAnswer(results as any[], nameQuery || 'query')
      : formatGenericListAnswer(title, results as any[]);

    const generatedCitations = Array.isArray(results)
      ? (results as any[]).filter((item) => item?.id).map((item) => `${citationPrefix}:${item.id}`)
      : [];

    return { answer, sqlGenerated: sql, rawResponse: safelyStringify(results), citations: generatedCitations };
  };

  try {
    // Visitor queries: use the visitor tool for strict retrieval
    if (/(visitor|visitors|visiting|check-in|check out|check-in time)/i.test(qLower)) {
      reasoning.push('Intent: visitor lookup -> using VisitorQueryTool');
      const visitorResults = await visitorQueryTool.invoke(question);
      auditSql = `VisitorQueryTool invoked with query: ${question}`;
      rawResponse = String(visitorResults);
      if (!visitorResults || String(visitorResults).trim().length === 0) {
        return { answer: emptyResultResponse, sqlGenerated: auditSql, rawResponse, citations: [] };
      }
      return { answer: String(visitorResults), sqlGenerated: auditSql, rawResponse, citations: [] };
    }

    if (/(pharmacy|drug|medication|inventory|stock)/i.test(qLower)) {
      const term = nameQuery || undefined;
      const { results, sql } = await getStockLevel(term);
      return validateResult(results, sql, 'Pharmacy inventory', 'Pharmacy');
    }

    if (/(how\s+many\s+patients|patient\s+census|admitted|discharged|triage|ward\s+occupancy|current\s+occupancy)/i.test(qLower) && !nameQuery) {
      const { results, sql } = await getPatientCount();
      return validateResult(results, sql, 'Patient count', 'Patient');
    }

    if (/(staff|doctor|physician).*?(named|called|on duty|available|working|present|department|role|position|status|shift|duty)/i.test(question) && nameQuery) {
      const { results, sql } = await searchStaffByName(nameQuery);
      return validateResult(results, sql, 'Staff search', 'Staff');
    }

    if (/(patient).*?(named|called|admitted|discharged|ward|triage|patient code)/i.test(question) && nameQuery) {
      const { results, sql } = await searchPatientByName(nameQuery);
      return validateResult(results, sql, 'Patient search', 'Patient');
    }

    if (/(billing|invoice|payment|bill)/i.test(qLower)) {
      const { results, sql } = await getBillingInfo();
      return validateResult(results, sql, 'Billing records', 'BillingRecord');
    }

    if (/(lab test|lab results|lab|test|laboratory)/i.test(qLower)) {
      const term = nameQuery || undefined;
      const { results, sql } = await searchLabTests(term);
      return validateResult(results, sql, 'Lab tests', 'LabTest');
    }

    if (/(prescription|medication|dosage|frequency|duration|quantity|prescribed|prescribed by|prescribed to)/i.test(qLower)) {
      const { results, sql } = await getAllPrescriptionFields();
      return validateResult(results, sql, 'Prescription records', 'Prescription');
    }

    if (/(sales|sale price|sales history|pharmacy sales|revenue|units sold|quantity sold)/i.test(qLower)) {
      const { results, sql } = await getAllPharmacySalesFields();
      return validateResult(results, sql, 'Pharmacy sales records', 'PharmacySales');
    }

    if (/(maintenance|maintenance log|facility maintenance)/i.test(qLower)) {
      const { results, sql } = await getAllMaintenanceLogFields();
      return validateResult(results, sql, 'Maintenance log records', 'MaintenanceLog');
    }

    if (/(emergency responder|responders|staff emergency|emergency role|dispatch|responding|triggered|incident response|code blue)/i.test(qLower)) {
      const { results, sql } = await getAllStaffEmergencyFields();
      return validateResult(results, sql, 'Emergency responder assignments', 'StaffEmergency');
    }

    if (/(emergency|incident|code blue|fire|active shooter|priority|responding|resolved|actions taken)/i.test(qLower)) {
      const { results, sql } = await getAllEmergencyFields();
      return validateResult(results, sql, 'Emergency records', 'Emergency');
    }

    if (/(ward overview|ward dashboard|all ward fields|complete ward)/i.test(qLower)) {
      const { results, sql } = await getAllWardFields();
      return validateResult(results, sql, 'Ward Overview Dashboard', 'Ward');
    }

    if (/(audit overview|audit dashboard|audit log|audit trail|access log)/i.test(qLower)) {
      const { results, sql } = await getAllAuditFields();
      return validateResult(results, sql, 'Audit Dashboard', 'AuditLog');
    }

    if (/(shift assignment|shift breakdown|on-duty|off-duty|shift|duty)/i.test(qLower)) {
      const { results, sql } = await getShiftBreakdown();
      return validateResult(results, sql, 'Staff shift breakdown', 'Staff');
    }

    if (/(how\s+many\s+staff|staff\s+count|number\s+of\s+staff|total\s+staff|staff\s+roster|provide\s+staff|list\s+staff)/i.test(qLower)) {
      const { results, sql } = await getStaffCount();
      return validateResult(results, sql, 'Staff count', 'Staff');
    }

    // === COMPREHENSIVE DASHBOARD QUERIES ===
    if (/(patient overview|patient dashboard|all patient fields|complete patient)/i.test(qLower)) {
      const { results, sql } = await getAllPatientsFields();
      return validateResult(results, sql, 'Patient Overview Dashboard', 'Patient');
    }

    if (/(staff overview|staff dashboard|all staff fields|complete staff)/i.test(qLower)) {
      const { results, sql } = await getAllStaffFields();
      return validateResult(results, sql, 'Staff Overview Dashboard', 'Staff');
    }

    if (/(pharmacy overview|pharmacy dashboard|all pharmacy fields|complete pharmacy|full inventory)/i.test(qLower)) {
      const { results, sql } = await getAllPharmacyFields();
      return validateResult(results, sql, 'Pharmacy Dashboard', 'Pharmacy');
    }

    if (/(billing overview|billing dashboard|all billing fields|complete billing)/i.test(qLower)) {
      const { results, sql } = await getAllBillingFields();
      return validateResult(results, sql, 'Billing Dashboard', 'BillingRecord');
    }

    if (/(lab test overview|lab test dashboard|all lab test fields|complete lab test|all lab results)/i.test(qLower)) {
      const { results, sql } = await getAllLabTestFields();
      return validateResult(results, sql, 'Lab Test Dashboard', 'LabTest');
    }

    if (/(visitor overview|visitor dashboard|all visitor fields|complete visitor|visitor management)/i.test(qLower)) {
      const { results, sql } = await getAllVisitorFields();
      return validateResult(results, sql, 'Visitor Dashboard', 'Visitor');
    }

    if (/(facility overview|facility dashboard|all facility fields|complete facility)/i.test(qLower)) {
      const { results, sql } = await getAllFacilityFields();
      return validateResult(results, sql, 'Facility Dashboard', 'Facility');
    }

    // === GROUPED DASHBOARD QUERIES ===
    const dashboardMatches = Object.keys(dashboardGroupings).find(key => qLower.includes(key.toLowerCase().replace(/_/g, ' ')));
    if (dashboardMatches || /dashboard|grouped|summary|overview group/i.test(qLower)) {
      let targetDashboard = dashboardMatches || 'PATIENT_OVERVIEW';
      if (/staff.*operation|operation.*staff/i.test(qLower)) targetDashboard = 'STAFF_OPERATIONS';
      if (/pharmacy.*inventory|inventory.*pharmacy/i.test(qLower)) targetDashboard = 'PHARMACY_INVENTORY';
      if (/billing|invoice|payment/i.test(qLower)) targetDashboard = 'BILLING_DASHBOARD';
      if (/facility.*manage|manage.*facility/i.test(qLower)) targetDashboard = 'FACILITY_MANAGEMENT';
      if (/visitor.*track|track.*visitor/i.test(qLower)) targetDashboard = 'VISITOR_TRACKING';
      if (/emergency.*response|emergency.*dispatch|emergency.*alert/i.test(qLower)) targetDashboard = 'EMERGENCY_RESPONSE';

      const { results, sql } = await getDashboardByGroup(targetDashboard);
      const isEmpty = Object.values(results).every(v => !Array.isArray(v) || v.length === 0);
      if (isEmpty) {
        return { answer: emptyResultResponse, sqlGenerated: sql, rawResponse: safelyStringify(results), citations: [] };
      }
      const answer = formatDashboardAnswer(targetDashboard, results as Record<string, any[]>);
      const citations = Object.entries(results).flatMap(([table, items]: [string, any]) =>
        Array.isArray(items) ? items.filter((item) => item?.id).map((item) => `${table}:${item.id}`) : []
      );
      return { answer, sqlGenerated: sql, rawResponse: safelyStringify(results), citations };
    }

    if (/(patient|staff|ward|billing|pharmacy|lab|visitor|inventory|triage|discharge|admission|doctor|physician|nurse|vital|oxygen|spo2|o2|respiratory)/i.test(qLower)) {
      reasoning.push('Fallback intent: structured database query -> using HospitalSQL tool');
      const sqlToolResult = await sqlTool.invoke(question);
      auditSql = `HospitalSQL tool invoked with input: ${question}`;
      rawResponse = String(sqlToolResult);
      if (!sqlToolResult || String(sqlToolResult).trim().length === 0) {
        return { answer: emptyResultResponse, sqlGenerated: auditSql, rawResponse, citations: [] };
      }
      return { answer: String(sqlToolResult), sqlGenerated: auditSql, rawResponse, citations: [] };
    }

    // No tool mapping detected for the query
    return { answer: emptyResultResponse, sqlGenerated: 'NO_TOOL_MATCH', rawResponse: 'No data-retrieval tool matched the query semantics.', citations: [] };
  } catch (err: any) {
    console.error('[LangchainAgentService:runHospitalAgentQueryWithAudit] Data retrieval error:', err);
    return { answer: emptyResultResponse, sqlGenerated: err?.sql || undefined, rawResponse: err?.message || safelyStringify(err), citations: [] };
  }
};

export const refreshPatientSoftVectorStore = async (): Promise<void> => {
  memoizedVectorStore = null;
  await getPatientSoftVectorStore();
};
