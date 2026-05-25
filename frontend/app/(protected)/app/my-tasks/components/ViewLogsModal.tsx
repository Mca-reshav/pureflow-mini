'use client';

import { useEffect, useState } from 'react';
import api from '../../../../../lib/api';
import { Task, TimeEntry } from './types';

interface Props {
  task: Task;
  onClose: () => void;
}

function fmt(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return '—';
  return dateStr.split('T')[0];
}

export default function ViewLogsModal({ task, onClose }: Props) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get('/time', { params: { task_id: task.id } });
        if (res.data?.success) setEntries(res.data.data);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [task.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col">

        <div className="flex items-start justify-between p-6 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Time Logs</h3>
            <p className="text-sm text-gray-500 truncate">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
          >
            X
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading logs...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-400">No time entries for this task.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg overflow-hidden">

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            {entry.minutes} min
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{fmtDate(entry.entryDate)}</span>
                          {entry.isLate && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                              Late
                            </span>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="text-xs text-gray-500 line-clamp-2">{entry.notes}</p>
                        )}

                        <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                          <span>Created: {fmt(entry.createdAt)}</span>
                          {entry.updatedAt !== entry.createdAt && (
                            <span>Updated: {fmt(entry.updatedAt)}</span>
                          )}
                        </div>
                      </div>

                      {entry.versions?.length > 0 && (
                        <button
                          onClick={() =>
                            setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                          }
                          className="shrink-0 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                        >
                          {expandedEntry === entry.id
                            ? 'Hide history'
                            : `${entry.versions.length} edit${entry.versions.length > 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedEntry === entry.id && entry.versions?.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                      {entry.versions.map((v) => (
                        <div key={v.id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">
                              Version #{v.versionNo}
                            </span>
                            <span className="text-xs text-gray-400">{fmt(v.editedAt)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-red-50 border border-red-100 rounded p-2">
                              <p className="text-xs font-medium text-red-500 mb-1">Before</p>
                              {Object.entries(v.beforeJson).map(([k, val]) => (
                                <p key={k} className="text-xs text-gray-600">
                                  <span className="text-gray-400">{k}:</span> {String(val)}
                                </p>
                              ))}
                            </div>
                            <div className="bg-green-50 border border-green-100 rounded p-2">
                              <p className="text-xs font-medium text-green-600 mb-1">After</p>
                              {Object.entries(v.afterJson).map(([k, val]) => (
                                <p key={k} className="text-xs text-gray-600">
                                  <span className="text-gray-400">{k}:</span> {String(val)}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-600 py-2 rounded text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}