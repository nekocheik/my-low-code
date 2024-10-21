import { INode } from '../models/Node';

export function compileNodes(nodes: INode[], entryFile: string): string {
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

    // Ajouter le code du node dans une closure
    compiledCode += `
(function(module, exports) {
  ${node.data.code}
})((module = { exports: {} }, exports = module.exports));
`;
    // Exporter les fonctions
    node.data.exportedFunctions.forEach((func: string) => {
      compiledCode += `module.exports.${func} = ${func};\n`;
    });
  }

  // Commencer la compilation à partir du fichier d'entrée
  compileNode(entryFile);

  return compiledCode;
}
