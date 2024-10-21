// frontend/src/components/Sidebar.tsx

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Select,
  Text,
  HStack,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useCombined } from '../contexts/CombinedContext'; // Utiliser useCombined
import { useAlert } from '../contexts/AlertContext';
import { ProjectControls } from './ProjectControls';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

export const Sidebar: React.FC = () => {
  const {
    projects,
    selectedProject,
    selectProject,
    createProject,
    installPackage,
    importGitProject,
    deleteProject,
  } = useCombined(); // Utiliser useCombined
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const { showAlert } = useAlert();
  const { isAuthenticated, logout } = useAuth();
  const { openModal } = useModal();

  const handleCreateProject = async () => {
    if (newProjectCode && newProjectName) {
      try {
        await createProject(newProjectCode, newProjectName);
        setNewProjectCode('');
        setNewProjectName('');
        showAlert('Projet créé avec succès.', 'success');
      } catch (error: any) {
        showAlert(
          `Erreur lors de la création du projet: ${error.response?.data?.message || error.message}`,
          'error'
        );
      }
    } else {
      showAlert('Code et nom du projet sont requis.', 'warning');
    }
  };

  const handleSelectProject = async (projectName: string) => {
    selectProject(projectName);
    showAlert(`Projet "${projectName}" sélectionné.`, 'info');
  };

  const handleInstallPackage = async () => {
    if (packageName) {
      try {
        await installPackage(packageName);
        setPackageName('');
        showAlert(`Package "${packageName}" installé avec succès.`, 'success');
      } catch (error: any) {
        showAlert(
          `Erreur lors de l'installation du package: ${error.response?.data?.message || error.message}`,
          'error'
        );
      }
    } else {
      showAlert('Nom du package requis.', 'warning');
    }
  };

  const handleGitPull = async () => {
    if (!gitRepoUrl) {
      showAlert("L'URL du dépôt Git est requise.", 'warning');
      return;
    }

    try {
      await importGitProject(gitRepoUrl);
      showAlert('Projet Git importé avec succès.', 'success');
      setGitRepoUrl('');
    } catch (error: any) {
      showAlert(`Erreur lors de l'importation du projet Git: ${error.message}`, 'error');
    }
  };

  const handleDeleteProject = async (projectName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projectName}" ?`)) {
      try {
        await deleteProject(projectName);
        showAlert(`Projet "${projectName}" supprimé avec succès.`, 'success');
      } catch (error: any) {
        showAlert(`Erreur lors de la suppression du projet: ${error.message}`, 'error');
      }
    }
  };

  const handleLogout = () => {
    logout();
    showAlert('Déconnecté avec succès.', 'info');
  };

  return (
    <Box width="20%" p={4} bg="gray.100" overflowY="auto" height="100vh">
      <VStack spacing={6} align="stretch">
        <Text fontSize="2xl" fontWeight="bold" textAlign="center">
          Gestion de Projet
        </Text>

        {isAuthenticated ? (
          <>
            <VStack align="stretch" spacing={2}>
              <Input
                placeholder="Code du Projet"
                value={newProjectCode}
                onChange={(e) => setNewProjectCode(e.target.value)}
              />
              <Input
                placeholder="Nom du Projet"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <Button
                colorScheme="teal"
                leftIcon={<AddIcon />}
                onClick={handleCreateProject}
              >
                Créer Projet
              </Button>
            </VStack>

            <Select
              placeholder="Sélectionner un Projet"
              value={selectedProject}
              onChange={(e) => handleSelectProject(e.target.value)}
            >
              {projects.map((project) => (
                <option key={project._id} value={project.name}>
                  {project.name}
                </option>
              ))}
            </Select>

            {selectedProject && (
              <>
                <VStack align="stretch" spacing={2}>
                  <Input
                    placeholder="Nom du Package"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                  />
                  <Button
                    colorScheme="blue"
                    leftIcon={<AddIcon />}
                    onClick={handleInstallPackage}
                  >
                    Installer Package
                  </Button>
                </VStack>
                <Button
                  colorScheme="red"
                  onClick={() => handleDeleteProject(selectedProject)}
                >
                  Supprimer le projet
                </Button>
              </>
            )}

            <VStack align="stretch" spacing={2}>
              <Input
                placeholder="URL du dépôt Git"
                value={gitRepoUrl}
                onChange={(e) => setGitRepoUrl(e.target.value)}
              />
              <Button
                colorScheme="purple"
                onClick={handleGitPull}
              >
                Importer depuis Git
              </Button>
            </VStack>

            <ProjectControls />

            <Button colorScheme="red" onClick={handleLogout}>
              Déconnexion
            </Button>
          </>
        ) : (
          <VStack align="stretch" spacing={2}>
            <Button colorScheme="blue" onClick={() => openModal('login')}>
              Connexion
            </Button>
            <Button colorScheme="green" onClick={() => openModal('register')}>
              Inscription
            </Button>
          </VStack>
        )}
      </VStack>
    </Box>
  );
};
