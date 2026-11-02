import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Idea from '@/models/Idea';

// GET: Fetch all ideas sorted by latest creation date
export async function GET() {
  try {
    await connectToDatabase();
    const ideas = await Idea.find({}).sort({ createdAt: -1 });
    return NextResponse.json(ideas, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch ideas', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new idea in MongoDB
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body.title || !body.dueDate) {
      return NextResponse.json(
        { error: 'Title and Due Date are required fields' },
        { status: 400 }
      );
    }

    const newIdea = await Idea.create({
      title: body.title,
      description: body.description || '',
      category: body.category || 'Tech',
      priority: body.priority || 'Medium',
      dueDate: body.dueDate,
      reminder: body.reminder ?? true,
      reminderTime: body.reminderTime || '09:00',
      status: 'Idea'
    });

    return NextResponse.json(newIdea, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create idea', details: error.message },
      { status: 500 }
    );
  }
}