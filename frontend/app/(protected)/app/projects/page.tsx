'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../hooks/useAuth';
import api from '../../../../lib/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  _count: { members: number; tasks: number };
}

export default function ProjectsPage() {
  const { permissions } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      if (res.data?.success) setProjects(res.data.data);
    } catch { setError('Failed to load projects'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await api.post('/projects', form);
      if (res.data?.success) {
        setShowCreate(false);
        setForm({ name: '', description: '', startDate: '', endDate: '' });
        fetchProjects();
      } else 
        setCreateError(res.data?.message ?? 'Failed to create');
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? 'Failed to create project');
    } finally { setCreateLoading(false); }
  }

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-500',
    completed: 'bg-blue-100 text-blue-700',
  };

  if (loading) return <p className="text-sm text-gray-500">Loading projects...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Projects</h2>
          <p className="text-sm text-gray-500">{projects.length} total</p>
        </div>
        {permissions?.['project.create'] && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
          >
            + New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-gray-400">No projects found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/app/projects/${p.id}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-800 truncate">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${statusColor[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {p.status}
                  </span>
                </div>
                {p.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto">
                  {permissions?.['capacity.team'] && <span> {p._count.members} members</span>}
                  <span> {p._count.tasks} tasks</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Owner: {p.owner.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">New Project</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {createError && <p className="text-xs text-red-600">{createError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
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