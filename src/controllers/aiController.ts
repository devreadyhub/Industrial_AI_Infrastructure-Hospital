import { Request, Response } from 'express';
import { queryHospitalDatabase } from '../services/langchainService';
import {
  runHospitalAgentQueryWithAudit,
  refreshPatientSoftVectorStore,
} from '../services/langchainAgentService';
import { getOllamaHealth } from '../services/ollamaService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { isSensitiveQuery } from '../services/aiSecurity';
import { buildAIQueryMetadata } from '../services/aiSecurityService';
import { normalizeToRBACRole, UserRole } from '../middleware/rbacMiddleware';
import { TranscriptionService } from '../services/transcriptionService';
import { TTSService } from '../services/ttsService';
import { generatePrivateAudio, createVoicePrivacyAuditLog, VoicePrivacyStats } from '../services/voicePrivacyFilterService';

interface AuditedRequest extends AuthenticatedRequest {
  auditData?: {
    startTime: number;
    userPrompt?: string;
    sqlGenerated?: string;
    vectorQuery?: string;
    interactionType?: string;
  };
}

/**
 * Convert RBAC UserRole to AI service role string
 */
const userRoleToAIRole = (role: UserRole): 'visitor' | 'staff' | 'admin' => {
  switch (role) {
    case UserRole.ADMIN:
      return 'admin';
    case UserRole.DOCTOR:
    case UserRole.CLINICAL:
    case UserRole.PHARMACY:
      return 'staff';
    case UserRole.RECEPTION:
    default:
      return 'visitor';
  }
};

export const handleSqlQuery = async (req: AuthenticatedRequest, res: Response) => {
  const { question } = req.body;
  const userRole = req.user?.role ?? 'visitor';

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ message: 'question is required in the request body' });
  }

  if (userRole === 'visitor' && isSensitiveQuery(question)) {
    return res.status(403).json({
      message: 'You do not have permission to query patient medical records or billing details.',
    });
  }

  try {
    const rbacUserRole = normalizeToRBACRole(req.user?.role ?? 'visitor');
    const aiUserRole = userRoleToAIRole(rbacUserRole);
    const metadata = buildAIQueryMetadata(rbacUserRole, req.user?.staffId, question);
    const answer = await queryHospitalDatabase(question, aiUserRole, metadata);
    return res.json({ answer });
  } catch (error) {
    console.error('AI SQL query error:', error);
    return res.status(500).json({
      message: 'Unable to generate answer from the hospital SQL chain',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const handleAgentQuery = async (req: AuditedRequest, res: Response) => {
  const { question, context } = req.body;
  const userRole = req.user?.role ?? 'visitor';

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ message: 'question is required in the request body' });
  }

  if (userRole === 'visitor' && isSensitiveQuery(question)) {
    return res.status(403).json({ message: 'You do not have permission to access patient records.' });
  }

  try {
    const rbacUserRole = normalizeToRBACRole(req.user?.role ?? 'visitor');
    const aiUserRole = userRoleToAIRole(rbacUserRole);
    const metadata = buildAIQueryMetadata(rbacUserRole, req.user?.staffId, question);
    const { answer, sqlGenerated, vectorQuery } = await runHospitalAgentQueryWithAudit(
      question,
      aiUserRole,
      context,
      metadata,
    );

    if (req.auditData) {
      req.auditData.sqlGenerated = sqlGenerated;
      req.auditData.vectorQuery = vectorQuery;
      req.auditData.interactionType = 'AGENT_QUERY';
      req.auditData.userPrompt = question;
    }

    return res.json({ answer });
  } catch (error) {
    console.error('AI agent query error:', error);
    return res.status(500).json({
      message: 'Unable to generate answer from the hospital AI agent',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const handleChatQuery = async (req: AuditedRequest, res: Response) => {
  const { question, context } = req.body;
  const userRole = req.user?.role ?? 'visitor';

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ message: 'question is required in the request body' });
  }

  if (userRole === 'visitor' && isSensitiveQuery(question)) {
    return res.status(403).json({ message: 'You do not have permission to access patient records.' });
  }

  try {
    const rbacUserRole = normalizeToRBACRole(req.user?.role ?? 'visitor');
    const aiUserRole = userRoleToAIRole(rbacUserRole);
    const metadata = buildAIQueryMetadata(rbacUserRole, req.user?.staffId, question);
    const { answer, sqlGenerated, vectorQuery } = await runHospitalAgentQueryWithAudit(
      question,
      aiUserRole,
      context,
      metadata,
    );

    if (req.auditData) {
      req.auditData.sqlGenerated = sqlGenerated;
      req.auditData.vectorQuery = vectorQuery;
      req.auditData.interactionType = 'CHAT_QUERY';
      req.auditData.userPrompt = question;
    }

    return res.json({ answer });
  } catch (error) {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { error };

    console.error('AI chat query error:', errorDetails);
    return res.status(500).json({
      message: 'Unable to generate answer from the hospital AI chat service',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const handleRefreshVectorStore = async (req: Request, res: Response) => {
  try {
    console.log('Refreshing patient soft data vector store...');
    await refreshPatientSoftVectorStore();
    return res.json({
      success: true,
      message: 'Vector store refreshed successfully. New clinical notes have been re-indexed.',
    });
  } catch (error) {
    console.error('Vector store refresh error:', error);
    return res.status(500).json({
      message: 'Failed to refresh vector store',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleTranscription = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    const transcription = await TranscriptionService.transcribeAudio(req.file.buffer);

    return res.json({ transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      message: 'Failed to transcribe audio',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleOllamaHealth = async (_req: Request, res: Response) => {
  try {
    const status = await getOllamaHealth();
    return res.json({ success: true, status });
  } catch (error) {
    console.error('Ollama health check failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Ollama health status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleTTS = async (req: AuthenticatedRequest, res: Response) => {
  const auditReq = req as AuthenticatedRequest & { auditData?: any };
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'text is required in the request body' });
    }

    // Get user role for privacy filtering
    const userRole = req.user?.role ?? 'visitor';

    // Generate audio with voice privacy filtering applied
    const audioBuffer = await generatePrivateAudio(text, userRole, req.user?.staffId);

    // Create audit log for privacy filter event
    const auditLog = createVoicePrivacyAuditLog(text, userRole, req.user?.staffId);
    VoicePrivacyStats.getInstance().recordEvent(auditLog);
    if (auditReq.auditData) {
      auditReq.auditData.interactionType = 'TTS_REQUEST';
      auditReq.auditData.userPrompt = text;
      auditReq.auditData.accessStatus = auditLog.wasFiltered ? 'DENIED_BY_PRIVACY_FILTER' : 'SUCCESS';
    }

    // Log if content was filtered
    if (auditLog.wasFiltered) {
      console.log(
        `[VoicePrivacy] Sensitive content filtered for user ${req.user?.staffId || 'unknown'}. Keywords: ${auditLog.sensitiveKeywordsDetected?.join(', ')}`,
      );
    }

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
    });

    return res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    return res.status(500).json({
      message: 'Failed to generate speech',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
