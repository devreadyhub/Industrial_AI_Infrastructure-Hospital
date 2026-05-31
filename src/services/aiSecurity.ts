export type AIUserRole = 'visitor' | 'staff' | 'admin';

export const normalizeAIUserRole = (role: string | undefined): AIUserRole => {
  const normalized = (role || 'visitor').trim().toLowerCase();
  if (normalized.includes('admin')) {
    return 'admin';
  }
  if (
    normalized === 'staff' ||
    normalized.includes('doctor') ||
    normalized.includes('nurse') ||
    normalized.includes('clinical') ||
    normalized.includes('pharmacy') ||
    normalized.includes('technician') ||
    normalized.includes('system admin')
  ) {
    return 'staff';
  }
  return 'visitor';
};

export const buildAiAccessGuidance = (role: AIUserRole): string => {
  if (role === 'visitor') {
    return `You are an AI assistant with very limited access. Do not search patient medical records, lab results, prescription notes, billing details, insurance claims, or any protected health information. Answer only with general facility-level or operational guidance. If the user asks for patient-specific, clinical, or billing information, respond with: \"I'm sorry, I don't have permission to share that information.\"`;
  }

  return `You are a hospital operations AI assistant. You may use the Postgres database and local patient notes to answer questions for authorized staff. Always avoid fabrication, only answer from available data, and do not expose unauthorized visitor-only information to users who lack access.`;
};

export const isSensitiveQuery = (question: string): boolean => {
  const lower = question.toLowerCase();
  return /patient|medical record|medical records|lab result|lab results|prescription|billing|invoice|insurance|diagnosis|treatment plan|ssn|social security|medical history|clinical note/.test(lower);
};
