import fs from 'fs/promises';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import NodeModel, { INode } from '../models/Node';
import logger from '../utils/logger';

export interface FileAnalysisResult {
  nodes: INode[];
  imports: string[];
  exportedFunctions: string[];
}

export async function analyzeFile(
  filePath: string,
  projectId: string,
  projectPath: string
): Promise<FileAnalysisResult> {
  try {
    // Lire le contenu du fichier
    const content = await fs.readFile(filePath, 'utf-8');
    if (!content) {
      throw new Error(`Fichier vide: ${filePath}`);
    }

    // Analyser le code avec Babel
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    // Extraire les imports et exports
    const imports: string[] = [];
    const exportedFunctions: string[] = [];

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        imports.push(source);
      },
      ExportNamedDeclaration(path) {
        const { declaration } = path.node;
        if (declaration && declaration.type === 'FunctionDeclaration') {
          const funcName = declaration.id?.name;
          if (funcName) {
            exportedFunctions.push(funcName);
          }
        }
      },
    });

    // Créer le nœud
    const relativeFilePath = path.relative(projectPath, filePath);
    const nodeId = relativeFilePath.replace(/\\/g, '/');

    const nodeData = {
      project: projectId,
      id: nodeId,
      type: 'code',
      position: { 
        x: Math.random() * 500, 
        y: Math.random() * 500 
      },
      data: {
        label: path.basename(filePath),
        fileName: relativeFilePath,
        imports: imports,
        code: content,
        exportedFunctions: exportedFunctions,
        lintErrors: []
      }
    };

    // Sauvegarder le nœud
    const node = await NodeModel.findOneAndUpdate(
      { project: projectId, id: nodeId },
      nodeData,
      { upsert: true, new: true, runValidators: true }
    );

    if (!node) {
      throw new Error(`Échec de la création/mise à jour du nœud pour ${nodeId}`);
    }

    logger.info(`Nœud créé/mis à jour avec succès pour ${nodeId}`);

    return {
      nodes: [node],
      imports,
      exportedFunctions
    };

  } catch (error: any) {
    logger.error(`Erreur lors de l'analyse du fichier ${filePath}: ${error.message}`);
    throw error;
  }
}