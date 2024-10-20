// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

import projectRoutes from './routes/projectRoutes';
import graphRoutes from './routes/graphRoutes';
import fileRoutes from './routes/fileRoutes';
import executeRoutes from './routes/executeRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/projects', projectRoutes);
app.use('/project-graph', graphRoutes);
app.use('/update-file', fileRoutes);
app.use('/execute', executeRoutes);
// Ajoutez d'autres routes selon les besoins

// Connexion à la base de données MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/my-low-code-app';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });