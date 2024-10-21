// backend/src/controllers/graphController.ts

import { Request, Response } from 'express';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import Edge from '../models/Edge';
import path from 'path';
import fs from 'fs/promises';

export const getProjectGraph = async (req: Request, res: Response) => {
  const { project } = req.query;

  if (!project || typeof project !== 'string') {
    return res.status(400).json({ message: 'Project is required and must be a string.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const nodes = await NodeModel.find({ project: existingProject._id });
    const edges = await Edge.find({ project: existingProject._id });

    res.json({ graph: { nodes, edges } });
  } catch (error) {
    console.error('Error fetching project graph:', error);
    res.status(500).json({ message: 'Error fetching project graph.' });
  }
};

export const updateGraph = async (req: Request, res: Response) => {
  const { project, nodes, edges } = req.body;

  console.log('Received updateGraph request:', req.body); // Log des données reçues

  if (!project || !nodes || !edges) {
    return res.status(400).json({ message: 'Project, nodes, and edges are required.' });
  }

  if (typeof project !== 'string' || !Array.isArray(nodes) || !Array.isArray(edges)) {
    return res.status(400).json({ message: 'Invalid data types for project, nodes, or edges.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      console.error(`Project "${project}" not found.`);
      return res.status(404).json({ message: 'Project not found.' });
    }

    const projectPath = path.join(__dirname, '..', 'projects', project);

    // Vérifier si le dossier du projet existe
    try {
      await fs.access(projectPath);
    } catch (err) {
      console.error(`Project directory "${projectPath}" does not exist.`);
      return res.status(400).json({ message: 'Project directory does not exist.' });
    }

    // Préparer les opérations bulkWrite pour les nœuds
    const nodeOperations = nodes.map((node: any) => ({
      updateOne: {
        filter: { project: existingProject._id, id: node.id },
        update: { 
          project: existingProject._id,
          id: node.id || `node_${Date.now()}`,
          type: node.type || 'code',
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.data.label || node.data.fileName || 'Unnamed Node',
            fileName: node.data.fileName || 'UnnamedFile.js',
            imports: node.data.imports || [],
            code: node.data.code || '// No code provided',
            exportedFunctions: node.data.exportedFunctions || [],
            lintErrors: node.data.lintErrors || [],
          },
        },
        upsert: true,
      },
    }));

    // Préparer les opérations bulkWrite pour les arêtes
    const edgeOperations = edges.map((edge: any) => ({
      updateOne: {
        filter: { project: existingProject._id, id: edge.id },
        update: { 
          project: existingProject._id,
          id: edge.id || `edge_${Date.now()}`,
          source: edge.source || 'unknown_source',
          target: edge.target || 'unknown_target',
          animated: edge.animated || false,
          style: edge.style || {},
        },
        upsert: true,
      },
    }));

    console.log('Prepared node operations:', nodeOperations);
    console.log('Prepared edge operations:', edgeOperations);

    let bulkWriteResultNodes, bulkWriteResultEdges;

    if (nodeOperations.length > 0) {
      bulkWriteResultNodes = await NodeModel.bulkWrite(nodeOperations);
      console.log('Nodes upserted successfully.', bulkWriteResultNodes);
    }

    if (edgeOperations.length > 0) {
      bulkWriteResultEdges = await Edge.bulkWrite(edgeOperations);
      console.log('Edges upserted successfully.', bulkWriteResultEdges);
    }

    // Valider les arêtes pour s'assurer que les sources et targets existent
    const existingNodeIds = nodes.map((node: any) => node.id);
    const invalidEdges = edges.filter((edge: any) => 
      !existingNodeIds.includes(edge.source) || !existingNodeIds.includes(edge.target)
    );

    if (invalidEdges.length > 0) {
      console.warn('Invalid edges found:', invalidEdges);
      return res.status(400).json({ 
        message: 'One or more edges have invalid source or target node IDs.',
        invalidEdges 
      });
    }

    // Écrire les fichiers des nœuds dans le système de fichiers
    for (const node of nodes) {
      const filePath = path.join(projectPath, node.data.fileName);
      try {
        await fs.writeFile(filePath, node.data.code);
        console.log(`File written: ${filePath}`);
      } catch (fsError) {
        console.error(`Error writing file ${filePath}:`, fsError);
        return res.status(500).json({ message: `Error writing file for node ${node.id}.`, error: fsError.message });
      }
    }

    res.json({ message: 'Graph updated successfully.' });
  } catch (error) {
    console.error('Error updating graph:', error);
    res.status(500).json({ message: 'Error updating graph.', error: error.message });
  }
};

export const deleteNode = async (req: Request, res: Response) => {
  const { project, nodeId } = req.body;

  if (!project || !nodeId) {
    return res.status(400).json({ message: 'Project and nodeId are required.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Trouver le nœud à supprimer
    const nodeToDelete = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
    if (!nodeToDelete) {
      return res.status(404).json({ message: 'Node not found.' });
    }

    // Chemin vers le dossier du projet
    const projectPath = path.join(__dirname, '..', 'projects', project);
    const filePath = path.join(projectPath, nodeToDelete.data.fileName);

    // Supprimer le fichier du nœud
    try {
      await fs.unlink(filePath);
      console.log(`File deleted: ${filePath}`);
    } catch (error) {
      console.warn(`File not found for deletion: ${filePath}`);
    }

    // Supprimer le nœud
    await NodeModel.deleteOne({ project: existingProject._id, id: nodeId });

    // Supprimer les arêtes associées
    await Edge.deleteMany({ project: existingProject._id, $or: [{ source: nodeId }, { target: nodeId }] });

    res.json({ message: 'Node and associated edges deleted successfully.' });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ message: 'Error deleting node.' });
  }
};

export const cloneNode = async (req: Request, res: Response) => {
  const { project, nodeId, newNodeId } = req.body;

  if (!project || !nodeId || !newNodeId) {
    return res.status(400).json({ message: 'Project, nodeId, and newNodeId are required.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const nodeToClone = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
    if (!nodeToClone) {
      return res.status(404).json({ message: 'Node to clone not found.' });
    }

    const clonedNode = nodeToClone.toObject();
    clonedNode.id = newNodeId;
    clonedNode.position = {
      x: clonedNode.position.x + 100,
      y: clonedNode.position.y + 100,
    };
    clonedNode.data = {
      ...clonedNode.data,
      label: `${clonedNode.data.label} (Clone)`,
      fileName: `${clonedNode.data.fileName.split('.').slice(0, -1).join('.')}_clone.${clonedNode.data.fileName.split('.').pop()}`,
    };
    delete clonedNode._id;

    // Chemin vers le dossier du projet
    const projectPath = path.join(__dirname, '..', 'projects', project);
    const newFilePath = path.join(projectPath, clonedNode.data.fileName);

    // Créer et écrire le fichier cloné
    await fs.writeFile(newFilePath, clonedNode.data.code);
    console.log(`Cloned file created: ${newFilePath}`);

    const newNode = new NodeModel(clonedNode);
    await newNode.save();

    res.json({ message: 'Node cloned successfully.', clonedNode: newNode });
  } catch (error) {
    console.error('Error cloning node:', error);
    res.status(500).json({ message: 'Error cloning node.' });
  }
};
