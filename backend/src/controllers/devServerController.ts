// backend/src/controllers/devServerController.ts

import { Request, Response } from 'express';
import { exec, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import portfinder from 'portfinder';
import logger from '../utils/logger'; // Assurez-vous d'avoir configuré un logger, par exemple avec winston

let devServerProcess: ChildProcess | null = null;

/**
 * Démarre un serveur de développement pour un projet donné.
 * @param req - Requête Express contenant le nom du projet dans le corps.
 * @param res - Réponse Express.
 */
export const startDevServer = async (req: Request, res: Response) => {
  const { project } = req.body;

  if (!project) {
    logger.error('Error: Project is required to start the development server.');
    return res.status(400).json({ message: 'Project is required.' });
  }

  if (devServerProcess) {
    logger.warn('Attempted to start development server, but one is already running.');
    return res.status(400).json({ message: 'Development server is already running.' });
  }

  const projectPath = path.join(__dirname, '..', 'projects', project);

  try {
    // Vérifier si le dossier du projet existe
    await fs.access(projectPath);
    logger.info(`Starting development server for project: ${project} at path: ${projectPath}`);
  } catch (error) {
    logger.error(`Project directory does not exist: ${projectPath}`);
    return res.status(404).json({ message: 'Project directory does not exist.' });
  }

  try {
    // Trouver un port libre à partir de 4000
    const port = await portfinder.getPortPromise({ port: 4000 });

    // Commande pour démarrer le serveur de développement (par exemple, avec nodemon)
    const command = `npx nodemon index.js`; // Assurez-vous que 'index.js' est le fichier d'entrée de votre projet

    devServerProcess = exec(`PORT=${port} ${command}`, { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Development server error: ${error.message}`);
        return;
      }
      if (stderr) {
        logger.error(`Development server stderr: ${stderr}`);
        return;
      }
      logger.info(`Development server stdout: ${stdout}`);
    });

    // Gestion de la sortie du processus
    devServerProcess.on('exit', (code, signal) => {
      logger.info(`Development server exited with code ${code} and signal ${signal}`);
      devServerProcess = null;
    });

    logger.info(`Development server started successfully on port ${port}`);
    res.json({ message: 'Development server started successfully.', port });
  } catch (error: any) {
    logger.error(`Failed to start development server: ${error.message}`);
    res.status(500).json({ message: 'Failed to start development server.', error: error.message });
  }
};

/**
 * Arrête le serveur de développement en cours.
 * @param req - Requête Express.
 * @param res - Réponse Express.
 */
export const stopDevServer = async (req: Request, res: Response) => {
  if (!devServerProcess) {
    logger.warn('Attempted to stop development server, but none is running.');
    return res.status(400).json({ message: 'Development server is not running.' });
  }

  try {
    devServerProcess.kill();
    logger.info('Development server stopped successfully.');
    devServerProcess = null;
    res.json({ message: 'Development server stopped successfully.' });
  } catch (error: any) {
    logger.error(`Failed to stop development server: ${error.message}`);
    res.status(500).json({ message: 'Failed to stop development server.', error: error.message });
  }
};
