import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { Document } from '@langchain/core/documents';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { SqlDatabase } from '@langchain/classic/sql_db';
import { createSqlQueryChain } from '@langchain/classic/chains/sql_db';
import { PrismaClient } from '@prisma/client';
import { buildAiAccessGuidance, AIUserRole } from './aiSecurity';
import {
  buildAISecurityContext,
  buildAIQueryMetadata,
  filterAIResponseByRole,
} from './aiSecurityService';
import { normalizeToRBACRole } from '../middleware/rbacMiddleware';

const databaseUrl = process.env.DATABASE_URL;
const ollamaBaseUrl = process.env.OLLAMA_API_URL ?? 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama-3';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in .env');
}

const prisma = new PrismaClient();
const embeddings = new OllamaEmbeddings({ baseUrl: ollamaBaseUrl });
let memoizedVectorStore: MemoryVectorStore | null = null;

const createHospitalSqlChain = async () => {
  const db = await SqlDatabase.fromOptionsParams({
    appDataSourceOptions: {
      type: 'postgres',
      url: databaseUrl,
    },
  });

  const llm = new ChatOllama({
    baseUrl: ollamaBaseUrl,
    model: ollamaModel,
    temperature: 0.2,
  });

  return createSqlQueryChain({
    llm,
    db,
    dialect: 'postgres',
  });
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

const sqlTool = tool(
  async (input: string) => {
    const sqlChain = await createHospitalSqlChain();
    const result = await sqlChain.invoke({ input });
    if (typeof result === 'string') {
      return result;
    }

    const anyResult = result as any;
    const content = anyResult.content ?? anyResult.text;
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((block) => (typeof block === 'string' ? block : (block as any).text ?? JSON.stringify(block)))
        .join('');
    }
    return JSON.stringify(result);
  },
  {
    name: 'HospitalSQL',
    description:
      'Use this tool for structured numeric or factual queries against the hospital Postgres database, such as counts, patient census, inventory, and schedule facts.',
    schema: z.string(),
  },
);

const vectorTool = tool(
  async (input: string) => {
    const vectorStore = await getPatientSoftVectorStore();
    const searchResults = await vectorStore.similaritySearchWithScore(input, 10);

    const sortedByRecency = searchResults
      .map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata as Record<string, any>,
        score,
      }))
      .sort((a, b) => {
        const aTime = Date.parse(a.metadata.createdAt ?? '1970-01-01');
        const bTime = Date.parse(b.metadata.createdAt ?? '1970-01-01');
        return bTime - aTime;
      })
      .slice(0, 5);

    if (sortedByRecency.length === 0) {
      return 'No soft patient notes were available for this query.';
    }

    return sortedByRecency
      .map((item, index) => {
        const createdAt = item.metadata.createdAt ? new Date(item.metadata.createdAt).toISOString() : 'unknown';
        return [
          `Result ${index + 1}:`,
          `source=${item.metadata.source}`,
          `subject=${item.metadata.subject}`,
          `patientId=${item.metadata.patientId}`,
          `createdAt=${createdAt}`,
          `relevanceScore=${item.score.toFixed(4)}`,
          '---',
          item.content,
        ].join('\n');
      })
      .join('\n\n');
  },
  {
    name: 'PatientMoodVectorTool',
    description:
      'Search recent patient soft notes, admission narratives, lab notes, and prescription notes. Prioritize recent timestamps for context and mood-related decision support.',
    schema: z.string(),
  },
);

const visitorQueryTool = tool(
  async (query: string) => {
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

    // Simple keyword matching for demo
    const lowerQuery = query.toLowerCase();
    const relevantVisitors = mockVisitors.filter(visitor => {
      const visitorText = `${visitor.firstName} ${visitor.lastName} ${visitor.relationship} ${visitor.patientName} ${visitor.wardName} ${visitor.purpose} ${visitor.status}`.toLowerCase();
      return visitorText.includes(lowerQuery) ||
             lowerQuery.includes(visitor.firstName.toLowerCase()) ||
             lowerQuery.includes(visitor.lastName.toLowerCase()) ||
             lowerQuery.includes(visitor.patientName.toLowerCase()) ||
             lowerQuery.includes(visitor.wardName.toLowerCase());
    });

    if (relevantVisitors.length === 0) {
      return 'No visitors found matching your query.';
    }

    return relevantVisitors.map(visitor => {
      const checkInTime = new Date(visitor.checkInTime).toLocaleString();
      const checkOutTime = visitor.checkOutTime ? new Date(visitor.checkOutTime).toLocaleString() : 'Still checked in';

      return `Visitor: ${visitor.firstName} ${visitor.lastName}
Relationship: ${visitor.relationship}
Visiting: ${visitor.patientName} (Ward: ${visitor.wardName})
Purpose: ${visitor.purpose}
Check-in: ${checkInTime}
Check-out: ${checkOutTime}
Status: ${visitor.status}`;
    }).join('\n\n');
  },
  {
    name: 'VisitorQueryTool',
    description: 'Query visitor information including who is visiting patients, check-in/check-out times, relationships, and current status. Can answer questions like "Who is visiting Ward 3?", "Has John Smith had visitors today?", "Show me active visitors".',
    schema: z.string(),
  },
);

const createAgentModel = () => {
  const llm = new ChatOllama({
    baseUrl: ollamaBaseUrl,
    model: ollamaModel,
    temperature: 0.2,
  });
  return llm.bindTools([sqlTool, vectorTool, visitorQueryTool]);
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

export const runHospitalAgentQuery = async (
  question: string,
  userRole: AIUserRole = 'visitor',
  context?: string,
  metadata?: Record<string, any>,
): Promise<string> => {
  if (!question.trim()) {
    throw new Error('Question is required for the hospital agent.');
  }

  const agent = createAgentModel();
  const guidance = buildAiAccessGuidance(userRole);
  const securityContext = buildAISecurityContext(
    normalizeToRBACRole(userRole === 'admin' ? 'admin' : userRole === 'staff' ? 'clinical' : 'reception'),
    metadata?.userId,
  );
  const prompt = buildAgentPrompt(question, guidance, securityContext, metadata, context);
  const response = await agent.invoke(prompt);

  if (typeof response === 'string') {
    return response;
  }

  const anyResponse = response as any;
  const content = anyResponse.content ?? anyResponse.text;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => (typeof block === 'string' ? block : (block as any).text ?? JSON.stringify(block)))
      .join('');
  }

  return JSON.stringify(response);
};

/**
 * Extended version of runHospitalAgentQuery that also returns audit details
 * (SQL queries, vector queries, and raw output)
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
}> => {
  if (!question.trim()) {
    throw new Error('Question is required for the hospital agent.');
  }

  const agent = createAgentModel();
  const guidance = buildAiAccessGuidance(userRole);
  const securityContext = buildAISecurityContext(
    normalizeToRBACRole(userRole === 'admin' ? 'admin' : userRole === 'staff' ? 'clinical' : 'reception'),
    metadata?.userId,
  );
  const metadataBlock = metadata ? `AI QUERY METADATA: ${JSON.stringify(metadata)}\n\n` : '';
  const prompt = `${guidance}\n\n${securityContext}\n${metadataBlock}${context ? `Conversation context:\n${context}\n\n` : ''}${question.trim()}`;
  const response = await agent.invoke(prompt);

  // Try to extract SQL queries and vector queries from the response
  let sqlGenerated: string | undefined;
  let vectorQuery: string | undefined;

  const rawResponseStr = JSON.stringify(response);

  // Simple heuristic: look for SQL patterns in the response or tool calls
  if (rawResponseStr.includes('SELECT ') || rawResponseStr.includes('select ')) {
    const sqlMatch = rawResponseStr.match(/SELECT[^;]*/i);
    if (sqlMatch) {
      sqlGenerated = sqlMatch[0];
    }
  }

  // Look for vector search patterns
  if (rawResponseStr.includes('similaritySearch') || rawResponseStr.includes('PatientMoodVectorTool')) {
    vectorQuery = question; // The vector query is essentially the question itself
  }

  // Extract final answer
  let finalAnswer: string;
  if (typeof response === 'string') {
    finalAnswer = response;
  } else {
    const anyResponse = response as any;
    const content = anyResponse.content ?? anyResponse.text;

    if (typeof content === 'string') {
      finalAnswer = content;
    } else if (Array.isArray(content)) {
      finalAnswer = content
        .map((block) => (typeof block === 'string' ? block : (block as any).text ?? JSON.stringify(block)))
        .join('');
    } else {
      finalAnswer = JSON.stringify(response);
    }
  }

  return {
    answer: finalAnswer,
    sqlGenerated,
    vectorQuery,
    rawResponse: rawResponseStr,
  };
};

export const refreshPatientSoftVectorStore = async (): Promise<void> => {
  memoizedVectorStore = null;
  await getPatientSoftVectorStore();
};
