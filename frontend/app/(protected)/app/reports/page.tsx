'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import api from '../../../../lib/api';

interface ReportArtifact {
    id: string;
    filename: string;
    sizeBytes: number;
    mimeType?: string;
    createdAt?: string;
}

interface ReportJob {
    id: string;
    status: 'queued' | 'running' | 'failed' | 'completed';
    format: string;
    queuedAt: string;
    completedAt?: string;
    startedAt?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    artifact?: ReportArtifact;
}

interface CreateReportDto {
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    format: 'csv' | 'xlsx';
}

const STATUS_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
    queued: { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', label: 'Queued' },
    running: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400 animate-pulse', label: 'Running' },
    failed: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-400', label: 'Failed' },
    completed: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-400', label: 'Completed' },
};

function fmt(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium', timeStyle: 'short',
    });
}

function fmtBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


export default function ReportsPage() {
    const { permissions } = useAuth();

    const [jobs, setJobs] = useState<ReportJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showExport, setShowExport] = useState(false);
    const [form, setForm] = useState<CreateReportDto>({ format: 'csv' });
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
    const [downloading, setDownloading] = useState<string | null>(null);

    async function fetchJobs() {
        try {
            setLoading(true);
            const res = await api.get('/reports/jobs');
            if (res.data?.success) {
                setJobs(res.data.data);
                res.data.data.forEach((job: ReportJob) => {
                    if (job.status === 'queued' || job.status === 'running')
                        startPolling(job.id);
                });
            }
        } catch {
            setError('Failed to load report jobs');
        } finally {
            setLoading(false);
        }
    }

    function startPolling(jobId: string) {
        if (pollingRef.current.has(jobId)) return;

        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/reports/jobs/${jobId}`);
                if (res.data?.success) {
                    const updated: ReportJob = res.data.data;
                    setJobs((prev) =>
                        prev.map((j) => (j.id === jobId ? { ...j, ...updated } : j)),
                    );
                    if (updated.status === 'completed' || updated.status === 'failed')
                        stopPolling(jobId);
                }
            } catch {
                stopPolling(jobId);
            }
        }, 4000);

        pollingRef.current.set(jobId, interval);
    }

    function stopPolling(jobId: string) {
        const interval = pollingRef.current.get(jobId);
        if (interval) {
            clearInterval(interval);
            pollingRef.current.delete(jobId);
        }
    }

    async function handleExport() {
        setExporting(true);
        setExportError('');
        try {
            const res = await api.post('/reports/export', form);
            if (res.data?.success) {
                setShowExport(false);
                setForm({ format: 'csv' });
                const newJob: ReportJob = {
                    id: res.data.data.jobId,
                    status: 'queued',
                    format: res.data.data.format,
                    queuedAt: new Date().toISOString(),
                };
                setJobs((prev) => [newJob, ...prev]);
                startPolling(newJob.id);
            } else
                setExportError(res.data?.message ?? 'Failed to queue export');
        } catch (err: any) {
            setExportError(err?.response?.data?.message ?? 'Failed to queue export');
        } finally {
            setExporting(false);
        }
    }

    async function handleDownload(artifactId: string, filename: string) {
        setDownloading(artifactId);
        try {
            const res = await api.get(`/reports/artifacts/${artifactId}/download`);
            if (res.data?.success) {
                const { signedUrl, filename: fname } = res.data.data;
                const a = document.createElement('a');
                a.href = signedUrl;
                a.download = fname ?? filename;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch {
        } finally {
            setDownloading(null);
        }
    }

    useEffect(() => {
        fetchJobs();
        return () => {
            pollingRef.current.forEach((interval) => clearInterval(interval));
            pollingRef.current.clear();
        };
    }, []);

    if (loading) return <p className="text-sm text-gray-500">Loading reports...</p>;
    if (error) return <p className="text-sm text-red-500">{error}</p>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Reports</h2>
                    <p className="text-sm text-gray-500">{jobs.length} export jobs</p>
                </div>
                {permissions?.['report.export'] && (
                    <button
                        onClick={() => setShowExport(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
                    >
                        + Export Report
                    </button>
                )}
            </div>

            {jobs.length === 0 ? (
                <p className="text-sm text-gray-400">No export jobs yet.</p>
            ) : (
                <div className="space-y-3">
                    {jobs.map((job) => {
                        const s = STATUS_STYLE[job.status] ?? { badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', label: job.status };

                        return (
                            <div
                                key={job.id}
                                className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>
                                        {s.label}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800">
                                        {job.format.toUpperCase()} Export
                                        {job.projectId && (
                                            <span className="ml-2 text-xs text-gray-400">
                                                Project: {job.projectId}
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex flex-wrap gap-x-4 mt-0.5">
                                        <p className="text-xs text-gray-400">Queued: {fmt(job.queuedAt)}</p>
                                        {job.dateFrom && (
                                            <p className="text-xs text-gray-400">
                                                Range: {fmt(job.dateFrom)} → {fmt(job.dateTo)}
                                            </p>
                                        )}
                                        {job.artifact && (
                                            <p className="text-xs text-gray-400">
                                                Size: {fmtBytes(job.artifact.sizeBytes)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {job.status === 'completed' && job.artifact && (
                                    <button
                                        onClick={() => handleDownload(job.artifact!.id, job.artifact!.filename)}
                                        disabled={downloading === job.artifact.id}
                                        className="shrink-0 bg-indigo-600 text-white px-3 py-1.5 rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {downloading === job.artifact.id ? 'Preparing...' : 'Download'}
                                    </button>
                                )}

                                {(job.status === 'queued' || job.status === 'running') && (
                                    <p className="shrink-0 text-xs text-gray-400 italic">Polling…</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showExport && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">New Report Export</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Format</label>
                                <select
                                    value={form.format}
                                    onChange={(e) => setForm({ ...form, format: e.target.value as 'csv' | 'xlsx' })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="csv">CSV</option>
                                    <option value="xlsx">Excel (XLSX)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Project ID (optional)</label>
                                <input
                                    placeholder="Leave blank for all projects"
                                    value={form.projectId ?? ''}
                                    onChange={(e) => setForm({ ...form, projectId: e.target.value || undefined })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                                    <input
                                        type="date"
                                        value={form.dateFrom ?? ''}
                                        onChange={(e) => setForm({ ...form, dateFrom: e.target.value || undefined })}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">To</label>
                                    <input
                                        type="date"
                                        value={form.dateTo ?? ''}
                                        onChange={(e) => setForm({ ...form, dateTo: e.target.value || undefined })}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            {exportError && <p className="text-xs text-red-600">{exportError}</p>}

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleExport}
                                    disabled={exporting}
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {exporting ? 'Queueing...' : 'Queue Export'}
                                </button>
                                <button
                                    onClick={() => { setShowExport(false); setExportError(''); }}
                                    className="flex-1 border border-gray-300 text-gray-600 py-2 rounded text-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}