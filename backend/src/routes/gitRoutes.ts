import express from 'express';
import { commitChanges, pushChanges, pullChanges } from '../controllers/gitController';

const router = express.Router();

router.post('/commit', commitChanges);
router.post('/push', pushChanges);
router.post('/pull', pullChanges);

export default router;
