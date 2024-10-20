// backend/src/controllers/executeController.ts

import { Request, Response } from 'express';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const executeNode = async (req: Request, res: Response) => {
  const { project, nodeId } = req.body;

  console.log('Received executeNode request:', req.body); // Log des données reçues

  if (!project || !nodeId) {
    return res.status(400).json({ message: 'Project and nodeId are required.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      console.error(`Project "${project}" not found.`);
      return res.status(404).json({ message: 'Project not found.' });
    }

    const node = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
    if (!node) {
      console.error(`Node "${nodeId}" not found in project "${project}".`);
      return res.status(404).json({ message: 'Node not found.' });
    }

    // Chemin vers le fichier du nœud
    const projectPath = path.join(__dirname, '..', 'projects', project);
    const filePath = path.join(projectPath, node.data.fileName);

    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      console.error(`File "${filePath}" does not exist.`);
      return res.status(404).json({ message: 'Node file does not exist.' });
    }

    console.log(`Executing node file: ${filePath}`);

    // Exécuter le fichier en utilisant Node.js
    exec(`node ${filePath}`, { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing node: ${error.message}`);
        return res.status(500).json({ message: 'Error executing node.', stderr: error.message });
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
        // Vous pouvez choisir d'envoyer stderr comme partie de la réponse
      }

      console.log(`stdout: ${stdout}`);
      res.json({ message: 'Node executed successfully.', stdout, stderr });
    });
  } catch (error) {
    console.error('Error executing node:', error);
    res.status(500).json({ message: 'Error executing node.' });
  }
};

export const executeCommand = async (req: Request, res: Response) => {
  const { project, command } = req.body;

  if (!project || !command) {
    return res.status(400).json({ message: 'Project and command are required.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const projectPath = path.join(__dirname, '..', 'projects', project);

    // Sécurité : Valider la commande pour éviter l'exécution de commandes dangereuses
    const allowedCommands = ['ls', 'npm install', 'npm run build', 'npm run start'];
    if (!allowedCommands.includes(command)) {
      return res.status(403).json({ message: 'Command not allowed.' });
    }

    exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        return res.status(500).json({ message: 'Error executing command.', stderr: error.message });
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
        // Vous pouvez choisir d'envoyer stderr comme partie de la réponse
      }

      console.log(`stdout: ${stdout}`);
      res.json({ message: 'Command executed successfully.', stdout, stderr });
    });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({ message: 'Error executing command.' });
  }
};