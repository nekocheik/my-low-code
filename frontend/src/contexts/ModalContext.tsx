// frontend/src/contexts/ModalContext.tsx

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface ModalContextType {
  isDeleteModalOpen: boolean;
  openDeleteModal: (nodeId: string) => void;
  closeDeleteModal: () => void;
  nodeToDelete: string | null;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  const openDeleteModal = useCallback((nodeId: string) => {
    setNodeToDelete(nodeId);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setNodeToDelete(null);
  }, []);

  const contextValue: ModalContextType = {
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    nodeToDelete,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
