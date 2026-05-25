'use client';

import { useAuth } from '../../../../hooks/useAuth';
import DashboardAnalytics from './components/Analytics';

export default function DashboardPage() {
  const { me } = useAuth();

   return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">
        Welcome, {me?.name}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Here is your overview for today.
      </p>
      {me && <DashboardAnalytics me={me} />}
    </div>
  );
}