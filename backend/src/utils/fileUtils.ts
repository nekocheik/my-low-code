// backend/src/utils/fileUtils.ts

import fs from 'fs/promises';
import path from 'path';
import logger from './logger';

/**
 * Vérifie si un fichier existe.
 * @param filePath - Chemin du fichier à vérifier.
 * @returns Promise<boolean> indiquant si le fichier existe.
 */
export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Écrit du contenu dans un fichier.
 * @param filePath - Chemin du fichier à écrire.
 * @param content - Contenu à écrire dans le fichier.
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  logger.info(`Attempting to write file: ${filePath}`);
  try {
    await fs.writeFile(filePath, content);
    logger.info(`File successfully written at ${filePath}`);
  } catch (error) {
    logger.error(`Error writing file at ${filePath}: ${(error as Error).message}`);
    throw error; // Propager l'erreur
  }
}

/**
 * Résout le chemin du fichier pour un projet donné.
 * @param project - Nom du projet.
 * @param fileName - Nom du fichier.
 * @returns Chemin complet du fichier.
 */
export function getFilePath(project: string, fileName: string): string {
  const projectPath = path.join(__dirname, '..', 'projects', project);
  logger.info(`Building file path for project: ${project}, File name: ${fileName}`);
  return path.join(projectPath, fileName);
}
