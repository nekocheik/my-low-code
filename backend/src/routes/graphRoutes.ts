// backend/src/routes/graphRoutes.ts

import express from 'express';
import { getProjectGraph, updateGraph, deleteNode, cloneNode } from '../controllers/graphController';

const router = express.Router();

// Obtenir le graphe d'un projet
router.get('/', getProjectGraph);

// Mettre à jour le graphe d'un projet
router.post('/update-graph', updateGraph);

// Supprimer un nœud
router.post('/delete-node', deleteNode);

// Cloner un nœud
router.post('/clone-node', cloneNode);

export default router;