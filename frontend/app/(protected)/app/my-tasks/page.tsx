'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import api from '../../../../lib/api';
import { Task } from './components/types';
import LogTimeModal from './components/LogTimeModal';
import ViewLogsModal from './components/ViewLogsModal';

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

export default function MyTasksPage() {
  const { permissions } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [logTask, setLogTask]           = useState<Task | null>(null);
  const [viewLogsTask, setViewLogsTask] = useState<Task | null>(null);

  useEffect(() => { fetchMyTasks(); }, []);

  async function fetchMyTasks() {
    try {
      setLoading(true);
      const res = await api.get('/tasks/my');
      if (res.data?.success) setTasks(res.data.data);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading tasks...</p>;
  if (error)   return <p className="text-sm text-red-500">{error}</p>;

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setLogTask(task)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium text-left"
                        >
                          Log Time
                        </button>
                        <button
                          onClick={() => setViewLogsTask(task)}
                          className="text-xs text-gray-400 hover:text-gray-600 font-medium text-left"
                        >
                          View Logs
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logTask && (
        <LogTimeModal
          task={logTask}
          onClose={() => setLogTask(null)}
        />
      )}

      {viewLogsTask && (
        <ViewLogsModal
          task={viewLogsTask}
          onClose={() => setViewLogsTask(null)}
        />
      )}
    </div>
  );
}