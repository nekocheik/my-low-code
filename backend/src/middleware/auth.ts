// backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key'; // Assurez-vous de définir JWT_SECRET dans votre fichier .env

interface JwtPayload {
  userId: string;
  // Ajoutez d'autres propriétés si nécessaire
}

// Extension de l'interface Request pour inclure user
declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Le format attendu est "Bearer <token>"
    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET_KEY, (err, payload) => {
      if (err) {
        logger.warn('Invalid JWT token');
        return res.sendStatus(403); // Forbidden
      }

      // Vous pouvez ajouter le payload à la requête pour une utilisation future
      req.user = payload as JwtPayload;
      next();
    });
  } else {
    logger.warn('No Authorization header provided');
    res.sendStatus(401); // Unauthorized
  }
};
