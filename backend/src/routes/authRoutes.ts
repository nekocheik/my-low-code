// backend/src/routes/authRoutes.ts

import express from 'express';
import { register, login } from '../controllers/authController';

const router = express.Router();

/**
 * @route POST /auth/register
 * @desc Inscription d'un nouvel utilisateur
 * @access Public
 */
router.post('/register', register);

/**
 * @route POST /auth/login
 * @desc Connexion d'un utilisateur existant
 * @access Public
 */
router.post('/login', login);

export default router;
