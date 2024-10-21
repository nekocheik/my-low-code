import express from 'express';
import { importProject } from '../controllers/importController';
import { authenticateJWT } from '../middleware/auth'; // Si vous avez mis en place l'authentification

const router = express.Router();

/**
 * @route POST /import
 * @desc Importe un projet depuis un fichier JSON
 * @access Protected
 */
router.post('/import', authenticateJWT, importProject);

export default router;
