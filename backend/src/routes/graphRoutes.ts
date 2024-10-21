// backend/routes/graphRoutes.ts

import express from 'express';
import { getProjectGraph, updateGraph, deleteNode, cloneNode } from '../controllers/graphController';

const router = express.Router();

router.get('/', getProjectGraph);
router.post('/update-graph', updateGraph);
router.post('/delete-node', deleteNode);
router.post('/clone-node', cloneNode);

export default router;