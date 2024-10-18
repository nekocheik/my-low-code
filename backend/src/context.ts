/// my-low-code-app/backend/src/context.ts

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export class Context {
  [key: string]: any;

  constructor(exportedFunctions: { [key: string]: Function }) {
    for (const funcName in exportedFunctions) {
      if (exportedFunctions.hasOwnProperty(funcName)) {
        this[funcName] = exportedFunctions[funcName];
      }
    }
  }

  static extractExportedFunctions(code: string): string[] {
    const exportedFunctions: string[] = [];
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      ExportNamedDeclaration(path) {
        const { declaration } = path.node;
        if (declaration && declaration.type === 'FunctionDeclaration') {
          const funcName = declaration.id?.name;
          if (funcName) {
            exportedFunctions.push(funcName);
          }
        }
      },
      ExportSpecifier(path) {
        const exportedNode = path.node.exported;
        const funcName = 'name' in exportedNode ? exportedNode.name : exportedNode.value;
        exportedFunctions.push(funcName);
      },
    });

    return exportedFunctions;
  }
}
