import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { Sidebar } from './Sidebar';
import { GraphCanvas } from './GraphCanvas';
import { Console } from './Console';
import { ProjectStructure } from './ProjectStructure';

export const MainApp: React.FC = () => {
  return (
    <Flex height="calc(100vh - 60px)"> {/* Ajustez la hauteur en fonction de votre en-tête */}
      <Sidebar />
      <Box flex={1} display="flex">
        <GraphCanvas />
        <Box width="40%" display="flex" flexDirection="column">
          <ProjectStructure />
          <Console />
        </Box>
      </Box>
    </Flex>
  );
};