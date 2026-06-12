import { useState, useCallback } from 'react';

let id = 0;
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const tid = ++id;
    setToasts(prev => [...prev, { id: tid, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3500);
  }, []);

  const dismiss = useCallback((tid) => setToasts(prev => prev.filter(t => t.id !== tid)), []);

  return { toasts, toast, dismiss };
};
