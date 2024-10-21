import { Request, Response } from 'express';
import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';

const git: SimpleGit = simpleGit();

export const commitChanges = async (req: Request, res: Response) => {
  const { project, message } = req.body;

  if (!project || !message) {
    return res.status(400).json({ message: 'Project and commit message are required.' });
  }

  const projectPath = path.join(__dirname, '..', 'projects', project);

  try {
    await git.cwd(projectPath);
    await git.add('.');
    await git.commit(message);
    res.json({ message: 'Changes committed successfully.' });
  } catch (error: any) {
    console.error('Error committing changes:', error);
    res.status(500).json({ message: 'Error committing changes.', error: error.message });
  }
};

export const pushChanges = async (req: Request, res: Response) => {
  const { project } = req.body;

  if (!project) {
    return res.status(400).json({ message: 'Project is required.' });
  }

  const projectPath = path.join(__dirname, '..', 'projects', project);

  try {
    await git.cwd(projectPath);
    await git.push();
    res.json({ message: 'Changes pushed to GitHub successfully.' });
  } catch (error: any) {
    console.error('Error pushing changes:', error);
    res.status(500).json({ message: 'Error pushing changes.', error: error.message });
  }
};

export const pullChanges = async (req: Request, res: Response) => {
  const { project } = req.body;

  if (!project) {
    return res.status(400).json({ message: 'Project is required.' });
  }

  const projectPath = path.join(__dirname, '..', 'projects', project);

  try {
    await git.cwd(projectPath);
    await git.pull();
    res.json({ message: 'Changes pulled from GitHub successfully.' });
  } catch (error: any) {
    console.error('Error pulling changes:', error);
    res.status(500).json({ message: 'Error pulling changes.', error: error.message });
  }
};
