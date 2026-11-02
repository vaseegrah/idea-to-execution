'use client';

import React, { useState, useEffect } from 'react';
import { Lightbulb, PlayCircle, Plus, Trash2, ArrowRight, CheckSquare, Square, Search, X } from 'lucide-react';

interface IIdea {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  status: 'Idea' | 'In Execution';
}

interface ISubtask {
  _id?: string;
  id?: string;
  title: string;
  completed: boolean;
}

interface IExecutionTask {
  _id: string;
  ideaId: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  progress: number;
  notes?: string;
  subtasks: ISubtask[];
}

function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

export default function IdeasAndExecutionPage() {
  const [activeTab, setActiveTab] = useState<'ideas' | 'execution'>('ideas');
  const [ideas, setIdeas] = useState<IIdea[]>([]);
  const [executionTasks, setExecutionTasks] = useState<IExecutionTask[]>([]);
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);

  // Form & Search States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [executionTab, setExecutionTab] = useState<'Pending' | 'In Progress' | 'Completed' | 'On Hold'>('In Progress');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    dueDate: ''
  });

  // Fetch initial data from MongoDB API
  useEffect(() => {
    async function fetchData() {
      try {
        const [ideasRes, tasksRes] = await Promise.all([
          fetch('/api/ideas'),
          fetch('/api/ideas/execution')
        ]);
        if (ideasRes.ok && tasksRes.ok) {
          const fetchedIdeas = await ideasRes.json();
          const fetchedTasks = await tasksRes.json();
          setIdeas(fetchedIdeas);
          setExecutionTasks(fetchedTasks);
        }
      } catch (error) {
        console.error('Failed to load data from MongoDB:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Create Idea Handler (MongoDB API)
  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const createdIdea = await res.json();
        setIdeas(prev => [createdIdea, ...prev]);
        setFormData({
          title: '',
          description: '',
          category: '',
          priority: 'Medium',
          dueDate: getTodayDate()
        });
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to add idea:', error);
    }
  };

  // Move Idea to Execution Handler (MongoDB API)
  const handleMoveToExecution = async (idea: IIdea) => {
    try {
      const res = await fetch('/api/ideas/execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId: idea._id,
          title: idea.title,
          priority: idea.priority,
          dueDate: idea.dueDate,
          notes: idea.description
        })
      });

      if (res.ok) {
        const newTask = await res.json();
        setIdeas(prev => prev.map(i => i._id === idea._id ? { ...i, status: 'In Execution' } : i));
        setExecutionTasks(prev => [newTask, ...prev]);
        setActiveTab('execution');
        setExecutionTab('Pending');
      }
    } catch (error) {
      console.error('Failed to move to execution:', error);
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    updatePayload: Partial<Pick<IExecutionTask, 'status' | 'progress' | 'subtasks'>>
  ): Promise<boolean> => {
    setActionError('');

    try {
      const response = await fetch(`/api/ideas/execution/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        throw new Error(`Task update failed (${response.status})`);
      }

      const updatedTask: IExecutionTask = await response.json();
      setExecutionTasks(prev => prev.map(task =>
        task._id === taskId ? updatedTask : task
      ));
      return true;
    } catch (error) {
      console.error('Failed to update task:', error);
      setActionError(error instanceof Error ? error.message : 'Failed to update task');
      return false;
    }
  };

  const handleCompleteTask = async (task: IExecutionTask): Promise<boolean> => {
    return handleUpdateTask(task._id, {
      status: 'Completed',
      progress: 100,
      subtasks: task.subtasks.map(subtask => ({ ...subtask, completed: true })),
    });
  };

  const handleCompleteIdea = async (idea: IIdea) => {
    const tasks = executionTasks.filter(task => task.ideaId === idea._id);
    if (tasks.length === 0) {
      setActionError('No execution task was found for this idea.');
      return;
    }

    setActionError('');
    const results = await Promise.all(tasks.map(handleCompleteTask));
    if (results.every(Boolean)) {
      setActionError('');
    }
  };

  // Toggle Subtask Completion (MongoDB API)
  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = executionTasks.find(t => t._id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map(st =>
      (st._id === subtaskId || st.id === subtaskId) ? { ...st, completed: !st.completed } : st
    );

    const compCount = updatedSubtasks.filter(st => st.completed).length;
    const autoProgress = updatedSubtasks.length > 0 ? Math.round((compCount / updatedSubtasks.length) * 100) : task.progress;
    const newStatus: IExecutionTask['status'] = autoProgress === 100
      ? 'Completed'
      : (task.status === 'Completed' || task.status === 'Pending' ? 'In Progress' : task.status);

    await handleUpdateTask(taskId, {
      subtasks: updatedSubtasks,
      progress: autoProgress,
      status: newStatus
    });
  };

  // Delete Idea Handler (MongoDB API)
  const handleDeleteIdea = async (id: string) => {
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setIdeas(prev => prev.filter(i => i._id !== id));
        setExecutionTasks(prev => prev.filter(t => t.ideaId !== id));
      }
    } catch (error) {
      console.error('Failed to delete idea:', error);
    }
  };

  const reminderTask = executionTasks.find(task => task.status === 'In Progress');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 min-h-screen sm:min-h-210 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Top Header Navigation Tabs */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl w-full">
            <button
              onClick={() => setActiveTab('ideas')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ideas' 
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lightbulb size={16} /> Ideas ({ideas.length})
            </button>
            <button
              onClick={() => setActiveTab('execution')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'execution' 
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PlayCircle size={16} /> Execution ({executionTasks.length})
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-xs text-slate-400 py-10">Loading MongoDB data...</div>
          ) : (
            <>
              {/* IDEAS SECTION */}
              {activeTab === 'ideas' && (
                <div className="space-y-4">
                  {actionError && (
                    <p role="alert" className="text-xs text-rose-500">{actionError}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold">Captured Ideas</h2>
                    <button
                      onClick={() => {
                        setFormData(current => ({ ...current, dueDate: getTodayDate() }));
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1"
                    >
                      <Plus size={16} /> Add Idea
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter ideas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-3">
                    {ideas
                      .filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(idea => (
                        <div key={idea._id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded">
                              {idea.category}
                            </span>
                            <button onClick={() => handleDeleteIdea(idea._id)} className="text-slate-400 hover:text-rose-500">
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <h3 className="font-bold text-sm">{idea.title}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{idea.description}</p>

                          <div className="pt-2 flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">Due: {idea.dueDate}</span>
                            {idea.status === 'Idea' ? (
                              <button
                                onClick={() => handleMoveToExecution(idea)}
                                className="px-3 py-1 bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-600 transition-colors"
                              >
                                Execute <ArrowRight size={12} />
                              </button>
                            ) : (
                              (() => {
                                const linkedTasks = executionTasks.filter(task => task.ideaId === idea._id);
                                const isComplete = linkedTasks.length > 0 &&
                                  linkedTasks.every(task => task.status === 'Completed');

                                return isComplete ? (
                                  <span className="font-bold text-emerald-500">Completed</span>
                                ) : (
                                  <button
                                    onClick={() => handleCompleteIdea(idea)}
                                    className="px-3 py-1 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors"
                                  >
                                    Done
                                  </button>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* EXECUTION SECTION */}
              {activeTab === 'execution' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
                    {(['Pending', 'In Progress', 'Completed', 'On Hold'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setExecutionTab(tab)}
                        className={`py-1.5 rounded-lg text-center transition-all ${
                          executionTab === tab 
                            ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {executionTasks
                      .filter(task => task.status === executionTab)
                      .map(task => (
                        <div key={task._id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-sm">{task.title}</h3>
                            <span className="text-xs font-extrabold text-emerald-500">{task.progress}%</span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${task.progress}%` }}></div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Subtasks Breakdown</p>
                            {task.subtasks.map(st => {
                              const stId = st._id || st.id || '';
                              return (
                                <div
                                  key={stId}
                                  onClick={() => handleToggleSubtask(task._id, stId)}
                                  className="flex items-center space-x-2 text-xs cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                >
                                  {st.completed ? <CheckSquare size={14} className="text-emerald-500 shrink-0" /> : <Square size={14} className="text-slate-400 shrink-0" />}
                                  <span className={st.completed ? 'line-through text-slate-400' : ''}>{st.title}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 flex justify-between items-center text-xs">
                            <span className="text-[11px] text-slate-400">Due: {task.dueDate}</span>
                            <div className="flex gap-2">
                              {(task.status === 'Pending' || task.status === 'On Hold') && (
                                <button
                                  onClick={() => handleUpdateTask(task._id, { status: 'In Progress' })}
                                  className="px-2.5 py-1 bg-sky-600 text-white font-bold rounded-lg text-[11px] hover:bg-sky-700"
                                >
                                  {task.status === 'Pending' ? 'Start Task' : 'Resume Task'}
                                </button>
                              )}
                              {task.status !== 'Completed' && (
                                <button
                                  onClick={() => handleCompleteTask(task)}
                                  className="px-2.5 py-1 bg-emerald-500 text-white font-bold rounded-lg text-[11px] hover:bg-emerald-600"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {!executionTasks.some(task => task.status === executionTab) && (
                      <p className="py-8 text-center text-xs text-slate-400">
                        No {executionTab.toLowerCase()} tasks.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm">Add New Idea</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>

              <form onSubmit={handleAddIdea} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData(current => ({
                        ...current,
                        category: e.target.value,
                      }))}
                      placeholder="Enter category"
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow hover:bg-emerald-600">
                  Save Idea
                </button>
              </form>
            </div>
          </div>
        )}

        {reminderTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-reminder-title"
              className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700 bg-white p-5 shadow-2xl dark:bg-slate-900"
            >
              <div>
                <h3 id="task-reminder-title" className="font-bold">Task reminder</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  “{reminderTask.title}” is in progress. This reminder stays open until you mark the task done.
                </p>
                {actionError && <p role="alert" className="text-xs text-rose-500">{actionError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { void handleCompleteTask(reminderTask); }}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}