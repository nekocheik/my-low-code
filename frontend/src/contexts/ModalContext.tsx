// frontend/src/contexts/ModalContext.tsx

import React, { createContext, useState, useContext, ReactNode } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useCombined } from './CombinedContext';
import { useAlert } from './AlertContext';

interface ModalContextType {
  isOpen: boolean;
  openModal: (content: string, data?: any) => void;
  closeModal: () => void;
  modalContent: string | null;
  modalData: any;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const { deleteNode } = useCombined();
  const { showAlert } = useAlert();

  const openModal = (content: string, data: any = null) => {
    setModalContent(content);
    setModalData(data);
    setIsOpen(true);
    console.log(`Modal ouvert: ${content}`, data); // Debug
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalContent(null);
    setModalData(null);
    console.log('Modal fermé'); // Debug
  };

  const handleDelete = async () => {
    if (modalData && modalData.nodeId) {
      try {
        await deleteNode(modalData.nodeId);
        showAlert('Nœud supprimé avec succès.', 'success');
        closeModal();
      } catch (error: any) {
        showAlert('Échec de la suppression du nœud.', 'error');
      }
    }
  };

  const renderModalContent = () => {
    switch (modalContent) {
      case 'login':
        return <LoginForm />;
      case 'register':
        return <RegisterForm />;
      case 'delete':
        return <DeleteNodeForm />;
      // Ajoutez d'autres cas pour différents types de modaux
      default:
        return null;
    }
  };

  return (
    <ModalContext.Provider value={{ isOpen, openModal, closeModal, modalContent, modalData }}>
      {children}
      {isOpen && (
        <Modal isOpen={isOpen} onClose={closeModal} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {modalContent === 'login'
                ? 'Connexion'
                : modalContent === 'register'
                ? 'Inscription'
                : 'Confirmation'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>{renderModalContent()}</ModalBody>
            <ModalFooter>
              {modalContent !== 'delete' && (
                <Button colorScheme="blue" mr={3} onClick={closeModal}>
                  Fermer
                </Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </ModalContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte des modaux
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// Composant pour le formulaire de connexion
const LoginForm: React.FC = () => {
  const { closeModal } = useModal();
  const { login } = useCombined();
  const { showAlert } = useAlert();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert('Nom d\'utilisateur et mot de passe requis.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(username, password);
      closeModal();
    } catch (error) {
      // Les erreurs sont gérées dans le contexte Auth
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VStack spacing={4}>
      <Input
        placeholder="Nom d'utilisateur"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button colorScheme="blue" onClick={handleLogin} isLoading={isSubmitting}>
        Connexion
      </Button>
    </VStack>
  );
};

// Composant pour le formulaire d'inscription
const RegisterForm: React.FC = () => {
  const { closeModal } = useModal();
  const { register } = useCombined();
  const { showAlert } = useAlert();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) {
      showAlert('Nom d\'utilisateur et mot de passe requis.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await register(username, password);
      closeModal();
    } catch (error) {
      // Les erreurs sont gérées dans le contexte Auth
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VStack spacing={4}>
      <Input
        placeholder="Nom d'utilisateur"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button colorScheme="green" onClick={handleRegister} isLoading={isSubmitting}>
        Inscription
      </Button>
    </VStack>
  );
};

// Composant pour la confirmation de suppression de nœud
const DeleteNodeForm: React.FC = () => {
  const { closeModal, modalData } = useModal();
  const { deleteNode } = useCombined();
  const { showAlert } = useAlert();

  const handleDelete = async () => {
    if (modalData && modalData.nodeId) {
      try {
        await deleteNode(modalData.nodeId);
        showAlert('Nœud supprimé avec succès.', 'success');
        closeModal();
      } catch (error: any) {
        showAlert('Échec de la suppression du nœud.', 'error');
      }
    }
  };

  return (
    <VStack spacing={4}>
      <Text>Êtes-vous sûr de vouloir supprimer ce nœud ? Cette action est irréversible.</Text>
      <HStack spacing={4}>
        <Button colorScheme="red" onClick={handleDelete}>
          Supprimer
        </Button>
        <Button variant="ghost" onClick={closeModal}>
          Annuler
        </Button>
      </HStack>
    </VStack>
  );
};
