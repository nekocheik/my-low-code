// frontend/src/components/CodeNode.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Button, Input, VStack, HStack, Text } from '@chakra-ui/react';
import MonacoEditor from '@monaco-editor/react';
import Select from 'react-select';
import { useGraph } from '../contexts/GraphContext';
import axiosInstance from '../axiosInstance'; // Assurez-vous que ce chemin est correct
import { useProject } from '../contexts/ProjectContext';
import { useAlert } from '../contexts/AlertContext';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

const CodeNode: React.FC<NodeProps> = ({ id, data }) => {
  const [code, setCode] = useState(data.code || '');
  const [fileName, setFileName] = useState(data.fileName || '');
  const [imports, setImports] = useState<string[]>(data.imports || []);
  const [availableImports, setAvailableImports] = useState<{ value: string; label: string }[]>([]);
  const [width, setWidth] = useState<number>(300);
  const [height, setHeight] = useState<number>(400);
  const { updateGraph, deleteNode, cloneNode, nodes, edges } = useGraph();
  const { selectedProject } = useProject();
  const { showAlert } = useAlert();

  useEffect(() => {
    axiosInstance
      .get('/accessible-functions', {
        params: { project: selectedProject, nodeId: id },
      })
      .then((response) => {
        const options = response.data.accessibleFunctions.map((func: string) => ({
          value: func,
          label: func,
        }));
        setAvailableImports(options);
      })
      .catch((error) => {
        console.error('Failed to fetch accessible functions:', error);
        showAlert('Échec de la récupération des fonctions accessibles.', 'error');
      });
  }, [id, selectedProject, showAlert]);

  const handleImportChange = (selectedOptions: any) => {
    const selectedImports = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
    setImports(selectedImports);
  };

  const handleResize = (event: any, { size }: { size: { width: number; height: number } }) => {
    setWidth(size.width);
    setHeight(size.height);
  };

  const handleSave = useCallback(async () => {
    const updatedNodes = nodes.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, code, fileName, imports }, position: { ...node.position }, width, height }
        : node
    );

    try {
      await updateGraph(updatedNodes, edges);
      showAlert('Fichier sauvegardé avec succès.', 'success');
    } catch (error: any) {
      console.error('Failed to save file:', error);
      if (error.response && error.response.data && error.response.data.message) {
        showAlert(`Échec de la sauvegarde du fichier: ${error.response.data.message}`, 'error');
      } else {
        showAlert('Échec de la sauvegarde du fichier.', 'error');
      }
    }
  }, [id, code, fileName, imports, nodes, edges, updateGraph, showAlert, width, height]);

  const handleExecute = useCallback(() => {
    console.log(`Dispatching executeNode event for nodeId: ${id}`);
    const event = new CustomEvent('executeNode', { detail: { nodeId: id } });
    window.dispatchEvent(event);
  }, [id]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleClone = useCallback(() => {
    cloneNode(id);
  }, [id, cloneNode]);

  return (
    <ResizableBox width={width} height={height} onResize={handleResize} minConstraints={[200, 200]} maxConstraints={[600, 600]}>
      <Box borderWidth={1} borderRadius="lg" p={3} bg="white" width="100%" height="100%">
        <VStack spacing={3}>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Nom du fichier"
          />
          <Box>
            <Text fontWeight="bold">Imports Internes :</Text>
            <Select
              isMulti
              options={availableImports}
              value={availableImports.filter(option => imports.includes(option.value))}
              onChange={handleImportChange}
              placeholder="Sélectionner des imports"
            />
          </Box>
          <Box height={150} width="100%">
            <MonacoEditor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{ minimap: { enabled: false } }}
            />
          </Box>
          {data.lintErrors && data.lintErrors.length > 0 && (
            <Box>
              <Text color="red.500" fontWeight="bold">Erreurs de lint :</Text>
              {data.lintErrors.map((error: any, index: number) => (
                <Text key={index} color="red.500">{`Ligne ${error.line}: ${error.message}`}</Text>
              ))}
            </Box>
          )}
          <HStack spacing={2}>
            <Button size="sm" colorScheme="blue" onClick={handleSave}>Sauvegarder</Button>
            <Button size="sm" colorScheme="green" onClick={handleExecute}>Exécuter</Button>
            <Button size="sm" colorScheme="red" onClick={handleDelete}>Supprimer</Button>
            <Button size="sm" colorScheme="purple" onClick={handleClone}>Cloner</Button>
          </HStack>
        </VStack>
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
      </Box>
    </ResizableBox>
  );
};

export default CodeNode;
