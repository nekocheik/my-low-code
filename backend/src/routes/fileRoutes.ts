import express from 'express';
import { updateFile, getAccessibleFunctions } from '../controllers/fileController';

const router = express.Router();

router.post('/', updateFile);
router.get('/accessible-functions', getAccessibleFunctions);

export default router;