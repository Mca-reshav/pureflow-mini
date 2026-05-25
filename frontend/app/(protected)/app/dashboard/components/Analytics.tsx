'use client';

import { MeResponse } from '@/types';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';

export default function DashboardAnalytics({
  me,
}: Partial<MeResponse>) {
  const projectSummary = me?.projectSummary;
  const recentTasks = me?.recentTasks ?? [];
  const loggedHours = me?.loggedHours ?? [];
  const notificationCount = me?.notificationCount ?? 0;

  const groupedHours = loggedHours.reduce(
    (acc, item) => {
      const date = dayjs(item.createdAt).format(
        'DD MMM',
      );

      acc[date] =
        (acc[date] || 0) + item.minutes / 60;

      return acc;
    },
    {} as Record<string, number>,
  );

  const hoursChartData = Object.entries(
    groupedHours,
  ).map(([date, hours]) => ({
    date,
    hours: Number(hours.toFixed(1)),
  }));

  const taskStatusMap = recentTasks.reduce(
    (acc, task) => {
      acc[task.status] =
        (acc[task.status] || 0) + 1;

      return acc;
    },
    {} as Record<string, number>,
  );

  const taskChartData = Object.entries(
    taskStatusMap,
  ).map(([status, count]) => ({
    status,
    count,
  }));

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">
            Unread Notification
          </p>

          <p className="text-2xl font-semibold text-indigo-600">
            {
              notificationCount
            }
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">
            Active Projects
          </p>

          <p className="text-2xl font-semibold text-indigo-600">
            {
              projectSummary?.activeProjectsCount
            }
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">
            Completed
          </p>

          <p className="text-2xl font-semibold text-green-600">
            {
              projectSummary?.completedProjectsCount
            }
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">
            Latest Project
          </p>

          <p className="text-sm font-semibold text-gray-800 truncate">
            {
              projectSummary?.latestProject
                ?.name
            }
          </p>

          <p className="text-xs text-gray-500 mt-1">
            {dayjs(
              projectSummary?.latestProject
                ?.startDate,
            ).format('DD MMM')}
            {' - '}
            {dayjs(
              projectSummary?.latestProject
                ?.endDate,
            ).format('DD MMM')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-800">
              Weekly Hours
            </h3>

            <p className="text-xs text-gray-500">
              Logged work overview
            </p>
          </div>

          <div className="h-40">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart data={hoursChartData}>
                <XAxis
                  dataKey="date"
                  fontSize={11}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="hours"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-800">
              Task Status
            </h3>

            <p className="text-xs text-gray-500">
              Recent task analytics
            </p>
          </div>

          <div className="h-40">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={taskChartData}>
                <XAxis
                  dataKey="status"
                  fontSize={11}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">
            Recent Tasks
          </h3>

          <span className="text-xs text-gray-500">
            {recentTasks.length} tasks
          </span>
        </div>

        <div className="space-y-2">
          {recentTasks.slice(0, 3).map((task) => (
            <div
              key={task.title}
              className="border border-gray-100 rounded-md px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {task.title}
                </p>

                <span className="text-[10px] px-2 py-1 rounded bg-gray-100 capitalize text-gray-600 whitespace-nowrap">
                  {task.priority}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500 capitalize">
                  {task.status}
                </span>

                <span className="text-xs text-gray-500">
                  {dayjs(
                    task.dueDate,
                  ).format('DD MMM')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}