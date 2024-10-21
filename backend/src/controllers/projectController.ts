import { Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import Joi from 'joi';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import Edge from '../models/Edge';
import simpleGit, { SimpleGit } from 'simple-git';
import logger from '../utils/logger';



// Initialiser simple-git avec l'option de journalisation
const git: SimpleGit = simpleGit();

/**
 * Crée un nouveau projet.
 * @param req - Requête Express contenant projectCode, projectName et gitRepo dans le corps.
 * @param res - Réponse Express.
 */
export const createProject = async (req: Request, res: Response) => {
  const schema = Joi.object({
    projectCode: Joi.string().required(),
    projectName: Joi.string().alphanum().min(3).max(30).required(),
    gitRepo: Joi.string().uri().optional(), // Ajouter un champ pour l'URL du dépôt Git
  });

  const { error } = schema.validate(req.body);
  if (error) {
    logger.error(`Validation error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const { projectCode, projectName, gitRepo } = req.body;

  try {
    // Vérifier si le projet existe déjà
    const existingProject = await Project.findOne({ name: projectName });
    if (existingProject) {
      logger.warn(`Project creation failed: Project "${projectName}" already exists.`);
      return res.status(400).json({ message: 'Le projet existe déjà.' });
    }

    // Créer le dossier du projet
    const projectPath = path.join(__dirname, '..', 'projects', projectName);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
      logger.info(`Project directory created at: ${projectPath}`);
    }

    // Initialiser Git si un dépôt Git est fourni
    if (gitRepo) {
      try {
        await git.clone(gitRepo, projectPath);
        logger.info(`Git repository cloned from ${gitRepo} into ${projectPath}`);
      } catch (gitError: any) {
        logger.error(`Failed to clone Git repository: ${gitError.message}`);
        return res.status(500).json({ message: 'Erreur lors du clonage du dépôt Git.', error: gitError.message });
      }
    }

    // Créer le fichier principal (par exemple, index.ts)
    const mainFilePath = path.join(projectPath, 'index.ts');
    fs.writeFileSync(mainFilePath, projectCode);
    logger.info(`Main file created at: ${mainFilePath}`);

    // Initialiser un package.json
    exec('npm init -y', { cwd: projectPath }, async (err, stdout, stderr) => {
      if (err) {
        logger.error(`Error initializing npm: ${err.message}`);
        return res.status(500).json({ message: 'Erreur lors de l\'initialisation du projet.' });
      }

      logger.info(`npm initialized for project "${projectName}".`);

      try {
        // Enregistrer le projet dans la base de données
        const newProject = new Project({
          name: projectName,
        });

        const savedProject = await newProject.save();
        logger.info(`Project "${projectName}" saved to database.`);

        res.status(201).json({ message: 'Projet créé avec succès.', project: savedProject });
      } catch (saveError: any) {
        logger.error(`Error saving project to database: ${saveError.message}`);
        res.status(500).json({ message: 'Erreur lors de la création du projet.', error: saveError.message });
      }
    });

  } catch (error: any) {
    logger.error(`Error creating project: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de la création du projet.', error: error.message });
  }
};

/**
 * Récupère la liste des projets.
 * @param req - Requête Express.
 * @param res - Réponse Express.
 */
export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await Project.find().select('name createdAt');
    logger.info('Fetched list of projects.');
    res.json(projects);
  } catch (error: any) {
    logger.error(`Error fetching projects: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de la récupération des projets.', error: error.message });
  }
};

/**
 * Installe un package npm dans un projet spécifique.
 * @param req - Requête Express contenant project et packageName dans le corps.
 * @param res - Réponse Express.
 */
export const installPackage = async (req: Request, res: Response) => {
  const schema = Joi.object({
    project: Joi.string().required(),
    packageName: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    logger.error(`Validation error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const { project, packageName } = req.body;

  try {
    // Trouver le projet dans la base de données
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      logger.warn(`Install package failed: Project "${project}" not found.`);
      return res.status(404).json({ message: 'Projet non trouvé.' });
    }

    const projectPath = path.join(__dirname, '..', 'projects', project);

    // Vérifier si le dossier du projet existe
    if (!fs.existsSync(projectPath)) {
      logger.error(`Project directory does not exist: ${projectPath}`);
      return res.status(400).json({ message: 'Le dossier du projet n\'existe pas.' });
    }

    logger.info(`Installing package "${packageName}" in project "${project}".`);

    // Exécuter la commande npm install
    exec(`npm install ${packageName}`, { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error installing package: ${error.message}`);
        return res.status(500).json({ message: 'Erreur lors de l\'installation du package.', stderr: stderr });
      }

      if (stderr) {
        logger.warn(`npm stderr: ${stderr}`);
        // Vous pouvez choisir d'envoyer stderr comme partie de la réponse
      }

      logger.info(`npm stdout: ${stdout}`);
      res.json({ message: `Package "${packageName}" installé avec succès.`, stdout, stderr });
    });
  } catch (error: any) {
    logger.error(`Error installing package: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de l\'installation du package.', error: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  const { projectName } = req.params;
  logger.info(`Attempting to delete project: ${projectName}`);

  try {
    // Supprimer le projet de la base de données
    const project = await Project.findOneAndDelete({ name: projectName });
    if (!project) {
      logger.warn(`Project not found: ${projectName}`);
      return res.status(404).json({ message: 'Projet non trouvé.' });
    }

    logger.info(`Project "${projectName}" deleted from database.`);

    // Supprimer tous les nœuds et arêtes associés
    await NodeModel.deleteMany({ project: project._id });
    await Edge.deleteMany({ project: project._id });
    logger.info(`Associated nodes and edges deleted for project "${projectName}".`);

    // Supprimer le dossier du projet
    const projectPath = path.join(__dirname, '..', 'projects', projectName);
    logger.info(`Project path to delete: ${projectPath}`);

    await fs.promises.rm(projectPath, { recursive: true, force: true });
    logger.info(`Project directory "${projectPath}" deleted successfully.`);

    res.json({ message: 'Projet supprimé avec succès.' });
  } catch (error: any) {
    logger.error(`Error deleting project "${projectName}": ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de la suppression du projet.', error: error.message });
  }
};
