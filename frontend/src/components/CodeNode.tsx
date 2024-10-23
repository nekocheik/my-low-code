import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Button, Input, VStack, HStack, Text } from '@chakra-ui/react';
import MonacoEditor from '@monaco-editor/react';
import Select from 'react-select';
import { useGraph } from '../contexts/GraphContext';
import { CodeNodeData } from '../types';
import { useAlert } from '../contexts/AlertContext';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface SelectOption {
  value: string;
  label: string;
}

const CodeNodeComponent: React.FC<NodeProps<CodeNodeData>> = ({ id, data, xPos, yPos }) => {
  const [code, setCode] = useState(data.code || '');
  const [fileName, setFileName] = useState(data.fileName || '');
  const [imports, setImports] = useState<string[]>(data.imports || []);
  const [availableImports, setAvailableImports] = useState<SelectOption[]>([]);
  const [width, setWidth] = useState<number>(300);
  const [height, setHeight] = useState<number>(400);
  
  const { updateNode, deleteNode, cloneNode, selectedProject } = useGraph();
  const { showAlert } = useAlert();

  useEffect(() => {
    if (selectedProject) {
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
    }
  }, [id, selectedProject, showAlert]);

  const handleImportChange = (selectedOptions: readonly SelectOption[]) => {
    const selectedImports = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setImports(selectedImports);
  };

  const handleResize = (event: any, { size }: { size: { width: number; height: number } }) => {
    setWidth(size.width);
    setHeight(size.height);
  };

  const handleSave = useCallback(async () => {
    const updatedNode = {
      id,
      type: 'code' as const,
      position: { x: xPos, y: yPos },
      data: {
        label: fileName,
        fileName,
        imports,
        code,
        exportedFunctions: data.exportedFunctions,
        lintErrors: data.lintErrors,
      },
      width,
      height,
    };

    try {
      await updateNode(updatedNode);
      showAlert('Fichier sauvegardé avec succès.', 'success');
    } catch (error: any) {
      console.error('Failed to save file:', error);
      showAlert(
        `Échec de la sauvegarde du fichier: ${error?.response?.data?.message || 'Erreur inconnue'}`, 
        'error'
      );
    }
  }, [id, code, fileName, imports, data.exportedFunctions, data.lintErrors, xPos, yPos, width, height, updateNode, showAlert]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleClone = useCallback(() => {
    cloneNode(id);
  }, [id, cloneNode]);

  return (
    <ResizableBox 
      width={width} 
      height={height} 
      onResize={handleResize}
      minConstraints={[200, 200]} 
      maxConstraints={[600, 600]}
    >
      <Box borderWidth={1} borderRadius="lg" p={3} bg="white" width="100%" height="100%">
        <VStack spacing={3}>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Nom du fichier"
          />
          <Box width="100%">
            <Text fontWeight="bold">Imports :</Text>
            <Select
              isMulti
              options={availableImports}
              value={availableImports.filter(option => imports.includes(option.value))}
              onChange={handleImportChange}
              placeholder="Sélectionner des imports"
            />
          </Box>
          <Box height="150px" width="100%">
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
            <Box width="100%">
              <Text color="red.500" fontWeight="bold">Erreurs de lint :</Text>
              {data.lintErrors.map((error, index) => (
                <Text key={index} color="red.500">
                  {`Ligne ${error.line}: ${error.message}`}
                </Text>
              ))}
            </Box>
          )}
          <HStack spacing={2}>
            <Button size="sm" colorScheme="blue" onClick={handleSave}>
              Sauvegarder
            </Button>
            <Button size="sm" colorScheme="red" onClick={handleDelete}>
              Supprimer
            </Button>
            <Button size="sm" colorScheme="purple" onClick={handleClone}>
              Cloner
            </Button>
          </HStack>
        </VStack>
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
      </Box>
    </ResizableBox>
  );
};

export default CodeNodeComponent;