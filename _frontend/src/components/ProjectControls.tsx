import React from 'react';
import { Button, HStack } from '@chakra-ui/react';
import axiosInstance from '../axiosInstance';
import { useProject } from '../contexts/ProjectContext';
import { useAlert } from '../contexts/AlertContext';

export const ProjectControls: React.FC = () => {
  const { selectedProject } = useProject();
  const { showAlert } = useAlert();

  const handleCommit = async () => {
    try {
      await axiosInstance.post('/git/commit', {
        project: selectedProject,
        message: 'Commit via Low-Code Interface',
      });
      showAlert('Modifications commitées avec succès.', 'success');
    } catch (error: any) {
      showAlert(`Erreur lors du commit: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handlePush = async () => {
    try {
      await axiosInstance.post('/git/push', {
        project: selectedProject,
      });
      showAlert('Modifications poussées vers GitHub avec succès.', 'success');
    } catch (error: any) {
      showAlert(`Erreur lors du push: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handlePull = async () => {
    try {
      await axiosInstance.post('/git/pull', {
        project: selectedProject,
      });
      showAlert('Modifications récupérées depuis GitHub avec succès.', 'success');
    } catch (error: any) {
      showAlert(`Erreur lors du pull: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  return (
    <HStack spacing={4}>
      <Button colorScheme="yellow" onClick={handleCommit}>
        Commit
      </Button>
      <Button colorScheme="green" onClick={handlePush}>
        Push
      </Button>
      <Button colorScheme="blue" onClick={handlePull}>
        Pull
      </Button>
    </HStack>
  );
};
