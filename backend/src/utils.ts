
import { Node, Edge } from './types';

/**
 * Fonction pour sanitiser les noms de variables.
 * Remplace tous les caractères non valides par des underscores.
 * @param name Nom de la variable à sanitiser.
 * @returns Nom de la variable sanitizée.
 */
function sanitizeVariableName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_$]/g, '_');
}

export function compileNodes(nodes: Node[], edges: Edge[], entryNodeId: string): string {
  let compiledCode = '';
  const visitedNodes = new Set<string>();

  function compileNode(nodeId: string) {
    if (visitedNodes.has(nodeId)) return;
    visitedNodes.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Ajouter les imports
    node.data.imports.forEach((imp: string) => {
      compiledCode += `${imp}\n`;
    });

    // Ajouter le code du node, y compris les commentaires
    compiledCode += `\n// Code pour ${node.data.fileName}\n${node.data.code}\n`;

    // Compiler les nœuds dépendants
    edges.forEach(edge => {
      if (edge.source === nodeId) {
        compileNode(edge.target);
      }
    });
  }

  // Commencer la compilation à partir du nœud d'entrée
  compileNode(entryNodeId);

  return compiledCode;
}
