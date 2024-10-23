import React from 'react';
import { Box, Text, VStack, HStack, Icon } from '@chakra-ui/react';
import { FaFolder, FaFile } from 'react-icons/fa';
import { useGraph } from '../contexts/GraphContext';

interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

const FileTreeItem: React.FC<{ node: FileTreeNode; depth: number }> = ({ node, depth }) => {
  return (
    <VStack align="start" pl={depth * 4} spacing={1}>
      <HStack>
        <Icon as={node.type === 'folder' ? FaFolder : FaFile} color={node.type === 'folder' ? 'yellow.500' : 'blue.500'} />
        <Text>{node.name}</Text>
      </HStack>
      {node.children && node.children.map((child, index) => (
        <FileTreeItem key={index} node={child} depth={depth + 1} />
      ))}
    </VStack>
  );
};

export const ProjectStructure: React.FC = () => {
  const { nodes } = useGraph();

  // Log pour vérifier la structure des nodes
  console.log("nodes:", nodes);

  // Filtrer et formater les nodes
  const fileTree: FileTreeNode = {
    name: 'Project Root',
    type: 'folder',
    children: nodes
      .filter(node => node?.data?.fileName)  // Filtrer les nodes valides
      .map(node => ({
        name: node.data.fileName || 'Unnamed File',  // Assurer une valeur par défaut
        type: 'file'
      }))
  };

  return (
    <Box width="100%" p={4} bg="gray.50" overflowY="auto" height="50vh">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Project Structure</Text>
      <FileTreeItem node={fileTree} depth={0} />
    </Box>
  );
};

export default ProjectStructure;
