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
import gitRoutes from './routes/gitRoutes';
import importRoutes from './routes/importRoutes';
import authRoutes from './routes/authRoutes';

import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/project-graph', graphRoutes);
app.use('/update-file', fileRoutes);
app.use('/execute', executeRoutes);
app.use('/dev-server', devServerRoutes);
app.use('/git', gitRoutes);
app.use('/import', importRoutes);

// Middleware de gestion des erreurs
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/low-code-app')
  .then(() => {
    logger.info('Connected to MongoDB');
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

export default app;