
import fs from 'fs/promises';
import path from 'path';
import logger from './logger';
import mkdirp from 'mkdirp'; // Ajoutez cette dépendance si ce n'est pas déjà fait

/**
 * Résout le chemin du fichier pour un projet donné.
 * @param project - Nom du projet.
 * @param fileName - Nom du fichier.
 * @returns Chemin complet du fichier.
 */
export async function getFilePath(project: string, fileName: string): Promise<string> {
  // Le dossier de base des projets
  const projectsBasePath = path.join(__dirname, '..', 'projects');
  const projectPath = path.join(projectsBasePath, project);
  
  // Construire le chemin complet du fichier
  const fullPath = path.join(projectPath, fileName);
  
  // S'assurer que le dossier parent existe
  const dirPath = path.dirname(fullPath);
  await mkdirp(dirPath);
  
  logger.info(`Built file path: ${fullPath}`);
  return fullPath;
}

/**
 * Écrit du contenu dans un fichier.
 * @param filePath - Chemin du fichier à écrire.
 * @param content - Contenu à écrire dans le fichier.
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  logger.info(`Attempting to write file: ${filePath}`);
  try {
    // S'assurer que le dossier parent existe
    const dirPath = path.dirname(filePath);
    await mkdirp(dirPath);
    
    // Écrire le fichier
    await fs.writeFile(filePath, content);
    logger.info(`File successfully written at ${filePath}`);
  } catch (error) {
    logger.error(`Error writing file at ${filePath}: ${(error as Error).message}`);
    throw error;
  }
}