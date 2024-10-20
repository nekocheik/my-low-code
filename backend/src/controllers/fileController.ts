// backend/src/controllers/fileController.ts

import { Request, Response } from 'express';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import path from 'path';
import fs from 'fs';

export const updateFile = async (req: Request, res: Response) => {
  const { project, nodeId, nodeData } = req.body;

  if (!project || !nodeId || !nodeData) {
    return res.status(400).json({ message: 'Project, nodeId, and nodeData are required.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const node = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
    if (!node) {
      return res.status(404).json({ message: 'Node not found.' });
    }

    // Assurer que data.label n'est pas supprimé
    const updatedData = {
      ...node.data,
      ...nodeData,
      label: nodeData.label || node.data.label, // Préserver ou mettre à jour label
    };

    // Mettre à jour les données du nœud
    node.data = updatedData;
    await node.save();

    // Chemin vers le fichier du nœud
    const projectPath = path.join(__dirname, '..', 'projects', project);
    const filePath = path.join(projectPath, node.data.fileName);

    // Écrire le code mis à jour dans le fichier
    fs.writeFileSync(filePath, node.data.code);
    console.log(`File updated: ${filePath}`);

    res.json({ message: 'File updated successfully.', node });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ message: 'Error updating file.' });
  }
};

export const getAccessibleFunctions = async (req: Request, res: Response) => {
  const { project, nodeId } = req.query;

  if (!project || typeof project !== 'string' || !nodeId || typeof nodeId !== 'string') {
    return res.status(400).json({ message: 'Project and nodeId are required and must be strings.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const node = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
    if (!node) {
      return res.status(404).json({ message: 'Node not found.' });
    }

    // Logique pour déterminer les fonctions accessibles
    // Remplacez ceci par votre logique métier réelle
    const accessibleFunctions = ['functionA', 'functionB', 'functionC'];

    res.json({ accessibleFunctions });
  } catch (error) {
    console.error('Error fetching accessible functions:', error);
    res.status(500).json({ message: 'Error fetching accessible functions.' });
  }
};