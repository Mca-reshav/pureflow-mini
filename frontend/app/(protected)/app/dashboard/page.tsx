'use client';

import { useAuth } from '../../../../hooks/useAuth';

export default function DashboardPage() {
  const { me } = useAuth();

  const stats = [
    {
      label: 'Role',
      value: me?.role,
      valueClass: 'text-indigo-600',
    },
    {
      label: 'Status',
      value: me?.status,
      valueClass: 'text-green-600 capitalize',
    },
    {
      label: 'Notifications',
      value: `${me?.unreadNotificationCount ?? 0} unread`,
      valueClass: 'text-gray-800',
    },
  ];
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">
        Welcome, {me?.name}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Here is your overview for today.
      </p>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-lg font-semibold ${item.valueClass}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}