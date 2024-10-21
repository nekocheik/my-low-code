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
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: INodeData;
}

const NodeSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
  },
  data: {
    label: { type: String, required: true, default: 'Unnamed Node' },
    fileName: { type: String, required: true, default: 'UnnamedFile.js' },
    imports: { type: [String], default: [] },
    code: { type: String, required: true, default: '// No code provided' },
    exportedFunctions: { type: [String], default: [] },
    lintErrors: { type: [Schema.Types.Mixed], default: [] },
  },
});

export default mongoose.model<INode>('Node', NodeSchema);
