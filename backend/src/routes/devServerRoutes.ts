// backend/src/routes/devServerRoutes.ts

import express from 'express';
import { startDevServer, stopDevServer } from '../controllers/devServerController';

const router = express.Router();

/**
 * @route POST /dev-server/start
 * @desc Démarre le serveur de développement pour un projet donné.
 * @access Public (à sécuriser selon vos besoins)
 */
router.post('/start', startDevServer);

/**
 * @route POST /dev-server/stop
 * @desc Arrête le serveur de développement en cours.
 * @access Public (à sécuriser selon vos besoins)
 */
router.post('/stop', stopDevServer);

export default router;
