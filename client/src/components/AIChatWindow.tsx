import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAIChatContext } from '../hooks/useAIChatContext';
import { useHospitalUpdates } from '../hooks/useHospitalUpdates';
import { VoiceController, speakText } from './VoiceController';
import { AIChatLogin } from './AIChatLogin';
import { authFetch } from '../utils/api';
import { getAIApiUrl, getBackendUrl } from '../utils/backend';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

interface ChatResponsePayload {
  answer?: string;
  message?: string;
  error?: string;
}

export const AIChatWindow: React.FC = () => {
  const { messages, addMessage, contextSummary } = useAIChatContext();
  const { isConnected, latestUpdate } = useHospitalUpdates();
  const { user, isAuthenticated: authIsAuthenticated, logout } = useAuth();
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatConnected, setChatConnected] = useState(false);
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [ollamaHealth, setOllamaHealth] = useState<{
    available: boolean;
    baseUrl?: string;
    model?: string;
    forceOffline?: boolean;
    circuitOpen?: boolean;
  } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Setup socket connection only when authenticated
  useEffect(() => {
    if (!authIsAuthenticated) return;

    const backendUrl = getBackendUrl();
    setBackendUrl(backendUrl);
    const userRole = user?.role || localStorage.getItem('userRole') || 'staff';
    const rawUserId = user?.staffId ?? user?.id ?? localStorage.getItem('userId') ?? '';
    const userId = String(rawUserId);
    const token = localStorage.getItem('authToken');

    socketRef.current = io(backendUrl, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      auth: {
        userRole,
        userId,
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    socketRef.current.on('connect', () => {
      setChatConnected(true);
      setAiError(null);
      console.debug('[Socket.io] AI chat connected');
    });

    socketRef.current.on('connect_error', (error) => {
      setChatConnected(false);
      console.error('Socket failed to connect:', error);
      if (error instanceof Error) {
        setAiError(`Chat socket connection failed: ${error.message}`);
      }
    });

    socketRef.current.on('connect_timeout', () => {
      setChatConnected(false);
      console.warn('Socket connection timed out.');
    });

    socketRef.current.on('reconnect_attempt', (attempt) => {
      console.debug(`[Socket.io] reconnect attempt ${attempt}`);
    });

    socketRef.current.on('reconnect_error', (error) => {
      console.warn('Socket reconnect error:', error);
    });

    socketRef.current.on('reconnect', (attempt) => {
      console.debug(`[Socket.io] reconnected after ${attempt} attempt(s)`);
      setChatConnected(true);
    });

    socketRef.current.on('reconnect_failed', () => {
      setChatConnected(false);
      console.warn('Socket reconnect failed.');
    });

    socketRef.current.on('disconnect', () => {
      setChatConnected(false);
    });

    socketRef.current.on('chat-response', async (payload: ChatResponsePayload) => {
      const answer = payload.answer || payload.message || 'No answer received.';
      addMessage({
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
      });
      setIsLoading(false);
      try {
        await speakText(answer);
      } catch (speakError) {
        console.warn('Speech synthesis failed for socket response:', speakError);
      }
    });

    socketRef.current.on('chat-error', (payload: ChatResponsePayload) => {
      addMessage({
        role: 'assistant',
        content: `Error: ${payload.error || payload.message || 'Unknown chat failure.'}`,
        timestamp: new Date().toISOString(),
      });
      setIsLoading(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [authIsAuthenticated, addMessage]);

  const checkOllamaHealth = useCallback(async (backendUrl: string) => {
    try {
      const response = await authFetch(`${backendUrl}/api/ai/ollama-health`);
      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (response.ok && data?.status) {
        setOllamaHealth({
          available: data.status.available,
          baseUrl: data.status.baseUrl,
          model: data.status.model,
          forceOffline: data.status.forceOffline,
          circuitOpen: data.status.circuitOpen,
        });
      } else {
        setOllamaHealth({
          available: false,
          baseUrl: data?.status?.baseUrl || backendUrl,
          model: data?.status?.model,
        });
      }
    } catch (error) {
      setOllamaHealth({
        available: false,
        baseUrl: backendUrl,
        model: undefined,
      });
      console.warn('Ollama health check failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!authIsAuthenticated || !backendUrl) {
      return;
    }

    void checkOllamaHealth(backendUrl);
    const interval = window.setInterval(() => void checkOllamaHealth(backendUrl), 30000);
    return () => window.clearInterval(interval);
  }, [backendUrl, authIsAuthenticated, checkOllamaHealth]);

  const handleLoginSuccess = (_token: string, loggedInUser: any) => {
    setAiError(null);
    addMessage({
      role: 'system',
      content: `Welcome ${loggedInUser.name}! You are now connected as a ${loggedInUser.role}. Ask away!`,
      timestamp: new Date().toISOString(),
    });
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('aiChatUser');
    setChatConnected(false);
    socketRef.current?.disconnect();
  };

  const reconnectChat = useCallback(() => {
    if (socketRef.current) {
      setAiError('Attempting to reconnect chat socket...');
      socketRef.current.connect();
    } else {
      setAiError('Chat socket is not initialized yet. Please refresh or log out and log back in.');
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setAiError(null);
    addMessage({
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    if (chatConnected && socketRef.current?.connected) {
      socketRef.current.emit('chat-message', {
        question: userInput,
        context: contextSummary,
      });
      setUserInput('');
      return;
    }

    try {
      const response = await authFetch(getAIApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'x-user-role': user?.role || localStorage.getItem('userRole') || 'staff',
          'x-user-id': String(user?.staffId ?? user?.id ?? localStorage.getItem('userId') ?? ''),
        },
        body: JSON.stringify({
          question: userInput,
          context: contextSummary,
        }),
      });

      const responseText = await response.text();
      let data: ChatResponsePayload | null = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }

      if (response.ok) {
        const answer = data?.answer || data?.message || 'No answer was returned from the AI service.';
        setAiError(null);
        addMessage({ role: 'assistant', content: answer, timestamp: new Date().toISOString() });
        try {
          await speakText(answer);
        } catch (speakError) {
          console.warn('Speech synthesis failed for HTTP response:', speakError);
        }
      } else {
        const errorMessage = data?.message || data?.error || response.statusText || 'Failed to get response';
        setAiError(errorMessage);
        addMessage({ role: 'assistant', content: `Error: ${errorMessage}`, timestamp: new Date().toISOString() });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setAiError(errMsg);
      addMessage({ role: 'assistant', content: `Error: ${errMsg}`, timestamp: new Date().toISOString() });
    } finally {
      setIsLoading(false);
      setUserInput('');
    }
  };

  const handleTranscription = useCallback(async (transcribedText: string) => {
    // Add transcribed text as user message
    addMessage({
      role: 'user',
      content: transcribedText,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    if (chatConnected && socketRef.current?.connected) {
      socketRef.current.emit('chat-message', {
        question: transcribedText,
        context: contextSummary,
      });
      return;
    }

    try {
      const response = await authFetch(getAIApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'x-user-role': user?.role || localStorage.getItem('userRole') || 'staff',
          'x-user-id': String(user?.staffId ?? user?.id ?? localStorage.getItem('userId') ?? ''),
        },
        body: JSON.stringify({ question: transcribedText, context: contextSummary }),
      });

      const responseText = await response.text();
      let data: ChatResponsePayload | null = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }

      if (response.ok) {
        const answer = data?.answer || data?.message || 'No answer was returned from the AI service.';
        addMessage({ role: 'assistant', content: answer, timestamp: new Date().toISOString() });
        try {
          await speakText(answer);
        } catch (speakError) {
          console.warn('TTS failed:', speakError);
        }
      } else {
        addMessage({ role: 'assistant', content: `Error: ${data?.message || data?.error || response.statusText || 'Failed to get response'}`, timestamp: new Date().toISOString() });
      }
    } catch (error) {
      addMessage({ role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, timestamp: new Date().toISOString() });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, chatConnected, contextSummary]);

  const handleVoiceError = useCallback((error: string) => {
    addMessage({
      role: 'system',
      content: `Voice Error: ${error}`,
      timestamp: new Date().toISOString(),
    });
  }, [addMessage]);

  // Show login screen if not authenticated
  if (!authIsAuthenticated) {
    return (
      <div className="flex h-full flex-col bg-gray-100 p-4 items-center justify-center">
        <AIChatLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-100 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hospital AI Assistant</h1>
          <p className="text-sm text-gray-600">Real-time chat connected to local Ollama and the hospital database.</p>
          {user && (
            <p className="text-xs text-gray-500 mt-1">
              Logged in as: <span className="font-semibold">{user.name}</span> ({user.role})
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="space-y-1 text-right text-xs text-gray-600">
            <div>
              Chat socket: <span className={chatConnected ? 'text-green-600' : 'text-red-600'}>{chatConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div>
              Backend URL: <span className="font-mono text-indigo-700">{backendUrl || 'unknown'}</span>
            </div>
            <div>
              Ollama: <span className={ollamaHealth?.available ? 'text-green-600' : 'text-red-600'}>{ollamaHealth ? (ollamaHealth.available ? `Available (${ollamaHealth.model || 'model'})` : `Unavailable at ${ollamaHealth.baseUrl || 'unknown'}`) : 'Checking...'}</span>
            </div>
            <div>
              Updates: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {(aiError || !chatConnected || (ollamaHealth && !ollamaHealth.available)) && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4  text-sm text-red-900">
          <p className="font-semibold">AI service warning</p>
          <p>
            {aiError
              ? `Error: ${aiError}`
              : !chatConnected
              ? 'Socket disconnected. The chat will continue using HTTP fallback, but backend availability may be degraded.'
              : ollamaHealth && !ollamaHealth.available
              ? `Local Ollama is unavailable at ${ollamaHealth.baseUrl || 'unknown'}. AI responses may be degraded until the service is back online.`
              : 'Degraded AI service state detected.'}
          </p>
          {!chatConnected && (
            <button
              type="button"
              onClick={reconnectChat}
              className="mt-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Reconnect chat
            </button>
          )}
        </div>
      )}

      {latestUpdate && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <p className="font-semibold">Recent Update</p>
          <p>
            {latestUpdate.eventType === 'LAB_TEST_UPDATED'
              ? `Lab test updated: ${latestUpdate.data.testName}`
              : `Billing record updated: ${latestUpdate.data.invoiceNumber}`}
          </p>
          <p className="mt-1 text-xs text-blue-700">{latestUpdate.timestamp}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white p-4 shadow-sm">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400">No messages yet. Start a conversation!</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-full rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.role === 'system'
                      ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.role === 'system' && <div className="mb-1 text-xs font-semibold">[System]</div>}
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  <div className="mt-2 text-right text-[11px] text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask about hospital operations, scheduling, or permissions..."
          disabled={isLoading}
          className="flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>

      <VoiceController
        onTranscription={handleTranscription}
        onError={handleVoiceError}
        disabled={isLoading}
      />

      <details className="mt-4 text-xs text-gray-600">
        <summary className="font-semibold">Context Summary</summary>
        <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-gray-100 p-3 text-[11px] text-gray-700">
          {contextSummary || 'No recent context.'}
        </pre>
      </details>
    </div>
  );
};
