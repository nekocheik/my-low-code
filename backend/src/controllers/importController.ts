import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import Joi from 'joi';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import logger from '../utils/logger';

/**
 * Configuration de Multer pour stocker les fichiers uploadés dans un dossier temporaire
 */
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Type pour les données du fichier de projet importé
 */
interface ImportedProject {
  projectName: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
      label: string;
      fileName: string;
      imports: string[];
      code: string;
      exportedFunctions: string[];
      lintErrors?: any[];
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    animated?: boolean;
    label?: string;
  }>;
}

/**
 * Importe un projet depuis un fichier JSON
 * @param req - Requête Express avec le fichier uploadé
 * @param res - Réponse Express
 */
export const importProject = [
  upload.single('projectFile'),
  async (req: Request, res: Response) => {
    // Validation des données
    if (!req.file) {
      logger.error('No file uploaded for project import.');
      return res.status(400).json({ message: 'Aucun fichier uploadé.' });
    }

    try {
      const projectData: ImportedProject = JSON.parse(req.file.buffer.toString('utf-8'));

      // Valider la structure du fichier
      const schema = Joi.object({
        projectName: Joi.string().alphanum().min(3).max(30).required(),
        nodes: Joi.array().items(
          Joi.object({
            id: Joi.string().required(),
            type: Joi.string().required(),
            position: Joi.object({
              x: Joi.number().required(),
              y: Joi.number().required(),
            }).required(),
            data: Joi.object({
              label: Joi.string().required(),
              fileName: Joi.string().required(),
              imports: Joi.array().items(Joi.string()).required(),
              code: Joi.string().required(),
              exportedFunctions: Joi.array().items(Joi.string()).required(),
              lintErrors: Joi.array().items(Joi.any()).optional(),
            }).required(),
          })
        ).required(),
        edges: Joi.array().items(
          Joi.object({
            id: Joi.string().required(),
            source: Joi.string().required(),
            target: Joi.string().required(),
            animated: Joi.boolean().optional(),
            label: Joi.string().optional(),
          })
        ).required(),
      });

      const { error } = schema.validate(projectData);
      if (error) {
        logger.error(`Validation error during project import: ${error.details[0].message}`);
        return res.status(400).json({ message: error.details[0].message });
      }

      const { projectName, nodes, edges } = projectData;

      // Vérifier si le projet existe déjà
      const existingProject = await Project.findOne({ name: projectName });
      if (existingProject) {
        logger.warn(`Import project failed: Project "${projectName}" already exists.`);
        return res.status(400).json({ message: 'Le projet existe déjà.' });
      }

      // Créer le dossier du projet
      const projectPath = path.join(__dirname, '..', 'projects', projectName);
      await fs.mkdir(projectPath, { recursive: true });
      logger.info(`Project directory created at: ${projectPath}`);

      // Créer les fichiers des nœuds
      for (const node of nodes) {
        const filePath = path.join(projectPath, node.data.fileName);
        await fs.writeFile(filePath, node.data.code);
        logger.info(`File created for node "${node.id}" at: ${filePath}`);
      }

      // Initialiser un package.json
      await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify({
        name: projectName,
        version: "1.0.0",
        main: "index.js",
        scripts: {
          start: "node index.js"
        },
        dependencies: {}
      }, null, 2));
      logger.info(`package.json created at: ${path.join(projectPath, 'package.json')}`);

      // Enregistrer le projet dans la base de données
      const newProject = new Project({
        name: projectName,
      });

      const savedProject = await newProject.save();
      logger.info(`Project "${projectName}" saved to database.`);

      // Enregistrer les nœuds dans la base de données
      for (const node of nodes) {
        const newNode = new NodeModel({
          project: savedProject._id,
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        });
        await newNode.save();
        logger.info(`Node "${node.id}" saved to database.`);
      }

      // Vous pouvez également enregistrer les arêtes si vous avez un modèle pour les arêtes

      res.status(201).json({ message: 'Projet importé avec succès.', project: savedProject });
    } catch (error: any) {
      logger.error(`Error during project import: ${error.message}`);
      res.status(500).json({ message: 'Erreur lors de l\'importation du projet.', error: error.message });
    }
  }
];
