// frontend/src/components/Console.tsx

import React, { useState, useEffect } from 'react';
import { Box, Text, VStack, Button, Input, HStack } from '@chakra-ui/react';
import { useCombined } from '../contexts/CombinedContext'; // Utiliser useCombined
import axiosInstance from '../axiosInstance';
import { useAlert } from '../contexts/AlertContext';

export const Console: React.FC = () => {
  const [output, setOutput] = useState('');
  const [command, setCommand] = useState('');
  const { executeNode } = useCombined(); // Utiliser useCombined
  const { selectedProject } = useCombined(); // Utiliser useCombined
  const { showAlert } = useAlert();

  useEffect(() => {
    const handleNodeExecution = async (event: Event) => {
      const customEvent = event as CustomEvent;
      try {
        const result = await executeNode(customEvent.detail.nodeId);
        const newOutput = `${result.stdout}\n${result.stderr}`;
        console.log('New Output:', newOutput);
        setOutput(prevOutput => `${prevOutput}\n${newOutput}`);
      } catch (error) {
        const errorOutput = `Erreur lors de l'exécution du nœud: ${error}`;
        console.log(errorOutput);
        setOutput(prevOutput => `${prevOutput}\n${errorOutput}`);
        showAlert('Erreur lors de l\'exécution du nœud.', 'error');
      }
    };

    window.addEventListener('executeNode', handleNodeExecution);

    return () => {
      window.removeEventListener('executeNode', handleNodeExecution);
    };
  }, [executeNode, showAlert]);

  const executeCommand = async () => {
    if (!command.trim()) return;

    try {
      const response = await axiosInstance.post('/execute-command', {
        project: selectedProject,
        command,
      });
      const newOutput = `${response.data.stdout}\n${response.data.stderr}`;
      setOutput(prevOutput => `${prevOutput}\n${newOutput}`);
      setCommand('');
      showAlert('Commande exécutée avec succès.', 'success');
    } catch (error: any) {
      const errorOutput = `Erreur lors de l'exécution de la commande: ${error.response?.data?.message || error.message}`;
      setOutput(prevOutput => `${prevOutput}\n${errorOutput}`);
      showAlert('Erreur lors de l\'exécution de la commande.', 'error');
    }
  };

  const clearConsole = () => {
    setOutput('');
  };

  return (
    <Box width="100%" p={4} bg="gray.100">
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold">Sortie de la Console</Text>
        <Box
          bg="white"
          color="black"
          p={2}
          borderRadius="md"
          height="calc(50vh - 150px)"
          overflowY="auto"
        >
          <pre>{output}</pre>
        </Box>
        <HStack>
          <Input
            placeholder="Entrez une commande"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
          />
          <Button colorScheme="blue" onClick={executeCommand}>Exécuter</Button>
        </HStack>
        <Button colorScheme="red" onClick={clearConsole}>Effacer la Console</Button>
      </VStack>
    </Box>
  );
};
