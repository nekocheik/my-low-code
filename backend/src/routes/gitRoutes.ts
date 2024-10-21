import express from 'express';
import { pullFromGit, commitChanges, pushChanges } from '../controllers/gitController';

const router = express.Router();

router.post('/pull', pullFromGit);
router.post('/commit', commitChanges);
router.post('/push', pushChanges);

export default router;