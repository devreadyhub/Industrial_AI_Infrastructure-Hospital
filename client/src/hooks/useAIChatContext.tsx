import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HospitalUpdate, useHospitalUpdates } from './useHospitalUpdates';
import { useToast } from './useToast';

export interface ChatContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AIChatContextType {
  messages: ChatContextMessage[];
  addMessage: (message: ChatContextMessage) => void;
  clearMessages: () => void;
  addSystemNote: (content: string) => void;
  contextSummary: string;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export const AIChatContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatContextMessage[]>([]);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Subscribe to hospital updates
  const handleHospitalUpdate = useCallback(
    (update: HospitalUpdate) => {
      let systemNote = '';

      if (update.eventType === 'LAB_TEST_UPDATED') {
        const { testName, status, patientId, resultDate } = update.data;
        systemNote = `[System Event] Lab test "${testName}" (Patient ID: ${patientId}) status changed to "${status}" at ${resultDate || update.timestamp}`;
      } else if (update.eventType === 'BILLING_RECORD_UPDATED') {
        const { invoiceNumber, paymentStatus, amountDue, patientId } = update.data;
        systemNote = `[System Event] Billing record "${invoiceNumber}" (Patient ID: ${patientId}) payment status changed to "${paymentStatus}". Amount due: ${amountDue}`;
      } else if (update.eventType === 'PATIENT_ADMITTED') {
        const { patientName, ward } = update.data || {};
        systemNote = `[System Event] New admission: ${patientName} admitted to ${ward}`;
        // Invalidate clinical query so Recent Admissions refresh
        try {
          queryClient.invalidateQueries({ queryKey: ['clinical'] });
        } catch (e) {
          console.warn('Failed to invalidate clinical query on patient admitted', e);
        }
        // Show a small toast to the user for quick visibility
        try {
          addToast({ message: `New admission: ${patientName} → ${ward}`, type: 'info', duration: 6000 });
        } catch (e) {
          // best-effort
        }
      }

      if (systemNote) {
        addSystemNote(systemNote);
      }
    },
    [queryClient],
  );

  useHospitalUpdates({
    enabled: true,
    onUpdate: handleHospitalUpdate,
    autoJoinUpdates: true,
  });

  const addMessage = useCallback((message: ChatContextMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const addSystemNote = useCallback((content: string) => {
    const systemMessage: ChatContextMessage = {
      role: 'system',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, systemMessage]);
  }, []);

  // Generate context summary from recent messages (last 10)
  const contextSummary = messages
    .slice(-10)
    .map((msg) => `[${msg.role.toUpperCase()}]: ${msg.content}`)
    .join('\n');

  const value: AIChatContextType = {
    messages,
    addMessage,
    clearMessages,
    addSystemNote,
    contextSummary,
  };

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
};

export const useAIChatContext = (): AIChatContextType => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChatContext must be used within AIChatContextProvider');
  }
  return context;
};
