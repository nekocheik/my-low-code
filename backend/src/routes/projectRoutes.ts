// backend/routes/projectRoutes.ts

import express from 'express';
import { getProjects, createProject, installPackage } from '../controllers/projectController';

const router = express.Router();

router.get('/', getProjects);
router.post('/create-project', createProject);
router.post('/install-package', installPackage);

export default router;