import { Request, Response } from 'express';
import { getFilePath, writeFile } from '../utils/fileUtils';
import NodeModel from '../models/Node';

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
