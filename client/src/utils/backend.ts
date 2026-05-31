export const getBackendUrl = (): string => {
  const configuredUrl = (import.meta as any)?.env?.VITE_API_URL?.replace(/\/$/, '');
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return 'http://localhost:4000';
    }
    return origin;
  }

  return 'http://localhost:4000';
};

export const getApiUrl = (path: string): string => `${getBackendUrl()}${path}`;

export const getAIApiUrl = (path: string): string => getApiUrl(path);
