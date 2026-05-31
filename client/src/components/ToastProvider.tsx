import React, { createContext, useCallback, useContext, useState } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  id?: string;
  message: string;
  type?: ToastType;
  duration?: number; // ms
}

export interface ToastContextValue {
  addToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addToast = useCallback((opts: ToastOptions) => {
    const id = opts.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast = { ...opts, id };
    setToasts((t) => [toast, ...t]);
    const duration = opts.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm w-full rounded-md px-4 py-2 shadow-lg text-sm text-white ${
              t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-yellow-600 text-black' : 'bg-blue-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToastContext = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
};

export default ToastProvider;
