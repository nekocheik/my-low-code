import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import EdgeModel from '../models/Edge';
import logger from '../utils/logger';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import simpleGit, { SimpleGit, SimpleGitOptions, GitError } from 'simple-git';
import { ParserOptions } from '@babel/parser';
import { promisify } from 'util';
import { throttle } from 'lodash';

// Configuration et constantes
const execAsync = promisify(exec);
const CONCURRENT_LIMIT = 10;
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

// Enum pour les codes d'erreur
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  GIT_ERROR = 'GIT_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  DB_ERROR = 'DB_ERROR'
}

// Configuration Git optimisée
const gitOptions: Partial<SimpleGitOptions> = {
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
  trimmed: false,
  timeout: {
    block: 30000 // 30 secondes
  }
};

const git: SimpleGit = simpleGit(gitOptions);

// Configuration Babel optimisée
const babelConfig: ParserOptions = {
  sourceType: 'module',
  plugins: [
    'typescript',
    'jsx',
    ['decorators', { legacy: true }]
  ] as any[],
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true
};

// Interfaces
interface FileAnalysis {
  timestamp: number;
  data: {
    exports: string[];
    imports: string[];
  };
}

interface ProjectAnalysisResult {
  processedFiles: number;
  errors?: Array<{ file: string; error: string }>;
}

interface ProjectNode {
  project: string;
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    fileName: string;
    imports: string[];
    code: string;
    exportedFunctions: string[];
    lintErrors: any[];
  };
}

interface ProjectEdge {
  project: string;
  id: string;
  source: string;
  target: string;
  animated: boolean;
  label: string;
}

// Validation des fichiers améliorée
const isValidFile = (fileName: string): boolean => {
  const invalidPatterns = [
    /\.log$/i,
    /\.(test|spec)\.(js|ts|jsx|tsx)$/i,
    /^(temp|tmp)\//,
    /node_modules/,
    /\.git/,
    /\.env/
  ];
  const maxPathLength = process.platform === 'win32' ? 260 : 4096;
  
  return !invalidPatterns.some(pattern => pattern.test(fileName)) &&
         fileName.length < maxPathLength &&
         !path.isAbsolute(fileName);
};

// Cache pour les fichiers analysés
const fileAnalysisCache = new Map<string, FileAnalysis>();

// Fonction d'extraction des fonctions exportées
async function extractExportedFunctions(filePath: string): Promise<string[]> {
  try {
    const stats = await fsPromises.stat(filePath);
    const cacheKey = `${filePath}:${stats.mtime.getTime()}`;
    const cached = fileAnalysisCache.get(cacheKey);

    if (cached) {
      return cached.data.exports;
    }

    if (stats.size > FILE_SIZE_LIMIT) {
      logger.warn(`File too large to analyze: ${filePath}`);
      return [];
    }

    const code = await fsPromises.readFile(filePath, 'utf-8');
    if (!code.trim()) {
      return [];
    }

    const exportedFunctions: string[] = [];
    try {
      const ast = parse(code, babelConfig);

      traverse(ast, {
        ExportNamedDeclaration(path) {
          if (path.node.declaration?.type === 'FunctionDeclaration') {
            const funcName = path.node.declaration.id?.name;
            if (funcName) exportedFunctions.push(funcName);
          }
        },
        ExportDefaultDeclaration(path) {
          if (path.node.declaration?.type === 'FunctionDeclaration') {
            const funcName = path.node.declaration.id?.name;
            if (funcName) exportedFunctions.push(funcName);
          }
        }
      });

      fileAnalysisCache.set(cacheKey, {
        timestamp: Date.now(),
        data: { exports: exportedFunctions, imports: [] }
      });

      return exportedFunctions;
    } catch (parseError) {
      logger.error(`Parse error in ${filePath}:`, parseError);
      return [];
    }
  } catch (error) {
    logger.error(`Error extracting functions from ${filePath}:`, error);
    return [];
  }
}

// Analyse des fichiers du projet
async function analyzeProjectFiles(projectPath: string, projectId: string): Promise<ProjectAnalysisResult> {
  const errors: Array<{ file: string; error: string }> = [];
  const processedFiles = new Set<string>();

  async function* findJsTsFiles(dir: string): AsyncGenerator<string> {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        yield* findJsTsFiles(fullPath);
      } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
        if (isValidFile(entry.name)) {
          yield fullPath;
        }
      }
    }
  }

  async function processBatch(files: string[]) {
    const nodes: ProjectNode[] = [];
    const edges: ProjectEdge[] = [];

    await Promise.all(files.map(async (filePath) => {
      try {
        if (processedFiles.has(filePath)) return;
        processedFiles.add(filePath);

        const stats = await fsPromises.stat(filePath);
        if (stats.size > FILE_SIZE_LIMIT) {
          throw new Error('File too large');
        }

        const content = await fsPromises.readFile(filePath, 'utf-8');
        if (!content.trim()) return;

        const exportedFunctions = await extractExportedFunctions(filePath);
        const relativeFilePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
        
        const node: ProjectNode = {
          project: projectId,
          id: crypto.randomUUID(),
          type: 'code',
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          data: {
            label: path.basename(filePath),
            fileName: relativeFilePath,
            imports: [],
            code: content,
            exportedFunctions,
            lintErrors: []
          }
        };

        try {
          const ast = parse(content, babelConfig);
          traverse(ast, {
            ImportDeclaration(path) {
              const importSource = path.node.source.value;
              node.data.imports.push(importSource);

              const targetPath = resolveImportPath(projectPath, filePath, importSource);
              if (targetPath) {
                edges.push({
                  project: projectId,
                  id: `${relativeFilePath}_to_${targetPath}`,
                  source: relativeFilePath,
                  target: targetPath,
                  animated: false,
                  label: 'imports'
                });
              }
            }
          });
        } catch (parseError) {
          logger.error(`Parse error in ${filePath}:`, parseError);
        }

        nodes.push(node);
      } catch (error: any) {
        errors.push({ file: filePath, error: error.message });
      }
    }));

    if (nodes.length > 0) {
      await NodeModel.bulkWrite(
        nodes.map(node => ({
          updateOne: {
            filter: { project: node.project, id: node.id },
            update: { $set: node },
            upsert: true
          }
        }))
      );
    }

    if (edges.length > 0) {
      await EdgeModel.bulkWrite(
        edges.map(edge => ({
          updateOne: {
            filter: { project: edge.project, id: edge.id },
            update: { $set: edge },
            upsert: true
          }
        }))
      );
    }
  }

  const filesBatch: string[] = [];
  for await (const file of findJsTsFiles(projectPath)) {
    filesBatch.push(file);
    if (filesBatch.length >= CONCURRENT_LIMIT) {
      await processBatch([...filesBatch]);
      filesBatch.length = 0;
    }
  }

  if (filesBatch.length > 0) {
    await processBatch(filesBatch);
  }

  return {
    processedFiles: processedFiles.size,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Git handlers
export const pullFromGit = async (req: Request, res: Response) => {
  const { repoUrl } = req.body;

  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'URL du dépôt Git invalide'
    });
  }

  const projectName = path.basename(repoUrl, '.git')
    .replace(/[^a-zA-Z0-9-_]/g, '_');
  const projectPath = path.join(__dirname, '..', 'projects', projectName);

  try {
    const projectExists = await fsPromises.access(projectPath)
      .then(() => true)
      .catch(() => false);

    if (projectExists) {
      await git.cwd(projectPath);
      const status = await git.status();
      
      if (!status.isClean()) {
        throw new Error('Working directory is not clean');
      }
      
      await git.pull(['--ff-only', '--quiet']);
    } else {
      await git.clone(repoUrl, projectPath, [
        '--depth', '1',
        '--single-branch',
        '--quiet'
      ]);
    }

    const project = await Project.findOneAndUpdate(
      { name: projectName },
      { name: projectName },
      { upsert: true, new: true }
    );

    const shouldInstall = await checkNeedsDependencyInstall(projectPath);
    if (shouldInstall) {
      await installDependencies(projectPath);
    }

    const analysisResult = await analyzeProjectFiles(projectPath, project._id.toString());

    res.json({
      message: 'Projet importé avec succès',
      projectName,
      analysis: analysisResult
    });
  } catch (error) {
    handleGitError(error, res);
  }
};

export const commitChanges = async (req: Request, res: Response) => {
  const { projectName, commitMessage } = req.body;

  if (!projectName || !commitMessage?.trim()) {
    return res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Nom du projet et message de commit requis'
    });
  }

  const projectPath = path.join(__dirname, '..', 'projects', projectName);

  try {
    await git.cwd(projectPath);
    const status = await git.status();

    if (status.isClean()) {
      return res.json({ message: 'Aucun changement à commiter' });
    }

    await git.add('.');
    await git.commit(commitMessage.trim(), {
      '--no-verify': null,
      '--quiet': null
    });

    res.json({ message: 'Changements commités avec succès' });
  } catch (error) {
    handleGitError(error, res);
  }
};

export const pushChanges = async (req: Request, res: Response) => {
  const { projectName } = req.body;

  if (!projectName) {
    return res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Nom du projet requis'
    });
  }

  const projectPath = path.join(__dirname, '..', 'projects', projectName);

  try {
    await git.cwd(projectPath);
    await git.push(['--quiet', '--force-with-lease']);
    
    res.json({ message: 'Changements poussés avec succès' });
  } catch (error) {
    handleGitError(error, res);
  }
};

// Utility functions
function handleGitError(error: unknown, res: Response) {
  logger.error('Git error:', error);
  
  if (error instanceof GitError) {
    res.status(400).json({
      code: ErrorCode.GIT_ERROR,
      message: 'Erreur Git',
      details: error.message
    });
  } else {
    res.status(500).json({
      code: ErrorCode.GIT_ERROR,
      message: 'Erreur interne',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkNeedsDependencyInstall(projectPath: string): Promise<boolean> {
  const packageLockPath = path.join(projectPath, 'package-lock.json');
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  
  return !(await fsPromises.access(packageLockPath).then(() => true).catch(() => false) &&
           await fsPromises.access(nodeModulesPath).then(() => true).catch(() => false));
}

async function installDependencies(projectPath: string): Promise<void> {
  try {
    await execAsync('npm install --quiet', {
      cwd: projectPath,
      timeout: 300000, // 5 minutes
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });
  } catch (error) {
    throw new Error(`Erreur d'installation des dépendances: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function resolveImportPath(projectPath: string, currentFile: string, importPath: string): string | null {
  try {
    if (importPath.startsWith('.')) {
      const absolutePath = path.resolve(path.dirname(currentFile), importPath);
      return path.relative(projectPath, absolutePath).replace(/\\/g, '/');
    }
    return null;
  } catch {
    return null;
  }
}