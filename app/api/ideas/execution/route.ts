import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ExecutionTask from '@/models/ExecutionTask';
import Idea from '@/models/Idea';

// GET: Fetch all execution tasks
export async function GET() {
  try {
    await connectToDatabase();
    const tasks = await ExecutionTask.find({}).sort({ createdAt: -1 });
    return NextResponse.json(tasks, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to fetch execution tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: Move an idea to Execution & create an execution task
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { ideaId, title, priority, dueDate, notes, subtasks } = await req.json();

    if (!ideaId || !title) {
      return NextResponse.json(
        { error: 'ideaId and title are required' },
        { status: 400 }
      );
    }

    // 1. Mark the linked Idea status as 'In Execution'
    await Idea.findByIdAndUpdate(ideaId, { status: 'In Execution' });

    // 2. Create the new Execution Task
    const newTask = await ExecutionTask.create({
      ideaId,
      title,
      priority: priority || 'Medium',
      dueDate,
      status: 'Pending',
      progress: 0,
      notes: notes || '',
      subtasks: subtasks && subtasks.length > 0 ? subtasks : [
        { title: 'Initial setup & requirements', completed: false },
        { title: 'Execute primary deliverables', completed: false }
      ]
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to move idea to execution',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}