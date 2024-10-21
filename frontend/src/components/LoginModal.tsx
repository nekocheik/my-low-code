import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  VStack,
  Text,
} from '@chakra-ui/react';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';

export const LoginModal: React.FC = () => {
  const { isOpen, closeModal, modalContent } = useModal();
  const { login } = useAuth();
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

  // Vérifiez si le modal actuel est le LoginModal
  if (modalContent !== 'login') return null;

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Connexion</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
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
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleLogin} isLoading={isSubmitting}>
            Connexion
          </Button>
          <Button variant="ghost" onClick={() => {
            closeModal();
            // Optionnel : Ouvrir le RegisterModal si nécessaire
          }}>
            Annuler
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
