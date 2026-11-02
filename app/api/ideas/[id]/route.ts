import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ExecutionTask from '@/models/ExecutionTask';
import Idea from '@/models/Idea';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const deletedIdea = await Idea.findByIdAndDelete(id);

    if (!deletedIdea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    await ExecutionTask.deleteMany({ ideaId: id });
    return NextResponse.json(
      { message: 'Idea deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to delete idea',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}