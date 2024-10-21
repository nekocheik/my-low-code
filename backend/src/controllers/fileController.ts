import { Request, Response } from 'express';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import path from 'path';
import fs from 'fs/promises';

export const updateFile = async (req: Request, res: Response) => {
  const { project, nodeId, nodeData } = req.body;
  console.log('Received update request:', { project, nodeId, nodeData });

  if (!project || !nodeId || !nodeData) {
    return res.status(400).json({ message: 'Project, nodeId, and nodeData are required.' });
  }

  if (typeof nodeData.code !== 'string' || nodeData.code.trim() === '') {
    return res.status(400).json({ message: 'Invalid or empty code.' });
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

    console.log('Node data before update:', node.data);

    // Assurer que data.label n'est pas supprimé
    const updatedData = {
      ...node.data,
      ...nodeData,
      label: nodeData.label || node.data.label,
    };

    // Mettre à jour les données du nœud
    node.data = updatedData;
    console.log('Node data after update:', node.data);

    await node.save();
    console.log('Node saved successfully');

    // Chemin vers le fichier du nœud
    const projectPath = path.join(__dirname, '..', 'projects', project);
    const filePath = path.join(projectPath, node.data.fileName);

    // Écrire le code mis à jour dans le fichier
    await fs.writeFile(filePath, node.data.code);
    console.log(`File updated: ${filePath}`);

    // Vérifier que le nœud a bien été sauvegardé
    const updatedNode = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
    console.log('Node after saving:', updatedNode);

    res.json({ message: 'File updated successfully.', node: updatedNode });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ message: 'Error updating file.', error: error.message });
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