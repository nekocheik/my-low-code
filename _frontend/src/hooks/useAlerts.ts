import { useState } from 'react';

export const useAlerts = () => {
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<'success' | 'error' | 'info'>('info');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const showAlert = (msg: string, stat: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setStatus(stat);
    setIsOpen(true);
    setTimeout(() => setIsOpen(false), 3000);
  };

  return { message, status, isOpen, showAlert };
};