// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import projectRoutes from './routes/projectRoutes';
import graphRoutes from './routes/graphRoutes';
import fileRoutes from './routes/fileRoutes';
import executeRoutes from './routes/executeRoutes';
import devServerRoutes from './routes/devServerRoutes';
import gitRoutes from './routes/gitRoutes'; // Si vous avez des routes Git
import authRoutes from './routes/authRoutes'; // Si vous avez des routes Git

import { errorHandler } from './middleware/errorHandler'; // Middleware de gestion des erreurs
import logger from './utils/logger'; // Importer le logger

// Documentation de l'API (par exemple Swagger)
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/projects', projectRoutes);
app.use('/project-graph', graphRoutes);
app.use('/update-file', fileRoutes);
app.use('/execute', executeRoutes);
app.use('/dev-server', devServerRoutes);
app.use('/git', gitRoutes); // Si vous avez des routes Git
app.use('/auth', authRoutes); // Si vous avez des routes d'authentification

// Configuration Swagger
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Low-Code App API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.ts'], // Chemin vers vos fichiers de routes
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Middleware de gestion des erreurs (doit être placé après toutes les routes)
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/low-code-app')
  .then(() => {
    logger.info('Connected to MongoDB');
    // Démarrer le serveur seulement après la connexion à MongoDB
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });
