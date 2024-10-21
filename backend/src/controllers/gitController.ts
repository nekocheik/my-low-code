// backend/src/controllers/gitController.ts

import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import EdgeModel from '../models/Edge';
import logger from '../utils/logger';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import simpleGit, { SimpleGit } from 'simple-git';

const git: SimpleGit = simpleGit();

/**
 * Fonction pour extraire les fonctions exportées d'un fichier.
 */
async function extractExportedFunctions(filePath: string): Promise<string[]> {
  const code = await fs.readFile(filePath, 'utf-8');
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

/**
 * Fonction pour analyser les fichiers et générer les nœuds et arêtes.
 */
async function analyzeProjectFiles(projectPath: string, projectId: string) {
  // Récupérer tous les fichiers .js et .ts, y compris dans les sous-dossiers
  const jsTsFiles: string[] = [];

  async function getJsTsFiles(dirPath: string) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await getJsTsFiles(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        jsTsFiles.push(fullPath);
      }
    }
  }

  await getJsTsFiles(projectPath);

  const nodes: any[] = [];
  const edges: any[] = [];

  for (const filePath of jsTsFiles) {
    const content = await fs.readFile(filePath, 'utf-8');
    const exportedFunctions = await extractExportedFunctions(filePath);

    // Extraire les imports pour créer des arêtes
    const imports: string[] = [];
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        imports.push(source);
      },
    });

    // Créer un nœud pour ce fichier
    const relativeFilePath = path.relative(projectPath, filePath);
    const nodeId = relativeFilePath.replace(/\\/g, '/'); // Utiliser le chemin relatif comme ID
    const newNode = {
      project: projectId,
      id: nodeId,
      type: 'code',
      position: { x: Math.random() * 500, y: Math.random() * 500 }, // Position aléatoire ou basée sur une logique
      data: {
        label: path.basename(filePath),
        fileName: relativeFilePath,
        imports: imports,
        code: content,
        exportedFunctions: exportedFunctions,
      },
    };

    nodes.push(newNode);

    // Créer des arêtes basées sur les imports
    for (const imp of imports) {
      // Résoudre le chemin relatif ou les modules
      let target = imp;
      if (imp.startsWith('./') || imp.startsWith('../')) {
        const importPath = path.resolve(path.dirname(filePath), imp);
        const importFile = path.relative(projectPath, importPath).replace(/\\/g, '/');
        target = importFile;
      }

      edges.push({
        project: projectId,
        id: `edge_${nodeId}_to_${target}`,
        source: nodeId,
        target: target,
        animated: false,
        label: 'imports',
      });
    }
  }

  // Enregistrer les nœuds dans la base de données
  for (const node of nodes) {
    await NodeModel.findOneAndUpdate(
      { project: node.project, id: node.id },
      node,
      { upsert: true, new: true, runValidators: true }
    );
    logger.info(`Nœud créé/mis à jour pour le fichier: ${node.id}`);
  }

  // Enregistrer les arêtes dans la base de données
  for (const edge of edges) {
    await EdgeModel.findOneAndUpdate(
      { project: edge.project, id: edge.id },
      edge,
      { upsert: true, new: true, runValidators: true }
    );
    logger.info(`Arête créée/mise à jour: ${edge.id}`);
  }
}

/**
 * Cloner ou mettre à jour un dépôt Git et analyser le projet.
 */
export const pullFromGit = async (req: Request, res: Response) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    logger.warn('Tentative de pull Git sans URL de dépôt');
    return res.status(400).json({ error: 'URL du dépôt Git requise' });
  }

  const projectName = path.basename(repoUrl, '.git');
  const projectPath = path.join(__dirname, '..', 'projects', projectName);

  try {
    // Cloner ou mettre à jour le projet
    const projectExists = await fs.access(projectPath).then(() => true).catch(() => false);
    if (projectExists) {
      await git.cwd(projectPath);
      await git.pull();
      logger.info(`Git pull réussi pour le projet: ${projectName}`);
    } else {
      await git.clone(repoUrl, projectPath);
      logger.info(`Git clone réussi: ${repoUrl} dans ${projectPath}`);
    }

    // Créer ou mettre à jour le projet dans la base de données
    let project = await Project.findOne({ name: projectName });
    if (!project) {
      project = new Project({ name: projectName });
      await project.save();
      logger.info(`Nouveau projet créé dans la base de données: ${projectName}`);
    }

    // Installer les dépendances du projet
    await new Promise<void>((resolve, reject) => {
      exec('npm install', { cwd: projectPath }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Erreur lors de l'installation des dépendances: ${error.message}`);
          return reject(error);
        }
        logger.info(`npm install réussi pour le projet: ${projectName}`);
        resolve();
      });
    });

    // Analyser le projet et créer/mettre à jour les nœuds et arêtes
    await analyzeProjectFiles(projectPath, project._id.toString());

    res.json({ message: 'Projet importé et installé avec succès', projectName });
  } catch (error: any) {
    logger.error(`Erreur lors de l'importation du projet: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de l\'importation du projet', error: error.message });
  }
};

/**
 * Commiter les changements locaux avec un message de commit.
 */
export const commitChanges = async (req: Request, res: Response) => {
  const { projectName, commitMessage } = req.body;

  if (!projectName || !commitMessage) {
    return res.status(400).json({ message: 'Le nom du projet et le message de commit sont requis.' });
  }

  const projectPath = path.join(__dirname, '..', 'projects', projectName);

  try {
    await git.cwd(projectPath);
    await git.add('.');
    await git.commit(commitMessage);

    logger.info(`Changements commités dans le projet ${projectName} avec le message: ${commitMessage}`);
    res.json({ message: 'Changements commités avec succès.' });
  } catch (error: any) {
    logger.error(`Erreur lors du commit des changements: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors du commit des changements.', error: error.message });
  }
};

/**
 * Pousser les changements locaux vers le dépôt distant.
 */
export const pushChanges = async (req: Request, res: Response) => {
  const { projectName } = req.body;

  if (!projectName) {
    return res.status(400).json({ message: 'Le nom du projet est requis.' });
  }

  const projectPath = path.join(__dirname, '..', 'projects', projectName);

  try {
    await git.cwd(projectPath);
    await git.push();

    logger.info(`Changements poussés vers le dépôt distant pour le projet ${projectName}`);
    res.json({ message: 'Changements poussés avec succès.' });
  } catch (error: any) {
    logger.error(`Erreur lors du push des changements: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors du push des changements.', error: error.message });
  }
};
