# Voice Privacy Filter Service

## Overview

The Voice Privacy Filter Service (`voicePrivacyFilterService.ts`) is a security layer that protects sensitive healthcare information from being spoken aloud by the hospital AI system's Text-to-Speech engine.

### Key Features

- **Role-Based Audio Filtering**: Filters sensitive content based on user clearance levels
- **Comprehensive Keyword Matching**: Detects 50+ sensitive healthcare keywords
- **Smart Fallback Messages**: Replaces filtered content with privacy-safe messages
- **Audit Logging**: Records all filtering events for compliance and security monitoring
- **Performance Stats**: Tracks filtering statistics for security dashboards
- **Flexible Integration**: Works seamlessly with existing TTS service

---

## Architecture

```
User Request (Text + Clearance Level)
        ↓
    Voice Privacy Filter
        ↓
  Is content sensitive? AND User clearance < DOCTOR?
        ↓                         ↓
     YES                        NO
        ↓                         ↓
  Replace with          Keep original text
  Fallback message             ↓
        ↓                    TTS Service
        ↓                        ↓
        └─────────────┬──────────┘
                      ↓
               Generate Audio
                      ↓
               Return to User
```

---

## Clearance Levels

The service uses the hospital's RBAC clearance system:

| Level | Role | Audio Filtering |
|-------|------|-----------------|
| 1 | RECEPTION | YES - Filtered |
| 2 | PHARMACY | YES - Filtered |
| 3 | CLINICAL | YES - Filtered |
| 4 | DOCTOR | NO - Unrestricted |
| 5 | ADMIN | NO - Unrestricted |

**Threshold**: Clearance level < 4 (Doctor) triggers filtering

---

## Sensitive Keywords

The service monitors for 50+ keywords across multiple healthcare categories:

### Medical Conditions
- Cancer, Tumor, Malignant, HIV, AIDS, Diabetes
- Psychiatric conditions: Depression, Anxiety, Bipolar, Schizophrenia
- Substance abuse, Addiction, Overdose
- STI/STD, Sexual health conditions
- Mental health and addiction-related terms

### Surgical Procedures
- Surgery, Transplant, Amputation, Mastectomy, Hysterectomy
- Chemotherapy, Radiotherapy, Dialysis

### Financial Hardship
- Debt, Unpaid Bills, Bankruptcy, Medical Debt
- Insurance Denial, Collection, Eviction

### Lab Results
- Positive Test, Abnormal Result, Viral Load
- Pathogen, Antibiotic Resistant (MRSA, C. difficile)

### Genetic Information
- Genetic Mutation, Hereditary Disorder, Gene Therapy
- DNA Testing

### End of Life
- Terminal, Palliative Care, Hospice, DNR
- Assisted Dying

---

## Fallback Messages

When filtering is triggered, the system uses one of these privacy-safe messages:

1. "Detailed sensitive information has been moved to your secure screen for privacy."
2. "For your privacy, this sensitive medical information is displayed on your screen only."
3. "Your private health information is displayed securely on your device screen."
4. "Sensitive details have been protected and are available only on your screen for your privacy."

*Messages are randomly rotated to provide variety.*

---

## API Reference

### `filterVoiceOutput(text, userRole, userId?): string`

Core filtering function that determines if audio should be filtered.

**Parameters:**
- `text` (string): AI-generated response
- `userRole` (UserRole | string): User's role/clearance
- `userId` (string, optional): User ID for audit logging

**Returns:** Original text or fallback message

**Example:**
```typescript
const filtered = filterVoiceOutput(
  "The patient shows signs of cancer based on lab results.",
  UserRole.CLINICAL,
  "user-123"
);
// Returns: "Detailed sensitive information has been moved to your secure screen for privacy."
```

---

### `generatePrivateAudio(text, userRole, userId?): Promise<Buffer>`

Main integration point with TTS. Filters text and generates audio.

**Parameters:**
- `text` (string): AI-generated response
- `userRole` (UserRole | string): User's role/clearance
- `userId` (string, optional): User ID for audit logging

**Returns:** Audio buffer (WAV format)

**Example:**
```typescript
const audioBuffer = await generatePrivateAudio(
  "Patient vitals are stable.",
  UserRole.RECEPTION,
  "user-456"
);
// Returns audio buffer of filtered/safe text
```

---

### `createVoicePrivacyAuditLog(text, userRole, userId?): VoicePrivacyAuditLog`

Creates an audit record of the filtering event.

**Returns:**
```typescript
{
  timestamp: Date;
  userId?: string;
  userRole: string;
  clearanceLevel: number;
  originalTextLength: number;
  wasFiltered: boolean;
  reason?: string;
  sensitiveKeywordsDetected?: string[];
}
```

---

### `VoicePrivacyStats.getInstance().getStats(): StatsObject`

Retrieves aggregated statistics about voice privacy filtering.

**Returns:**
```typescript
{
  totalAudioRequests: number;     // Total TTS requests processed
  filteredRequests: number;       // Number of requests filtered
  filterRate: string;             // Percentage (e.g., "23.45%")
  recentEvents: VoicePrivacyAuditLog[]; // Last 10 filtering events
}
```

**Example:**
```typescript
const stats = VoicePrivacyStats.getInstance().getStats();
console.log(`${stats.filterRate} of audio outputs were privacy-filtered`);
```

---

## Integration Points

### 1. TTS Controller (aiController.ts)

The `handleTTS` function now uses the privacy filter:

```typescript
export const handleTTS = async (req: AuthenticatedRequest, res: Response) => {
  const { text } = req.body;
  const userRole = req.user?.role ?? 'visitor';

  // Generate audio with privacy filtering
  const audioBuffer = await generatePrivateAudio(text, userRole, req.user?.id);

  // Record audit event
  const auditLog = createVoicePrivacyAuditLog(text, userRole, req.user?.id);
  VoicePrivacyStats.getInstance().recordEvent(auditLog);

  // Return audio
  res.set({ 'Content-Type': 'audio/wav' });
  return res.send(audioBuffer);
};
```

### 2. AI Routes (ai.ts)

New endpoint to monitor voice privacy statistics:

```typescript
GET /api/ai/voice-privacy-stats
```

**Requires:**
- Authentication
- Clearance level ≥ DOCTOR (level 4)

**Response:**
```json
{
  "success": true,
  "voicePrivacyMetrics": {
    "totalAudioRequests": 156,
    "filteredRequests": 23,
    "filterRate": "14.74%",
    "recentEvents": [...]
  }
}
```

---

## Usage Examples

### Example 1: Reception Staff Query

```
User: Reception Staff (Clearance Level 1)
Request: Generate audio for "Patient has tested positive for HIV"

Result: 
- Sensitive keywords detected: ["hiv"]
- User clearance (1) < Doctor threshold (4)
- ACTION: Filter audio
- Audio plays: "Detailed sensitive information has been moved to your secure screen for privacy."
```

### Example 2: Clinical Staff Query

```
User: Nurse (Clearance Level 3)
Request: Generate audio for "Patient vitals stable: BP 120/80, HR 72"

Result:
- No sensitive keywords detected
- ACTION: Allow audio
- Audio plays: "Patient vitals stable: BP 120/80, HR 72"
```

### Example 3: Doctor Query

```
User: Doctor (Clearance Level 4)
Request: Generate audio for "Patient diagnosed with diabetes, requires insulin therapy"

Result:
- Sensitive keywords detected: ["diabetes", "insulin"]
- User clearance (4) ≥ Doctor threshold (4)
- ACTION: Allow audio (no filtering)
- Audio plays: Full medical information
```

---

## Compliance & Audit

### HIPAA Compliance

The voice privacy filter helps meet HIPAA requirements by:
- **Minimum Necessary**: Restricting sensitive information to authorized personnel
- **Access Controls**: Enforcing role-based audio restrictions
- **Audit Trail**: Logging all privacy-related events

### Security Event Log

All filtering events are logged with:
- Timestamp
- User ID
- User role and clearance level
- Whether content was filtered
- Sensitive keywords detected

### Monitoring Dashboard

Access voice privacy statistics via:

```bash
curl -X GET http://localhost:3000/api/ai/voice-privacy-stats \
  -H "Authorization: Bearer <token>"
```

---

## Configuration

### Adding New Sensitive Keywords

Edit `voicePrivacyFilterService.ts` in the `SENSITIVE_KEYWORDS` array:

```typescript
const SENSITIVE_KEYWORDS = [
  // ... existing keywords
  'new_sensitive_term',
];
```

### Modifying Fallback Messages

Edit `ALTERNATIVE_FALLBACK_MESSAGES` in `voicePrivacyFilterService.ts`:

```typescript
const ALTERNATIVE_FALLBACK_MESSAGES = [
  'Your custom fallback message 1',
  'Your custom fallback message 2',
];
```

### Adjusting Clearance Threshold

Change the `ClearanceLevel.DOCTOR` constant (default: 4) to modify the filtering threshold.

---

## Performance Considerations

- **Keyword Matching**: O(n*m) where n = keywords, m = text length
  - Uses regex with word boundaries for accuracy
  - Minimal performance impact for typical hospital AI queries
- **Audio Generation**: Filtered text is same length, no encoding penalty
- **Memory**: Audit logs stored in memory (configurable retention)

---

## Troubleshooting

### Issue: Legitimate medical terms being filtered

**Solution**: Review sensitive keywords list, consider word-boundary precision or create exceptions based on context.

### Issue: High false-positive rate

**Solution**: Add more specific keyword patterns or implement context-aware filtering (future enhancement).

### Issue: Stats not updating

**Solution**: Ensure `VoicePrivacyStats.recordEvent()` is called in TTS handler.

---

## Future Enhancements

1. **Context-Aware Filtering**: Different sensitivity based on conversation context
2. **Custom Role Policies**: Per-role or per-department filtering rules
3. **Machine Learning**: Pattern detection for indirect sensitive references
4. **Redaction Levels**: Partial vs. full redaction based on clearance gaps
5. **Multi-Language Support**: Keyword detection in multiple languages
6. **Real-Time Dashboard**: Live monitoring of privacy filter events

---

## Testing

### Manual Testing

```bash
# Test with high-clearance user (Doctor)
curl -X POST http://localhost:3000/api/ai/tts \
  -H "Authorization: Bearer <doctor-token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Patient diagnosed with cancer"}'
# Result: Full text is spoken

# Test with low-clearance user (Reception)
curl -X POST http://localhost:3000/api/ai/tts \
  -H "Authorization: Bearer <reception-token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Patient diagnosed with cancer"}'
# Result: Fallback message is spoken
```

### Unit Tests (Recommended)

```typescript
import { filterVoiceOutput, UserRole } from '../services/voicePrivacyFilterService';

test('should filter cancer keyword for reception staff', () => {
  const result = filterVoiceOutput('Patient has cancer', UserRole.RECEPTION);
  expect(result).toContain('secure screen');
});

test('should not filter for doctor', () => {
  const result = filterVoiceOutput('Patient has cancer', UserRole.DOCTOR);
  expect(result).toBe('Patient has cancer');
});
```

---

## Support & Maintenance

For questions or issues:
1. Check the Troubleshooting section
2. Review audit logs for filter events
3. Test with `voice-privacy-stats` endpoint
4. Consult hospital AI documentation

---

**Last Updated:** May 10, 2026  
**Version:** 1.0  
**Status:** Production Ready
