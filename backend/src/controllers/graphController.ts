import { Request, Response } from 'express';
import { createClient } from '@redis/client';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import Edge from '../models/Edge';
import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger';
import { getFilePath } from '../utils/fileUtils';

// Initialisation du client Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', err => logger.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
})();

// Clés de cache
const CACHE_KEYS = {
  graph: (projectId: string) => `graph:${projectId}`,
  nodeFile: (projectId: string, nodeId: string) => `file:${projectId}:${nodeId}`
};

const CACHE_TTL = 3600; // 1 heure

export const getProjectGraph = async (req: Request, res: Response) => {
  const { project } = req.query;

  if (!project || typeof project !== 'string') {
    return res.status(400).json({ message: 'Project is required and must be a string.' });
  }

  try {
    // Vérifier le cache
    const cachedGraph = await redisClient.get(CACHE_KEYS.graph(project));
    if (cachedGraph) {
      logger.info(`Cache hit for project graph: ${project}`);
      return res.json({ graph: JSON.parse(cachedGraph) });
    }

    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const [nodes, edges] = await Promise.all([
      NodeModel.find({ project: existingProject._id }),
      Edge.find({ project: existingProject._id })
    ]);

    const graph = { nodes, edges };
    
    // Mettre en cache
    await redisClient.set(CACHE_KEYS.graph(project), JSON.stringify(graph), {
      EX: CACHE_TTL
    });

    res.json({ graph });
  } catch (error) {
    logger.error('Error fetching project graph:', error);
    res.status(500).json({ message: 'Error fetching project graph.' });
  }
};

export const updateGraph = async (req: Request, res: Response) => {
  const { project, nodes, edges } = req.body;

  if (!project || (!nodes && !edges)) {
    return res.status(400).json({ message: 'Project, nodes, or edges are required.' });
  }

  try {
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Update nodes if provided
    if (nodes && nodes.length > 0) {
      const nodeOperations = nodes.map((node: any) => ({
        updateOne: {
          filter: { project: existingProject._id, id: node.id },
          update: { 
            project: existingProject._id,
            id: node.id,
            ...node,
          },
          upsert: true, // Create if not exists
        },
      }));

      await NodeModel.bulkWrite(nodeOperations);
      console.log('Nodes updated:', nodes.length);
    }

    // Update edges if provided
    if (edges && edges.length > 0) {
      const edgeOperations = edges.map((edge: any) => ({
        updateOne: {
          filter: { project: existingProject._id, id: edge.id },
          update: { 
            project: existingProject._id,
            id: edge.id,
            ...edge,
          },
          upsert: true,
        },
      }));

      await Edge.bulkWrite(edgeOperations);
      console.log('Edges updated:', edges.length);
    }

    // Invalider le cache du graphe
    await redisClient.del(CACHE_KEYS.graph(project));

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

    const nodeToDelete = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
    if (!nodeToDelete) {
      return res.status(404).json({ message: 'Node not found.' });
    }

    const filePath = path.join(__dirname, '..', 'projects', project, nodeToDelete.data.fileName);

    try {
      await fs.unlink(filePath);
      logger.info(`File deleted: ${filePath}`);
      // Supprimer du cache
      await redisClient.del(CACHE_KEYS.nodeFile(project, nodeId));
    } catch (error) {
      logger.warn(`File not found for deletion: ${filePath}`);
    }

    await NodeModel.deleteOne({ project: existingProject._id, id: nodeId });
    await Edge.deleteMany({ project: existingProject._id, $or: [{ source: nodeId }, { target: nodeId }] });

    // Invalider le cache du graphe
    await redisClient.del(CACHE_KEYS.graph(project));

    res.json({ message: 'Node and associated edges deleted successfully.' });
  } catch (error) {
    logger.error('Error deleting node:', error);
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

    // Vérifier d'abord le cache
    const cachedNode = await redisClient.get(CACHE_KEYS.nodeFile(project, nodeId));
    let nodeToClone;

    if (cachedNode) {
      nodeToClone = JSON.parse(cachedNode);
    } else {
      nodeToClone = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
      if (!nodeToClone) {
        return res.status(404).json({ message: 'Node to clone not found.' });
      }
    }

    const clonedNode = { ...nodeToClone.toObject(), id: newNodeId };
    clonedNode.position.x += 100;
    clonedNode.position.y += 100;
    clonedNode.data.label = `${clonedNode.data.label} (Clone)`;
    clonedNode.data.fileName = `${clonedNode.data.fileName.split('.').slice(0, -1).join('.')}_clone.${clonedNode.data.fileName.split('.').pop()}`;
    delete clonedNode._id;

    const newFilePath = path.join(__dirname, '..', 'projects', project, clonedNode.data.fileName);
    await fs.writeFile(newFilePath, clonedNode.data.code);
    logger.info(`Cloned file created: ${newFilePath}`);

    // Mettre en cache le nouveau nœud
    await redisClient.set(
      CACHE_KEYS.nodeFile(project, newNodeId),
      JSON.stringify(clonedNode),
      { EX: CACHE_TTL }
    );

    await new NodeModel(clonedNode).save();

    // Invalider le cache du graphe
    await redisClient.del(CACHE_KEYS.graph(project));

    res.json({ message: 'Node cloned successfully.', clonedNode });
  } catch (error) {
    logger.error('Error cloning node:', error);
    res.status(500).json({ message: 'Error cloning node.' });
  }
};
export const updateNode = async (req: Request, res: Response) => {
  const { project, node } = req.body;

  console.log('Project:', project);
  console.log('Node:', node);


  // Vérification de la structure correcte du nœud
  if (!project || !node || !node.id || !node.data || !node.data.fileName || !node.data.code) {
    return res.status(400).json({
      message: 'Project and node with valid id, fileName, and code are required.'
    });
  }

  logger.info('Received updateNode request:', req.body);

  const lockKey = `lock:${project}:update:${node.id}`;
  let lockAcquired: any = false;

  try {
    // Acquérir un verrou pour éviter les conflits d'écriture concurrents
    lockAcquired = await redisClient.set(lockKey, '1', {
      NX: true,
      EX: 60, // 60 secondes max
    });

    if (!lockAcquired) {
      return res.status(429).json({ message: 'Another update for this node is in progress' });
    }

    // Récupérer le projet
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Construire le chemin du fichier du nœud
    const filePath = await getFilePath(project, node.data.fileName);

    // Écrire le fichier de code
    try {
      await fs.writeFile(filePath, node.data.code);
      logger.info(`File written successfully: ${filePath}`);

      // Mettre en cache le contenu du fichier
      await redisClient.set(
        CACHE_KEYS.nodeFile(project, node.id),
        node.data.code,
        { EX: CACHE_TTL }
      );
    } catch (fsError: any) {
      logger.error(`Error writing file ${filePath}:`, fsError);
      throw fsError;
    }

    // Mettre à jour la base de données avec les informations du nœud
    await NodeModel.updateOne(
      { project: existingProject._id, id: node.id },
      {
        project: existingProject._id,
        id: node.id,
        type: node.type || 'code',
        position: node.position || { x: 0, y: 0 },
        data: {
          label: node.data.label || node.data.fileName,
          fileName: node.data.fileName,
          imports: node.data.imports || [],
          code: node.data.code,
          exportedFunctions: node.data.exportedFunctions || [],
          lintErrors: node.data.lintErrors || [],
        },
      },
      { upsert: true }
    );

    // Invalider le cache du graphe si nécessaire
    await redisClient.del(CACHE_KEYS.graph(project));

    res.json({ message: 'Node updated successfully.' });
  } catch (error) {
    logger.error('Error updating node:', error);
    res.status(500).json({ message: 'Error updating node.', error: error.message });
  } finally {
    if (lockAcquired) {
      await redisClient.del(lockKey); // Libérer le verrou
    }
  }
};


// Nettoyage lors de l'arrêt
process.on('SIGTERM', async () => {
  await redisClient.quit();
});

export default {
  getProjectGraph,
  updateNode,
  updateGraph,
  deleteNode,
  cloneNode
};