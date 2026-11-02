import mongoose, { Schema, model, models } from 'mongoose';

export interface ISubtaskItem {
  _id?: string;
  title: string;
  completed: boolean;
}

export interface IExecutionTaskSchema extends mongoose.Document {
  ideaId: mongoose.Types.ObjectId;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  progress: number;
  notes?: string;
  subtasks: ISubtaskItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ExecutionTaskSchema = new Schema<IExecutionTaskSchema>(
  {
    ideaId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Idea', 
      required: true 
    },
    title: { 
      type: String, 
      required: [true, 'Task title is required'], 
      trim: true 
    },
    status: { 
      type: String, 
      enum: ['Pending', 'In Progress', 'Completed', 'On Hold'], 
      default: 'Pending' 
    },
    priority: { 
      type: String, 
      enum: ['Low', 'Medium', 'High'], 
      default: 'Medium' 
    },
    dueDate: { 
      type: String, 
      required: [true, 'Due date is required'] 
    },
    progress: { 
      type: Number, 
      min: 0, 
      max: 100, 
      default: 0 
    },
    notes: { 
      type: String, 
      default: '' 
    },
    subtasks: [
      {
        title: { type: String, required: true },
        completed: { type: Boolean, default: false }
      }
    ]
  },
  { 
    timestamps: true 
  }
);

export default models.ExecutionTask || model<IExecutionTaskSchema>('ExecutionTask', ExecutionTaskSchema);