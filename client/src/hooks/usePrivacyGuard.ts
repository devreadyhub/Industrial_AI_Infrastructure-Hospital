import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PrivacyGuardOptions {
  timeoutMs?: number;
}

interface UsePrivacyGuardResult {
  isBlurred: boolean;
  resumeSessionProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  verifySession: () => void;
  lastActivityAt: number | null;
  timeoutMs: number;
}

export const usePrivacyGuard = ({ timeoutMs = 60000 }: PrivacyGuardOptions = {}): UsePrivacyGuardResult => {
  const { user } = useAuth();
  const [isBlurred, setIsBlurred] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(Date.now());
  const timerRef = useRef<number | null>(null);
  const isHoveringButton = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setIsBlurred(true);
    }, timeoutMs);
  };

  const handleIdleActivity = () => {
    setLastActivityAt(Date.now());
    if (!isBlurred) {
      startTimer();
    }
  };

  useEffect(() => {
    handleIdleActivity();

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    const listeners = events.map((eventName) => {
      const listener = () => handleIdleActivity();
      window.addEventListener(eventName, listener);
      return { eventName, listener };
    });

    return () => {
      clearTimer();
      listeners.forEach(({ eventName, listener }) => {
        window.removeEventListener(eventName, listener);
      });
    };
  }, [isBlurred, timeoutMs]);

  useEffect(() => {
    if (!isBlurred) {
      startTimer();
    }
  }, [isBlurred]);

  const verifySession = () => {
    if (user) {
      setIsBlurred(false);
      setLastActivityAt(Date.now());
      startTimer();
    }
  };

  const resumeSessionProps = useMemo(
    () => ({
      onMouseEnter: () => {
        isHoveringButton.current = true;
        if (isBlurred) {
          setIsBlurred(false);
          setLastActivityAt(Date.now());
          startTimer();
        }
      },
      onMouseLeave: () => {
        isHoveringButton.current = false;
      },
    }),
    [isBlurred],
  );

  return {
    isBlurred,
    resumeSessionProps,
    verifySession,
    lastActivityAt,
    timeoutMs,
  };
};
