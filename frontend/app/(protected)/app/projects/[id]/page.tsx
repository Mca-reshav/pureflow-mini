'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../hooks/useAuth';
import api from '../../../../../lib/api';

interface Member { 
  id: string; addedAt: string; 
  user: { id: string; name: string; email: string; role: string }; 
}
interface Task { 
  id: string; title: string; status: string; priority: string; 
  dueDate?: string; expectedMinutes?: number; 
  assignee?: { id: string; name: string }; }
interface Project { 
  id: string; name: string; description?: string; 
  status: string; startDate?: string; endDate?: string; 
  owner: { id: string; name: string; email: string }; members: Member[]; tasks: Task[]; }
interface User { id: string; name: string; email: string; role: string; }

const statusColor: Record<string, string> = { 
  active: 'bg-green-100 text-green-700', 
  archived: 'bg-gray-100 text-gray-500', 
  completed: 'bg-blue-100 text-blue-700' 
};
const priorityColor: Record<string, string> = { 
  low: 'text-gray-500', 
  medium: 'text-yellow-600', 
  high: 'text-orange-600', 
  critical: 'text-red-600' 
};

const taskStatusColor: Record<string, string> = { 
  todo: 'bg-gray-100 text-gray-600', 
  in_progress: 'bg-blue-100 text-blue-700', 
  done: 'bg-green-100 text-green-700', 
  blocked: 'bg-red-100 text-red-600' 
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { permissions } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'members'>('tasks');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [selectedUser, setSelectedUser] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assigneeId: '', expectedMinutes: '', dueDate: '' });
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState('');

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ status: '', priority: '', assigneeId: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => { fetchProject(); }, [id]);
  useEffect(() => { if (permissions?.['project.addMember'] || permissions?.['task.assign']) fetchAllUsers(); }, [permissions]);

  async function fetchProject() {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${id}`);
      if (res.data?.success) setProject(res.data.data);
      else setError(res.data?.message ?? 'Project not found');
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Project not found' : 'Failed to load project');
    } finally { setLoading(false); }
  }

  async function fetchAllUsers() {
    try {
      const res = await api.get('/users');
      if (res.data?.success) setAllUsers(res.data.data);
    } catch { }
  }

  async function handleAddMember() {
    if (!selectedUser) return;
    setAddingMember(true); setMemberError('');
    try {
      const res = await api.post(`/projects/${id}/member`, { userId: selectedUser });
      if (res.data?.success) { setSelectedUser(''); fetchProject(); }
      else setMemberError(res.data?.message ?? 'Failed to add member');
    } catch (err: any) { setMemberError(err?.response?.data?.message ?? 'Failed'); }
    finally { setAddingMember(false); }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Remove this member?')) return;
    try { await api.delete(`/projects/${id}/member/${userId}`); fetchProject(); }
    catch (err: any) { alert(err?.response?.data?.message ?? 'Failed'); }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault(); setTaskLoading(true); setTaskError('');
    try {
      const res = await api.post('/tasks', {
        projectId: id,
        title: taskForm.title,
        description: taskForm.description || undefined,
        priority: taskForm.priority,
        assigneeId: taskForm.assigneeId || undefined,
        expectedMinutes: taskForm.expectedMinutes ? parseInt(taskForm.expectedMinutes) : undefined,
        dueDate: taskForm.dueDate || undefined,
      });
      if (res.data?.success) {
        setShowCreateTask(false);
        setTaskForm({ title: '', description: '', priority: 'medium', assigneeId: '', expectedMinutes: '', dueDate: '' });
        fetchProject();
      } else { setTaskError(res.data?.message ?? 'Failed to create task'); }
    } catch (err: any) { setTaskError(err?.response?.data?.message ?? 'Failed'); }
    finally { setTaskLoading(false); }
  }

  function openEditTask(task: Task) {
    setEditTask(task);
    setEditForm({ status: task.status, priority: task.priority, assigneeId: task.assignee?.id ?? '' });
    setEditError('');
  }

  async function handleEditTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editTask) return;
    setEditLoading(true); setEditError('');
    try {
      const res = await api.patch(`/tasks/${editTask.id}`, { status: editForm.status, priority: editForm.priority });
      if (editForm.assigneeId && editForm.assigneeId !== editTask.assignee?.id)
        await api.patch(`/tasks/${editTask.id}/assign`, { assigneeId: editForm.assigneeId });
      if (res.data?.success) { setEditTask(null); fetchProject(); }
      else setEditError(res.data?.message ?? 'Failed to update');
    } catch (err: any) { setEditError(err?.response?.data?.message ?? 'Failed'); }
    finally { setEditLoading(false); }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading project...</p>;
  if (error) return <div><p className="text-sm text-red-500 mb-3">{error}</p><button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline">Go back</button></div>;
  if (!project) return null;

  const existingMemberIds = project.members.map((m) => m.user.id);
  const availableUsers = allUsers.filter((u) => !existingMemberIds.includes(u.id));

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 block">Projects</button>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-semibold text-gray-800">{project.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[project.status]}`}>{project.status}</span>
            </div>
            {project.description && <p className="text-sm text-gray-500 mb-2">{project.description}</p>}
            <p className="text-xs text-gray-400">Owner: {project.owner.name}</p>
            {(project.startDate || project.endDate) && (
              <p className="text-xs text-gray-400 mt-1">{project.startDate?.split('T')[0]} to {project.endDate?.split('T')[0]}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>{project.tasks.length} tasks</p>
            {permissions?.['capacity.team'] && <p>{project.members.length} members</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['tasks', 'members'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize transition-colors ${activeTab === tab ? 
            'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 
            'text-gray-500 hover:text-gray-700'}`}>
            {tab} ({tab === 'tasks' ? project.tasks.length : permissions?.['capacity.team'] ? project.members.length: 0})
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div>
          {permissions?.['task.create'] && (
            <div className="mb-3 flex justify-end">
              <button onClick={() => setShowCreateTask(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700">+ New Task</button>
            </div>
          )}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {project.tasks.length === 0 ? (
              <p className="text-sm text-gray-400 p-4">No tasks yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                    {permissions?.['expected_hours.read'] && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Min</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                    {permissions?.['task.assign'] && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edit</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{task.title}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${taskStatusColor[task.status] ?? 'bg-gray-100'}`}>{task.status.replace('_', ' ')}</span>
                      </td>
                      <td className={`px-4 py-3 text-xs font-medium capitalize ${priorityColor[task.priority]}`}>{task.priority}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{task.assignee?.name ?? '—'}</td>
                      {permissions?.['expected_hours.read'] && (
                        <td className="px-4 py-3 text-gray-500 text-xs">{task.expectedMinutes ?? '—'}</td>
                      )}
                      <td className="px-4 py-3 text-gray-500 text-xs">{task.dueDate ? task.dueDate.split('T')[0] : '—'}</td>
                      {permissions?.['task.assign'] && (
                        <td className="px-4 py-3">
                          <button onClick={() => openEditTask(task)} className="text-xs text-indigo-600 hover:text-indigo-800">Edit</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' &&  permissions?.['capacity.team'] && (
        <div>
          {permissions?.['project.addMember'] && availableUsers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Add Member</p>
              <div className="flex gap-2">
                <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="">Select user...</option>
                  {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                <button onClick={handleAddMember} disabled={!selectedUser || addingMember} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {addingMember ? 'Adding...' : 'Add'}
                </button>
              </div>
              {memberError && <p className="text-xs text-red-600 mt-1">{memberError}</p>}
            </div>
          )}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {project.members.length === 0 ? <p className="text-sm text-gray-400 p-4">No members yet.</p> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                    {permissions?.['project.addMember'] && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.members.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{m.user.name}</td>
                      <td className="px-4 py-3 text-gray-500">{m.user.email}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{m.user.role}</span></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(m.addedAt).toLocaleDateString()}</td>
                      {permissions?.['project.addMember'] && (
                        <td className="px-4 py-3"><button onClick={() => handleRemoveMember(m.user.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showCreateTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <textarea placeholder="Description (optional)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <input type="number" placeholder="Est. minutes" min="1" value={taskForm.expectedMinutes} onChange={(e) => setTaskForm({ ...taskForm, expectedMinutes: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <select value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">Assign to... (optional)</option>
                {project.members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
              </select>
              <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              {taskError && <p className="text-xs text-red-600">{taskError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={taskLoading} className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">{taskLoading ? 'Creating...' : 'Create'}</button>
                <button type="button" onClick={() => setShowCreateTask(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Edit Task</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{editTask.title}</p>
            <form onSubmit={handleEditTask} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              {permissions?.['task.assign'] && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Assign to</label>
                  <select value={editForm.assigneeId} onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">Unassigned</option>
                    {project.members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
                  </select>
                </div>
              )}
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={editLoading} className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">{editLoading ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setEditTask(null)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}