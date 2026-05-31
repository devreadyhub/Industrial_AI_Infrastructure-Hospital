import axios, { AxiosRequestConfig } from 'axios';

const API_BASE = '/api';

export const authAxios = axios.create({
  baseURL: API_BASE,
});

authAxios.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = {
      ...(config.headers as Record<string, unknown>),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

export const authFetch = async (
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> => {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(init.headers as HeadersInit || {});

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

export default authAxios;
