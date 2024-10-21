// backend/src/controllers/fileController.ts

import { Request, Response } from 'express';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import { getFilePath, writeFile, checkFileExists } from '../utils/fileUtils';
import fs from 'fs/promises';
import Joi from 'joi';
import logger from '../utils/logger';

/**
 * Met à jour un fichier de nœud spécifique dans un projet.
 * @param req - Requête Express contenant project, nodeId et nodeData dans le corps.
 * @param res - Réponse Express.
 */
export const updateFile = async (req: Request, res: Response) => {
  const { project, nodeId, nodeData } = req.body;

  // Validation des données entrantes
  const schema = Joi.object({
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
  });

  const { error } = schema.validate({ project, nodeId, nodeData });
  if (error) {
    logger.error(`Validation error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    // Trouver et mettre à jour le nœud dans la base de données
    const updatedNode = await NodeModel.findOneAndUpdate(
      { project, id: nodeId },
      { $set: { data: nodeData } },
      { new: true, runValidators: true }
    );

    if (!updatedNode) {
      logger.warn(`Node not found: project="${project}", nodeId="${nodeId}"`);
      return res.status(404).json({ message: 'Node not found.' });
    }

    // Résoudre le chemin du fichier
    const filePath = getFilePath(project, nodeData.fileName);
    logger.info(`Resolved file path: ${filePath}`);

    // Vérifier si le fichier existe
    const fileExists = await checkFileExists(filePath);
    let currentFileContent = '';

    // Lire le contenu actuel du fichier si il existe
    if (fileExists) {
      currentFileContent = await fs.readFile(filePath, 'utf8');
      logger.info(`Current file content loaded from: ${filePath}`);
    } else {
      logger.warn(`File does not exist: ${filePath}`);
    }

    // Écrire le fichier seulement si le contenu a changé
    if (currentFileContent !== nodeData.code) {
      await writeFile(filePath, nodeData.code);
      logger.info(`File updated: ${filePath}`);
    } else {
      logger.info('No changes in file content, skipping file write.');
    }

    res.json({ message: 'Node updated successfully.', node: updatedNode });
  } catch (error: any) {
    logger.error(`Error updating file: ${error.message}`);
    res.status(500).json({ message: 'Error updating file.', error: error.message });
  }
};

/**
 * Récupère les fonctions accessibles pour un nœud spécifique.
 * (À implémenter selon vos besoins spécifiques)
 * @param req - Requête Express.
 * @param res - Réponse Express.
 */
export const getAccessibleFunctions = async (req: Request, res: Response) => {
  const { project, nodeId } = req.query;

  if (!project || typeof project !== 'string' || !nodeId || typeof nodeId !== 'string') {
    logger.error('Invalid query parameters for getAccessibleFunctions.');
    return res.status(400).json({ message: 'Project and nodeId are required and must be strings.' });
  }

  try {
    // Logique pour récupérer les fonctions accessibles
    // Cela dépend de la structure de vos nœuds et de comment les fonctions sont exposées

    // Exemple hypothétique :
    const node = await NodeModel.findOne({ project, id: nodeId });
    if (!node) {
      logger.warn(`Node not found for accessible functions: project="${project}", nodeId="${nodeId}"`);
      return res.status(404).json({ message: 'Node not found.' });
    }

    // Supposons que les fonctions exportées sont stockées dans node.data.exportedFunctions
    const accessibleFunctions = node.data.exportedFunctions;

    res.json({ accessibleFunctions });
  } catch (error: any) {
    logger.error(`Error fetching accessible functions: ${error.message}`);
    res.status(500).json({ message: 'Error fetching accessible functions.', error: error.message });
  }
};

/**
 * Met à jour un fichier de nœud spécifique. (Alternative ou extension de updateFile)
 * @param req - Requête Express.
 * @param res - Réponse Express.
 */
export const updateNode = async (req: Request, res: Response) => {
  console.log('Request received for updating node');
  const { project, nodeId, nodeData } = req.body;

  // Log the incoming data
  console.log('Incoming request data:', { project, nodeId, nodeData });

  if (!project || !nodeId || !nodeData) {
    console.log('Validation failed: Missing project, nodeId, or nodeData');
    return res.status(400).json({ message: 'Project, nodeId, and nodeData are required.' });
  }

  try {
    // Check that all required fields in nodeData are present
    const requiredFields = ['label', 'fileName', 'code'];
    for (const field of requiredFields) {
      if (!nodeData[field]) {
        console.log(`Validation failed: Field '${field}' is missing in nodeData`);
        return res.status(400).json({ message: `Field '${field}' is required in nodeData.` });
      }
    }

    // Try to find and update the node in the database
    console.log('Finding node in the database...');
    const updatedNode = await NodeModel.findOneAndUpdate(
      { project, id: nodeId },
      { $set: { data: nodeData } },
      { new: true, runValidators: true }
    );

    if (!updatedNode) {
      console.log('Node not found in the database.');
      return res.status(404).json({ message: 'Node not found.' });
    }

    console.log('Node successfully updated in the database:', updatedNode);

    // Now write the updated code to the file system
    const filePath = getFilePath(project, nodeData.fileName);
    console.log('Resolved file path:', filePath);

    await writeFile(filePath, nodeData.code);
    console.log(`File successfully written to path: ${filePath}`);

    res.json({ message: 'Node updated successfully.', node: updatedNode });
  } catch (error) {
    // Catch and log any errors that occur
    console.error('Error updating node or writing file:', error);
    res.status(500).json({ message: 'Error updating node or writing file.', error: error.message });
  }
};
