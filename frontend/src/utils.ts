// backend/utils.ts

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
