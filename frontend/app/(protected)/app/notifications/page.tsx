'use client';

import { useEffect, useRef, useState } from 'react';
import api from '../../../../lib/api';
import { getAccessToken } from '@/lib/auth';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  entityType: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { dot: string; badge: string }> = {
  info: { dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700' },
  success: { dot: 'bg-green-400', badge: 'bg-green-100 text-green-700' },
  warning: { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  error: { dot: 'bg-red-400', badge: 'bg-red-100 text-red-700' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data?.success) setNotifications(res.data.data);
    } catch {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data?.success) setUnreadCount(res.data.data?.unreadCount ?? 0);
    } catch {
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.data?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
    } finally {
      setMarkingAll(false);
    }
  }

  useEffect(() => {
    const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
    const token = getAccessToken();
    if (!token) return;

    const url = `${base}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('notification.count', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.data?.unreadCount !== undefined)
          setUnreadCount(payload.data.unreadCount);
        fetchNotifications();
      } catch {}
    });

    es.onerror = (err) => {
      console.error('SSE error:', err);
      if ((err as any)?.status === 401) es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []); 

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  if (loading) return <p className="text-sm text-gray-500">Loading notifications...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center bg-indigo-600 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px]">
                {unreadCount}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">{notifications.length} total</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-400">No notifications yet.</p>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Unread
              </h3>
              <div className="space-y-2">
                {unread.map((n) => (
                  <NotificationRow key={n.id} notification={n} />
                ))}
              </div>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Earlier
              </h3>
              <div className="space-y-2">
                {read.map((n) => (
                  <NotificationRow key={n.id} notification={n} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification: n }: { notification: Notification }) {
  const style = TYPE_STYLES[n.type] ?? TYPE_STYLES['info'];

  const inner = (
    <div
      className={`bg-white rounded-lg border p-4 flex gap-3 transition-shadow hover:shadow-sm ${n.isRead ? 'border-gray-200' : 'border-indigo-200 bg-indigo-50/30'
        }`}
    >
      <div className="flex-shrink-0 mt-1.5">
        <span
          className={`block w-2 h-2 rounded-full ${n.isRead ? 'bg-gray-300' : style.dot
            }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className={`text-sm font-medium truncate ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
            {n.title}
          </p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}
          >
            {n.type}
          </span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2">{n.body}</p>
        <strong className="text-xs text-gray-500 line-clamp-2 mt-2">{n.entityType.toUpperCase()}</strong>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
    </div>
  );

  if (n.link) {
    return (
      <a href={n.link} className="block">
        {inner}
      </a>
    );
  }

  return inner;
}