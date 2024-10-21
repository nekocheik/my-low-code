import React, { useState } from 'react';
import { Box, VStack, HStack, Input, Button, Text, List, ListItem, IconButton } from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

interface ImportExportManagerProps {
  imports: Array<{ from: string; items: string[] }>;
  exports: string[];
  onImportsChange: (imports: Array<{ from: string; items: string[] }>) => void;
  onExportsChange: (exports: string[]) => void;
}

const ImportExportManager: React.FC<ImportExportManagerProps> = ({
  imports,
  exports,
  onImportsChange,
  onExportsChange,
}) => {
  const [newImportFrom, setNewImportFrom] = useState('');
  const [newImportItem, setNewImportItem] = useState('');
  const [newExport, setNewExport] = useState('');

  const handleAddImport = () => {
    if (newImportFrom && newImportItem) {
      const existingImport = imports.find(imp => imp.from === newImportFrom);
      if (existingImport) {
        existingImport.items.push(newImportItem);
      } else {
        imports.push({ from: newImportFrom, items: [newImportItem] });
      }
      onImportsChange([...imports]);
      setNewImportFrom('');
      setNewImportItem('');
    }
  };

  const handleRemoveImport = (from: string, item: string) => {
    const updatedImports = imports.map(imp => {
      if (imp.from === from) {
        return { ...imp, items: imp.items.filter(i => i !== item) };
      }
      return imp;
    }).filter(imp => imp.items.length > 0);
    onImportsChange(updatedImports);
  };

  const handleAddExport = () => {
    if (newExport && !exports.includes(newExport)) {
      onExportsChange([...exports, newExport]);
      setNewExport('');
    }
  };

  const handleRemoveExport = (item: string) => {
    onExportsChange(exports.filter(exp => exp !== item));
  };

  return (
    <Box>
      <VStack align="stretch" spacing={4}>
        <Box>
          <Text fontWeight="bold">Imports:</Text>
          <List spacing={2}>
            {imports.map((imp, index) => (
              <ListItem key={index}>
                <Text>From: {imp.from}</Text>
                <List pl={4}>
                  {imp.items.map((item, itemIndex) => (
                    <ListItem key={itemIndex}>
                      <HStack>
                        <Text>{item}</Text>
                        <IconButton
                          aria-label="Remove import"
                          icon={<DeleteIcon />}
                          size="xs"
                          onClick={() => handleRemoveImport(imp.from, item)}
                        />
                      </HStack>
                    </ListItem>
                  ))}
                </List>
              </ListItem>
            ))}
          </List>
          <HStack mt={2}>
            <Input
              placeholder="From module"
              value={newImportFrom}
              onChange={(e) => setNewImportFrom(e.target.value)}
            />
            <Input
              placeholder="Import item"
              value={newImportItem}
              onChange={(e) => setNewImportItem(e.target.value)}
            />
            <Button onClick={handleAddImport}>
              <AddIcon />
            </Button>
          </HStack>
        </Box>
        <Box>
          <Text fontWeight="bold">Exports:</Text>
          <List spacing={2}>
            {exports.map((exp, index) => (
              <ListItem key={index}>
                <HStack>
                  <Text>{exp}</Text>
                  <IconButton
                    aria-label="Remove export"
                    icon={<DeleteIcon />}
                    size="xs"
                    onClick={() => handleRemoveExport(exp)}
                  />
                </HStack>
              </ListItem>
            ))}
          </List>
          <HStack mt={2}>
            <Input
              placeholder="Export item"
              value={newExport}
              onChange={(e) => setNewExport(e.target.value)}
            />
            <Button onClick={handleAddExport}>
              <AddIcon />
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default ImportExportManager;