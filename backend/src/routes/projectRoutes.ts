import express from 'express';
import { getProjects, createProject, installPackage, deleteProject } from '../controllers/projectController';

const router = express.Router();

router.get('/', getProjects);
router.post('/create-project', createProject);
router.post('/install-package', installPackage);
router.delete('/:projectName', deleteProject);

export default router;
