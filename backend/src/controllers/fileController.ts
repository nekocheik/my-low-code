// backend/src/controllers/fileController.ts

import { Request, Response, NextFunction } from 'express';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import { getFilePath, writeFile } from '../utils/fileUtils';
import fs from 'fs/promises';
import Joi from 'joi';
import logger from '../utils/logger';
import path from 'path';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import NodeCache from 'node-cache';

// Configuration du cache
const fileCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

// Enum pour les codes d'erreur
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Configuration du rate limiter
export const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre
  message: 'Too many update requests from this IP'
});

// Configuration de la compression
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024 // Compresse seulement les réponses plus grandes que 1KB
});

// Middleware de performance
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1e6;
    logger.info(`${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
  });
  next();
};

// Schémas de validation
const NODE_DATA_SCHEMA = Joi.object({
  project: Joi.string().required(),
  nodeId: Joi.string().required(),
  nodeData: Joi.object({
    label: Joi.string().required(),
    fileName: Joi.string().required(),
    imports: Joi.array().items(Joi.string()).required(),
    code: Joi.string().required(),
    exportedFunctions: Joi.array().items(Joi.string()).required(),
    lintErrors: Joi.array().items(Joi.any()).optional(),
  }).required(),
}).cache();

// Gestionnaire d'erreurs central
const handleError = (error: any, res: Response) => {
  const errorCode = error.code || ErrorCode.UNKNOWN_ERROR;
  logger.error(`${errorCode}: ${error.message}`);
  const status = error.status || 500;
  res.status(status).json({
    code: errorCode,
    message: error.message,
    details: error.details || null
  });
};

// Fonctions utilitaires
const validateFilePath = (filePath: string): boolean => {
  const normalizedPath = path.normalize(filePath);
  const projectRoot = path.normalize(path.join(__dirname, '..', 'projects'));
  return normalizedPath.startsWith(projectRoot) && !normalizedPath.includes('..');
};

const validateProject = async (project: string): Promise<boolean> => {
  try {
    const projectExists = await Project.exists({ name: project });
    if (!projectExists) return false;
    
    const projectPath = path.join(__dirname, '..', 'projects', project);
    await fs.access(projectPath);
    
    return true;
  } catch (error) {
    logger.error(`Project validation error: ${error}`);
    return false;
  }
};

const checkFileChanges = async (filePath: string, newContent: string): Promise<boolean> => {
  try {
    const fileExists = await fs.access(filePath)
      .then(() => true)
      .catch(() => false);
    
    if (!fileExists) return true;

    const currentContent = await fs.readFile(filePath, 'utf8');
    return currentContent !== newContent;
  } catch (error) {
    logger.error(`Error checking file changes: ${error}`);
    return true;
  }
};

const getCachedFile = async (filePath: string): Promise<string | null> => {
  const cached = fileCache.get<string>(filePath);
  if (cached) return cached;
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    fileCache.set(filePath, content);
    return content;
  } catch (error) {
    logger.error(`Cache miss error: ${error}`);
    return null;
  }
};

/**
 * Met à jour un fichier de nœud spécifique dans un projet.
 */
export const updateFile = async (req: Request, res: Response) => {
  const { project, nodeId, nodeData } = req.body;

  try {
    // Validation des données entrantes
    const { error } = NODE_DATA_SCHEMA.validate({ project, nodeId, nodeData });
    if (error) {
      throw { 
        code: ErrorCode.VALIDATION_ERROR, 
        status: 400, 
        message: error.details[0].message 
      };
    }

    // Validation du projet
    const isValidProject = await validateProject(project);
    if (!isValidProject) {
      throw { 
        code: ErrorCode.PROJECT_NOT_FOUND, 
        status: 404, 
        message: 'Project not found.' 
      };
    }

    // Mise à jour du nœud
    const updatedNode = await NodeModel.findOneAndUpdate(
      { project, id: nodeId },
      { $set: { data: nodeData } },
      { new: true, runValidators: true }
    );

    if (!updatedNode) {
      throw { 
        code: ErrorCode.NODE_NOT_FOUND, 
        status: 404, 
        message: 'Node not found.' 
      };
    }

    // Gestion du fichier
    const filePath = await getFilePath(project, nodeData.fileName);
    if (!validateFilePath(filePath)) {
      throw { 
        code: ErrorCode.VALIDATION_ERROR, 
        status: 400, 
        message: 'Invalid file path.' 
      };
    }

    // Vérifier les changements dans le fichier
    const hasChanges = await checkFileChanges(filePath, nodeData.code);
    if (hasChanges) {
      await writeFile(filePath, nodeData.code);
      fileCache.del(filePath); // Invalider le cache
      logger.info(`File updated: ${filePath}`);
    } else {
      logger.info('No changes in file content, skipping file write.');
    }

    res.json({ message: 'Node updated successfully.', node: updatedNode });
  } catch (error: any) {
    handleError(error, res);
  }
};

/**
 * Récupère les fonctions accessibles pour un nœud spécifique.
 */
export const getAccessibleFunctions = async (req: Request, res: Response) => {
  const { project, nodeId } = req.query;

  try {
    if (!project || typeof project !== 'string' || !nodeId || typeof nodeId !== 'string') {
      throw { 
        code: ErrorCode.VALIDATION_ERROR, 
        status: 400, 
        message: 'Project and nodeId are required and must be strings.' 
      };
    }

    const node = await NodeModel.findOne({ project, id: nodeId });
    if (!node) {
      throw { 
        code: ErrorCode.NODE_NOT_FOUND, 
        status: 404, 
        message: 'Node not found.' 
      };
    }

    const accessibleFunctions = node.data.exportedFunctions;
    res.json({ accessibleFunctions });
  } catch (error: any) {
    handleError(error, res);
  }
};

/**
 * Met à jour un nœud spécifique.
 */
export const updateNode = async (req: Request, res: Response) => {
  const { project, nodeId, nodeData } = req.body;

  try {
    if (!project || !nodeId || !nodeData) {
      throw { 
        code: ErrorCode.VALIDATION_ERROR, 
        status: 400, 
        message: 'Project, nodeId, and nodeData are required.' 
      };
    }

    // Validation des champs requis
    const requiredFields = ['label', 'fileName', 'code'];
    for (const field of requiredFields) {
      if (!nodeData[field]) {
        throw { 
          code: ErrorCode.VALIDATION_ERROR, 
          status: 400, 
          message: `Field '${field}' is required in nodeData.` 
        };
      }
    }

    const updatedNode = await NodeModel.findOneAndUpdate(
      { project, id: nodeId },
      { $set: { data: nodeData } },
      { new: true, runValidators: true }
    );

    if (!updatedNode) {
      throw { 
        code: ErrorCode.NODE_NOT_FOUND, 
        status: 404, 
        message: 'Node not found.' 
      };
    }

    const filePath = await getFilePath(project, nodeData.fileName);
    if (!validateFilePath(filePath)) {
      throw { 
        code: ErrorCode.VALIDATION_ERROR, 
        status: 400, 
        message: 'Invalid file path.' 
      };
    }

    await writeFile(filePath, nodeData.code);
    fileCache.del(filePath); // Invalider le cache
    
    res.json({ message: 'Node updated successfully.', node: updatedNode });
  } catch (error: any) {
    handleError(error, res);
  }
};

/**
 * Liste tous les fichiers d'un projet.
 */
export const listFiles = async (req: Request, res: Response) => {
  const { project } = req.params;

  try {
    if (!project) {
      throw { 
        code: ErrorCode.VALIDATION_ERROR, 
        status: 400, 
        message: 'Project is required.' 
      };
    }

    const isValidProject = await validateProject(project);
    if (!isValidProject) {
      throw { 
        code: ErrorCode.PROJECT_NOT_FOUND, 
        status: 404, 
        message: 'Project not found.' 
      };
    }

    const projectPath = path.join(__dirname, '..', 'projects', project);
    const files = await getAllFiles(projectPath, ['node_modules'], 5);
    res.json({ files });
  } catch (error: any) {
    handleError(error, res);
  }
};

/**
 * Fonction récursive pour obtenir tous les fichiers.
 */
async function getAllFiles(dir: string, exclude: string[] = [], maxDepth: number = 5): Promise<string[]> {
  if (maxDepth < 0) return [];
  
  const results: string[] = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  
  await Promise.all(list.map(async dirent => {
    if (exclude.includes(dirent.name)) return;
    
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, exclude, maxDepth - 1);
      results.push(...subFiles);
    } else {
      results.push(path.relative(dir, fullPath));
    }
  }));

  return results;
}

// Export des types pour la documentation
export type { Request, Response, NextFunction };