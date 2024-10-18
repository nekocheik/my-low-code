// backend/src/utils.ts

import { Node, Edge, ProjectGraph } from './types';

/**
 * Sanitize variable names to prevent injection or syntax errors.
 * @param name - The variable name to sanitize.
 * @returns A sanitized variable name.
 */
function sanitizeVariableName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_$]/g, '_');
}

/**
 * Compile nodes into a single executable JavaScript code string.
 * @param graph - The project graph containing nodes and edges.
 * @param entryNodeId - The ID of the entry node to start compilation.
 * @returns A string of compiled JavaScript code.
 */
export function compileNodes(graph: ProjectGraph, entryNodeId: string): string {
  let compiledCode = '';
  const visitedNodes = new Set<string>();

  /**
   * Recursively compile a node and its dependencies.
   * @param nodeId - The ID of the node to compile.
   */
  function compileNode(nodeId: string) {
    if (visitedNodes.has(nodeId)) return;
    visitedNodes.add(nodeId);

    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) {
      console.error(`Node with id ${nodeId} not found`);
      return;
    }

    // Ajouter les imports
    if (node.data.imports && node.data.imports.length > 0) {
      node.data.imports.forEach((imp: string) => {
        compiledCode += `${imp}\n`;
      });
    }

    // Ajouter le code du nœud
    compiledCode += `
    // File: ${node.data.fileName}
    ${node.data.code}
    `;

    // Exporter les fonctions vers le scope global
    if (node.data.exportedFunctions && node.data.exportedFunctions.length > 0) {
      node.data.exportedFunctions.forEach((func: string) => {
        const sanitizedFunc = sanitizeVariableName(func);
        compiledCode += `
    if (typeof ${sanitizedFunc} === 'function') {
      globalThis.${sanitizedFunc} = ${sanitizedFunc};
    }
    `;
      });
    }

    // Compiler les nœuds connectés
    const connectedEdges = graph.edges.filter(edge => edge.source === nodeId);
    connectedEdges.forEach(edge => compileNode(edge.target));
  }

  // Commencer la compilation à partir du nœud d'entrée
  compileNode(entryNodeId);

  return compiledCode;
}
