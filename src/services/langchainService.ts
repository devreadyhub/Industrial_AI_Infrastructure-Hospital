import { PromptTemplate } from '@langchain/core/prompts';
import { SqlDatabase } from 'langchain/sql_db';
import { createSqlQueryChain } from 'langchain/chains/sql_db';
import { buildAiAccessGuidance, AIUserRole } from './aiSecurity';
import { createOllama, ensureOllamaIsReachable } from './ollamaService';
import { answerQuestionFromDatabase } from './operationalDataService';

const databaseUrl = process.env.DATABASE_URL;

// Check if we have a valid database URL (not the placeholder)
const hasValidDatabase = databaseUrl && !databaseUrl.includes('username:password@localhost');

let ollamaAvailable: boolean | null = null;

const sqlPrompt = PromptTemplate.fromTemplate(`
You are a hospital chief of staff AI assistant.
Use the hospital's operational database to answer the question, provide safe recommendations, and avoid fabricating details.
Only use data available from the database schema and query results.

Available tables:
- Patient(id, patientCode, firstName, lastName, admissionDate, dischargeDate, wardId, triageLevel, admissionNotes)
- Ward(id, wardName, capacity, currentOccupancy, department)
- Staff(id, firstName, lastName, role, currentStatus, shiftAssignment, department)
- LabTest(id, testName, status, patientId, staffId, resultData, sampleCollectionDate, resultDate)
- Pharmacy(id, drugName, stock, minStockLevel, maxStockLevel, expiryDate)
- BillingRecord(id, invoiceNumber, totalAmount, amountDue, paymentStatus, dueDate)
- Visitor(id, firstName, lastName, relationship, patientId, wardId, checkInTime, checkOutTime, status)

Question: {input}
`);

const createHospitalSqlChain = async () => {
  const db = await SqlDatabase.fromOptionsParams({
    appDataSourceOptions: {
      type: 'postgres',
      url: databaseUrl,
    },
  });

  const ollama = createOllama();

  return createSqlQueryChain({
    llm: ollama,
    db,
    dialect: 'postgres',
    prompt: sqlPrompt,
  });
};

export const queryHospitalDatabase = async (
  question: string,
  userRole: AIUserRole = 'visitor',
  metadata?: Record<string, any>,
): Promise<string> => {
  if (!question.trim()) {
    throw new Error('Question is required for the SQL query chain.');
  }

  if (ollamaAvailable === null) {
    ollamaAvailable = await ensureOllamaIsReachable();
  }

  // Always try the direct database answer service first
  if (hasValidDatabase) {
    const directAnswer = await answerQuestionFromDatabase(question);
    if (directAnswer) {
      return directAnswer;
    }
  }

  // If we reach here and have a valid database, try the SQL chain
  if (hasValidDatabase && ollamaAvailable) {
    const chain = await createHospitalSqlChain();
    const metadataBlock = metadata ? `AI QUERY METADATA: ${JSON.stringify(metadata)}\n\n` : '';
    const input = `${buildAiAccessGuidance(userRole)}\n\n${metadataBlock}${question.trim()}`;

    try {
      const response = await chain.invoke({ input });
      return response;
    } catch (error) {
      console.error('[HospitalSql] query failed:', error);
      // Fall through to error handling below
    }
  }

  // If no database or all methods failed, return appropriate error message
  return 'I apologize, but I cannot find the requested information in the hospital database. This information may not be available in the system, or the query may not match any stored data. Please verify your query or contact hospital administration for assistance.';
};
