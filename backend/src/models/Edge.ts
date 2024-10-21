import mongoose, { Document, Schema } from 'mongoose';

export interface IEdge extends Document {
  project: mongoose.Types.ObjectId;
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  label?: string;
  style?: Record<string, any>;
}

const EdgeSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  animated: { type: Boolean, default: false },
  label: { type: String },
  style: { type: Schema.Types.Mixed },
});

// Index composé pour assurer l'unicité de l'ID par projet
EdgeSchema.index({ project: 1, id: 1 }, { unique: true });

export default mongoose.model<IEdge>('Edge', EdgeSchema);
