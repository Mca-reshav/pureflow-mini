'use client';

import { useState } from 'react';
import api from '../../../../../lib/api';
import { Task } from './types';

interface Props {
  task: Task;
  onClose: () => void;
}

export default function LogTimeModal({ task, onClose }: Props) {
  const [form, setForm] = useState({ minutes: '', entryDate: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/time', {
        taskId: task.id,
        minutes: parseInt(form.minutes),
        entryDate: form.entryDate,
        notes: form.notes || undefined,
      });
      if (res.data?.success) {
        setSuccess(res.data.message ?? 'Time logged successfully');
        setForm({ minutes: '', entryDate: '', notes: '' });
        setTimeout(() => onClose(), 1500);
      } else {
        setError(res.data?.message ?? 'Failed to log time');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to log time');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Log Time</h3>
        <p className="text-sm text-gray-500 mb-4 truncate">{task.title}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Minutes spent</label>
            <input
              type="number"
              placeholder="e.g. 90"
              min="1"
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: e.target.value })}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
            <textarea
              placeholder="What did you work on?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
            />
          </div>

          {error   && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Logging...' : 'Log Time'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}