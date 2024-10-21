// backend/src/routes/projectRoutes.ts

import express from 'express';
import { getProjects, createProject, installPackage } from '../controllers/projectController';
// import { authenticateJWT } from '../middleware/auth'; // Commenter ou supprimer cette ligne

const router = express.Router();

/**
 * @route GET /projects
 * @desc Récupère la liste des projets.
 * @access Public
 */
router.get('/', /* authenticateJWT, */ getProjects);

/**
 * @route POST /projects/create-project
 * @desc Crée un nouveau projet.
 * @access Public
 */
router.post('/create-project', /* authenticateJWT, */ createProject);

/**
 * @route POST /projects/install-package
 * @desc Installe un package npm dans un projet spécifique.
 * @access Public
 */
router.post('/install-package', /* authenticateJWT, */ installPackage);

export default router;
