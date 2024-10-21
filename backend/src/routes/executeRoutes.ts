import express from 'express';
import { executeNode } from '../controllers/executeController';

const router = express.Router();

router.post('/', executeNode);

export default router;
