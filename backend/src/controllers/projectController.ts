// backend/src/controllers/projectController.ts

import { Request, Response } from 'express';
import Project from '../models/Project';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import Joi from 'joi';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await Project.find().select('name code createdAt');
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des projets.' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  const schema = Joi.object({
    projectCode: Joi.string().required(),
    projectName: Joi.string().alphanum().min(3).max(30).required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { projectCode, projectName } = req.body;

  try {
    // Vérifier si le projet existe déjà
    const existingProject = await Project.findOne({ name: projectName });
    if (existingProject) {
      return res.status(400).json({ message: 'Le projet existe déjà.' });
    }

    // Créer le dossier du projet
    const projectPath = path.join(__dirname, '..', 'projects', projectName);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
      console.log(`Project directory created at: ${projectPath}`);
    }

    // Créer le fichier principal (par exemple, index.ts)
    const mainFilePath = path.join(projectPath, 'index.ts');
    fs.writeFileSync(mainFilePath, projectCode);
    console.log(`Main file created at: ${mainFilePath}`);

    // Initialiser un package.json
    exec('npm init -y', { cwd: projectPath }, async (err, stdout, stderr) => {
      if (err) {
        console.error('Error initializing npm:', err);
        return res.status(500).json({ message: 'Erreur lors de l\'initialisation du projet.' });
      }

      console.log(`npm initialized for project "${projectName}".`);

      try {
        // Enregistrer le projet dans la base de données
        const newProject = new Project({
          name: projectName,
          code: projectCode,
        });

        const savedProject = await newProject.save();
        console.log(`Project "${projectName}" saved to database.`);

        res.status(201).json({ message: 'Projet créé avec succès.', project: savedProject });
      } catch (saveError) {
        console.error('Error saving project:', saveError);
        res.status(500).json({ message: 'Erreur lors de la création du projet.' });
      }
    });

  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Erreur lors de la création du projet.' });
  }
};

export const installPackage = async (req: Request, res: Response) => {
  const schema = Joi.object({
    project: Joi.string().required(),
    packageName: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { project, packageName } = req.body;

  try {
    // Trouver le projet dans la base de données
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Projet non trouvé.' });
    }

    const projectPath = path.join(__dirname, '..', 'projects', project);

    // Vérifier si le dossier du projet existe
    if (!fs.existsSync(projectPath)) {
      return res.status(400).json({ message: 'Le dossier du projet n\'existe pas.' });
    }

    console.log(`Installing package "${packageName}" in project "${project}".`);

    // Exécuter la commande npm install
    exec(`npm install ${packageName}`, { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing package: ${error.message}`);
        return res.status(500).json({ message: 'Erreur lors de l\'installation du package.', stderr: error.message });
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
        // Vous pouvez choisir d'envoyer stderr comme partie de la réponse
      }

      console.log(`stdout: ${stdout}`);
      res.json({ message: `Package ${packageName} installé avec succès.`, stdout, stderr });
    });
  } catch (error) {
    console.error('Error installing package:', error);
    res.status(500).json({ message: 'Erreur lors de l\'installation du package.' });
  }
};