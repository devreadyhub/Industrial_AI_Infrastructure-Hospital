// Voice Privacy Filter - Integration Examples and Usage Guide
// File: src/services/voicePrivacyFilterService.example.ts

/**
 * EXAMPLE 1: Basic Filtering
 * Shows how the voice privacy filter works with different clearance levels
 */
export const example1_basicFiltering = () => {
  const { filterVoiceOutput, UserRole } = require('./voicePrivacyFilterService');

  // Scenario: AI response about a patient's HIV diagnosis
  const aiResponse = `Patient test results show positive for HIV. Antiretroviral therapy is recommended.`;

  // Reception staff (Level 1) - FILTERED
  const receptionOutput = filterVoiceOutput(aiResponse, UserRole.RECEPTION, 'reception-001');
  console.log('Reception hears:', receptionOutput);
  // Output: "Detailed sensitive information has been moved to your secure screen for privacy."

  // Clinical staff (Level 3) - FILTERED
  const clinicalOutput = filterVoiceOutput(aiResponse, UserRole.CLINICAL, 'nurse-001');
  console.log('Nurse hears:', clinicalOutput);
  // Output: Privacy fallback message

  // Doctor (Level 4) - NOT FILTERED
  const doctorOutput = filterVoiceOutput(aiResponse, UserRole.DOCTOR, 'doc-001');
  console.log('Doctor hears:', doctorOutput);
  // Output: "Patient test results show positive for HIV. Antiretroviral therapy is recommended."

  // Admin (Level 5) - NOT FILTERED
  const adminOutput = filterVoiceOutput(aiResponse, UserRole.ADMIN, 'admin-001');
  console.log('Admin hears:', adminOutput);
  // Output: Full response
};

/**
 * EXAMPLE 2: Integration with TTS Controller
 * Shows how the privacy filter is integrated in the TTS endpoint
 */
export const example2_ttsIntegration = async () => {
  const { generatePrivateAudio, createVoicePrivacyAuditLog, VoicePrivacyStats } = require(
    './voicePrivacyFilterService',
  );

  // Simulated TTS endpoint handler
  const handleTTS = async (req: any, res: any) => {
    try {
      const { text } = req.body;
      const userRole = req.user?.role ?? 'visitor';
      const userId = req.user?.staffId;

      // Generate audio with privacy filtering
      const audioBuffer = await generatePrivateAudio(text, userRole, userId);

      // Create and record audit log
      const auditLog = createVoicePrivacyAuditLog(text, userRole, userId);
      VoicePrivacyStats.getInstance().recordEvent(auditLog);

      // If content was filtered, log it
      if (auditLog.wasFiltered) {
        console.log(`🔒 Privacy Filter Activated`);
        console.log(`   User: ${userId}`);
        console.log(`   Role: ${userRole}`);
        console.log(`   Sensitive Keywords: ${auditLog.sensitiveKeywordsDetected?.join(', ')}`);
      }

      // Return audio
      res.set({ 'Content-Type': 'audio/wav', 'Content-Length': audioBuffer.length });
      return res.send(audioBuffer);
    } catch (error) {
      console.error('TTS error:', error);
      return res.status(500).json({ message: 'Failed to generate speech' });
    }
  };
};

/**
 * EXAMPLE 3: Monitoring Voice Privacy Statistics
 * Shows how to access and display privacy filter metrics
 */
export const example3_monitoringStats = () => {
  const { VoicePrivacyStats } = require('./voicePrivacyFilterService');

  // After some TTS requests have been made...
  const stats = VoicePrivacyStats.getInstance().getStats();

  console.log('===== Voice Privacy Filter Statistics =====');
  console.log(`Total Audio Requests: ${stats.totalAudioRequests}`);
  console.log(`Filtered Requests: ${stats.filteredRequests}`);
  console.log(`Filter Rate: ${stats.filterRate}`);

  console.log('\n--- Recent Privacy Filter Events ---');
  stats.recentEvents.forEach((event: any, index: number) => {
    console.log(`${index + 1}. [${event.timestamp.toISOString()}]`);
    console.log(`   User: ${event.userId} (${event.userRole} - Level ${event.clearanceLevel})`);
    console.log(`   Filtered: ${event.wasFiltered ? '✓ YES' : '✗ NO'}`);
    if (event.sensitiveKeywordsDetected?.length) {
      console.log(`   Keywords: ${event.sensitiveKeywordsDetected.join(', ')}`);
    }
  });
};

/**
 * EXAMPLE 4: Detecting Sensitive Content
 * Shows how to identify if text contains sensitive keywords
 */
export const example4_detectSensitiveContent = () => {
  const { containsSensitiveKeywords, redactSensitiveKeywords } = require('./voicePrivacyFilterService');

  const testCases = [
    'Patient is recovering well from surgery',
    'HIV test results came back negative',
    'Patient has terminal cancer and requires palliative care',
    'Blood pressure reading is 120/80',
    'Antibiotic resistant MRSA infection detected',
  ];

  testCases.forEach((text) => {
    const isSensitive = containsSensitiveKeywords(text);
    console.log(`"${text}"`);
    console.log(`  Sensitive: ${isSensitive ? '⚠️  YES' : '✓ SAFE'}`);

    if (isSensitive) {
      const redacted = redactSensitiveKeywords(text);
      console.log(`  Redacted: "${redacted}"`);
    }
    console.log();
  });
};

/**
 * EXAMPLE 5: Audit Logging Integration
 * Shows how to create and use audit logs for compliance
 */
export const example5_auditLogging = () => {
  const { createVoicePrivacyAuditLog, VoicePrivacyStats } = require('./voicePrivacyFilterService');

  const aiResponse = 'Patient is scheduled for bypass surgery due to high cardiac debt and diabetes complications';

  // Create audit entry
  const auditLog = createVoicePrivacyAuditLog(aiResponse, 'pharmacy', 'user-pharmacy-001');

  console.log('===== Voice Privacy Audit Log Entry =====');
  console.log(`Timestamp: ${auditLog.timestamp.toISOString()}`);
  console.log(`User ID: ${auditLog.userId}`);
  console.log(`User Role: ${auditLog.userRole}`);
  console.log(`Clearance Level: ${auditLog.clearanceLevel}`);
  console.log(`Original Text Length: ${auditLog.originalTextLength} characters`);
  console.log(`Was Filtered: ${auditLog.wasFiltered ? '✓ YES' : '✗ NO'}`);
  if (auditLog.reason) {
    console.log(`Reason: ${auditLog.reason}`);
  }
  if (auditLog.sensitiveKeywordsDetected?.length) {
    console.log(`Detected Keywords: ${auditLog.sensitiveKeywordsDetected.join(', ')}`);
  }

  // Record to stats
  VoicePrivacyStats.getInstance().recordEvent(auditLog);

  // Use stats for compliance reporting
  const stats = VoicePrivacyStats.getInstance().getStats();
  console.log(`\nCompliance Report: ${stats.filterRate} of all audio was privacy-filtered`);
};

/**
 * EXAMPLE 6: Custom Role-Based Handling
 * Shows how to implement custom filtering logic based on roles
 */
export const example6_customRoleHandling = () => {
  const { filterVoiceOutput, UserRole, ClearanceLevel } = require('./voicePrivacyFilterService');

  const hospitalScenarios = [
    {
      user: 'John (Reception)',
      role: UserRole.RECEPTION,
      query: 'Show me patients with HIV or AIDS',
      context: 'Visitor management system',
    },
    {
      user: 'Sarah (Pharmacy)',
      role: UserRole.PHARMACY,
      query: 'List controlled substances inventory',
      context: 'Pharmacy stock check',
    },
    {
      user: 'Dr. Chen (Doctor)',
      role: UserRole.DOCTOR,
      query: 'Which patients have cancer diagnoses?',
      context: 'Clinical review',
    },
  ];

  hospitalScenarios.forEach((scenario) => {
    console.log(`\n${scenario.user} at ${scenario.context}`);
    console.log(`Query: "${scenario.query}"`);

    const response = `Here are all patients matching criteria: [sensitive patient data]`;
    const filtered = filterVoiceOutput(response, scenario.role);

    if (filtered.includes('secure screen')) {
      console.log('🔐 Result: FILTERED - Privacy protection activated');
    } else {
      console.log('✓ Result: ALLOWED - User has sufficient clearance');
    }
  });
};

/**
 * EXAMPLE 7: Real-World Hospital Scenario
 * Complete end-to-end example of AI response filtering
 */
export const example7_realWorldScenario = async () => {
  const { generatePrivateAudio, createVoicePrivacyAuditLog, VoicePrivacyStats } = require(
    './voicePrivacyFilterService',
  );

  console.log('===== Hospital AI Privacy Filter - Real World Scenario =====\n');

  // Scenario: Multiple users querying about the same patient
  const patientSummary = `
    Patient ID: P-12345
    Diagnosis: Advanced pancreatic cancer with metastasis
    Treatment: Palliative chemotherapy
    Prognosis: Terminal
    Financial Status: Medical debt exceeding $250,000
    Next Review: Hospice consultation for end-of-life planning
  `;

  const users = [
    { name: 'Maria', role: 'RECEPTION', id: 'reception-001' },
    { name: 'James', role: 'CLINICAL', id: 'nurse-001' },
    { name: 'Dr. Patel', role: 'DOCTOR', id: 'doctor-001' },
  ];

  for (const user of users) {
    console.log(`\n--- ${user.name} (${user.role}) ---`);

    // Simulate TTS request
    try {
      const audioBuffer = await generatePrivateAudio(patientSummary, user.role, user.id);
      const auditLog = createVoicePrivacyAuditLog(patientSummary, user.role, user.id);

      VoicePrivacyStats.getInstance().recordEvent(auditLog);

      console.log(`Status: ${auditLog.wasFiltered ? '🔒 FILTERED' : '✓ ALLOWED'}`);
      console.log(`Audio Generated: ${audioBuffer.length} bytes`);

      if (auditLog.sensitiveKeywordsDetected?.length) {
        console.log(`Keywords Detected: ${auditLog.sensitiveKeywordsDetected.join(', ')}`);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }

  // Print overall statistics
  const stats = VoicePrivacyStats.getInstance().getStats();
  console.log(`\n===== Session Summary =====`);
  console.log(`Total Requests: ${stats.totalAudioRequests}`);
  console.log(`Filtered: ${stats.filteredRequests}`);
  console.log(`Filter Rate: ${stats.filterRate}`);
};

/**
 * EXAMPLE 8: API Endpoint Usage
 * Shows how to call the voice privacy monitoring endpoint
 */
export const example8_apiEndpointUsage = async () => {
  // GET /api/ai/voice-privacy-stats endpoint

  const exampleRequest = {
    method: 'GET',
    url: 'http://localhost:3000/api/ai/voice-privacy-stats',
    headers: {
      Authorization: 'Bearer <doctor-token>', // Requires DOCTOR clearance level (4+)
      'Content-Type': 'application/json',
    },
  };

  const exampleResponse = {
    success: true,
    voicePrivacyMetrics: {
      totalAudioRequests: 412,
      filteredRequests: 67,
      filterRate: '16.26%',
      recentEvents: [
        {
          timestamp: '2026-05-10T14:32:15.000Z',
          userId: 'reception-001',
          userRole: 'RECEPTION',
          clearanceLevel: 1,
          originalTextLength: 156,
          wasFiltered: true,
          reason: 'Sensitive content detected for low-clearance user',
          sensitiveKeywordsDetected: ['HIV', 'AIDS', 'positive test'],
        },
        // ... more events
      ],
    },
    message: 'Voice privacy filter statistics retrieved successfully',
  };

  console.log('Example API Call:');
  console.log(JSON.stringify(exampleRequest, null, 2));
  console.log('\nExample Response:');
  console.log(JSON.stringify(exampleResponse, null, 2));
};

/**
 * EXAMPLE 9: Testing Sensitive Keywords
 * Reference list of keywords that trigger privacy filtering
 */
export const example9_sensitiveKeywordsReference = () => {
  const keywords = {
    'Medical Conditions': [
      'cancer',
      'tumor',
      'hiv',
      'aids',
      'diabetes',
      'psychiatric',
      'addiction',
    ],
    'Surgical Procedures': ['surgery', 'transplant', 'amputation', 'chemotherapy', 'dialysis'],
    'Financial Terms': ['debt', 'bankruptcy', 'medical debt', 'collection'],
    'Lab Results': ['positive test', 'abnormal', 'viral load', 'pathogen'],
    'Genetic Information': ['genetic mutation', 'hereditary', 'gene therapy'],
    'End of Life': ['terminal', 'hospice', 'dnr', 'palliative'],
  };

  console.log('===== Sensitive Keywords Reference =====\n');
  Object.entries(keywords).forEach(([category, terms]) => {
    console.log(`${category}:`);
    terms.forEach((term) => {
      console.log(`  • ${term}`);
    });
    console.log();
  });
};

/**
 * EXAMPLE 10: Error Handling and Edge Cases
 * Shows how to handle edge cases gracefully
 */
export const example10_errorHandling = async () => {
  const { filterVoiceOutput, generatePrivateAudio } = require('./voicePrivacyFilterService');

  const edgeCases = [
    {
      name: 'Empty text',
      text: '',
      role: 'RECEPTION',
    },
    {
      name: 'Very long text',
      text: 'Patient vitals... '.repeat(1000),
      role: 'CLINICAL',
    },
    {
      name: 'Special characters',
      text: 'Patient: COVID-19 (variant: Alpha) @Hospital $500 debt #urgent',
      role: 'RECEPTION',
    },
    {
      name: 'Mixed case keywords',
      text: 'CANCER screening, HiV test, SuRgErY scheduled',
      role: 'RECEPTION',
    },
  ];

  console.log('===== Edge Case Handling =====\n');

  for (const testCase of edgeCases) {
    try {
      console.log(`Test: ${testCase.name}`);
      const result = filterVoiceOutput(testCase.text, testCase.role);
      console.log(`✓ Handled: ${result.substring(0, 50)}...`);
    } catch (error) {
      console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log();
  }
};

/**
 * SETUP INSTRUCTIONS FOR TESTING
 *
 * 1. Start the server:
 *    npm run dev
 *
 * 2. Test TTS with privacy filtering:
 *    curl -X POST http://localhost:3000/api/ai/tts \
 *      -H "Authorization: Bearer <token>" \
 *      -H "Content-Type: application/json" \
 *      -d '{"text": "Patient diagnosed with cancer"}'
 *
 * 3. Check privacy statistics:
 *    curl -X GET http://localhost:3000/api/ai/voice-privacy-stats \
 *      -H "Authorization: Bearer <doctor-token>"
 *
 * 4. Run these examples:
 *    Run each exported function to see it in action
 */
