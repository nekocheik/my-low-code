import { Node, Edge } from './types';

/**
 * Function to sanitize variable names.
 * Replace all invalid characters with underscores.
 * @param name Variable name to sanitize.
 * @returns Sanitized variable name.
 */
function sanitizeVariableName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_$]/g, '_');
}

export function compileNodes(nodes: Node[], entryNodeId: string): string {
  let compiledCode = '';
  const visitedNodes = new Set<string>();

  function compileNode(nodeId: string) {
    if (visitedNodes.has(nodeId)) return;
    visitedNodes.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      console.error(`Node with id ${nodeId} not found`);
      return;
    }

    // Add imports
    node.data.imports.forEach((imp: string) => {
      compiledCode += `${imp}\n`;
    });

    // Add node code within a closure
    const sanitizedFileName = sanitizeVariableName(node.data.fileName);
    compiledCode += `
const ${sanitizedFileName} = (function() {
  const module = { exports: {} };
  const exports = module.exports;
  ${node.data.code}
  return module.exports;
})();
`;

    // Export functions
    node.data.exportedFunctions.forEach((func: string) => {
      compiledCode += `if (typeof ${sanitizedFileName}.${func} === 'function') {
  globalThis.${func} = ${sanitizedFileName}.${func};
}\n`;
    });
  }

  // Start compilation from the entry node
  compileNode(entryNodeId);

  return compiledCode;
}


 my-low-code-app/frontend/src/App.tsx

// frontend/src/App.tsx

import React from 'react';
import { Box } from '@chakra-ui/react';
import { ReactFlowProvider } from 'reactflow';
import { Sidebar } from './components/Sidebar';
import { GraphCanvas } from './components/GraphCanvas';
import { Console } from './components/Console';
import { Modals } from './components/Modals';
import { ProjectStructure } from './components/ProjectStructure';
import { AlertProvider } from './contexts/AlertContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { GraphProvider } from './contexts/GraphContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ModalProvider } from './contexts/ModalContext';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <ProjectProvider>
          <GraphProvider>
            <ModalProvider>
              <ReactFlowProvider>
                <Box display="flex" height="100vh">
                  <Sidebar />
                  <GraphCanvas />
                  <Box display="flex" flexDirection="column" width="40%">
                    <ProjectStructure />
                    <Console />
                  </Box>
                  <Modals />
                </Box>
              </ReactFlowProvider>
            </ModalProvider>
          </GraphProvider>
        </ProjectProvider>
      </AlertProvider>
    </ErrorBoundary>
  );
};

export default App;