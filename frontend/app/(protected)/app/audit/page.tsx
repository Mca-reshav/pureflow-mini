'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { AuditEvent, AuditFilters } from './components/types';
import JsonCell from './components/JsonCell';


const ENTITY_TYPES = ['auth', 'tasks', 'projects', 'users', 'notifications', 'reports', 'time'];
const LIMIT_OPTIONS = [10, 25, 50];
const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  BM: 'bg-blue-100 text-blue-700',
  ANALYST: 'bg-gray-100 text-gray-600',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  });
}

const DEFAULT_FILTERS: AuditFilters = {
  entityType: '',
  action: '',
  actorId: '',
  limit: 25,
  offset: 0,
};

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);

  const fetchEvents = useCallback(async (f: AuditFilters) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = {
        limit: f.limit,
        offset: f.offset,
      };
      if (f.entityType) params.entityType = f.entityType;
      if (f.action) params.action = f.action;

      const res = await api.get('/audit/events', { params });
      if (res.data?.success) {
        setEvents(res.data.data ?? []);
        setTotal(res.data.meta.total ?? res.data.data?.length ?? 0);
      } else
        setError(res.data?.message ?? 'Failed to load audit events');

    } catch {
      setError('Failed to load audit events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(filters); }, []);

  function applyFilters(partial: Partial<AuditFilters>) {
    const next = { ...filters, ...partial, offset: 0 };
    setFilters(next);
    fetchEvents(next);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    fetchEvents(DEFAULT_FILTERS);
  }

  function changePage(direction: 'prev' | 'next') {
    const next = {
      ...filters,
      offset: direction === 'next'
        ? filters.offset + filters.limit
        : Math.max(0, filters.offset - filters.limit),
    };
    setFilters(next);
    fetchEvents(next);
  }

  const currentPage = Math.floor(filters.offset / filters.limit) + 1,
    totalPages = Math.ceil(total / filters.limit),
  hasActive = filters.entityType || filters.action || filters.actorId;

  const labels = ['Actor', 'Role', 'Action', 'Entity', 'Before', 'After', 'Time']
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Audit Log</h2>
          <p className="text-sm text-gray-500">{total} total events</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Entity Type</label>
            <select
              value={filters.entityType}
              onChange={(e) => applyFilters({ entityType: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 min-w-[140px]"
            >
              <option value="">All types</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Action</label>
            <input
              placeholder="e.g. CREATE"
              value={filters.action}
              onChange={(e) => applyFilters({ action: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 min-w-[140px]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Per page</label>
            <select
              value={filters.limit}
              onChange={(e) => applyFilters({ limit: Number(e.target.value) })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700"
            >
              {LIMIT_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {hasActive && (
            <button
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 mb-0.5"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : loading ? (
        <p className="text-sm text-gray-500">Loading audit events...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-400">No audit events found.</p>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {
                      labels.map((val) => (
                        <td key={val} 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {val}</td>
                      ))
                    }
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{e.actor?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{e.actor?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[e.actor?.role] ?? 'bg-gray-100 text-gray-500'}`}>
                          {e.actor?.role ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {e.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.entityType}</td>
                      <td className="px-4 py-3">
                        <JsonCell data={e.beforeJson} label="Before" />
                      </td>
                      <td className="px-4 py-3">
                        <JsonCell data={e.afterJson} label="After" />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {fmt(e.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <p>
              Showing {filters.offset + 1}-{Math.min(filters.offset + filters.limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => changePage('prev')}
                disabled={filters.offset === 0}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => changePage('next')}
                disabled={filters.offset + filters.limit >= total}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}