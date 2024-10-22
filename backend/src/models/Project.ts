import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  createdAt: Date;
}

const ProjectSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true,
    unique: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model<IProject>('Project', ProjectSchema);