import { Request, Response } from 'express';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export const executeNode = async (req: Request, res: Response) => {
  const { project, nodeId } = req.body;

  if (!project || !nodeId) {
    console.log('Error: Missing project or nodeId');
    return res.status(400).json({ message: 'Project and nodeId are required.' });
  }

  try {
    // Find the project
    console.log(`Looking for project: ${project}`);
    const existingProject = await Project.findOne({ name: project });
    if (!existingProject) {
      console.log('Error: Project not found');
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Find the node
    console.log(`Looking for node with ID: ${nodeId}`);
    const node = await NodeModel.findOne({ project: existingProject._id, id: nodeId });
    if (!node) {
      console.log('Error: Node not found');
      return res.status(404).json({ message: 'Node not found.' });
    }

    // Resolve the path to the node file
    const projectPath = path.join(__dirname, '..', 'projects', project);
    const filePath = path.join(projectPath, node.data.fileName);
    console.log(`Resolved file path: ${filePath}`);

    // Check if the file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.log('Error: Node file does not exist');
      return res.status(404).json({ message: 'Node file does not exist.' });
    }

    // Execute the file
    const command = `node ${filePath}`;
    console.log(`Executing command: ${command}`);
    exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing node: ${error.message}`);
        return res.status(500).json({ message: 'Error executing node.', error: error.message });
      }

      console.log('Node executed successfully');
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);

      res.json({
        message: 'Node executed successfully.',
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

  } catch (error: any) {
    console.error('Error during node execution:', error);
    res.status(500).json({ message: 'Error during node execution.', error: error.message });
  }
};
