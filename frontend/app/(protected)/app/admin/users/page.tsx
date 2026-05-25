/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../hooks/useAuth';
import api from '../../../../../lib/api';
import { User, CreateUserPayload } from '../../../../../types';

export default function UsersPage() {
  const router = useRouter();
  const { permissions } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    name: '', email: '', password: '', role: 'ANALYST',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (permissions && !permissions['admin.users'])
      router.replace('/not-authorized');
  }, [permissions, router]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.data?.success) setUsers(res.data.data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await api.post('/users', createForm);
      if (res.data?.success) {
        setShowCreate(false);
        setCreateForm({ name: '', email: '', password: '', role: 'ANALYST' });
        fetchUsers();
      } else {
        setCreateError(res.data?.message ?? 'Failed to create user');
      }
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to deactivate');
    }
  }

  async function handleReactivate(id: string) {
    if (!confirm('Reactivate this user?')) return;
    try {
      await api.patch(`/users/reactivate/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to reactivate');
    }
  }

  async function handleRoleChange(id: string, role: string) {
    try {
      await api.patch(`/users/${id}`, { role });
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to update role');
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading users...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  const roles = ['ADMIN', 'BM', 'ANALYST'];
  const labels = ['Name', 'Email', 'Role', 'Status', 'Actions']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Users</h2>
          <p className="text-sm text-gray-500">{users.length} total</p>
        </div>
        {permissions?.['admin.users'] && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
          >
            + Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {labels.map((label) => (
                <th key={label}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                    }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.status === 'active' ? (
                    <button
                      onClick={() => handleDeactivate(user.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(user.id)}
                      className="text-xs text-green-500 hover:text-red-700"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add User</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {createError && (
                <p className="text-xs text-red-600">{createError}</p>
              )}
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