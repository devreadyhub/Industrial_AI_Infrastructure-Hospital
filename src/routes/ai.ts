import { Router } from 'express';
import multer from 'multer';
import {
  handleSqlQuery,
  handleAgentQuery,
  handleChatQuery,
  handleRefreshVectorStore,
  handleTranscription,
  handleTTS,
  handleOllamaHealth,
} from '../controllers/aiController';
import { auditAIInteractionMiddleware } from '../middleware/auditMiddleware';
import { authenticateAIUser, protectRoute } from '../middleware/authMiddleware';
import { applyRBAC, checkClearance, UserRole } from '../middleware/rbacMiddleware';
import { VoicePrivacyStats } from '../services/voicePrivacyFilterService';

const router = Router();

// Configure multer for audio file uploads
const upload = multer({
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Apply authentication and audit middleware to all AI routes
router.use(authenticateAIUser);
router.use(protectRoute(0)); // Allow all authenticated users (clearanceLevel >= 0)
router.use(auditAIInteractionMiddleware);

router.post('/sql-query', handleSqlQuery);
router.post('/agent-query', handleAgentQuery);
router.post('/chat', handleChatQuery);
router.get('/ollama-health', handleOllamaHealth);
router.post('/refresh-vector-store', handleRefreshVectorStore);
router.post('/transcribe', upload.single('audio'), handleTranscription);
router.post('/tts', handleTTS);

// Voice Privacy Filter Monitoring Route
// Only accessible to Admin and Doctor roles
router.get(
  '/voice-privacy-stats',
  applyRBAC,
  checkClearance(UserRole.DOCTOR),
  (req, res) => {
    try {
      const stats = VoicePrivacyStats.getInstance().getStats();
      return res.json({
        success: true,
        voicePrivacyMetrics: stats,
        message: 'Voice privacy filter statistics retrieved successfully',
      });
    } catch (error) {
      console.error('Error retrieving voice privacy stats:', error);
      return res.status(500).json({
        message: 'Failed to retrieve voice privacy statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

export default router;
