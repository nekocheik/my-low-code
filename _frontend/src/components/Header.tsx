import React from 'react';
import { Box, Flex, Text, Button } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useAlert } from '../contexts/AlertContext';

export const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { openModal } = useModal();
  const { showAlert } = useAlert();

  const handleLogout = () => {
    logout();
    showAlert('Déconnecté avec succès.', 'info');
  };

  return (
    <Flex bg="teal.500" color="white" p={4} align="center" justify="space-between">
      <Text fontSize="lg" fontWeight="bold">Low-Code App</Text>
      {isAuthenticated && (
        <Button colorScheme="red" size="sm" onClick={handleLogout}>
          Déconnexion
        </Button>
      )}
    </Flex>
  );
};
