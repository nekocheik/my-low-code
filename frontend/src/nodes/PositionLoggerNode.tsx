// my-low-code-app/frontend/src/nodes/PositionLoggerNode.tsx

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Text } from '@chakra-ui/react';

interface PositionLoggerNodeData {
  label: string;
}

export const PositionLoggerNode: React.FC<NodeProps<PositionLoggerNodeData>> = ({ data }) => {
  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      bg="white"
      boxShadow="md"
      textAlign="center"
    >
      <Text fontWeight="bold">{data.label}</Text>
      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
};