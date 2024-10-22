import { Request, Response } from 'express';
import { getFilePath, writeFile } from '../utils/fileUtils';
import NodeModel from '../models/Node';

interface NodeData {
  label: string;
  fileName: string;
  code: string;
  [key: string]: any;
}

interface UpdateNodeRequest {
  project: string;
  nodeId: string;
  nodeData: NodeData;
}

// Validation des données d'entrée
const validateInput = (data: Partial<UpdateNodeRequest>): string | null => {
  const { project, nodeId, nodeData } = data;
  
  if (!project || !nodeId || !nodeData) {
    return 'Project, nodeId, and nodeData are required.';
  }

  const requiredFields = ['label', 'fileName', 'code'];
  const missingField = requiredFields.find(field => !nodeData[field]);
  
  if (missingField) {
    return `Field '${missingField}' is required in nodeData.`;
  }

  return null;
};

// Mise à jour du node dans la base de données
const updateNodeInDb = async (
  project: string, 
  nodeId: string, 
  nodeData: NodeData
) => {
  const updatedNode = await NodeModel.findOneAndUpdate(
    { project, id: nodeId },
    { $set: { data: nodeData } },
    { new: true, runValidators: true }
  );

  if (!updatedNode) {
    throw new Error('Node not found.');
  }

  return updatedNode;
};

// Écriture du code dans le système de fichiers
const writeCodeToFile = async (
  project: string, 
  fileName: string, 
  code: string
): Promise<void> => {
  const filePath = getFilePath(project, fileName);
  await writeFile(filePath, code);
};

// Controller principal
export const updateNode = async (req: Request, res: Response): Promise<Response> => {
  const { project, nodeId, nodeData } = req.body;

  try {
    // Validation
    const validationError = validateInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Mise à jour en base de données
    const updatedNode = await updateNodeInDb(project, nodeId, nodeData);

    // Écriture du fichier
    await writeCodeToFile(project, nodeData.fileName, nodeData.code);

    return res.json({
      message: 'Node updated successfully.',
      node: updatedNode
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage === 'Node not found.' ? 404 : 500;

    return res.status(statusCode).json({
      message: 'Error updating node or writing file.',
      error: errorMessage
    });
  }
};