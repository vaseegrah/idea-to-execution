import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ExecutionTask from '@/models/ExecutionTask';

// PUT: Update progress, subtasks, or status of an execution task
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const updatedTask = await ExecutionTask.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedTask) {
      return NextResponse.json({ error: 'Execution task not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to update execution task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete an execution task
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const deletedTask = await ExecutionTask.findByIdAndDelete(id);

    if (!deletedTask) {
      return NextResponse.json({ error: 'Execution task not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Execution task deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to delete execution task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}