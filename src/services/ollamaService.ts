import { ChatOllama, Ollama } from '@langchain/ollama';

export const ollamaBaseUrl = process.env.OLLAMA_API_URL ?? process.env.OLLAMA_URL ?? 'http://localhost:11434';
export const ollamaModel = process.env.OLLAMA_MODEL ?? 'ollama-3';
const ollamaTimeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? '60000');
const ollamaRetryCount = Number(process.env.OLLAMA_RETRY_COUNT ?? '2');
const ollamaCircuitThreshold = Number(process.env.OLLAMA_CIRCUIT_THRESHOLD ?? '3');
const ollamaCircuitResetMs = Number(process.env.OLLAMA_CIRCUIT_RESET_MS ?? '60000');
const forceOffline = (process.env.OLLAMA_FORCE_OFFLINE || '').toLowerCase() === 'true';

let ollamaAvailable: boolean | null = null;
let failureCount = 0;
let circuitOpenedAt: number | null = null;

const recordFailure = () => {
  failureCount += 1;
  if (failureCount >= ollamaCircuitThreshold) {
    circuitOpenedAt = Date.now();
    console.warn(`[Ollama] circuit breaker opened after ${failureCount} failed attempts.`);
  }
  ollamaAvailable = false;
};

const recordSuccess = () => {
  failureCount = 0;
  circuitOpenedAt = null;
  ollamaAvailable = true;
};

const isCircuitOpen = (): boolean => {
  if (!circuitOpenedAt) {
    return false;
  }

  if (Date.now() - circuitOpenedAt > ollamaCircuitResetMs) {
    failureCount = 0;
    circuitOpenedAt = null;
    return false;
  }

  return true;
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = ollamaTimeoutMs,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const checkOllamaAvailability = async (): Promise<boolean> => {
  if (forceOffline) {
    console.log('[Ollama] force offline mode enabled via OLLAMA_FORCE_OFFLINE');
    ollamaAvailable = false;
    return false;
  }

  if (isCircuitOpen()) {
    console.warn('[Ollama] circuit breaker is open, skipping health check.');
    return false;
  }

  try {
    const response = await fetchWithTimeout(`${ollamaBaseUrl}/api/tags`, { method: 'GET' });

    if (!response.ok) {
      recordFailure();
      console.warn(`[Ollama] health check returned ${response.status}`);
      return false;
    }

    const body = await response.json().catch(() => null);
    const hasLoadedModels = body && Array.isArray(body.models) && body.models.length > 0;

    if (!hasLoadedModels) {
      recordFailure();
      console.warn(`[Ollama] reachable at ${ollamaBaseUrl}, but no models are loaded.`);
      return false;
    }

    recordSuccess();
    return true;
  } catch (err) {
    recordFailure();
    console.error(`[Ollama] availability check failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
};

export const ensureOllamaIsReachable = async (): Promise<boolean> => {
  if (ollamaAvailable === null) {
    ollamaAvailable = await checkOllamaAvailability();
  }
  return ollamaAvailable;
};

export const createOllama = (): Ollama => {
  return new Ollama({
    baseUrl: ollamaBaseUrl,
    model: ollamaModel,
    temperature: 0.2,
  });
};

export const createChatOllama = (): ChatOllama => {
  return new ChatOllama({
    baseUrl: ollamaBaseUrl,
    model: ollamaModel,
    temperature: 0.2,
  });
};

/**
 * Create a deterministic ChatOllama with temperature=0
 * for strict RAG retrieval chains (medical/factual queries)
 */
export const createDeterministicChatOllama = (): ChatOllama => {
  return new ChatOllama({
    baseUrl: ollamaBaseUrl,
    model: ollamaModel,
    temperature: 0, // Deterministic: no hallucinations, purely factual output
  });
};

export const invokeOllamaWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number = ollamaTimeoutMs): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Ollama invocation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
};

export const getOllamaHealth = async () => {
  const available = await checkOllamaAvailability();
  return {
    available,
    baseUrl: ollamaBaseUrl,
    model: ollamaModel,
    forceOffline,
    circuitOpen: isCircuitOpen(),
    failedAttempts: failureCount,
    circuitOpenedAt,
  };
};
