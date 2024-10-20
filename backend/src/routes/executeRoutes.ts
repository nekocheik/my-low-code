import express from 'express';
import { executeNode, executeCommand } from '../controllers/executeController';

const router = express.Router();

// Exécuter un nœud
router.post('/', executeNode);

// Exécuter une commande
router.post('/execute-command', executeCommand);

export default router;