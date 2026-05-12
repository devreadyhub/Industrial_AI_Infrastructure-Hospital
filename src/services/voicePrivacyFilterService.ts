import { TTSService } from './ttsService';
import { UserRole, ROLE_LEVELS } from '../middleware/rbacMiddleware';

/**
 * Voice Privacy Filter Service
 *
 * Redacts sensitive healthcare information from TTS output based on user clearance level.
 * If a user's clearance is below DOCTOR level (4) and the text contains sensitive keywords,
 * the service replaces the content with a privacy-safe fallback message.
 */

export enum ClearanceLevel {
  RECEPTION = 1,
  PHARMACY = 2,
  CLINICAL = 3,
  DOCTOR = 4,
  ADMIN = 5,
}

/**
 * Sensitive healthcare keywords that require privacy protection
 */
const SENSITIVE_KEYWORDS = [
  // Medical Conditions
  'cancer',
  'tumor',
  'malignant',
  'carcinoma',
  'hiv',
  'aids',
  'diabetes',
  'psychiatric',
  'mental illness',
  'depression',
  'anxiety disorder',
  'bipolar',
  'schizophrenia',
  'addiction',
  'substance abuse',
  'overdose',
  'sti',
  'std',
  'venereal',
  'abortion',
  'miscarriage',
  'pregnancy complication',
  'infertility',
  'erectile dysfunction',
  'impotence',

  // Procedures & Surgery
  'surgery',
  'surgical',
  'operation',
  'transplant',
  'amputation',
  'autopsy',
  'lobotomy',
  'vasectomy',
  'hysterectomy',
  'prostatectomy',
  'lumpectomy',
  'mastectomy',
  'chemotherapy',
  'radiotherapy',
  'dialysis',

  // Financial/Billing
  'debt',
  'financial hardship',
  'cannot afford',
  'unpaid bills',
  'insurance denied',
  'bankruptcy',
  'medical debt',
  'collection',
  'foreclosure',
  'eviction',

  // Sensitive Lab Results
  'positive test',
  'abnormal result',
  'high viral load',
  'undetectable',
  'immune count',
  'white blood cell',
  'viral',
  'pathogen',
  'antibiotic resistant',
  'mrsa',
  'c difficile',

  // Genetic/Family History
  'genetic mutation',
  'hereditary',
  'family history',
  'inherited disorder',
  'gene therapy',
  'dna test',
  'genetic counseling',

  // End of Life
  'terminal',
  'palliative',
  'hospice',
  'dnr',
  'do not resuscitate',
  'end of life',
  'assisted dying',
  'right to die',

  // Substance-Related
  'opioid',
  'heroin',
  'cocaine',
  'methamphetamine',
  'fentanyl',
  'prescription drug',
  'controlled substance',
  'street drug',
];

/**
 * Fallback message when sensitive information is detected
 */
const PRIVACY_FALLBACK_MESSAGE =
  'Detailed sensitive information has been moved to your secure screen for privacy.';

/**
 * Alternative friendly fallback messages (randomly selected for variety)
 */
const ALTERNATIVE_FALLBACK_MESSAGES = [
  'Detailed sensitive information has been moved to your secure screen for privacy.',
  'For your privacy, this sensitive medical information is displayed on your screen only.',
  'Your private health information is displayed securely on your device screen.',
  'Sensitive details have been protected and are available only on your screen for your privacy.',
];

/**
 * Check if text contains any sensitive keywords (case-insensitive)
 */
const containsSensitiveKeywords = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => {
    // Use word boundaries for more accurate matching
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lowerText);
  });
};

/**
 * Redact sensitive keywords from text (optional: can be used for audit logging)
 */
const redactSensitiveKeywords = (text: string): string => {
  let redactedText = text;

  SENSITIVE_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    redactedText = redactedText.replace(regex, '[REDACTED]');
  });

  return redactedText;
};

/**
 * Get a random fallback message for variety
 */
const getRandomFallbackMessage = (): string => {
  return ALTERNATIVE_FALLBACK_MESSAGES[Math.floor(Math.random() * ALTERNATIVE_FALLBACK_MESSAGES.length)];
};

/**
 * Main voice privacy filter function
 * Determines if audio should be filtered based on content and clearance level
 *
 * @param text - The AI-generated text to potentially filter
 * @param userRole - The user's role/clearance level
 * @param userId - Optional user ID for audit logging
 * @returns The filtered text (either original or fallback message)
 */
export const filterVoiceOutput = (text: string, userRole: UserRole | string, userId?: string): string => {
  // Normalize role if string is passed
  let role: UserRole;
  if (typeof userRole === 'string') {
    const roleMap: Record<string, UserRole> = {
      reception: UserRole.RECEPTION,
      pharmacy: UserRole.PHARMACY,
      clinical: UserRole.CLINICAL,
      doctor: UserRole.DOCTOR,
      admin: UserRole.ADMIN,
    };
    role = roleMap[userRole.toLowerCase()] || UserRole.RECEPTION;
  } else {
    role = userRole;
  }

  const userClearanceLevel = ROLE_LEVELS[role];

  // Doctor and Admin levels (4+) have unrestricted audio output
  if (userClearanceLevel >= ClearanceLevel.DOCTOR) {
    return text;
  }

  // Check if text contains sensitive keywords
  if (containsSensitiveKeywords(text)) {
    console.log(
      `[VoicePrivacyFilter] Sensitive content detected for user ${userId || 'unknown'} with clearance ${role} (level ${userClearanceLevel}). Filtering audio output.`,
    );

    return getRandomFallbackMessage();
  }

  // Text is safe to speak
  return text;
};

/**
 * Generate audio with voice privacy filtering applied
 * This is the main integration point with TTS
 *
 * @param text - The AI-generated text response
 * @param userRole - The user's role/clearance level
 * @param userId - Optional user ID for audit logging
 * @returns Audio buffer (either filtered or original content)
 */
export const generatePrivateAudio = async (
  text: string,
  userRole: UserRole | string,
  userId?: string,
): Promise<Buffer> => {
  try {
    // Apply voice privacy filtering
    const filteredText = filterVoiceOutput(text, userRole, userId);

    // Generate audio from filtered text
    const audioBuffer = await TTSService.speakText(filteredText);

    return audioBuffer;
  } catch (error) {
    console.error('[VoicePrivacyFilter] Error generating private audio:', error);
    throw error;
  }
};

/**
 * Audit log entry for voice privacy filter events
 * Can be used for compliance and security auditing
 */
export interface VoicePrivacyAuditLog {
  timestamp: Date;
  userId?: string;
  userRole: string;
  clearanceLevel: number;
  originalTextLength: number;
  wasFiltered: boolean;
  reason?: string;
  sensitiveKeywordsDetected?: string[];
}

/**
 * Create an audit log entry for voice privacy filter event
 * (This can be integrated with the audit service)
 */
export const createVoicePrivacyAuditLog = (
  text: string,
  userRole: UserRole | string,
  userId?: string,
): VoicePrivacyAuditLog => {
  let role: UserRole;
  if (typeof userRole === 'string') {
    const roleMap: Record<string, UserRole> = {
      reception: UserRole.RECEPTION,
      pharmacy: UserRole.PHARMACY,
      clinical: UserRole.CLINICAL,
      doctor: UserRole.DOCTOR,
      admin: UserRole.ADMIN,
    };
    role = roleMap[userRole.toLowerCase()] || UserRole.RECEPTION;
  } else {
    role = userRole;
  }

  const userClearanceLevel = ROLE_LEVELS[role];
  const hasSensitiveContent = containsSensitiveKeywords(text);
  const willBeFiltered = hasSensitiveContent && userClearanceLevel < ClearanceLevel.DOCTOR;

  // Extract which sensitive keywords were detected
  const detectedKeywords = SENSITIVE_KEYWORDS.filter((keyword) => {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  });

  return {
    timestamp: new Date(),
    userId,
    userRole: role,
    clearanceLevel: userClearanceLevel,
    originalTextLength: text.length,
    wasFiltered: willBeFiltered,
    reason: willBeFiltered ? 'Sensitive content detected for low-clearance user' : undefined,
    sensitiveKeywordsDetected: detectedKeywords.length > 0 ? detectedKeywords : undefined,
  };
};

/**
 * Get statistics about voice privacy filter usage
 * Useful for security and compliance dashboards
 */
export class VoicePrivacyStats {
  private static instance: VoicePrivacyStats;

  private filterEvents: VoicePrivacyAuditLog[] = [];
  private totalAudioRequests = 0;
  private filteredRequests = 0;

  private constructor() {}

  static getInstance(): VoicePrivacyStats {
    if (!VoicePrivacyStats.instance) {
      VoicePrivacyStats.instance = new VoicePrivacyStats();
    }
    return VoicePrivacyStats.instance;
  }

  recordEvent(auditLog: VoicePrivacyAuditLog): void {
    this.filterEvents.push(auditLog);
    this.totalAudioRequests++;
    if (auditLog.wasFiltered) {
      this.filteredRequests++;
    }
  }

  getStats() {
    const filterRate =
      this.totalAudioRequests > 0 ? ((this.filteredRequests / this.totalAudioRequests) * 100).toFixed(2) : '0.00';

    return {
      totalAudioRequests: this.totalAudioRequests,
      filteredRequests: this.filteredRequests,
      filterRate: `${filterRate}%`,
      recentEvents: this.filterEvents.slice(-10),
    };
  }

  clearStats(): void {
    this.filterEvents = [];
    this.totalAudioRequests = 0;
    this.filteredRequests = 0;
  }
}

export default {
  filterVoiceOutput,
  generatePrivateAudio,
  createVoicePrivacyAuditLog,
  VoicePrivacyStats,
  containsSensitiveKeywords,
  redactSensitiveKeywords,
};
