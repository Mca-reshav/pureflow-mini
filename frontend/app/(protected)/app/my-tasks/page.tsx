'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import api from '../../../../lib/api';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  expectedMinutes?: number;
  project: { id: string; name: string };
  _count?: { timeEntries: number };
}

export default function MyTasksPage() {
  const { permissions } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [logTask, setLogTask] = useState<Task | null>(null);
  const [logForm, setLogForm] = useState({ minutes: '', entryDate: '', notes: '' });
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState('');
  const [logSuccess, setLogSuccess] = useState('');

  useEffect(() => { fetchMyTasks(); }, []);

  async function fetchMyTasks() {
    try {
      setLoading(true);
      const res = await api.get('/tasks/my');
      if (res.data?.success) setTasks(res.data.data);
    } catch { setError('Failed to load tasks'); }
    finally { setLoading(false); }
  }

  async function handleLogTime(e: React.FormEvent) {
    e.preventDefault();
    if (!logTask) return;
    setLogLoading(true);
    setLogError('');
    setLogSuccess('');
    try {
      const res = await api.post('/time', {
        taskId: logTask.id,
        minutes: parseInt(logForm.minutes),
        entryDate: logForm.entryDate,
        notes: logForm.notes || undefined,
      });
      if (res.data?.success) {
        setLogSuccess(res.data.message ?? 'Time logged success');
        setLogForm({ minutes: '', entryDate: '', notes: '' });
        setTimeout(() => {
          setLogTask(null);
          setLogSuccess('');
        }, 1500);
      } else {
        setLogError(res.data?.message ?? 'Failed to log time');
      }
    } catch (err: any) {
      setLogError(err?.response?.data?.message ?? 'Failed to log time');
    } finally { setLogLoading(false); }
  }

  const priorityColor: Record<string, string> = {
    low: 'text-gray-500',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };

  const statusColor: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-600',
  };

  if (loading) return <p className="text-sm text-gray-500">Loading tasks...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">My Tasks</h2>
        <p className="text-sm text-gray-500">{tasks.length} tasks assigned to you</p>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400">No tasks assigned to you.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                {permissions?.['expected_hours.read'] && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Min</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                {permissions?.['time.log'] && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{task.title}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{task.project.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[task.status] ?? 'bg-gray-100'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium capitalize ${priorityColor[task.priority]}`}>
                    {task.priority}
                  </td>
                  {permissions?.['expected_hours.read'] && (
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {task.expectedMinutes ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {task.dueDate ? task.dueDate.split('T')[0] : '—'}
                  </td>
                  {permissions?.['time.log'] && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setLogTask(task); setLogError(''); setLogSuccess(''); }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Log Time
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Log Time</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{logTask.title}</p>
            <form onSubmit={handleLogTime} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Minutes spent</label>
                <input
                  type="number"
                  placeholder="e.g. 90"
                  min="1"
                  value={logForm.minutes}
                  onChange={(e) => setLogForm({ ...logForm, minutes: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input
                  type="date"
                  value={logForm.entryDate}
                  onChange={(e) => setLogForm({ ...logForm, entryDate: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                <textarea
                  placeholder="What did you work on?"
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                />
              </div>
              {logError && <p className="text-xs text-red-600">{logError}</p>}
              {logSuccess && <p className="text-xs text-green-600">{logSuccess}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={logLoading}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {logLoading ? 'Logging...' : 'Log Time'}
                </button>
                <button
                  type="button"
                  onClick={() => setLogTask(null)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}