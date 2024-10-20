// backend/src/models/Edge.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IEdge extends Document {
  project: mongoose.Types.ObjectId;
  id: string; // ID unique de l'arête
  source: string; // ID source du nœud
  target: string; // ID cible du nœud
  animated?: boolean;
  style?: Record<string, any>;
}

const EdgeSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  id: { type: String, required: true }, // ID unique de l'arête
  source: { type: String, required: true }, // ID source du nœud
  target: { type: String, required: true }, // ID cible du nœud
  animated: { type: Boolean, default: false },
  style: { type: Object, default: {} },
});

export default mongoose.model<IEdge>('Edge', EdgeSchema);