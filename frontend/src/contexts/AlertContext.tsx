// frontend/src/contexts/AlertContext.tsx

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useToast } from '@chakra-ui/react';

interface AlertContextType {
  showAlert: (message: string, status: 'success' | 'error' | 'info' | 'warning') => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const toast = useToast();

  const showAlert = (message: string, status: 'success' | 'error' | 'info' | 'warning') => {
    toast({
      title: message,
      status: status,
      duration: 500,
      isClosable: true,
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};