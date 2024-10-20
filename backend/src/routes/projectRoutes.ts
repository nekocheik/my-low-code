// backend/src/routes/projectRoutes.ts

import express from 'express';
import { getProjects, createProject, installPackage } from '../controllers/projectController';

const router = express.Router();

// Obtenir la liste des projets
router.get('/', getProjects);

// Créer un nouveau projet
router.post('/create-project', createProject);

// Installer un package dans un projet
router.post('/install-package', installPackage);

export default router;