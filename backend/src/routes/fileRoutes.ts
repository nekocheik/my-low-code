// backend/src/routes/fileRoutes.ts

import express from 'express';
import { updateFile, getAccessibleFunctions } from '../controllers/fileController';

const router = express.Router();

// Mettre à jour un fichier
router.post('/', updateFile);

// Obtenir les fonctions accessibles pour un nœud
router.get('/accessible-functions', getAccessibleFunctions);

export default router;