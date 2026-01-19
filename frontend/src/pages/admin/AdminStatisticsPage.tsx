/**
 * Admin Statistics Page
 * System-wide statistics and reports dashboard
 */

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useState } from "react";
import { Icons } from "../../components/Icons";
import { Button, Input } from "../../components/ui";
import { adminService } from "../../services/adminService";

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  description?: string;
  color: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
}

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = "neutral",
  description,
  color,
}: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      icon: "bg-blue-100 text-blue-600",
      text: "text-blue-600",
    },
    green: {
      bg: "bg-green-50",
      icon: "bg-green-100 text-green-600",
      text: "text-green-600",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "bg-purple-100 text-purple-600",
      text: "text-purple-600",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "bg-orange-100 text-orange-600",
      text: "text-orange-600",
    },
    red: {
      bg: "bg-red-50",
      icon: "bg-red-100 text-red-600",
      text: "text-red-600",
    },
    cyan: {
      bg: "bg-cyan-50",
      icon: "bg-cyan-100 text-cyan-600",
      text: "text-cyan-600",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} rounded-xl p-6 border border-gray-100`}>
      <div className="flex items-center justify-between">
        <div className={`${classes.icon} p-3 rounded-lg`}>
          <Icon className="h-6 w-6" />
        </div>
        {change && (
          <span
            className={`text-xs font-medium ${
              changeType === "increase"
                ? "text-green-600"
                : changeType === "decrease"
                  ? "text-red-600"
                  : "text-gray-600"
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">{title}</p>
        <p className={`text-3xl font-bold ${classes.text} mt-1`}>{value}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

// Activity Chart Placeholder
function ActivityChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Activity Overview
      </h3>
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <Icons.BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Activity chart coming soon</p>
        </div>
      </div>
    </div>
  );
}

// Recent Activity List
interface RecentActivityProps {
  activities: Array<{
    id: number;
    type: string;
    user: string;
    action: string;
    time: string;
  }>;
}

function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Activity
      </h3>
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Icons.Activity className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icons.Activity className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user}</span>{" "}
                  {activity.action}
                </p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Top Users Table - matches AdminUserPerformance interface
interface TopUser {
  user_id: number;
  user_name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  total_duration: number;
  total_hours?: number;
  task_count: number;
  total_tasks?: number;
  rank: number;
}

interface TopUsersTableProps {
  users: TopUser[];
  isLoading: boolean;
}

function TopUsersTable({ users, isLoading }: TopUsersTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Top Active Users
        </h3>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <Icons.Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No user activity data</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Tracked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Screenshots
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.slice(0, 10).map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary-700">
                          {user.rank}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.user_name ||
                            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                            "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {user.total_hours?.toFixed(1) ||
                        (user.total_duration / 3600).toFixed(1)}
                      h
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {user.total_tasks || user.task_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">-</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminStatisticsPage() {
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await adminService.getSystemStats();
      return response.data;
    },
  });

  // Fetch user activities (using user-performance endpoint)
  const { data: userActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["admin-user-activities", dateRange],
    queryFn: async () => {
      const response = await adminService.getUserPerformance(10);
      return { users: response.data || [] };
    },
  });

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatHours = (hours: number | undefined): string => {
    if (hours === undefined || hours === null) return "0h";
    if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K h`;
    return `${hours.toFixed(1)}h`;
  };

  // Mock recent activities (would come from audit logs in production)
  const recentActivities: Array<{
    id: number;
    type: string;
    user: string;
    action: string;
    time: string;
  }> = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            System Statistics
          </h1>
          <p className="text-gray-600 mt-1">
            Overview of system activity and performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="w-36"
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="w-36"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={formatNumber(stats?.total_users)}
            icon={Icons.Users}
            change={
              stats?.new_users_this_week
                ? `+${stats.new_users_this_week} this week`
                : undefined
            }
            changeType="increase"
            color="blue"
          />
          <StatCard
            title="Active Users"
            value={formatNumber(stats?.active_users)}
            icon={Icons.UserCheck}
            description="Users active in last 30 days"
            color="green"
          />
          <StatCard
            title="Organizations"
            value={formatNumber(stats?.total_organizations)}
            icon={Icons.Building2}
            change={
              stats?.orgs_growth !== undefined
                ? `${stats.orgs_growth >= 0 ? "+" : ""}${stats.orgs_growth}%`
                : undefined
            }
            changeType={
              stats?.orgs_growth !== undefined && stats.orgs_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="purple"
          />
          <StatCard
            title="Workspaces"
            value={formatNumber(stats?.total_workspaces)}
            icon={Icons.FolderKanban}
            change={
              stats?.workspaces_growth !== undefined
                ? `${stats.workspaces_growth >= 0 ? "+" : ""}${stats.workspaces_growth}%`
                : undefined
            }
            changeType={
              stats?.workspaces_growth !== undefined &&
              stats.workspaces_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="cyan"
          />
          <StatCard
            title="Total Tasks"
            value={formatNumber(stats?.total_tasks)}
            icon={Icons.ListTodo}
            change={
              stats?.tasks_growth !== undefined
                ? `${stats.tasks_growth >= 0 ? "+" : ""}${stats.tasks_growth}%`
                : undefined
            }
            changeType={
              stats?.tasks_growth !== undefined && stats.tasks_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="orange"
          />
          <StatCard
            title="Time Logs"
            value={formatNumber(stats?.total_timelogs)}
            icon={Icons.Clock}
            change={
              stats?.timelogs_growth !== undefined
                ? `${stats.timelogs_growth >= 0 ? "+" : ""}${stats.timelogs_growth}%`
                : undefined
            }
            changeType={
              stats?.timelogs_growth !== undefined && stats.timelogs_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="blue"
          />
          <StatCard
            title="Screenshots"
            value={formatNumber(stats?.total_screenshots)}
            icon={Icons.Camera}
            change={
              stats?.screenshots_growth !== undefined
                ? `${stats.screenshots_growth >= 0 ? "+" : ""}${stats.screenshots_growth}%`
                : undefined
            }
            changeType={
              stats?.screenshots_growth !== undefined &&
              stats.screenshots_growth >= 0
                ? "increase"
                : "decrease"
            }
            color="purple"
          />
          <StatCard
            title="Total Hours Tracked"
            value={formatHours(
              stats?.total_tracked_hours ||
                (stats?.total_duration ? stats.total_duration / 3600 : 0),
            )}
            icon={Icons.Timer}
            color="green"
          />
        </div>
      )}

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart />
        <RecentActivity activities={recentActivities} />
      </div>

      {/* Top Users */}
      <TopUsersTable
        users={userActivities?.users || []}
        isLoading={activitiesLoading}
      />

      {/* Export Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Export Reports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Button variant="outline" size="sm" className="justify-center gap-2">
            <Icons.Users className="h-5 w-5 text-gray-600" />
            <span>Export Users</span>
          </Button>
          <Button variant="outline" size="sm" className="justify-center gap-2">
            <Icons.ListTodo className="h-5 w-5 text-gray-600" />
            <span>Export Tasks</span>
          </Button>
          <Button variant="outline" size="sm" className="justify-center gap-2">
            <Icons.Clock className="h-5 w-5 text-gray-600" />
            <span>Export Time Logs</span>
          </Button>
          <Button variant="outline" size="sm" className="justify-center gap-2">
            <Icons.Building2 className="h-5 w-5 text-gray-600" />
            <span>Export Orgs</span>
          </Button>
          <Button variant="outline" size="sm" className="justify-center gap-2">
            <Icons.Camera className="h-5 w-5 text-gray-600" />
            <span>Export Screenshots</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
