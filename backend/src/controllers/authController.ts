// backend/src/controllers/authController.ts

import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key'; // Assurez-vous de définir JWT_SECRET dans votre fichier .env

/**
 * Inscription d'un nouvel utilisateur
 */
export const register = async (req: Request, res: Response) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    logger.error(`Registration validation error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const { username, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      logger.warn(`Registration failed: Username "${username}" already exists.`);
      return res.status(400).json({ message: 'Username already exists.' });
    }

    // Créer un nouvel utilisateur
    const newUser = new User({ username, password });
    await newUser.save();

    logger.info(`User "${username}" registered successfully.`);
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error: any) {
    logger.error(`Error during registration: ${error.message}`);
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
};

/**
 * Connexion d'un utilisateur existant
 */
export const login = async (req: Request, res: Response) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    logger.error(`Login validation error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const { username, password } = req.body;

  try {
    // Trouver l'utilisateur
    const user = await User.findOne({ username });
    if (!user) {
      logger.warn(`Login failed: Username "${username}" not found.`);
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    // Comparer les mots de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Login failed: Incorrect password for username "${username}".`);
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    // Créer un token JWT
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });

    logger.info(`User "${username}" logged in successfully.`);
    res.json({ message: 'Login successful.', token });
  } catch (error: any) {
    logger.error(`Error during login: ${error.message}`);
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
};
