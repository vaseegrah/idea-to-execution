import mongoose, { Schema, model, models } from 'mongoose';

export interface IIdeaSchema extends mongoose.Document {
  title: string;
  description?: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  reminder: boolean;
  reminderTime?: string;
  status: 'Idea' | 'In Execution' | 'Archived';
  createdAt: Date;
  updatedAt: Date;
}

const IdeaSchema = new Schema<IIdeaSchema>(
  {
    title: { 
      type: String, 
      required: [true, 'Idea title is required'], 
      trim: true 
    },
    description: { 
      type: String, 
      default: '' 
    },
    category: { 
      type: String, 
      default: 'Tech' 
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
    reminder: { 
      type: Boolean, 
      default: true 
    },
    reminderTime: { 
      type: String, 
      default: '09:00' 
    },
    status: { 
      type: String, 
      enum: ['Idea', 'In Execution', 'Archived'], 
      default: 'Idea' 
    }
  },
  { 
    timestamps: true 
  }
);

export default models.Idea || model<IIdeaSchema>('Idea', IdeaSchema);