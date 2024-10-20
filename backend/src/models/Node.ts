// backend/src/models/Node.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface INodeData {
  label: string;
  fileName: string;
  imports: string[];
  code: string;
  exportedFunctions: string[];
  lintErrors?: any[];
}

export interface INode extends Document {
  project: mongoose.Types.ObjectId;
  id: string; // ID unique du nœud dans le graph
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: INodeData;
}

const NodeSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  id: { type: String, required: true }, // ID unique du nœud dans le graph
  type: { type: String, required: true },
  position: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
  },
  data: {
    label: { type: String, required: true, default: 'Unnamed Node' }, // Valeur par défaut ajoutée
    fileName: { type: String, required: true, default: 'UnnamedFile.js' }, // Valeur par défaut ajoutée
    imports: { type: [String], default: [] },
    code: { type: String, required: true, default: '// No code provided' }, // Valeur par défaut ajoutée
    exportedFunctions: { type: [String], default: [] },
    lintErrors: { type: [Schema.Types.Mixed], default: [] },
  },
});

export default mongoose.model<INode>('Node', NodeSchema);